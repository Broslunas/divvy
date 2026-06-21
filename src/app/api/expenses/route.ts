import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { repository } from '@/lib/repository';
import { notifyUser } from '@/lib/push';
import { sendNewExpenseEmail, sendSettlementReceivedEmail, sendSettlementSentEmail, sendExpenseUpdatedEmail, sendExpenseDeletedEmail } from '@/lib/mail';
import type { SplitType, ItemizedBillItem, MultiPayer } from '@/types';

interface RawItem {
  name?: unknown;
  amount?: unknown;
  userIds?: unknown;
  splitType?: unknown;
  splitValues?: unknown;
}

interface RawMultiPayer {
  userId?: unknown;
  amount?: unknown;
}

interface RawPayload {
  groupId?: unknown;
  title?: unknown;
  amount?: unknown;
  date?: unknown;
  category?: unknown;
  paidById?: unknown;
  multiPayers?: unknown;
  splitType?: unknown;
  splits?: unknown;
  isSettlement?: unknown;
  notes?: unknown;
  tags?: unknown;
  paymentMethod?: unknown;
  items?: unknown;
}

// POST /api/expenses - Create new expense
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const body = (await request.json()) as RawPayload;
    const {
      groupId, title, amount, date, category, paidById,
      multiPayers, splitType, splits, isSettlement,
      notes, tags, paymentMethod, items,
    } = body;

    if (!groupId || !title || amount === undefined || !date || !category || !paidById || !splitType || !splits) {
      return NextResponse.json({ error: 'Faltan campos obligatorios.' }, { status: 400 });
    }

    // Verify group access
    const group = await repository.groups.getById(String(groupId));
    if (!group) {
      return NextResponse.json({ error: 'Grupo no encontrado.' }, { status: 404 });
    }

    if (!group.members.includes(user.id)) {
      return NextResponse.json({ error: 'No tienes acceso a este grupo.' }, { status: 403 });
    }

    // Normalise optional fields so the persisted document always has well-defined values.
    const normalisedItems: ItemizedBillItem[] | undefined = Array.isArray(items)
      ? (items as RawItem[])
          .filter((it): it is RawItem => !!it && typeof it === 'object')
          .map((it) => ({
            name: String(it.name || ''),
            amount: Number(it.amount) || 0,
            userIds: Array.isArray(it.userIds) ? it.userIds.map(String) : [],
            splitType: (typeof it.splitType === 'string' ? it.splitType : 'equal') as SplitType,
            splitValues: it.splitValues && typeof it.splitValues === 'object'
              ? Object.fromEntries(Object.entries(it.splitValues as Record<string, unknown>).map(([k, v]) => [k, String(v)]))
              : undefined,
          }))
          .filter((it) => it.name.length > 0 && it.amount > 0)
      : undefined;

    const normalisedMultiPayers: MultiPayer[] | undefined = Array.isArray(multiPayers)
      ? (multiPayers as RawMultiPayer[])
          .filter((p): p is RawMultiPayer => !!p && typeof p === 'object')
          .map((p) => ({ userId: String(p.userId), amount: Number(p.amount) || 0 }))
          .filter((p) => p.amount > 0)
      : undefined;

    const normalisedTags: string[] | undefined = Array.isArray(tags)
      ? (tags as unknown[]).map((t) => String(t).trim()).filter(Boolean)
      : undefined;

    // Create expense
    const expense = await repository.expenses.create({
      groupId: String(groupId),
      title: String(title),
      amount: parseFloat(String(amount)),
      date: new Date(String(date)).toISOString(),
      category: String(category),
      paidById: String(paidById),
      multiPayers: normalisedMultiPayers && normalisedMultiPayers.length > 0 ? normalisedMultiPayers : undefined,
      splitType: splitType as SplitType,
      splits: splits as Parameters<typeof repository.expenses.create>[0]['splits'],
      isSettlement: !!isSettlement,
      notes: notes ? String(notes) : undefined,
      tags: normalisedTags && normalisedTags.length > 0 ? normalisedTags : undefined,
      paymentMethod: paymentMethod ? String(paymentMethod) : undefined,
      items: normalisedItems && normalisedItems.length > 0 ? normalisedItems : undefined,
    });

    // Notify group members asynchronously in background (Push, In-App and Email)
    (async () => {
      try {
        const creatorName = user.username;
        if (expense.isSettlement) {
          // It's a settlement. The receiver should be notified.
          const receiverId = Array.isArray(splits) ? (splits as any[])[0]?.userId : undefined;
          
          if (receiverId) {
            const receiver = await repository.users.getById(receiverId);

            // Send push/web and email to receiver (creditor)
            if (receiver && receiver.id !== user.id) {
              await notifyUser(receiverId, {
                title: `Pago recibido en "${group.name}"`,
                message: `"${creatorName}" ha registrado un pago de ${expense.amount.toFixed(2)}€ para saldar su deuda.`,
                link: `/group/${group.id}`,
                type: 'settlement'
              });

              // Send email to creditor
              await sendSettlementReceivedEmail(
                receiver.email,
                receiver.username,
                group.name,
                creatorName,
                expense.amount,
                group.id
              );
            }

            // Send email confirmation to sender (debtor)
            await sendSettlementSentEmail(
              user.email,
              user.username,
              group.name,
              receiver ? receiver.username : 'un miembro del grupo',
              expense.amount,
              group.id
            );
          }
        } else {
          // Standard expense. Notify all group members except the payer.
          const payerId = expense.paidById;
          for (const memberId of group.members) {
            if (memberId !== payerId) {
              const member = await repository.users.getById(memberId);
              
              if (member) {
                // Send push/web notification
                await notifyUser(memberId, {
                  title: `Nuevo gasto en "${group.name}"`,
                  message: `"${creatorName}" ha añadido "${expense.title}" por ${expense.amount.toFixed(2)}€.`,
                  link: `/group/${group.id}`,
                  type: 'expense'
                });

                // Send email
                await sendNewExpenseEmail(
                  member.email,
                  member.username,
                  group.name,
                  creatorName,
                  expense.title,
                  expense.amount,
                  group.id
                );
              }
            }
          }
        }
      } catch (err) {
        console.error('Error sending background notifications for new expense:', err);
      }
    })();

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

    // Notify group members asynchronously in background
    (async () => {
      try {
        const deleterName = user.username;
        for (const memberId of group.members) {
          if (memberId !== user.id) {
            const member = await repository.users.getById(memberId);
            if (member) {
              await notifyUser(memberId, {
                title: `Gasto eliminado en "${group.name}"`,
                message: `"${deleterName}" ha eliminado el gasto "${expense.title}" por ${expense.amount.toFixed(2)}€.`,
                link: `/group/${group.id}`,
                type: 'expense'
              });

              await sendExpenseDeletedEmail(
                member.email,
                member.username,
                group.name,
                deleterName,
                expense.title,
                expense.amount,
                group.id
              );
            }
          }
        }
      } catch (err) {
        console.error('Error sending background notifications for deleted expense:', err);
      }
    })();

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

    // Notify group members asynchronously in background
    (async () => {
      try {
        const editorName = user.username;
        for (const memberId of group.members) {
          if (memberId !== user.id) {
            const member = await repository.users.getById(memberId);
            if (member) {
              await notifyUser(memberId, {
                title: `Gasto modificado en "${group.name}"`,
                message: `"${editorName}" ha modificado el gasto "${expense.title}".`,
                link: `/group/${group.id}`,
                type: 'expense'
              });

              await sendExpenseUpdatedEmail(
                member.email,
                member.username,
                group.name,
                editorName,
                expense.title,
                updatedExpense.title,
                updatedExpense.amount,
                group.id
              );
            }
          }
        }
      } catch (err) {
        console.error('Error sending background notifications for updated expense:', err);
      }
    })();

    return NextResponse.json(updatedExpense);
  } catch (e) {
    console.error('Error updating expense:', e);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
