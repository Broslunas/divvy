import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { repository } from '@/lib/repository';
import { notifyUser } from '@/lib/push';
import { sendGroupUpdatedEmail } from '@/lib/mail';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const { id } = await params;

    // Fetch group
    const group = await repository.groups.getById(id);
    if (!group) {
      return NextResponse.json({ error: 'Grupo no encontrado.' }, { status: 404 });
    }

    // Verify membership
    if (!group.members.includes(user.id)) {
      return NextResponse.json({ error: 'No tienes acceso a este grupo.' }, { status: 403 });
    }

    // Fetch members details (omit password hashes)
    const membersDetails = await Promise.all(
      group.members.map(async (memberId) => {
        const u = await repository.users.getById(memberId);
        if (!u) return null;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { passwordHash: _, ...safeUser } = u;
        return safeUser;
      })
    );

    const validMembers = membersDetails.filter(Boolean);

    // Fetch expenses
    const expenses = await repository.expenses.getByGroupId(group.id);

    return NextResponse.json({
      group,
      members: validMembers,
      expenses
    });
  } catch (e) {
    console.error('Error fetching group details:', e);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

// PUT /api/groups/[id] - Update group configurations (budget, notes, archivedBy, etc.)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const { id } = await params;
    const updates = await request.json();

    const group = await repository.groups.getById(id);
    if (!group) {
      return NextResponse.json({ error: 'Grupo no encontrado.' }, { status: 404 });
    }

    // Verify membership
    if (!group.members.includes(user.id)) {
      return NextResponse.json({ error: 'No tienes acceso a este grupo.' }, { status: 403 });
    }

    const updatedGroup = await repository.groups.update(id, updates);
    if (!updatedGroup) {
      return NextResponse.json({ error: 'No se pudo actualizar el grupo.' }, { status: 500 });
    }

    // Notify other group members asynchronously in background
    (async () => {
      try {
        const detailsList: string[] = [];
        if (updates.name && updates.name !== group.name) {
          detailsList.push(`Nombre cambiado a "${updates.name}"`);
        }
        if (updates.description !== undefined && updates.description !== group.description) {
          detailsList.push('Descripción modificada');
        }
        if (updates.budget !== undefined && updates.budget !== group.budget) {
          detailsList.push(`Presupuesto modificado a ${updates.budget ? updates.budget + '€' : 'sin límite'}`);
        }
        if (updates.targetDate !== undefined && updates.targetDate !== group.targetDate) {
          if (updates.targetDate) {
            const formatted = new Date(updates.targetDate).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
            detailsList.push(`Fecha del evento cambiada a ${formatted}`);
          } else {
            detailsList.push('Fecha del evento eliminada');
          }
        }

        if (detailsList.length > 0) {
          const editorName = user.username;
          for (const memberId of group.members) {
            if (memberId !== user.id) {
              const member = await repository.users.getById(memberId);
              if (member) {
                await notifyUser(memberId, {
                  title: `Ajustes actualizados en "${group.name}"`,
                  message: `"${editorName}" ha actualizado la configuración del grupo.`,
                  link: `/group/${group.id}`,
                  type: 'system'
                });

                await sendGroupUpdatedEmail(
                  member.email,
                  member.username,
                  group.name,
                  editorName,
                  group.id,
                  detailsList
                );
              }
            }
          }
        }
      } catch (err) {
        console.error('Error sending background notifications for updated group:', err);
      }
    })();

    return NextResponse.json(updatedGroup);
  } catch (e) {
    console.error('Error updating group:', e);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
