import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function requireRole(roles) {
  const token = (await cookies()).get("session_token")?.value;
  const session = token
    ? await prisma.session.findUnique({ where: { token }, include: { user: true } })
    : null;
  if (!session?.user?.ativo || !session.expiresAt || new Date(session.expiresAt) <= new Date()) {
    throw Object.assign(new Error("Sessão inválida ou expirada."), { status: 401 });
  }
  if (!roles.includes(session.user.role)) {
    throw Object.assign(new Error("Acesso negado."), { status: 403 });
  }
  return session.user;
}
