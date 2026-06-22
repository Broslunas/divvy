import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { repository } from '@/lib/repository';
import { uploadToR2 } from '@/lib/r2';

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const { id } = await params;

    const group = await repository.groups.getById(id);
    if (!group) {
      return NextResponse.json({ error: 'Grupo no encontrado.' }, { status: 404 });
    }

    if (!group.members.includes(user.id)) {
      return NextResponse.json({ error: 'No tienes acceso a este grupo.' }, { status: 403 });
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('cover') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No se ha proporcionado ninguna imagen.' }, { status: 400 });
    }

    // Validate MIME type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Tipo de archivo no permitido. Usa: ${ALLOWED_TYPES.map(t => t.split('/')[1]).join(', ')}.` },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: 'La imagen no puede superar los 5 MB.' }, { status: 400 });
    }

    // Build R2 key — include timestamp to bust CDN cache on re-upload
    const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
    const key = `covers/${id}-${Date.now()}.${ext}`;

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Cloudflare R2
    const coverImageUrl = await uploadToR2(key, buffer, file.type);

    // Persist URL in MongoDB
    const updatedGroup = await repository.groups.update(id, { coverImageUrl });
    if (!updatedGroup) {
      return NextResponse.json({ error: 'No se pudo actualizar el grupo.' }, { status: 500 });
    }

    return NextResponse.json({ coverImageUrl });
  } catch (e) {
    console.error('Error uploading cover image:', e);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

// DELETE /api/groups/[id]/cover — remove cover image
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const { id } = await params;

    const group = await repository.groups.getById(id);
    if (!group) {
      return NextResponse.json({ error: 'Grupo no encontrado.' }, { status: 404 });
    }

    if (!group.members.includes(user.id)) {
      return NextResponse.json({ error: 'No tienes acceso a este grupo.' }, { status: 403 });
    }

    await repository.groups.update(id, { coverImageUrl: null });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Error removing cover image:', e);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
