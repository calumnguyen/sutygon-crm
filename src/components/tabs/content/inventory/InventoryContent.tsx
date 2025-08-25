'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Plus,
  List,
  Grid,
  Search,
  SlidersHorizontal,
  RefreshCw,
  Sparkles,
  X,
  BookOpen,
} from 'lucide-react';
import Button from '@/components/common/dropdowns/Button';
import { TRANSLATIONS } from '@/config/translations';
import { AddItemFormState } from '@/types/inventory';
import { InventoryItem } from '@/types/inventory';
import { CATEGORY_OPTIONS } from './InventoryConstants';
import { useInventory } from './useInventory';
import { useUser } from '@/context/UserContext';
import { usePopper } from 'react-popper';
import { useInventoryTable, useInventoryModals, useInventorySearch } from './hooks';
import InventoryTable from './InventoryTable';
import InventoryGrid from './InventoryGrid';
import InventoryFilterDropdown from './InventoryFilterDropdown';
import InventoryPreviewModal from './InventoryPreviewModal';
import InventoryAddItemModal from './InventoryAddItemModal';
import InventoryEditModal from './InventoryEditModal';
import AIVisualSearchModal from './AIVisualSearchModal';
import SecureTrainingModal from './SecureTrainingModal';

const InventoryContent: React.FC = () => {
  const { sessionToken, currentUser } = useUser();
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const {
    inventory,
    refreshInventory,
    isRefreshing,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    setInventory,
  } = useInventory();
  const [showFilter, setShowFilter] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | undefined>();
  const [previewOpen, setPreviewOpen] = useState(false);
  const {
    addModalOpen,
    setAddModalOpen,
    editModalOpen,
    setEditModalOpen,
    selectedItem: editSelectedItem,
    form,
    setForm,
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
    // Lightning mode props
    lightningMode,
    setLightningMode,
    heldTags,
    setHeldTags,
    lastCategory,
    setLastCategory,
  } = useInventoryModals(refreshInventory, setInventory);

  // Use API search for better performance and full database search
  const {
    searchQuery,
    searchResults,
    isSearching,
    isLoadingMore: searchLoadingMore,
    searchError,
    hasMore: searchHasMore,
    total: searchTotal,
    handleSearch,
    loadMore: searchLoadMore,
    clearSearch,
  } = useInventorySearch();

  // Determine which data to display based on search state
  const displayInventory = searchQuery.trim() ? searchResults : inventory;
  const displayLoading = searchQuery.trim() ? isSearching : loading;
  const displayLoadingMore = searchQuery.trim() ? searchLoadingMore : loadingMore;
  const displayHasMore = searchQuery.trim() ? searchHasMore : hasMore;
  const displayLoadMore = searchQuery.trim() ? searchLoadMore : loadMore;

  // Use frontend filtering for non-search scenarios
  const {
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
    filteredInventory: filteredRegularInventory,
  } = useInventoryTable(displayInventory);

  // When searching, use search results directly. When not searching, use filtered inventory
  const filteredInventory = searchQuery.trim() ? searchResults : filteredRegularInventory;

  // Debug: Log what's being displayed
  useEffect(() => {
    if (searchQuery.trim()) {
      console.log(`Displaying search results for "${searchQuery}":`, {
        searchResultsCount: searchResults.length,
        searchTotal: searchTotal,
        filteredInventoryCount: filteredInventory.length,
        isSearching,
        searchError,
      });
    }
  }, [searchQuery, searchResults, searchTotal, filteredInventory.length, isSearching, searchError]);

  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [secureTrainingModalOpen, setSecureTrainingModalOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const [popperElement, setPopperElement] = useState<HTMLDivElement | null>(null);
  const [referenceElement, setReferenceElement] = useState<HTMLButtonElement | null>(null);
  const { styles, attributes, update } = usePopper(referenceElement, popperElement, {
    placement: 'bottom-end',
    modifiers: [
      { name: 'preventOverflow', options: { padding: 8 } },
      { name: 'flip', options: { fallbackPlacements: ['top-end', 'bottom-end'] } },
    ],
  });

  // Intersection Observer for infinite scrolling
  const observerRef = useRef<IntersectionObserver | null>(null);

  const lastElementRef = useCallback(
    (node: HTMLElement | null) => {
      if (displayLoading) return;

      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && displayHasMore && !displayLoadingMore) {
            displayLoadMore();
          }
        },
        {
          rootMargin: '200px', // Increased margin for better mobile detection
          threshold: 0.1,
        }
      );

      if (node) observerRef.current.observe(node);
    },
    [displayLoading, displayHasMore, displayLoadingMore, displayLoadMore]
  );

  // Cleanup observer on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // Close category dropdown on click outside
  useEffect(() => {
    if (!categoryDropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setCategoryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [categoryDropdownOpen]);

  // Close filter dropdown on click outside
  useEffect(() => {
    if (!showFilter) return;
    const handleClick = (e: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) {
        setShowFilter(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showFilter]);

  const handlePreviewOpen = (item: InventoryItem) => {
    setSelectedItem(item);
    setPreviewOpen(true);
  };

  const handlePreviewClose = () => {
    setPreviewOpen(false);
    setSelectedItem(undefined);
  };

  const [aiFilter, setAiFilter] = useState<string | null>(null);

  const handleAISearchResults = (results: Record<string, unknown>[]) => {
    // Store AI search results for reference
    console.log('AI search results:', results);
  };

  const handleSelectAIResult = (result: Record<string, unknown>) => {
    // Apply AI filter based on the selected result
    const searchTerm = (result.name as string) || (result.category as string) || '';
    setAiFilter(searchTerm);
    handleSearch(searchTerm);
  };

  const clearAIFilter = () => {
    setAiFilter(null);
    clearSearch();
  };

  return (
    <div className="p-3 sm:p-6">
      {/* Mobile Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 gap-4">
        <h1 className="text-xl sm:text-2xl font-bold text-white">{TRANSLATIONS.inventory.title}</h1>

        {/* Mobile Search Bar */}
        <div className="relative w-full sm:w-auto flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={searchQuery}
              onChange={(e) => {
                const value = e.target.value;
                handleSearch(value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  clearSearch();
                }
              }}
              className="pl-10 pr-10 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 w-full"
            />
            {searchQuery && (
              <button
                onClick={() => clearSearch()}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                title="Xóa tìm kiếm"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* AI Search Button */}
          <button
            onClick={() => setAiModalOpen(true)}
            className="p-2 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white rounded-md transition-all duration-300 hover:scale-110 hover:shadow-lg group"
            title="AI Tìm kiếm"
          >
            <Sparkles className="w-5 h-5 group-hover:animate-pulse" />
          </button>

          {/* AI Training Button - Admin Only */}
          {currentUser?.role === 'admin' && (
            <button
              onClick={() => setSecureTrainingModalOpen(true)}
              className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-md transition-all duration-300 hover:scale-110 hover:shadow-lg group"
              title="Secure AI Training (Admin Only)"
            >
              <BookOpen className="w-5 h-5 group-hover:animate-pulse" />
            </button>
          )}
        </div>

        {/* AI Filter Display */}
        {aiFilter && (
          <div className="flex items-center gap-2 bg-blue-100 border border-blue-300 rounded-lg px-3 py-2 mt-2">
            <span className="text-blue-800 text-sm">🔍 AI: {aiFilter}</span>
            <button
              onClick={clearAIFilter}
              className="text-blue-600 hover:text-blue-800 p-1"
              title="Xóa bộ lọc AI"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Search Status Indicator */}
        {searchQuery.trim() && (
          <div className="flex items-center gap-2 bg-blue-900/30 border border-blue-600 rounded-lg px-3 py-2 mt-2">
            <Search className="w-4 h-4 text-blue-400" />
            <span className="text-blue-300 text-sm">
              {isSearching
                ? 'Đang tìm kiếm...'
                : `Tìm thấy ${searchTotal} kết quả cho "${searchQuery}"`}
            </span>
            {searchError && <span className="text-red-300 text-sm">- {searchError}</span>}
            {isSearching && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <div
                  className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"
                  style={{ animationDelay: '0.2s' }}
                ></div>
                <div
                  className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"
                  style={{ animationDelay: '0.4s' }}
                ></div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile Controls */}
      <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
        {/* View Mode Toggle */}
        <div className="flex items-center gap-2 bg-gray-800 rounded-md p-1 w-full sm:w-auto justify-center">
          <Button
            variant={viewMode === 'list' ? 'primary' : 'secondary'}
            onClick={() => setViewMode('list')}
            className="p-2 flex-1 sm:flex-none"
            title="Chế độ danh sách"
          >
            <List className="w-5 h-5" />
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'primary' : 'secondary'}
            onClick={() => setViewMode('grid')}
            className="p-2 flex-1 sm:flex-none"
            title="Chế độ lưới"
          >
            <Grid className="w-5 h-5" />
          </Button>
        </div>

        {/* Filter Button */}
        <div className="relative w-full sm:w-auto">
          <Button
            ref={filterButtonRef}
            variant="secondary"
            className="p-2 border-blue-500 text-blue-400 hover:bg-blue-900/30 hover:text-blue-300 focus:ring-2 focus:ring-blue-500 border w-full sm:w-auto"
            title="Sắp xếp/Lọc"
            onClick={() => {
              setShowFilter((v) => !v);
              setReferenceElement(filterButtonRef.current);
              setTimeout(() => update && update(), 0);
            }}
          >
            <SlidersHorizontal className="w-5 h-5" />
            <span className="ml-2 sm:hidden">Sắp xếp/Lọc</span>
          </Button>
          {showFilter && (
            <div
              ref={setPopperElement}
              style={styles.popper}
              {...attributes.popper}
              className="z-50 w-full sm:w-auto"
            >
              <InventoryFilterDropdown
                priceSort={priceSort}
                setPriceSort={setPriceSort}
                priceRange={priceRange}
                setPriceRange={setPriceRange}
                priceRangeInvalid={priceRangeInvalid}
                CATEGORY_OPTIONS={CATEGORY_OPTIONS}
                selectedCategories={selectedCategories}
                setSelectedCategories={setSelectedCategories}
                categoryDropdownOpen={Boolean(categoryDropdownOpen)}
                setCategoryDropdownOpen={setCategoryDropdownOpen}
                categoryDropdownRef={categoryDropdownRef as React.RefObject<HTMLDivElement>}
                lastModifiedSort={lastModifiedSort}
                setLastModifiedSort={setLastModifiedSort}
                nameSort={nameSort}
                setNameSort={setNameSort}
                idSort={idSort}
                setIdSort={setIdSort}
              />
            </div>
          )}
        </div>

        {/* Add Item Button */}
        <Button
          variant="primary"
          onClick={handleAddItemClick}
          leftIcon={<Plus className="w-5 h-5" />}
          className="w-full sm:w-auto"
        >
          <span className="sm:hidden">{TRANSLATIONS.inventory.addItem}</span>
          <span className="hidden sm:inline">{TRANSLATIONS.inventory.addItem}</span>
        </Button>

        {/* Hard Refresh Button */}
        <Button
          variant="secondary"
          onClick={() => {
            refreshInventory();
            // Clear all filters and search
            clearSearch();
            setPriceSort(null);
            setPriceRange({ min: '', max: '' });
            setSelectedCategories([]);
            setLastModifiedSort(null);
            setNameSort(null);
            setIdSort(null);
          }}
          leftIcon={
            isRefreshing ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <RefreshCw className="w-5 h-5" />
            )
          }
          className="w-full sm:w-auto border-green-500 text-green-400 hover:bg-green-900/30 hover:text-green-300 focus:ring-2 focus:ring-green-500"
          title="Làm mới dữ liệu"
          disabled={isRefreshing}
        >
          <span className="sm:hidden">{isRefreshing ? 'Đang tải...' : 'Làm mới'}</span>
          <span className="hidden sm:inline">{isRefreshing ? 'Đang tải...' : 'Làm mới'}</span>
        </Button>
      </div>

      <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        {searchError && (
          <div className="bg-red-900/50 border border-red-600 rounded-lg p-4 mb-4 mx-4 mt-4">
            <div className="text-red-300 text-sm font-medium">Lỗi tìm kiếm:</div>
            <div className="text-red-200 text-sm mt-1">{searchError}</div>
          </div>
        )}
        {displayLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-blue-400 text-lg">Đang tải dữ liệu kho...</div>
          </div>
        ) : viewMode === 'list' ? (
          <InventoryTable
            filteredInventory={filteredInventory}
            setPreviewOpen={handlePreviewOpen}
            handleEditItem={handleEditItem}
            lastElementRef={lastElementRef}
            loadingMore={displayLoadingMore}
            loadMore={displayLoadMore}
            hasMore={displayHasMore}
          />
        ) : (
          <InventoryGrid
            filteredInventory={filteredInventory}
            setPreviewOpen={handlePreviewOpen}
            handleEditItem={handleEditItem}
            lastElementRef={lastElementRef}
            loadingMore={displayLoadingMore}
            loadMore={displayLoadMore}
            hasMore={displayHasMore}
          />
        )}
      </div>
      <InventoryPreviewModal
        previewOpen={previewOpen}
        setPreviewOpen={handlePreviewClose}
        filteredInventory={filteredInventory}
        selectedItem={selectedItem}
      />
      <InventoryAddItemModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        form={form}
        setForm={setForm}
        handleAddItem={handleAddItem}
        isUploading={isUploading}
        setIsUploading={setIsUploading}
        lightningMode={lightningMode}
        setLightningMode={setLightningMode}
        heldTags={heldTags}
        setHeldTags={setHeldTags}
        lastCategory={lastCategory}
        setLastCategory={setLastCategory}
      />
      <InventoryEditModal
        editModalOpen={editModalOpen}
        setEditModalOpen={setEditModalOpen}
        item={editSelectedItem}
        onSave={handleSaveEdit}
        onDelete={handleDeleteItem}
        isSaving={isSaving}
        setIsSaving={setIsSaving}
        isDeleting={isDeleting}
      />
      <AIVisualSearchModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        onSearchResults={handleAISearchResults}
        onSelectResult={handleSelectAIResult}
      />
      <SecureTrainingModal
        isOpen={secureTrainingModalOpen}
        onClose={() => setSecureTrainingModalOpen(false)}
        function="training"
      />
    </div>
  );
};

export default InventoryContent;
