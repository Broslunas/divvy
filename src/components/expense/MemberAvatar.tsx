'use client';

import { getInitials } from '@/lib/utils';
import styles from './expense.module.css';

interface MemberAvatarProps {
  name: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
  selected?: boolean;
  disabled?: boolean;
}

const sizeClassMap = {
  sm: styles.avatarSm,
  md: styles.avatarMd,
  lg: styles.avatarLg,
} as const;

export default function MemberAvatar({
  name,
  color,
  size = 'md',
  selected = false,
  disabled = false,
}: MemberAvatarProps) {
  const classNames = [
    sizeClassMap[size],
    selected && styles.avatarSelected,
    disabled && styles.avatarDisabled,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classNames}
      style={{ backgroundColor: color }}
      title={name}
    >
      {getInitials(name)}
    </div>
  );
}
