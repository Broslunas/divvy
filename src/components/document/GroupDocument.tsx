'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Link } from '@tiptap/extension-link';
import { Image } from '@tiptap/extension-image';
import { Placeholder } from '@tiptap/extension-placeholder';
import { TextAlign } from '@tiptap/extension-text-align';
import { Underline } from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Typography } from '@tiptap/extension-typography';
import { CloudLightning, FileText, Check, AlertCircle, Edit2, Sparkles } from 'lucide-react';

import { ExpenseBlock } from './extensions/expense-node';
import DocumentToolbar from './DocumentToolbar';
import DocumentTemplates from './DocumentTemplates';
import AIGenerateModal from './AIGenerateModal';
import ExpenseLinkSelector from './ExpenseLinkSelector';
import { useRouter } from 'next/navigation';
import type { Expense, User } from '@/types';

import './document-editor.css';

interface GroupDocumentProps {
  groupId: string;
  expenses: Expense[];
  members: Omit<User, 'passwordHash'>[];
  currency?: string;
  isEditMode?: boolean;
}

export default function GroupDocument({
  groupId,
  expenses,
  members,
  currency,
  isEditMode = false
}: GroupDocumentProps) {
  const router = useRouter();
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [title, setTitle] = useState('Documento del grupo');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('saved');
  const [isEditing, setIsEditing] = useState(isEditMode);

  
  // Modal states
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [showExpenseLinker, setShowExpenseLinker] = useState(false);
  const [selectedText, setSelectedText] = useState('');

  // Refs for debounce autosave
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Tiptap editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({
        types: ['heading', 'paragraph']
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          class: 'autodetected-link'
        }
      }),
      Image.configure({
        inline: true,
        allowBase64: true
      }),
      Placeholder.configure({
        placeholder: 'Escribe aquí el itinerario de viaje, notas de alojamiento o cualquier información relevante...'
      }),
      TaskList,
      TaskItem.configure({
        nested: true
      }),
      Table.configure({
        resizable: true
      }),
      TableRow,
      TableHeader,
      TableCell,
      Typography,
      ExpenseBlock
    ],
    content: '<p></p>',
    editable: isEditMode, // Initial editable state based on prop
    onUpdate: ({ editor }) => {
      // Trigger autosave when content updates
      setSaveStatus('saving');
      triggerAutosave(title, editor.getHTML());
    }
  });

  // Fetch document on mount
  useEffect(() => {
    async function loadDocument() {
      try {
        const res = await fetch(`/api/groups/${groupId}/document`);
        if (!res.ok) throw new Error('Error al cargar documento');
        
        const data = await res.json();
        setDocumentId(data.id);
        setTitle(data.title || `Documento de viaje`);
        
        if (editor && data.content) {
          editor.commands.setContent(data.content);
        }
        setSaveStatus('saved');
      } catch (e) {
        console.error(e);
        setSaveStatus('error');
      }
    }

    if (editor) {
      loadDocument();
    }
  }, [groupId, editor]);

  // Save document implementation
  const saveDocument = useCallback(
    async (updatedTitle: string, updatedContent: string) => {
      try {
        const res = await fetch(`/api/groups/${groupId}/document`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: updatedTitle,
            content: updatedContent
          })
        });

        if (!res.ok) throw new Error('No se pudo guardar');
        
        setSaveStatus('saved');
      } catch (e) {
        console.error('Error saving document:', e);
        setSaveStatus('error');
      }
    },
    [groupId]
  );

  // Debounced save trigger
  const triggerAutosave = useCallback(
    (newTitle: string, newContent: string) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        saveDocument(newTitle, newContent);
      }, 2000); // 2 seconds debounce
    },
    [saveDocument]
  );

  // Title change handler
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    setSaveStatus('saving');
    if (editor) {
      triggerAutosave(newTitle, editor.getHTML());
    }
  };

  // Image Upload handler
  const handleUploadImage = async (file: File) => {
    setSaveStatus('saving');
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch(`/api/groups/${groupId}/document/image`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Fallo de subida');
      }

      const data = await res.json();
      
      // Insert image in editor
      if (editor && data.url) {
        editor.chain().focus().setImage({ src: data.url }).run();
      }
      setSaveStatus('saved');
    } catch (e) {
      console.error(e);
      setSaveStatus('error');
    }
  };

  // Link Expense handler
  const handleSelectExpense = (expense: Expense, paidByName: string) => {
    if (!editor) return;

    editor.chain().focus().insertContent({
      type: 'expenseBlock',
      attrs: {
        id: expense.id,
        title: expense.title,
        amount: expense.amount,
        category: expense.category,
        paidBy: paidByName,
        currency: currency || 'EUR'
      }
    }).run();
  };

  // Insert AI content
  const handleInsertAIContent = (htmlContent: string, isReplacement: boolean) => {
    if (!editor) return;

    if (isReplacement) {
      editor.chain().focus().insertContent(htmlContent).run();
    } else {
      // Append or insert at selection cursor
      editor.chain().focus().insertContent(htmlContent).run();
    }
  };

  // Open AI modal and get current selection
  const handleOpenAI = () => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, ' ');
    setSelectedText(text);
    setShowAI(true);
  };

  // PDF Export
  const handleExportPDF = () => {
    window.print();
  };

  // Apply template
  const handleSelectTemplate = (templateContent: string) => {
    if (!editor) return;
    editor.commands.setContent(templateContent);
    // Force immediate save
    setSaveStatus('saving');
    saveDocument(title, templateContent);
  };

  const handleStartEditing = () => {
    router.push(`/group/${groupId}/edit`);
  };

  const handleStopEditing = () => {
    if (editor) {
      saveDocument(title, editor.getHTML());
    }
    router.push(`/group/${groupId}?tab=notas`);
  };

  // RENDER PREVIEW MODE
  if (!isEditing) {
    return (
      <div className="document-preview-container">
        <div className="document-preview-header">
          <div className="document-preview-title">
            <FileText size={18} style={{ color: 'var(--accent-primary)' }} />
            <span>{title}</span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleStartEditing}
              className="btn"
              style={{
                padding: '6px 14px',
                fontSize: '0.72rem',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--accent-primary)',
                color: 'white',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: 'var(--shadow-tactile)'
              }}
            >
              <Edit2 size={12} /> Editar Documento
            </button>
          </div>
        </div>

        <div className="document-preview-body">
          <EditorContent editor={editor} />
        </div>
      </div>
    );
  }

  // RENDER FULLSCREEN EDIT MODE
  return (
    <div className="document-fullscreen-overlay">
      {/* Top Header Row */}
      <div className="document-fullscreen-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexGrow: 1 }}>
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="document-title-input"
            placeholder="Nombre del documento..."
          />
          <div className="document-status-badge">
            {saveStatus === 'saving' && (
              <>
                <CloudLightning size={12} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
                <span>Guardando...</span>
              </>
            )}
            {saveStatus === 'saved' && (
              <>
                <Check size={12} style={{ color: 'var(--success)' }} />
                <span>Guardado ✓</span>
              </>
            )}
            {saveStatus === 'error' && (
              <>
                <AlertCircle size={12} style={{ color: 'var(--danger)' }} />
                <span>Error al guardar</span>
              </>
            )}
          </div>
        </div>

        <button
          onClick={handleStopEditing}
          className="fullscreen-exit-btn"
        >
          Guardar y Salir
        </button>
      </div>

      {/* Tiptap Google Docs style Toolbar */}
      <DocumentToolbar
        editor={editor}
        onOpenTemplates={() => setShowTemplates(true)}
        onOpenAI={handleOpenAI}
        onOpenExpenseLinker={() => setShowExpenseLinker(true)}
        onExportPDF={handleExportPDF}
        onUploadImage={handleUploadImage}
      />

      {/* Editor Main Canvas workspace */}
      <div className="document-fullscreen-viewport">
        <div className="document-fullscreen-paper">
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Templates Modal */}
      {showTemplates && (
        <DocumentTemplates
          onClose={() => setShowTemplates(false)}
          onSelect={handleSelectTemplate}
        />
      )}

      {/* AI Generator Modal */}
      {showAI && (
        <AIGenerateModal
          groupId={groupId}
          selectedText={selectedText}
          onClose={() => setShowAI(false)}
          onInsert={handleInsertAIContent}
        />
      )}

      {/* Expense Linker Selector Modal */}
      {showExpenseLinker && (
        <ExpenseLinkSelector
          expenses={expenses}
          members={members}
          onClose={() => setShowExpenseLinker(false)}
          onSelect={handleSelectExpense}
        />
      )}
    </div>
  );
}
