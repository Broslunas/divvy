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

    const { id: groupId } = await params;

    const group = await repository.groups.getById(groupId);
    if (!group) {
      return NextResponse.json({ error: 'Grupo no encontrado.' }, { status: 404 });
    }

    if (!group.members.includes(user.id)) {
      return NextResponse.json({ error: 'No tienes acceso a este grupo.' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = (formData.get('image') || formData.get('file')) as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó ningún archivo.' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Formato de imagen no permitido.' }, { status: 400 });
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: 'La imagen excede el límite de 5 MB.' }, { status: 400 });
    }

    const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
    const timestamp = Date.now();
    const key = `docs/${groupId}/${timestamp}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Cloudflare R2
    const url = await uploadToR2(key, buffer, file.type);

    return NextResponse.json({ url });
  } catch (e) {
    console.error('Error uploading doc image:', e);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
