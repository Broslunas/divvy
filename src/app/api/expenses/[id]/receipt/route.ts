import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { repository } from '@/lib/repository';
import { uploadToR2 } from '@/lib/r2';

const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/heic', 'image/heif'];

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

    const expense = await repository.expenses.getById(id);
    if (!expense) {
      return NextResponse.json({ error: 'Gasto no encontrado.' }, { status: 404 });
    }

    const group = await repository.groups.getById(expense.groupId);
    if (!group || !group.members.includes(user.id)) {
      return NextResponse.json({ error: 'No tienes acceso a este gasto.' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('receipt') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No se ha proporcionado ninguna imagen.' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Tipo de archivo no permitido. Usa: ${ALLOWED_TYPES.map(t => t.split('/')[1]).join(', ')}.` },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: 'La imagen no puede superar los 10 MB.' }, { status: 400 });
    }

    const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
    const key = `receipts/${id}-${Date.now()}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const receiptImageUrl = await uploadToR2(key, buffer, file.type);

    const updatedExpense = await repository.expenses.update(id, { receiptImageUrl });
    if (!updatedExpense) {
      return NextResponse.json({ error: 'No se pudo actualizar el gasto.' }, { status: 500 });
    }

    return NextResponse.json({ receiptImageUrl });
  } catch (e) {
    console.error('Error uploading receipt:', e);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

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

    const expense = await repository.expenses.getById(id);
    if (!expense) {
      return NextResponse.json({ error: 'Gasto no encontrado.' }, { status: 404 });
    }

    const group = await repository.groups.getById(expense.groupId);
    if (!group || !group.members.includes(user.id)) {
      return NextResponse.json({ error: 'No tienes acceso a este gasto.' }, { status: 403 });
    }

    await repository.expenses.update(id, { receiptImageUrl: null as any });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Error removing receipt:', e);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
