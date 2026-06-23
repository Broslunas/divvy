import fs from 'fs';
import path from 'path';
import type { User, Group, Expense, Comment } from '@/types';
import type { Notification, PushSubscription } from '@/types/notification';

const DB_DIR = path.join(process.cwd(), 'data', 'db');

// Ensure the directory exists
function ensureDir() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
}

class JsonCollection<T extends { id: string }> {
  private filePath: string;

  constructor(filename: string) {
    this.filePath = path.join(DB_DIR, filename);
  }

  private read(): T[] {
    ensureDir();
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify([]));
      return [];
    }
    try {
      const content = fs.readFileSync(this.filePath, 'utf-8');
      return JSON.parse(content || '[]');
    } catch (e) {
      console.error(`Error reading database file: ${this.filePath}`, e);
      return [];
    }
  }

  private write(data: T[]) {
    ensureDir();
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  public async getAll(): Promise<T[]> {
    return this.read();
  }

  public async getById(id: string): Promise<T | null> {
    const list = this.read();
    return list.find(item => item.id === id) || null;
  }

  public async findOne(query: Partial<T>): Promise<T | null> {
    const list = this.read();
    return list.find(item => {
      for (const key in query) {
        if (item[key] !== query[key]) return false;
      }
      return true;
    }) || null;
  }

  public async findMany(query: (item: T) => boolean): Promise<T[]> {
    const list = this.read();
    return list.filter(query);
  }

  public async create(item: T): Promise<T> {
    const list = this.read();
    list.push(item);
    this.write(list);
    return item;
  }

  public async update(id: string, updates: Partial<T>): Promise<T | null> {
    const list = this.read();
    const idx = list.findIndex(item => item.id === id);
    if (idx === -1) return null;
    
    list[idx] = { ...list[idx], ...updates };
    this.write(list);
    return list[idx];
  }

  public async delete(id: string): Promise<boolean> {
    const list = this.read();
    const filtered = list.filter(item => item.id !== id);
    if (filtered.length === list.length) return false;
    this.write(filtered);
    return true;
  }
}

export const fallbackDb = {
  users: new JsonCollection<User>('users.json'),
  groups: new JsonCollection<Group>('groups.json'),
  expenses: new JsonCollection<Expense>('expenses.json'),
  notifications: new JsonCollection<Notification>('notifications.json'),
  pushSubscriptions: new JsonCollection<PushSubscription>('push_subscriptions.json'),
  comments: new JsonCollection<Comment>('comments.json')
};
