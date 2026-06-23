'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Coins, Loader2 } from 'lucide-react';
import styles from '../login/login.module.css'; // Reuse auth styling
import Footer from '@/components/Footer';
import PremiumLoader from '@/components/PremiumLoader';

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkAuth, setCheckAuth] = useState(true);
  const [error, setError] = useState('');

  const [redirectTo, setRedirectTo] = useState('/app');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirectTo');
    if (redirect) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRedirectTo(redirect);
    }

    // Check if already authenticated
    fetch('/api/auth/me')
      .then((res) => {
        if (res.ok) {
          router.replace(redirect || '/app');
        } else {
          setCheckAuth(false);
        }
      })
      .catch(() => setCheckAuth(false));
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email || !password) {
      setError('Por favor, completa todos los campos.');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al registrarse');
      }

      // Automatically log in
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!loginRes.ok) {
        router.push('/login');
        return;
      }

      router.replace(redirectTo);
      router.refresh();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Ocurrió un error. Inténtalo de nuevo.';
      setError(errorMessage);
      setLoading(false);
    }
  };

  if (checkAuth) {
    return <PremiumLoader text="Verificando sesión" />;
  }

  return (
    <div className={`${styles.wrapper} page-transition-enter`}>
      <div className={styles.authCard}>
        <div className={styles.logoArea}>
          <Coins size={32} style={{ color: 'var(--accent-primary)' }} />
          <h1 className={styles.logoText}>Div<span>vy</span></h1>
        </div>

        <h2 className={styles.title}>Crea tu cuenta</h2>
        <p className={styles.subtitle}>Únete para empezar a gestionar tus gastos grupales.</p>

        {error && <div className={styles.errorMsg}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="username">Nombre de Usuario</label>
            <input
              id="username"
              type="text"
              placeholder="Tu nombre o apodo"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={styles.inputField}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="email">Correo Electrónico</label>
            <input
              id="email"
              type="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.inputField}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.inputField}
              required
            />
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Creando cuenta...' : 'Registrarse'}
          </button>
        </form>

        <div className={styles.footer}>
          ¿Ya tienes una cuenta?{' '}
          <Link href={`/login${redirectTo !== '/app' ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ''}`} className={styles.footerLink}>
            Inicia sesión
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}
