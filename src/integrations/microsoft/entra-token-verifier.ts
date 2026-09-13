import {
  createRemoteJWKSet,
  decodeJwt,
  jwtVerify,
  type JWTPayload,
} from "jose";
import { Role } from "@prisma/client";
import type { IdentityUser } from "../../repositories/user.repository.js";
import { AppError } from "../../utils/app-error.js";

export interface TokenVerifier {
  verify(token: string): Promise<IdentityUser>;
}

interface EntraTokenVerifierConfig {
  tenantId: string;
  audience: string;
  staffRole: string;
  studentRole: string;
}

function claimAsString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function claimAsStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter(
        (item: unknown): item is string => typeof item === "string",
      )
    : [];
}

function peekTokenClaims(token: string): Record<string, unknown> {
  try {
    const payload = decodeJwt(token);
    return {
      iss: payload.iss,
      aud: payload.aud,
      tid: payload.tid,
      scp: payload.scp,
      roles: payload.roles,
      ver: payload.ver,
      azp: payload.azp,
      appid: payload.appid,
      preferred_username: payload.preferred_username,
      email: payload.email,
      upn: payload.upn,
      name: payload.name,
      oid: payload.oid,
      sub: payload.sub,
    };
  } catch {
    return { decodeError: true };
  }
}

export class EntraTokenVerifier implements TokenVerifier {
  private readonly issuers: string[];
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;
  private readonly audiences: string[];

  constructor(private readonly config: EntraTokenVerifierConfig) {
    this.issuers = [
      `https://login.microsoftonline.com/${config.tenantId}/v2.0`,
      `https://sts.windows.net/${config.tenantId}/`,
    ];
    this.audiences = Array.from(
      new Set([config.audience, `api://${config.audience}`]),
    );
    this.jwks = createRemoteJWKSet(
      new URL(
        `https://login.microsoftonline.com/${config.tenantId}/discovery/v2.0/keys`,
      ),
      { timeoutDuration: 5_000, cooldownDuration: 30_000 },
    );
  }

  async verify(token: string): Promise<IdentityUser> {
    let payload: JWTPayload;
    try {
      ({ payload } = await jwtVerify(token, this.jwks, {
        issuer: this.issuers,
        audience: this.audiences,
        algorithms: ["RS256"],
        clockTolerance: 5,
      }));
    } catch (error) {
      const peeked = peekTokenClaims(token);
      if (process.env.NODE_ENV !== "production") {
        console.warn("[entra] token verification failed", {
          reason: error instanceof Error ? error.message : "unknown",
          expectedIssuers: this.issuers,
          expectedAudiences: this.audiences,
          tokenClaims: peeked,
        });
      }
      throw new AppError(
        401,
        "INVALID_ACCESS_TOKEN",
        "The bearer access token is invalid.",
      );
    }

    const externalId =
      claimAsString(payload.oid) ?? claimAsString(payload.sub);
    const email =
      claimAsString(payload.preferred_username) ??
      claimAsString(payload.email) ??
      claimAsString(payload.upn) ??
      claimAsString(payload.unique_name);
    const roles = claimAsStringArray(payload.roles);

    if (!externalId || !email) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[entra] access token missing identity claims", {
          hasOidOrSub: Boolean(externalId),
          hasEmailLikeClaim: Boolean(email),
          roles,
        });
      }
      throw new AppError(
        401,
        "INVALID_TOKEN_CLAIMS",
        "The access token is missing required identity claims.",
      );
    }

    const name = claimAsString(payload.name) ?? email;

    let role: Role;
    if (roles.includes(this.config.staffRole)) {
      role = Role.STAFF;
    } else if (roles.includes(this.config.studentRole)) {
      role = Role.STUDENT;
    } else {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[entra] no recognized app role on token", {
          roles,
          expected: [this.config.staffRole, this.config.studentRole],
        });
      }
      throw new AppError(
        403,
        "ROLE_NOT_ASSIGNED",
        "No recognized application role is assigned.",
      );
    }

    return {
      externalId,
      email: email.toLowerCase(),
      name,
      role,
    };
  }
}
