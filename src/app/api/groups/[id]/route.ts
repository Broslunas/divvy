import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { repository } from '@/lib/repository';

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

    return NextResponse.json(updatedGroup);
  } catch (e) {
    console.error('Error updating group:', e);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
