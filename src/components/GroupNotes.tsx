'use client';

import { useState } from 'react';
import { Edit2, Save, FileText } from 'lucide-react';

interface GroupNotesProps {
  initialNotes: string;
  onSaveNotes: (notes: string) => Promise<void>;
}

export default function GroupNotes({ initialNotes, onSaveNotes }: GroupNotesProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveNotes(notes);
      setIsEditing(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // Simple Markdown-like formatter for previewing
  const renderMarkdown = (text: string) => {
    if (!text.trim()) {
      return (
        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
          El tablón está vacío. Pulsa en Editar para escribir notas de viaje, itinerario o listas.
        </div>
      );
    }

    const lines = text.split('\n');
    return lines.map((line, i) => {
      // Headers
      if (line.startsWith('# ')) {
        return <h1 key={i} style={{ fontSize: '1.2rem', fontWeight: 800, margin: '12px 0 6px 0', borderBottom: '1px solid var(--border-light)', paddingBottom: '4px' }}>{line.substring(2)}</h1>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={i} style={{ fontSize: '1rem', fontWeight: 700, margin: '10px 0 4px 0' }}>{line.substring(3)}</h2>;
      }
      // Bullet list
      if (line.startsWith('* ') || line.startsWith('- ')) {
        return <li key={i} style={{ fontSize: '0.8rem', marginLeft: '16px', listStyleType: 'disc', margin: '2px 0' }}>{line.substring(2)}</li>;
      }
      // Regular paragraph
      return <p key={i} style={{ fontSize: '0.8rem', margin: '4px 0', minHeight: '16px' }}>{line}</p>;
    });
  };

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-md)',
        padding: '16px',
        boxShadow: 'var(--shadow-subtle)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.9rem' }}>
          <FileText size={18} style={{ color: 'var(--accent-primary)' }} />
          <span>Tablón de notas / Itinerario</span>
        </div>

        <button
          onClick={() => {
            if (isEditing) {
              handleSave();
            } else {
              setIsEditing(true);
            }
          }}
          disabled={saving}
          className="btn"
          style={{
            padding: '5px 12px',
            fontSize: '0.72rem',
            borderRadius: 'var(--radius-full)',
            backgroundColor: isEditing ? 'var(--success-light)' : 'var(--bg-secondary)',
            color: isEditing ? 'var(--success)' : 'var(--text-primary)',
            fontWeight: 700,
            border: isEditing ? '1px solid rgba(45, 106, 79, 0.12)' : '1px solid var(--border-light)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          {isEditing ? (
            <>
              <Save size={12} /> {saving ? 'Guardando...' : 'Guardar'}
            </>
          ) : (
            <>
              <Edit2 size={12} /> Editar
            </>
          )}
        </button>
      </div>

      {isEditing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <textarea
            rows={6}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={`Escribe aquí con formato simple:
# Título del viaje
## Itinerario Día 1
- Hotel: Alabaster Inn
- 10:00 Visita museo
- 14:00 Comida`}
            style={{
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              outline: 'none',
              fontSize: '0.8rem',
              width: '100%',
              fontFamily: 'monospace',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              resize: 'vertical'
            }}
          />
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
            Soporta formato básico: # Título, ## Subtítulo, y listas con guión (-) o asterisco (*).
          </span>
        </div>
      ) : (
        <div style={{ padding: '4px 2px', wordBreak: 'break-word' }}>
          {renderMarkdown(notes)}
        </div>
      )}
    </div>
  );
}
