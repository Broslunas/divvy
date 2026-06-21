import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { repository } from '@/lib/repository';

// GET /api/groups - List groups for current user
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const groups = await repository.groups.getUserGroups(user.id);
    return NextResponse.json(groups);
  } catch (e) {
    console.error('Error fetching user groups:', e);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

// POST /api/groups - Create a new group
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const { name, description } = await request.json();
    if (!name) {
      return NextResponse.json({ error: 'El nombre del grupo es obligatorio.' }, { status: 400 });
    }

    const group = await repository.groups.create({
      name,
      description,
      members: [user.id] // Owner is the first member
    });

    return NextResponse.json(group, { status: 201 });
  } catch (e) {
    console.error('Error creating group:', e);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
