import webpush from 'web-push';
import { repository } from './repository';
import type { PushSubscription } from '@/types';

let vapidInitialized = false;

function ensureVapid() {
  if (vapidInitialized) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:notifications@divvy.app',
    publicKey,
    privateKey
  );
  vapidInitialized = true;
}

export function getVapidPublicKey(): string {
  return process.env.VAPID_PUBLIC_KEY || '';
}

export async function sendPushNotification(
  subscription: PushSubscription,
  payload: { title: string; body: string; icon?: string; badge?: string; data?: Record<string, unknown>; tag?: string; url?: string }
) {
  ensureVapid();
  if (!vapidInitialized) return;

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth
        }
      },
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon || '/icons/icon-192x192.svg',
        badge: payload.badge || '/icons/icon-192x192.svg',
        data: payload.data || {},
        tag: payload.tag,
        url: payload.url
      })
    );
  } catch (err: unknown) {
    const error = err as { statusCode?: number; body?: string };
    if (error.statusCode === 410 || error.statusCode === 404) {
      await repository.pushSubscriptions.deleteByEndpoint(subscription.endpoint);
    }
    console.error('Error sending push notification:', err);
  }
}

export async function notifyGroupMembers(
  groupId: string,
  excludeUserId: string,
  payload: { title: string; body: string; tag?: string; url?: string; data?: Record<string, unknown> }
) {
  const group = await repository.groups.getById(groupId);
  if (!group) return;

  const memberIds = group.members.filter(id => id !== excludeUserId);
  if (memberIds.length === 0) return;

  // Only notify users who have push enabled
  const membersWithPush = (
    await Promise.all(
      memberIds.map(async (uid) => {
        const user = await repository.users.getById(uid);
        return user?.notificationsEnabled ? uid : null;
      })
    )
  ).filter(Boolean) as string[];

  if (membersWithPush.length === 0) return;

  const subscriptions = await Promise.all(
    membersWithPush.map(uid => repository.pushSubscriptions.getByUserId(uid))
  );

  const uniqueSubs = new Map<string, PushSubscription>();
  for (const subs of subscriptions) {
    for (const sub of subs) {
      uniqueSubs.set(sub.endpoint, sub);
    }
  }

  const sends = Array.from(uniqueSubs.values()).map(sub =>
    sendPushNotification(sub, {
      ...payload,
      data: { ...payload.data, groupId },
      url: payload.url || `/group/${groupId}`
    })
  );

  await Promise.allSettled(sends);
}
