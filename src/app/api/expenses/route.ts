import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { repository } from '@/lib/repository';
import { notifyUser } from '@/lib/push';
import { sendNewExpenseEmail, sendSettlementReceivedEmail, sendSettlementSentEmail, sendExpenseUpdatedEmail, sendExpenseDeletedEmail, sendSplitPaidNotificationEmail, sendSplitPendingNotificationEmail } from '@/lib/mail';
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
  id?: unknown;
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
  ticketUploaded?: unknown;
}

function calculateSplitAmount(expense: any, splitUserId: string, groupMembers: string[]): number {
  const { amount, splitType, splits } = expense;
  
  if (splitType === 'equal') {
    const participants = splits && splits.length > 0 ? splits.map((s: any) => s.userId) : groupMembers;
    const validParticipants = participants.filter((p: string) => groupMembers.includes(p));
    return amount / (validParticipants.length || 1);
  }
  
  const split = splits ? splits.find((s: any) => s.userId === splitUserId) : null;
  if (!split) return 0;

  if (splitType === 'exact' || splitType === 'itemized') {
    return split.value;
  }
  
  if (splitType === 'percentage') {
    return (split.value / 100) * amount;
  }
  
  if (splitType === 'shares') {
    const totalShares = splits.reduce((sum: number, s: any) => sum + s.value, 0);
    if (totalShares <= 0) return 0;
    return (split.value / totalShares) * amount;
  }

  return 0;
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
      notes, tags, paymentMethod, items, ticketUploaded,
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
      ticketUploaded: !!ticketUploaded,
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

// PUT /api/expenses - Update an expense (full edit or partial update)
export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const body = (await request.json()) as RawPayload;
    const { id: rawId, ...updates } = body;

    if (!rawId) {
      return NextResponse.json({ error: 'Se requiere el ID del gasto.' }, { status: 400 });
    }
    const id = String(rawId);

    // Get expense details to verify group membership
    const expense = await repository.expenses.getById(id);
    if (!expense) {
      return NextResponse.json({ error: 'Gasto no encontrado.' }, { status: 404 });
    }

    const group = await repository.groups.getById(expense.groupId);
    if (!group || !group.members.includes(user.id)) {
      return NextResponse.json({ error: 'No tienes permiso para modificar este gasto.' }, { status: 403 });
    }

    // Check if this is a full update (has 'title' field) vs partial (splits, ticketUploaded)
    const isFullUpdate = updates.title !== undefined;

    if (isFullUpdate) {
      // Validate required fields
      const { title, amount, date, category, paidById, splitType, splits } = updates as unknown as RawPayload;
      if (!title || amount === undefined || !date || !category || !paidById || !splitType || !splits) {
        return NextResponse.json({ error: 'Faltan campos obligatorios.' }, { status: 400 });
      }

      // Normalise fields the same way as POST
      const normalisedItems: ItemizedBillItem[] | undefined = Array.isArray(updates.items)
        ? (updates.items as RawItem[])
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

      const normalisedMultiPayers: MultiPayer[] | undefined = Array.isArray(updates.multiPayers)
        ? (updates.multiPayers as RawMultiPayer[])
            .filter((p): p is RawMultiPayer => !!p && typeof p === 'object')
            .map((p) => ({ userId: String(p.userId), amount: Number(p.amount) || 0 }))
            .filter((p) => p.amount > 0)
        : undefined;

      const normalisedTags: string[] | undefined = Array.isArray(updates.tags)
        ? (updates.tags as unknown[]).map((t) => String(t).trim()).filter(Boolean)
        : undefined;

      // Assign normalised fields
      (updates as any).title = String(title);
      (updates as any).amount = parseFloat(String(amount));
      (updates as any).date = new Date(String(date)).toISOString();
      (updates as any).category = String(category);
      (updates as any).paidById = String(paidById);
      (updates as any).multiPayers = normalisedMultiPayers && normalisedMultiPayers.length > 0 ? normalisedMultiPayers : undefined;
      (updates as any).splitType = splitType as SplitType;
      (updates as any).isSettlement = !!updates.isSettlement;
      (updates as any).notes = updates.notes ? String(updates.notes) : undefined;
      (updates as any).tags = normalisedTags && normalisedTags.length > 0 ? normalisedTags : undefined;
      (updates as any).paymentMethod = updates.paymentMethod ? String(updates.paymentMethod) : undefined;
      (updates as any).items = normalisedItems && normalisedItems.length > 0 ? normalisedItems : undefined;
      (updates as any).ticketUploaded = !!updates.ticketUploaded;
      (updates as any).splits = splits;
    }

    const updatedExpense = await repository.expenses.update(id, updates as Record<string, unknown>);
    if (!updatedExpense) {
      return NextResponse.json({ error: 'No se pudo actualizar el gasto.' }, { status: 500 });
    }

    // Notify group members asynchronously in background
    (async () => {
      try {
        const editorName = user.username;
        const isGeneralUpdate = updates.title !== undefined || updates.amount !== undefined || updates.category !== undefined || updates.date !== undefined;

        if (isGeneralUpdate) {
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
        } else if (updates.splits && Array.isArray(updates.splits) && expense.splits && Array.isArray(expense.splits)) {
          for (const newSplit of updates.splits) {
            const oldSplit = expense.splits.find((s: any) => s.userId === newSplit.userId);
            if (oldSplit && oldSplit.isPaid !== newSplit.isPaid) {
              const splitUserId = newSplit.userId;
              const isPaidNow = !!newSplit.isPaid;
              const splitAmount = calculateSplitAmount(expense, splitUserId, group.members);
              const isPayerActor = user.id === expense.paidById;

              if (isPaidNow) {
                if (isPayerActor) {
                  const debtor = await repository.users.getById(splitUserId);
                  if (debtor && debtor.id !== user.id) {
                    await notifyUser(splitUserId, {
                      title: `Pago confirmado para "${expense.title}"`,
                      message: `"${editorName}" ha confirmado que has pagado tu cuota de ${splitAmount.toFixed(2)}€.`,
                      link: `/group/${group.id}`,
                      type: 'settlement'
                    });

                    await sendSplitPaidNotificationEmail(
                      debtor.email,
                      debtor.username,
                      group.name,
                      editorName,
                      expense.title,
                      splitAmount,
                      group.id,
                      true
                    );
                  }
                } else {
                  const payer = await repository.users.getById(expense.paidById);
                  if (payer && payer.id !== user.id) {
                    await notifyUser(expense.paidById, {
                      title: `Cuota marcada como pagada para "${expense.title}"`,
                      message: `"${editorName}" ha marcado como pagada su cuota de ${splitAmount.toFixed(2)}€.`,
                      link: `/group/${group.id}`,
                      type: 'settlement'
                    });

                    await sendSplitPaidNotificationEmail(
                      payer.email,
                      payer.username,
                      group.name,
                      editorName,
                      expense.title,
                      splitAmount,
                      group.id,
                      false
                    );
                  }
                }
              } else {
                if (isPayerActor) {
                  const debtor = await repository.users.getById(splitUserId);
                  if (debtor && debtor.id !== user.id) {
                    await notifyUser(splitUserId, {
                      title: `Cuota marcada como pendiente para "${expense.title}"`,
                      message: `"${editorName}" ha marcado como pendiente tu cuota de ${splitAmount.toFixed(2)}€.`,
                      link: `/group/${group.id}`,
                      type: 'expense'
                    });

                    await sendSplitPendingNotificationEmail(
                      debtor.email,
                      debtor.username,
                      group.name,
                      editorName,
                      expense.title,
                      splitAmount,
                      group.id,
                      true
                    );
                  }
                } else {
                  const payer = await repository.users.getById(expense.paidById);
                  if (payer && payer.id !== user.id) {
                    await notifyUser(expense.paidById, {
                      title: `Cuota marcada como pendiente para "${expense.title}"`,
                      message: `"${editorName}" ha marcado como pendiente su cuota de ${splitAmount.toFixed(2)}€.`,
                      link: `/group/${group.id}`,
                      type: 'expense'
                    });

                    await sendSplitPendingNotificationEmail(
                      payer.email,
                      payer.username,
                      group.name,
                      editorName,
                      expense.title,
                      splitAmount,
                      group.id,
                      false
                    );
                  }
                }
              }
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
