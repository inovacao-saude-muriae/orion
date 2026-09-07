# 📁 `/scripts` - Scripts Utilitários

Scripts auxiliares para automação, testes e manutenção do projeto.

---

## 📄 Arquivos Nesta Pasta

### `test-ccz.mjs`
**Função:** Script de teste do módulo CCZ (Centro de Controle de Zoonoses).

**O que faz:**
- Testa conexão com banco de dados
- Valida queries do módulo CCZ
- Verifica integridade dos dados
- Gera relatório de teste

**Como executar:**
```bash
npm run test:ccz
```

**Uso típico:**
- Após mudanças no schema do CCZ
- Para validar dados migrados
- Debug de problemas no módulo

**Estrutura:**
```javascript
// test-ccz.mjs
import { prisma } from '../src/lib/prisma.js';

async function testCCZ() {
  console.log('🧪 Testando módulo CCZ...');
  
  // Teste 1: Contar animais
  const totalAnimais = await prisma.animal.count();
  console.log(`✅ Total de animais: ${totalAnimais}`);
  
  // Teste 2: Buscar tutores
  const tutores = await prisma.tutor.findMany({
    take: 5,
    include: { animais: true }
  });
  console.log(`✅ Tutores encontrados: ${tutores.length}`);
  
  // ... outros testes
}

testCCZ();
```

---

## 🔧 Scripts Recomendados (Futuros)

### `backup-db.mjs`
**Função:** Fazer backup do banco de dados.

```javascript
// backup-db.mjs
import { exec } from 'child_process';

const DATABASE_URL = process.env.DATABASE_URL;
const timestamp = new Date().toISOString();
const filename = `backup-${timestamp}.sql`;

exec(`pg_dump ${DATABASE_URL} > backups/${filename}`, (error) => {
  if (error) {
    console.error('❌ Erro no backup:', error);
  } else {
    console.log(`✅ Backup criado: ${filename}`);
  }
});
```

**Executar:**
```bash
node scripts/backup-db.mjs
```

---

### `migrate-roles.mjs`
**Função:** Migrar roles antigas para novas.

```javascript
// migrate-roles.mjs
import { prisma } from '../src/lib/prisma.js';

const ROLE_MAPPING = {
  'ADMIN': 'GESTOR',
  'ADMIN_REGULA': 'REGULACAO_ADMIN',
  'OPERADOR_REGULA': 'REGULACAO_COMUM',
  // ... outros mapeamentos
};

async function migrateRoles() {
  console.log('🔄 Migrando roles...');
  
  for (const [oldRole, newRole] of Object.entries(ROLE_MAPPING)) {
    const result = await prisma.user.updateMany({
      where: { role: oldRole },
      data: { role: newRole }
    });
    
    console.log(`✅ ${result.count} usuários migrados: ${oldRole} → ${newRole}`);
  }
  
  console.log('🎉 Migração concluída!');
}

migrateRoles();
```

---

### `seed-test-data.mjs`
**Função:** Popular banco com dados de teste.

```javascript
// seed-test-data.mjs
import { prisma } from '../src/lib/prisma.js';
import bcrypt from 'bcryptjs';

async function seedTestData() {
  console.log('🌱 Criando dados de teste...');
  
  // Criar usuários de teste
  const usuarios = [
    {
      cpf: '11111111111',
      nome: 'Teste Regulação Comum',
      senhaHash: await bcrypt.hash('senha123', 10),
      cargo: 'Operador',
      role: 'REGULACAO_COMUM'
    },
    {
      cpf: '22222222222',
      nome: 'Teste Farmácia Admin',
      senhaHash: await bcrypt.hash('senha123', 10),
      cargo: 'Coordenador',
      role: 'FARMACIA_ADMIN'
    },
    // ... outros
  ];
  
  for (const user of usuarios) {
    await prisma.user.create({ data: user });
    console.log(`✅ Criado: ${user.nome} (${user.role})`);
  }
  
  console.log('🎉 Dados de teste criados!');
}

seedTestData();
```

---

### `generate-docs.mjs`
**Função:** Gerar documentação automática do código.

```javascript
// generate-docs.mjs
import { readdir, readFile, writeFile } from 'fs/promises';
import path from 'path';

async function generateDocs() {
  console.log('📚 Gerando documentação...');
  
  const apiRoutes = await findFiles('src/app/api', 'route.js');
  
  let markdown = '# API Documentation\n\n';
  
  for (const route of apiRoutes) {
    const content = await readFile(route, 'utf-8');
    // Parse JSDoc comments
    // Gerar markdown
    markdown += `## ${route}\n\n`;
  }
  
  await writeFile('API_DOCS.md', markdown);
  console.log('✅ Documentação gerada em API_DOCS.md');
}

generateDocs();
```

---

### `check-security.mjs`
**Função:** Verificar problemas de segurança.

```javascript
// check-security.mjs
import { readFile } from 'fs/promises';

async function checkSecurity() {
  console.log('🔐 Verificando segurança...');
  
  // Verificar se .env está no .gitignore
  const gitignore = await readFile('.gitignore', 'utf-8');
  if (!gitignore.includes('.env')) {
    console.error('❌ .env não está no .gitignore!');
  } else {
    console.log('✅ .env está protegido');
  }
  
  // Verificar dependências vulneráveis
  exec('npm audit', (error, stdout) => {
    if (stdout.includes('vulnerabilities')) {
      console.warn('⚠️ Vulnerabilidades encontradas!');
      console.log(stdout);
    } else {
      console.log('✅ Nenhuma vulnerabilidade');
    }
  });
  
  // ... outras verificações
}

checkSecurity();
```

---

### `cleanup-sessions.mjs`
**Função:** Limpar sessões expiradas do banco.

```javascript
// cleanup-sessions.mjs
import { prisma } from '../src/lib/prisma.js';

async function cleanupSessions() {
  console.log('🧹 Limpando sessões expiradas...');
  
  const result = await prisma.session.deleteMany({
    where: {
      expiresAt: {
        lt: new Date() // Menor que agora
      }
    }
  });
  
  console.log(`✅ ${result.count} sessões removidas`);
}

cleanupSessions();
```

**Automatizar com cron:**
```bash
# Executar diariamente às 3h da manhã
0 3 * * * cd /caminho/do/projeto && node scripts/cleanup-sessions.mjs
```

---

## 📋 Convenções

### Nomenclatura
```
kebab-case.mjs       ✅ Recomendado
PascalCase.mjs       ❌ Não usar
snake_case.mjs       ❌ Não usar
```

### Extensão
```
.mjs     ✅ ES Modules (import/export)
.js      ✅ CommonJS (require)
.ts      ✅ TypeScript (se configurado)
```

### Estrutura
```javascript
// 1. Imports
import { prisma } from '../src/lib/prisma.js';
import { config } from 'dotenv';

// 2. Configuração
config(); // Carrega .env

// 3. Função principal
async function main() {
  try {
    // Lógica do script
    console.log('✅ Sucesso!');
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 4. Execução
main();
```

---

## 🚀 Como Criar Novo Script

### 1. Crie o arquivo
```bash
touch scripts/meu-script.mjs
```

### 2. Adicione o shebang (opcional)
```javascript
#!/usr/bin/env node
```

### 3. Implemente o script
```javascript
import { prisma } from '../src/lib/prisma.js';

async function meuScript() {
  console.log('🚀 Executando script...');
  
  // Sua lógica aqui
  
  console.log('✅ Concluído!');
}

meuScript();
```

### 4. Adicione ao package.json
```json
{
  "scripts": {
    "script:meu": "node scripts/meu-script.mjs"
  }
}
```

### 5. Execute
```bash
npm run script:meu
```

---

## 🔐 Boas Práticas

### ✅ O que FAZER
- Usar `try/catch` para capturar erros
- Fechar conexão com banco ao final
- Logar progresso e resultados
- Validar variáveis de ambiente
- Fazer backup antes de alterações destrutivas
- Documentar o que o script faz

### ❌ O que NÃO fazer
- Nunca hardcoded credenciais
- Não executar em produção sem testar
- Não ignorar erros silenciosamente
- Evitar scripts que modificam dados sem confirmação

---

## 📊 Logs Recomendados

### Use Emojis para Clareza
```javascript
console.log('🚀 Iniciando...');
console.log('✅ Sucesso!');
console.log('⚠️ Aviso!');
console.log('❌ Erro!');
console.log('📊 Estatística');
console.log('🔍 Debug');
console.log('🧪 Teste');
```

### Formatação
```javascript
// Bom
console.log('✅ Usuários migrados: 42');
console.log('📊 Total de registros: 1.234');

// Ruim
console.log('42');
console.log('done');
```

---

## 🧪 Testes de Scripts

### Jest
```javascript
// test-ccz.test.js
import { testCCZ } from './test-ccz.mjs';

describe('Test CCZ', () => {
  it('should count animals', async () => {
    const result = await testCCZ();
    expect(result.totalAnimais).toBeGreaterThan(0);
  });
});
```

---

## 📚 Referências

- [Node.js ES Modules](https://nodejs.org/api/esm.html)
- [Prisma Client](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference)
- [npm scripts](https://docs.npmjs.com/cli/v9/using-npm/scripts)

---

## 🔗 Arquivos Relacionados

- `package.json` → Define scripts npm
- `src/lib/prisma.js` → Cliente Prisma usado nos scripts
- `.env` → Variáveis de ambiente
