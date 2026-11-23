import { database } from "../infrastructure/database.js";

export type User = {
  id: string;
  email: string;
};

type UserRow = User & { password_hash: string };

export function obterUsuarioPorEmail(email: string): UserRow | undefined {
  return database
    .prepare("SELECT id, email, password_hash FROM users WHERE email = ?")
    .get(email) as UserRow | undefined;
}

export function criarUsuario(
  id: string,
  email: string,
  passwordHash: string,
): User | undefined {
  const result = database
    .prepare(
      `INSERT INTO users (id, email, password_hash)
       VALUES (?, ?, ?)
       ON CONFLICT(email) DO NOTHING`,
    )
    .run(id, email, passwordHash);
  return result.changes ? { id, email } : undefined;
}

export function tokenRevogado(tokenId: string): boolean {
  return Boolean(
    database
      .prepare("SELECT 1 FROM revoked_tokens WHERE token_id = ?")
      .get(tokenId),
  );
}

export function revogarToken(tokenId: string, expiresAt: number): void {
  database
    .prepare("DELETE FROM revoked_tokens WHERE expires_at <= ?")
    .run(Math.floor(Date.now() / 1000));
  database
    .prepare("INSERT INTO revoked_tokens (token_id, expires_at) VALUES (?, ?)")
    .run(tokenId, expiresAt);
}
