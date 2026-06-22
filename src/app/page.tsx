'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Coins, Users, ArrowRight, PieChart, Bell, ChevronRight, HelpCircle, ChevronDown } from 'lucide-react';
import Footer from '@/components/Footer';
import './landing.css';

// Dynamically import the Simulator component to avoid hydration mismatches
const DivvySimulator = dynamic(() => import('@/components/DivvySimulator'), { ssr: false });

interface FAQItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}

function FAQItem({ question, answer, isOpen, onToggle }: FAQItemProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | string>(0);

  useEffect(() => {
    if (isOpen) {
      setHeight(contentRef.current?.scrollHeight || 'auto');
    } else {
      setHeight(0);
    }
  }, [isOpen]);

  return (
    <div className={`faq-item ${isOpen ? 'is-open' : ''}`}>
      <button className="faq-question-btn" onClick={onToggle}>
        <span>{question}</span>
        <ChevronDown className="faq-toggle-icon" size={18} />
      </button>
      <div 
        className="faq-answer-wrapper" 
        style={{ height }}
      >
        <div ref={contentRef} className="faq-answer-content">
          {answer}
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const faqs = [
    {
      q: '¿Qué es Divvy?',
      a: 'Divvy es una aplicación web moderna diseñada para simplificar la gestión y división de gastos en grupo. Ideal para viajes, cenas, compañeros de piso o proyectos compartidos. Registras los gastos y la app calcula de forma automática quién debe pagar a quién.',
    },
    {
      q: '¿Cómo funciona la simplificación de deudas?',
      a: 'El algoritmo inteligente de Divvy consolida los saldos de todos los miembros del grupo para reducir al mínimo el número de Bizums necesarios. Por ejemplo, si Ana le debe 10€ a Pablo y Pablo le debe 10€ a Dani, Divvy simplifica el flujo para que Ana le pague 10€ directamente a Dani, ahorrando una transacción innecesaria.',
    },
    {
      q: '¿Puedo utilizar Divvy sin conexión a Internet?',
      a: '¡Sí! Al ser una PWA (Progressive Web App), puedes instalar Divvy directamente en tu smartphone u ordenador y usarla sin conexión. Los gastos y deudas que introduzcas se guardarán en tu dispositivo y se sincronizarán con el servidor automáticamente en cuanto vuelvas a tener red.',
    },
    {
      q: '¿Cómo invito a otros amigos a unirse a mi grupo?',
      a: 'Crear y compartir un grupo es sumamente sencillo. Al crear un nuevo grupo, se genera un enlace de invitación único o código QR. Tus amigos solo tienen que escanear el código o acceder al enlace desde su móvil para unirse al instante, sin necesidad de instalaciones complejas.',
    },
  ];

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
          <DivvySimulator />
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
          
          <div className="faq-list">
            {faqs.map((faq, index) => (
              <FAQItem
                key={index}
                question={faq.q}
                answer={faq.a}
                isOpen={openFaqIndex === index}
                onToggle={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
              />
            ))}
          </div>
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
