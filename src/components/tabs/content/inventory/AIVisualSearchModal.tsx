import React, { useState, useRef, useCallback } from 'react';
import { X, Camera, Upload, Search, Loader2, RefreshCw, MessageCircle, Shield } from 'lucide-react';
import { useUser } from '@/context/UserContext';
import SecureTrainingModal from './SecureTrainingModal';

interface AIVisualSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSearchResults: (results: Record<string, unknown>[]) => void;
  onSelectResult: (result: Record<string, unknown>) => void;
}

interface AIAnalysis {
  description: string;
  category: string;
  colors: string[];
  style: string;
  materials: string[];
  keywords: string[];
  pattern?: string;
  features?: string[];
}

export default function AIVisualSearchModal({
  isOpen,
  onClose,
  onSearchResults,
  onSelectResult,
}: AIVisualSearchModalProps) {
  const { sessionToken, currentUser } = useUser();
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [userQuery, setUserQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Record<string, unknown>[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [conversationStep, setConversationStep] = useState<
    'upload' | 'analyzing' | 'results' | 'retry'
  >('upload');
  const [displayedResults, setDisplayedResults] = useState<Record<string, unknown>[]>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const [isShowingResults, setIsShowingResults] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isCheckingVerification, setIsCheckingVerification] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Check if user is admin
  const isAdmin = currentUser?.role === 'admin';

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const resetModal = useCallback(() => {
    setImage(null);
    setAnalysis(null);
    setUserQuery('');
    setError(null);
    setSearchResults([]);
    setDisplayedResults([]);
    setCurrentResultIndex(0);
    setIsShowingResults(false);
    setConversationStep('upload');
    setIsSearching(false);
    setIsVerified(false);
    setShowVerificationModal(false);
    setIsCheckingVerification(false);
    stopCamera();
  }, [stopCamera]);

  const checkVerificationStatus = useCallback(async () => {
    try {
      console.log('🔍 Checking verification status...');
      const response = await fetch('/api/inventory/ai-visual-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ checkVerification: true }),
      });

      console.log('📡 Verification check response status:', response.status);
      const data = await response.json();
      console.log('📡 Verification check response data:', data);

      if (response.status === 403) {
        if (data.reason === 'verification_required') {
          console.log('🔒 Verification required, showing modal');
          setIsVerified(false);
          setShowVerificationModal(true);
          setIsCheckingVerification(false);
          return;
        }
      }

      // If we get here, verification is successful
      console.log('✅ Verification successful, updating state');
      setIsVerified(true);
      setShowVerificationModal(false);
      setIsCheckingVerification(false);
      console.log('✅ State updated: isVerified=true, showVerificationModal=false');
    } catch (error) {
      console.error('❌ Failed to check verification status:', error);
      // On error, assume verification is required
      console.log('🔒 Error occurred, showing verification modal');
      setIsVerified(false);
      setShowVerificationModal(true);
      setIsCheckingVerification(false);
    }
  }, [sessionToken]);

  // Check verification status when modal opens
  React.useEffect(() => {
    if (isOpen) {
      console.log('🚀 Modal opened, starting verification check');
      setIsCheckingVerification(true);
      setIsVerified(false);
      setShowVerificationModal(false);
      checkVerificationStatus();
    }
  }, [isOpen, checkVerificationStatus]);

  const handleVerificationSuccess = useCallback(() => {
    console.log('🎉 Verification success callback triggered');
    setIsVerified(true);
    setShowVerificationModal(false);
  }, []);

  const handleVerificationClose = useCallback(() => {
    console.log('❌ Verification modal closed');
    setShowVerificationModal(false);
    // After verification modal closes, check if verification was successful
    setTimeout(() => {
      console.log('🔄 Checking verification status after modal close');
      checkVerificationStatus();
    }, 1000); // Wait a bit for the API to update
  }, [checkVerificationStatus]);

  // Add a force close handler for when user clicks X
  const handleForceClose = useCallback(() => {
    console.log('❌ Force close button clicked');
    resetModal();
    onClose();
  }, [resetModal, onClose]);

  // Debug effect to log state changes
  React.useEffect(() => {
    console.log('🔄 State changed:', {
      isCheckingVerification,
      showVerificationModal,
      isVerified,
      isOpen,
    });
  }, [isCheckingVerification, showVerificationModal, isVerified, isOpen]);

  // Listen for verification success from SecureTrainingModal
  React.useEffect(() => {
    if (showVerificationModal && isVerified) {
      console.log('🔄 Verification completed, hiding verification modal');
      setShowVerificationModal(false);
    }
  }, [showVerificationModal, isVerified]);

  // Remove periodic verification check to prevent loops
  // React.useEffect(() => {
  //   if (isOpen && !isVerified && !showVerificationModal && !isCheckingVerification) {
  //     console.log('⏰ Periodic verification check');
  //     const interval = setInterval(() => {
  //       checkVerificationStatus();
  //     }, 2000); // Check every 2 seconds

  //     return () => clearInterval(interval);
  //   }
  // }, [isOpen, isVerified, showVerificationModal, isCheckingVerification, checkVerificationStatus]);

  // Remove the timeout that prevents closing
  // React.useEffect(() => {
  //   if (isOpen && !isVerified && !showVerificationModal && !isCheckingVerification) {
  //     const timeout = setTimeout(() => {
  //       console.log('⏰ Verification timeout, closing modal');
  //       onClose();
  //     }, 10000); // Close after 10 seconds if no verification

  //     return () => clearTimeout(timeout);
  //   }
  // }, [isOpen, isVerified, showVerificationModal, isCheckingVerification, onClose]);

  // Get user's first name for personalization
  const getUserFirstName = () => {
    if (!currentUser?.name) return 'Bạn';
    const nameParts = currentUser.name.split(' ');
    return nameParts[nameParts.length - 1] || currentUser.name; // Vietnamese names: last part is given name
  };

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      // Check verification before allowing file selection
      if (!isVerified) {
        setShowVerificationModal(true);
        return;
      }

      const file = event.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setImage(e.target?.result as string);
          setError(null);
          setConversationStep('upload');
        };
        reader.readAsDataURL(file);
      }
    },
    [isVerified]
  );

  const startCamera = useCallback(async () => {
    // Check verification before allowing camera access
    if (!isVerified) {
      setShowVerificationModal(true);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setError('Không thể truy cập camera');
    }
  }, [isVerified]);

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);

        const imageData = canvas.toDataURL('image/jpeg');
        setImage(imageData);
        stopCamera();
        setError(null);
        setConversationStep('upload');
      }
    }
  }, [stopCamera]);

  const searchSimilarItems = useCallback(
    async (aiAnalysis: AIAnalysis, isRetry = false) => {
      try {
        setConversationStep('analyzing');
        setIsSearching(true);

        // Use the database search results from the backend instead of doing our own search
        // The backend now provides databaseSearchResults with items matching Vietnamese patterns

        // For now, we'll still do the original search as fallback, but prioritize database results
        let searchStrategies: Array<Record<string, string>> = [];

        if (!isRetry) {
          // Initial search strategies
          searchStrategies = [
            // Strategy 1: Full keywords with category
            {
              query: aiAnalysis.keywords.join(' '),
              category: aiAnalysis.category,
              limit: '3',
            },
            // Strategy 2: Category only with broader search
            {
              query: aiAnalysis.category,
              limit: '2',
            },
          ];

          // Strategy 3: Color-based search
          if (aiAnalysis.colors?.length > 0) {
            searchStrategies.push({
              query: aiAnalysis.colors.join(' '),
              category: aiAnalysis.category,
              limit: '2',
            });
          }

          // Strategy 4: Pattern-based search
          if (aiAnalysis.pattern) {
            searchStrategies.push({
              query: aiAnalysis.pattern,
              limit: '1',
            });
          }
        } else {
          // Retry strategies - different approach
          searchStrategies = [
            // Strategy 1: Broader category search without specific keywords
            {
              query: aiAnalysis.category,
              limit: '3',
            },
            // Strategy 2: Material-based search
            ...(aiAnalysis.materials?.length > 0
              ? [
                  {
                    query: aiAnalysis.materials.join(' '),
                    limit: '2',
                  },
                ]
              : []),
            // Strategy 3: Style-based search
            ...(aiAnalysis.style
              ? [
                  {
                    query: aiAnalysis.style,
                    limit: '2',
                  },
                ]
              : []),
            // Strategy 4: Feature-based search
            ...(aiAnalysis.features && aiAnalysis.features.length > 0
              ? [
                  {
                    query: aiAnalysis.features.join(' '),
                    limit: '2',
                  },
                ]
              : []),
            // Strategy 5: Alternative keywords (skip first few)
            {
              query: aiAnalysis.keywords.slice(2).join(' '),
              category: aiAnalysis.category,
              limit: '2',
            },
          ];
        }

        const allResults: Record<string, unknown>[] = [];
        const seenIds = new Set<number>();

        // Execute all search strategies
        for (const strategy of searchStrategies) {
          try {
            const searchParams = new URLSearchParams(strategy);

            // For retry, add pagination to get different results
            if (isRetry) {
              searchParams.set('page', '2'); // Get page 2 for different results
            }

            const response = await fetch(`/api/inventory/search-typesense?${searchParams}`, {
              headers: {
                Authorization: `Bearer ${sessionToken}`,
              },
            });
            const data = await response.json();

            if (response.ok && data.items) {
              // Add unique results only
              data.items.forEach((item: Record<string, unknown>) => {
                const itemId = item.id as number;
                if (!seenIds.has(itemId)) {
                  seenIds.add(itemId);
                  allResults.push(item);
                }
              });
            }
          } catch (error) {
            console.warn('Search strategy failed:', strategy, error);
            // Continue with other strategies
          }
        }

        // Limit to 5 results total
        const finalResults = allResults.slice(0, 5);

        if (finalResults.length > 0) {
          setSearchResults((prev) => (isRetry ? [...prev, ...finalResults] : finalResults));
          onSearchResults(finalResults);

          // Start showing results one by one
          setConversationStep('results');
          setCurrentResultIndex(0);
          setDisplayedResults([]);
          setIsShowingResults(true);

          // Animate results appearing one by one
          finalResults.forEach((result: Record<string, unknown>, index: number) => {
            setTimeout(
              () => {
                setDisplayedResults((prev) => [...prev, result]);
                setCurrentResultIndex(index + 1);
              },
              (index + 1) * 800
            ); // Show each result with 800ms delay
          });
        } else {
          setError('Không tìm thấy sản phẩm tương tự');
          setConversationStep('upload');
        }
      } catch {
        setError('Lỗi khi tìm kiếm sản phẩm tương tự');
        setConversationStep('upload');
      } finally {
        setIsSearching(false);
      }
    },
    [onSearchResults, sessionToken]
  );

  const analyzeImage = useCallback(async () => {
    if (!image) return;

    setIsAnalyzing(true);
    setError(null);
    setConversationStep('analyzing');

    try {
      const response = await fetch(image);
      const blob = await response.blob();

      const formData = new FormData();
      formData.append('image', blob, 'image.jpg');
      if (userQuery) {
        formData.append('query', userQuery);
      }

      const result = await fetch('/api/inventory/ai-visual-search', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
        body: formData,
      });

      const data = await result.json();

      if (!result.ok) {
        throw new Error(data.error || 'AI analysis failed');
      }

      setAnalysis(data.analysis);

      // Use database search results from backend if available
      if (data.databaseSearchResults && data.databaseSearchResults.length > 0) {
        console.log('🔍 Using database search results from backend:', data.databaseSearchResults);
        setSearchResults(data.databaseSearchResults);
        onSearchResults(data.databaseSearchResults);

        // Start showing results one by one
        setConversationStep('results');
        setCurrentResultIndex(0);
        setDisplayedResults([]);
        setIsShowingResults(true);

        // Animate results appearing one by one
        data.databaseSearchResults.forEach((result: Record<string, unknown>, index: number) => {
          setTimeout(
            () => {
              setDisplayedResults((prev) => [...prev, result]);
              setCurrentResultIndex(index + 1);
            },
            (index + 1) * 800
          ); // Show each result with 800ms delay
        });
      } else {
        // Fallback to original search if no database results
        console.log('🔍 No database search results, using fallback search');
        await searchSimilarItems(data.analysis);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI analysis failed');
      setConversationStep('upload');
    } finally {
      setIsAnalyzing(false);
    }
  }, [image, userQuery, searchSimilarItems, sessionToken]);

  const handleResultSelect = useCallback(
    (result: Record<string, unknown>) => {
      onSelectResult(result);
      onClose();
    },
    [onSelectResult, onClose]
  );

  const handleRetry = useCallback(async () => {
    if (analysis) {
      setConversationStep('retry');
      await searchSimilarItems(analysis, true);
    }
  }, [analysis, searchSimilarItems]);

  const handleClose = useCallback(() => {
    console.log('❌ Main modal close button clicked');
    resetModal();
    onClose();
  }, [resetModal, onClose]);

  if (!isOpen) return null;

  console.log('🎭 Modal state:', {
    isCheckingVerification,
    showVerificationModal,
    isVerified,
    isOpen,
  });

  // Show loading state while checking verification
  if (isCheckingVerification) {
    console.log('⏳ Showing loading state');
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Đang kiểm tra quyền truy cập...</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-1">
              <X size={20} />
            </button>
          </div>
          <div className="flex items-center justify-center mb-4">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
          <p className="text-gray-700 text-center text-sm">Vui lòng chờ trong giây lát</p>
        </div>
      </div>
    );
  }

  // Show verification modal if required
  if (showVerificationModal || (!isVerified && !isCheckingVerification)) {
    console.log('🔒 Showing verification modal');
    return <SecureTrainingModal isOpen={true} onClose={onClose} function="search" />;
  }

  console.log('🎯 Showing main Sutygon-Bot interface');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center">
            <MessageCircle size={20} className="mr-2 text-blue-500" />
            Sutygon-Bot
          </h2>
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-700 p-1">
            <X size={20} className="sm:w-6 sm:h-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-800 rounded text-sm">
            {error}
          </div>
        )}

        {/* Conversation Flow */}
        {conversationStep === 'upload' && !image && (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-gray-700 mb-4 text-sm sm:text-base">
                Xin chào {getUserFirstName()}! 👋 Tôi có thể giúp bạn tìm sản phẩm tương tự. Hãy
                chụp ảnh hoặc tải lên hình ảnh sản phẩm nhé!
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <button
                onClick={startCamera}
                className="flex flex-col items-center p-3 sm:p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <Camera size={24} className="sm:w-8 sm:h-8 text-blue-500 mb-2" />
                <span className="text-xs sm:text-sm font-medium text-gray-700">Chụp ảnh</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center p-3 sm:p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <Upload size={24} className="sm:w-8 sm:h-8 text-blue-500 mb-2" />
                <span className="text-xs sm:text-sm font-medium text-gray-700">Tải lên</span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}

        {image && (
          <div className="space-y-4">
            {/* Image Preview with Thumbnail */}
            <div className="flex items-start space-x-4">
              <div className="relative flex-shrink-0">
                <img
                  src={image}
                  alt="Selected"
                  className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg border-2 border-gray-200"
                />
                <button
                  onClick={() => setImage(null)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <X size={12} />
                </button>
              </div>

              <div className="flex-1">
                <p className="text-sm text-gray-700 mb-2">
                  {getUserFirstName()}, tôi thấy bạn đã chọn ảnh rồi!
                  {userQuery && ` Bạn muốn tìm: "${userQuery}"`}
                </p>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-900 mb-1 sm:mb-2">
                    Mô tả thêm (tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    placeholder="Ví dụ: Tìm áo dài màu đỏ, giá dưới 500k..."
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm placeholder-gray-500"
                  />
                </div>
              </div>
            </div>

            {conversationStep === 'upload' && (
              <button
                onClick={analyzeImage}
                disabled={isAnalyzing}
                className="w-full bg-blue-500 text-white py-2 sm:py-3 px-4 rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center text-sm sm:text-base font-medium"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 size={16} className="sm:w-5 sm:h-5 animate-spin mr-2" />
                    AI đang phân tích...
                  </>
                ) : (
                  <>
                    <Search size={16} className="sm:w-5 sm:h-5 mr-2" />
                    🔍 Tìm kiếm sản phẩm tương tự
                  </>
                )}
              </button>
            )}

            {/* Analysis Results */}
            {analysis && conversationStep === 'analyzing' && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <h3 className="font-medium mb-2 text-gray-900 text-sm">Phân tích:</h3>
                <div className="text-xs space-y-1 text-gray-700">
                  <p>
                    <strong>Danh mục:</strong> {analysis.category}
                  </p>
                  <p>
                    <strong>Màu sắc:</strong> {analysis.colors.join(', ')}
                  </p>
                  {analysis.pattern && (
                    <p>
                      <strong>Hoa văn:</strong> {analysis.pattern}
                    </p>
                  )}
                  <p>
                    <strong>Từ khóa:</strong> {analysis.keywords.slice(0, 3).join(', ')}
                  </p>
                </div>
              </div>
            )}

            {/* Search Results */}
            {conversationStep === 'results' && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900 text-base sm:text-lg">
                    🎯 Kết quả tìm kiếm cho {getUserFirstName()}
                  </h3>
                  <button
                    onClick={handleRetry}
                    disabled={isSearching}
                    className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    <RefreshCw size={14} className={`mr-1 ${isSearching ? 'animate-spin' : ''}`} />
                    {isSearching ? 'Đang tìm...' : 'Tìm thêm'}
                  </button>
                </div>

                <div className="space-y-3 max-h-64 sm:max-h-80 overflow-y-auto">
                  {displayedResults.map((result, index) => (
                    <div
                      key={`ai-result-${index}`}
                      onClick={() => handleResultSelect(result)}
                      className="p-3 bg-white border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-all duration-300 shadow-sm transform hover:scale-[1.02]"
                      style={{
                        opacity: isShowingResults ? 1 : 0,
                        transform: isShowingResults ? 'translateY(0)' : 'translateY(10px)',
                        transition: `all 0.3s ease ${index * 0.1}s`,
                      }}
                    >
                      <div className="flex items-center space-x-3">
                        {(result.imageUrl as string) ? (
                          <img
                            src={result.imageUrl as string}
                            alt={result.name as string}
                            className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg flex-shrink-0 border border-gray-200"
                          />
                        ) : (
                          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-gray-500 text-xs">📷</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate text-sm sm:text-base">
                            {result.name as string}
                          </p>
                          <p className="text-xs sm:text-sm text-gray-600 mb-1">
                            {result.category as string}
                          </p>
                          {(result.formattedId as string) && (
                            <p className="text-xs text-blue-600 font-mono">
                              #{result.formattedId as string}
                            </p>
                          )}
                        </div>
                        <div className="text-blue-500 flex-shrink-0">
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                  ))}

                  {isSearching && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-center">
                        <Loader2 className="animate-spin w-4 h-4 sm:w-5 sm:h-5 text-blue-500 mr-2" />
                        <span className="text-blue-700 text-sm sm:text-base">
                          🔍 Đang tìm thêm sản phẩm...
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {displayedResults.length > 0 && (
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Đã tìm thấy {displayedResults.length} sản phẩm. Nhấp vào để xem chi tiết!
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {streamRef.current && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 max-w-md w-full">
              <h3 className="text-lg font-medium mb-4 text-gray-900">Chụp ảnh</h3>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-48 sm:h-64 object-cover rounded-lg mb-4"
              />
              <canvas ref={canvasRef} className="hidden" />
              <div className="flex space-x-2">
                <button
                  onClick={capturePhoto}
                  className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 text-sm font-medium"
                >
                  Chụp
                </button>
                <button
                  onClick={stopCamera}
                  className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 text-sm font-medium"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
