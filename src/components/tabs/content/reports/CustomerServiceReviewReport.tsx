'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Calendar, Star, User, MessageSquare } from 'lucide-react';

// Vietnamese date formatting utilities
const formatDateForDisplay = (date: Date): string => {
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatDateTimeForDisplay = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Function to decode HTML entities
const decodeHtmlEntities = (text: string) => {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
};

const formatPhoneNumber = (phone: string) => {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');

  // Format Vietnamese phone numbers
  if (cleaned.length === 10) {
    // Format: 0123 456 789
    return cleaned.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3');
  } else if (cleaned.length === 11) {
    // Format: 0123 456 7890
    return cleaned.replace(/(\d{4})(\d{3})(\d{4})/, '$1 $2 $3');
  } else if (cleaned.length === 9) {
    // Format: 123 456 789
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
  }

  // Return original if no pattern matches
  return phone;
};

interface DateRange {
  from: Date;
  to: Date;
}

type QuickFilter = 'daily' | 'weekly' | 'monthly';

interface Review {
  id: string;
  customerName: string;
  phoneNumber: string | null;
  emailAddress: string | null;
  invoiceNumber: string | null;
  rating: number;
  ratingDescription: string;
  helperName: string | null;
  reviewDetail: string;
  dateCreated: string;
  ipAddress: string | null;
  deviceType: string | null;
  browserType: string | null;
}

interface Analytics {
  totalReviews: number;
  weightedAverageRating: number;
  ratingDistribution: Array<{ rating: number; count: number }>;
}

const CustomerServiceReviewReport: React.FC = () => {
  const [selectedFilter, setSelectedFilter] = useState<QuickFilter>('monthly');

  // Initialize with proper monthly date range
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth,
    to: today,
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [selectedRating, setSelectedRating] = useState<number[]>([]);

  // Local state for date input values
  const [fromDateInput, setFromDateInput] = useState<string>('');
  const [toDateInput, setToDateInput] = useState<string>('');

  // Use refs to track if we should fetch data
  const isInitialized = useRef(false);
  const lastDateRange = useRef({ from: dateRange.from, to: dateRange.to });
  const lastSelectedRating = useRef<number[]>([]);

  const formatDateRange = () => {
    if (dateRange.from.getTime() === dateRange.to.getTime()) {
      return formatDateForDisplay(dateRange.from);
    }
    return `${formatDateForDisplay(dateRange.from)} - ${formatDateForDisplay(dateRange.to)}`;
  };

  const getRatingColor = (rating: number) => {
    if (rating <= 2) return 'text-red-400';
    if (rating <= 4) return 'text-orange-400';
    if (rating <= 6) return 'text-yellow-400';
    if (rating <= 8) return 'text-green-400';
    return 'text-emerald-400';
  };

  const getRatingBgColor = (rating: number) => {
    if (rating <= 2) return 'bg-red-500/20';
    if (rating <= 4) return 'bg-orange-500/20';
    if (rating <= 6) return 'bg-yellow-500/20';
    if (rating <= 8) return 'bg-green-500/20';
    return 'bg-emerald-500/20';
  };

  const fetchAnalytics = async () => {
    if (analyticsLoading) return; // Prevent concurrent requests
    setAnalyticsLoading(true);
    try {
      const fromDate = dateRange.from.toISOString();
      const toDate = dateRange.to.toISOString();

      console.log('Fetching analytics for date range:', { fromDate, toDate });

      // Fetch analytics (always fetch all data for analytics)
      const analyticsResponse = await fetch(
        `/api/reviews/analytics?fromDate=${fromDate}&toDate=${toDate}`
      );
      const analyticsData = await analyticsResponse.json();

      if (analyticsData.success) {
        setAnalytics(analyticsData.data);
        console.log('Analytics updated:', analyticsData.data);
      } else {
        console.error('Analytics fetch failed:', analyticsData.error);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchReviews = async () => {
    if (loading) return; // Prevent concurrent requests
    setLoading(true);
    try {
      const fromDate = dateRange.from.toISOString();
      const toDate = dateRange.to.toISOString();

      // Build URL with filters
      let reviewsUrl = `/api/reviews?fromDate=${fromDate}&toDate=${toDate}`;
      if (selectedRating.length > 0) {
        reviewsUrl += `&rating=${selectedRating.join(',')}`;
      }

      console.log('Fetching reviews with URL:', reviewsUrl);

      // Fetch reviews
      const reviewsResponse = await fetch(reviewsUrl);
      const reviewsData = await reviewsResponse.json();

      if (reviewsData.success) {
        setReviews(reviewsData.data);
        console.log('Reviews updated:', reviewsData.data.length, 'reviews');
      } else {
        console.error('Reviews fetch failed:', reviewsData.error);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviewsAndAnalytics = async () => {
    setLoading(true);
    setAnalyticsLoading(true);
    try {
      await Promise.all([fetchAnalytics(), fetchReviews()]);
    } finally {
      setLoading(false);
      setAnalyticsLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    if (!isInitialized.current) {
      isInitialized.current = true;
      fetchReviewsAndAnalytics();
    }
  }, []); // Only run once on mount

  // Fetch analytics when date range changes
  useEffect(() => {
    if (isInitialized.current && analytics !== null) {
      const currentFrom = dateRange.from.getTime();
      const currentTo = dateRange.to.getTime();
      const lastFrom = lastDateRange.current.from.getTime();
      const lastTo = lastDateRange.current.to.getTime();

      if (currentFrom !== lastFrom || currentTo !== lastTo) {
        lastDateRange.current = { from: dateRange.from, to: dateRange.to };
        fetchAnalytics();
      }
    }
  }, [dateRange.from, dateRange.to]);

  // Fetch reviews when date range or rating filter changes
  useEffect(() => {
    if (isInitialized.current && (reviews.length > 0 || analytics !== null)) {
      const currentFrom = dateRange.from.getTime();
      const currentTo = dateRange.to.getTime();
      const lastFrom = lastDateRange.current.from.getTime();
      const lastTo = lastDateRange.current.to.getTime();
      const currentRating = selectedRating;
      const lastRating = lastSelectedRating.current;

      // Check if arrays are different
      const ratingsChanged =
        currentRating.length !== lastRating.length ||
        !currentRating.every((rating, index) => rating === lastRating[index]);

      if (currentFrom !== lastFrom || currentTo !== lastTo || ratingsChanged) {
        lastDateRange.current = { from: dateRange.from, to: dateRange.to };
        lastSelectedRating.current = [...selectedRating];
        fetchReviews();
      }
    }
  }, [dateRange.from, dateRange.to, selectedRating]);

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

  // Memoized analytics cards
  const AnalyticsCards = useMemo(() => {
    if (!analytics) return null;

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600 rounded-md">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Tổng đánh giá</p>
              <p className="text-2xl font-semibold text-white">{analytics.totalReviews}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-600 rounded-md">
              <Star className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Điểm trung bình (có trọng số)</p>
              <p className="text-2xl font-semibold text-white">
                {analytics.weightedAverageRating}/10
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Dựa trên {analytics.totalReviews} đánh giá
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }, [analytics]);

  // Memoized rating distribution
  const RatingDistribution = useMemo(() => {
    if (!analytics) return null;

    const getRatingColor = (rating: number) => {
      if (rating <= 3) return 'bg-red-500';
      if (rating <= 6) return 'bg-yellow-500';
      if (rating <= 8) return 'bg-orange-500';
      return 'bg-green-500';
    };

    const getRatingColorWithFilter = (rating: number, isSelected: boolean) => {
      if (selectedRating.length > 0 && !isSelected) {
        return 'bg-gray-500'; // Gray when filter is active but not selected
      }
      return getRatingColor(rating);
    };

    return (
      <div
        className={`bg-gray-800 rounded-lg border transition-all duration-300 ${
          selectedRating.length > 0 ? 'border-blue-500 bg-blue-500/5' : 'border-gray-700'
        }`}
      >
        <div className="px-3 py-2 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-medium text-white">Phân bố đánh giá</h3>
              <p className="text-gray-400 text-xs">Nhấp vào thanh để lọc</p>
            </div>
            {selectedRating.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-blue-400 text-xs">
                  Đang lọc: {selectedRating.join(', ')}/10
                </span>
                <button
                  onClick={() => setSelectedRating([])}
                  className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                >
                  Xóa
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="p-3">
          <div className="space-y-1">
            {analytics.ratingDistribution.map((item) => {
              const percentage =
                analytics.totalReviews > 0 ? (item.count / analytics.totalReviews) * 100 : 0;

              const isSelected = selectedRating.includes(item.rating);

              return (
                <div
                  key={item.rating}
                  className={`group cursor-pointer rounded p-1 transition-all duration-200 ${
                    isSelected ? 'bg-blue-500/20 border border-blue-500/50' : 'hover:bg-gray-700/50'
                  }`}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedRating(selectedRating.filter((r) => r !== item.rating));
                    } else {
                      setSelectedRating([...selectedRating, item.rating]);
                    }
                  }}
                >
                  <div className="flex items-center space-x-2">
                    {/* Rating Number */}
                    <div
                      className={`w-5 h-5 rounded-full ${getRatingColorWithFilter(item.rating, isSelected)} flex items-center justify-center ${
                        isSelected ? 'ring-1 ring-blue-400' : ''
                      }`}
                    >
                      <span className="text-white font-bold text-xs">{item.rating}</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="flex-1 min-w-0">
                      <div className="bg-gray-700 rounded-full h-2 relative overflow-hidden">
                        <div
                          className={`h-full ${getRatingColorWithFilter(item.rating, isSelected)} rounded-full transition-all duration-300 ${
                            isSelected ? 'ring-1 ring-blue-400' : ''
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>

                    {/* Count */}
                    <div className="text-right min-w-0">
                      <span
                        className={`text-xs font-medium ${
                          isSelected
                            ? 'text-blue-400'
                            : selectedRating.length > 0
                              ? 'text-gray-500'
                              : 'text-gray-300'
                        }`}
                      >
                        {item.count}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Compact Summary */}
          <div className="mt-2 pt-2 border-t border-gray-700">
            <div className="flex items-center justify-center space-x-4 text-xs">
              <div className="flex items-center space-x-1">
                <div
                  className={`w-1.5 h-1.5 ${selectedRating.length === 0 ? 'bg-red-500' : 'bg-gray-500'} rounded-full`}
                ></div>
                <span className="text-gray-400">1-3</span>
              </div>
              <div className="flex items-center space-x-1">
                <div
                  className={`w-1.5 h-1.5 ${selectedRating.length === 0 ? 'bg-yellow-500' : 'bg-gray-500'} rounded-full`}
                ></div>
                <span className="text-gray-400">4-6</span>
              </div>
              <div className="flex items-center space-x-1">
                <div
                  className={`w-1.5 h-1.5 ${selectedRating.length === 0 ? 'bg-orange-500' : 'bg-gray-500'} rounded-full`}
                ></div>
                <span className="text-gray-400">7-8</span>
              </div>
              <div className="flex items-center space-x-1">
                <div
                  className={`w-1.5 h-1.5 ${selectedRating.length === 0 ? 'bg-green-500' : 'bg-gray-500'} rounded-full`}
                ></div>
                <span className="text-gray-400">9-10</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }, [analytics, selectedRating]);

  // Memoized reviews list
  const ReviewsList = useMemo(() => {
    return (
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-white">Danh sách đánh giá</h3>
              <p className="text-gray-400 text-sm mt-1">
                {reviews.length} đánh giá trong khoảng thời gian đã chọn
                {selectedRating.length > 0 && (
                  <span className="text-blue-400">
                    {' '}
                    • Lọc theo {selectedRating.join(', ')}/10 sao
                  </span>
                )}
              </p>
            </div>
            {selectedRating.length > 0 && (
              <button
                onClick={() => setSelectedRating([])}
                className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded-md transition-colors"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        </div>

        {reviews.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-gradient-to-r from-pink-500 to-rose-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-medium text-gray-300 mb-2">Không có đánh giá</h3>
            <p className="text-gray-500">Không có đánh giá nào trong khoảng thời gian này</p>
          </div>
        ) : (
          <div className="bg-gray-900 rounded-lg p-4 space-y-6">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="p-4 sm:p-6 bg-gray-800 rounded-lg border border-gray-700"
              >
                {/* Desktop: Rating on top */}
                <div className="hidden sm:flex items-center space-x-3 mb-4">
                  <div
                    className={`p-2 rounded-lg ${getRatingBgColor(review.rating)} flex items-center justify-center flex-shrink-0`}
                  >
                    <div className="text-center">
                      <span className={`text-lg font-bold ${getRatingColor(review.rating)}`}>
                        {review.rating}
                      </span>
                    </div>
                  </div>
                  <div className={`text-sm font-medium ${getRatingColor(review.rating)}`}>
                    {decodeHtmlEntities(review.ratingDescription)}
                  </div>
                </div>

                {/* Mobile: Rating on left */}
                <div className="flex sm:hidden items-start space-x-3 mb-4">
                  <div
                    className={`p-3 rounded-lg ${getRatingBgColor(review.rating)} w-16 h-16 flex items-center justify-center flex-shrink-0`}
                  >
                    <div className="text-center">
                      <div className={`text-xl font-bold ${getRatingColor(review.rating)} mb-0.5`}>
                        {review.rating}
                      </div>
                      <div
                        className={`text-xs font-medium ${getRatingColor(review.rating)} leading-tight`}
                      >
                        {decodeHtmlEntities(review.ratingDescription)}
                      </div>
                    </div>
                  </div>

                  {/* Review Content for Mobile */}
                  <div className="flex-1 min-w-0">
                    {/* Header: Customer Name and Date */}
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-white font-semibold text-lg">
                        {decodeHtmlEntities(review.customerName)}
                      </h4>
                      <span className="text-gray-400 text-sm">
                        {formatDateTimeForDisplay(review.dateCreated)}
                      </span>
                    </div>

                    {/* Main Review Detail - Championed */}
                    {review.reviewDetail && (
                      <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-4 mb-4">
                        <div className="flex items-start space-x-2">
                          <div className="text-blue-400 mt-0.5">
                            <MessageSquare className="w-4 h-4" />
                          </div>
                          <div className="flex-1">
                            <p className="text-white text-base leading-relaxed italic">
                              &ldquo;{decodeHtmlEntities(review.reviewDetail)}&rdquo;
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Information Sections for Mobile */}
                    <div className="space-y-3">
                      {/* Client Information */}
                      <div className="bg-gray-700/30 rounded-lg p-3">
                        <h5 className="text-blue-400 font-medium text-sm mb-2 flex items-center">
                          <User className="w-4 h-4 mr-2" />
                          Thông tin khách hàng
                        </h5>
                        <div className="space-y-1 text-sm">
                          {review.phoneNumber && (
                            <div className="flex items-center text-gray-300">
                              <span className="text-gray-400 w-16">SĐT:</span>
                              <span>
                                {formatPhoneNumber(decodeHtmlEntities(review.phoneNumber))}
                              </span>
                            </div>
                          )}
                          {review.emailAddress && (
                            <div className="flex items-center text-gray-300">
                              <span className="text-gray-400 w-16">Email:</span>
                              <span>{decodeHtmlEntities(review.emailAddress)}</span>
                            </div>
                          )}
                          {review.invoiceNumber && (
                            <div className="flex items-center text-gray-300">
                              <span className="text-gray-400 w-16">Biên lai:</span>
                              <span className="font-mono">
                                {decodeHtmlEntities(review.invoiceNumber)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Helper Information */}
                      {review.helperName && (
                        <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-lg p-3">
                          <h5 className="text-green-400 font-medium text-sm mb-3 flex items-center">
                            <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center mr-2">
                              <User className="w-3 h-3 text-green-400" />
                            </div>
                            Nhân viên phục vụ
                          </h5>
                          <div className="flex items-center">
                            <div className="bg-green-500/20 rounded-full px-3 py-1.5 border border-green-500/40">
                              <span className="text-green-300 font-semibold text-sm">
                                {decodeHtmlEntities(review.helperName)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Desktop: Full content layout */}
                <div className="hidden sm:block">
                  {/* Header: Customer Name and Date */}
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-white font-semibold text-lg">
                      {decodeHtmlEntities(review.customerName)}
                    </h4>
                    <span className="text-gray-400 text-sm">
                      {formatDateTimeForDisplay(review.dateCreated)}
                    </span>
                  </div>

                  {/* Main Review Detail - Championed */}
                  {review.reviewDetail && (
                    <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-4 mb-4">
                      <div className="flex items-start space-x-2">
                        <div className="text-blue-400 mt-0.5">
                          <MessageSquare className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <p className="text-white text-base leading-relaxed italic">
                            &ldquo;{decodeHtmlEntities(review.reviewDetail)}&rdquo;
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Information Sections for Desktop */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Client Information */}
                    <div className="bg-gray-700/30 rounded-lg p-3">
                      <h5 className="text-blue-400 font-medium text-sm mb-2 flex items-center">
                        <User className="w-4 h-4 mr-2" />
                        Thông tin khách hàng
                      </h5>
                      <div className="space-y-1 text-sm">
                        {review.phoneNumber && (
                          <div className="flex items-center text-gray-300">
                            <span className="text-gray-400 w-16">SĐT:</span>
                            <span>{formatPhoneNumber(decodeHtmlEntities(review.phoneNumber))}</span>
                          </div>
                        )}
                        {review.emailAddress && (
                          <div className="flex items-center text-gray-300">
                            <span className="text-gray-400 w-16">Email:</span>
                            <span>{decodeHtmlEntities(review.emailAddress)}</span>
                          </div>
                        )}
                        {review.invoiceNumber && (
                          <div className="flex items-center text-gray-300">
                            <span className="text-gray-400 w-16">Biên lai:</span>
                            <span className="font-mono">
                              {decodeHtmlEntities(review.invoiceNumber)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Helper Information */}
                    {review.helperName && (
                      <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-lg p-3">
                        <h5 className="text-green-400 font-medium text-sm mb-3 flex items-center">
                          <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center mr-2">
                            <User className="w-3 h-3 text-green-400" />
                          </div>
                          Nhân viên phục vụ
                        </h5>
                        <div className="flex items-center">
                          <div className="bg-green-500/20 rounded-full px-3 py-1.5 border border-green-500/40">
                            <span className="text-green-300 font-semibold text-sm">
                              {decodeHtmlEntities(review.helperName)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }, [reviews, selectedRating]);

  return (
    <div className="h-full bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <div className="flex-1">
            <h1 className="text-lg sm:text-xl font-semibold text-white">
              Báo cáo đánh giá dịch vụ khách hàng
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Phân tích phản hồi và đánh giá từ khách hàng về chất lượng dịch vụ
            </p>
          </div>

          {/* Date Range Display and Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <div className="text-center sm:text-right">
              <p className="text-sm text-gray-400">Khoảng thời gian</p>
              <p className="text-white font-medium text-sm sm:text-base">{formatDateRange()}</p>
              <p className="text-xs text-gray-500 mt-1">
                {selectedFilter === 'daily' && 'Hôm nay'}
                {selectedFilter === 'weekly' && 'Tuần này'}
                {selectedFilter === 'monthly' && 'Tháng này'}
              </p>
            </div>
            <div className="flex items-center justify-center sm:justify-start space-x-2">
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

        {/* Custom Date Picker */}
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
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6">
        {!analytics && !reviews.length && (loading || analyticsLoading) ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-400 mt-4">Đang tải dữ liệu...</p>
          </div>
        ) : (
          <>
            {/* Analytics Cards */}
            {AnalyticsCards}

            {/* Rating Distribution Graph */}
            {RatingDistribution}

            {/* Reviews List */}
            {loading ? (
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 mt-6">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-400 mt-3 text-sm">Đang cập nhật danh sách...</p>
                </div>
              </div>
            ) : (
              <div className="mt-6">{ReviewsList}</div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CustomerServiceReviewReport;
