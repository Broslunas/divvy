import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { repository } from '@/lib/repository';
import { notifyUser } from '@/lib/push';
import { sendKickedEmail, sendMemberKickedEmail } from '@/lib/mail';

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
    const { memberId } = body;

    if (!memberId) {
      return NextResponse.json({ error: 'El ID del miembro es obligatorio.' }, { status: 400 });
    }

    const group = await repository.groups.getById(groupId);
    if (!group) {
      return NextResponse.json({ error: 'Grupo no encontrado.' }, { status: 404 });
    }

    // Verify current user is creator
    const creatorId = group.creatorId || group.members[0];
    if (user.id !== creatorId) {
      return NextResponse.json({ error: 'Solo el creador del grupo puede expulsar miembros.' }, { status: 403 });
    }

    if (memberId === creatorId) {
      return NextResponse.json({ error: 'El creador del grupo no puede expulsarse a sí mismo.' }, { status: 400 });
    }

    if (!group.members.includes(memberId)) {
      return NextResponse.json({ error: 'El usuario no es miembro de este grupo.' }, { status: 400 });
    }

    const kickedUser = await repository.users.getById(memberId);
    if (!kickedUser) {
      return NextResponse.json({ error: 'Miembro no encontrado.' }, { status: 404 });
    }

    // Remove user from group
    const updatedGroup = await repository.groups.removeUserFromGroup(groupId, memberId);
    if (!updatedGroup) {
      return NextResponse.json({ error: 'No se pudo expulsar al miembro del grupo.' }, { status: 500 });
    }

    // Send notifications asynchronously in background
    (async () => {
      try {
        // 1. Notify the kicked user
        await notifyUser(memberId, {
          title: `Eliminado del grupo "${group.name}"`,
          message: `Has sido eliminado del grupo por el creador.`,
          link: '/app',
          type: 'system'
        });

        await sendKickedEmail(
          kickedUser.email,
          kickedUser.username,
          group.name,
          user.username
        );

        // 2. Notify other remaining members
        for (const mId of updatedGroup.members) {
          if (mId !== user.id) {
            const member = await repository.users.getById(mId);
            if (member) {
              await notifyUser(mId, {
                title: `Miembro eliminado de "${group.name}"`,
                message: `"${kickedUser.username}" ha sido eliminado del grupo.`,
                link: `/group/${group.id}`,
                type: 'system'
              });

              await sendMemberKickedEmail(
                member.email,
                member.username,
                group.name,
                kickedUser.username,
                user.username,
                group.id
              );
            }
          }
        }
      } catch (err) {
        console.error('Error sending background kick notifications:', err);
      }
    })();

    return NextResponse.json(updatedGroup);
  } catch (e) {
    console.error('Error in group kick route:', e);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
