export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  link: string;
  type: 'expense' | 'settlement' | 'reminder' | 'system';
  isRead: boolean;
  createdAt: string;
}

export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface PushSubscription {
  id: string;
  userId: string;
  endpoint: string;
  keys: PushSubscriptionKeys;
  createdAt: string;
}
