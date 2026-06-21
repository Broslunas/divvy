import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { repository } from '@/lib/repository';

// POST /api/expenses - Create new expense
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const {
      groupId,
      title,
      amount,
      date,
      category,
      paidById,
      splitType,
      splits,
      isSettlement
    } = await request.json();

    if (!groupId || !title || amount === undefined || !date || !category || !paidById || !splitType || !splits) {
      return NextResponse.json({ error: 'Faltan campos obligatorios.' }, { status: 400 });
    }

    // Verify group access
    const group = await repository.groups.getById(groupId);
    if (!group) {
      return NextResponse.json({ error: 'Grupo no encontrado.' }, { status: 404 });
    }

    if (!group.members.includes(user.id)) {
      return NextResponse.json({ error: 'No tienes acceso a este grupo.' }, { status: 403 });
    }

    // Create expense
    const expense = await repository.expenses.create({
      groupId,
      title,
      amount: parseFloat(amount),
      date: new Date(date).toISOString(),
      category,
      paidById,
      splitType,
      splits,
      isSettlement: !!isSettlement
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (e) {
    console.error('Error creating expense:', e);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

// DELETE /api/expenses - Delete an expense
export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Se requiere el ID del gasto.' }, { status: 400 });
    }

    // Get expense details to verify group membership
    const expense = await repository.expenses.getById(id);
    if (!expense) {
      return NextResponse.json({ error: 'Gasto no encontrado.' }, { status: 404 });
    }

    const group = await repository.groups.getById(expense.groupId);
    if (!group || !group.members.includes(user.id)) {
      return NextResponse.json({ error: 'No tienes permiso para eliminar este gasto.' }, { status: 403 });
    }

    const success = await repository.expenses.delete(id);
    if (!success) {
      return NextResponse.json({ error: 'No se pudo eliminar el gasto.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Error deleting expense:', e);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

// PUT /api/expenses - Update an expense (e.g. toggle isPaid for a split)
export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const { id, ...updates } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Se requiere el ID del gasto.' }, { status: 400 });
    }

    // Get expense details to verify group membership
    const expense = await repository.expenses.getById(id);
    if (!expense) {
      return NextResponse.json({ error: 'Gasto no encontrado.' }, { status: 404 });
    }

    const group = await repository.groups.getById(expense.groupId);
    if (!group || !group.members.includes(user.id)) {
      return NextResponse.json({ error: 'No tienes permiso para modificar este gasto.' }, { status: 403 });
    }

    const updatedExpense = await repository.expenses.update(id, updates);
    if (!updatedExpense) {
      return NextResponse.json({ error: 'No se pudo actualizar el gasto.' }, { status: 500 });
    }

    return NextResponse.json(updatedExpense);
  } catch (e) {
    console.error('Error updating expense:', e);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
