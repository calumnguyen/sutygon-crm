import React from 'react';
import { Package, AlertTriangle, CheckCircle, Clock, User, History } from 'lucide-react';
import { OrderItem, PickupHistory } from './types';

interface OrderItemsSectionProps {
  orderItems: OrderItem[];
}

const OrderItemsSection: React.FC<OrderItemsSectionProps> = ({ orderItems }) => {
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('vi-VN') + ' đ';
  };

  const formatPickupStatus = (item: OrderItem) => {
    const pickedUpQuantity = item.pickedUpQuantity || 0;
    const totalQuantity = item.quantity;

    if (pickedUpQuantity === 0) {
      return {
        icon: <Clock className="w-4 h-4 text-yellow-400" />,
        text: 'Chờ nhận hàng',
        bgColor: 'bg-yellow-900/30',
        textColor: 'text-yellow-300',
        borderColor: 'border-yellow-500/30',
      };
    }

    if (pickedUpQuantity >= totalQuantity) {
      return {
        icon: <CheckCircle className="w-4 h-4 text-green-400" />,
        text: `Đã nhận đầy đủ ${pickedUpQuantity}/${totalQuantity}`,
        bgColor: 'bg-green-900/30',
        textColor: 'text-green-300',
        borderColor: 'border-green-500/30',
      };
    }

    if (pickedUpQuantity > 0 && pickedUpQuantity < totalQuantity) {
      return {
        icon: <Clock className="w-4 h-4 text-orange-400" />,
        text: `Đã nhận ${pickedUpQuantity}/${totalQuantity}`,
        bgColor: 'bg-orange-900/30',
        textColor: 'text-orange-300',
        borderColor: 'border-orange-500/30',
      };
    }

    return null;
  };

  const formatPickupDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const groupPickupHistoryBySession = (pickupHistory: PickupHistory[]) => {
    if (!pickupHistory || pickupHistory.length === 0) return [];

    // Group by timestamp (within 5 minutes = same session)
    const groups: PickupHistory[][] = [];
    const sortedHistory = [...pickupHistory].sort(
      (a, b) => new Date(b.pickedUpAt).getTime() - new Date(a.pickedUpAt).getTime()
    );

    for (const pickup of sortedHistory) {
      const pickupTime = new Date(pickup.pickedUpAt).getTime();
      let addedToGroup = false;

      for (const group of groups) {
        const groupTime = new Date(group[0].pickedUpAt).getTime();
        // If within 5 minutes (300000 ms), consider it the same session
        if (Math.abs(pickupTime - groupTime) <= 300000) {
          group.push(pickup);
          addedToGroup = true;
          break;
        }
      }

      if (!addedToGroup) {
        groups.push([pickup]);
      }
    }

    return groups;
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <div className="flex items-center gap-3 mb-6">
        <Package className="w-6 h-6 text-purple-400" />
        <h2 className="text-xl font-bold text-white">Danh sách sản phẩm</h2>
        <span className="hidden sm:inline bg-gray-700 text-gray-300 px-3 py-1 rounded-full text-sm">
          {orderItems.length} sản phẩm
        </span>
      </div>

      {orderItems.length > 0 ? (
        <div className="space-y-3">
          {orderItems.map((item) => (
            <div key={item.id} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
              <div className="flex items-start gap-4">
                {/* Image */}
                <div className="flex-shrink-0">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-16 h-16 rounded-lg object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div
                    className={`w-16 h-16 rounded-lg bg-gray-600 flex items-center justify-center ${item.imageUrl ? 'hidden' : ''}`}
                  >
                    <Package className="w-8 h-8 text-gray-400" />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium text-sm leading-tight line-clamp-2">
                        {item.name}
                      </h3>
                      {item.formattedId && (
                        <p className="text-gray-400 text-xs mt-1">ID: {item.formattedId}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-white font-bold text-sm">{formatCurrency(item.price)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Kích thước:</span>
                      <span className="text-white font-medium ml-2">{item.size}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Số lượng:</span>
                      <span className="text-white font-medium ml-2">{item.quantity}</span>
                    </div>
                  </div>

                  {/* Pickup Status and History */}
                  {(() => {
                    const pickupStatus = formatPickupStatus(item);
                    const pickupHistoryGroups = groupPickupHistoryBySession(
                      item.pickupHistory || []
                    );

                    if (!pickupStatus && pickupHistoryGroups.length === 0) return null;

                    return (
                      <div className="mt-3">
                        {/* Current Pickup Status */}
                        {pickupStatus && (
                          <div
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${pickupStatus.bgColor} ${pickupStatus.borderColor} mb-3`}
                          >
                            {pickupStatus.icon}
                            <span className={`text-sm font-medium ${pickupStatus.textColor}`}>
                              {pickupStatus.text}
                            </span>
                          </div>
                        )}

                        {/* Pickup History */}
                        {pickupHistoryGroups.length > 0 && (
                          <div className="mt-2">
                            <div className="flex items-center gap-2 mb-2">
                              <History className="w-4 h-4 text-blue-400" />
                              <span className="text-sm font-medium text-blue-300">
                                Lịch sử nhận hàng
                              </span>
                            </div>
                            <div className="space-y-2">
                              {pickupHistoryGroups.map((session, sessionIndex) => {
                                const totalQuantityInSession = session.reduce(
                                  (sum, pickup) => sum + pickup.pickedUpQuantity,
                                  0
                                );
                                const firstPickup = session[0];

                                return (
                                  <div
                                    key={sessionIndex}
                                    className="bg-gray-600/30 rounded-lg p-3 border border-gray-500/30"
                                  >
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-2 sm:gap-0">
                                      <div className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-400" />
                                        <span className="text-sm font-medium text-green-300">
                                          Đã nhận {totalQuantityInSession} sản phẩm
                                        </span>
                                      </div>
                                      <span className="text-xs text-gray-400 sm:text-right">
                                        {formatPickupDate(firstPickup.pickedUpAt)}
                                      </span>
                                    </div>

                                    <div className="text-xs text-gray-300 space-y-1">
                                      <div className="flex items-center gap-1">
                                        <User className="w-3 h-3" />
                                        <span>
                                          Khách hàng: {firstPickup.pickedUpByCustomerName}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <User className="w-3 h-3" />
                                        <span>
                                          Nhân viên hỗ trợ: {firstPickup.facilitatedByUserName}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Check for unresolved notes or warnings */}
                  {((item.warning && !item.warningResolved) ||
                    (item.noteNotComplete && item.noteNotComplete > 0)) && (
                    <div className="mt-3 p-[1px] rounded-lg bg-gradient-to-r from-pink-500 to-rose-500 w-full sm:w-fit">
                      <div className="bg-gray-800 rounded-lg p-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-pink-400 flex-shrink-0" />
                          <span className="text-pink-300 text-xs sm:whitespace-nowrap">
                            Có ghi chú hoặc cảnh báo chưa giải quyết
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Total Summary */}
          <div className="mt-6 p-[2px] rounded-xl bg-gradient-to-r from-blue-500 via-cyan-400 to-green-500">
            <div className="bg-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-bold text-base">Tổng tiền</h3>
                  <p className="text-gray-400 text-xs">{orderItems.length} sản phẩm</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">
                    <span className="bg-gradient-to-r from-blue-500 via-cyan-400 to-green-500 bg-clip-text text-transparent">
                      {formatCurrency(
                        orderItems.reduce((total, item) => total + item.price * item.quantity, 0)
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <Package className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">Không có sản phẩm nào</p>
        </div>
      )}
    </div>
  );
};

export default OrderItemsSection;
