'use client';

import { useState } from 'react';
import { 
  Calendar, 
  Download, 
  BookOpen, 
  Laptop, 
  Ticket, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  ShieldCheck, 
  Info,
  CheckSquare,
  Square
} from 'lucide-react';
import type { Expense, Group } from '@/types';

interface BonoCulturalHubProps {
  group: Group;
  expenses: Expense[];
  onToggleJustified: (expenseId: string, currentVal: boolean) => Promise<void>;
}

export default function BonoCulturalHub({ group, expenses, onToggleJustified }: BonoCulturalHubProps) {
  const [exporting, setExporting] = useState(false);
  const [toggleLoading, setToggleLoading] = useState<string | null>(null);

  // Filter out any settlement payments
  const bonoExpenses = expenses.filter(e => !e.isSettlement);

  // Calculate actual spending per category
  const liveArtsSpent = bonoExpenses
    .filter(e => e.category === 'Artes en vivo, patrimonio y audiovisual')
    .reduce((sum, e) => sum + e.amount, 0);

  const physicalSpent = bonoExpenses
    .filter(e => e.category === 'Soporte físico')
    .reduce((sum, e) => sum + e.amount, 0);

  const digitalSpent = bonoExpenses
    .filter(e => e.category === 'Consumo digital')
    .reduce((sum, e) => sum + e.amount, 0);

  // Bono limits
  const LIMIT_LIVE_ARTS = 200;
  const LIMIT_PHYSICAL = 100;
  const LIMIT_DIGITAL = 100;
  const LIMIT_TOTAL = 400;

  // Capped spending (only up to the category limits are deducted from the voucher)
  const liveArtsCapped = Math.min(liveArtsSpent, LIMIT_LIVE_ARTS);
  const physicalCapped = Math.min(physicalSpent, LIMIT_PHYSICAL);
  const digitalCapped = Math.min(digitalSpent, LIMIT_DIGITAL);
  const totalCappedSpent = liveArtsCapped + physicalCapped + digitalCapped;
  const totalAvailable = LIMIT_TOTAL - totalCappedSpent;

  // Real excess amounts paid out of pocket
  const liveArtsExcess = Math.max(0, liveArtsSpent - LIMIT_LIVE_ARTS);
  const physicalExcess = Math.max(0, physicalSpent - LIMIT_PHYSICAL);
  const digitalExcess = Math.max(0, digitalSpent - LIMIT_DIGITAL);
  const totalExcess = liveArtsExcess + physicalExcess + digitalExcess;

  // Expiration countdown
  const getExpirationInfo = () => {
    if (!group.targetDate) return { text: 'Sin fecha de activación', isNear: false, daysLeft: 365 };
    try {
      const hasTime = group.targetDate.includes('T');
      const targetDate = new Date(hasTime ? group.targetDate : group.targetDate + 'T00:00:00');
      const now = new Date();
      const diffMs = targetDate.getTime() - now.getTime();
      const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      
      const formattedDate = targetDate.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      if (days <= 0) {
        return { text: `Caducó el ${formattedDate} ❌`, isNear: true, daysLeft: 0, expired: true };
      }

      if (days <= 30) {
        return { text: `¡Atención! Caduca en ${days} días (${formattedDate})`, isNear: true, daysLeft: days };
      }

      return { text: `Caduca el ${formattedDate} (${days} días restantes)`, isNear: days <= 90, daysLeft: days };
    } catch {
      return { text: 'Fecha inválida', isNear: false, daysLeft: 365 };
    }
  };

  const expInfo = getExpirationInfo();

  // Justification stats
  const totalReceipts = bonoExpenses.length;
  const justifiedReceipts = bonoExpenses.filter(e => e.ticketUploaded).length;
  const justificationPercent = totalReceipts > 0 ? (justifiedReceipts / totalReceipts) * 100 : 100;

  // Export to CSV
  const handleExportCSV = () => {
    setExporting(true);
    try {
      const headers = ['Concepto', 'Categoria', 'Importe (€)', 'Fecha', 'Justificado en Web (Si/No)', 'Notas'];
      const rows = bonoExpenses.map(e => [
        e.title.replace(/"/g, '""'),
        e.category,
        e.amount.toFixed(2),
        new Date(e.date).toLocaleDateString('es-ES'),
        e.ticketUploaded ? 'SI' : 'NO',
        (e.notes || '').replace(/"/g, '""')
      ]);

      const csvContent = "\uFEFF" + [
        headers.join(','),
        ...rows.map(r => r.map(val => `"${val}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `justificacion_bono_cultural_${group.name.toLowerCase().replace(/\s+/g, '_')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  const handleToggle = async (expenseId: string, currentVal: boolean) => {
    setToggleLoading(expenseId);
    try {
      await onToggleJustified(expenseId, !currentVal);
    } catch (e) {
      console.error(e);
    } finally {
      setToggleLoading(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Sleek Credit Card style Header */}
      <div 
        style={{
          background: 'linear-gradient(135deg, #1C1C1E 0%, #2C2C2E 100%)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          color: '#FAF9F6',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
          border: '1px solid rgba(255, 255, 255, 0.05)'
        }}
      >
        {/* Glowing pattern details */}
        <div style={{ position: 'absolute', right: '-40px', bottom: '-40px', width: '150px', height: '150px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(230,175,46,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
          <div>
            <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#A09E9B', fontWeight: 800 }}>Voucher Oficial</span>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '2px 0 0 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              Bono Cultural <span style={{ color: '#E6AF2E' }}>Joven</span>
            </h3>
          </div>
          <div style={{ backgroundColor: 'rgba(230,175,46,0.15)', border: '1px solid rgba(230,175,46,0.3)', borderRadius: 'var(--radius-sm)', padding: '4px 10px', fontSize: '0.7rem', fontWeight: 700, color: '#E6AF2E', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Sparkles size={12} />
            <span>400€ concedidos</span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.7rem', color: '#A09E9B' }}>Saldo Disponible del Bono</span>
            <span style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1, color: '#FAF9F6' }}>
              {totalAvailable.toFixed(2)}€
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
            <span style={{ fontSize: '0.7rem', color: '#A09E9B' }}>Consumido</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#E6AF2E' }}>
              {totalCappedSpent.toFixed(2)}€
            </span>
          </div>
        </div>

        {/* Expiry status bar inside card */}
        <div 
          style={{ 
            marginTop: '20px', 
            borderTop: '1px solid rgba(255,255,255,0.08)', 
            paddingTop: '14px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            fontSize: '0.72rem',
            color: expInfo.isNear ? '#FF8A8A' : '#A09E9B'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={13} />
            <span style={{ fontWeight: 600 }}>{expInfo.text}</span>
          </div>
          <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.05)' }}>
            12 meses validez
          </span>
        </div>
      </div>

      {/* Expiry warnings */}
      {expInfo.expired && (
        <div style={{ display: 'flex', gap: '8px', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(176,90,90,0.15)', fontSize: '0.8rem', fontWeight: 600, alignItems: 'center' }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>Este bono cultural ha caducado. Ya no se pueden justificar más compras oficiales.</span>
        </div>
      )}

      {/* Category breakdown (The 3 legal categories) */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Límites por Categorías</h4>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
          
          {/* Category 1: Artes en Vivo */}
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '16px', boxShadow: 'var(--shadow-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ backgroundColor: 'rgba(138,123,159,0.1)', color: '#8A7B9F', padding: '8px', borderRadius: 'var(--radius-sm)' }}>
                  <Ticket size={18} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800 }}>Artes en vivo, patrimonio y audiovisual</span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Teatro, conciertos, cine, museos...</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 800 }}>{liveArtsCapped.toFixed(2)}€</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}> / {LIMIT_LIVE_ARTS}€</span>
              </div>
            </div>
            
            <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-full)', overflow: 'hidden', marginBottom: '6px' }}>
              <div style={{ width: `${(liveArtsCapped / LIMIT_LIVE_ARTS) * 100}%`, height: '100%', backgroundColor: '#8A7B9F', borderRadius: 'var(--radius-full)', transition: 'width 0.4s ease' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              <span>Disponible: {(LIMIT_LIVE_ARTS - liveArtsCapped).toFixed(2)}€</span>
              <span>{((liveArtsCapped / LIMIT_LIVE_ARTS) * 100).toFixed(0)}% utilizado</span>
            </div>

            {liveArtsExcess > 0 && (
              <div style={{ marginTop: '8px', display: 'flex', gap: '6px', backgroundColor: 'var(--danger-light)', padding: '6px 8px', borderRadius: '4px', fontSize: '0.68rem', color: 'var(--danger)', alignItems: 'center' }}>
                <Info size={12} />
                <span>Superado límite legal en {liveArtsExcess.toFixed(2)}€. Este exceso debe pagarse fuera del bono.</span>
              </div>
            )}
          </div>

          {/* Category 2: Soporte Físico */}
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '16px', boxShadow: 'var(--shadow-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ backgroundColor: 'rgba(188,163,116,0.1)', color: '#BCA374', padding: '8px', borderRadius: 'var(--radius-sm)' }}>
                  <BookOpen size={18} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800 }}>Productos en soporte físico</span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Libros, videojuegos físicos, discos...</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 800 }}>{physicalCapped.toFixed(2)}€</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}> / {LIMIT_PHYSICAL}€</span>
              </div>
            </div>
            
            <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-full)', overflow: 'hidden', marginBottom: '6px' }}>
              <div style={{ width: `${(physicalCapped / LIMIT_PHYSICAL) * 100}%`, height: '100%', backgroundColor: '#BCA374', borderRadius: 'var(--radius-full)', transition: 'width 0.4s ease' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              <span>Disponible: {(LIMIT_PHYSICAL - physicalCapped).toFixed(2)}€</span>
              <span>{((physicalCapped / LIMIT_PHYSICAL) * 100).toFixed(0)}% utilizado</span>
            </div>

            {physicalExcess > 0 && (
              <div style={{ marginTop: '8px', display: 'flex', gap: '6px', backgroundColor: 'var(--danger-light)', padding: '6px 8px', borderRadius: '4px', fontSize: '0.68rem', color: 'var(--danger)', alignItems: 'center' }}>
                <Info size={12} />
                <span>Superado límite legal en {physicalExcess.toFixed(2)}€. Este exceso debe pagarse fuera del bono.</span>
              </div>
            )}
          </div>

          {/* Category 3: Consumo Digital */}
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '16px', boxShadow: 'var(--shadow-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ backgroundColor: 'rgba(92,118,141,0.1)', color: '#5C768D', padding: '8px', borderRadius: 'var(--radius-sm)' }}>
                  <Laptop size={18} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800 }}>Consumo digital o en línea</span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Suscripciones streaming, ebooks, música...</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 800 }}>{digitalCapped.toFixed(2)}€</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}> / {LIMIT_DIGITAL}€</span>
              </div>
            </div>
            
            <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-full)', overflow: 'hidden', marginBottom: '6px' }}>
              <div style={{ width: `${(digitalCapped / LIMIT_DIGITAL) * 100}%`, height: '100%', backgroundColor: '#5C768D', borderRadius: 'var(--radius-full)', transition: 'width 0.4s ease' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              <span>Disponible: {(LIMIT_DIGITAL - digitalCapped).toFixed(2)}€</span>
              <span>{((digitalCapped / LIMIT_DIGITAL) * 100).toFixed(0)}% utilizado</span>
            </div>

            {digitalExcess > 0 && (
              <div style={{ marginTop: '8px', display: 'flex', gap: '6px', backgroundColor: 'var(--danger-light)', padding: '6px 8px', borderRadius: '4px', fontSize: '0.68rem', color: 'var(--danger)', alignItems: 'center' }}>
                <Info size={12} />
                <span>Superado límite legal en {digitalExcess.toFixed(2)}€. Este exceso debe pagarse fuera del bono.</span>
              </div>
            )}
          </div>

        </div>
      </section>

      {/* Ticket Verification Checklist */}
      <section style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '16px', boxShadow: 'var(--shadow-subtle)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>Justificación de Tickets</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Control de facturas subidas al Ministerio</span>
          </div>
          
          <button 
            type="button" 
            onClick={handleExportCSV} 
            disabled={exporting || totalReceipts === 0}
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}
          >
            <Download size={13} />
            Exportar CSV
          </button>
        </div>

        {totalReceipts > 0 ? (
          <>
            {/* Progress bar of justified receipts */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Progreso de Justificaciones:</span>
                <span style={{ color: justificationPercent === 100 ? 'var(--success)' : 'var(--text-primary)' }}>
                  {justifiedReceipts} de {totalReceipts} tickets ({justificationPercent.toFixed(0)}%)
                </span>
              </div>
              <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                <div style={{ width: `${justificationPercent}%`, height: '100%', backgroundColor: justificationPercent === 100 ? 'var(--success)' : 'var(--accent-primary)', borderRadius: 'var(--radius-full)', transition: 'width 0.4s ease' }} />
              </div>
            </div>

            {/* Checklist items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto', paddingRight: '4px', marginTop: '6px' }}>
              {bonoExpenses.map((expense) => {
                const isJustified = !!expense.ticketUploaded;
                const isPending = !isJustified;
                
                return (
                  <div 
                    key={expense.id}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      padding: '10px 12px', 
                      borderRadius: 'var(--radius-sm)', 
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-light)',
                      opacity: toggleLoading === expense.id ? 0.7 : 1,
                      transition: 'opacity 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1, minWidth: 0 }}>
                      <button
                        type="button"
                        disabled={toggleLoading === expense.id}
                        onClick={() => handleToggle(expense.id, isJustified)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: isJustified ? 'var(--success)' : 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {isJustified ? <CheckSquare size={20} /> : <Square size={20} />}
                      </button>

                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, textDecoration: isJustified ? 'line-through' : 'none', color: isJustified ? 'var(--text-muted)' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {expense.title}
                        </span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                          {new Date(expense.date).toLocaleDateString('es-ES')} • {expense.category.split(',')[0]}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {expense.amount.toFixed(2)}€
                      </span>
                      {isJustified ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '2px', backgroundColor: 'var(--success-light)', color: 'var(--success)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 700 }}>
                          <ShieldCheck size={10} /> Justificado
                        </span>
                      ) : (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '2px', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 700 }}>
                          <AlertCircle size={10} /> Pendiente
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 0', gap: '8px', color: 'var(--text-muted)', fontSize: '0.78rem', textAlign: 'center' }}>
            <FileText size={24} style={{ opacity: 0.5 }} />
            <span>No hay gastos registrados todavía.</span>
            <span>Añade tu primera compra del bono desde la pestaña de "Gastos" para ver el panel de justificación.</span>
          </div>
        )}
      </section>
    </div>
  );
}
