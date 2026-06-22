import webpush from 'web-push';
import { repository } from './repository';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:notifications@divvy.es';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    VAPID_SUBJECT,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
} else {
  console.warn('⚠️ VAPID keys are missing. Push notifications will not be sent.');
}

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; link?: string }
) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return;
  }

  try {
    const subscriptions = await repository.pushSubscriptions.getByUser(userId);
    
    if (subscriptions.length === 0) {
      return;
    }

    const payloadString = JSON.stringify(payload);

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.keys.p256dh,
              auth: sub.keys.auth
            }
          };

          await webpush.sendNotification(pushSubscription, payloadString);
        } catch (error: any) {
          // If subscription is expired or no longer valid (410 Gone or 404 Not Found), remove it
          if (error.statusCode === 410 || error.statusCode === 404) {
            console.log(`🧹 Removing expired subscription for user ${userId}: ${sub.endpoint}`);
            await repository.pushSubscriptions.deleteByEndpoint(userId, sub.endpoint);
          } else {
            console.error(`Error sending push notification to endpoint: ${sub.endpoint}`, error);
          }
        }
      })
    );
  } catch (err) {
    console.error(`Error in sendPushToUser for user ${userId}:`, err);
  }
}

export async function notifyUser(
  userId: string,
  notificationData: {
    title: string;
    message: string;
    link: string;
    type: 'expense' | 'settlement' | 'reminder' | 'system';
  }
) {
  try {
    // 1. Save in-app notification in DB
    const notification = await repository.notifications.create({
      userId,
      title: notificationData.title,
      message: notificationData.message,
      link: notificationData.link,
      type: notificationData.type
    });

    // 2. Send Push Notification asynchronously
    // We run this without awaiting to return quickly to the caller
    sendPushToUser(userId, {
      title: notificationData.title,
      body: notificationData.message,
      link: notificationData.link
    }).catch(err => console.error('Background push notify error:', err));

    return notification;
  } catch (err) {
    console.error(`Failed to notify user ${userId}:`, err);
    return null;
  }
}
