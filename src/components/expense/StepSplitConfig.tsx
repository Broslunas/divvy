'use client';

import { useMemo } from 'react';
import { User, Users, ListOrdered, ListTree } from 'lucide-react';
import MemberAvatar from './MemberAvatar';
import SplitBar from './SplitBar';
import type { User as UserType, SplitType, ItemizedBillItem } from '@/types';
import { getCurrencySymbol, computeItemizedDebts } from '@/lib/utils';
import styles from './expense.module.css';

interface StepSplitConfigProps {
  members: Omit<UserType, 'passwordHash'>[];
  currentUserId: string;
  amount: string;
  currency?: string;
  // Payer
  paidById: string;
  setPaidById: (v: string) => void;
  isMultiPayer: boolean;
  setIsMultiPayer: (v: boolean) => void;
  payerAmounts: Record<string, string>;
  onPayerAmountChange: (userId: string, val: string) => void;
  // Split
  splitType: SplitType;
  setSplitType: (v: SplitType) => void;
  splitValues: Record<string, string>;
  onToggleParticipant: (userId: string) => void;
  onSplitValueChange: (userId: string, val: string) => void;
  // Itemized
  itemizedItems: ItemizedBillItem[];
  onOpenItemized: () => void;
}

const SPLIT_TABS: { type: SplitType; label: string }[] = [
  { type: 'equal', label: 'Igual' },
  { type: 'exact', label: 'Exacto' },
  { type: 'percentage', label: '%' },
  { type: 'shares', label: 'Partes' },
];

function getUnitLabel(splitType: SplitType, currencySymbol: string): string {
  switch (splitType) {
    case 'exact':
      return currencySymbol;
    case 'percentage':
      return '%';
    case 'shares':
      return 'pts';
    default:
      return '';
  }
}

export default function StepSplitConfig({
  members,
  currentUserId,
  amount,
  currency,
  paidById,
  setPaidById,
  isMultiPayer,
  setIsMultiPayer,
  payerAmounts,
  onPayerAmountChange,
  splitType,
  setSplitType,
  splitValues,
  onToggleParticipant,
  onSplitValueChange,
  itemizedItems,
  onOpenItemized,
}: StepSplitConfigProps) {
  const currencySymbol = getCurrencySymbol(currency);
  const totalAmount = parseFloat(amount) || 0;

  // Sort members: current user first
  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      if (a.id === currentUserId) return -1;
      if (b.id === currentUserId) return 1;
      return a.username.localeCompare(b.username);
    });
  }, [members, currentUserId]);

  // Calculate the amount each participant owes
  const getParticipantAmount = (userId: string): number => {
    const val = parseFloat(splitValues[userId] || '0');
    const isIncluded = splitValues[userId] !== 'false' && splitValues[userId] !== undefined;

    switch (splitType) {
      case 'equal': {
        if (!isIncluded && splitValues[userId] === 'false') return 0;
        const activeCount = Object.values(splitValues).filter((v) => v !== 'false').length;
        return activeCount > 0 ? totalAmount / activeCount : 0;
      }
      case 'exact':
        return val;
      case 'percentage':
        return (val / 100) * totalAmount;
      case 'shares': {
        const totalShares = Object.entries(splitValues).reduce(
          (sum, [, v]) => sum + (parseFloat(v) || 0),
          0
        );
        return totalShares > 0 ? (val / totalShares) * totalAmount : 0;
      }
      default:
        return 0;
    }
  };

  // Calculate bar percentage for each member
  const getBarPercentage = (userId: string): number => {
    if (totalAmount <= 0) return 0;
    const memberAmount = getParticipantAmount(userId);
    return Math.min(100, Math.max(0, (memberAmount / totalAmount) * 100));
  };

  // Count active participants
  const activeParticipants = useMemo(() => {
    if (splitType === 'equal') {
      return Object.values(splitValues).filter((v) => v !== 'false').length;
    }
    return Object.entries(splitValues).filter(([, v]) => parseFloat(v) > 0).length;
  }, [splitValues, splitType]);

  // Total allocated
  const totalAllocated = useMemo(() => {
    return sortedMembers.reduce((sum, m) => sum + getParticipantAmount(m.id), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedMembers, splitValues, splitType, totalAmount]);

  // Itemized totals (computed from configured items). Only used when splitType === 'itemized'.
  const isItemized = splitType === 'itemized' || itemizedItems.length > 0;
  const itemizedDebts = useMemo(() => {
    if (!isItemized) return [] as { userId: string; value: number }[];
    return computeItemizedDebts(itemizedItems, members.map(m => m.id));
  }, [isItemized, itemizedItems, members]);
  const itemizedTotal = useMemo(
    () => itemizedDebts.reduce((sum, d) => sum + d.value, 0),
    [itemizedDebts],
  );
  const getItemizedAmount = (userId: string): number => {
    return itemizedDebts.find(d => d.userId === userId)?.value ?? 0;
  };
  const getItemizedBarPct = (userId: string): number => {
    if (totalAmount <= 0) return 0;
    return Math.min(100, Math.max(0, (getItemizedAmount(userId) / totalAmount) * 100));
  };

  return (
    <div className={styles.stepContainer}>
      {/* --- Payer Section --- */}
      <div className={styles.fieldGroup}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label className={styles.fieldLabel}>
            <User size={14} />
            Pagado por
          </label>
          <button
            type="button"
            className={styles.payerToggle}
            onClick={() => setIsMultiPayer(!isMultiPayer)}
          >
            {isMultiPayer ? 'Un solo pagador' : 'Múltiples pagadores'}
          </button>
        </div>

        {!isMultiPayer ? (
          <div className={styles.payerRow}>
            {sortedMembers.map((member) => (
              <button
                key={member.id}
                type="button"
                className={`${styles.payerOption} ${paidById === member.id ? styles.active : ''}`}
                onClick={() => setPaidById(member.id)}
              >
                <MemberAvatar
                  name={member.username}
                  color={member.avatarColor}
                  size="md"
                  selected={paidById === member.id}
                />
                <span className={styles.payerName}>
                  {member.id === currentUserId ? 'Tú' : member.username}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className={styles.multiPayerGrid}>
            {sortedMembers.map((member) => (
              <div key={member.id} className={styles.multiPayerRow}>
                <span className={styles.multiPayerName}>
                  <MemberAvatar
                    name={member.username}
                    color={member.avatarColor}
                    size="sm"
                  />
                  {member.id === currentUserId ? 'Tú' : member.username}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input
                    type="text"
                    inputMode="decimal"
                    className={styles.multiPayerInput}
                    value={payerAmounts[member.id] || ''}
                    onChange={(e) => onPayerAmountChange(member.id, e.target.value)}
                    placeholder="0.00"
                  />
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                    {currencySymbol}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- Split Section --- */}
      <div className={styles.fieldGroup}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label className={styles.fieldLabel}>
            <Users size={14} />
            Cómo dividir
          </label>
          {isItemized ? (
            <button type="button" className={styles.itemizedLink} onClick={onOpenItemized}>
              <ListTree size={12} />
              Editar desglose ({itemizedItems.length} artículos)
            </button>
          ) : (
            <button type="button" className={styles.itemizedLink} onClick={onOpenItemized}>
              <ListOrdered size={12} />
              Desglose por artículos
            </button>
          )}
        </div>

        {isItemized ? (
          <>
            {/* Itemized summary header */}
            <div className={styles.itemizedHeader}>
              <ListOrdered size={14} />
              <span>
                Desglose por artículos · {itemizedItems.length} artículo{itemizedItems.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Itemized read-only member list */}
            <div className={styles.splitList}>
              {sortedMembers.map((member) => {
                const memberAmount = getItemizedAmount(member.id);
                const barPct = getItemizedBarPct(member.id);
                const displayName = member.id === currentUserId ? 'Tú' : member.username;
                const hasShare = memberAmount > 0;

                return (
                  <div
                    key={member.id}
                    className={`${styles.splitMemberRow} ${hasShare ? styles.included : ''}`}
                  >
                    <MemberAvatar
                      name={member.username}
                      color={member.avatarColor}
                      size="sm"
                    />
                    <div className={styles.splitMemberInfo}>
                      <span className={styles.splitMemberName}>{displayName}</span>
                      <SplitBar color={member.avatarColor} percentage={barPct} />
                    </div>
                    <span className={styles.splitMemberAmount}>
                      {memberAmount.toFixed(2)} {currencySymbol}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            {/* Split Type Tabs */}
            <div className={styles.splitTabs}>
              {SPLIT_TABS.map((tab) => (
                <button
                  key={tab.type}
                  type="button"
                  className={`${styles.splitTab} ${splitType === tab.type ? styles.active : ''}`}
                  onClick={() => setSplitType(tab.type)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Member Split List */}
            <div className={styles.splitList}>
              {sortedMembers.map((member) => {
                const isIncluded =
                  splitType === 'equal'
                    ? splitValues[member.id] !== 'false'
                    : (parseFloat(splitValues[member.id] || '0') > 0 || splitValues[member.id] !== undefined);
                const memberAmount = getParticipantAmount(member.id);
                const barPct = getBarPercentage(member.id);
                const displayName = member.id === currentUserId ? 'Tú' : member.username;

                return (
                  <div
                    key={member.id}
                    className={`${styles.splitMemberRow} ${isIncluded ? styles.included : ''}`}
                  >
                    <MemberAvatar
                      name={member.username}
                      color={member.avatarColor}
                      size="sm"
                    />
                    <div className={styles.splitMemberInfo}>
                      <span className={styles.splitMemberName}>{displayName}</span>
                      <SplitBar color={member.avatarColor} percentage={barPct} />
                      {splitType === 'equal' && (
                        <span className={styles.splitMemberAmount}>
                          {memberAmount.toFixed(2)} {currencySymbol}
                        </span>
                      )}
                    </div>

                    {splitType === 'equal' ? (
                      <button
                        type="button"
                        className={`${styles.splitToggle} ${splitValues[member.id] !== 'false' ? styles.on : ''}`}
                        onClick={() => onToggleParticipant(member.id)}
                      >
                        <span className={styles.splitToggleKnob} />
                      </button>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input
                          type="text"
                          inputMode="decimal"
                          className={styles.splitValueInput}
                          value={splitValues[member.id] || ''}
                          onChange={(e) => onSplitValueChange(member.id, e.target.value)}
                          placeholder="0"
                        />
                        <span className={styles.splitValueUnit}>
                          {getUnitLabel(splitType, currencySymbol)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* --- Summary Bar --- */}
      <div className={styles.splitSummary}>
        <span className={styles.splitSummaryText}>
          {isItemized
            ? `${itemizedDebts.filter(d => d.value > 0).length} participante${itemizedDebts.filter(d => d.value > 0).length !== 1 ? 's' : ''}`
            : `${activeParticipants} participante${activeParticipants !== 1 ? 's' : ''}`}
        </span>
        <span className={styles.splitSummaryAmount}>
          {(isItemized ? itemizedTotal : totalAllocated).toFixed(2)} {currencySymbol}
        </span>
      </div>
    </div>
  );
}
