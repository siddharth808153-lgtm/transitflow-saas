// src/components/shared/EmptyState.tsx
import React from 'react';
import Button from '@/components/ui/Button';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/20 max-w-lg mx-auto my-6">
      <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-full text-slate-400 mb-4 border border-slate-100 dark:border-slate-800">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-slate-950 dark:text-slate-50 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button variant="solid" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
