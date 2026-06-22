import Link from 'next/link';
import { Coins, ChevronLeft } from 'lucide-react';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Política de Cookies',
  description: 'Información detallada sobre las cookies utilizadas en Divvy Gastos Compartidos.',
};

export default function CookiesPage() {
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
            Política de Cookies
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
              En <strong>Divvy</strong> utilizamos cookies propias estrictamente necesarias para el correcto funcionamiento de nuestra plataforma. A continuación, detallamos qué son las cookies, cuáles empleamos y cómo puedes gestionarlas.
            </p>

            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '12px' }}>
              1. ¿Qué es una Cookie?
            </h2>
            <p>
              Una cookie es un pequeño archivo de texto que un sitio web almacena en tu ordenador, teléfono móvil o cualquier otro dispositivo inteligente con información sobre tu navegación en dicho sitio. Las cookies facilitan la navegación y la hacen más amigable, y no dañan tu ordenador.
            </p>

            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '12px' }}>
              2. ¿Qué cookies utilizamos en Divvy?
            </h2>
            <p>
              Esta aplicación utiliza un número muy reducido de cookies de carácter técnico que son <strong>estrictamente necesarias</strong> para prestar el servicio solicitado por el usuario. Al ser esenciales para el funcionamiento de la sesión, no requieren el consentimiento del usuario bajo la Directiva ePrivacy de la UE, pero las detallamos aquí por total transparencia:
            </p>
            
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.85rem',
              marginTop: '10px',
              marginBottom: '10px',
              border: '1px solid var(--border-light)',
            }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-light)' }}>
                  <th style={{ padding: '10px', textAlign: 'left', fontWeight: 'bold' }}>Nombre</th>
                  <th style={{ padding: '10px', textAlign: 'left', fontWeight: 'bold' }}>Origen</th>
                  <th style={{ padding: '10px', textAlign: 'left', fontWeight: 'bold' }}>Finalidad</th>
                  <th style={{ padding: '10px', textAlign: 'left', fontWeight: 'bold' }}>Duración</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '10px', fontFamily: 'monospace' }}>auth_token</td>
                  <td style={{ padding: '10px' }}>Propia (Divvy)</td>
                  <td style={{ padding: '10px' }}>Almacenar el token de autenticación del usuario (JWT) para mantener activa la sesión iniciada de forma segura.</td>
                  <td style={{ padding: '10px' }}>7 días</td>
                </tr>
              </tbody>
            </table>

            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '12px' }}>
              3. Cookies de terceros
            </h2>
            <p>
              <strong>Divvy no utiliza cookies de terceros para fines de publicidad, seguimiento analítico o personalización de marketing.</strong> No compartimos tus hábitos de navegación con proveedores externos para campañas publicitarias ni utilizamos sistemas de analítica externa como Google Analytics que rastreen tu comportamiento fuera de la app.
            </p>

            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '12px' }}>
              4. ¿Cómo desactivar las cookies en tu navegador?
            </h2>
            <p>
              Puedes restringir, bloquear o borrar las cookies de este sitio web (o de cualquier otro) en cualquier momento modificando la configuración de tu navegador de Internet. Dado que los detalles de configuración varían en cada navegador, la gestión suele encontrarse en el menú de "Preferencias" o "Seguridad":
            </p>
            <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li><strong>Google Chrome:</strong> Configuración → Privacidad y seguridad → Cookies y otros datos de sitios.</li>
              <li><strong>Mozilla Firefox:</strong> Ajustes → Privacidad y seguridad → Cookies y datos del sitio.</li>
              <li><strong>Apple Safari:</strong> Ajustes → Privacidad → Bloquear todas las cookies.</li>
              <li><strong>Microsoft Edge:</strong> Configuración → Cookies y permisos del sitio → Cookies y datos del sitio almacenados.</li>
            </ul>
            <p style={{ marginTop: '8px' }}>
              <em>Nota: Si decides desactivar por completo las cookies técnicas en tu navegador, no podrás iniciar sesión ni utilizar las funciones de cálculo de Divvy, ya que no tendremos forma de identificar qué cuenta está intentando acceder a los grupos.</em>
            </p>
          </div>
        </div>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}
