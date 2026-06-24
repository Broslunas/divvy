import { X } from 'lucide-react';

export interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;
  content: string;
}

interface DocumentTemplatesProps {
  onClose: () => void;
  onSelect: (content: string) => void;
}

export const TEMPLATES: Template[] = [
  {
    id: 'blank',
    name: 'Documento en blanco',
    description: 'Comienza con un documento limpio y sin formato.',
    icon: '📝',
    content: '<p></p>'
  },
  {
    id: 'itinerary',
    name: 'Itinerario de Viaje',
    description: 'Planifica las actividades, visitas y horarios día a día.',
    icon: '✈️',
    content: `
      <h1>✈️ Itinerario de Viaje</h1>
      <p>Organización detallada de las actividades de nuestro viaje paso a paso.</p>
      
      <h2>📅 Día 1: Llegada y Primera Exploración</h2>
      <table>
        <thead>
          <tr>
            <th>Hora</th>
            <th>Actividad / Lugar</th>
            <th>Notas y Detalles</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>09:00 - 11:30</td>
            <td>Vuelo y Llegada</td>
            <td>Llegada al aeropuerto y recogida de maletas.</td>
          </tr>
          <tr>
            <td>12:00 - 13:00</td>
            <td>Check-in en el Alojamiento</td>
            <td>Dejar maletas en recepción si la habitación no está lista.</td>
          </tr>
          <tr>
            <td>13:30 - 15:00</td>
            <td>Comida de Bienvenida</td>
            <td>Probar comida típica local en el centro.</td>
          </tr>
          <tr>
            <td>15:30 - 19:00</td>
            <td>Paseo libre por la zona centro</td>
            <td>Visitar plazas principales y tomar fotos.</td>
          </tr>
        </tbody>
      </table>

      <h2>📅 Día 2: Visitas Principales</h2>
      <ul>
        <li><strong>Mañana (10:00):</strong> Visita guiada contratada al museo principal.</li>
        <li><strong>Tarde (14:30):</strong> Almuerzo y visita al parque histórico.</li>
        <li><strong>Noche (20:00):</strong> Reserva para cenar en la zona antigua.</li>
      </ul>
    `
  },
  {
    id: 'lodging',
    name: 'Información de Alojamientos',
    description: 'Guarda direcciones, confirmaciones y datos de contacto de hoteles/Airbnbs.',
    icon: '🏨',
    content: `
      <h1>🏨 Información de Alojamientos</h1>
      <p>Todos los detalles de las estancias confirmadas para nuestro viaje.</p>
      
      <h2>📍 Alojamiento Principal: Hotel / Apartamento</h2>
      <ul>
        <li><strong>Nombre:</strong> Grand Plaza Hotel / Cozy Airbnb Central</li>
        <li><strong>Dirección:</strong> Calle Gran Vía 123, 3º Izquierda, Madrid, España</li>
        <li><strong>Teléfono de contacto:</strong> +34 600 000 000</li>
        <li><strong>Email:</strong> contacto@hotel.com</li>
      </ul>

      <h2>🔑 Detalles de Check-in y Check-out</h2>
      <table>
        <thead>
          <tr>
            <th>Evento</th>
            <th>Fecha</th>
            <th>Hora Permitida</th>
            <th>Instrucciones clave</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Check-in</strong></td>
            <td>Día de llegada</td>
            <td>A partir de las 15:00</td>
            <td>Recoger llaves en el cajetín de seguridad (código: 1234) o recepción.</td>
          </tr>
          <tr>
            <td><strong>Check-out</strong></td>
            <td>Día de salida</td>
            <td>Antes de las 11:00</td>
            <td>Dejar las llaves sobre la mesa y cerrar la puerta. Avisar al anfitrión.</td>
          </tr>
        </tbody>
      </table>

      <blockquote>
        <strong>Nota importante:</strong> Guardar el PDF de confirmación de reserva en el móvil por si no hay conexión a internet al llegar.
      </blockquote>
    `
  },
  {
    id: 'packing',
    name: 'Lista de Equipaje',
    description: 'Checklist interactivo por categorías para que no falte nada.',
    icon: '🧳',
    content: `
      <h1>🧳 Lista de Equipaje / Packing List</h1>
      <p>Marca lo que vayas metiendo en la maleta para no olvidarte de nada.</p>

      <h2>📄 Documentación y Finanzas</h2>
      <ul data-type="taskList">
        <li data-checked="false"><label><input type="checkbox"> Pasaporte / DNI en vigor</label></li>
        <li data-checked="false"><label><input type="checkbox"> Billetes de avión / tren / bus</label></li>
        <li data-checked="false"><label><input type="checkbox"> Reservas de hotel impresas / PDF</label></li>
        <li data-checked="false"><label><input type="checkbox"> Tarjeta sanitaria europea o seguro médico</label></li>
        <li data-checked="false"><label><input type="checkbox"> Tarjetas de crédito y algo de dinero en efectivo</label></li>
      </ul>

      <h2>👕 Ropa y Calzado</h2>
      <ul data-type="taskList">
        <li data-checked="false"><label><input type="checkbox"> Calzado cómodo para caminar mucho</label></li>
        <li data-checked="false"><label><input type="checkbox"> Camisetas, pantalones y mudas suficientes</label></li>
        <li data-checked="false"><label><input type="checkbox"> Chaqueta ligera o abrigo según el clima</label></li>
        <li data-checked="false"><label><input type="checkbox"> Pijama y calzado de descanso</label></li>
      </ul>

      <h2>🔌 Electrónica y Tecnología</h2>
      <ul data-type="taskList">
        <li data-checked="false"><label><input type="checkbox"> Cargador del móvil</label></li>
        <li data-checked="false"><label><input type="checkbox"> Batería externa (Powerbank)</label></li>
        <li data-checked="false"><label><input type="checkbox"> Adaptador de enchufe (si viajas a otro país)</label></li>
      </ul>

      <h2>🧼 Aseo y Botiquín</h2>
      <ul data-type="taskList">
        <li data-checked="false"><label><input type="checkbox"> Cepillo y pasta de dientes</label></li>
        <li data-checked="false"><label><input type="checkbox"> Gel y champú en formato viaje (&lt; 100ml)</label></li>
        <li data-checked="false"><label><input type="checkbox"> Ibuprofeno / Paracetamol / Tiritas</label></li>
      </ul>
    `
  },
  {
    id: 'budget',
    name: 'Resumen de Presupuesto',
    description: 'Planificación financiera aproximada del viaje para estimar los costes.',
    icon: '💰',
    content: `
      <h1>💰 Resumen y Estimación de Presupuesto</h1>
      <p>Estimación inicial de gastos previstos por categorías antes de iniciar el viaje.</p>

      <h2>📊 Presupuesto Estimado</h2>
      <table>
        <thead>
          <tr>
            <th>Categoría</th>
            <th>Coste Estimado</th>
            <th>¿Pagado por Adelantado?</th>
            <th>Notas</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>🏨 Alojamiento</td>
            <td>450.00 €</td>
            <td>Sí (Reserva online)</td>
            <td>Hotel céntrico 3 noches.</td>
          </tr>
          <tr>
            <td>✈️ Transporte</td>
            <td>280.00 €</td>
            <td>Sí (Billetes de avión)</td>
            <td>Incluye equipaje de mano.</td>
          </tr>
          <tr>
            <td>🍔 Comida</td>
            <td>250.00 €</td>
            <td>No (Gastos in situ)</td>
            <td>Restaurantes y supermercado local.</td>
          </tr>
          <tr>
            <td>🎭 Actividades y Ocio</td>
            <td>120.00 €</td>
            <td>No (Algunas entradas online)</td>
            <td>Museos, metro, tours libres.</td>
          </tr>
          <tr>
            <td>🎁 Regalos / Varios</td>
            <td>50.00 €</td>
            <td>No</td>
            <td>Detalles y recuerdos.</td>
          </tr>
          <tr>
            <td><strong>TOTAL ESTIMADO</strong></td>
            <td><strong>1150.00 €</strong></td>
            <td>-</td>
            <td>Presupuesto total del grupo.</td>
          </tr>
        </tbody>
      </table>

      <blockquote>
        <strong>Consejo:</strong> A medida que realicemos los gastos durante el viaje, los iremos registrando en la pestaña de <strong>Gastos</strong> de la app para ver la división de cuentas real.
      </blockquote>
    `
  }
];

export default function DocumentTemplates({ onClose, onSelect }: DocumentTemplatesProps) {
  return (
    <div className="doc-modal-overlay">
      <div className="doc-modal-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="doc-modal-title">📋 Seleccionar Plantilla</span>
          <button onClick={onClose} className="doc-modal-close">
            <X size={18} />
          </button>
        </div>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
          Al seleccionar una plantilla se reemplazará el contenido actual del documento. ¿Deseas continuar?
        </p>

        <div className="template-grid">
          {TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => {
                onSelect(tpl.content);
                onClose();
              }}
              className="template-card"
            >
              <span className="template-icon">{tpl.icon}</span>
              <span className="template-name">{tpl.name}</span>
              <span className="template-desc">{tpl.description}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
