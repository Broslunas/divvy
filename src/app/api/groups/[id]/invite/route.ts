import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { repository } from '@/lib/repository';
import { notifyUser } from '@/lib/push';
import { sendGroupInvitationEmail } from '@/lib/mail';

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
    const body = await request.json();
    const { email } = body;

    if (!email || !email.trim()) {
      return NextResponse.json({ error: 'El correo electrónico es obligatorio.' }, { status: 400 });
    }

    const group = await repository.groups.getById(groupId);
    if (!group) {
      return NextResponse.json({ error: 'Grupo no encontrado.' }, { status: 404 });
    }

    // Verify current user is creator
    const creatorId = group.creatorId || group.members[0];
    if (user.id !== creatorId) {
      return NextResponse.json({ error: 'Solo el creador del grupo puede enviar invitaciones por correo.' }, { status: 403 });
    }

    const targetEmail = email.trim().toLowerCase();
    const targetUser = await repository.users.getByEmail(targetEmail);

    if (targetUser && group.members.includes(targetUser.id)) {
      return NextResponse.json({ error: 'Este usuario ya es miembro del grupo.' }, { status: 400 });
    }

    // Send email invitation asynchronously in background
    (async () => {
      try {
        const targetName = targetUser ? targetUser.username : 'Invitado';
        
        // Send email
        await sendGroupInvitationEmail(
          targetEmail,
          targetName,
          group.name,
          user.username,
          group.inviteCode
        );

        // If registered user, send push & in-app notification
        if (targetUser) {
          await notifyUser(targetUser.id, {
            title: `Invitación al grupo "${group.name}"`,
            message: `"${user.username}" te ha invitado a unirte a su grupo.`,
            link: `/join/${group.inviteCode}`,
            type: 'system'
          });
        }
      } catch (err) {
        console.error('Error sending background group invitation:', err);
      }
    })();

    return NextResponse.json({ success: true, message: 'Invitación enviada correctamente.' });
  } catch (e) {
    console.error('Error in group invite route:', e);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
