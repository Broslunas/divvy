import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { repository } from '@/lib/repository';
import { hashPassword, signToken } from '@/lib/auth';

const AVATAR_COLORS = [
  '#C87A53', // Terracotta
  '#4A5D4E', // Sage/Olive
  '#6B8E23', // OliveDrab
  '#4682B4', // SteelBlue
  '#8A2BE2', // BlueViolet
  '#D2691E', // Chocolate
  '#5F9EA0', // CadetBlue
];

export async function POST(request: Request) {
  try {
    const { username, email, password } = await request.json();

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: 'Todos los campos son obligatorios.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres.' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await repository.users.getByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'El correo electrónico ya está registrado.' },
        { status: 400 }
      );
    }

    // Hash password & select random color
    const passwordHash = await hashPassword(password);
    const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

    // Create user
    const user = await repository.users.create({
      username,
      email,
      passwordHash,
      avatarColor,
    });

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

    // Remove password hash from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...userWithoutPassword } = user;

    return NextResponse.json(userWithoutPassword, { status: 201 });
  } catch (e) {
    console.error('Error in register route:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}
