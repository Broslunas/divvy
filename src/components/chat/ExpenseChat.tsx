'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Send, Paperclip, MessageSquare, Loader2, X, AlertCircle } from 'lucide-react';
import type { Comment, User } from '@/types';
import { offlineDb } from '@/lib/offline-db';
import { useOfflineSync } from '@/lib/useOfflineSync';
import styles from './chat.module.css';

interface ExpenseChatProps {
  expenseId: string;
  groupId: string;
  members: Omit<User, 'passwordHash'>[];
  currentUser: User | null;
}

const QUICK_TEMPLATES = [
  'Bizum enviado 👍',
  'He pagado mi parte ✅',
  '¿Esto qué es? 🧐',
  'Falta el ticket 📄',
  '¡Cuentas saldadas! 🎉',
];

export default function ExpenseChat({ expenseId, groupId, members, currentUser }: ExpenseChatProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [inputText, setInputText] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const feedEndRef = useRef<HTMLDivElement>(null);

  const { isOnline, refreshPendingCount } = useOfflineSync();

  // Scroll to bottom helper
  const scrollToBottom = (behavior: 'smooth' | 'auto' = 'smooth') => {
    feedEndRef.current?.scrollIntoView({ behavior });
  };

  // Fetch comments
  const fetchComments = useCallback(async () => {
    try {
      if (!isOnline) {
        // Load from local IndexedDB cache if offline
        const cached = await offlineDb.cache.getComments<Comment>(expenseId);
        if (cached) {
          setComments(cached);
        }
        setLoading(false);
        return;
      }

      const res = await fetch(`/api/comments?expenseId=${expenseId}`);
      if (!res.ok) {
        throw new Error('Error al cargar comentarios');
      }

      const data = await res.json();
      setComments(data);
      
      // Save to IndexedDB cache
      await offlineDb.cache.saveComments(expenseId, data);
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar los comentarios.');
      // Try fallback to cache anyway
      const cached = await offlineDb.cache.getComments<Comment>(expenseId);
      if (cached) {
        setComments(cached);
      }
    } finally {
      setLoading(false);
    }
  }, [expenseId, isOnline]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Scroll to bottom whenever comments load or change
  useEffect(() => {
    if (comments.length > 0) {
      scrollToBottom('auto');
    }
  }, [comments]);

  // Client-side image resizing and compression
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 600;
          const MAX_HEIGHT = 600;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // Quality 0.6 JPEG compression produces small file sizes suitable for IndexedDB queue
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
          resolve(dataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Solo se permiten imágenes.');
      return;
    }

    try {
      const compressedBase64 = await compressImage(file);
      setImagePreview(compressedBase64);
    } catch (err) {
      console.error('Error compressing image:', err);
      alert('No se pudo procesar la imagen.');
    }
  };

  const handlePostComment = async (textToSend: string, imageToSend: string | null = null) => {
    const trimmedText = textToSend.trim();
    if (!trimmedText && !imageToSend) return;
    if (!currentUser) return;

    setSubmitting(true);
    setError(null);

    const payload = {
      expenseId,
      groupId,
      text: trimmedText || 'Adjuntó una imagen',
      imageUrl: imageToSend || undefined,
    };

    if (!isOnline) {
      // Offline mode: queue mutation in IndexedDB
      const tempId = `offline-comment-${Date.now()}`;
      const optimisticComment: Comment = {
        id: tempId,
        expenseId,
        groupId,
        userId: currentUser.id,
        username: currentUser.username,
        avatarColor: currentUser.avatarColor,
        text: trimmedText || 'Adjuntó una imagen',
        imageUrl: imageToSend || undefined,
        createdAt: new Date().toISOString(),
      };

      try {
        await offlineDb.queue.add({
          id: tempId,
          method: 'POST',
          url: '/api/comments',
          body: payload,
          createdAt: new Date().toISOString(),
          label: `Comentario en gasto: "${trimmedText.substring(0, 15)}..."`,
          optimisticData: optimisticComment,
        });

        const updatedComments = [...comments, optimisticComment];
        setComments(updatedComments);
        await offlineDb.cache.saveComments(expenseId, updatedComments);
        await refreshPendingCount();

        setInputText('');
        setImagePreview(null);
        setTimeout(() => scrollToBottom(), 100);
      } catch (err) {
        console.error('Error queueing offline comment:', err);
        setError('Error al guardar comentario localmente.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error al enviar comentario');
      }

      const newComment = await res.json();
      const updatedComments = [...comments, newComment];
      setComments(updatedComments);
      await offlineDb.cache.saveComments(expenseId, updatedComments);

      setInputText('');
      setImagePreview(null);
      setTimeout(() => scrollToBottom(), 100);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'No se pudo enviar el comentario.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handlePostComment(inputText, imagePreview);
  };

  const handleTemplateClick = (template: string) => {
    handlePostComment(template);
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    } catch {
      return '';
    }
  };

  return (
    <div className={styles.chatContainer}>
      <div className={styles.chatHeader}>
        <MessageSquare size={16} className={styles.chatHeaderIcon} />
        <span>Comentarios y Discusión</span>
      </div>

      {/* Message Feed */}
      <div className={styles.feed}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '30px' }}>
            <Loader2 className="animate-spin" size={24} style={{ color: 'var(--accent-primary)' }} />
          </div>
        ) : comments.length === 0 ? (
          <div className={styles.emptyState}>
            <MessageSquare size={24} style={{ opacity: 0.4 }} />
            <p className={styles.emptyText}>No hay comentarios en este gasto todavía.</p>
            <p style={{ fontSize: '0.72rem', margin: 0, opacity: 0.6 }}>¡Pregunta sobre el importe o avisa cuando pagues tu cuota!</p>
          </div>
        ) : (
          comments.map((comment, index) => {
            const isMe = comment.userId === currentUser?.id;
            const prevComment = index > 0 ? comments[index - 1] : null;
            const showDateHeader = !prevComment || 
              new Date(comment.createdAt).toDateString() !== new Date(prevComment.createdAt).toDateString();

            return (
              <div key={comment.id || index} style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                {showDateHeader && (
                  <div style={{ alignSelf: 'center', margin: '8px 0', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: '10px' }}>
                    {formatDate(comment.createdAt)}
                  </div>
                )}
                
                <div className={`${styles.messageRow} ${isMe ? styles.messageRowCurrentUser : styles.messageRowOther}`}>
                  {!isMe && (
                    <div 
                      className={styles.avatar} 
                      style={{ backgroundColor: comment.avatarColor }}
                      title={comment.username}
                    >
                      {comment.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className={styles.messageContent}>
                    {!isMe && <span className={styles.senderName}>{comment.username}</span>}
                    <div className={`${styles.bubble} ${isMe ? styles.bubbleCurrentUser : styles.bubbleOther}`}>
                      <span>{comment.text}</span>
                      {comment.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img 
                          src={comment.imageUrl} 
                          alt="Adjunto" 
                          className={styles.bubbleImage} 
                          onClick={() => window.open(comment.imageUrl, '_blank')}
                        />
                      )}
                    </div>
                    <span className={styles.messageTime}>{formatTime(comment.createdAt)}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={feedEndRef} />
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#FDF0EC', color: 'var(--danger)', fontSize: '0.78rem' }}>
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* Quick Templates Toolbar */}
      <div className={styles.templatesContainer}>
        {QUICK_TEMPLATES.map((tmpl) => (
          <button
            key={tmpl}
            type="button"
            className={styles.templateBtn}
            onClick={() => handleTemplateClick(tmpl)}
            disabled={submitting}
          >
            {tmpl}
          </button>
        ))}
      </div>

      {/* File Upload Preview Panel */}
      {imagePreview && (
        <div className={styles.previewPanel}>
          <div className={styles.previewInfo}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imagePreview} alt="Preview" className={styles.previewThumb} />
            <span className={styles.previewName}>Imagen lista para enviar</span>
          </div>
          <button 
            type="button" 
            className={styles.clearPreviewBtn}
            onClick={() => setImagePreview(null)}
            title="Quitar imagen"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Input Message Form */}
      <form onSubmit={handleFormSubmit} className={styles.inputForm}>
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <button
          type="button"
          className={styles.actionBtn}
          onClick={() => fileInputRef.current?.click()}
          title="Adjuntar captura o ticket"
          disabled={submitting}
        >
          <Paperclip size={18} />
        </button>

        <input
          type="text"
          placeholder={isOnline ? "Escribe un comentario..." : "Escribe offline..."}
          className={styles.inputField}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={submitting}
        />

        <button
          type="submit"
          className={`${styles.actionBtn} ${styles.sendBtn}`}
          disabled={submitting || (!inputText.trim() && !imagePreview)}
          title="Enviar"
        >
          {submitting ? (
            <Loader2 className="animate-spin" size={16} />
          ) : (
            <Send size={16} />
          )}
        </button>
      </form>
    </div>
  );
}
