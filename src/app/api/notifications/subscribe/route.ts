import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { repository } from '@/lib/repository';

// POST /api/notifications/subscribe - Register a push subscription
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const { endpoint, keys, userAgent } = await request.json();

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: 'Faltan campos obligatorios de la suscripción.' }, { status: 400 });
    }

    // Check if this endpoint is already registered
    const existing = await repository.pushSubscriptions.getByEndpoints([endpoint]);
    if (existing.length > 0) {
      return NextResponse.json({ message: 'Suscripción ya registrada.' });
    }

    const subscription = await repository.pushSubscriptions.create({
      userId: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent: userAgent || undefined
    });

    return NextResponse.json(subscription, { status: 201 });
  } catch (e) {
    console.error('Error subscribing to push notifications:', e);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

// DELETE /api/notifications/subscribe - Unregister a push subscription
export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const { endpoint } = await request.json();
    if (!endpoint) {
      return NextResponse.json({ error: 'Se requiere el endpoint.' }, { status: 400 });
    }

    const success = await repository.pushSubscriptions.deleteByEndpoint(endpoint);
    return success
      ? NextResponse.json({ message: 'Suscripción eliminada.' })
      : NextResponse.json({ error: 'Suscripción no encontrada.' }, { status: 404 });
  } catch (e) {
    console.error('Error unsubscribing from push notifications:', e);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
