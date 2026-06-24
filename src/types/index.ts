export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  avatarColor: string;
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
  targetDate?: string; // Target date of the event/trip (e.g. YYYY-MM-DD)
  isBonoCultural?: boolean; // Flag to identify a Bono Cultural tracker group
  coverImageUrl?: string | null; // Public CDN URL of the group's cover image
  createdAt: string;
}

export type SplitType = 'equal' | 'exact' | 'percentage' | 'shares' | 'itemized';

export interface ExpenseSplit {
  userId: string;
  value: number; // For 'exact': amount, 'percentage': %, 'shares': share count, 'equal': 0
  isPaid: boolean; // Tracks if this individual share has been reimbursed to the payer
  lastReminderSentAt?: string; // ISO date of last payment reminder sent to this user
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
  ticketUploaded?: boolean; // Flag for Spain's Bono Cultural ticket justification status
  receiptImageUrl?: string; // URL of the uploaded receipt photo
  createdAt: string;
}

export interface Comment {
  id: string;
  expenseId: string;
  groupId: string;
  userId: string;
  username: string;
  avatarColor: string;
  text: string;
  imageUrl?: string;
  createdAt: string;
}

export interface GroupDocument {
  id: string;
  groupId: string;
  title: string;
  content: string;
  lastEditedBy: string;
  lastEditedAt: string;
  createdAt: string;
}


