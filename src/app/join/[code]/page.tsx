'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle, CheckCircle, Coins, Users } from 'lucide-react';
import PremiumLoader from '@/components/PremiumLoader';

interface JoinPageProps {
  params: Promise<{ code: string }>;
}

interface GroupInviteDetails {
  id: string;
  name: string;
  description?: string;
  membersCount: number;
  isAlreadyMember: boolean;
}

export default function JoinGroupPage({ params }: JoinPageProps) {
  const { code } = use(params);
  const router = useRouter();
  
  const [status, setStatus] = useState<'checking' | 'ready' | 'joining' | 'success' | 'error'>('checking');
  const [errorMessage, setErrorMessage] = useState('');
  const [groupDetails, setGroupDetails] = useState<GroupInviteDetails | null>(null);

  useEffect(() => {
    let active = true;

    async function checkInvite() {
      try {
        // 1. Check authentication
        const authRes = await fetch('/api/auth/me');
        if (!authRes.ok) {
          router.replace(`/login?redirectTo=/join/${code}`);
          return;
        }

        // 2. Fetch group info by invite code
        const detailsRes = await fetch(`/api/groups/join?code=${code}`);
        if (!detailsRes.ok) {
          const data = await detailsRes.json().catch(() => ({}));
          throw new Error(data.error || 'Código de invitación inválido o grupo no encontrado.');
        }

        const data: GroupInviteDetails = await detailsRes.json();
        if (active) {
          setGroupDetails(data);
          
          if (data.isAlreadyMember) {
            // If they are already in the group, auto-redirect them
            setStatus('success');
            setTimeout(() => {
              router.replace(`/group/${data.id}`);
            }, 1000);
          } else {
            setStatus('ready');
          }
        }
      } catch (err: unknown) {
        if (active) {
          setErrorMessage(err instanceof Error ? err.message : 'Error al verificar la invitación.');
          setStatus('error');
        }
      }
    }

    checkInvite();

    return () => {
      active = false;
    };
  }, [code, router]);

  const handleAcceptInvite = async () => {
    if (!groupDetails) return;
    
    setStatus('joining');
    try {
      const joinRes = await fetch('/api/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: code }),
      });

      if (!joinRes.ok) {
        const data = await joinRes.json().catch(() => ({}));
        throw new Error(data.error || 'No se pudo unir al grupo.');
      }

      setStatus('success');
      // Redirect to group after a brief delay
      setTimeout(() => {
        router.push(`/group/${groupDetails.id}`);
      }, 1500);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al unirse al grupo.');
      setStatus('error');
    }
  };

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
        maxWidth: '400px',
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-lg)',
        padding: '32px 24px',
        boxShadow: 'var(--shadow-tactile)',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px'
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Coins size={32} style={{ color: 'var(--accent-primary)' }} />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
            Div<span style={{ color: 'var(--accent-primary)' }}>vy</span>
          </h1>
        </div>

        {status === 'checking' && (
          <PremiumLoader text="Verificando invitación" fullscreen={false} />
        )}

        {status === 'ready' && groupDetails && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--accent-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Invitación recibida
              </span>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                ¿Quieres unirte a {groupDetails.name}?
              </h2>
              {groupDetails.description && (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '4px', marginBottom: 0 }}>
                  &ldquo;{groupDetails.description}&rdquo;
                </p>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-light)' }}>
              <Users size={14} />
              <span>{groupDetails.membersCount} {groupDetails.membersCount === 1 ? 'miembro' : 'miembros'} actualmente</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: '8px' }}>
              <button
                onClick={handleAcceptInvite}
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px', fontSize: '0.85rem', fontWeight: 700 }}
              >
                Aceptar y Unirse al Grupo
              </button>
              <button
                onClick={() => router.push('/')}
                className="btn btn-secondary"
                style={{ width: '100%', padding: '12px', fontSize: '0.85rem', fontWeight: 700 }}
              >
                Rechazar / Cancelar
              </button>
            </div>
          </div>
        )}

        {status === 'joining' && (
          <PremiumLoader text="Uniéndote al grupo" fullscreen={false} />
        )}

        {status === 'success' && groupDetails && (
          <>
            <CheckCircle size={36} style={{ color: 'var(--success)' }} />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
              {groupDetails.isAlreadyMember ? 'Ya eres miembro' : '¡Te has unido correctamente!'}
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
              Bienvenido al grupo <strong style={{ color: 'var(--text-primary)' }}>{groupDetails.name}</strong>.
            </p>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Redirigiéndote...</span>
          </>
        )}

        {status === 'error' && (
          <>
            <AlertCircle size={36} style={{ color: 'var(--danger)' }} />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>No se pudo procesar la invitación</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--danger)', fontWeight: 600, margin: 0 }}>
              {errorMessage}
            </p>
            <button
              onClick={() => router.push('/app')}
              className="btn btn-primary"
              style={{ width: '100%', padding: '10px 14px', fontSize: '0.85rem', marginTop: '8px' }}
            >
              Volver al Inicio
            </button>
          </>
        )}
      </div>
    </div>
  );
}
