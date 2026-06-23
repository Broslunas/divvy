export const unstable_instant = { prefetch: 'static' };

import Link from 'next/link';
import { Coins, ChevronLeft } from 'lucide-react';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Términos de Servicio',
  description: 'Condiciones de uso y regulaciones del servicio Divvy Gastos Compartidos.',
};

export default function TermsPage() {
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
            Términos de Servicio
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
              Te damos la bienvenida a <strong>Divvy</strong>. Al registrarte y utilizar nuestra plataforma de división y control de gastos grupales, aceptas estar sujeto a los siguientes términos y condiciones de servicio. Si no estás de acuerdo con alguna de estas condiciones, te solicitamos que no utilices la app.
            </p>

            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '12px' }}>
              1. Aceptación de los Términos
            </h2>
            <p>
              El uso de Divvy implica que has leído, comprendido y aceptado de manera implícita la totalidad de las cláusulas detalladas en este documento. Nos reservamos el derecho de modificar estos términos en cualquier momento, publicando la versión actualizada directamente en este enlace.
            </p>

            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '12px' }}>
              2. Registro de Cuentas y Seguridad
            </h2>
            <p>
              Para acceder a la creación de grupos y registro de gastos, debes registrarte aportando un nombre de usuario y un correo electrónico válido. Eres el único responsable de salvaguardar la confidencialidad de tu contraseña, así como de todas las actividades asociadas que ocurran bajo tu cuenta personal.
            </p>

            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '12px' }}>
              3. Uso Correcto de la Plataforma
            </h2>
            <p>
              Como usuario de Divvy, te comprometes a:
            </p>
            <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li>Introducir datos de gastos reales y de buena fe, sin alterar de forma deliberada balances o transacciones para defraudar a otros miembros del grupo.</li>
              <li>No subir imágenes de tickets, facturas u otros contenidos que vulneren derechos de propiedad intelectual, intimidad de terceros o contengan contenido inapropiado o dañino.</li>
              <li>No intentar vulnerar el sistema de seguridad de la aplicación ni hacer un uso técnico que sobrecargue los servidores de forma indebida.</li>
            </ul>

            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '12px' }}>
              4. Exclusión de Responsabilidad Financiera
            </h2>
            <p>
              Divvy es una herramienta exclusivamente de cálculo y facilitación del registro de cuentas y balances grupales. <strong>Divvy no es una entidad financiera ni gestiona transferencias, pagos o retenciones de dinero de forma directa.</strong>
            </p>
            <p>
              Cualquier acuerdo de reembolso, transferencia de dinero o liquidación final entre miembros de un grupo se realiza fuera de la aplicación de mutuo acuerdo y bajo la total responsabilidad de las partes involucradas. No somos responsables por deudas no abonadas o disputas entre los usuarios.
            </p>

            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '12px' }}>
              5. Suspensión de Servicio
            </h2>
            <p>
              Nos reservamos el derecho de denegar el servicio, suspender o cancelar cuentas de usuarios si detectamos un comportamiento abusivo, sospechoso de fraude o que infrinja los presentes términos de servicio, sin previo aviso y sin que ello dé derecho a compensación alguna.
            </p>

            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '12px' }}>
              6. Ley Aplicable
            </h2>
            <p>
              Estos términos de servicio se rigen por las leyes vigentes aplicables al territorio de España y la Unión Europea. Cualquier conflicto surgido en relación con el uso de la aplicación será sometido de forma preferente a la jurisdicción de los juzgados y tribunales de la ciudad correspondiente al domicilio del titular, renunciando a otros fueros.
            </p>
          </div>
        </div>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}
