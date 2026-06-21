export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  avatarColor: string;
  notificationsEnabled?: boolean;
  createdAt: string;
}

export interface CategoryBudget {
  category: string;
  limit: number;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  inviteCode: string;
  members: string[]; // User IDs
  archivedBy?: string[]; // User IDs who archived this group
  budget?: number; // Total group budget limit
  categoryBudgets?: CategoryBudget[];
  currency?: string; // 'EUR' | 'USD' | 'GBP' | 'JPY' | 'MXN'
  notes?: string; // Travel notes, itinerary, packing list
  createdAt: string;
}

export type SplitType = 'equal' | 'exact' | 'percentage' | 'shares' | 'itemized';

export interface ExpenseSplit {
  userId: string;
  value: number; // For 'exact': amount, 'percentage': %, 'shares': share count, 'equal': 0
  isPaid: boolean; // Tracks if this individual share has been reimbursed to the payer
}

export interface MultiPayer {
  userId: string;
  amount: number;
}

export interface ItemizedBillItem {
  name: string;
  amount: number;
  userIds: string[]; // Who shared this specific item (used for 'equal')
  splitType?: SplitType; // How this item is split among its participants. Defaults to 'equal'.
  splitValues?: Record<string, string>; // Per-user values: amount for 'exact', % for 'percentage', parts for 'shares'.
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: 'expense_created' | 'expense_updated' | 'group_joined' | 'payment_confirmed';
  groupId: string;
  expenseId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface Expense {
  id: string;
  groupId: string;
  title: string;
  amount: number;
  date: string;
  category: string;
  paidById: string; // Primary payer (fallback or main)
  multiPayers?: MultiPayer[]; // Support for multiple payers (optional)
  splitType: SplitType;
  splits: ExpenseSplit[];
  isSettlement: boolean;
  notes?: string;
  tags?: string[];
  paymentMethod?: string; // 'cash' | 'card' | 'bizum' | 'paypal'
  items?: ItemizedBillItem[]; // Desglose por productos/artículos
  createdAt: string;
}
