import {
  PublicClientApplication,
  type AccountInfo,
  type AuthenticationResult,
} from "@azure/msal-browser";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { authApi, type AuthSession, type User } from "./api";

const clientId = import.meta.env.VITE_ENTRA_CLIENT_ID as string | undefined;
const tenantId = import.meta.env.VITE_ENTRA_TENANT_ID as string | undefined;
const loginScopes = ["openid", "profile", "email"];
const sessionKey = "au-merchhub-session";
const productionRedirectUri = `${window.location.origin}/merchhub/`;

export const authConfigured = Boolean(clientId && tenantId);

export const authClient = new PublicClientApplication({
  auth: {
    clientId: clientId ?? "00000000-0000-0000-0000-000000000000",
    authority: `https://login.microsoftonline.com/${tenantId ?? "common"}`,
    redirectUri: import.meta.env.DEV ? window.location.origin : productionRedirectUri,
    postLogoutRedirectUri: import.meta.env.DEV
      ? window.location.origin
      : productionRedirectUri,
  },
  cache: {
    cacheLocation: "sessionStorage",
  },
});

interface AuthContextValue {
  account: AccountInfo | null;
  user: User | null;
  isStaff: boolean;
  isAdmin: boolean;
  canManageCatalog: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  getAccessToken: () => Promise<string>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readSession(): AuthSession | null {
  try {
    const raw = sessionStorage.getItem(sessionKey);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    sessionStorage.removeItem(sessionKey);
    return null;
  }
}

function tokenNeedsRefresh(token: string): boolean {
  try {
    const encodedPayload = token.split(".")[1];
    if (!encodedPayload) return true;
    const payload = JSON.parse(
      atob(encodedPayload.replace(/-/g, "+").replace(/_/g, "/")),
    ) as { exp?: number };
    return typeof payload.exp !== "number" || payload.exp * 1000 < Date.now() + 60_000;
  } catch {
    return true;
  }
}

export function AuthProvider({
  initialResult,
  children,
}: PropsWithChildren<{ initialResult: AuthenticationResult | null }>) {
  const [account, setAccount] = useState<AccountInfo | null>(
    initialResult?.account ??
      authClient.getActiveAccount() ??
      authClient.getAllAccounts()[0] ??
      null,
  );
  const [session, setSession] = useState<AuthSession | null>(() => readSession());
  const synchronizedAccountRef = useRef<string | null>(null);

  const rememberMicrosoftResult = useCallback((result: AuthenticationResult) => {
    authClient.setActiveAccount(result.account);
    setAccount(result.account);
  }, []);

  const exchangeToken = useCallback(async (idToken: string) => {
    const nextSession = await authApi.microsoft(idToken);
    sessionStorage.setItem(sessionKey, JSON.stringify(nextSession));
    setSession(nextSession);
    return nextSession.accessToken;
  }, []);

  const signIn = useCallback(async () => {
    if (!authConfigured) {
      throw new Error("Microsoft Entra sign-in is not configured.");
    }
    const result = await authClient.loginPopup({
      scopes: loginScopes,
      prompt: "select_account",
    });
    rememberMicrosoftResult(result);
    await exchangeToken(result.idToken);
  }, [exchangeToken, rememberMicrosoftResult]);

  const signOut = useCallback(async () => {
    sessionStorage.removeItem(sessionKey);
    setSession(null);
    await authClient.logoutPopup({ account: account ?? undefined });
    setAccount(null);
  }, [account]);

  useEffect(() => {
    if (!account || synchronizedAccountRef.current === account.homeAccountId) return;
    synchronizedAccountRef.current = account.homeAccountId;

    void authClient
      .acquireTokenSilent({ account, scopes: loginScopes })
      .then((result) => exchangeToken(result.idToken))
      .catch(() => {
        synchronizedAccountRef.current = null;
      });
  }, [account, exchangeToken]);

  const getAccessToken = useCallback(async () => {
    if (session && !tokenNeedsRefresh(session.accessToken)) {
      return session.accessToken;
    }

    const activeAccount =
      account ?? authClient.getActiveAccount() ?? authClient.getAllAccounts()[0];
    if (!activeAccount) {
      throw new Error("Sign in to continue.");
    }

    try {
      const result = await authClient.acquireTokenSilent({
        account: activeAccount,
        scopes: loginScopes,
      });
      rememberMicrosoftResult(result);
      return exchangeToken(result.idToken);
    } catch {
      const result = await authClient.acquireTokenPopup({
        account: activeAccount,
        scopes: loginScopes,
      });
      rememberMicrosoftResult(result);
      return exchangeToken(result.idToken);
    }
  }, [account, exchangeToken, rememberMicrosoftResult, session]);

  const isStaff = session?.user.role === "STAFF";
  const isAdmin = session?.user.role === "ADMIN";
  const canManageCatalog = isStaff || isAdmin;
  const value = useMemo(
    () => ({
      account,
      user: session?.user ?? null,
      isStaff,
      isAdmin,
      canManageCatalog,
      signIn,
      signOut,
      getAccessToken,
    }),
    [
      account,
      canManageCatalog,
      getAccessToken,
      isAdmin,
      isStaff,
      session?.user,
      signIn,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
