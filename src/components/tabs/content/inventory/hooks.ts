import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { InventoryItem, AddItemFormState } from '@/types/inventory';
import { useUser } from '@/context/UserContext';

// Optimized search hook with debouncing and server-side search
export function useInventorySearch() {
  const { sessionToken } = useUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<InventoryItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const currentSearchIdRef = useRef(0); // Use ref instead of state to avoid closure issues
  const timeoutRef = useRef<NodeJS.Timeout | null>(null); // Track timeout for cleanup

  // Debug: Track search results changes
  useEffect(() => {
    console.log(`Search results updated: ${searchResults.length} items for query "${searchQuery}"`);
    if (searchResults.length > 0) {
      console.log('First result:', searchResults[0]);
    }
  }, [searchResults, searchQuery]);

  // Debug: Track loading state changes
  useEffect(() => {
    console.log(
      `Loading state changed: isSearching=${isSearching}, isLoadingMore=${isLoadingMore}`
    );
  }, [isSearching, isLoadingMore]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Simplified debounced search function with race condition protection
  const debouncedSearch = useCallback(
    debounce(async (query: unknown, page: unknown = 1, searchId: unknown = 0) => {
      const searchQuery = query as string;
      const searchPage = page as number;
      const requestSearchId = searchId as number;

      console.log(
        `Debounced search called: "${searchQuery}", page: ${searchPage}, searchId: ${requestSearchId}`
      );

      // Don't search if query is empty
      if (!searchQuery.trim()) {
        setSearchResults([]);
        setHasMore(false);
        setTotal(0);
        setIsSearching(false);
        setIsLoadingMore(false);
        return;
      }

      // Set loading state
      if (searchPage === 1) {
        setIsSearching(true);
        console.log('Setting isSearching to true');

        // Clear any existing timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        // Add timeout to clear loading state if search takes too long
        timeoutRef.current = setTimeout(() => {
          if (requestSearchId === currentSearchIdRef.current) {
            console.log('Search timeout, clearing loading state');
            setIsSearching(false);
          }
        }, 10000); // 10 second timeout
      } else {
        setIsLoadingMore(true);
        console.log('Setting isLoadingMore to true');

        // Clear any existing timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        // Add timeout for load more as well
        timeoutRef.current = setTimeout(() => {
          if (requestSearchId === currentSearchIdRef.current) {
            console.log('Load more timeout, clearing loading state');
            setIsLoadingMore(false);
          }
        }, 10000); // 10 second timeout
      }
      setSearchError('');

      try {
        console.log(`Making search request for: "${searchQuery}"`);
        const response = await fetch(
          `/api/inventory/search-typesense?q=${encodeURIComponent(searchQuery)}&page=${searchPage}&limit=20`,
          {
            headers: {
              Authorization: `Bearer ${sessionToken}`,
            },
          }
        );

        console.log(`Search response status: ${response.status}`);
        if (!response.ok) {
          throw new Error('Search failed');
        }

        const data = await response.json();
        console.log(`Search response data:`, {
          items: data.items?.length || 0,
          total: data.total,
          hasMore: data.hasMore,
        });

        // Check if this is still the current search using ref
        if (requestSearchId !== currentSearchIdRef.current) {
          console.log(
            `Search outdated (${requestSearchId} vs ${currentSearchIdRef.current}), ignoring results`
          );
          return;
        }

        // Check if API returned an error
        if (data.error) {
          console.log('Search API returned error:', data.error);
          setSearchError(data.error);
          setSearchResults([]);
          setHasMore(false);
          setTotal(0);
          return;
        }

        // Process results
        if (searchPage === 1) {
          const items = data.items || [];
          const uniqueItems = items.filter(
            (item: InventoryItem, index: number, self: InventoryItem[]) =>
              index === self.findIndex((t) => t.id === item.id)
          );
          setSearchResults(uniqueItems);
          console.log(`Search completed for "${searchQuery}": ${uniqueItems.length} results`);
        } else {
          setSearchResults((prev) => {
            const existingIds = new Set(prev.map((item) => item.id));
            const newItems = (data.items || []).filter(
              (item: InventoryItem) => !existingIds.has(item.id)
            );
            return [...prev, ...newItems];
          });
        }

        setHasMore(data.hasMore || false);
        setTotal(data.total || 0);
        setCurrentPage(data.page || 1);
      } catch (error) {
        console.error('Search error:', error);
        setSearchError('Có lỗi khi tìm kiếm sản phẩm');
        setSearchResults([]);
        setHasMore(false);
        setTotal(0);
      } finally {
        // Only clear loading state if this is still the current search
        if (requestSearchId === currentSearchIdRef.current) {
          console.log('Clearing loading state');
          // Clear timeout since search completed
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          if (searchPage === 1) {
            setIsSearching(false);
            console.log('Setting isSearching to false');
          } else {
            setIsLoadingMore(false);
            console.log('Setting isLoadingMore to false');
          }
        }
      }
    }, 500), // Increased from 300ms to 500ms to prevent rapid searches
    [sessionToken]
  );

  const handleSearch = useCallback(
    (query: string) => {
      console.log(`Search requested: "${query}"`);
      setSearchQuery(query);
      setCurrentPage(1);
      // Generate new search ID to cancel any pending searches
      const newSearchId = Date.now();
      currentSearchIdRef.current = newSearchId;
      debouncedSearch(query, 1, newSearchId);
    },
    [debouncedSearch]
  );

  const loadMore = useCallback(() => {
    if (hasMore && !isSearching && !isLoadingMore && searchQuery.trim()) {
      const newSearchId = Date.now();
      currentSearchIdRef.current = newSearchId;
      debouncedSearch(searchQuery, currentPage + 1, newSearchId);
    }
  }, [hasMore, isSearching, isLoadingMore, searchQuery, currentPage, debouncedSearch]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setHasMore(false);
    setTotal(0);
    setCurrentPage(1);
    setSearchError('');
    setIsSearching(false);
    setIsLoadingMore(false);
    // Cancel any pending searches
    currentSearchIdRef.current = Date.now();
  }, []);

  return {
    searchQuery,
    searchResults,
    isSearching,
    isLoadingMore,
    searchError,
    hasMore,
    total,
    handleSearch,
    loadMore,
    clearSearch,
  };
}

// Debounce utility function
function debounce(
  func: (...args: unknown[]) => unknown,
  wait: number
): (...args: unknown[]) => void {
  let timeout: NodeJS.Timeout;
  return (...args: unknown[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Legacy hook for backward compatibility (will be deprecated)
export function useInventoryTable(inventory: InventoryItem[]) {
  const [searchQuery, setSearchQuery] = useState('');
  const [priceSort, setPriceSort] = useState<'asc' | 'desc' | null>(null);
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [lastModifiedSort, setLastModifiedSort] = useState<'asc' | 'desc' | null>(null);
  const [nameSort, setNameSort] = useState<'asc' | 'desc' | null>(null);
  const [idSort, setIdSort] = useState<'asc' | 'desc' | null>(null);

  const priceRangeInvalid = useMemo(
    () => priceRange.min && priceRange.max && Number(priceRange.max) < Number(priceRange.min),
    [priceRange.min, priceRange.max]
  );

  const filteredInventory = useMemo(() => {
    // Helper to remove accent marks with comprehensive Vietnamese support
    const normalize = (str: string) => {
      return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/[đ]/g, 'd') // Replace đ with d
        .replace(/[Đ]/g, 'D') // Replace Đ with D
        .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
        .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
        .replace(/[ìíịỉĩ]/g, 'i')
        .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
        .replace(/[ùúụủũưừứựửữ]/g, 'u')
        .replace(/[ỳýỵỷỹ]/g, 'y');
    };

    let result = inventory.filter((item: InventoryItem) => {
      if (priceRangeInvalid) return false;
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const formattedId = (item.formattedId || '').toLowerCase().replace(/-/g, '');
        const qNoDash = q.replace(/-/g, '');
        const inFormattedId = formattedId.includes(qNoDash);
        const inId = String(item.id).toLowerCase().includes(q);
        // Normalize both name and query for accent-insensitive search
        const normName = normalize(item.name.toLowerCase());
        const normQ = normalize(q);
        const queryWords = normQ.split(/\s+/).filter(Boolean);

        // Fuzzy ranking: count how many query words match name or tags
        let matchCount = 0;
        queryWords.forEach((word) => {
          if (normName.includes(word)) matchCount++;
        });
        item.tags.forEach((tag: string) => {
          const normTag = normalize(tag.toLowerCase());
          queryWords.forEach((word: string) => {
            if (normTag.includes(word)) matchCount++;
          });
        });
        // Only include if matches ID or at least one word in name/tags
        if (!(inFormattedId || inId || matchCount > 0)) return false;
        // Attach matchCount for later sorting
        (item as InventoryItem & { _matchCount?: number })._matchCount = matchCount;
      }
      if (selectedCategories.length > 0 && !selectedCategories.includes(item.category))
        return false;
      const price = getItemPrice(item);
      if (priceRange.min && price < Number(priceRange.min)) return false;
      if (priceRange.max && price > Number(priceRange.max)) return false;
      return true;
    });
    // Sort by matchCount descending if searching by name/tags
    if (searchQuery.trim()) {
      result = [...result].sort(
        (a, b) =>
          ((b as InventoryItem & { _matchCount?: number })._matchCount || 0) -
          ((a as InventoryItem & { _matchCount?: number })._matchCount || 0)
      );
    }
    if (priceSort) {
      result = [...result].sort((a, b) => {
        const pa = getItemPrice(a);
        const pb = getItemPrice(b);
        return priceSort === 'asc' ? pa - pb : pb - pa;
      });
    }
    if (nameSort) {
      result = [...result].sort((a, b) => {
        return nameSort === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      });
    }
    if (lastModifiedSort) {
      result = [...result].sort((a, b) => {
        const aId = String(a.id);
        const bId = String(b.id);
        return lastModifiedSort === 'asc' ? aId.localeCompare(bId) : bId.localeCompare(aId);
      });
    }
    if (idSort) {
      result = [...result].sort((a, b) => {
        const aId = a.formattedId || String(a.id);
        const bId = b.formattedId || String(b.id);
        return idSort === 'asc' ? aId.localeCompare(bId) : bId.localeCompare(aId);
      });
    }
    return result;
  }, [
    inventory,
    searchQuery,
    priceSort,
    priceRange,
    selectedCategories,
    lastModifiedSort,
    nameSort,
    idSort,
    priceRangeInvalid,
  ]);

  return {
    searchQuery,
    setSearchQuery,
    priceSort,
    setPriceSort,
    priceRange,
    setPriceRange,
    selectedCategories,
    setSelectedCategories,
    lastModifiedSort,
    setLastModifiedSort,
    nameSort,
    setNameSort,
    idSort,
    setIdSort,
    priceRangeInvalid,
    filteredInventory,
  };
}

// Helper function to get item price
function getItemPrice(item: InventoryItem): number {
  if (!item.sizes || item.sizes.length === 0) return 0;
  return Math.min(...item.sizes.map((size) => size.price));
}

const initialForm: AddItemFormState = {
  name: '',
  category: 'Áo Dài',
  tags: [],
  tagsInput: '',
  photoFile: null,
  sizes: [{ title: '', quantity: '', onHand: '', price: '' }],
  samePrice: true,
};

export function useInventoryModals(
  refreshInventory: () => void,
  setInventory?: React.Dispatch<React.SetStateAction<InventoryItem[]>>
) {
  const { currentUser, sessionToken, logout } = useUser();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [form, setForm] = useState<AddItemFormState>(initialForm);

  // Request deduplication - prevent multiple simultaneous save requests
  const saveRequestInProgress = useRef<Set<number>>(new Set());

  // Lightning mode state
  const [lightningMode, setLightningMode] = useState(false);
  const [heldTags, setHeldTags] = useState<string[]>([]);
  const [lastCategory, setLastCategory] = useState('');

  const resetAddItemForm = () => {
    setForm({
      name: '',
      category: '',
      tags: [],
      tagsInput: '',
      photoFile: null,
      sizes: [{ title: '', quantity: '', onHand: '', price: '' }],
      samePrice: true,
    });
  };

  const handleAddItemClick = () => {
    setAddModalOpen(true);
  };

  const handleEditItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setEditModalOpen(true);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const requestId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    console.log(`[${requestId}] 📤 Image upload started:`, {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      timestamp: new Date().toISOString(),
    });

    try {
      const formData = new FormData();
      formData.append('file', file);

      console.log(`[${requestId}] 🚀 Sending upload request to /api/upload`);
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
        body: formData,
      });

      console.log(`[${requestId}] 📡 Upload response:`, {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        timestamp: new Date().toISOString(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`[${requestId}] ❌ Upload failed:`, {
          status: response.status,
          statusText: response.statusText,
          errorData,
          fileInfo: {
            name: file.name,
            size: file.size,
            type: file.type,
          },
          timestamp: new Date().toISOString(),
        });
        throw new Error(errorData.error || `Upload failed: ${response.status}`);
      }

      const result = await response.json();
      console.log(`[${requestId}] ✅ Upload successful:`, {
        url: result.url ? 'URL received' : 'No URL returned',
        timestamp: new Date().toISOString(),
      });

      const duration = Date.now() - startTime;
      console.log(`[${requestId}] ✅ Image upload completed successfully in ${duration}ms`, {
        fileName: file.name,
        fileSize: file.size,
        duration,
        timestamp: new Date().toISOString(),
      });

      return result.url;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[${requestId}] ❌ Image upload failed after ${duration}ms:`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        fileInfo: {
          name: file.name,
          size: file.size,
          type: file.type,
        },
        duration,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  };

  const handleAddItem = async (shouldCloseModal: boolean = true) => {
    const requestId = `client-add-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    console.log(`[${requestId}] 🆕 Client-side inventory item creation started`);
    console.log(`[${requestId}] 📋 Form data:`, {
      name: form.name ? `${form.name.substring(0, 20)}...` : 'null',
      category: form.category,
      shouldCloseModal,
      timestamp: new Date().toISOString(),
    });

    try {
      setIsUploading(true);

      const tags = form.tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
        .slice(0, 10);

      const sizes = form.sizes.map((s) => ({
        title: s.title,
        quantity: parseInt(s.quantity, 10) || 0,
        onHand: parseInt(s.onHand, 10) || 0,
        price: parseInt(s.price.replace(/\D/g, ''), 10) || 0,
      }));

      console.log(`[${requestId}] 📋 Processed data:`, {
        tagCount: tags.length,
        sizeCount: sizes.length,
        tags: tags.slice(0, 3), // Log first 3 tags
        sizes: sizes.map((s) => ({
          title: s.title,
          quantity: s.quantity,
          onHand: s.onHand,
          price: s.price,
        })),
      });

      // Upload image if provided
      let imageUrl: string | undefined;
      if (form.photoFile) {
        console.log(`[${requestId}] 📤 Uploading image...`);
        try {
          const uploadedUrl = await uploadImage(form.photoFile);
          imageUrl = uploadedUrl || undefined;
          console.log(
            `[${requestId}] ✅ Image uploaded:`,
            imageUrl ? 'URL received' : 'No URL returned'
          );
        } catch (uploadError) {
          console.error(`[${requestId}] ❌ Image upload failed:`, {
            error: uploadError instanceof Error ? uploadError.message : String(uploadError),
            fileName: form.photoFile.name,
            fileSize: form.photoFile.size,
            fileType: form.photoFile.type,
            timestamp: new Date().toISOString(),
          });
          // Continue without image if upload fails
          imageUrl = undefined;
        }
      }

      // Create inventory item
      console.log(`[${requestId}] 🚀 Sending API request to /api/inventory`);
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          name: form.name,
          category: form.category,
          imageUrl,
          tags,
          sizes,
          addedBy: currentUser?.id, // Include current user ID
        }),
      });

      console.log(`[${requestId}] 📡 API response:`, {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        timestamp: new Date().toISOString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[${requestId}] ❌ API error response:`, {
          status: response.status,
          statusText: response.statusText,
          errorText,
          requestData: {
            name: form.name ? `${form.name.substring(0, 20)}...` : 'null',
            category: form.category,
            tagCount: tags.length,
            sizeCount: sizes.length,
            hasImage: !!imageUrl,
            addedBy: currentUser?.id,
          },
          timestamp: new Date().toISOString(),
        });

        // Check if it's an authentication error
        if (response.status === 401) {
          try {
            const errorData = JSON.parse(errorText);
            if (errorData.reason === 'session_expired') {
              // This will trigger the logout modal with the reason
              throw new Error('SESSION_EXPIRED');
            } else if (errorData.reason === 'authentication_error') {
              // This might be a temporary auth issue, don't logout immediately
              console.warn('Authentication error - might be temporary:', errorData);
              throw new Error('AUTHENTICATION_ERROR');
            }
          } catch (parseError) {
            // If we can't parse the error, treat it as a general auth error
            throw new Error('AUTHENTICATION_ERROR');
          }
        }

        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log(`[${requestId}] ✅ API response data:`, {
        success: result.success,
        itemId: result.item?.id,
        formattedId: result.item?.formattedId,
        timestamp: new Date().toISOString(),
      });

      // Instead of refreshing the entire inventory, add the new item to the local state
      if (result.success && result.item) {
        console.log(`[${requestId}] 🔄 Updating local inventory state...`);
        if (setInventory) {
          // Optimistic update: add the new item to the beginning of the inventory list
          // Check for duplicates and ensure uniqueness
          setInventory((prev) => {
            console.log(`[${requestId}] 📊 Optimistic update - new item:`, result.item);
            console.log(
              `[${requestId}] 📊 Optimistic update - current inventory length:`,
              prev.length
            );

            // Check for existing items with same formattedId
            const duplicatesByFormattedId = prev.filter(
              (item) => item.formattedId === result.item.formattedId
            );
            if (duplicatesByFormattedId.length > 0) {
              console.warn(
                `[${requestId}] ⚠️ Found duplicates by formattedId:`,
                duplicatesByFormattedId
              );
            }

            // Check for existing items with same ID
            const duplicatesById = prev.filter((item) => item.id === result.item.id);
            if (duplicatesById.length > 0) {
              console.warn(`[${requestId}] ⚠️ Found duplicates by ID:`, duplicatesById);
            }

            // Remove any existing items with the same formattedId to prevent duplicates
            const filteredPrev = prev.filter(
              (item) => item.formattedId !== result.item.formattedId
            );

            // Also check for items with the same ID as a backup
            const finalFiltered = filteredPrev.filter((item) => item.id !== result.item.id);

            console.log(
              `[${requestId}] 📊 Optimistic update - filtered inventory length:`,
              finalFiltered.length
            );

            return [result.item, ...finalFiltered];
          });
          console.log(`[${requestId}] ✅ Local inventory state updated successfully`);
        } else {
          // Fallback to full refresh if setInventory is not available
          console.log(`[${requestId}] 🔄 Fallback: refreshing entire inventory`);
          refreshInventory();
        }
      } else {
        console.warn(`[${requestId}] ⚠️ API returned success: false or no item data`);
      }

      // Only close modal and reset form if shouldCloseModal is true (normal mode)
      if (shouldCloseModal) {
        console.log(`[${requestId}] 🔒 Closing modal and resetting form`);
        resetAddItemForm();
        setAddModalOpen(false);
      }

      const duration = Date.now() - startTime;
      console.log(
        `[${requestId}] ✅ Client-side inventory item creation completed successfully in ${duration}ms`,
        {
          itemId: result.item?.id,
          formattedId: result.item?.formattedId,
          duration,
          timestamp: new Date().toISOString(),
        }
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(
        `[${requestId}] ❌ Client-side inventory item creation failed after ${duration}ms:`,
        {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          formData: {
            name: form.name ? `${form.name.substring(0, 20)}...` : 'null',
            category: form.category,
            tagCount: form.tagsInput.split(',').filter((t) => t.trim().length > 0).length,
            sizeCount: form.sizes.length,
            hasPhoto: !!form.photoFile,
            photoSize: form.photoFile?.size || 0,
          },
          userContext: {
            userId: currentUser?.id,
            userName: currentUser?.name,
            userRole: currentUser?.role,
          },
          duration,
          timestamp: new Date().toISOString(),
        }
      );

      // Check for authentication errors
      if (error instanceof Error) {
        if (error.message === 'SESSION_EXPIRED') {
          logout('session_expired', 'Phiên đăng nhập đã hết hạn khi tạo sản phẩm');
          return;
        } else if (error.message === 'AUTHENTICATION_ERROR') {
          logout('authentication_error', 'Lỗi xác thực khi tạo sản phẩm');
          return;
        }
      }

      console.error(`[${requestId}] ❌ Failed to add item - user should retry`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveEdit = async (updatedItem: {
    id: number;
    name: string;
    category: string;
    tags: string[];
    sizes: Array<{ title: string; quantity: number; onHand: number; price: number }>;
    imageUrl?: string;
  }) => {
    const requestId = `client-edit-${updatedItem.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    console.log(
      `[${requestId}] ✏️ Client-side inventory item edit started for item ID:`,
      updatedItem.id
    );

    // Prevent multiple simultaneous requests for the same item
    if (saveRequestInProgress.current.has(updatedItem.id)) {
      console.log(
        `[${requestId}] ⚠️ Request already in progress for item ${updatedItem.id}, ignoring duplicate`
      );
      return;
    }

    try {
      setIsSaving(true);
      saveRequestInProgress.current.add(updatedItem.id);

      console.log(`[${requestId}] 📋 Edit data:`, {
        itemId: updatedItem.id,
        name: updatedItem.name ? `${updatedItem.name.substring(0, 20)}...` : 'null',
        category: updatedItem.category,
        tagCount: updatedItem.tags.length,
        sizeCount: updatedItem.sizes.length,
        hasImage: !!updatedItem.imageUrl,
        timestamp: new Date().toISOString(),
      });

      const response = await fetch(`/api/inventory/${updatedItem.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          name: updatedItem.name,
          category: updatedItem.category,
          tags: updatedItem.tags,
          sizes: updatedItem.sizes,
          imageUrl: updatedItem.imageUrl,
        }),
      });

      console.log(`[${requestId}] 📡 API response:`, {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        timestamp: new Date().toISOString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[${requestId}] ❌ API error response:`, {
          status: response.status,
          statusText: response.statusText,
          errorText,
          requestData: {
            itemId: updatedItem.id,
            name: updatedItem.name ? `${updatedItem.name.substring(0, 20)}...` : 'null',
            category: updatedItem.category,
            tagCount: updatedItem.tags.length,
            sizeCount: updatedItem.sizes.length,
            hasImage: !!updatedItem.imageUrl,
          },
          timestamp: new Date().toISOString(),
        });

        // Check if it's an authentication error
        if (response.status === 401) {
          try {
            const errorData = JSON.parse(errorText);
            if (errorData.reason === 'session_expired') {
              throw new Error('SESSION_EXPIRED');
            }
          } catch (parseError) {
            throw new Error('AUTHENTICATION_ERROR');
          }
        }

        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      console.log(`[${requestId}] ✅ API response successful`);

      // Refresh inventory and close modal
      console.log(`[${requestId}] 🔄 Refreshing inventory and closing modal`);
      refreshInventory();
      setEditModalOpen(false);
      setSelectedItem(null);

      const duration = Date.now() - startTime;
      console.log(
        `[${requestId}] ✅ Client-side inventory item edit completed successfully in ${duration}ms`,
        {
          itemId: updatedItem.id,
          duration,
          timestamp: new Date().toISOString(),
        }
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(
        `[${requestId}] ❌ Client-side inventory item edit failed after ${duration}ms:`,
        {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          itemData: {
            itemId: updatedItem.id,
            name: updatedItem.name ? `${updatedItem.name.substring(0, 20)}...` : 'null',
            category: updatedItem.category,
            tagCount: updatedItem.tags.length,
            sizeCount: updatedItem.sizes.length,
            hasImage: !!updatedItem.imageUrl,
          },
          userContext: {
            userId: currentUser?.id,
            userName: currentUser?.name,
            userRole: currentUser?.role,
          },
          duration,
          timestamp: new Date().toISOString(),
        }
      );

      // Check for authentication errors
      if (error instanceof Error) {
        if (error.message === 'SESSION_EXPIRED') {
          logout('session_expired', 'Phiên đăng nhập đã hết hạn khi chỉnh sửa sản phẩm');
          return;
        } else if (error.message === 'AUTHENTICATION_ERROR') {
          logout('authentication_error', 'Lỗi xác thực khi chỉnh sửa sản phẩm');
          return;
        }
      }

      alert(`Lỗi khi lưu thay đổi: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSaving(false);
      saveRequestInProgress.current.delete(updatedItem.id);
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    const requestId = `client-delete-${itemId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    console.log(
      `[${requestId}] 🗑️ Client-side inventory item deletion started for item ID:`,
      itemId
    );

    try {
      setIsDeleting(true);

      console.log(`[${requestId}] 🚀 Sending DELETE request to /api/inventory/${itemId}`);
      const response = await fetch(`/api/inventory/${itemId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });

      console.log(`[${requestId}] 📡 API response:`, {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        timestamp: new Date().toISOString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[${requestId}] ❌ API error response:`, {
          status: response.status,
          statusText: response.statusText,
          errorText,
          itemId,
          timestamp: new Date().toISOString(),
        });
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      console.log(`[${requestId}] ✅ API response successful`);

      // Refresh inventory and close modal
      console.log(`[${requestId}] 🔄 Refreshing inventory and closing modal`);
      refreshInventory();
      setEditModalOpen(false);
      setSelectedItem(null);

      const duration = Date.now() - startTime;
      console.log(
        `[${requestId}] ✅ Client-side inventory item deletion completed successfully in ${duration}ms`,
        {
          itemId,
          duration,
          timestamp: new Date().toISOString(),
        }
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(
        `[${requestId}] ❌ Client-side inventory item deletion failed after ${duration}ms:`,
        {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          itemId,
          userContext: {
            userId: currentUser?.id,
            userName: currentUser?.name,
            userRole: currentUser?.role,
          },
          duration,
          timestamp: new Date().toISOString(),
        }
      );

      alert(`Lỗi khi xóa sản phẩm: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    addModalOpen,
    setAddModalOpen,
    editModalOpen,
    setEditModalOpen,
    selectedItem,
    setSelectedItem,
    form,
    setForm,
    resetAddItemForm,
    handleAddItemClick,
    handleAddItem,
    handleEditItem,
    handleSaveEdit,
    handleDeleteItem,
    isUploading,
    setIsUploading,
    isSaving,
    setIsSaving,
    isDeleting,
    // Lightning mode exports
    lightningMode,
    setLightningMode,
    heldTags,
    setHeldTags,
    lastCategory,
    setLastCategory,
  };
}
