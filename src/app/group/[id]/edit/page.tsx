'use client';

import { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import GroupDocument from '@/components/document/GroupDocument';
import PremiumLoader from '@/components/PremiumLoader';
import type { Group, Expense, User } from '@/types';

interface EditPageProps {
  params: Promise<{ id: string }>;
}

export default function GroupDocumentEditPage({ params }: EditPageProps) {
  const router = useRouter();
  const { id: groupId } = use(params);

  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Omit<User, 'passwordHash'>[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchDetails = useCallback(async () => {
    try {
      const [userRes, detailRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch(`/api/groups/${groupId}`)
      ]);

      if (!userRes.ok) {
        router.replace('/login');
        return;
      }

      if (!detailRes.ok) {
        if (detailRes.status === 403) {
          setError('No tienes acceso a este grupo.');
        } else if (detailRes.status === 404) {
          setError('El grupo no existe.');
        } else {
          setError('Error al cargar la información del grupo.');
        }
        return;
      }

      const data = await detailRes.json();
      setGroup(data.group);
      setMembers(data.members);
      setExpenses(data.expenses);
    } catch (e) {
      console.error(e);
      setError('Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  }, [groupId, router]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  if (loading) {
    return <PremiumLoader text="Iniciando el editor de documentos..." />;
  }

  if (error || !group) {
    return (
      <div 
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          gap: '16px',
          padding: '24px',
          textAlign: 'center'
        }}
      >
        <span style={{ fontSize: '2rem' }}>⚠️</span>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Ha ocurrido un problema</h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: '320px' }}>
          {error || 'No se pudieron cargar los datos del grupo.'}
        </p>
        <button
          onClick={() => router.push(`/group/${groupId}`)}
          className="btn btn-primary"
          style={{ padding: '8px 20px', fontSize: '0.78rem', borderRadius: 'var(--radius-full)' }}
        >
          Volver al grupo
        </button>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', width: '100vw', backgroundColor: '#F0F2F5' }}>
      <GroupDocument
        groupId={groupId}
        expenses={expenses}
        members={members}
        currency={group.currency}
        isEditMode={true}
      />
    </div>
  );
}
