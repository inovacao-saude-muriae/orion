'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginAction } from '@/app/actions/auth';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Mapeamento de destinos com base no perfil (Role)
  const getDestinationByRole = (role) => {
    switch (role) {
      case 'ADMIN':
      case 'GESTOR':
        return '/'; // Gestor/Admin vai para o Dashboard Geral

      case 'OPERADOR_REGULA':
      case 'ADMIN_REGULA':
        return '/regulacao?tab=DASHBOARD';

      case 'ADMIN_FARMACIA':
      case 'OPERADOR_FARMACIA':
        return '/camara-tecnica/farmacia-judicial?tab=DASHBOARD';

      case 'ADMIN_PROCESSO':
        return '/camara-tecnica/processos';

      case 'OPERADOR_JUNTA':
      case 'ADMIN_JUNTA':
        return '/junta-reguladora?tab=CADASTRO';

      case 'VETERINARIO':
      case 'OPERADOR_CCZ':
        return '/ccz?tab=DASHBOARD';

      default:
        return '/regulacao';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg('');
    setLoading(true);

    const formData = new FormData(e.target);
    const res = await loginAction(formData);

    if (res?.success) {
      const cpfDigitado = formData.get('cpf')?.replace(/\D/g, '');
      if (typeof window !== 'undefined' && cpfDigitado) {
        localStorage.setItem('user_cpf', cpfDigitado);
      }

      // 1. Atualiza o cache de rotas do Next.js para reconhecer o cookie recém-criado
      router.refresh();

      // 2. Redireciona para o destino baseado no perfil
      const destination = getDestinationByRole(res.role);
      router.push(destination);
    } else {
      setMsg(res?.error || 'CPF ou senha incorretos.');
      setLoading(false);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <header className={styles.loginHeader}>
        <div className={styles.brand}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
          </svg>
          <span>Orion</span>
        </div>
        <span className={styles.badge}>Acesso Restrito</span>
      </header>

      <main className={styles.mainContent}>
        <form onSubmit={handleSubmit} className={styles.card}>
          <h2 className={styles.title}>Identifique-se</h2>

          {msg && <div className={styles.errorMessage}>{msg}</div>}

          <div className={styles.inputGroup}>
            <label className={styles.label}>CPF:</label>
            <input
              type="text"
              name="cpf"
              required
              placeholder="Digite seu CPF"
              className={styles.input}
            />
          </div>

          <div className={styles.inputGroupLast}>
            <label className={styles.label}>Senha:</label>
            <div className={styles.passwordWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                name="senha"
                required
                placeholder="Digite sua senha"
                className={`${styles.input} ${styles.inputPassword}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className={styles.togglePassword}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                aria-pressed={showPassword}
                title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <path d="M6.61 6.61A18.5 18.5 0 0 0 2 12s3.5 8 10 8a9.12 9.12 0 0 0 5.39-1.61" />
                    <line x1="2" y1="2" x2="22" y2="22" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`${styles.button} ${loading ? styles.buttonDisabled : ''}`}
          >
            {loading ? 'Acessando...' : 'Entrar no Sistema'}
          </button>
        </form>
      </main>
    </div>
  );
}