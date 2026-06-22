import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { repository } from '@/lib/repository';

const JWT_SECRET = process.env.JWT_SECRET || 'divvy-fallback-secret-key-12345';

interface DeleteTokenPayload {
  groupId: string;
  userId: string;
  action: string;
}

export async function POST(request: Request) {
  try {
    const { token } = await request.json();
    if (!token) {
      return NextResponse.json({ error: 'Token no proporcionado.' }, { status: 400 });
    }

    let decoded: DeleteTokenPayload;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as DeleteTokenPayload;
    } catch (err) {
      return NextResponse.json({ error: 'El enlace de verificación no es válido o ha expirado.' }, { status: 400 });
    }

    if (decoded.action !== 'delete-group' || !decoded.groupId || !decoded.userId) {
      return NextResponse.json({ error: 'Acción de verificación inválida.' }, { status: 400 });
    }

    const { groupId } = decoded;

    // Check if group exists
    const group = await repository.groups.getById(groupId);
    if (!group) {
      return NextResponse.json({ error: 'El grupo ya ha sido eliminado o no existe.' }, { status: 404 });
    }

    // Verify requester membership
    if (!group.members.includes(decoded.userId)) {
      return NextResponse.json({ error: 'El usuario solicitante no pertenece a este grupo.' }, { status: 403 });
    }

    // Delete associated expenses
    await repository.expenses.deleteByGroupId(groupId);

    // Delete the group itself
    const success = await repository.groups.delete(groupId);
    if (!success) {
      return NextResponse.json({ error: 'No se pudo eliminar el grupo.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Grupo y gastos eliminados correctamente.',
      groupName: group.name
    });
  } catch (e) {
    console.error('Error confirming group deletion:', e);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
