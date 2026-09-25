import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { requireRole } from '@/lib/auth';
import bcrypt from 'bcryptjs';

const ROLES_VALIDAS = Object.values(Role);

export async function POST(request) {
  try {
    await requireRole(['GESTOR']);
    const body = await request.json();
    const { cpf, nomeCompleto, role, cargo, senha } = body;

    const cpfLimpo = cpf?.replace(/\D/g, '');

    if (!cpfLimpo || cpfLimpo.length !== 11) {
      return NextResponse.json({ error: 'CPF inválido. Forneça 11 dígitos.' }, { status: 400 });
    }

    if (!senha || senha.length < 4) {
      return NextResponse.json({ error: 'A senha deve ter pelo menos 4 caracteres.' }, { status: 400 });
    }

    if (!ROLES_VALIDAS.includes(role)) {
      return NextResponse.json({ error: 'Role informada é inválida.' }, { status: 400 });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    // Cria o usuário de acesso diretamente sem criar um registro em Pessoa
    const user = await prisma.user.upsert({
      where: { cpf: cpfLimpo },
      update: {
        nome: nomeCompleto,
        senhaHash,
        role,
        cargo,
        ativo: true,
      },
      create: {
        cpf: cpfLimpo,
        nome: nomeCompleto || 'Operador do Sistema',
        senhaHash,
        role,
        cargo,
        ativo: true,
      },
    });

    return NextResponse.json(
      {
        message: 'Usuário do sistema criado com sucesso!',
        usuario: {
          id: user.cpf,
          cpf: user.cpf,
          nome: user.nome,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Erro ao cadastrar usuário:', error);
    return NextResponse.json({ error: 'Erro interno ao salvar usuário.' }, { status: 500 });
  }
}