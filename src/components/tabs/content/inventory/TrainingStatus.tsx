import React, { useState, useEffect } from 'react';
import { BookOpen, Play, Square, Loader2 } from 'lucide-react';
import { useUser } from '@/context/UserContext';

interface TrainingSession {
  isActive: boolean;
  startTime: string | null;
  totalItems: number;
  processedItems: number;
  lastProcessedAt: string | null;
}

export default function TrainingStatus() {
  const { sessionToken } = useUser();
  const [session, setSession] = useState<TrainingSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const checkStatus = async () => {
    try {
      const response = await fetch('/api/inventory/ai-bulk-training', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ action: 'status' }),
      });
      const data = await response.json();
      if (data.success) {
        setSession(data.session);
      }
    } catch (error) {
      console.error('Failed to check training status:', error);
    }
  };

  const startTraining = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/inventory/ai-bulk-training', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ action: 'start' }),
      });
      const data = await response.json();
      if (data.success) {
        setSession(data.session);
        alert(`🚀 Bắt đầu huấn luyện Sutygon-bot với ${data.session.totalItems} sản phẩm!`);
      } else {
        alert(data.message || 'Lỗi khi bắt đầu huấn luyện');
      }
    } catch (error) {
      alert('Lỗi khi bắt đầu huấn luyện');
    } finally {
      setIsLoading(false);
    }
  };

  const stopTraining = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/inventory/ai-bulk-training', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ action: 'stop' }),
      });
      const data = await response.json();
      if (data.success) {
        setSession(data.session);
        alert('🛑 Đã dừng huấn luyện Sutygon-bot');
      }
    } catch (error) {
      alert('Lỗi khi dừng huấn luyện');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
    // Check status every 30 seconds
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, [sessionToken]);

  if (!session) {
    return (
      <div className="flex items-center gap-2 p-2 bg-gray-800 rounded-md">
        <BookOpen className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-400">Đang kiểm tra trạng thái...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 p-2 bg-gray-800 rounded-md">
      <BookOpen className={`w-4 h-4 ${session.isActive ? 'text-green-400' : 'text-gray-400'}`} />

      {session.isActive ? (
        <>
          <div className="flex-1">
            <div className="text-sm text-green-400 font-medium">Đang huấn luyện Sutygon-bot</div>
            <div className="text-xs text-gray-400">
              {session.processedItems}/{session.totalItems} sản phẩm
            </div>
          </div>
          <button
            onClick={stopTraining}
            disabled={isLoading}
            className="p-1 bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
            title="Dừng huấn luyện"
          >
            {isLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Square className="w-3 h-3" />
            )}
          </button>
        </>
      ) : (
        <>
          <div className="flex-1">
            <div className="text-sm text-gray-400">Sutygon-bot chưa được huấn luyện</div>
            <div className="text-xs text-gray-500">{session.totalItems} sản phẩm sẵn sàng</div>
          </div>
          <button
            onClick={startTraining}
            disabled={isLoading}
            className="p-1 bg-green-500 hover:bg-green-600 text-white rounded transition-colors"
            title="Bắt đầu huấn luyện"
          >
            {isLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Play className="w-3 h-3" />
            )}
          </button>
        </>
      )}
    </div>
  );
}
