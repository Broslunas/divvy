export const unstable_instant = { prefetch: 'static' };

import Link from 'next/link';
import { Coins, Users, ArrowRight, PieChart, Bell, ChevronRight } from 'lucide-react';
import Footer from '@/components/Footer';
import FAQSection from '@/components/FAQSection';
import SimulatorWrapper from '@/components/SimulatorWrapper';
import './landing.css';

export default function LandingPage() {
  return (
    <div className="landing-wrapper">
      {/* Ambient Fluid Gradient Background */}
      <div className="ambient-gradient-blobs">
        <div className="ambient-blob blob-terracotta" />
        <div className="ambient-blob blob-sage" />
        <div className="ambient-blob blob-accent" />
      </div>

      {/* Header */}
      <header className="landing-header">
        <Link href="/" className="nav-logo">
          <Coins size={28} style={{ color: 'var(--accent-primary)' }} />
          <span className="logo-text">
            Div<span>vy</span>
          </span>
        </Link>
        <Link href="/app" className="app-btn-nav">
          Acceder a la App
          <ArrowRight size={16} />
        </Link>
      </header>

      {/* Main Content */}
      <main className="landing-content animate-fade-in">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-badge">
            NUEVA VERSIÓN 1.2 DISPONIBLE 🎉
          </div>
          <h1 className="hero-title">
            Cuentas claras, viajes <span>sin dramas</span>.
          </h1>
          <p className="hero-desc">
            Lleva el control, división y liquidación de tus gastos grupales de viajes, comidas y proyectos. Todo en tiempo real, sin hojas de cálculo y simplificado al máximo.
          </p>
          <div className="cta-group">
            <Link href="/app" className="cta-primary">
              Comenzar Gratis
              <ArrowRight size={18} />
            </Link>
            <a href="#simulator" className="cta-secondary">
              Ver Simulador
            </a>
          </div>
        </section>

        {/* Simulator Section */}
        <section id="simulator" className="simulator-section">
          <SimulatorWrapper />
        </section>

        {/* Features Section */}
        <section id="features" className="features-section">
          <span className="section-label">Características</span>
          <h2 className="section-title">Diseñado para la simplicidad</h2>
          
          <div className="features-grid">
            {/* Feature 1 */}
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <Users size={24} />
              </div>
              <h3 className="feature-card-title">Grupos Inteligentes</h3>
              <p className="feature-card-desc">
                Crea grupos para tus viajes, cenas o compañeros de piso en un segundo. Invita a otros miembros mediante un código exclusivo.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <PieChart size={24} />
              </div>
              <h3 className="feature-card-title">Liquidación Óptima</h3>
              <p className="feature-card-desc">
                Nuestro algoritmo calcula quién debe pagar a quién reduciendo el número de transacciones totales. Menos bizums, menos líos.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <Bell size={24} />
              </div>
              <h3 className="feature-card-title">Notificaciones PWA</h3>
              <p className="feature-card-desc">
                Entérate al instante cuando alguien añada un gasto o liquide una deuda gracias a las notificaciones Push nativas.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="faq-section">
          <span className="section-label">Preguntas Frecuentes</span>
          <h2 className="section-title">¿Tienes alguna duda?</h2>
          
          <FAQSection />
        </section>

        {/* Call to Action Banner */}
        <section className="cta-banner">
          <h2 className="banner-title">¿Listo para cuadrar tus cuentas?</h2>
          <p className="banner-desc">
            Únete a los miles de usuarios que ya gestionan sus deudas grupales sin discusiones ni hojas de cálculo infinitas.
          </p>
          <Link href="/app" className="banner-btn">
            Empezar ahora gratis
          </Link>
        </section>

        {/* Reusable Legal Footer */}
        <div style={{ width: '100%', maxWidth: '800px', paddingBottom: '40px' }}>
          <Footer />
        </div>
      </main>

      {/* Floating Action Button (Always Visible) */}
      <Link href="/app" className="floating-app-btn" title="Ir a la aplicación">
        Entrar a Divvy
        <ChevronRight size={18} />
      </Link>
    </div>
  );
}
