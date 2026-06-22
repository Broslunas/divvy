'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Camera, Upload, AlertCircle, RefreshCw } from 'lucide-react';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (code: string) => void;
}

export default function QRScannerModal({ isOpen, onClose, onScanSuccess }: QRScannerModalProps) {
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse invite code from scanned text (handles raw codes or full URLs)
  const extractInviteCode = (scannedText: string) => {
    const trimmed = scannedText.trim();
    // Regex for matching /join/ABCDEF (case-insensitive, 8 chars code is typical, but we support other alphanumeric patterns too)
    const urlPattern = /\/join\/([A-Za-z0-9_-]+)/i;
    const match = trimmed.match(urlPattern);
    
    if (match && match[1]) {
      return match[1].toUpperCase();
    }
    
    // Fallback: If scanned text is just an alphanumeric code (e.g. 6-12 chars), return it
    if (/^[A-Za-z0-9_-]{4,15}$/.test(trimmed)) {
      return trimmed.toUpperCase();
    }
    
    return null;
  };

  useEffect(() => {
    let active = true;
    let html5QrcodeInstance: any = null;

    if (!isOpen) return;

    // Load html5-qrcode dynamically to prevent SSR issues
    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        
        if (!active) return;
        
        html5QrcodeInstance = new Html5Qrcode('qr-reader');
        scannerRef.current = html5QrcodeInstance;

        setIsScanning(true);
        setError(null);

        await html5QrcodeInstance.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: (width: number, height: number) => {
              const size = Math.min(width, height) * 0.7;
              return { width: size, height: size };
            },
            aspectRatio: 1.0
          },
          (decodedText: string) => {
            const inviteCode = extractInviteCode(decodedText);
            if (inviteCode) {
              // Successfully decoded code, stop scanning and notify parent
              cleanupScanner().then(() => {
                onScanSuccess(inviteCode);
              });
            } else {
              setError('Código QR detectado, pero no parece un enlace de invitación de Divvy.');
            }
          },
          () => {
            // Silence silent scan warnings/failures
          }
        );
        
        setHasCameraPermission(true);
      } catch (err: any) {
        console.error('Error starting QR scanner:', err);
        if (active) {
          setHasCameraPermission(false);
          setError(
            err?.message?.includes('Permission') || err?.includes?.('Permission')
              ? 'No se otorgaron permisos para acceder a la cámara.'
              : 'Error al iniciar la cámara. Prueba a subir una imagen.'
          );
          setIsScanning(false);
        }
      }
    };

    startScanner();

    return () => {
      active = false;
      cleanupScanner();
    };
  }, [isOpen]);

  const cleanupScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (e) {
        console.error('Error stopping scanner:', e);
      }
    }
    scannerRef.current = null;
    setIsScanning(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      
      // Create a temporary scanner element if not already present
      let tempScanner = scannerRef.current;
      if (!tempScanner) {
        tempScanner = new Html5Qrcode('qr-reader-temp');
      }

      const decodedText = await tempScanner.scanFile(file, true);
      const inviteCode = extractInviteCode(decodedText);
      if (inviteCode) {
        await cleanupScanner();
        onScanSuccess(inviteCode);
      } else {
        setError('El código QR de la imagen no es un enlace válido de Divvy.');
      }
    } catch (err) {
      console.error('Error decoding file:', err);
      setError('No se pudo detectar ningún código QR en la imagen. Inténtalo de nuevo.');
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      animation: 'fadeIn 0.2s ease-out'
    }}>
      {/* Hidden element for file scanning fallback */}
      <div id="qr-reader-temp" style={{ display: 'none' }} />

      <div style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-lg)',
        width: '100%',
        maxWidth: '400px',
        padding: '24px',
        boxShadow: 'var(--shadow-tactile)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        position: 'relative',
        animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Camera size={20} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Escanear Invitación QR
            </h3>
          </div>
          <button 
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: '4px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scanner Window */}
        <div style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '1',
          backgroundColor: '#000',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          border: '1px solid var(--border-light)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          {/* html5-qrcode target div */}
          <div id="qr-reader" style={{ width: '100%', height: '100%' }} />

          {/* Real-time scanning overlay wrapper */}
          {isScanning && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {/* Central scanning frame cutout overlay */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                boxShadow: '0 0 0 100vmax rgba(0, 0, 0, 0.4)'
              }} />

              {/* Central scanning viewport */}
              <div style={{
                width: '70%',
                height: '70%',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '8px',
                position: 'relative',
                boxShadow: '0 0 15px rgba(255, 255, 255, 0.1)'
              }}>
                {/* Viewport Corners */}
                <div style={{ position: 'absolute', top: -2, left: -2, width: 16, height: 16, borderTop: '3px solid var(--accent-primary)', borderLeft: '3px solid var(--accent-primary)' }} />
                <div style={{ position: 'absolute', top: -2, right: -2, width: 16, height: 16, borderTop: '3px solid var(--accent-primary)', borderRight: '3px solid var(--accent-primary)' }} />
                <div style={{ position: 'absolute', bottom: -2, left: -2, width: 16, height: 16, borderBottom: '3px solid var(--accent-primary)', borderLeft: '3px solid var(--accent-primary)' }} />
                <div style={{ position: 'absolute', bottom: -2, right: -2, width: 16, height: 16, borderBottom: '3px solid var(--accent-primary)', borderRight: '3px solid var(--accent-primary)' }} />

                {/* Scanning Laser Line */}
                <div style={{
                  position: 'absolute',
                  width: '100%',
                  height: '2px',
                  background: 'linear-gradient(to right, transparent, var(--accent-primary), transparent)',
                  boxShadow: '0 0 8px var(--accent-primary)',
                  animation: 'laserScan 2.5s infinite linear',
                  top: 0
                }} />
              </div>
            </div>
          )}

          {/* Loader or camera permission status */}
          {!isScanning && !error && (
            <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: '#FFF' }}>
              <RefreshCw className="animate-spin" size={24} style={{ color: 'var(--accent-primary)' }} />
              <span style={{ fontSize: '0.8rem' }}>Iniciando cámara...</span>
            </div>
          )}

          {error && !isScanning && (
            <div style={{
              position: 'absolute',
              padding: '20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
              color: '#FFF'
            }}>
              <AlertCircle size={32} style={{ color: 'var(--danger)' }} />
              <span style={{ fontSize: '0.8rem', opacity: 0.9 }}>{error}</span>
            </div>
          )}
        </div>

        {/* Scan from file option */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', margin: 0 }}>
            ¿No puedes usar la cámara? Sube una foto o captura del QR:
          </p>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept="image/*" 
            style={{ display: 'none' }} 
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 14px',
              fontSize: '0.8rem',
              fontWeight: 700,
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              transition: 'var(--transition-smooth)'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--border-light)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
          >
            <Upload size={14} /> Subir Captura de QR
          </button>
        </div>

        {/* Error notice at bottom if scanner fails/denied */}
        {error && isScanning && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 12px'
          }}>
            <AlertCircle size={16} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: '2px' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>{error}</span>
          </div>
        )}

        <style dangerouslySetInnerHTML={{__html: `
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          @keyframes laserScan {
            0% { top: 0%; }
            50% { top: 100%; }
            100% { top: 0%; }
          }
        `}} />
      </div>
    </div>
  );
}
