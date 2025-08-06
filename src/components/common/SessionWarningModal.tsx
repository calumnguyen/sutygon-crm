'use client';
import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

interface SessionWarningModalProps {
  isOpen: boolean;
  onExtendSession: () => void;
  onLogout: () => void;
  remainingSeconds: number;
}

export default function SessionWarningModal({
  isOpen,
  onExtendSession,
  onLogout,
  remainingSeconds,
}: SessionWarningModalProps) {
  const [countdown, setCountdown] = useState(0);
  const [hasStartedCountdown, setHasStartedCountdown] = useState(false);

  useEffect(() => {
    if (isOpen && remainingSeconds > 0) {
      setCountdown(remainingSeconds);
      setHasStartedCountdown(true);

      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    } else if (!isOpen) {
      setHasStartedCountdown(false);
      setCountdown(0);
    }
  }, [isOpen, remainingSeconds]);

  // Handle logout when countdown reaches 0 - but only if we actually started counting
  useEffect(() => {
    if (isOpen && countdown === 0 && hasStartedCountdown && remainingSeconds > 0) {
      onLogout();
    }
  }, [countdown, isOpen, onLogout, remainingSeconds, hasStartedCountdown]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-yellow-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Phiên đăng nhập sắp hết hạn</h3>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-gray-300 mb-4">
            Phiên đăng nhập của bạn sẽ hết hạn do không hoạt động. Bạn có muốn tiếp tục không?
          </p>

          <div className="flex items-center gap-2 text-yellow-400">
            <Clock className="w-4 h-4" />
            <span className="font-mono text-lg">
              {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onExtendSession}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Tiếp tục phiên
          </button>
          <button
            onClick={onLogout}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg font-medium transition-colors"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    </div>
  );
}
