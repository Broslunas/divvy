import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { repository } from '@/lib/repository';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const notifications = await repository.notifications.getUserNotifications(user.id);
    return NextResponse.json(notifications);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const body = await request.json();
    const { id, all } = body;

    if (all) {
      await repository.notifications.markAllAsRead(user.id);
      return NextResponse.json({ success: true });
    }

    if (!id) {
      return NextResponse.json({ error: 'Se requiere el ID de la notificación.' }, { status: 400 });
    }

    const notif = await repository.notifications.getById(id);
    if (!notif) {
      return NextResponse.json({ error: 'Notificación no encontrada.' }, { status: 404 });
    }

    if (notif.userId !== user.id) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
    }

    const updated = await repository.notifications.update(id, { isRead: true });
    return NextResponse.json(updated);
  } catch (err) {
    console.error('Error updating notification:', err);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    await repository.notifications.clearAll(user.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error clearing notifications:', err);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
