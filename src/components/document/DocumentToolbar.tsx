import { Editor } from '@tiptap/react';
import {
  Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter,
  AlignRight, AlignJustify, List, ListOrdered, CheckSquare, Link,
  Image, Table, Sparkles, FileText, Download, Undo2, Redo2, Quote, Highlighter, ChevronDown, Scissors,
  Code
} from 'lucide-react';
import { useRef } from 'react';

interface DocumentToolbarProps {
  editor: Editor | null;
  onOpenTemplates: () => void;
  onOpenAI: () => void;
  onOpenExpenseLinker: () => void;
  onExportPDF: () => void;
  onUploadImage: (file: File) => Promise<void>;
  onOpenInsertHtml: () => void;
}

export default function DocumentToolbar({
  editor,
  onOpenTemplates,
  onOpenAI,
  onOpenExpenseLinker,
  onExportPDF,
  onUploadImage,
  onOpenInsertHtml
}: DocumentToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!editor) return null;

  // Handle image upload input selection
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await onUploadImage(file);
    }
  };

  // Insert Table helper
  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  // Add Link helper
  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL del enlace:', previousUrl);
    
    // cancelled
    if (url === null) return;

    // empty
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  // Dropdown for Headings
  const handleHeadingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'p') {
      editor.chain().focus().setParagraph().run();
    } else {
      const level = parseInt(val, 10);
      editor.chain().focus().toggleHeading({ level: level as any }).run();
    }
  };

  // Determine current heading/paragraph value for dropdown
  const getHeadingValue = () => {
    if (editor.isActive('heading', { level: 1 })) return '1';
    if (editor.isActive('heading', { level: 2 })) return '2';
    if (editor.isActive('heading', { level: 3 })) return '3';
    return 'p';
  };

  // Dropdown for Text Color
  const handleColorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const color = e.target.value;
    if (color === 'reset') {
      editor.chain().focus().unsetColor().run();
    } else {
      editor.chain().focus().setColor(color).run();
    }
  };

  return (
    <div className="document-toolbar">
      {/* Undo / Redo */}
      <div className="toolbar-group">
        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="toolbar-btn"
          title="Deshacer"
        >
          <Undo2 size={15} />
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="toolbar-btn"
          title="Rehacer"
        >
          <Redo2 size={15} />
        </button>
      </div>

      {/* Headings */}
      <div className="toolbar-group">
        <select
          value={getHeadingValue()}
          onChange={handleHeadingChange}
          className="toolbar-select"
          title="Estilo de texto"
        >
          <option value="p">Texto normal</option>
          <option value="1">Título 1</option>
          <option value="2">Título 2</option>
          <option value="3">Título 3</option>
        </select>
      </div>

      {/* Text Format */}
      <div className="toolbar-group">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`toolbar-btn ${editor.isActive('bold') ? 'active' : ''}`}
          title="Negrita"
        >
          <Bold size={15} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`toolbar-btn ${editor.isActive('italic') ? 'active' : ''}`}
          title="Cursiva"
        >
          <Italic size={15} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`toolbar-btn ${editor.isActive('underline') ? 'active' : ''}`}
          title="Subrayado"
        >
          <Underline size={15} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`toolbar-btn ${editor.isActive('strike') ? 'active' : ''}`}
          title="Tachado"
        >
          <Strikethrough size={15} />
        </button>
      </div>

      {/* Text Color */}
      <div className="toolbar-group">
        <select
          onChange={handleColorChange}
          defaultValue="reset"
          className="toolbar-select"
          style={{ minWidth: '70px' }}
          title="Color de texto"
        >
          <option value="reset">Color</option>
          <option value="#1C1C1E">Negro</option>
          <option value="#C87A53">Terracota</option>
          <option value="#4A5D4E">Oliva</option>
          <option value="#5C768D">Azul</option>
          <option value="#B05A5A">Rojo</option>
          <option value="#8E8D8A">Gris</option>
        </select>
      </div>

      {/* Alignment */}
      <div className="toolbar-group">
        <button
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={`toolbar-btn ${editor.isActive({ textAlign: 'left' }) ? 'active' : ''}`}
          title="Alinear a la izquierda"
        >
          <AlignLeft size={15} />
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={`toolbar-btn ${editor.isActive({ textAlign: 'center' }) ? 'active' : ''}`}
          title="Centrar"
        >
          <AlignCenter size={15} />
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={`toolbar-btn ${editor.isActive({ textAlign: 'right' }) ? 'active' : ''}`}
          title="Alinear a la derecha"
        >
          <AlignRight size={15} />
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          className={`toolbar-btn ${editor.isActive({ textAlign: 'justify' }) ? 'active' : ''}`}
          title="Justificar"
        >
          <AlignJustify size={15} />
        </button>
      </div>

      {/* Lists & Quotes */}
      <div className="toolbar-group">
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`toolbar-btn ${editor.isActive('bulletList') ? 'active' : ''}`}
          title="Lista con viñetas"
        >
          <List size={15} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`toolbar-btn ${editor.isActive('orderedList') ? 'active' : ''}`}
          title="Lista numerada"
        >
          <ListOrdered size={15} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          className={`toolbar-btn ${editor.isActive('taskList') ? 'active' : ''}`}
          title="Lista de tareas (checklists)"
        >
          <CheckSquare size={15} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`toolbar-btn ${editor.isActive('blockquote') ? 'active' : ''}`}
          title="Cita"
        >
          <Quote size={15} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          className={`toolbar-btn ${editor.isActive('highlight') ? 'active' : ''}`}
          title="Resaltador"
        >
          <Highlighter size={15} />
        </button>
      </div>

      {/* Links, Tables, Images */}
      <div className="toolbar-group">
        <button
          onClick={setLink}
          className={`toolbar-btn ${editor.isActive('link') ? 'active' : ''}`}
          title="Insertar enlace"
        >
          <Link size={15} />
        </button>
        <button
          onClick={insertTable}
          className={`toolbar-btn ${editor.isActive('table') ? 'active' : ''}`}
          title="Insertar tabla"
        >
          <Table size={15} />
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="toolbar-btn"
          title="Insertar imagen"
        >
          <Image size={15} />
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageChange}
            accept="image/*"
            style={{ display: 'none' }}
          />
        </button>
        <button
          onClick={() => (editor as any).commands.insertPageBreak()}
          className="toolbar-btn"
          title="Salto de página (A4)"
        >
          <Scissors size={15} />
        </button>
        <button
          onClick={onOpenInsertHtml}
          className="toolbar-btn"
          title="Insertar código HTML"
        >
          <Code size={15} />
        </button>
      </div>

      {/* Extras: Gastos, Plantillas, IA, PDF */}
      <div className="toolbar-group" style={{ marginLeft: 'auto' }}>
        <button
          onClick={onOpenExpenseLinker}
          className="toolbar-btn"
          style={{ width: 'auto', padding: '0 8px', fontSize: '0.68rem', gap: '4px', fontWeight: 700 }}
          title="Vincular gasto"
        >
          💸 Gasto
        </button>
        <button
          onClick={onOpenTemplates}
          className="toolbar-btn"
          title="Plantillas prediseñadas"
        >
          <FileText size={15} />
        </button>
        <button
          onClick={onOpenAI}
          className="toolbar-btn"
          style={{ color: 'var(--accent-primary)' }}
          title="Asistente de IA"
        >
          <Sparkles size={15} style={{ fill: 'currentColor' }} />
        </button>
        <button
          onClick={onExportPDF}
          className="toolbar-btn"
          title="Descargar como PDF"
        >
          <Download size={15} />
        </button>
      </div>
    </div>
  );
}
