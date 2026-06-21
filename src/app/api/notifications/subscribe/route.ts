import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { repository } from '@/lib/repository';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const body = await request.json();
    const { subscription } = body;
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json({ error: 'Suscripción inválida.' }, { status: 400 });
    }

    const saved = await repository.pushSubscriptions.create({
      userId: user.id,
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });

    return NextResponse.json({ success: true, subscription: saved });
  } catch (err) {
    console.error('Error subscribing to push:', err);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const body = await request.json();
    const { endpoint } = body;
    if (!endpoint) {
      return NextResponse.json({ error: 'Falta el endpoint para desuscribir.' }, { status: 400 });
    }

    const success = await repository.pushSubscriptions.deleteByEndpoint(user.id, endpoint);
    return NextResponse.json({ success });
  } catch (err) {
    console.error('Error unsubscribing from push:', err);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
