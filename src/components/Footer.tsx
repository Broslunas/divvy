'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Footer() {
  const [year, setYear] = useState(2026);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return (
    <footer style={{
      width: '100%',
      padding: '24px 16px',
      marginTop: 'auto',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '12px',
      borderTop: '1px solid var(--border-light)',
      backgroundColor: 'transparent',
    }}>
      <style dangerouslySetInnerHTML={{__html: `
        .footer-link {
          font-size: 0.8rem;
          font-weight: 500;
          color: var(--text-secondary);
          transition: var(--transition-smooth);
          text-decoration: none;
        }
        .footer-link:hover {
          color: var(--accent-primary);
        }
        .footer-creator {
          color: var(--accent-primary);
          font-weight: 600;
          text-decoration: none;
          transition: var(--transition-smooth);
        }
        .footer-creator:hover {
          text-decoration: underline;
        }
      `}} />
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '16px',
      }}>
        <Link href="/terms" className="footer-link">
          Términos de Servicio
        </Link>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>•</span>
        <Link href="/privacy" className="footer-link">
          Política de Privacidad
        </Link>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>•</span>
        <Link href="/cookies" className="footer-link">
          Política de Cookies
        </Link>
      </div>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
      }}>
        <p style={{
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          textAlign: 'center',
          margin: 0,
        }}>
          &copy; {year} Divvy. Todos los derechos reservados.
        </p>
        <p style={{
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          textAlign: 'center',
          margin: 0,
        }}>
          Creado por{' '}
          <a 
            href="https://broslunas.com" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="footer-creator"
          >
            Broslunas
          </a>
        </p>
      </div>
    </footer>
  );
}
