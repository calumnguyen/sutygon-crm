import React from 'react';
import { OrderItem } from '../types';

/**
 * Notes/alteration card for step 4 summary.
 * @param notes Array of notes
 * @param orderItems Array of order items
 */
export const OrderSummaryNotes: React.FC<{
  notes: { id: string; itemId: string | null; text: string; done: boolean }[];
  orderItems: OrderItem[];
}> = ({ notes, orderItems }) => (
  <div className="bg-gray-800 rounded-lg p-4 shadow flex flex-col gap-2">
    <div className="text-lg font-bold text-yellow-400 mb-2 text-left">Ghi chú / Chỉnh sửa</div>
    {notes.length === 0 ? (
      <div className="text-gray-400 text-sm">Không có ghi chú nào</div>
    ) : (
      <ul className="text-sm space-y-2">
        {notes
          .filter((n) => n.itemId === null)
          .map((n) => (
            <li key={n.id} className="text-white">
              <span className="font-semibold text-gray-300">[Toàn bộ đơn]</span> {n.text}{' '}
              {n.done && <span className="text-green-400">✓</span>}
            </li>
          ))}
        {orderItems.map(
          (item) =>
            notes.filter((n) => n.itemId === item.id).length > 0 && (
              <li key={item.id}>
                <span className="font-semibold text-blue-300">
                  [{item.name}
                  {item.size ? ` - ${item.size}` : ''}]
                </span>
                <ul className="ml-2 list-disc list-inside">
                  {notes
                    .filter((n) => n.itemId === item.id)
                    .map((n) => (
                      <li key={n.id} className="text-white">
                        {n.text} {n.done && <span className="text-green-400">✓</span>}
                      </li>
                    ))}
                </ul>
              </li>
            )
        )}
      </ul>
    )}
  </div>
);
