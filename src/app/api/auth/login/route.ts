import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { repository } from '@/lib/repository';
import { comparePassword, signToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son obligatorios.' },
        { status: 400 }
      );
    }

    // Find user
    const user = await repository.users.getByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: 'Credenciales inválidas.' },
        { status: 400 }
      );
    }

    // Verify password
    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: 'Credenciales inválidas.' },
        { status: 400 }
      );
    }

    // Sign JWT and set cookie
    const token = signToken({ userId: user.id });
    const cookieStore = await cookies();
    cookieStore.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
      // COOKIE_DOMAIN enables sharing with album.divvy.es in production
      ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
    });

    // Remove password hash
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...userWithoutPassword } = user;

    return NextResponse.json(userWithoutPassword);
  } catch (e) {
    console.error('Error in login route:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}
