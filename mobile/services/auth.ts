import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';

// --- B2C Configuration ---

const TENANT_NAME = process.env.EXPO_PUBLIC_B2C_TENANT ?? 'gymtrainerb2c';
const CLIENT_ID = process.env.EXPO_PUBLIC_B2C_CLIENT_ID ?? '';
const POLICY_NAME = process.env.EXPO_PUBLIC_B2C_POLICY ?? 'B2C_1_signupsignin';

const B2C_BASE_URL = `https://${TENANT_NAME}.b2clogin.com/${TENANT_NAME}.onmicrosoft.com/${POLICY_NAME}`;

const DISCOVERY: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: `${B2C_BASE_URL}/oauth2/v2.0/authorize`,
  tokenEndpoint: `${B2C_BASE_URL}/oauth2/v2.0/token`,
  endSessionEndpoint: `${B2C_BASE_URL}/oauth2/v2.0/logout`,
};

const REDIRECT_URI = AuthSession.makeRedirectUri({ scheme: 'gymtrainer' });

const SCOPES = ['openid', 'profile', 'offline_access', `https://${TENANT_NAME}.onmicrosoft.com/api/access`];

// --- Secure Store Keys ---

const TOKEN_KEY = 'auth_access_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';
const ID_TOKEN_KEY = 'auth_id_token';

// --- Token Types ---

export interface AuthTokens {
  accessToken: string;
  refreshToken: string | null;
  idToken: string | null;
  expiresIn: number | null;
}

// --- Public Functions ---

export async function signIn(): Promise<AuthTokens | null> {
  const request = new AuthSession.AuthRequest({
    clientId: CLIENT_ID,
    scopes: SCOPES,
    redirectUri: REDIRECT_URI,
    usePKCE: true,
  });

  const result = await request.promptAsync(DISCOVERY);

  if (result.type !== 'success' || !result.params['code']) {
    return null;
  }

  const tokenResponse = await AuthSession.exchangeCodeAsync(
    {
      clientId: CLIENT_ID,
      code: result.params['code'],
      redirectUri: REDIRECT_URI,
      extraParams: {
        code_verifier: request.codeVerifier ?? '',
      },
    },
    DISCOVERY,
  );

  const tokens: AuthTokens = {
    accessToken: tokenResponse.accessToken,
    refreshToken: tokenResponse.refreshToken ?? null,
    idToken: tokenResponse.idToken ?? null,
    expiresIn: tokenResponse.expiresIn ?? null,
  };

  await storeTokens(tokens);
  return tokens;
}

export async function signOut(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  await SecureStore.deleteItemAsync(ID_TOKEN_KEY);
}

export async function refreshToken(currentRefreshToken: string): Promise<AuthTokens | null> {
  try {
    const tokenResponse = await AuthSession.refreshAsync(
      {
        clientId: CLIENT_ID,
        refreshToken: currentRefreshToken,
      },
      DISCOVERY,
    );

    const tokens: AuthTokens = {
      accessToken: tokenResponse.accessToken,
      refreshToken: tokenResponse.refreshToken ?? currentRefreshToken,
      idToken: tokenResponse.idToken ?? null,
      expiresIn: tokenResponse.expiresIn ?? null,
    };

    await storeTokens(tokens);
    return tokens;
  } catch {
    // Refresh failed — user needs to sign in again
    await signOut();
    return null;
  }
}

export async function getStoredToken(): Promise<string | null> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (token && isTokenExpired(token)) {
    const stored = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    if (stored) {
      const refreshed = await refreshToken(stored);
      return refreshed?.accessToken ?? null;
    }
    return null;
  }
  return token;
}

export async function storeTokens(tokens: AuthTokens): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, tokens.accessToken);
  if (tokens.refreshToken) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken);
  }
  if (tokens.idToken) {
    await SecureStore.setItemAsync(ID_TOKEN_KEY, tokens.idToken);
  }
}

export function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;

    const payload = JSON.parse(atob(parts[1]!)) as { exp?: number };
    if (!payload.exp) return true;

    // Consider expired 60 seconds before actual expiry
    const nowSeconds = Math.floor(Date.now() / 1000);
    return payload.exp - 60 < nowSeconds;
  } catch {
    return true;
  }
}
