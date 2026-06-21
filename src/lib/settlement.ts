import type { Expense } from '@/types';

export interface SettlementTransaction {
  from: string; // Debtor ID
  to: string;   // Creditor ID
  amount: number;
}

export interface UserBalance {
  userId: string;
  netBalance: number; // Positive means they are owed money, negative means they owe money
}

// Calculate the net balance of each user in a group based on the expenses
export function calculateBalances(
  members: string[],
  expenses: Expense[]
): { balances: Record<string, number>; transactions: SettlementTransaction[] } {
  const balances: Record<string, number> = {};
  
  // Initialize balances to 0
  members.forEach(memberId => {
    balances[memberId] = 0;
  });

  // Calculate net balances based on expenses
  expenses.forEach(expense => {
    const { amount, paidById, multiPayers, splitType, splits, isSettlement } = expense;

    if (isSettlement) {
      // Settlement expense: a direct payment from paidById (debtor) to the other person (creditor)
      // Usually, there is exactly one split for the person receiving the money
      if (!members.includes(paidById)) return;
      const receiver = splits[0]?.userId;
      if (receiver && members.includes(receiver)) {
        balances[paidById] += amount; // debtor paid
        balances[receiver] -= amount; // creditor received
      }
      return;
    }

    // Standard expense
    // 1. Calculate individual shares for each member
    const shares: Record<string, number> = {};
    members.forEach(m => { shares[m] = 0; });

    if (splitType === 'equal') {
      const participants = splits.length > 0 ? splits.map(s => s.userId) : members;
      const validParticipants = participants.filter(p => members.includes(p));
      const share = amount / (validParticipants.length || 1);
      validParticipants.forEach(userId => {
        shares[userId] = share;
      });
    } 
    else if (splitType === 'exact' || splitType === 'itemized') {
      splits.forEach(split => {
        if (members.includes(split.userId)) {
          shares[split.userId] = split.value;
        }
      });
    } 
    else if (splitType === 'percentage') {
      splits.forEach(split => {
        if (members.includes(split.userId)) {
          shares[split.userId] = (split.value / 100) * amount;
        }
      });
    } 
    else if (splitType === 'shares') {
      const totalShares = splits.reduce((sum, s) => sum + s.value, 0);
      splits.forEach(split => {
        if (members.includes(split.userId) && totalShares > 0) {
          shares[split.userId] = (split.value / totalShares) * amount;
        }
      });
    }

    // 2. Determine which splits are already paid (reimbursed)
    // We sum up the shares that have been paid back directly (excluding the payer's own share)
    let sumOfPaidShares = 0;
    splits.forEach(split => {
      const isPayer = multiPayers && multiPayers.length > 0
        ? multiPayers.some(p => p.userId === split.userId)
        : split.userId === paidById;

      if (split.isPaid && !isPayer && members.includes(split.userId)) {
        sumOfPaidShares += shares[split.userId] || 0;
      }
    });

    // 3. Credit the payers (subtracting what they've already received offline)
    if (multiPayers && multiPayers.length > 0) {
      const validPayers = multiPayers.filter(p => members.includes(p.userId));
      validPayers.forEach(payer => {
        // Credit proportion: payer's share of unpaid amount
        const proportion = payer.amount / amount;
        const payerCredit = payer.amount - (sumOfPaidShares * proportion);
        balances[payer.userId] += payerCredit;
      });
    } else {
      if (members.includes(paidById)) {
        balances[paidById] += (amount - sumOfPaidShares);
      }
    }

    // 4. Debit the participants (only if they haven't paid their share yet)
    members.forEach(userId => {
      const splitInfo = splits.find(s => s.userId === userId);
      const isPaid = splitInfo ? splitInfo.isPaid : false;
      const isPayer = multiPayers && multiPayers.length > 0
        ? multiPayers.some(p => p.userId === userId)
        : userId === paidById;

      // If they haven't paid their share and are not the payer, debit them
      if (!isPaid && !isPayer) {
        balances[userId] -= shares[userId] || 0;
      }
    });
  });

  // Round balances to 2 decimal places to avoid floating point errors
  Object.keys(balances).forEach(key => {
    balances[key] = Math.round(balances[key] * 100) / 100;
  });

  // Calculate optimal transactions to settle up
  const transactions = solveTransactions(balances);

  return { balances, transactions };
}

// Greedy algorithm to minimize transactions
function solveTransactions(balancesRecord: Record<string, number>): SettlementTransaction[] {
  const transactions: SettlementTransaction[] = [];
  
  // Map balances to an array and filter out zeros
  let balances = Object.entries(balancesRecord)
    .map(([userId, netBalance]) => ({ userId, balance: netBalance }))
    .filter(item => Math.abs(item.balance) > 0.01);

  // Keep running until all balances are settled
  let iterations = 0;
  const maxIterations = balances.length * 2; // Safeguard

  while (balances.length > 1 && iterations < maxIterations) {
    iterations++;
    
    // Sort balances descending: largest creditor first, largest debtor last
    balances.sort((a, b) => b.balance - a.balance);

    const creditor = balances[0];
    const debtor = balances[balances.length - 1];

    if (creditor.balance <= 0.01 || debtor.balance >= -0.01) {
      break; // No substantial debts remain
    }

    const amountToTransfer = Math.min(creditor.balance, -debtor.balance);
    
    transactions.push({
      from: debtor.userId,
      to: creditor.userId,
      amount: Math.round(amountToTransfer * 100) / 100
    });

    // Update balances
    creditor.balance -= amountToTransfer;
    debtor.balance += amountToTransfer;

    // Filter out settled users
    balances = balances.filter(item => Math.abs(item.balance) > 0.01);
  }

  return transactions;
}
