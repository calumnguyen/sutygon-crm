'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AnimatedDots from '@/components/common/AnimatedDots';
import Logo from '@/components/common/Logo';

export default function LoginPage() {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (localStorage.getItem('storeCode')) {
      router.replace('/');
    }
  }, [router]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      setInput((prev) => prev.slice(0, -1));
      setError('');
    } else if (/\d/.test(e.key) && input.length < 8) {
      const newValue = input + e.key;
      setInput(newValue);
      setError('');
      if (newValue.length === 8) {
        setLoading(true);
        fetch('/api/store-code/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: newValue }),
        })
          .then((res) => {
            if (res.ok) {
              localStorage.setItem('storeCode', newValue);
              router.push('/');
            } else {
              setError('Mã không đúng.');
              setInput('');
            }
          })
          .catch(() => setError('Có lỗi xảy ra.'))
          .finally(() => setLoading(false));
      }
    }
    e.preventDefault();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e3a8a] to-[#312e81] relative overflow-hidden">
      {/* Subtle animated background particles (optional) */}
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
          Nhập Mã Cửa Hàng để Đăng Nhập
        </div>
        <div className="relative flex flex-col items-center w-full">
          <AnimatedDots value={input} length={8} />
          <input
            ref={inputRef}
            type="tel"
            inputMode="numeric"
            pattern="\d{8}"
            maxLength={8}
            minLength={8}
            className="absolute opacity-0 pointer-events-none"
            value={input}
            onChange={() => {}}
            onKeyDown={handleKeyDown}
            autoFocus
            autoComplete="one-time-code"
            tabIndex={0}
            aria-label="Mã Cửa Hàng (8 số)"
          />
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
      {/* Optional: Add a subtle star/particle effect here for extra space vibes */}
    </div>
  );
}
