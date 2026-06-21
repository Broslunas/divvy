/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from 'mongoose';

// User Schema
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  avatarColor: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}, {
  toJSON: {
    transform(doc, ret: any) {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
    }
  }
});

// Group Schema
const GroupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  inviteCode: { type: String, required: true, unique: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  archivedBy: [{ type: String }],
  budget: { type: Number, default: 0 },
  categoryBudgets: [{
    category: { type: String, required: true },
    limit: { type: Number, required: true }
  }],
  currency: { type: String, default: 'EUR' },
  notes: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
}, {
  toJSON: {
    transform(doc, ret: any) {
      ret.id = ret._id.toString();
      ret.members = ret.members.map((m: any) => m.toString());
      ret.archivedBy = ret.archivedBy || [];
      ret.budget = ret.budget || 0;
      ret.categoryBudgets = ret.categoryBudgets || [];
      ret.currency = ret.currency || 'EUR';
      ret.notes = ret.notes || '';
      delete ret._id;
      delete ret.__v;
    }
  }
});

// Expense Schema
const ExpenseSplitSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  value: { type: Number, required: true },
  isPaid: { type: Boolean, default: false }
}, { _id: false });

const MultiPayerSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  amount: { type: Number, required: true }
}, { _id: false });

const ItemizedBillItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  amount: { type: Number, required: true },
  userIds: [{ type: String }]
}, { _id: false });

const ExpenseSchema = new mongoose.Schema({
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  title: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: Date, required: true },
  category: { type: String, required: true },
  paidById: { type: String, required: true },
  multiPayers: [MultiPayerSchema],
  splitType: { type: String, required: true },
  splits: [ExpenseSplitSchema],
  isSettlement: { type: Boolean, default: false },
  notes: { type: String, default: '' },
  tags: [{ type: String }],
  paymentMethod: { type: String, default: 'cash' },
  items: [ItemizedBillItemSchema],
  createdAt: { type: Date, default: Date.now }
}, {
  toJSON: {
    transform(doc, ret: any) {
      ret.id = ret._id.toString();
      ret.groupId = ret.groupId.toString();
      ret.date = ret.date.toISOString();
      ret.notes = ret.notes || '';
      ret.tags = ret.tags || [];
      ret.paymentMethod = ret.paymentMethod || 'cash';
      ret.items = ret.items || [];
      ret.multiPayers = ret.multiPayers || [];
      delete ret._id;
      delete ret.__v;
    }
  }
});

// Export models, ensuring they aren't compiled twice in Dev mode
export const MongoUser = mongoose.models.User || mongoose.model('User', UserSchema);
export const MongoGroup = mongoose.models.Group || mongoose.model('Group', GroupSchema);
export const MongoExpense = mongoose.models.Expense || mongoose.model('Expense', ExpenseSchema);
