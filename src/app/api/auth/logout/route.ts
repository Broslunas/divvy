import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('auth_token');
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Error in logout route:', e);
    return NextResponse.json(
      { error: 'Error al cerrar sesión.' },
      { status: 500 }
    );
  }
}
