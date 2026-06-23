'use client';

import { useEffect, useState } from 'react';
import { Coins } from 'lucide-react';

interface PremiumLoaderProps {
  text?: string;
  fullscreen?: boolean;
}

export default function PremiumLoader({ text = 'Cargando...', fullscreen = true }: PremiumLoaderProps) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: fullscreen ? '100vh' : '200px',
        width: '100%',
        backgroundColor: fullscreen ? 'var(--bg-primary)' : 'transparent',
        padding: '24px',
        boxSizing: 'border-box',
        position: fullscreen ? 'fixed' : 'relative',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: fullscreen ? 9999 : 1,
        transition: 'all 0.3s ease',
      }}
    >
      {/* Glow Effect */}
      {fullscreen && (
        <div
          className="loader-glow"
          style={{
            position: 'absolute',
            width: '280px',
            height: '280px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(200, 122, 83, 0.08) 0%, rgba(74, 93, 78, 0.03) 70%, transparent 100%)',
            filter: 'blur(30px)',
            zIndex: -1,
          }}
        />
      )}

      {/* Loader Container */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
          padding: '32px',
          borderRadius: 'var(--radius-lg)',
          backgroundColor: fullscreen ? 'rgba(255, 255, 255, 0.45)' : 'transparent',
          backdropFilter: fullscreen ? 'blur(16px)' : 'none',
          border: fullscreen ? '1px solid rgba(255, 255, 255, 0.5)' : 'none',
          boxShadow: fullscreen ? '0 10px 30px rgba(0, 0, 0, 0.02)' : 'none',
          maxWidth: '300px',
          width: '100%',
        }}
      >
        {/* Animated Coins Icon & Logo */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
          }}
        >
          {/* Pulsing ring */}
          <div
            className="loader-spin-dashed"
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              border: '2px dashed var(--accent-primary)',
              opacity: 0.3,
            }}
          />
          <div
            className="loader-spin-reverse"
            style={{
              position: 'absolute',
              width: '80%',
              height: '80%',
              borderRadius: '50%',
              border: '1.5px solid var(--accent-secondary)',
              opacity: 0.15,
            }}
          />
          
          {/* Center Icon */}
          <div
            className="loader-float"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              backgroundColor: 'var(--bg-card)',
              boxShadow: 'var(--shadow-tactile)',
              color: 'var(--accent-primary)',
            }}
          >
            <Coins size={22} className="loader-pulse-icon" />
          </div>
        </div>

        {/* Text */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '0.02em',
              display: 'inline-block',
            }}
          >
            {text}
            <span style={{ display: 'inline-block', width: '12px', textAlign: 'left' }}>
              {dots}
            </span>
          </div>
          {fullscreen && (
            <div
              style={{
                fontSize: '0.72rem',
                color: 'var(--text-secondary)',
                marginTop: '6px',
                opacity: 0.8,
              }}
            >
              Divvy está ordenando las cuentas
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
