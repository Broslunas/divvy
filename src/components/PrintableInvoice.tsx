'use client';

import type { Group, Expense, User } from '@/types';
import { calculateBalances } from '@/lib/settlement';

interface PrintableInvoiceProps {
  group: Group;
  expenses: Expense[];
  members: Omit<User, 'passwordHash'>[];
}

const getCurrencySymbol = (code?: string) => {
  const symbols: Record<string, string> = {
    EUR: '€',
    USD: '$',
    GBP: '£',
    JPY: '¥',
    MXN: '$',
  };
  return symbols[code || 'EUR'] || '€';
};

export default function PrintableInvoice({ group, expenses, members }: PrintableInvoiceProps) {
  const currency = getCurrencySymbol(group.currency);
  const todayStr = new Date().toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const bonoExpenses = expenses.filter(e => !e.isSettlement);
  const standardExpenses = expenses.filter(e => !e.isSettlement);

  const totalSpent = standardExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Calculate settlement balances for standard groups
  const memberIds = members.map(m => m.id);
  const { transactions } = calculateBalances(memberIds, expenses);

  // Bono specific calculations
  const liveArtsSpent = bonoExpenses
    .filter(e => e.category === 'Artes en vivo, patrimonio y audiovisual')
    .reduce((sum, e) => sum + e.amount, 0);

  const physicalSpent = bonoExpenses
    .filter(e => e.category === 'Soporte físico')
    .reduce((sum, e) => sum + e.amount, 0);

  const digitalSpent = bonoExpenses
    .filter(e => e.category === 'Consumo digital')
    .reduce((sum, e) => sum + e.amount, 0);

  const LIMIT_LIVE_ARTS = 200;
  const LIMIT_PHYSICAL = 100;
  const LIMIT_DIGITAL = 100;
  const LIMIT_TOTAL = 400;

  const liveArtsCapped = Math.min(liveArtsSpent, LIMIT_LIVE_ARTS);
  const physicalCapped = Math.min(physicalSpent, LIMIT_PHYSICAL);
  const digitalCapped = Math.min(digitalSpent, LIMIT_DIGITAL);
  const totalCappedSpent = liveArtsCapped + physicalCapped + digitalCapped;
  const totalAvailable = LIMIT_TOTAL - totalCappedSpent;

  const justifiedCount = bonoExpenses.filter(e => e.ticketUploaded).length;
  const totalReceipts = bonoExpenses.length;

  const getPayerName = (id: string) => {
    const m = members.find(member => member.id === id);
    return m ? m.username : 'Desconocido';
  };

  return (
    <div id="printable-invoice" className="invoice-container">
      {/* Styles injected directly for clean printing */}
      <style>{`
        .invoice-container {
          display: none;
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          color: #1C1C1E;
          background-color: #FFFFFF;
          padding: 40px;
          box-sizing: border-box;
          font-size: 11px;
          line-height: 1.5;
        }

        @media print {
          /* Hide interactive application parts */
          .interactive-layout-wrapper {
            display: none !important;
          }
          
          html, body {
            background-color: #FFF !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .invoice-container {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            position: absolute;
            left: 0;
            top: 0;
          }

          /* Force background colors to print */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }

        .invoice-header {
          display: flex;
          justify-content: space-between;
          border-bottom: 2px solid #E6AF2E;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }

        .brand-logo {
          font-size: 26px;
          font-weight: 800;
          color: #1C1C1E;
          letter-spacing: -1px;
        }

        .brand-logo span {
          color: #C87A53;
        }

        .invoice-title {
          text-align: right;
        }

        .invoice-title h1 {
          font-size: 20px;
          font-weight: 800;
          margin: 0;
          text-transform: uppercase;
          color: #2C2C2E;
        }

        .invoice-title p {
          margin: 4px 0 0 0;
          color: #6E6D6A;
          font-size: 11px;
        }

        .meta-details {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
          background-color: #FAF9F6;
          border: 1px solid #EBE9E4;
          border-radius: 8px;
          padding: 16px;
        }

        .meta-group h3 {
          font-size: 12px;
          font-weight: 700;
          margin: 0 0 6px 0;
          text-transform: uppercase;
          color: #1C1C1E;
        }

        .meta-group p {
          margin: 3px 0;
          color: #6E6D6A;
        }

        .invoice-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }

        .invoice-table th {
          background-color: #1C1C1E;
          color: #FFFFFF;
          font-weight: 700;
          text-align: left;
          padding: 8px 12px;
          text-transform: uppercase;
          font-size: 9px;
          letter-spacing: 0.5px;
        }

        .invoice-table td {
          padding: 10px 12px;
          border-bottom: 1px solid #EBE9E4;
          color: #2C2C2E;
        }

        .invoice-table tr:nth-child(even) {
          background-color: #FAF9F6;
        }

        .amount-cell {
          text-align: right;
          font-weight: 700;
        }

        .summary-blocks {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-bottom: 40px;
        }

        .summary-card {
          border: 1px solid #EBE9E4;
          border-radius: 8px;
          padding: 16px;
          box-sizing: border-box;
          background-color: #FFFFFF;
        }

        .summary-card h3 {
          font-size: 12px;
          font-weight: 700;
          margin: 0 0 12px 0;
          color: #1C1C1E;
          border-bottom: 1px solid #EBE9E4;
          padding-bottom: 6px;
          text-transform: uppercase;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          border-bottom: 1px dashed #FAF9F6;
        }

        .summary-row:last-child {
          border-bottom: none;
        }

        .summary-label {
          color: #6E6D6A;
        }

        .summary-value {
          font-weight: 700;
          color: #1C1C1E;
        }

        .totals-section {
          text-align: right;
          background-color: #FAF9F6;
          border: 1px solid #EBE9E4;
          border-radius: 8px;
          padding: 16px;
          margin-left: auto;
          width: 300px;
        }

        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          font-size: 11px;
        }

        .total-row.grand-total {
          font-size: 15px;
          font-weight: 800;
          border-top: 2px solid #E6AF2E;
          margin-top: 8px;
          padding-top: 10px;
          color: #1C1C1E;
        }

        .settlement-item {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 0;
          border-bottom: 1px dashed #EBE9E4;
          font-size: 11px;
        }

        .settlement-item:last-child {
          border-bottom: none;
        }

        .badge-justified {
          font-size: 8px;
          background-color: #EBF7EE;
          color: #2D6A4F;
          border: 1px solid #C3E6CB;
          border-radius: 4px;
          padding: 2px 6px;
          font-weight: bold;
          text-transform: uppercase;
        }

        .badge-pending {
          font-size: 8px;
          background-color: #FBEAEA;
          color: #B05A5A;
          border: 1px solid #F5C6CB;
          border-radius: 4px;
          padding: 2px 6px;
          font-weight: bold;
          text-transform: uppercase;
        }

        .footer-note {
          margin-top: 60px;
          text-align: center;
          color: #A09E9B;
          font-size: 9px;
          border-top: 1px solid #EBE9E4;
          padding-top: 20px;
        }
      `}</style>

      {/* Invoice Header */}
      <div className="invoice-header">
        <div className="brand-logo">
          Div<span>vy</span>
        </div>
        <div className="invoice-title">
          <h1>{group.isBonoCultural ? 'Justificante de Bono Cultural' : 'Resumen de Gastos'}</h1>
          <p>Factura de Grupo generada el {todayStr}</p>
        </div>
      </div>

      {/* Meta details */}
      <div className="meta-details">
        <div className="meta-group">
          <h3>Información del Grupo</h3>
          <p><strong>Nombre:</strong> {group.name}</p>
          <p><strong>Descripción:</strong> {group.description || 'Sin descripción'}</p>
          <p><strong>Código de Grupo:</strong> {group.inviteCode}</p>
        </div>
        <div className="meta-group" style={{ textAlign: 'right' }}>
          <h3>Detalles de Emisión</h3>
          <p><strong>Moneda:</strong> {group.currency || 'EUR'}</p>
          <p><strong>Total de Gastos:</strong> {expenses.length} transacciones</p>
          <p><strong>Participantes:</strong> {members.length} personas</p>
        </div>
      </div>

      {/* Invoice Table */}
      <table className="invoice-table">
        <thead>
          <tr>
            <th style={{ width: '80px' }}>Fecha</th>
            <th>Concepto / Producto</th>
            <th>Categoría</th>
            <th>Pagado por</th>
            {group.isBonoCultural && <th style={{ width: '90px' }}>Estado Justif.</th>}
            <th className="amount-cell" style={{ width: '100px' }}>Importe</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((expense) => {
            const dateStr = new Date(expense.date).toLocaleDateString('es-ES', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            });

            return (
              <tr key={expense.id}>
                <td>{dateStr}</td>
                <td>
                  <strong>{expense.title}</strong>
                  {expense.notes && <div style={{ fontSize: '9px', color: '#6E6D6A', marginTop: '2px' }}>{expense.notes}</div>}
                </td>
                <td>{expense.category}</td>
                <td>{getPayerName(expense.paidById)}</td>
                {group.isBonoCultural && (
                  <td>
                    {expense.ticketUploaded ? (
                      <span className="badge-justified">Justificado</span>
                    ) : (
                      <span className="badge-pending">Pendiente</span>
                    )}
                  </td>
                )}
                <td className="amount-cell">{expense.amount.toFixed(2)}{currency}</td>
              </tr>
            );
          })}
          {expenses.length === 0 && (
            <tr>
              <td colSpan={group.isBonoCultural ? 6 : 5} style={{ textAlign: 'center', padding: '30px', color: '#A09E9B' }}>
                No hay transacciones registradas en este grupo.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Summary blocks */}
      <div className="summary-blocks">
        {/* Left block: Category summary (for Bono) or Members summary (for standard groups) */}
        {group.isBonoCultural ? (
          <div className="summary-card">
            <h3>Límites del Bono Cultural Joven</h3>
            <div className="summary-row">
              <span className="summary-label">Artes en vivo, patrimonio y audiovisual</span>
              <span className="summary-value">{liveArtsCapped.toFixed(2)}€ / {LIMIT_LIVE_ARTS}€</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Productos en soporte físico</span>
              <span className="summary-value">{physicalCapped.toFixed(2)}€ / {LIMIT_PHYSICAL}€</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Consumo digital o en línea</span>
              <span className="summary-value">{digitalCapped.toFixed(2)}€ / {LIMIT_DIGITAL}€</span>
            </div>
          </div>
        ) : (
          <div className="summary-card">
            <h3>Participantes</h3>
            {members.map((member) => (
              <div key={member.id} className="summary-row">
                <span className="summary-label">{member.username} ({member.email})</span>
                <span className="summary-value">Miembro</span>
              </div>
            ))}
          </div>
        )}

        {/* Right block: Justification (for Bono) or Settlement balances (for standard groups) */}
        {group.isBonoCultural ? (
          <div className="summary-card">
            <h3>Resumen de Justificaciones</h3>
            <div className="summary-row">
              <span className="summary-label">Tickets Subidos al Ministerio</span>
              <span className="summary-value">{justifiedCount} de {totalReceipts} ({totalReceipts > 0 ? ((justifiedCount / totalReceipts) * 100).toFixed(0) : 100}%)</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Gastos del Bono consumidos</span>
              <span className="summary-value">{totalCappedSpent.toFixed(2)}€</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Saldo total disponible restante</span>
              <span className="summary-value" style={{ color: '#E6AF2E' }}>{totalAvailable.toFixed(2)}€</span>
            </div>
          </div>
        ) : (
          <div className="summary-card">
            <h3>Liquidaciones y Saldos</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {transactions.length > 0 ? (
                transactions.map((t, idx) => (
                  <div key={idx} className="settlement-item">
                    <span>👤 <strong>{getPayerName(t.from)}</strong> debe a <strong>{getPayerName(t.to)}</strong>:</span>
                    <span style={{ marginLeft: 'auto', fontWeight: 'bold', color: 'var(--danger)' }}>{t.amount.toFixed(2)}{currency}</span>
                  </div>
                ))
              ) : (
                <p style={{ margin: 0, color: 'var(--success)', fontWeight: 600, fontSize: '11px' }}>
                  🎉 ¡El grupo está completamente al día! No hay deudas pendientes de liquidación.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Invoice Totals Section */}
      <div className="totals-section">
        <div className="total-row">
          <span className="summary-label">Total de Gastos Registrados:</span>
          <span className="summary-value">{totalSpent.toFixed(2)}{currency}</span>
        </div>
        {!group.isBonoCultural && (
          <div className="total-row">
            <span className="summary-label">Promedio por Persona:</span>
            <span className="summary-value">{(totalSpent / (members.length || 1)).toFixed(2)}{currency}</span>
          </div>
        )}
        <div className="total-row grand-total">
          <span>{group.isBonoCultural ? 'Total Deductible Bono:' : 'Total Facturado:'}</span>
          <span>{group.isBonoCultural ? totalCappedSpent.toFixed(2) : totalSpent.toFixed(2)}{currency}</span>
        </div>
      </div>

      {/* Footer Disclaimer */}
      <div className="footer-note">
        <p>Este documento es un extracto resumen de las transacciones del grupo y no constituye una factura comercial con validez tributaria.</p>
        <p>Generado automáticamente por <strong>Divvy - Gastos Compartidos</strong>.</p>
      </div>
    </div>
  );
}
