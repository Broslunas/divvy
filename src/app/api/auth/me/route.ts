import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'No autorizado.' },
        { status: 401 }
      );
    }
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...userWithoutPassword } = user;
    return NextResponse.json(userWithoutPassword);
  } catch (e) {
    console.error('Error in auth/me route:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'No autorizado.' },
        { status: 401 }
      );
    }

    const { username, email, avatarColor, password, notificationsEnabled } = await request.json();
    
    const updates: Partial<import('@/types').User> = {};
    if (username !== undefined) updates.username = username;
    if (email !== undefined) updates.email = email;
    if (avatarColor !== undefined) updates.avatarColor = avatarColor;
    if (notificationsEnabled !== undefined) updates.notificationsEnabled = notificationsEnabled;
    
    if (password) {
      const { hashPassword } = await import('@/lib/auth');
      updates.passwordHash = await hashPassword(password);
    }
    
    if (updates.email && updates.email !== user.email) {
      const { repository } = await import('@/lib/repository');
      const existingUser = await repository.users.getByEmail(updates.email);
      if (existingUser && existingUser.id !== user.id) {
        return NextResponse.json(
          { error: 'El correo electrónico ya está registrado por otro usuario.' },
          { status: 400 }
        );
      }
    }

    const { repository } = await import('@/lib/repository');



    const updatedUser = await repository.users.update(user.id, updates);
    if (!updatedUser) {
      return NextResponse.json(
        { error: 'No se pudo actualizar el usuario.' },
        { status: 404 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...userWithoutPassword } = updatedUser;
    return NextResponse.json(userWithoutPassword);
  } catch (e) {
    console.error('Error in PUT auth/me route:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}
