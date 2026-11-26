import { Prisma } from "@prisma/client";
import { database } from "../infrastructure/database.js";

export type User = {
  id: string;
  email: string;
};

export type UserWithPassword = User & { passwordHash: string };

export async function obterUsuarioPorEmail(
  email: string,
): Promise<UserWithPassword | null> {
  const usuario = await database.user.findUnique({ where: { email } });
  if (!usuario) return null;
  return {
    id: usuario.id,
    email: usuario.email,
    passwordHash: usuario.passwordHash,
  };
}

export async function criarUsuario(
  id: string,
  email: string,
  passwordHash: string,
): Promise<User | null> {
  try {
    return await database.user.create({
      data: { id, email, passwordHash },
      select: { id: true, email: true },
    });
  } catch (erro) {
    if (
      erro instanceof Prisma.PrismaClientKnownRequestError &&
      erro.code === "P2002"
    ) {
      return null;
    }
    throw erro;
  }
}

export async function tokenRevogado(tokenId: string): Promise<boolean> {
  return Boolean(
    await database.revokedToken.findUnique({ where: { tokenId } }),
  );
}

export async function revogarToken(
  tokenId: string,
  expiresAt: number,
): Promise<void> {
  await database.$transaction([
    database.revokedToken.deleteMany({
      where: { expiresAt: { lte: Math.floor(Date.now() / 1000) } },
    }),
    database.revokedToken.create({ data: { tokenId, expiresAt } }),
  ]);
}
