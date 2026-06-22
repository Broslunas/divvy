'use client';

import { useState } from 'react';
import { Sparkles, Loader2, ArrowRight } from 'lucide-react';
import type { User } from '@/types';

interface AIInputParserProps {
  members: Omit<User, 'passwordHash'>[];
  currentUserId: string;
  onParseComplete: (data: {
    title: string;
    amount: number;
    category: string;
    paidById: string;
    splitType: 'equal' | 'exact';
    splits?: { userId: string; value: number }[];
    date?: string;
  }) => void;
  isBonoCultural?: boolean;
}

export default function AIInputParser({ members, currentUserId, onParseComplete, isBonoCultural }: AIInputParserProps) {
  const [inputText, setInputText] = useState('');
  const [parsing, setParsing] = useState(false);

  const handleSuggest = (text: string) => {
    setInputText(text);
  };

  const handleParse = async () => {
    if (!inputText.trim()) return;

    setParsing(true);
    
    try {
      const res = await fetch('/api/ai/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText, isBonoCultural }),
      });

      if (!res.ok) {
        throw new Error('Gemini API request failed');
      }

      const data = await res.json();
      
      if (data && data.title && typeof data.amount === 'number') {
        onParseComplete({
          title: data.title,
          amount: data.amount,
          category: data.category || (isBonoCultural ? 'Artes en vivo, patrimonio y audiovisual' : 'Otros'),
          paidById: data.paidById || currentUserId,
          splitType: 'equal',
          date: data.date || new Date().toISOString().split('T')[0]
        });
        setParsing(false);
        setInputText('');
        return;
      }
      throw new Error('Invalid JSON schema returned by Gemini');
    } catch (e) {
      console.warn('Fallback to local heuristics due to AI parsing error:', e);
      
      // Heuristic fallback logic
      const text = inputText.toLowerCase();
      
      // 1. Extract Amount
      let amount = 0;
      const amountRegex = /(\d+[\.,]?\d*)\s*(?:€|euros?|usd|\$)/i;
      const amountMatch = text.match(amountRegex);
      if (amountMatch) {
        amount = parseFloat(amountMatch[1].replace(',', '.'));
      } else {
        const numberRegex = /(?:\b(?:gastado|de|pagué|importe)\b\s*)?(\d+[\.,]?\d*)\b/;
        const numberMatch = text.match(numberRegex);
        if (numberMatch) {
          amount = parseFloat(numberMatch[1].replace(',', '.'));
        }
      }

      // 2. Extract Category
      let category = isBonoCultural ? 'Artes en vivo, patrimonio y audiovisual' : 'Otros';
      if (isBonoCultural) {
        if (text.includes('libro') || text.includes('cómic') || text.includes('disco') || text.includes('cd') || text.includes('vinilo') || text.includes('físico') || text.includes('revista') || text.includes('videojuego físico') || text.includes('manga')) {
          category = 'Soporte físico';
        } else if (text.includes('spotify') || text.includes('netflix') || text.includes('digital') || text.includes('online') || text.includes('suscr') || text.includes('ebook') || text.includes('playstation') || text.includes('steam') || text.includes('digital') || text.includes('crunchyroll')) {
          category = 'Consumo digital';
        }
      } else {
        if (text.includes('cena') || text.includes('comida') || text.includes('restaurante') || text.includes('pizza') || text.includes('café') || text.includes('desayuno')) {
          category = 'Comida';
        } else if (text.includes('taxi') || text.includes('bus') || text.includes('vuelo') || text.includes('tren') || text.includes('gasolina') || text.includes('peaje') || text.includes('viaje')) {
          category = 'Transporte';
        } else if (text.includes('hotel') || text.includes('alojamiento') || text.includes('hostal') || text.includes('airbnb')) {
          category = 'Alojamiento';
        } else if (text.includes('súper') || text.includes('supermercado') || text.includes('compra') || text.includes('mercadona') || text.includes('carrefour')) {
          category = 'Supermercado';
        } else if (text.includes('entradas') || text.includes('cine') || text.includes('museo') || text.includes('concierto') || text.includes('ocio')) {
          category = 'Entretenimiento';
        }
      }

      // 3. Extract Concept / Title
      let title = '';
      const stopwords = ['pagué', 'gasto', 'gasté', 'en', 'de', 'con', 'para', 'el', 'la', 'un', 'una', 'ayer', 'hoy', 'euros', '€', 'pagado', 'por', 'bono', 'cultural'];
      
      const cleanWords = inputText
        .split(' ')
        .filter(word => !stopwords.includes(word.toLowerCase()) && !word.match(/\d/));
      
      if (cleanWords.length > 0) {
        title = cleanWords.slice(0, 3).join(' ');
      } else {
        title = isBonoCultural ? 'Compra Bono Cultural' : 'Gasto Rápido';
      }

      // 4. Extract Date (relative)
      let dateStr = new Date().toISOString().split('T')[0];
      if (text.includes('ayer')) {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        dateStr = d.toISOString().split('T')[0];
      } else if (text.includes('anteayer') || text.includes('hace dos días')) {
        const d = new Date();
        d.setDate(d.getDate() - 2);
        dateStr = d.toISOString().split('T')[0];
      }

      // 5. Paid by & Splits
      let paidById = currentUserId;
      
      // Look for member names
      members.forEach((m) => {
        if (text.includes(m.username.toLowerCase())) {
          // If name is found near "pago" or "pago X", he paid
          const paidIndex = text.indexOf('pago');
          const nameIndex = text.indexOf(m.username.toLowerCase());
          if (paidIndex !== -1 && Math.abs(paidIndex - nameIndex) < 15) {
            paidById = m.id;
          }
        }
      });

      // Split equally by default
      const splitsPayload = members.map(m => ({
        userId: m.id,
        value: 1
      }));

      onParseComplete({
        title,
        amount: amount || 0,
        category,
        paidById,
        splitType: 'equal',
        splits: splitsPayload,
        date: dateStr
      });
      
      setParsing(false);
      setInputText('');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', backgroundColor: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-primary)', fontWeight: 700, fontSize: '0.85rem' }}>
        <Sparkles size={16} />
        <span>Descripción inteligente por IA</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <textarea
          rows={2}
          placeholder={isBonoCultural ? "Escribe qué compraste del Bono. Ej: 'Ayer compré libro físico de fantasía por 22.50€'" : "Escribe lo que gastaste. Ej: 'Cena de ayer 45€ con Pablo y Juan'"}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={parsing}
          style={{
            padding: '10px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-light)',
            outline: 'none',
            fontSize: '0.85rem',
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-primary)',
            resize: 'none',
            width: '100%',
            fontFamily: 'inherit'
          }}
        />

        <button
          type="button"
          onClick={handleParse}
          disabled={parsing || !inputText.trim()}
          className="btn btn-primary"
          style={{
            padding: '8px 16px',
            fontSize: '0.8rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            width: '100%'
          }}
        >
          {parsing ? (
            <>
              <Loader2 className="animate-spin" size={14} /> Analizando texto...
            </>
          ) : (
            <>
              Analizar Texto <ArrowRight size={14} />
            </>
          )}
        </button>
      </div>

      {/* Suggested prompts */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Ejemplos que puedes probar:</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {isBonoCultural ? (
            <>
              <button
                type="button"
                onClick={() => handleSuggest('Entradas concierto de rock 45€ el sábado pasado')}
                style={{
                  textAlign: 'left',
                  background: 'transparent',
                  border: 'none',
                  fontSize: '0.72rem',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                {"• \"Entradas concierto de rock 45€ el sábado pasado\""}
              </button>
              <button
                type="button"
                onClick={() => handleSuggest('Suscripción mensual Spotify Premium digital por 11.99€')}
                style={{
                  textAlign: 'left',
                  background: 'transparent',
                  border: 'none',
                  fontSize: '0.72rem',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                {"• \"Suscripción mensual Spotify Premium digital por 11.99€\""}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => handleSuggest('Cena de ayer 56.40€ pagado por mí con Juan')}
                style={{
                  textAlign: 'left',
                  background: 'transparent',
                  border: 'none',
                  fontSize: '0.72rem',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                {"• \"Cena de ayer 56.40€ pagado por mí con Juan\""}
              </button>
              <button
                type="button"
                onClick={() => handleSuggest('Gasolina viaje 45€ pagado por Pablo')}
                style={{
                  textAlign: 'left',
                  background: 'transparent',
                  border: 'none',
                  fontSize: '0.72rem',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                {"• \"Gasolina viaje 45€ pagado por Pablo\""}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
