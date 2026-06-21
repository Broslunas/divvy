import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { repository } from '@/lib/repository';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const { inviteCode } = await request.json();
    if (!inviteCode) {
      return NextResponse.json({ error: 'El código de invitación es obligatorio.' }, { status: 400 });
    }

    // Find group by invite code
    const group = await repository.groups.getByInviteCode(inviteCode.trim());
    if (!group) {
      return NextResponse.json({ error: 'Código de invitación inválido o grupo no encontrado.' }, { status: 404 });
    }

    // Add user to group
    const updatedGroup = await repository.groups.addUserToGroup(group.id, user.id);
    if (!updatedGroup) {
      return NextResponse.json({ error: 'No se pudo unir al grupo.' }, { status: 500 });
    }

    return NextResponse.json(updatedGroup);
  } catch (e) {
    console.error('Error joining group:', e);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const inviteCode = searchParams.get('code');
    if (!inviteCode) {
      return NextResponse.json({ error: 'El código de invitación es obligatorio.' }, { status: 400 });
    }

    const group = await repository.groups.getByInviteCode(inviteCode.trim());
    if (!group) {
      return NextResponse.json({ error: 'Código de invitación inválido o grupo no encontrado.' }, { status: 404 });
    }

    return NextResponse.json({
      id: group.id,
      name: group.name,
      description: group.description,
      membersCount: group.members.length,
      isAlreadyMember: group.members.includes(user.id)
    });
  } catch (e) {
    console.error('Error fetching invite details:', e);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
