import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { repository } from '@/lib/repository';

// GET /api/notifications - Get all notifications for current user
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const notifications = await repository.notifications.getByUserId(user.id);
    return NextResponse.json(notifications);
  } catch (e) {
    console.error('Error fetching notifications:', e);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

// PUT /api/notifications - Mark notification(s) as read
export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const { id, all } = await request.json().catch(() => ({}));

    if (all) {
      await repository.notifications.markAllAsRead(user.id);
      return NextResponse.json({ success: true, message: 'Todas las notificaciones marcadas como leídas.' });
    }

    if (!id) {
      return NextResponse.json({ error: 'Se requiere el ID de la notificación o la opción all.' }, { status: 400 });
    }

    const updated = await repository.notifications.markAsRead(id, user.id);
    if (!updated) {
      return NextResponse.json({ error: 'Notificación no encontrada.' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (e) {
    console.error('Error updating notification:', e);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

// DELETE /api/notifications - Delete notification(s)
export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const { id, all } = await request.json().catch(() => ({}));

    if (all) {
      await repository.notifications.deleteAll(user.id);
      return NextResponse.json({ success: true, message: 'Todas las notificaciones eliminadas.' });
    }

    if (!id) {
      return NextResponse.json({ error: 'Se requiere el ID de la notificación o la opción all.' }, { status: 400 });
    }

    const success = await repository.notifications.delete(id, user.id);
    if (!success) {
      return NextResponse.json({ error: 'Notificación no encontrada.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Notificación eliminada.' });
  } catch (e) {
    console.error('Error deleting notification:', e);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
