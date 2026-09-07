# 📁 `/src/app/admin/usuarios` - Cadastro de Usuários

Página para cadastro de novos usuários do sistema com atribuição de roles/permissões.

**Rota:** `/admin/usuarios`  
**Acesso:** Apenas GESTOR

---

## 📄 Arquivos Nesta Pasta

### `page.js`
**Tipo:** Client Component  
**Função:** Formulário inteligente para cadastro de usuários

#### O Que Este Arquivo Faz

**1. Estados do Componente**
```javascript
const [cpf, setCpf] = useState('');                // CPF digitado
const [nomeCompleto, setNomeCompleto] = useState(''); // Nome completo
const [dataNascimento, setDataNascimento] = useState(''); // Data nascimento
const [telefone, setTelefone] = useState('');      // Telefone
const [role, setRole] = useState('REGULACAO_COMUM'); // Cargo selecionado
const [senha, setSenha] = useState('');            // Senha de acesso

const [pessoaExiste, setPessoaExiste] = useState(false); // Pessoa já cadastrada?
const [buscandoCpf, setBuscandoCpf] = useState(false);   // Loading busca CPF
const [salvando, setSalvando] = useState(false);   // Loading ao salvar
const [mensagem, setMensagem] = useState({ tipo: '', texto: '' }); // Feedback
```

**2. Função `obterNomePerfil()`**
```javascript
const obterNomePerfil = (perfilRole) => {
  switch (perfilRole) {
    case 'GESTOR':
      return 'Gestor Geral do Sistema (Acesso Total)';
    case 'REGULACAO_ADMIN':
      return 'Administrador da Regulação (com Financeiro)';
    case 'REGULACAO_COMUM':
      return 'Operador da Regulação (sem Financeiro)';
    // ... 9 outros cargos
  }
}
```

**O que faz:**
- Converte código técnico (`REGULACAO_ADMIN`) em texto descritivo
- Usado no select e ao salvar usuário
- Facilita compreensão das permissões

**3. Busca Automática de CPF**
```javascript
const handleCpfChange = async (e) => {
  const valorLimpo = e.target.value.replace(/\D/g, ''); // Remove pontos/traços
  setCpf(valorLimpo);

  if (valorLimpo.length === 11) {
    // CPF completo → busca no banco
    setBuscandoCpf(true);
    
    const res = await fetch(`/api/pessoas/${valorLimpo}`);
    const data = await res.json();

    if (res.ok && data.pessoa) {
      // ✅ Pessoa já existe
      setPessoaExiste(true);
      setNomeCompleto(data.pessoa.nomeCompleto);
      setTelefone(data.pessoa.telefone);
      setMensagem({
        tipo: 'sucesso',
        texto: 'Pessoa encontrada! Defina senha e perfil.'
      });
    } else {
      // ❌ Pessoa não existe
      setPessoaExiste(false);
      setNomeCompleto('');
      setMensagem({
        tipo: 'alerta',
        texto: 'CPF não encontrado. Preencha nome para cadastrar.'
      });
    }
  }
}
```

**Fluxo:**
```
1. Usuário digita CPF: 129.124.536-74
   ↓
2. Remove máscara: 12912453674
   ↓
3. Ao completar 11 dígitos → busca automática
   ↓
4. GET /api/pessoas/12912453674
   ↓
5a. Se encontrou:
    - Preenche nome, telefone
    - Desabilita campos (readonly)
    - Mostra "✅ Pessoa encontrada"
   
5b. Se não encontrou:
    - Deixa campos vazios
    - Habilita campos (editável)
    - Mostra "⚠️ CPF não encontrado"
```

**Por que fazer isso?**
- Evita duplicar cadastro de pessoa
- Se pessoa já existe (ex: foi paciente), reutiliza dados
- Se não existe, permite cadastrar pessoa + usuário juntos

**4. Submit do Formulário**
```javascript
const handleSubmit = async (e) => {
  e.preventDefault();

  // Validação
  if (cpf.length < 11) {
    setMensagem({ tipo: 'erro', texto: 'CPF inválido' });
    return;
  }

  setSalvando(true);

  // Monta payload
  const cargoFormatado = obterNomePerfil(role);
  const payload = {
    cpf,
    nomeCompleto,
    dataNascimento,
    telefone,
    role,                // Ex: "REGULACAO_ADMIN"
    cargo: cargoFormatado, // Ex: "Administrador da Regulação..."
    senha
  };

  // Envia para API
  const res = await fetch('/api/admin/usuarios', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (res.ok) {
    setMensagem({ tipo: 'sucesso', texto: '✅ Usuário cadastrado!' });
    setSenha(''); // Limpa senha
  } else {
    const data = await res.json();
    setMensagem({ tipo: 'erro', texto: data.error });
  }

  setSalvando(false);
}
```

**O que acontece no backend (`/api/admin/usuarios`):**
1. Verifica se usuário já existe (CPF)
2. Se pessoa não existe → cria registro em `pessoa`
3. Hash da senha com bcrypt
4. Cria registro em `user` com role
5. Retorna sucesso

**5. Interface (JSX)**

**Campo CPF (com busca automática):**
```javascript
<input
  type="text"
  value={cpf}
  onChange={handleCpfChange}  // Busca ao digitar
  maxLength={11}
  placeholder="Digite os 11 dígitos do CPF"
/>
{buscandoCpf && <span>Buscando...</span>}
```

**Campo Nome (desabilita se pessoa existe):**
```javascript
<input
  type="text"
  value={nomeCompleto}
  disabled={pessoaExiste}  // Readonly se já existe
  onChange={(e) => setNomeCompleto(e.target.value)}
/>
```

**Select de Role (12 cargos organizados):**
```javascript
<select value={role} onChange={(e) => setRole(e.target.value)}>
  {/* GESTOR */}
  <option value="GESTOR">🌟 GESTOR (Acesso Total)</option>
  
  {/* REGULAÇÃO */}
  <optgroup label="📋 REGULAÇÃO">
    <option value="REGULACAO_ADMIN">👨‍💼 Admin (com Financeiro)</option>
    <option value="REGULACAO_COMUM">👤 Operador (sem Financeiro)</option>
  </optgroup>

  {/* CÂMARA TÉCNICA */}
  <optgroup label="🏛️ CÂMARA TÉCNICA">
    <option value="FARMACIA_ADMIN">💊 Admin Farmácia</option>
    <option value="PROCESSO_ADMIN">📄 Admin Processos</option>
  </optgroup>

  {/* JUNTA */}
  <optgroup label="👨‍⚕️ JUNTA REGULADORA">
    <option value="JUNTA_ADMIN">👨‍💼 Admin (Todos)</option>
    <option value="JUNTA_CAEE">🎓 CAEE</option>
    <option value="JUNTA_EDUCACAO">📚 Educação</option>
    <option value="JUNTA_SAUDE">🏥 Saúde</option>
    <option value="JUNTA_ASSISTENCIA">🤝 Assistência</option>
  </optgroup>

  {/* CCZ */}
  <optgroup label="🐕 CCZ">
    <option value="CCZ_ADMIN">🔬 Admin CCZ</option>
  </optgroup>
</select>
```

**Preview do cargo:**
```javascript
<span>
  Cargo exibido: <strong>{obterNomePerfil(role)}</strong>
</span>
```

**Campo Senha:**
```javascript
<input
  type="password"
  value={senha}
  onChange={(e) => setSenha(e.target.value)}
  placeholder="Digite a senha de login"
  autoComplete="new-password"
/>
```

**Botão Submit:**
```javascript
<button 
  type="submit" 
  disabled={salvando || buscandoCpf}
>
  {salvando ? 'Salvando...' : 'Concluir Cadastro'}
</button>
```

---

### `AdminUsuarios.module.css`
**Tipo:** CSS Module  
**Função:** Estilização do formulário de cadastro

**Principais Classes:**

```css
.container {
  max-width: 800px;
  margin: 2rem auto;
  padding: 2rem;
}

.form {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.inputGroup {
  margin-bottom: 1.5rem;
}

.input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.inputDisabled {
  background-color: #f0f0f0;
  cursor: not-allowed;
}

.select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.submitButton {
  width: 100%;
  padding: 1rem;
  background-color: #0070f3;
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
}

.message {
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.sucesso {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.erro {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.alerta {
  background-color: #fff3cd;
  color: #856404;
  border: 1px solid #ffeaa7;
}
```

---

## 🔄 Fluxos de Uso

### Fluxo 1: Pessoa Já Existe (Ex: era paciente)
```
1. Digite CPF: 12345678900
   ↓
2. Sistema busca → Pessoa encontrada
   ↓
3. Preenche automaticamente:
   - Nome: "João Silva"
   - Telefone: "(11) 98765-4321"
   - Data Nascimento: já cadastrada
   ↓
4. Campos desabilitados (readonly)
   ↓
5. Usuário só precisa:
   - Selecionar Role
   - Definir Senha
   ↓
6. Clica "Concluir Cadastro"
   ↓
7. ✅ Usuário criado (pessoa reutilizada)
```

### Fluxo 2: Pessoa Não Existe
```
1. Digite CPF: 99999999999
   ↓
2. Sistema busca → Não encontrado
   ↓
3. Mostra: "⚠️ CPF não encontrado. Preencha nome."
   ↓
4. Campos habilitados (editável)
   ↓
5. Usuário preenche:
   - Nome Completo
   - Data Nascimento
   - Telefone
   - Role
   - Senha
   ↓
6. Clica "Concluir Cadastro"
   ↓
7. ✅ Pessoa criada + Usuário criado
```

---

## 🎨 Estados da Interface

### Estado 1: Inicial
```
┌──────────────────────────────────┐
│ Cadastro de Usuários do Sistema  │
├──────────────────────────────────┤
│ CPF: [___________]  (vazio)      │
│ Nome: [___________] (vazio)      │
│ Data: [___________] (vazio)      │
│ Tel: [___________]  (vazio)      │
│ Role: [REGULACAO_COMUM ▼]        │
│ Senha: [___________] (vazio)     │
│                                  │
│ [Concluir Cadastro]              │
└──────────────────────────────────┘
```

### Estado 2: Buscando CPF
```
┌──────────────────────────────────┐
│ CPF: [12912453674] Buscando...   │
│ Nome: [___________] (loading)    │
└──────────────────────────────────┘
```

### Estado 3: Pessoa Encontrada
```
┌──────────────────────────────────┐
│ ✅ Pessoa encontrada! Defina     │
│    senha e perfil.               │
├──────────────────────────────────┤
│ CPF: [12912453674]               │
│ Nome: [Jefinny de Paula] (gray)  │
│      (Cadastrado) ← badge        │
│ Data: [1990-01-01] (gray)        │
│ Tel: [(11) 99999-9999] (gray)    │
│ Role: [GESTOR ▼] ← editável      │
│ Senha: [___________] ← editável  │
│                                  │
│ [Concluir Cadastro]              │
└──────────────────────────────────┘
```

### Estado 4: Pessoa Não Encontrada
```
┌──────────────────────────────────┐
│ ⚠️ CPF não encontrado. Preencha  │
│    nome para cadastrar.          │
├──────────────────────────────────┤
│ CPF: [99999999999]               │
│ Nome: [___________] ← editável   │
│ Data: [___________] ← editável   │
│ Tel: [___________] ← editável    │
│ Role: [REGULACAO_COMUM ▼]        │
│ Senha: [___________]             │
│                                  │
│ [Concluir Cadastro]              │
└──────────────────────────────────┘
```

### Estado 5: Salvando
```
┌──────────────────────────────────┐
│ CPF: [12912453674]               │
│ ... (campos preenchidos)         │
│                                  │
│ [Salvando...] (disabled, gray)   │
└──────────────────────────────────┘
```

### Estado 6: Sucesso
```
┌──────────────────────────────────┐
│ ✅ Usuário cadastrado com        │
│    sucesso como "Gestor Geral"!  │
├──────────────────────────────────┤
│ CPF: [12912453674]               │
│ ... (campos mantidos)            │
│ Senha: [___________] ← limpo     │
│                                  │
│ [Concluir Cadastro]              │
└──────────────────────────────────┘
```

---

## 🔐 Validações

### Client-Side
```javascript
// CPF
if (cpf.length < 11) {
  setMensagem({ tipo: 'erro', texto: 'CPF inválido' });
  return;
}

// Campos obrigatórios (HTML5)
<input required />
```

### Server-Side (`/api/admin/usuarios`)
```javascript
// 1. CPF já é usuário?
const existeUser = await prisma.user.findUnique({ where: { cpf } });
if (existeUser) {
  return { error: 'CPF já cadastrado como usuário' };
}

// 2. Senha forte?
if (senha.length < 6) {
  return { error: 'Senha deve ter no mínimo 6 caracteres' };
}

// 3. Role válido?
const rolesValidos = ['GESTOR', 'REGULACAO_ADMIN', ...];
if (!rolesValidos.includes(role)) {
  return { error: 'Role inválido' };
}
```

---

## 📊 Integração com Banco

### Tabelas Envolvidas

**1. `pessoa` (opcional)**
```sql
CREATE TABLE pessoa (
  cpf VARCHAR(11) PRIMARY KEY,
  nome_completo VARCHAR(150),
  data_nascimento DATE,
  telefone VARCHAR(20),
  ...
);
```

**2. `user` (sempre)**
```sql
CREATE TABLE users (
  cpf VARCHAR(11) PRIMARY KEY,
  nome VARCHAR(150),
  senha_hash VARCHAR(255),
  cargo VARCHAR(100),
  role Role,  -- ENUM
  ativo BOOLEAN DEFAULT true,
  ...
);
```

### Queries Executadas

**Busca CPF:**
```sql
SELECT * FROM pessoa WHERE cpf = '12912453674';
```

**Cria Pessoa (se não existe):**
```sql
INSERT INTO pessoa (cpf, nome_completo, data_nascimento, telefone, ...)
VALUES ('99999999999', 'João Silva', '1990-01-01', '11999999999', ...);
```

**Cria Usuário:**
```sql
INSERT INTO users (cpf, nome, senha_hash, cargo, role, ativo)
VALUES (
  '12912453674', 
  'Jefinny de Paula', 
  '$2a$10$...hashedpassword...',
  'Gestor Geral do Sistema (Acesso Total)',
  'GESTOR',
  true
);
```

---

## 🧪 Testes Manuais

### Teste 1: Cadastrar Usuário Novo
```
1. Acesse /admin/usuarios
2. Digite CPF: 11111111111 (não existe)
3. Aguarde mensagem "CPF não encontrado"
4. Preencha:
   - Nome: "Teste Silva"
   - Data: 01/01/1990
   - Tel: (11) 99999-9999
   - Role: REGULACAO_COMUM
   - Senha: teste123
5. Clique "Concluir Cadastro"
6. Deve mostrar: ✅ Usuário cadastrado
```

### Teste 2: Promover Pessoa Existente a Usuário
```
1. Digite CPF: 12912453674 (já existe como pessoa)
2. Sistema preenche nome automaticamente
3. Campos nome/data/tel desabilitados
4. Selecione Role: GESTOR
5. Digite Senha: senha123
6. Clique "Concluir"
7. Deve criar usuário reutilizando pessoa
```

### Teste 3: CPF Duplicado
```
1. Digite CPF: 12912453674 (já é usuário)
2. Preencha form
3. Clique "Concluir"
4. Deve mostrar erro: "CPF já cadastrado como usuário"
```

---

## 🔗 Arquivos Relacionados

| Arquivo | Relação |
|---------|---------|
| `/api/admin/usuarios/route.js` | API chamada pelo form |
| `/api/pessoas/[cpf]/route.js` | API de busca de pessoa |
| `prisma/schema.prisma` | Define tabelas `user` e `pessoa` |
| `src/middleware.js` | Garante que só GESTOR acessa |

---

## 📚 Referências

- [React useState](https://react.dev/reference/react/useState)
- [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
- [HTML Select Optgroup](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/optgroup)

---

**Resumo:** Esta pasta contém o formulário de cadastro de usuários, com busca inteligente de CPF, integração com cadastro de pessoas, e atribuição de 12 roles diferentes organizados por módulo.
