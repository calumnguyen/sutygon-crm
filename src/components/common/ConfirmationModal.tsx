import React from 'react';
import Button from './dropdowns/Button';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl p-6 sm:p-8 w-full max-w-md shadow-2xl border border-gray-700">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 text-center">{title}</h2>
        <p className="text-gray-300 mb-6 text-center text-sm sm:text-base">{message}</p>
        <div className="flex flex-col sm:flex-row justify-end gap-3 sm:space-x-3">
          <Button variant="secondary" onClick={onClose} type="button" className="w-full sm:w-auto">
            {cancelText}
          </Button>
          <Button variant="danger" onClick={onConfirm} type="button" className="w-full sm:w-auto">
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
