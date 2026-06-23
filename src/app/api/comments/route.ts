import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { repository } from '@/lib/repository';

// GET /api/comments?expenseId=ID
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const expenseId = searchParams.get('expenseId');

    if (!expenseId) {
      return NextResponse.json({ error: 'Se requiere el ID del gasto.' }, { status: 400 });
    }

    const expense = await repository.expenses.getById(expenseId);
    if (!expense) {
      return NextResponse.json({ error: 'Gasto no encontrado.' }, { status: 404 });
    }

    const group = await repository.groups.getById(expense.groupId);
    if (!group || !group.members.includes(user.id)) {
      return NextResponse.json({ error: 'No tienes acceso a este grupo.' }, { status: 403 });
    }

    const comments = await repository.comments.getByExpenseId(expenseId);
    return NextResponse.json(comments);
  } catch (e) {
    console.error('Error fetching comments:', e);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

// POST /api/comments
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const body = await request.json();
    const { expenseId, groupId, text, imageUrl } = body;

    if (!expenseId || !groupId || !text?.trim()) {
      return NextResponse.json({ error: 'Faltan campos obligatorios.' }, { status: 400 });
    }

    const expense = await repository.expenses.getById(expenseId);
    if (!expense) {
      return NextResponse.json({ error: 'Gasto no encontrado.' }, { status: 404 });
    }

    const group = await repository.groups.getById(groupId);
    if (!group || !group.members.includes(user.id)) {
      return NextResponse.json({ error: 'No tienes acceso a este grupo.' }, { status: 403 });
    }

    const comment = await repository.comments.create({
      expenseId,
      groupId,
      userId: user.id,
      username: user.username,
      avatarColor: user.avatarColor,
      text: text.trim(),
      imageUrl: imageUrl || undefined,
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (e) {
    console.error('Error creating comment:', e);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
