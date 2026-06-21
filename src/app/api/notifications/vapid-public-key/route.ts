import { NextResponse } from 'next/server';
import { getVapidPublicKey } from '@/lib/notifications';

// GET /api/notifications/vapid-public-key - Get the VAPID public key for push subscriptions
export async function GET() {
  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    return NextResponse.json({ error: 'VAPID public key not configured.' }, { status: 500 });
  }
  return NextResponse.json({ publicKey });
}
