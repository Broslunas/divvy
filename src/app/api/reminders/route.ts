import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { repository } from '@/lib/repository';
import { notifyUser } from '@/lib/push';
import { sendReminderEmail } from '@/lib/mail';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');

    let groups: { id: string; name: string; members: string[] }[] = [];

    if (groupId) {
      const group = await repository.groups.getById(groupId);
      if (!group) {
        return NextResponse.json({ error: 'Grupo no encontrado.' }, { status: 404 });
      }
      if (!group.members.includes(user.id)) {
        return NextResponse.json({ error: 'No tienes acceso a este grupo.' }, { status: 403 });
      }
      groups = [group];
    } else {
      const userGroups = await repository.groups.getUserGroups(user.id);
      groups = userGroups;
    }

    const now = new Date();
    let totalRemindersSent = 0;
    const results: { groupId: string; expenseId: string; userId: string; sent: boolean }[] = [];

    for (const group of groups) {
      const expenses = await repository.expenses.getByGroupId(group.id);

      for (const expense of expenses) {
        if (expense.isSettlement) continue;

        const expenseDate = new Date(expense.date);
        const daysSinceExpense = Math.floor((now.getTime() - expenseDate.getTime()) / (1000 * 60 * 60 * 24));

        // Only remind for expenses older than 3 days
        if (daysSinceExpense < 3) continue;

        for (const split of expense.splits) {
          if (split.isPaid) continue;

          const isPayer = expense.multiPayers && expense.multiPayers.length > 0
            ? expense.multiPayers.some(p => p.userId === split.userId)
            : split.userId === expense.paidById;

          if (isPayer) continue;

          // Check if a reminder was already sent in the last 7 days
          if (split.lastReminderSentAt) {
            const lastReminder = new Date(split.lastReminderSentAt);
            const daysSinceReminder = Math.floor((now.getTime() - lastReminder.getTime()) / (1000 * 60 * 60 * 24));
            if (daysSinceReminder < 7) continue;
          }

          const debtor = await repository.users.getById(split.userId);
          if (!debtor) continue;

          const splitAmount = calculateSplitAmount(expense, split.userId, group.members);

          // Send in-app notification + push
          await notifyUser(split.userId, {
            title: `⏳ Recordatorio de pago en "${group.name}"`,
            message: `Tienes un pago pendiente de ${splitAmount.toFixed(2)}€ por "${expense.title}" (${daysSinceExpense} días).`,
            link: `/group/${group.id}/${expense.id}`,
            type: 'reminder',
          });

          // Send email
          await sendReminderEmail(
            debtor.email,
            debtor.username,
            group.name,
            expense.title,
            splitAmount,
            daysSinceExpense,
            group.id,
          );

          // Update lastReminderSentAt on the split
          const updatedSplits = expense.splits.map(s =>
            s.userId === split.userId ? { ...s, lastReminderSentAt: now.toISOString() } : s
          );
          await repository.expenses.update(expense.id, { splits: updatedSplits });

          totalRemindersSent++;
          results.push({ groupId: group.id, expenseId: expense.id, userId: split.userId, sent: true });
        }
      }
    }

    return NextResponse.json({
      sent: totalRemindersSent,
      details: results,
    });
  } catch (e) {
    console.error('Error sending reminders:', e);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

function calculateSplitAmount(
  expense: { amount: number; splitType: string; splits: { userId: string; value: number }[] },
  splitUserId: string,
  groupMembers: string[]
): number {
  const { amount, splitType, splits } = expense;

  if (splitType === 'equal') {
    const participants = splits && splits.length > 0 ? splits.map(s => s.userId) : groupMembers;
    const validParticipants = participants.filter(p => groupMembers.includes(p));
    return amount / (validParticipants.length || 1);
  }

  const split = splits ? splits.find(s => s.userId === splitUserId) : null;
  if (!split) return 0;

  if (splitType === 'exact' || splitType === 'itemized') {
    return split.value;
  }

  if (splitType === 'percentage') {
    return (split.value / 100) * amount;
  }

  if (splitType === 'shares') {
    const totalShares = splits.reduce((sum, s) => sum + s.value, 0);
    if (totalShares <= 0) return 0;
    return (split.value / totalShares) * amount;
  }

  return 0;
}
