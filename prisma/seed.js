require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

if (!process.env.DATABASE_URL) {
  console.error("❌ ERRO: A variável DATABASE_URL não foi encontrada no arquivo .env");
  process.exit(1);
}

// 1. Criar o Pool de conexões do driver nativo pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

// 2. Instanciar o Prisma Client passando o adapter
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Iniciando seed do banco de dados...\n");

  const cpfGestor = process.env.GESTOR_CPF || "00000000000";
  const nomeGestor = process.env.GESTOR_NOME || "Gestor do Sistema";
  const senhaGestor = process.env.GESTOR_SENHA || "trocar@123";

  if (!process.env.GESTOR_CPF || !process.env.GESTOR_SENHA) {
    console.warn("⚠️  ATENÇÃO: Usando credenciais padrão!");
    console.warn("   Configure GESTOR_CPF, GESTOR_NOME e GESTOR_SENHA no arquivo .env\n");
  }

  const senhaHashGestor = await bcrypt.hash(senhaGestor, 10);

  const gestorUser = await prisma.user.upsert({
    where: { cpf: cpfGestor },
    update: {
      nome: nomeGestor,
      senhaHash: senhaHashGestor,
      role: "GESTOR",
      cargo: "Gestor Geral do Sistema",
      ativo: true,
    },
    create: {
      cpf: cpfGestor,
      nome: nomeGestor,
      senhaHash: senhaHashGestor,
      cargo: "Gestor Geral do Sistema",
      role: "GESTOR",
      ativo: true,
    },
  });

  console.log("✅ Usuário GESTOR configurado com sucesso!");
  console.log(`👤 Nome: ${gestorUser.nome}`);
  console.log(`🆔 CPF/Login: ${gestorUser.cpf}`);
  console.log(`🔑 Senha: ${senhaGestor}`);
  console.log(`🎯 Permissão: ${gestorUser.role} (Acesso Total)\n`);

  console.log("🎉 Seed concluído com sucesso!");
}

main()
  .catch((e) => {
    console.error("❌ Erro ao executar seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end(); // Fecha a pilha de conexões do driver pg
  });