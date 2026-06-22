import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { repository } from '@/lib/repository';
import { sendGroupDeletionVerificationEmail } from '@/lib/mail';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'divvy-fallback-secret-key-12345';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const { id: groupId } = await params;

    // Fetch group
    const group = await repository.groups.getById(groupId);
    if (!group) {
      return NextResponse.json({ error: 'Grupo no encontrado.' }, { status: 404 });
    }

    // Verify membership
    if (!group.members.includes(user.id)) {
      return NextResponse.json({ error: 'No tienes acceso a este grupo.' }, { status: 403 });
    }

    // Generate JWT token for verification
    const token = jwt.sign(
      {
        groupId: group.id,
        userId: user.id,
        action: 'delete-group'
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Get origin dynamically from request headers
    const origin = request.headers.get('origin') || new URL(request.url).origin;
    const actionUrl = `${origin}/group/delete/confirm?token=${token}`;

    // Send verification email
    const emailSent = await sendGroupDeletionVerificationEmail(
      user.email,
      user.username,
      group.name,
      actionUrl
    );

    if (!emailSent) {
      console.log(`[DEVELOPMENT ONLY] Click to verify group deletion: ${actionUrl}`);
      const isDev = process.env.NODE_ENV === 'development' || !process.env.MJ_APIKEY_PUBLIC;
      return NextResponse.json({
        success: true,
        message: 'Solicitud procesada (enlace generado).',
        ...(isDev ? { devLink: actionUrl } : {})
      });
    }

    return NextResponse.json({ success: true, message: 'Correo de verificación enviado.' });
  } catch (e) {
    console.error('Error requesting group deletion:', e);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
