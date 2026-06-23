'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

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

export default function FAQSection() {
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
  );
}
