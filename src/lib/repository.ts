import crypto from 'crypto';
import { connectDB } from './db';
import { fallbackDb } from './dbFallback';
import { MongoUser, MongoGroup, MongoExpense } from './models';
import type { User, Group, Expense } from '@/types';

// Helper to generate a random 8-character invite code
export function generateInviteCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// Helper to generate UUIDs for fallback database
export function generateId(): string {
  return crypto.randomUUID();
}

export const repository = {
  users: {
    async getById(id: string): Promise<User | null> {
      const isConnected = await connectDB();
      if (isConnected) {
        const user = await MongoUser.findById(id);
        return user ? (user.toJSON() as User) : null;
      } else {
        return fallbackDb.users.getById(id);
      }
    },

    async getByEmail(email: string): Promise<User | null> {
      const isConnected = await connectDB();
      if (isConnected) {
        const user = await MongoUser.findOne({ email: email.toLowerCase() });
        return user ? (user.toJSON() as User) : null;
      } else {
        return fallbackDb.users.findOne({ email: email.toLowerCase() });
      }
    },

    async create(user: Omit<User, 'id' | 'createdAt'>): Promise<User> {
      const isConnected = await connectDB();
      const createdAt = new Date().toISOString();
      if (isConnected) {
        const newUser = await MongoUser.create({
          ...user,
          email: user.email.toLowerCase(),
          createdAt
        });
        return newUser.toJSON() as User;
      } else {
        const id = generateId();
        const newUser: User = {
          id,
          ...user,
          email: user.email.toLowerCase(),
          createdAt
        };
        return fallbackDb.users.create(newUser);
      }
    },

    async update(id: string, updates: Partial<User>): Promise<User | null> {
      const isConnected = await connectDB();
      if (isConnected) {
        try {
          const user = await MongoUser.findByIdAndUpdate(id, updates, { new: true });
          return user ? (user.toJSON() as User) : null;
        } catch {
          return null;
        }
      } else {
        return fallbackDb.users.update(id, updates);
      }
    }
  },

  groups: {
    async getById(id: string): Promise<Group | null> {
      const isConnected = await connectDB();
      if (isConnected) {
        try {
          const group = await MongoGroup.findById(id);
          return group ? (group.toJSON() as Group) : null;
        } catch {
          return null; // Handle invalid ObjectId cast error gracefully
        }
      } else {
        return fallbackDb.groups.getById(id);
      }
    },

    async getByInviteCode(inviteCode: string): Promise<Group | null> {
      const isConnected = await connectDB();
      if (isConnected) {
        const group = await MongoGroup.findOne({ inviteCode: inviteCode.toUpperCase() });
        return group ? (group.toJSON() as Group) : null;
      } else {
        return fallbackDb.groups.findOne({ inviteCode: inviteCode.toUpperCase() });
      }
    },

    async getUserGroups(userId: string): Promise<Group[]> {
      const isConnected = await connectDB();
      if (isConnected) {
        const groups = await MongoGroup.find({ members: userId }).sort({ createdAt: -1 });
        return groups.map(g => g.toJSON() as Group);
      } else {
        return fallbackDb.groups.findMany(g => g.members.includes(userId));
      }
    },

    async create(group: Omit<Group, 'id' | 'inviteCode' | 'createdAt'>): Promise<Group> {
      const isConnected = await connectDB();
      const inviteCode = generateInviteCode();
      const createdAt = new Date().toISOString();
      if (isConnected) {
        const newGroup = await MongoGroup.create({
          ...group,
          inviteCode,
          createdAt
        });
        return newGroup.toJSON() as Group;
      } else {
        const id = generateId();
        const newGroup: Group = {
          id,
          ...group,
          inviteCode,
          createdAt
        };
        return fallbackDb.groups.create(newGroup);
      }
    },

    async addUserToGroup(groupId: string, userId: string): Promise<Group | null> {
      const isConnected = await connectDB();
      if (isConnected) {
        try {
          const group = await MongoGroup.findByIdAndUpdate(
            groupId,
            { $addToSet: { members: userId } },
            { new: true }
          );
          return group ? (group.toJSON() as Group) : null;
        } catch {
          return null;
        }
      } else {
        const group = await fallbackDb.groups.getById(groupId);
        if (!group) return null;
        if (group.members.includes(userId)) return group;
        return fallbackDb.groups.update(groupId, {
          members: [...group.members, userId]
        });
      }
    },

    async update(id: string, updates: Partial<Group>): Promise<Group | null> {
      const isConnected = await connectDB();
      if (isConnected) {
        try {
          const group = await MongoGroup.findByIdAndUpdate(id, updates, { new: true });
          return group ? (group.toJSON() as Group) : null;
        } catch {
          return null;
        }
      } else {
        return fallbackDb.groups.update(id, updates);
      }
    }
  },

  expenses: {
    async getById(id: string): Promise<Expense | null> {
      const isConnected = await connectDB();
      if (isConnected) {
        try {
          const expense = await MongoExpense.findById(id);
          return expense ? (expense.toJSON() as Expense) : null;
        } catch {
          return null;
        }
      } else {
        return fallbackDb.expenses.getById(id);
      }
    },

    async getByGroupId(groupId: string): Promise<Expense[]> {
      const isConnected = await connectDB();
      if (isConnected) {
        try {
          const expenses = await MongoExpense.find({ groupId }).sort({ date: -1, createdAt: -1 });
          return expenses.map(e => e.toJSON() as Expense);
        } catch {
          return [];
        }
      } else {
        const list = await fallbackDb.expenses.findMany(e => e.groupId === groupId);
        // Sort descending by date, then by createdAt
        return list.sort((a, b) => {
          const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
          if (dateDiff !== 0) return dateDiff;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      }
    },

    async create(expense: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense> {
      const isConnected = await connectDB();
      const createdAt = new Date().toISOString();
      if (isConnected) {
        const newExpense = await MongoExpense.create({
          ...expense,
          createdAt
        });
        return newExpense.toJSON() as Expense;
      } else {
        const id = generateId();
        const newExpense: Expense = {
          id,
          ...expense,
          createdAt
        };
        return fallbackDb.expenses.create(newExpense);
      }
    },

    async delete(id: string): Promise<boolean> {
      const isConnected = await connectDB();
      if (isConnected) {
        try {
          const result = await MongoExpense.findByIdAndDelete(id);
          return !!result;
        } catch {
          return false;
        }
      } else {
        return fallbackDb.expenses.delete(id);
      }
    },

    async update(id: string, updates: Partial<Expense>): Promise<Expense | null> {
      const isConnected = await connectDB();
      if (isConnected) {
        try {
          const expense = await MongoExpense.findByIdAndUpdate(id, updates, { new: true });
          return expense ? (expense.toJSON() as Expense) : null;
        } catch {
          return null;
        }
      } else {
        return fallbackDb.expenses.update(id, updates);
      }
    }
  }
};
