import { apiRequest, tokenSessionKey } from "./apiClient.js";

export type AuthUser = {
  id: string;
  email: string;
};

type AuthResponse = {
  token: string;
  user: AuthUser;
};

export function autenticar(
  modo: "login" | "register",
  email: string,
  password: string,
): Promise<AuthResponse> {
  return apiRequest(`/auth/${modo}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

export function obterUsuario(): Promise<{ user: AuthUser }> {
  return apiRequest("/auth/me");
}

export async function encerrarSessao(): Promise<void> {
  try {
    await apiRequest("/auth/logout", { method: "POST" });
  } finally {
    sessionStorage.removeItem(tokenSessionKey);
  }
}
