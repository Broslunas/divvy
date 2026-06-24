import { useState } from 'react';
import { Sparkles, Loader2, X, Check, ArrowRight } from 'lucide-react';

interface AIGenerateModalProps {
  groupId: string;
  selectedText: string;
  onInsert: (content: string, isReplacement: boolean) => void;
  onClose: () => void;
}

export default function AIGenerateModal({
  groupId,
  selectedText,
  onInsert,
  onClose
}: AIGenerateModalProps) {
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<'full' | 'fragment'>(selectedText ? 'fragment' : 'full');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewContent, setPreviewContent] = useState('');

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError('');
    setPreviewContent('');

    try {
      const res = await fetch(`/api/groups/${groupId}/document/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          mode,
          content: mode === 'fragment' ? selectedText : undefined
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'No se pudo generar con IA.');
      }

      const data = await res.json();
      setPreviewContent(data.content);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Error de conexión con la IA.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="doc-modal-overlay">
      <div className="doc-modal-card" style={{ maxWidth: '500px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="doc-modal-title" style={{ color: 'var(--accent-primary)' }}>
            <Sparkles size={18} style={{ fill: 'currentColor' }} />
            Generador de IA (Gemini)
          </span>
          <button onClick={onClose} className="doc-modal-close" disabled={loading}>
            <X size={18} />
          </button>
        </div>

        {/* Input prompt */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            ¿Qué quieres que la IA escriba o haga?
          </label>
          <textarea
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={loading}
            placeholder={
              mode === 'fragment'
                ? 'Ej: "Traduce al inglés", "Resúmelo en 3 puntos", "Corrige errores ortográficos y dale un tono profesional"...'
                : 'Ej: "Crea un itinerario completo de 4 días en París incluyendo visitas al Louvre y la Torre Eiffel", "Haz una lista detallada de cosas que meter en la maleta para ir a esquiar"...'
            }
            style={{
              padding: '10px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              outline: 'none',
              fontSize: '0.78rem',
              width: '100%',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              resize: 'none'
            }}
          />
        </div>

        {/* Mode options (only if text is selected) */}
        {selectedText && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setMode('fragment')}
              disabled={loading}
              style={{
                flex: 1,
                padding: '8px 10px',
                fontSize: '0.7rem',
                fontWeight: 700,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-light)',
                cursor: 'pointer',
                backgroundColor: mode === 'fragment' ? 'rgba(200, 122, 83, 0.12)' : 'var(--bg-card)',
                color: mode === 'fragment' ? 'var(--accent-primary)' : 'var(--text-secondary)'
              }}
            >
              🪄 Modificar texto seleccionado
            </button>
            <button
              onClick={() => setMode('full')}
              disabled={loading}
              style={{
                flex: 1,
                padding: '8px 10px',
                fontSize: '0.7rem',
                fontWeight: 700,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-light)',
                cursor: 'pointer',
                backgroundColor: mode === 'full' ? 'rgba(200, 122, 83, 0.12)' : 'var(--bg-card)',
                color: mode === 'full' ? 'var(--accent-primary)' : 'var(--text-secondary)'
              }}
            >
              📝 Generar nuevo documento completo
            </button>
          </div>
        )}

        {/* Selected text display preview */}
        {mode === 'fragment' && selectedText && (
          <div
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-md)',
              padding: '8px 12px',
              maxHeight: '80px',
              overflowY: 'auto',
              fontSize: '0.7rem',
              color: 'var(--text-secondary)',
              fontStyle: 'italic'
            }}
          >
            <strong>Selección:</strong> "{selectedText.length > 100 ? `${selectedText.substring(0, 100)}...` : selectedText}"
          </div>
        )}

        {/* Action button */}
        <button
          onClick={handleGenerate}
          disabled={loading || !prompt.trim()}
          className="btn btn-primary"
          style={{
            width: '100%',
            padding: '10px',
            fontSize: '0.78rem',
            borderRadius: 'var(--radius-full)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Generando con IA...
            </>
          ) : (
            <>
              <Sparkles size={14} style={{ fill: 'currentColor' }} /> Generar
            </>
          )}
        </button>

        {/* Error message */}
        {error && (
          <div style={{ color: 'var(--danger)', fontSize: '0.72rem', textAlign: 'center', fontWeight: 600 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Preview and Insert Area */}
        {previewContent && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              borderTop: '1px solid var(--border-light)',
              paddingTop: '16px',
              animation: 'fadeIn 0.3s ease'
            }}
          >
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Resultado generado:
            </span>
            <div
              style={{
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                fontSize: '0.75rem',
                maxHeight: '180px',
                overflowY: 'auto',
                color: 'var(--text-primary)',
                lineHeight: '1.5',
                borderLeft: '4px solid var(--accent-primary)'
              }}
              dangerouslySetInnerHTML={{ __html: previewContent }}
            />

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => {
                  onInsert(previewContent, mode === 'fragment');
                  onClose();
                }}
                className="btn btn-primary"
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  fontSize: '0.72rem',
                  borderRadius: 'var(--radius-full)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
              >
                <Check size={14} /> Insertar en documento
              </button>
              <button
                onClick={handleGenerate}
                className="btn btn-secondary"
                style={{
                  padding: '8px 14px',
                  fontSize: '0.72rem',
                  borderRadius: 'var(--radius-full)',
                  cursor: 'pointer'
                }}
              >
                Reintentar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
