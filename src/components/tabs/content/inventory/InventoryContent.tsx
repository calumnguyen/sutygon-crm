'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Plus, List, Grid, Search, SlidersHorizontal, RefreshCw } from 'lucide-react';
import Button from '@/components/common/dropdowns/Button';
import { TRANSLATIONS } from '@/config/translations';
import { AddItemFormState } from '@/types/inventory';
import { InventoryItem } from '@/types/inventory';
import { CATEGORY_OPTIONS } from './InventoryConstants';
import { useInventory } from './useInventory';
import IdentityConfirmModal from '@/components/common/IdentityConfirmModal';
import { usePopper } from 'react-popper';
import { useInventoryTable, useInventoryModals } from './hooks';
import InventoryTable from './InventoryTable';
import InventoryGrid from './InventoryGrid';
import InventoryFilterDropdown from './InventoryFilterDropdown';
import InventoryPreviewModal from './InventoryPreviewModal';
import InventoryAddItemModal from './InventoryAddItemModal';
import InventoryEditModal from './InventoryEditModal';

const InventoryContent: React.FC = () => {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const { inventory, refreshInventory } = useInventory();
  const [showFilter, setShowFilter] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | undefined>();
  const {
    previewOpen,
    setPreviewOpen,
    addModalOpen,
    setAddModalOpen,
    editModalOpen,
    setEditModalOpen,
    addStep,
    setAddStep,
    form,
    setForm,
    identityModalOpen,
    setIdentityModalOpen,
    resetAddItemForm,
    handleAddItemClick,
    handleIdentitySuccess,
    handleAddItem,
    handleEditItem,
    handleSaveEdit,
    handleDeleteItem,
    isUploading,
    isSaving,
    isDeleting,
    selectedItem: editSelectedItem,
  } = useInventoryModals(refreshInventory);
  const {
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
  } = useInventoryTable(inventory);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
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

  return (
    <div className="p-3 sm:p-6">
      {/* Mobile Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 gap-4">
        <h1 className="text-xl sm:text-2xl font-bold text-white">{TRANSLATIONS.inventory.title}</h1>

        {/* Mobile Search Bar */}
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Tìm kiếm..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 w-full sm:w-64"
          />
        </div>
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
            setSearchQuery('');
            setPriceSort(null);
            setPriceRange({ min: '', max: '' });
            setSelectedCategories([]);
            setLastModifiedSort(null);
            setNameSort(null);
            setIdSort(null);
          }}
          leftIcon={<RefreshCw className="w-5 h-5" />}
          className="w-full sm:w-auto border-green-500 text-green-400 hover:bg-green-900/30 hover:text-green-300 focus:ring-2 focus:ring-green-500"
          title="Làm mới dữ liệu"
        >
          <span className="sm:hidden">Làm mới</span>
          <span className="hidden sm:inline">Làm mới</span>
        </Button>
      </div>

      <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        {viewMode === 'list' ? (
          <InventoryTable
            filteredInventory={filteredInventory}
            setPreviewOpen={handlePreviewOpen}
            handleEditItem={handleEditItem}
          />
        ) : (
          <InventoryGrid
            filteredInventory={filteredInventory}
            setPreviewOpen={handlePreviewOpen}
            handleEditItem={handleEditItem}
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
        setIsUploading={(uploading) => {
          // This will be handled by the hooks
        }}
      />
      <InventoryEditModal
        editModalOpen={editModalOpen}
        setEditModalOpen={setEditModalOpen}
        item={editSelectedItem}
        onSave={handleSaveEdit}
        onDelete={handleDeleteItem}
        isSaving={isSaving}
        isDeleting={isDeleting}
      />
      {/* Identity Confirmation Modal for admin */}
      <IdentityConfirmModal
        open={identityModalOpen}
        onClose={() => setIdentityModalOpen(false)}
        onSuccess={handleIdentitySuccess}
        requiredRole="admin"
      />
    </div>
  );
};

export default InventoryContent;
