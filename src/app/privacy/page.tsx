export const unstable_instant = { prefetch: 'static' };

import Link from 'next/link';
import { Coins, ChevronLeft } from 'lucide-react';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Política de Privacidad',
  description: 'Conoce cómo tratamos tus datos personales en Divvy Gastos Compartidos.',
};

export default function PrivacyPage() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg-primary)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 16px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '640px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}>
        {/* Navigation Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
        }}>
          <Link href="/login" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.9rem',
            fontWeight: 600,
            color: 'var(--accent-primary)',
            textDecoration: 'none',
          }}>
            <ChevronLeft size={16} />
            Volver a la App
          </Link>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <Coins size={24} style={{ color: 'var(--accent-primary)' }} />
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
              Div<span style={{ color: 'var(--accent-primary)' }}>vy</span>
            </span>
          </div>
        </div>

        {/* Content Card */}
        <div style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-lg)',
          padding: '36px 30px',
          boxShadow: 'var(--shadow-subtle)',
        }}>
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            marginBottom: '16px',
            letterSpacing: '-0.02em',
          }}>
            Política de Privacidad
          </h1>

          <p style={{
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            marginBottom: '24px',
          }}>
            Última actualización: 22 de junio de 2026
          </p>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            fontSize: '0.95rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
          }}>
            <p>
              En <strong>Divvy</strong>, accesible desde la plataforma, uno de nuestros objetivos primordiales es asegurar la privacidad y seguridad de los datos de nuestros usuarios. Este documento de Política de Privacidad detalla los tipos de información que recopilamos, cómo los procesamos y tus derechos en relación con los mismos.
            </p>

            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '12px' }}>
              1. Responsable del Tratamiento
            </h2>
            <p>
              El responsable del tratamiento de los datos personales recopilados a través de esta aplicación es Divvy. Si tienes cualquier consulta o deseas ejercer tus derechos, puedes ponerte en contacto con nosotros escribiéndonos al correo de soporte técnico o delegados de protección de datos en <strong>legal@divvy.es</strong>.
            </p>

            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '12px' }}>
              2. Datos que Recopilamos
            </h2>
            <p>
              Para prestar nuestros servicios de cálculo y registro de gastos compartidos de forma correcta, recopilamos los siguientes datos personales:
            </p>
            <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li><strong>Información de registro:</strong> Nombre de usuario, dirección de correo electrónico y contraseña (cifrada mediante hash de forma segura).</li>
              <li><strong>Datos de uso de la aplicación:</strong> Información sobre los grupos que creas o a los que te unes, nombres de gastos, importes, participantes implicados en los saldos y fechas asociadas.</li>
              <li><strong>Archivos adjuntos:</strong> Imágenes de recibos o facturas si decides subirlas voluntariamente para justificar algún gasto.</li>
            </ul>

            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '12px' }}>
              3. Finalidad del Tratamiento de los Datos
            </h2>
            <p>
              Utilizamos la información recopilada para las siguientes finalidades esenciales:
            </p>
            <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li>Proporcionar, operar y mantener nuestra aplicación y los servicios asociados de autenticación.</li>
              <li>Calcular balances y liquidación de deudas de forma precisa entre los participantes de los grupos de gastos.</li>
              <li>Enviar notificaciones PWA o alertas de correo sobre nuevos gastos o recordatorios de pago cuando sea necesario.</li>
              <li>Detectar, prevenir y resolver problemas técnicos o fraudes potenciales que afecten la seguridad de la app.</li>
            </ul>

            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '12px' }}>
              4. Conservación de Datos
            </h2>
            <p>
              Mantendremos tus datos personales únicamente mientras tu cuenta permanezca activa. Si decides eliminar tu cuenta o solicitar su borrado, procederemos a su eliminación definitiva de nuestras bases de datos de producción de forma segura, a menos que exista alguna obligación legal de conservación o almacenamiento técnico temporal.
            </p>

            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '12px' }}>
              5. Derechos del Usuario (GDPR)
            </h2>
            <p>
              Bajo el Reglamento General de Protección de Datos (GDPR) de la Unión Europea, tienes plenos derechos sobre tus datos personales:
            </p>
            <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li><strong>Derecho de Acceso:</strong> Solicitar una copia de los datos personales que conservamos sobre ti.</li>
              <li><strong>Derecho de Rectificación:</strong> Solicitar la corrección de datos incorrectos o incompletos.</li>
              <li><strong>Derecho de Supresión (Olvido):</strong> Solicitar la eliminación definitiva de tus datos.</li>
              <li><strong>Derecho de Limitación y Oposición:</strong> Restringir u oponerte al tratamiento de tus datos en determinadas circunstancias.</li>
            </ul>
            <p>
              Puedes ejercer cualquiera de estos derechos escribiéndonos directamente a <strong>legal@divvy.es</strong>.
            </p>

            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '12px' }}>
              6. Seguridad de la Información
            </h2>
            <p>
              Nos tomamos la seguridad muy en serio. Toda la información delicada (como contraseñas) se cifra antes de guardarse en nuestras bases de datos y la comunicación entre tu navegador y la aplicación se realiza de forma exclusiva a través de protocolos seguros HTTPS (SSL).
            </p>
          </div>
        </div>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}
