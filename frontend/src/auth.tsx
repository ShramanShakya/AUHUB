import {
  PublicClientApplication,
  type AccountInfo,
  type AuthenticationResult,
} from "@azure/msal-browser";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

const clientId = import.meta.env.VITE_ENTRA_CLIENT_ID as string | undefined;
const tenantId = import.meta.env.VITE_ENTRA_TENANT_ID as string | undefined;
const apiScope = import.meta.env.VITE_ENTRA_API_SCOPE as string | undefined;
const staffRole = (import.meta.env.VITE_ENTRA_STAFF_ROLE as string | undefined) ??
  "STAFF";

export const authConfigured = Boolean(clientId && tenantId && apiScope);

export const authClient = new PublicClientApplication({
  auth: {
    clientId: clientId ?? "00000000-0000-0000-0000-000000000000",
    authority: `https://login.microsoftonline.com/${tenantId ?? "common"}`,
    redirectUri: `${window.location.origin}/store/`,
    postLogoutRedirectUri: `${window.location.origin}/store/`,
  },
  cache: {
    cacheLocation: "sessionStorage",
  },
});

interface AuthContextValue {
  account: AccountInfo | null;
  isStaff: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  getAccessToken: () => Promise<string>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function rolesFromToken(token: string): string[] {
  try {
    const encodedPayload = token.split(".")[1];
    if (!encodedPayload) return [];
    const payload = JSON.parse(
      atob(encodedPayload.replace(/-/g, "+").replace(/_/g, "/")),
    ) as { roles?: unknown };
    return Array.isArray(payload.roles)
      ? payload.roles.filter((role): role is string => typeof role === "string")
      : [];
  } catch {
    return [];
  }
}

export function AuthProvider({
  initialResult,
  children,
}: PropsWithChildren<{ initialResult: AuthenticationResult | null }>) {
  const [account, setAccount] = useState<AccountInfo | null>(
    initialResult?.account ?? authClient.getActiveAccount() ??
      authClient.getAllAccounts()[0] ??
      null,
  );
  const [isStaff, setIsStaff] = useState(() =>
    initialResult ? rolesFromToken(initialResult.accessToken).includes(staffRole) : false,
  );

  const rememberResult = useCallback((result: AuthenticationResult) => {
    authClient.setActiveAccount(result.account);
    const nextIsStaff = rolesFromToken(result.accessToken).includes(staffRole);
    setAccount((current) =>
      current?.homeAccountId === result.account.homeAccountId
        ? current
        : result.account,
    );
    setIsStaff((current) => (current === nextIsStaff ? current : nextIsStaff));
  }, []);

  const signIn = useCallback(async () => {
    if (!authConfigured || !apiScope) {
      throw new Error("Microsoft Entra sign-in is not configured.");
    }
    const result = await authClient.loginPopup({
      scopes: [apiScope],
      prompt: "select_account",
    });
    rememberResult(result);
  }, [rememberResult]);

  const signOut = useCallback(async () => {
    await authClient.logoutPopup({ account: account ?? undefined });
    setAccount(null);
    setIsStaff(false);
  }, [account]);

  const getAccessToken = useCallback(async () => {
    const activeAccount =
      account ?? authClient.getActiveAccount() ?? authClient.getAllAccounts()[0];
    if (!activeAccount || !apiScope) {
      throw new Error("Sign in to continue.");
    }
    try {
      const result = await authClient.acquireTokenSilent({
        account: activeAccount,
        scopes: [apiScope],
      });
      return result.accessToken;
    } catch {
      const result = await authClient.acquireTokenPopup({
        account: activeAccount,
        scopes: [apiScope],
      });
      rememberResult(result);
      return result.accessToken;
    }
  }, [account, rememberResult]);

  const value = useMemo(
    () => ({ account, isStaff, signIn, signOut, getAccessToken }),
    [account, getAccessToken, isStaff, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
