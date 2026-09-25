'use client';

import { useState } from 'react';
import styles from './AdminUsuarios.module.css';
import { useConfirm } from '@/components/ConfirmDialog';

export default function AdminUsuariosPage() {
  const confirm = useConfirm();
  const [cpf, setCpf] = useState('');
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [telefone, setTelefone] = useState('');
  const [role, setRole] = useState('REGULACAO_COMUM');
  const [senha, setSenha] = useState('');

  const [pessoaExiste, setPessoaExiste] = useState(false);
  const [buscandoCpf, setBuscandoCpf] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  // Mapeia os perfis exatamente como definidos no Enum 'Role' do Prisma
  const obterNomePerfil = (perfilRole) => {
    switch (perfilRole) {
      case 'GESTOR':
        return 'Gestor Geral do Sistema (Acesso Total)';
      
      // REGULAÇÃO
      case 'REGULACAO_ADMIN':
        return 'Administrador da Regulação (com Financeiro)';
      case 'REGULACAO_COMUM':
        return 'Operador da Regulação (sem Financeiro)';
      
      // CÂMARA TÉCNICA
      case 'FARMACIA_ADMIN':
        return 'Administrador da Farmácia Judicial';
      case 'PROCESSO_ADMIN':
        return 'Administrador de Processos';
      
      // JUNTA REGULADORA
      case 'JUNTA_ADMIN':
        return 'Administrador da Junta Reguladora (Todos Serviços)';
      case 'JUNTA_CAEE':
        return 'Operador do CAEE (Junta)';
      case 'JUNTA_EDUCACAO':
        return 'Operador da Educação (Junta)';
      case 'JUNTA_SAUDE':
        return 'Operador da Saúde (Junta)';
      case 'JUNTA_ASSISTENCIA':
        return 'Operador da Assistência Social (Junta)';
      
      // CCZ
      case 'CCZ_ADMIN':
        return 'Administrador do CCZ / Veterinário';
      
      default:
        return 'Operador do Sistema';
    }
  };

  // Busca automática ao digitar os 11 dígitos do CPF
  const handleCpfChange = async (e) => {
    const valorLimpo = e.target.value.replace(/\D/g, '');
    setCpf(valorLimpo);

    if (valorLimpo.length === 11) {
      setBuscandoCpf(true);
      setMensagem({ tipo: '', texto: '' });

      try {
        const res = await fetch(`/api/pessoas/${valorLimpo}`);
        const data = await res.json();

        if (res.ok && data.pessoa) {
          setPessoaExiste(true);
          setNomeCompleto(data.pessoa.nomeCompleto || '');
          setTelefone(data.pessoa.telefone || '');
          setMensagem({
            tipo: 'sucesso',
            texto: 'Pessoa encontrada no sistema! Defina a senha e o perfil abaixo.',
          });
        } else {
          setPessoaExiste(false);
          setNomeCompleto('');
          setTelefone('');
          setMensagem({
            tipo: 'alerta',
            texto: 'CPF não encontrado. Preencha o nome completo para cadastrar a pessoa.',
          });
        }
      } catch {
        setMensagem({ tipo: 'erro', texto: 'Erro ao verificar o CPF.' });
      } finally {
        setBuscandoCpf(false);
      }
    } else {
      setPessoaExiste(false);
      if (valorLimpo.length < 11) {
        setMensagem({ tipo: '', texto: '' });
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (cpf.length < 11) {
      setMensagem({ tipo: 'erro', texto: 'Informe um CPF válido com 11 dígitos.' });
      return;
    }

    const ok = await confirm({
      title: 'Cadastrar usuário',
      message: 'Deseja confirmar o cadastro deste usuário?',
      confirmText: 'Cadastrar',
    });
    if (!ok) return;

    setSalvando(true);
    setMensagem({ tipo: '', texto: '' });

    const cargoFormatado = obterNomePerfil(role);

    try {
      const res = await fetch('/api/gerenciamento/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cpf,
          nomeCompleto,
          dataNascimento,
          telefone,
          role,
          cargo: cargoFormatado,
          senha,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMensagem({
          tipo: 'sucesso',
          texto: `✅ Usuário cadastrado com sucesso como "${cargoFormatado}"!`,
        });
        setSenha('');
      } else {
        setMensagem({ tipo: 'erro', texto: data.error || 'Erro ao salvar usuário.' });
      }
    } catch {
      setMensagem({ tipo: 'erro', texto: 'Erro de conexão com o servidor.' });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Gerenciar Usuários</h1>
        <p>Cadastro dos usuários que terão acesso ao sistema.</p>
      </header>

      {mensagem.texto && (
        <div className={`${styles.message} ${styles[mensagem.tipo]}`}>
          {mensagem.texto}
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form} autoComplete="off">
        {/* CPF COM VALIDAÇÃO/BUSCA AUTOMÁTICA */}
        <div className={styles.inputGroup}>
          <label className={styles.label}>CPF de Acesso (Login):</label>
          <div className={styles.relativeWrapper}>
            <input
              type="text"
              required
              value={cpf}
              onChange={handleCpfChange}
              placeholder="Digite os 11 dígitos do CPF"
              maxLength={11}
              autoComplete="off"
              className={styles.input}
            />
            {buscandoCpf && <span className={styles.searchingBadge}>Buscando...</span>}
          </div>
        </div>

        {/* NOME COMPLETO */}
        <div className={styles.inputGroup}>
          <label className={styles.label}>
            Nome Completo: {pessoaExiste && <small className={styles.registeredBadge}>(Cadastrado)</small>}
          </label>
          <input
            type="text"
            required
            disabled={pessoaExiste}
            value={nomeCompleto}
            onChange={(e) => setNomeCompleto(e.target.value)}
            className={`${styles.input} ${pessoaExiste ? styles.inputDisabled : ''}`}
            placeholder={pessoaExiste ? '' : 'Digite o nome do operador'}
            autoComplete="off"
          />
        </div>

        {/* DATA E TELEFONE */}
        <div className={styles.gridTwoCols}>
          <div>
            <label className={styles.fieldLabel}>Data de Nascimento</label>
            <input
              type="date"
              disabled={pessoaExiste}
              value={dataNascimento}
              onChange={(e) => setDataNascimento(e.target.value)}
              className={`${styles.input} ${pessoaExiste ? styles.inputDisabled : ''}`}
              autoComplete="off"
            />
          </div>
          <div>
            <label className={styles.fieldLabel}>Telefone</label>
            <input
              type="text"
              disabled={pessoaExiste}
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(00) 00000-0000"
              className={`${styles.input} ${pessoaExiste ? styles.inputDisabled : ''}`}
              autoComplete="off"
            />
          </div>
        </div>

        {/* PERFIL / PERMISSÃO DE ACESSO */}
        <div className={`${styles.inputGroup} ${styles.roleInputGroup}`}>
          <label className={styles.label}>Perfil / Módulo de Acesso:</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className={styles.select}
          >
            {/* GESTOR GERAL */}
            <option value="GESTOR">🌟 GESTOR (Acesso Total ao Sistema)</option>
            
            {/* REGULAÇÃO */}
            <optgroup label="📋 REGULAÇÃO DE EXAMES">
              <option value="REGULACAO_ADMIN">👨‍💼 Admin (com Financeiro)</option>
              <option value="REGULACAO_COMUM">👤 Operador (sem Financeiro)</option>
            </optgroup>

            {/* CÂMARA TÉCNICA */}
            <optgroup label="🏛️ CÂMARA TÉCNICA">
              <option value="FARMACIA_ADMIN">💊 Admin Farmácia Judicial</option>
              <option value="PROCESSO_ADMIN">📄 Admin Processos</option>
            </optgroup>

            {/* JUNTA REGULADORA */}
            <optgroup label="👨‍⚕️ JUNTA REGULADORA">
              <option value="JUNTA_ADMIN">👨‍💼 Admin (Todos os Serviços)</option>
              <option value="JUNTA_CAEE">🎓 CAEE</option>
              <option value="JUNTA_EDUCACAO">📚 Educação</option>
              <option value="JUNTA_SAUDE">🏥 Saúde</option>
              <option value="JUNTA_ASSISTENCIA">🤝 Assistência Social</option>
            </optgroup>

            {/* CCZ */}
            <optgroup label="🐕 CCZ / ZOONOSES">
              <option value="CCZ_ADMIN">🔬 Admin CCZ / Veterinário</option>
            </optgroup>
          </select>
          <span className={styles.roleSubtext}>
            Cargo exibido no sistema: <strong>{obterNomePerfil(role)}</strong>
          </span>
        </div>

        {/* SENHA */}
        <div className={styles.inputGroup}>
          <label className={styles.label}>Senha de Acesso:</label>
          <input
            type="password"
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="Digite a senha de login"
            className={styles.input}
            autoComplete="new-password"
          />
        </div>

        <button
          type="submit"
          disabled={salvando || buscandoCpf}
          className={styles.submitButton}
        >
          {salvando ? 'Salvando...' : 'Concluir Cadastro de Usuário'}
        </button>
      </form>
    </div>
  );
}