import { repository } from './repository';

export async function notifyGroupMembers(
  groupId: string,
  excludeUserId: string,
  payload: { title: string; body: string; tag?: string; url?: string; data?: Record<string, unknown> }
) {
  const group = await repository.groups.getById(groupId);
  if (!group) return;

  const memberIds = group.members.filter(id => id !== excludeUserId);
  if (memberIds.length === 0) return;

  // Notify members who have notifications enabled (not explicitly false)
  const membersToNotify = (
    await Promise.all(
      memberIds.map(async (uid) => {
        const user = await repository.users.getById(uid);
        return user?.notificationsEnabled !== false ? uid : null;
      })
    )
  ).filter(Boolean) as string[];

  if (membersToNotify.length === 0) return;

  // Determine notification type
  let type: 'expense_created' | 'expense_updated' | 'group_joined' | 'payment_confirmed' = 'expense_created';
  if (payload.tag?.startsWith('join-')) {
    type = 'group_joined';
  } else if (payload.tag?.startsWith('paid-')) {
    type = 'payment_confirmed';
  } else if (payload.tag?.startsWith('expense-')) {
    if (payload.title.includes('pago') || payload.title.includes('liquid')) {
      type = 'payment_confirmed';
    } else {
      type = 'expense_created';
    }
  }

  // Extract expenseId from tag if available
  let expenseId: string | undefined;
  if (payload.tag) {
    const parts = payload.tag.split('-');
    if (parts.length >= 2 && (parts[0] === 'expense' || parts[0] === 'paid')) {
      expenseId = parts[1];
    }
  }

  // Create database notification records
  const creations = membersToNotify.map(userId =>
    repository.notifications.create({
      userId,
      title: payload.title,
      body: payload.body,
      type,
      groupId,
      expenseId,
      isRead: false
    })
  );

  await Promise.allSettled(creations);
}
