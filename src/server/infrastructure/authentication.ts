import {
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import jwt from "jsonwebtoken";
import { HttpError } from "../controllers/httpController.js";

const scrypt = promisify(scryptCallback);
const tamanhoHash = 64;

export type AuthUser = {
  id: string;
  email: string;
};

export type AuthClaims = AuthUser & { tokenId: string; expiresAt: number };

export function obterJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new HttpError(
      503,
      "JWT_SECRET deve conter pelo menos 32 caracteres no ambiente do servidor.",
    );
  }
  return secret;
}

export async function gerarHashSenha(senha: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scrypt(senha, salt, tamanhoHash)) as Buffer;
  return `scrypt$${salt}$${hash.toString("hex")}`;
}

export async function verificarSenha(
  senha: string,
  registro: string,
): Promise<boolean> {
  const [algoritmo, salt, hashHex, ...extras] = registro.split("$");
  if (
    algoritmo !== "scrypt" ||
    !salt ||
    !hashHex ||
    extras.length > 0 ||
    !/^[a-f0-9]{32}$/.test(salt) ||
    !/^[a-f0-9]{128}$/.test(hashHex)
  ) {
    return false;
  }
  const esperado = Buffer.from(hashHex, "hex");
  const recebido = (await scrypt(senha, salt, esperado.length)) as Buffer;
  return timingSafeEqual(recebido, esperado);
}

export function gerarJwt(usuario: AuthUser): string {
  return jwt.sign({ email: usuario.email }, obterJwtSecret(), {
    algorithm: "HS256",
    expiresIn: "1h",
    issuer: "packethub",
    jwtid: randomUUID(),
    subject: usuario.id,
  });
}

export function validarJwt(token: string): AuthClaims {
  let payload: string | jwt.JwtPayload;
  try {
    payload = jwt.verify(token, obterJwtSecret(), {
      algorithms: ["HS256"],
      issuer: "packethub",
    });
  } catch (erro) {
    if (
      erro instanceof Error &&
      ["JsonWebTokenError", "TokenExpiredError", "NotBeforeError"].includes(
        erro.name,
      )
    ) {
      throw new HttpError(401, "Token de autenticação inválido ou expirado.");
    }
    throw erro;
  }
  if (
    typeof payload === "string" ||
    typeof payload.sub !== "string" ||
    typeof payload.email !== "string" ||
    typeof payload.jti !== "string" ||
    typeof payload.exp !== "number"
  ) {
    throw new HttpError(401, "Token de autenticação inválido.");
  }
  return {
    id: payload.sub,
    email: payload.email,
    tokenId: payload.jti,
    expiresAt: payload.exp,
  };
}
