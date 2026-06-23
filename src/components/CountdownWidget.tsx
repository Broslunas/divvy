'use client';

import { useState, useEffect } from 'react';
import { Calendar, Plane } from 'lucide-react';

interface CountdownWidgetProps {
  targetDate: string;
  groupName: string;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
}

function calculateTimeRemaining(targetStr: string): TimeRemaining {
  const hasTime = targetStr.includes('T');
  const target = new Date(hasTime ? targetStr : targetStr + 'T00:00:00');
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();

  if (diffMs <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
  }

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, isPast: false };
}

export default function CountdownWidget({ targetDate, groupName }: CountdownWidgetProps) {
  const [time, setTime] = useState<TimeRemaining | null>(null);

  useEffect(() => {
    if (!targetDate) return;

    // Initial calculation
    setTime(calculateTimeRemaining(targetDate));

    const timer = setInterval(() => {
      setTime(calculateTimeRemaining(targetDate));
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  if (!targetDate || !time) return null;

  const hasTime = targetDate.includes('T');
  const targetDateObj = new Date(hasTime ? targetDate : targetDate + 'T00:00:00');
  const formattedTargetDate = targetDateObj.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }) + (hasTime ? ' a las ' + targetDateObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '');

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(200, 122, 83, 0.06) 0%, rgba(74, 93, 78, 0.06) 100%)',
        border: '1px dashed rgba(200, 122, 83, 0.25)',
        borderRadius: 'var(--radius-md)',
        padding: '16px 20px',
        boxShadow: 'var(--shadow-subtle)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        position: 'relative',
        overflow: 'hidden',
        animation: 'fadeIn 0.5s ease forwards'
      }}
    >
      {/* Visual background details */}
      <div
        style={{
          position: 'absolute',
          right: '-10px',
          bottom: '-15px',
          opacity: 0.05,
          transform: 'rotate(-15deg)',
          pointerEvents: 'none'
        }}
      >
        <Plane size={110} style={{ color: 'var(--accent-primary)' }} />
      </div>

      {/* Header Info */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={16} style={{ color: 'var(--accent-primary)' }} />
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {time.isPast ? 'Fecha del Evento' : 'Cuenta Atrás'}
          </span>
        </div>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
          {formattedTargetDate}
        </span>
      </div>

      {/* Body / Countdown Cards */}
      {time.isPast ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0' }}>
          <div
            style={{
              backgroundColor: 'var(--success-light)',
              color: 'var(--success)',
              borderRadius: 'var(--radius-full)',
              padding: '6px 12px',
              fontSize: '0.8rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              animation: 'pulseBadge 2s infinite'
            }}
          >
            <Plane size={14} />
            <span>¡El evento/viaje para {groupName} está en marcha! 🎉</span>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Days */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(5px)',
                border: '1px solid rgba(200, 122, 83, 0.1)',
                minWidth: '52px',
                height: '48px',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
                fontWeight: 800,
                color: 'var(--accent-primary)',
                boxShadow: 'var(--shadow-tactile)'
              }}
            >
              {time.days}
            </div>
            <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-secondary)', marginTop: '4px', textTransform: 'uppercase' }}>
              Días
            </span>
          </div>

          <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-muted)', marginTop: '-20px' }}>:</span>

          {/* Hours */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(5px)',
                border: '1px solid rgba(200, 122, 83, 0.1)',
                minWidth: '46px',
                height: '48px',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
                fontWeight: 800,
                color: 'var(--accent-primary)',
                boxShadow: 'var(--shadow-tactile)'
              }}
            >
              {String(time.hours).padStart(2, '0')}
            </div>
            <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-secondary)', marginTop: '4px', textTransform: 'uppercase' }}>
              Horas
            </span>
          </div>

          <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-muted)', marginTop: '-20px' }}>:</span>

          {/* Minutes */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(5px)',
                border: '1px solid rgba(200, 122, 83, 0.1)',
                minWidth: '46px',
                height: '48px',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
                fontWeight: 800,
                color: 'var(--accent-primary)',
                boxShadow: 'var(--shadow-tactile)'
              }}
            >
              {String(time.minutes).padStart(2, '0')}
            </div>
            <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-secondary)', marginTop: '4px', textTransform: 'uppercase' }}>
              Mins
            </span>
          </div>

          <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-muted)', marginTop: '-20px' }}>:</span>

          {/* Seconds */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(5px)',
                border: '1px solid rgba(200, 122, 83, 0.1)',
                minWidth: '46px',
                height: '48px',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
                fontWeight: 800,
                color: 'var(--text-muted)',
                boxShadow: 'var(--shadow-tactile)'
              }}
            >
              {String(time.seconds).padStart(2, '0')}
            </div>
            <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-secondary)', marginTop: '4px', textTransform: 'uppercase' }}>
              Segs
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
