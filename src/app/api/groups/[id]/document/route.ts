import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { repository } from '@/lib/repository';

// Convierte las notas viejas en Markdown simple a HTML para Tiptap
function migrateNotesToHtml(notesText: string): string {
  if (!notesText.trim()) return '';

  const lines = notesText.split('\n');
  let inList = false;
  let html = '';

  for (let line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('# ')) {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      html += `<h1>${trimmed.substring(2)}</h1>`;
    } else if (trimmed.startsWith('## ')) {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      html += `<h2>${trimmed.substring(3)}</h2>`;
    } else if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      if (!inList) {
        html += '<ul>';
        inList = true;
      }
      html += `<li>${trimmed.substring(2)}</li>`;
    } else {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      if (trimmed) {
        html += `<p>${trimmed}</p>`;
      } else {
        html += '<p></p>';
      }
    }
  }

  if (inList) {
    html += '</ul>';
  }

  return html;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const { id: groupId } = await params;

    const group = await repository.groups.getById(groupId);
    if (!group) {
      return NextResponse.json({ error: 'Grupo no encontrado.' }, { status: 404 });
    }

    if (!group.members.includes(user.id)) {
      return NextResponse.json({ error: 'No tienes acceso a este grupo.' }, { status: 403 });
    }

    // Buscar el documento del grupo
    let document = await repository.documents.getByGroupId(groupId);

    // Si no existe pero el grupo tiene notas antiguas, migrar
    if (!document && group.notes) {
      const migratedHtml = migrateNotesToHtml(group.notes);
      document = await repository.documents.upsert(groupId, {
        title: `Documento de ${group.name}`,
        content: migratedHtml,
        lastEditedBy: 'system'
      });
      
      // Limpiar notas en el grupo para evitar doble migración
      await repository.groups.update(groupId, { notes: '' });
    }

    // Si sigue sin existir, crear uno en blanco
    if (!document) {
      document = await repository.documents.upsert(groupId, {
        title: `Documento de ${group.name}`,
        content: '<p></p>',
        lastEditedBy: 'system'
      });
    }

    return NextResponse.json(document);
  } catch (e) {
    console.error('Error fetching document:', e);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const { id: groupId } = await params;
    const { title, content } = await request.json();

    const group = await repository.groups.getById(groupId);
    if (!group) {
      return NextResponse.json({ error: 'Grupo no encontrado.' }, { status: 404 });
    }

    if (!group.members.includes(user.id)) {
      return NextResponse.json({ error: 'No tienes acceso a este grupo.' }, { status: 403 });
    }

    const updatedDocument = await repository.documents.upsert(groupId, {
      title: title || 'Documento sin título',
      content: content || '',
      lastEditedBy: user.id
    });

    return NextResponse.json(updatedDocument);
  } catch (e) {
    console.error('Error updating document:', e);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
