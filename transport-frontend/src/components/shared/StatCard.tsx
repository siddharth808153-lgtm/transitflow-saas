// src/components/shared/StatCard.tsx
import React from 'react';
import Card from '@/components/ui/Card';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: string | number;
    label: string;
    isPositive?: boolean;
  };
  color?: 'blue' | 'orange' | 'green' | 'red' | 'purple' | 'slate';
}

const colorMaps = {
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-100 dark:border-blue-900/50',
  },
  orange: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-100 dark:border-amber-900/50',
  },
  green: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-100 dark:border-emerald-900/50',
  },
  red: {
    bg: 'bg-rose-50 dark:bg-rose-950/30',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-100 dark:border-rose-900/50',
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-100 dark:border-purple-900/50',
  },
  slate: {
    bg: 'bg-slate-50 dark:bg-slate-900/50',
    text: 'text-slate-600 dark:text-slate-400',
    border: 'border-slate-100 dark:border-slate-800/50',
  },
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  trend,
  color = 'slate',
}) => {
  const styles = colorMaps[color] || colorMaps.slate;

  return (
    <Card className="hover:shadow-md transition-shadow duration-200 border border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
            {value}
          </h3>
          {trend && (
            <div className="flex items-center gap-1 mt-2 text-xs">
              <span
                className={`font-semibold ${
                  trend.isPositive ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {trend.value}
              </span>
              <span className="text-slate-400">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={`p-3.5 rounded-xl border ${styles.bg} ${styles.text} ${styles.border}`}>
          {icon}
        </div>
      </div>
    </Card>
  );
};

export default StatCard;
