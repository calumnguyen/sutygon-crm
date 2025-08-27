import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Trash2 } from 'lucide-react';
import { useUser } from '@/context/UserContext';

interface DeleteAllOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const DeleteAllOrdersModal: React.FC<DeleteAllOrdersModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [confirmationCode, setConfirmationCode] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRequestingCode, setIsRequestingCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const { currentUser } = useUser();

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setConfirmationCode('');
      setError(null);
      setSuccess(false);
      setIsDeleting(false);
    }
  }, [isOpen]);

  const handleRequestCode = async () => {
    setIsRequestingCode(true);
    setError(null);

    try {
      const response = await fetch('/api/orders/request-delete-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentUser: currentUser,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send code');
      }

      setCodeSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send code');
    } finally {
      setIsRequestingCode(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmationCode || confirmationCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch('/api/orders/delete-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentUser: currentUser,
          confirmationCode: confirmationCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete orders');
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && confirmationCode.length === 6) {
      handleDelete();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full border border-gray-700">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500 bg-opacity-20 rounded-lg">
              <Trash2 className="w-5 h-5 text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">Delete All Orders</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {success ? (
            <div className="text-center">
              <div className="text-green-400 text-lg font-semibold mb-2">
                ✅ Orders Deleted Successfully
              </div>
              <div className="text-gray-400 text-sm">
                All orders have been permanently deleted from the database.
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <div className="flex items-start gap-3 mb-4">
                  <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="text-red-400 font-semibold mb-2">⚠️ DANGEROUS OPERATION</h3>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      This action will permanently delete ALL orders from the database. This
                      includes order items, notes, and all related data. This action cannot be
                      undone.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Confirmation Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={confirmationCode}
                    onChange={(e) => setConfirmationCode(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Enter 6-digit code"
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    maxLength={6}
                    autoFocus
                  />
                  <button
                    onClick={handleRequestCode}
                    disabled={isRequestingCode || codeSent}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md transition-colors whitespace-nowrap"
                  >
                    {isRequestingCode ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : codeSent ? (
                      'Sent ✓'
                    ) : (
                      'Send Code'
                    )}
                  </button>
                </div>
                {codeSent && (
                  <p className="text-green-400 text-sm mt-2">✓ 6-digit code sent to your email</p>
                )}
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-500 bg-opacity-20 border border-red-500 rounded-md">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-md transition-colors"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={confirmationCode.length !== 6 || isDeleting}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md transition-colors flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete All Orders
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeleteAllOrdersModal;
