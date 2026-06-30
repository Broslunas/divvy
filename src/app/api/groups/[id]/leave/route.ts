import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { repository } from '@/lib/repository';
import { notifyUser } from '@/lib/push';
import { sendMemberLeftEmail } from '@/lib/mail';

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

    const group = await repository.groups.getById(groupId);
    if (!group) {
      return NextResponse.json({ error: 'Grupo no encontrado.' }, { status: 404 });
    }

    if (!group.members.includes(user.id)) {
      return NextResponse.json({ error: 'No eres miembro de este grupo.' }, { status: 400 });
    }

    const creatorId = group.creatorId || group.members[0];
    if (user.id === creatorId) {
      return NextResponse.json({ error: 'El creador no puede salir del grupo sin transferir la propiedad primero.' }, { status: 400 });
    }

    // Remove current user from group
    const updatedGroup = await repository.groups.removeUserFromGroup(groupId, user.id);
    if (!updatedGroup) {
      return NextResponse.json({ error: 'No se pudo salir del grupo.' }, { status: 500 });
    }

    // Send notifications asynchronously in background
    (async () => {
      try {
        // Notify remaining members
        for (const mId of updatedGroup.members) {
          const member = await repository.users.getById(mId);
          if (member) {
            await notifyUser(mId, {
              title: `Un miembro ha salido del grupo`,
              message: `"${user.username}" ha salido de "${group.name}".`,
              link: `/group/${group.id}`,
              type: 'system'
            });

            await sendMemberLeftEmail(
              member.email,
              member.username,
              group.name,
              user.username,
              group.id
            );
          }
        }
      } catch (err) {
        console.error('Error sending background leave notifications:', err);
      }
    })();

    return NextResponse.json({ success: true, message: 'Has salido del grupo correctamente.' });
  } catch (e) {
    console.error('Error in group leave route:', e);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
