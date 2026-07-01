import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { repository } from './repository';
import type { User } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET || 'divvy-fallback-secret-key-12345';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: { userId: string; handoff?: boolean }, expiresIn: string | number = '7d'): string {
  const options: jwt.SignOptions = {};
  if (typeof expiresIn === 'number') {
    options.expiresIn = expiresIn; // seconds
  } else {
    options.expiresIn = expiresIn;
  }
  return jwt.sign(payload, JWT_SECRET, options);
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

// Get the currently authenticated user from the cookie token
export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    
    if (!token) return null;
    
    const decoded = verifyToken(token);
    if (!decoded) return null;
    
    return await repository.users.getById(decoded.userId);
  } catch (e) {
    console.error('Error getting current user from auth cookie:', e);
    return null;
  }
}
