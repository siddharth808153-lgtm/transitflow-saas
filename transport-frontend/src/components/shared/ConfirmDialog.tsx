// src/components/shared/ConfirmDialog.tsx
import React from 'react';
import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import { AlertTriangle, Info } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  dangerous?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onConfirm,
  onCancel,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  dangerous = false,
}) => {
  return (
    <Dialog
      isOpen={open}
      onClose={onCancel}
      contentClassName="pb-0 px-0 rounded-2xl overflow-hidden"
      width={440}
    >
      <div className="px-6 pb-6 pt-5 flex gap-4">
        <div className={`p-3 rounded-full h-fit ${
          dangerous 
            ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400' 
            : 'bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400'
        }`}>
          {dangerous ? <AlertTriangle className="w-6 h-6" /> : <Info className="w-6 h-6" />}
        </div>
        <div className="flex-1">
          <h5 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">{title}</h5>
          <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>
      <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 flex justify-end items-center gap-3">
        <Button size="sm" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button
          size="sm"
          variant="solid"
          color={dangerous ? 'red-600' : 'blue-600'}
          className={dangerous ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
};

export default ConfirmDialog;
