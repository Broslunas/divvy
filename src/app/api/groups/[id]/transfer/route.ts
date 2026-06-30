import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { repository } from '@/lib/repository';
import { notifyUser } from '@/lib/push';
import { sendOwnershipTransferredEmail } from '@/lib/mail';

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
    const { newOwnerId } = body;

    if (!newOwnerId) {
      return NextResponse.json({ error: 'El ID del nuevo creador es obligatorio.' }, { status: 400 });
    }

    const group = await repository.groups.getById(groupId);
    if (!group) {
      return NextResponse.json({ error: 'Grupo no encontrado.' }, { status: 404 });
    }

    // Verify current user is creator
    const creatorId = group.creatorId || group.members[0];
    if (user.id !== creatorId) {
      return NextResponse.json({ error: 'Solo el creador del grupo puede transferir la propiedad.' }, { status: 403 });
    }

    if (newOwnerId === creatorId) {
      return NextResponse.json({ error: 'Ya eres el creador de este grupo.' }, { status: 400 });
    }

    if (!group.members.includes(newOwnerId)) {
      return NextResponse.json({ error: 'El nuevo creador debe ser miembro de este grupo.' }, { status: 400 });
    }

    const newOwner = await repository.users.getById(newOwnerId);
    if (!newOwner) {
      return NextResponse.json({ error: 'Nuevo creador no encontrado.' }, { status: 404 });
    }

    // Update group creator
    const updatedGroup = await repository.groups.update(groupId, { creatorId: newOwnerId });
    if (!updatedGroup) {
      return NextResponse.json({ error: 'No se pudo transferir la propiedad del grupo.' }, { status: 500 });
    }

    // Send notifications asynchronously in background
    (async () => {
      try {
        // Notify all members of the change
        for (const mId of updatedGroup.members) {
          const member = await repository.users.getById(mId);
          if (member) {
            const isNewOwner = mId === newOwnerId;
            const messageText = isNewOwner
              ? `"${user.username}" te ha nombrado creador del grupo "${group.name}".`
              : `"${newOwner.username}" es ahora el creador del grupo "${group.name}".`;

            await notifyUser(mId, {
              title: isNewOwner ? 'Eres el nuevo creador' : 'Cambio de creador',
              message: messageText,
              link: `/group/${group.id}`,
              type: 'system'
            });

            await sendOwnershipTransferredEmail(
              member.email,
              member.username,
              group.name,
              user.username,
              newOwner.username,
              group.id
            );
          }
        }
      } catch (err) {
        console.error('Error sending background ownership transfer notifications:', err);
      }
    })();

    return NextResponse.json(updatedGroup);
  } catch (e) {
    console.error('Error in ownership transfer route:', e);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
