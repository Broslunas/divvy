'use client';

import styles from './expense.module.css';

interface SplitBarProps {
  percentage: number; // 0-100
  color: string;
}

export default function SplitBar({ percentage, color }: SplitBarProps) {
  return (
    <div className={styles.splitBarTrack}>
      <div
        className={styles.splitBarFill}
        style={{
          width: `${percentage}%`,
          backgroundColor: color,
        }}
      />
    </div>
  );
}
