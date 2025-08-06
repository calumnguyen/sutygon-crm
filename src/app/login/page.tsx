'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AnimatedDots from '@/components/common/AnimatedDots';
import Logo from '@/components/common/Logo';
import { useUser } from '@/context/UserContext';

export default function LoginPage() {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setCurrentUser, setSessionToken, isAuthenticated } = useUser();

  useEffect(() => {
    // Check if user is already logged in
    if (isAuthenticated) {
      router.replace('/');
    }
  }, [router, isAuthenticated]);

  const handleKeyPress = (key: string) => {
    if (key === 'backspace') {
      setInput((prev) => prev.slice(0, -1));
      setError('');
    } else if (/\d/.test(key) && input.length < 6) {
      const newValue = input + key;
      setInput(newValue);
      setError('');
      if (newValue.length === 6) {
        handleSubmit(newValue);
      }
    }
  };

  const handleSubmit = async (employeeKey?: string) => {
    const keyToSubmit = employeeKey || input;
    if (keyToSubmit.length !== 6) {
      setError('Vui lòng nhập đầy đủ 6 số.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const authRes = await fetch('/api/auth/employee-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeKey: keyToSubmit }),
      });

      const authData = await authRes.json();

      if (authRes.ok) {
        // Store session token (persists across navigation but cleared on hard refresh)
        localStorage.setItem('sessionToken', authData.sessionToken);
        // Store original employee key for identity confirmations
        localStorage.setItem('originalEmployeeKey', keyToSubmit);

        // Update UserContext
        setCurrentUser(authData.user);
        setSessionToken(authData.sessionToken);
        router.push('/');
      } else {
        if (authData.error === 'STORE_CLOSED') {
          setError('Cửa hàng đã đóng cửa. Vui lòng liên hệ với Quản lý.');
        } else {
          setError('Mã nhân viên không đúng.');
        }
        setInput('');
      }
    } catch {
      setError('Có lỗi xảy ra.');
      setInput('');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      setInput((prev) => prev.slice(0, -1));
      setError('');
    } else if (/\d/.test(e.key) && input.length < 6) {
      const newValue = input + e.key;
      setInput(newValue);
      setError('');
      if (newValue.length === 6) {
        handleSubmit(newValue);
      }
    }
    e.preventDefault();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e3a8a] to-[#312e81] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none z-0" />
      <div className="relative z-10 flex flex-col items-center w-full max-w-sm px-6 py-10 bg-gray-900/80 rounded-2xl shadow-2xl border border-gray-700 backdrop-blur-md">
        <Logo />
        <h1 className="text-2xl sm:text-3xl font-bold mt-6 mb-2 text-center bg-gradient-to-r from-blue-400 to-pink-500 bg-clip-text text-transparent drop-shadow">
          Sutygon CRM
        </h1>
        <h2 className="text-lg sm:text-xl font-semibold mb-6 text-center text-white/90">
          Xin Chào Bạn
        </h2>
        <div className="mb-4 text-base text-center text-gray-300">
          Nhập Mã Nhân Viên để Đăng Nhập
        </div>

        {/* Hidden input for keyboard support */}
        <div className="relative flex flex-col items-center w-full">
          <AnimatedDots value={input} length={6} />
          <input
            type="tel"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            minLength={6}
            className="absolute opacity-0 pointer-events-none"
            value={input}
            onChange={() => {}}
            onKeyDown={handleKeyDown}
            autoFocus
            autoComplete="one-time-code"
            tabIndex={0}
            aria-label="Mã Nhân Viên (6 số)"
          />
        </div>

        {/* Mobile-friendly numeric keypad */}
        <div className="w-full mt-6">
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handleKeyPress(num.toString())}
                disabled={input.length >= 6 || loading}
                className="w-full h-12 bg-gray-800 hover:bg-gray-700 active:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xl font-semibold rounded-lg transition-colors duration-200 border border-gray-600"
              >
                {num}
              </button>
            ))}
            <button
              onClick={() => handleKeyPress('backspace')}
              disabled={input.length === 0 || loading}
              className="w-full h-12 bg-red-800 hover:bg-red-700 active:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-lg font-semibold rounded-lg transition-colors duration-200 border border-red-600"
            >
              ←
            </button>
            <button
              onClick={() => handleKeyPress('0')}
              disabled={input.length >= 6 || loading}
              className="w-full h-12 bg-gray-800 hover:bg-gray-700 active:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xl font-semibold rounded-lg transition-colors duration-200 border border-gray-600"
            >
              0
            </button>
            <button
              onClick={() => input.length === 6 && handleSubmit(input)}
              disabled={input.length !== 6 || loading}
              className="w-full h-12 bg-blue-600 hover:bg-blue-500 active:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-lg font-semibold rounded-lg transition-colors duration-200 border border-blue-500"
            >
              ✓
            </button>
          </div>
        </div>

        {error && (
          <div className="text-red-400 text-sm mt-4 text-center animate-pulse">{error}</div>
        )}
        {loading && (
          <div className="text-blue-400 text-sm mt-4 text-center animate-pulse">
            Đang kiểm tra...
          </div>
        )}
      </div>
    </div>
  );
}
