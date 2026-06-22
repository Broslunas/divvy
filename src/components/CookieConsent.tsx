'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check local storage for consent
    const consent = localStorage.getItem('divvy_cookie_consent');
    if (!consent) {
      // Show the banner with a slight delay for a nice effect
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('divvy_cookie_consent', 'accepted');
    setShowBanner(false);
  };

  const handleDecline = () => {
    localStorage.setItem('divvy_cookie_consent', 'declined');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'calc(100% - 32px)',
      maxWidth: '440px',
      backgroundColor: 'rgba(255, 255, 255, 0.85)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid var(--border-light)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px',
      boxShadow: '0 12px 30px -4px rgba(28, 28, 30, 0.12), 0 4px 12px -2px rgba(28, 28, 30, 0.06)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      animation: 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
    }}>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideUp {
          from { opacity: 0; transform: translate(-50%, 24px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}} />
      <div>
        <h4 style={{
          fontSize: '0.95rem',
          fontWeight: 700,
          marginBottom: '6px',
          color: 'var(--text-primary)',
        }}>
          Control de cookies 🍪
        </h4>
        <p style={{
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.4,
          margin: 0,
        }}>
          Utilizamos cookies esenciales para gestionar tu autenticación y asegurar que tu sesión permanezca activa. Al continuar utilizando nuestro sitio, aceptas su uso. Consulta nuestra{' '}
          <Link 
            href="/cookies" 
            style={{ 
              color: 'var(--accent-primary)', 
              fontWeight: 600, 
              textDecoration: 'underline' 
            }}
          >
            Política de Cookies
          </Link>{' '}
          para más información.
        </p>
      </div>
      <div style={{
        display: 'flex',
        gap: '10px',
        width: '100%',
      }}>
        <button
          onClick={handleDecline}
          style={{
            flex: 1,
            padding: '10px 16px',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border-light)',
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'var(--transition-smooth)',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ECEAE5'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
        >
          Rechazar
        </button>
        <button
          onClick={handleAccept}
          style={{
            flex: 1,
            padding: '10px 16px',
            borderRadius: 'var(--radius-full)',
            border: 'none',
            backgroundColor: 'var(--accent-primary)',
            color: '#FFFFFF',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'var(--transition-smooth)',
            boxShadow: 'var(--shadow-tactile)',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-primary-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-primary)'}
        >
          Aceptar todo
        </button>
      </div>
    </div>
  );
}
