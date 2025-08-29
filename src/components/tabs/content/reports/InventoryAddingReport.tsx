'use client';
import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  ChevronDown,
  User,
  Package,
  Target,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

// Vietnamese date formatting utilities
const formatDateForDisplay = (date: Date): string => {
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

interface DateRange {
  from: Date;
  to: Date;
}

interface EmployeeStats {
  employeeId: number | null;
  employeeName: string;
  itemsAdded: number;
}

type QuickFilter = 'daily' | 'weekly' | 'monthly';

const InventoryAddingReport: React.FC = () => {
  const [selectedFilter, setSelectedFilter] = useState<QuickFilter>('daily');
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(),
    to: new Date(),
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [quota, setQuota] = useState<number | null>(null);
  const [quotaInput, setQuotaInput] = useState<string>('');
  const [employeeStats, setEmployeeStats] = useState<EmployeeStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Local state for date input values
  const [fromDateInput, setFromDateInput] = useState<string>('');
  const [toDateInput, setToDateInput] = useState<string>('');

  // Use ref to track current date range for auto-refresh
  const dateRangeRef = useRef<DateRange>(dateRange);
  dateRangeRef.current = dateRange;

  // Debounce mechanism to prevent rapid successive calls
  const lastFetchTimeRef = useRef<number>(0);
  const FETCH_DEBOUNCE_MS = 1000; // 1 second debounce

  // Flag to prevent multiple initial fetches
  const hasInitialFetchRef = useRef<boolean>(false);

  // Initialize date range based on selected filter
  useEffect(() => {
    const today = new Date();
    const newRange = { from: new Date(), to: new Date() };

    switch (selectedFilter) {
      case 'daily':
        newRange.from = new Date(today);
        newRange.to = new Date(today);
        break;
      case 'weekly':
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        newRange.from = startOfWeek;
        newRange.to = new Date(today);
        break;
      case 'monthly':
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        newRange.from = startOfMonth;
        newRange.to = new Date(today);
        break;
    }

    setDateRange(newRange);
  }, [selectedFilter]);

  // Fetch employee statistics
  useEffect(() => {
    // Reset the initial fetch flag when date range changes
    hasInitialFetchRef.current = false;
    fetchEmployeeStats();
  }, [dateRange]);

  // Auto-refresh every 20 seconds (fixed to prevent multiple intervals)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchEmployeeStats(true); // Pass true for auto-refresh
    }, 20000); // 20 seconds

    return () => clearInterval(interval);
  }, []); // No dependencies - interval created once and uses ref for current date range

  const fetchEmployeeStats = async (isAutoRefresh = false) => {
    // Debounce rapid successive calls
    const now = Date.now();
    if (now - lastFetchTimeRef.current < FETCH_DEBOUNCE_MS) {
      console.log('Skipping fetch - too soon since last call');
      return;
    }
    lastFetchTimeRef.current = now;

    // Prevent duplicate calls during the same render cycle (for non-auto-refresh)
    if (!isAutoRefresh && hasInitialFetchRef.current) {
      console.log('Skipping fetch - already fetched in this render cycle');
      return;
    }
    hasInitialFetchRef.current = true;

    // For auto-refresh, use isRefreshing instead of loading
    if (isAutoRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      // Use ref for auto-refresh to avoid stale closure issues
      const currentDateRange = isAutoRefresh ? dateRangeRef.current : dateRange;
      console.log('Fetching employee stats for date range:', currentDateRange);
      const response = await fetch(
        `/api/reports/inventory-adding?from=${currentDateRange.from.toISOString()}&to=${currentDateRange.to.toISOString()}`
      );

      console.log('API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('API response data:', data);

      if (data.success) {
        console.log('Setting employee stats:', data.data.employees);
        setEmployeeStats(data.data.employees || []);
      } else {
        console.error('API returned error:', data.error);
        throw new Error(data.error || 'Unknown API error');
      }
    } catch (error) {
      console.error('Error fetching employee stats:', error);
      // For auto-refresh errors, don't clear existing data
      if (!isAutoRefresh) {
        setEmployeeStats([]);
      }
    } finally {
      if (isAutoRefresh) {
        setIsRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const formatDateRange = () => {
    if (dateRange.from.toDateString() === dateRange.to.toDateString()) {
      return formatDateForDisplay(dateRange.from);
    }

    return `${formatDateForDisplay(dateRange.from)} - ${formatDateForDisplay(dateRange.to)}`;
  };

  const totalItems = employeeStats.reduce((sum, emp) => sum + emp.itemsAdded, 0);

  // Calculate ranks with proper tie handling
  const getEmployeeRank = (employee: EmployeeStats, sortedEmployees: EmployeeStats[]) => {
    if (employee.employeeId === null) return null; // Legacy data has no rank

    let rank = 1;
    for (let i = 0; i < sortedEmployees.length; i++) {
      if (sortedEmployees[i].employeeId === employee.employeeId) {
        return rank;
      }

      // If next employee has different count, update rank to current position + 1
      if (
        i + 1 < sortedEmployees.length &&
        sortedEmployees[i].itemsAdded !== sortedEmployees[i + 1].itemsAdded
      ) {
        rank = i + 2;
      }
    }
    return rank;
  };

  return (
    <div className="h-full bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <div className="flex-1">
            <h1 className="text-lg sm:text-xl font-semibold text-white">
              Báo cáo nhập kho theo nhân viên
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Thống kê số lượng mặt hàng được thêm vào kho
            </p>
          </div>

          {/* Date Range Display and Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <div className="text-center sm:text-right">
              <p className="text-sm text-gray-400">Khoảng thời gian</p>
              <p className="text-white font-medium text-sm sm:text-base">{formatDateRange()}</p>
            </div>
            <div className="flex items-center justify-center sm:justify-start space-x-2">
              <button
                onClick={() => setShowQuotaModal(true)}
                className="p-2 bg-purple-600 hover:bg-purple-700 rounded-md transition-colors"
                title="Đặt quota"
              >
                <Target className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="p-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
                title="Chọn ngày"
              >
                <Calendar className="w-5 h-5 text-gray-300" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 mt-4">
          <span className="text-sm text-gray-400 text-center sm:text-left">Bộ lọc nhanh:</span>
          <div className="flex items-center justify-center sm:justify-start space-x-2">
            {(['daily', 'weekly', 'monthly'] as QuickFilter[]).map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedFilter(filter)}
                className={`px-3 py-2 rounded-md text-sm transition-colors flex-1 sm:flex-none ${
                  selectedFilter === filter
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {filter === 'daily' && 'Hôm nay'}
                {filter === 'weekly' && 'Tuần này'}
                {filter === 'monthly' && 'Tháng này'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6">
        {/* Summary Cards */}
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${quota ? '4' : '3'} gap-4 mb-6 transition-opacity duration-300 ${isRefreshing ? 'opacity-75' : 'opacity-100'}`}
        >
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 rounded-md">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Tổng mặt hàng</p>
                <p className="text-2xl font-semibold text-white transition-all duration-500 ease-out">
                  {totalItems}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-600 rounded-md">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Nhân viên tham gia</p>
                <p className="text-2xl font-semibold text-white transition-all duration-500 ease-out">
                  {employeeStats.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-600 rounded-md">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Trung bình/người</p>
                <p className="text-2xl font-semibold text-white transition-all duration-500 ease-out">
                  {employeeStats.length > 0 ? Math.round(totalItems / employeeStats.length) : 0}
                </p>
              </div>
            </div>
          </div>

          {/* Quota Card - only show when quota is set */}
          {quota && (
            <div className="bg-gray-800 rounded-lg p-4 border border-purple-700">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-600 rounded-md">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Quota đặt ra</p>
                  <p className="text-2xl font-semibold text-white transition-all duration-500 ease-out">
                    {quota}
                  </p>
                  <p className="text-xs text-purple-400">
                    {employeeStats.filter((emp) => emp.itemsAdded >= quota).length}/
                    {employeeStats.length} nhân viên đạt quota
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Employee Statistics Table */}
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-700">
            <h3 className="text-lg font-medium text-white">Chi tiết theo nhân viên</h3>
          </div>

          {/* Mobile Card View */}
          <div className="block sm:hidden">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-400 mt-2">Đang tải dữ liệu...</p>
              </div>
            ) : employeeStats.length > 0 ? (
              <div
                className={`transition-opacity duration-300 ${isRefreshing ? 'opacity-75' : 'opacity-100'} p-4 space-y-4`}
              >
                {employeeStats
                  .sort((a, b) => b.itemsAdded - a.itemsAdded)
                  .map((employee) => {
                    const sortedEmployees = [...employeeStats].sort(
                      (a, b) => b.itemsAdded - a.itemsAdded
                    );
                    const rank = getEmployeeRank(employee, sortedEmployees);
                    const isRank1 = rank === 1;

                    return (
                      <div
                        key={employee.employeeId || 'legacy'}
                        className={`rounded-lg p-4 ${
                          isRank1
                            ? 'bg-gradient-to-r from-yellow-900/30 to-amber-900/30 border border-yellow-500/50'
                            : 'bg-gray-700'
                        }`}
                      >
                        {/* Employee Info */}
                        {/* Employee Info */}
                        <div className="flex items-center space-x-3 mb-3">
                          <div
                            className={`h-10 w-10 rounded-full flex items-center justify-center ${
                              employee.employeeId === null
                                ? 'bg-gray-600'
                                : isRank1
                                  ? 'bg-yellow-500'
                                  : 'bg-blue-600'
                            }`}
                          >
                            <span className="text-base font-medium text-white">
                              {employee.employeeName.charAt(0)}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <p
                                className={`text-base font-medium ${
                                  employee.employeeId === null
                                    ? 'text-gray-300'
                                    : isRank1
                                      ? 'text-yellow-200'
                                      : 'text-white'
                                }`}
                              >
                                {employee.employeeName}
                              </p>
                              {isRank1 && <span className="text-yellow-400 text-lg">👑</span>}
                            </div>
                            <p
                              className={`text-sm ${
                                employee.employeeId === null
                                  ? 'text-gray-400'
                                  : isRank1
                                    ? 'text-yellow-300'
                                    : 'text-gray-400'
                              }`}
                            >
                              {employee.employeeId === null ? 'Dữ liệu legacy' : `Hạng #${rank}`}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-white">{employee.itemsAdded}</p>
                            <p className="text-xs text-gray-400">mặt hàng</p>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-gray-400">Tỷ lệ</span>
                            <span className="text-gray-300">
                              {totalItems > 0
                                ? Math.round((employee.itemsAdded / totalItems) * 100)
                                : 0}
                              %
                            </span>
                          </div>
                          <div className="w-full bg-gray-600 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                              style={{ width: `${(employee.itemsAdded / totalItems) * 100}%` }}
                            />
                          </div>
                        </div>

                        {/* Quota Status */}
                        {quota && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-400">Quota</span>
                            <div className="flex items-center space-x-2">
                              {employee.itemsAdded >= quota ? (
                                <>
                                  <TrendingUp className="w-4 h-4 text-green-400" />
                                  <span className="text-sm font-medium text-green-400">
                                    Đạt quota
                                  </span>
                                </>
                              ) : (
                                <>
                                  <TrendingDown className="w-4 h-4 text-red-400" />
                                  <span className="text-sm font-medium text-red-400">
                                    Thiếu {quota - employee.itemsAdded}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-300 mb-2">Không có dữ liệu</h3>
                <p className="text-gray-500">
                  Không có mặt hàng nào được thêm trong khoảng thời gian này
                </p>
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-400 mt-2">Đang tải dữ liệu...</p>
              </div>
            ) : employeeStats.length > 0 ? (
              <div
                className={`transition-opacity duration-300 ${isRefreshing ? 'opacity-75' : 'opacity-100'}`}
              >
                <table className="w-full">
                  <thead className="bg-gray-750">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Nhân viên
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Số mặt hàng thêm
                      </th>
                      {quota && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Quota
                        </th>
                      )}
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Tỷ lệ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {employeeStats
                      .sort((a, b) => b.itemsAdded - a.itemsAdded)
                      .map((employee) => {
                        const sortedEmployees = [...employeeStats].sort(
                          (a, b) => b.itemsAdded - a.itemsAdded
                        );
                        const rank = getEmployeeRank(employee, sortedEmployees);
                        const isRank1 = rank === 1;

                        return (
                          <tr
                            key={employee.employeeId || 'legacy'}
                            className={`hover:bg-gray-750 ${
                              isRank1 ? 'bg-gradient-to-r from-yellow-900/20 to-amber-900/20' : ''
                            }`}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-8 w-8">
                                  <div
                                    className={`h-8 w-8 rounded-full flex items-center justify-center ${
                                      employee.employeeId === null
                                        ? 'bg-gray-600'
                                        : isRank1
                                          ? 'bg-yellow-500'
                                          : 'bg-blue-600'
                                    }`}
                                  >
                                    <span className="text-sm font-medium text-white">
                                      {employee.employeeName.charAt(0)}
                                    </span>
                                  </div>
                                </div>
                                <div className="ml-3">
                                  <div className="flex items-center space-x-2">
                                    <p
                                      className={`text-sm font-medium ${
                                        employee.employeeId === null
                                          ? 'text-gray-300'
                                          : isRank1
                                            ? 'text-yellow-200'
                                            : 'text-white'
                                      }`}
                                    >
                                      {employee.employeeName}
                                    </p>
                                    {isRank1 && <span className="text-yellow-400">👑</span>}
                                  </div>
                                  <p
                                    className={`text-sm ${
                                      employee.employeeId === null
                                        ? 'text-gray-400'
                                        : isRank1
                                          ? 'text-yellow-300'
                                          : 'text-gray-400'
                                    }`}
                                  >
                                    {employee.employeeId === null
                                      ? 'Dữ liệu legacy'
                                      : `Hạng #${rank}`}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm font-medium text-white">
                                {employee.itemsAdded}
                              </span>
                            </td>
                            {quota && (
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center space-x-2">
                                  {employee.itemsAdded >= quota ? (
                                    <>
                                      <TrendingUp className="w-4 h-4 text-green-400" />
                                      <span className="text-sm font-medium text-green-400">
                                        Đạt quota
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <TrendingDown className="w-4 h-4 text-red-400" />
                                      <span className="text-sm font-medium text-red-400">
                                        Thiếu {quota - employee.itemsAdded}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </td>
                            )}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-16 bg-gray-700 rounded-full h-2 mr-3">
                                  <div
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                                    style={{
                                      width: `${(employee.itemsAdded / totalItems) * 100}%`,
                                    }}
                                  />
                                </div>
                                <span className="text-sm text-gray-300">
                                  {totalItems > 0
                                    ? Math.round((employee.itemsAdded / totalItems) * 100)
                                    : 0}
                                  %
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-300 mb-2">Không có dữ liệu</h3>
                <p className="text-gray-500">
                  Không có mặt hàng nào được thêm trong khoảng thời gian này
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custom Date Picker Modal */}
      {showDatePicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-white mb-4">Chọn khoảng thời gian</h3>

            <div className="space-y-4">
              {/* From Date */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Từ ngày <span className="text-gray-500 text-xs">(DD/MM/YYYY)</span>
                </label>
                <input
                  type="text"
                  value={fromDateInput}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFromDateInput(value);

                    // Only parse if we have a complete DD/MM/YYYY format
                    const parts = value.split('/');
                    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
                      const day = parseInt(parts[0]);
                      const month = parseInt(parts[1]) - 1; // Month is 0-indexed
                      const year = parseInt(parts[2]);
                      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                        const newDate = new Date(year, month, day);
                        if (newDate.toString() !== 'Invalid Date') {
                          setDateRange((prev) => ({ ...prev, from: newDate }));
                        }
                      }
                    }
                  }}
                  onFocus={() => {
                    if (!fromDateInput) {
                      setFromDateInput(formatDateForDisplay(dateRange.from));
                    }
                  }}
                  onBlur={() => {
                    if (!fromDateInput || fromDateInput === '') {
                      setFromDateInput('');
                    }
                  }}
                  placeholder="DD/MM/YYYY"
                  className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* To Date */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Đến ngày <span className="text-gray-500 text-xs">(DD/MM/YYYY)</span>
                </label>
                <input
                  type="text"
                  value={toDateInput}
                  onChange={(e) => {
                    const value = e.target.value;
                    setToDateInput(value);

                    // Only parse if we have a complete DD/MM/YYYY format
                    const parts = value.split('/');
                    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
                      const day = parseInt(parts[0]);
                      const month = parseInt(parts[1]) - 1; // Month is 0-indexed
                      const year = parseInt(parts[2]);
                      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                        const newDate = new Date(year, month, day);
                        if (newDate.toString() !== 'Invalid Date') {
                          setDateRange((prev) => ({ ...prev, to: newDate }));
                        }
                      }
                    }
                  }}
                  onFocus={() => {
                    if (!toDateInput) {
                      setToDateInput(formatDateForDisplay(dateRange.to));
                    }
                  }}
                  onBlur={() => {
                    if (!toDateInput || toDateInput === '') {
                      setToDateInput('');
                    }
                  }}
                  placeholder="DD/MM/YYYY"
                  className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Quick Presets */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Hoặc chọn nhanh
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      const today = new Date();
                      const lastWeek = new Date(today);
                      lastWeek.setDate(today.getDate() - 7);
                      setDateRange({ from: lastWeek, to: today });
                      setFromDateInput('');
                      setToDateInput('');
                    }}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-md transition-colors"
                  >
                    7 ngày qua
                  </button>
                  <button
                    onClick={() => {
                      const today = new Date();
                      const lastMonth = new Date(today);
                      lastMonth.setDate(today.getDate() - 30);
                      setDateRange({ from: lastMonth, to: today });
                      setFromDateInput('');
                      setToDateInput('');
                    }}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-md transition-colors"
                  >
                    30 ngày qua
                  </button>
                  <button
                    onClick={() => {
                      const today = new Date();
                      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                      setDateRange({ from: startOfMonth, to: today });
                      setFromDateInput('');
                      setToDateInput('');
                    }}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-md transition-colors"
                  >
                    Tháng này
                  </button>
                  <button
                    onClick={() => {
                      const today = new Date();
                      const startOfYear = new Date(today.getFullYear(), 0, 1);
                      setDateRange({ from: startOfYear, to: today });
                      setFromDateInput('');
                      setToDateInput('');
                    }}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-md transition-colors"
                  >
                    Năm này
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowDatePicker(false);
                  setFromDateInput('');
                  setToDateInput('');
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2 px-4 rounded-md transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  // Validate that from date is not after to date
                  if (dateRange.from > dateRange.to) {
                    alert('Ngày bắt đầu không thể sau ngày kết thúc');
                    return;
                  }
                  setShowDatePicker(false);
                  setFromDateInput('');
                  setToDateInput('');
                  // The useEffect will automatically trigger a refresh when dateRange changes
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors"
              >
                Áp dụng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quota Modal */}
      {showQuotaModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-white mb-4">Đặt Quota Nhân Viên</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Số mặt hàng tối thiểu mỗi nhân viên
                </label>
                <input
                  type="number"
                  min="1"
                  value={quotaInput}
                  onChange={(e) => setQuotaInput(e.target.value)}
                  placeholder="Ví dụ: 10"
                  className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {quota && (
                <div className="bg-gray-700 rounded-md p-3">
                  <p className="text-sm text-gray-300">
                    Quota hiện tại: <span className="text-white font-medium">{quota}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowQuotaModal(false);
                  setQuotaInput('');
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2 px-4 rounded-md transition-colors"
              >
                Hủy
              </button>
              {quota && (
                <button
                  onClick={() => {
                    setQuota(null);
                    setQuotaInput('');
                    setShowQuotaModal(false);
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md transition-colors"
                >
                  Xóa Quota
                </button>
              )}
              <button
                onClick={() => {
                  const newQuota = parseInt(quotaInput);
                  if (newQuota && newQuota > 0) {
                    setQuota(newQuota);
                    setQuotaInput('');
                    setShowQuotaModal(false);
                  } else {
                    alert('Vui lòng nhập số quota hợp lệ (lớn hơn 0)');
                  }
                }}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-md transition-colors"
              >
                {quota ? 'Cập nhật' : 'Đặt Quota'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryAddingReport;
