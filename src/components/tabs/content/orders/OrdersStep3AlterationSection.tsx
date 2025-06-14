import React, { useState, useEffect } from 'react';
import { OrderItem } from './types';
import { Dialog } from '@headlessui/react';

interface Note {
  id: string;
  itemId: string | null;
  text: string;
  done: boolean;
}

interface OrdersStep3AlterationSectionProps {
  orderItems: OrderItem[];
  selectedItemId: string | null;
  setSelectedItemId: (id: string | null) => void;
  notes: Note[];
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
}

const OrdersStep3AlterationSection: React.FC<OrdersStep3AlterationSectionProps> = ({
  orderItems,
  selectedItemId,
  setSelectedItemId,
  notes,
  setNotes,
}) => {
  const [newNote, setNewNote] = useState('');
  const [addError, setAddError] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Filter notes to show
  const visibleNotes = selectedItemId ? notes.filter((n) => n.itemId === selectedItemId) : notes;

  // Get item name for display
  const getItemName = (id: string | null) => {
    if (!id) return 'Toàn bộ đơn hàng';
    const item = orderItems.find(
      (i) => i.id === id || (i.isCustom && i.name + '_' + i.price === id)
    );
    if (!item) return id;
    if (!item.id || item.isCustom) return item.name;
    return item.id;
  };

  // Add note
  const handleAddNote = () => {
    setAddError('');
    if (!newNote.trim()) {
      setAddError('Vui lòng nhập ghi chú');
      return;
    }
    setNotes((prev) => [
      ...prev,
      {
        id: Date.now() + '_' + Math.random(),
        itemId: selectedItemId,
        text: newNote.trim(),
        done: false,
      },
    ]);
    setNewNote('');
  };

  // Toggle done
  const toggleDone = (id: string) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, done: !n.done } : n)));
  };

  // Remove notes for deleted items
  useEffect(() => {
    setNotes((prevNotes) =>
      prevNotes.filter(
        (note) => note.itemId === null || orderItems.some((item) => item.id === note.itemId)
      )
    );
  }, [orderItems]);

  return (
    <div className="flex-shrink-0 basis-[260px] max-w-[320px] bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700 min-h-[400px] flex flex-col items-center">
      <div className="text-xl font-bold text-yellow-400 mb-4">Chỉnh sửa / Ghi chú</div>
      {selectedItemId && (
        <div className="text-xs text-gray-400 mb-2 -mt-2 text-center">
          {getItemName(selectedItemId)}
        </div>
      )}
      <div className="w-full flex flex-col gap-2 mb-4">
        {selectedItemId ? (
          <button
            className="text-xs text-blue-400 underline mb-2 self-end"
            onClick={() => setSelectedItemId(null)}
          >
            Xem tất cả ghi chú
          </button>
        ) : null}
        <button
          className="px-3 py-2 rounded bg-green-600 hover:bg-green-700 text-white text-sm font-semibold mb-2"
          onClick={() => setShowModal(true)}
        >
          Thêm ghi chú mới
        </button>
        {addError && <div className="text-red-400 text-xs mb-2">{addError}</div>}
      </div>
      {/* Modal for adding note */}
      <Dialog
        open={showModal}
        onClose={() => setShowModal(false)}
        className="fixed z-50 inset-0 flex items-center justify-center"
      >
        {showModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-40"
            onClick={() => setShowModal(false)}
          />
        )}
        <div
          className="relative bg-gray-900 rounded-lg p-6 w-full max-w-xs mx-auto flex flex-col items-center border border-gray-700"
          onClick={(e) => e.stopPropagation()}
        >
          <Dialog.Title className="text-lg font-bold text-yellow-400 mb-2">
            Thêm ghi chú
          </Dialog.Title>
          <input
            type="text"
            className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-600 text-white mb-4"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder={
              selectedItemId
                ? 'Thêm ghi chú cho sản phẩm này...'
                : 'Thêm ghi chú cho toàn bộ đơn hàng...'
            }
            autoFocus
          />
          <div className="flex gap-2 w-full">
            <button
              className="flex-1 px-3 py-2 rounded bg-green-600 hover:bg-green-700 text-white text-sm font-semibold"
              onClick={() => {
                handleAddNote();
                if (!addError && newNote.trim()) setShowModal(false);
              }}
            >
              Thêm
            </button>
            <button
              className="flex-1 px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold"
              onClick={() => {
                setShowModal(false);
                setAddError('');
              }}
            >
              Hủy
            </button>
          </div>
          {addError && <div className="text-red-400 text-xs mt-2">{addError}</div>}
        </div>
      </Dialog>
      <div className="w-full flex flex-col gap-2">
        {visibleNotes.length === 0 ? (
          <div className="text-gray-400 text-sm text-center">Chưa có ghi chú nào</div>
        ) : (
          visibleNotes.map((note) => (
            <div
              key={note.id}
              className={`flex items-center gap-2 p-2 rounded ${note.done ? 'bg-green-900 bg-opacity-30' : 'bg-gray-900'}`}
            >
              <input
                type="checkbox"
                checked={note.done}
                onChange={() => toggleDone(note.id)}
                className="accent-green-500 w-4 h-4"
              />
              <div className="flex-1">
                <div className="text-xs text-gray-400 mb-0.5">{getItemName(note.itemId)}</div>
                <div
                  className={`text-sm ${note.done ? 'line-through text-green-400' : 'text-white'}`}
                >
                  {note.text}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default OrdersStep3AlterationSection;
