'use client';

import { useState, useRef } from 'react';
import { Camera, Check, Loader2, Sparkles, AlertCircle } from 'lucide-react';

interface ReceiptData {
  title: string;
  amount: number;
  category: string;
  date: string;
  items?: { name: string; amount: number; userIds: string[] }[];
}

interface ReceiptScannerProps {
  onScanComplete: (data: ReceiptData) => void;
  onClose: () => void;
  isBonoCultural?: boolean;
}

const MOCK_RECEIPTS: ReceiptData[] = [
  {
    title: 'Cena La Tagliatella',
    amount: 56.40,
    category: 'Comida',
    date: new Date().toISOString().split('T')[0],
    items: [
      { name: 'Pizza Margarita', amount: 14.00, userIds: [] },
      { name: 'Pasta Carbonara', amount: 16.50, userIds: [] },
      { name: 'Ensalada César', amount: 12.40, userIds: [] },
      { name: 'Refrescos x3', amount: 13.50, userIds: [] }
    ]
  },
  {
    title: 'Supermercado Mercadona',
    amount: 34.20,
    category: 'Supermercado',
    date: new Date().toISOString().split('T')[0],
    items: [
      { name: 'Pan de molde', amount: 1.50, userIds: [] },
      { name: 'Pechugas de pollo', amount: 6.50, userIds: [] },
      { name: 'Leche pack', amount: 5.80, userIds: [] },
      { name: 'Frutas y Verduras', amount: 20.40, userIds: [] }
    ]
  },
  {
    title: 'Taxi Estación Atocha',
    amount: 18.50,
    category: 'Transporte',
    date: new Date().toISOString().split('T')[0],
    items: [
      { name: 'Carrera Base', amount: 15.00, userIds: [] },
      { name: 'Suplemento maleta', amount: 3.50, userIds: [] }
    ]
  },
  {
    title: 'Entradas Concierto',
    amount: 90.00,
    category: 'Entretenimiento',
    date: new Date().toISOString().split('T')[0],
    items: [
      { name: 'Entrada General A', amount: 45.00, userIds: [] },
      { name: 'Entrada General B', amount: 45.00, userIds: [] }
    ]
  },
  {
    title: 'Gasolinera Repsol',
    amount: 45.00,
    category: 'Transporte',
    date: new Date().toISOString().split('T')[0],
    items: [
      { name: 'Combustible Diésel', amount: 45.00, userIds: [] }
    ]
  }
];

export default function ReceiptScanner({ onScanComplete, onClose, isBonoCultural }: ReceiptScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ReceiptData | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scanReceiptWithAI = (file: File) => {
    setScanning(true);
    setScanError(null);
    setProgress(0);

    // Create image preview and run API call
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      setImagePreview(base64String);

      // Start visual progress simulation (goes up to 80% and waits for API)
      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += 10;
        if (currentProgress >= 80) {
          clearInterval(interval);
        } else {
          setProgress(currentProgress);
        }
      }, 100);

      try {
        const res = await fetch('/api/ai/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: base64String,
            mimeType: file.type,
            isBonoCultural
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || errData.details || `Error del servidor (HTTP ${res.status})`);
        }

        const data = await res.json();
        
        if (data && data.title && typeof data.amount === 'number') {
          // Format items into splits schema if present
          const parsedItems = (data.items as Array<{ name: string; amount: number }>)?.map((item) => ({
            name: item.name,
            amount: item.amount,
            userIds: []
          })) || [];

          setProgress(100);
          setScanResult({
            title: data.title,
            amount: data.amount,
            category: data.category || 'Otros',
            date: data.date || new Date().toISOString().split('T')[0],
            items: parsedItems
          });
          setScanning(false);
          return;
        }
        throw new Error('La respuesta de la IA no contenía el formato JSON esperado.');

      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
        console.error('Real AI vision scan failed:', err);
        setScanError(errorMsg);
        setScanning(false);
      }
    };
    
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      scanReceiptWithAI(file);
    }
  };

  const handleApply = () => {
    if (scanResult) {
      onScanComplete(scanResult);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px 0' }}>
      {!imagePreview && !scanResult && !scanError && (
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: '2px dashed var(--text-muted)',
            borderRadius: 'var(--radius-md)',
            padding: '40px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            backgroundColor: 'var(--bg-secondary)',
            transition: 'var(--transition-smooth)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}
          onMouseOver={(e) => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
          onMouseOut={(e) => (e.currentTarget.style.borderColor = 'var(--text-muted)')}
        >
          <Camera size={40} style={{ color: 'var(--text-secondary)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>Escanear ticket / factura</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Sube una foto de tu recibo para extraer los datos</span>
          </div>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            style={{ marginTop: '12px', width: '100%', padding: '10px 14px', fontSize: '0.85rem' }}
          >
            Cancelar
          </button>
        </div>
      )}

      {scanning && (
        <div
          style={{
            position: 'relative',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            backgroundColor: '#000',
            aspectRatio: '4/3',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {imagePreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imagePreview}
              alt="Scan preview"
              style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }}
            />
          )}

          {/* Scanning line animation */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '4px',
              backgroundColor: '#4ade80',
              boxShadow: '0 0 15px #4ade80, 0 0 5px #4ade80',
              animation: 'scanLine 2s linear infinite',
              zIndex: 2,
            }}
          />

          <div
            style={{
              position: 'absolute',
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              padding: '14px 20px',
              borderRadius: 'var(--radius-md)',
              color: '#FFF',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              zIndex: 3,
            }}
          >
            <Loader2 className="animate-spin" size={24} style={{ color: '#4ade80' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Procesando con Smart OCR...</span>
            <span style={{ fontSize: '0.75rem', color: '#ccc' }}>Analizando importes ({progress}%)</span>
          </div>

          <style>{`
            @keyframes scanLine {
              0% { top: 0%; }
              50% { top: 100%; }
              100% { top: 0%; }
            }
          `}</style>
        </div>
      )}

      {scanResult && !scanning && (
        <div
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-md)',
            padding: '20px',
            animation: 'fadeIn 0.3s ease forwards',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)', marginBottom: '16px', fontWeight: 700, fontSize: '0.9rem' }}>
            <Sparkles size={18} />
            <span>¡Datos extraídos con éxito!</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Concepto:</span>
              <span style={{ fontWeight: 700 }}>{scanResult.title}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Importe:</span>
              <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{scanResult.amount.toFixed(2)}€</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Categoría sugerida:</span>
              <span style={{ fontWeight: 700 }}>{scanResult.category}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Fecha:</span>
              <span>{scanResult.date}</span>
            </div>

            {scanResult.items && scanResult.items.length > 0 && (
              <div style={{ marginTop: '10px', backgroundColor: 'var(--bg-card)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-light)', paddingBottom: '4px' }}>Artículos detectados:</span>
                {scanResult.items.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                    <span>{item.name}</span>
                    <span style={{ fontWeight: 700 }}>{item.amount.toFixed(2)}€</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button
              onClick={handleApply}
              className="btn btn-primary"
              style={{ flex: 1, padding: '10px 16px', fontSize: '0.85rem' }}
            >
              <Check size={16} /> Usar Datos
            </button>
            <button
              onClick={() => {
                setImagePreview(null);
                setScanResult(null);
              }}
              className="btn btn-secondary"
              style={{ padding: '10px 16px', fontSize: '0.85rem' }}
            >
              Volver a intentar
            </button>
          </div>
        </div>
      )}

      {scanError && !scanning && (
        <div
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-md)',
            padding: '20px',
            animation: 'fadeIn 0.3s ease forwards',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger)', marginBottom: '16px', fontWeight: 700, fontSize: '0.9rem' }}>
            <AlertCircle size={18} />
            <span>Error en el escaneo con IA Real</span>
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)', marginBottom: '16px', lineHeight: '1.4' }}>
            No se pudo procesar el ticket con la API de Gemini:
            <code style={{ display: 'block', backgroundColor: 'var(--bg-card)', padding: '8px', borderRadius: 'var(--radius-sm)', marginTop: '8px', fontSize: '0.75rem', overflowX: 'auto', border: '1px solid var(--border-light)', color: 'var(--danger)' }}>
              {scanError}
            </code>
          </p>
          
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Verifica que tienes una clave de API válida en tu archivo <code style={{ fontSize: '0.72rem' }}>.env</code>. Mientras tanto, puedes usar la simulación local para probar la funcionalidad.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              onClick={() => {
                setScanError(null);
                setScanning(true);
                setProgress(20);
                setTimeout(() => setProgress(50), 200);
                setTimeout(() => setProgress(80), 400);
                setTimeout(() => {
                  setProgress(100);
                  const randomReceipt = MOCK_RECEIPTS[Math.floor(Math.random() * MOCK_RECEIPTS.length)];
                  setScanResult(randomReceipt);
                  setScanning(false);
                }, 600);
              }}
              className="btn btn-primary"
              style={{ padding: '10px 16px', fontSize: '0.85rem', width: '100%' }}
            >
              Usar simulación local (Modo Demo)
            </button>
            
            <button
              onClick={() => {
                setImagePreview(null);
                setScanResult(null);
                setScanError(null);
              }}
              className="btn btn-secondary"
              style={{ padding: '10px 16px', fontSize: '0.85rem', width: '100%' }}
            >
              Intentar subir otra foto
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
