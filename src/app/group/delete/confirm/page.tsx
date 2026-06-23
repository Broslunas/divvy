'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, AlertCircle, CheckCircle2, Trash2 } from 'lucide-react';
import PremiumLoader from '@/components/PremiumLoader';

function DeleteConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Confirmando la eliminación del grupo...');
  const [groupName, setGroupName] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('El enlace de verificación no contiene un token válido.');
      return;
    }

    let active = true;

    async function confirmDeletion() {
      try {
        const res = await fetch('/api/groups/delete-confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();

        if (!active) return;

        if (res.ok && data.success) {
          setGroupName(data.groupName || '');
          setStatus('success');
          setMessage(data.message || 'Grupo eliminado correctamente.');
          
          // Redirect to the main app dashboard after a brief delay
          setTimeout(() => {
            router.push('/app');
          }, 3500);
        } else {
          setStatus('error');
          setMessage(data.error || 'No se pudo confirmar la eliminación del grupo.');
        }
      } catch (err) {
        if (!active) return;
        setStatus('error');
        setMessage('Ocurrió un error de red o de servidor al procesar la solicitud.');
      }
    }

    confirmDeletion();

    return () => {
      active = false;
    };
  }, [token, router]);

  return (
    <div className="page-transition-enter" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: 'var(--bg-primary)',
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-lg)',
        padding: '40px 24px',
        boxShadow: 'var(--shadow-tactile)',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px'
      }}>
        {/* Header Icon */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '64px',
          height: '64px',
          borderRadius: 'var(--radius-full)',
          backgroundColor: status === 'loading'
            ? 'rgba(198, 122, 83, 0.1)' // Terracotta translucent
            : status === 'success'
              ? 'rgba(74, 93, 78, 0.1)' // Sage green translucent
              : 'rgba(212, 140, 69, 0.1)', // Orange warning translucent
          color: status === 'loading'
            ? 'var(--accent-primary)'
            : status === 'success'
              ? 'var(--success)'
              : 'var(--danger)',
        }}>
          {status === 'loading' && <PremiumLoader text="Eliminando" fullscreen={false} />}
          {status === 'success' && <CheckCircle2 size={32} />}
          {status === 'error' && <AlertCircle size={32} />}
        </div>

        {/* Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
          <h1 style={{
            fontSize: '1.4rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            margin: 0
          }}>
            {status === 'loading' && 'Procesando Solicitud'}
            {status === 'success' && '¡Grupo Eliminado!'}
            {status === 'error' && 'Error de Confirmación'}
          </h1>
          
          <p style={{
            fontSize: '0.9rem',
            color: status === 'error' ? 'var(--danger)' : 'var(--text-secondary)',
            lineHeight: 1.5,
            margin: 0,
            padding: '0 8px'
          }}>
            {message}
          </p>

          {status === 'success' && groupName && (
            <div style={{
              marginTop: '12px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              fontSize: '0.85rem',
              color: 'var(--text-primary)',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}>
              <Trash2 size={16} style={{ color: 'var(--text-secondary)' }} />
              <span>El grupo &ldquo;{groupName}&rdquo; ya no existe.</span>
            </div>
          )}
        </div>

        {/* Footer/Actions */}
        <div style={{ width: '100%', marginTop: '8px' }}>
          {status === 'success' && (
            <span style={{
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
              display: 'block',
              animation: 'pulse 2s infinite'
            }}>
              Redirigiéndote a tu panel en unos segundos...
            </span>
          )}
          {status === 'error' && (
            <button
              onClick={() => router.push('/app')}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '0.85rem',
                fontWeight: 700
              }}
            >
              Volver a Mis Grupos
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DeleteConfirmPage() {
  return (
    <Suspense fallback={<PremiumLoader text="Procesando enlace" />}>
      <DeleteConfirmContent />
    </Suspense>
  );
}
