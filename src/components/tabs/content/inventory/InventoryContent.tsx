'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Plus, List, Grid, Search, Eye, SlidersHorizontal } from 'lucide-react';
import Button from '@/components/common/dropdowns/Button';
import { TRANSLATIONS } from '@/config/translations';
import AddItemStep1 from './AddItemStep1';
import AddItemStep2 from './AddItemStep2';
import { AddItemFormState, InventoryItem } from '@/types/inventory';
import { formatPriceVND, getItemPrice } from './InventoryUtils';
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

const initialForm: AddItemFormState = {
  name: '',
  category: 'Áo Dài',
  tags: [],
  tagsInput: '',
  photoFile: null,
  sizes: [{ title: '', quantity: '', onHand: '', price: '' }],
  samePrice: true,
};

const InventoryContent: React.FC = () => {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const { inventory, refreshInventory } = useInventory();
  const [showFilter, setShowFilter] = useState(false);
  const {
    previewOpen,
    setPreviewOpen,
    addModalOpen,
    setAddModalOpen,
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

  // For now, mockItem has no imageUrl
  const imageUrl =
    inventory.length > 0 && inventory[0].imageUrl ? inventory[0].imageUrl : '/no-image.png';

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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">{TRANSLATIONS.inventory.title}</h1>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 w-64"
            />
          </div>
          <div className="flex items-center gap-2 bg-gray-800 rounded-md p-1">
            <Button
              variant={viewMode === 'list' ? 'primary' : 'secondary'}
              onClick={() => setViewMode('list')}
              className="p-2"
              title="Chế độ danh sách"
            >
              <List className="w-5 h-5" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'primary' : 'secondary'}
              onClick={() => setViewMode('grid')}
              className="p-2"
              title="Chế độ lưới"
            >
              <Grid className="w-5 h-5" />
            </Button>
            <div className="relative">
              <Button
                ref={filterButtonRef}
                variant="secondary"
                className="p-2 border-blue-500 text-blue-400 hover:bg-blue-900/30 hover:text-blue-300 focus:ring-2 focus:ring-blue-500 border"
                title="Sắp xếp/Lọc"
                onClick={() => {
                  setShowFilter((v) => !v);
                  setReferenceElement(filterButtonRef.current);
                  setTimeout(() => update && update(), 0);
                }}
              >
                <SlidersHorizontal className="w-5 h-5" />
              </Button>
              {showFilter && (
                <div
                  ref={setPopperElement}
                  style={styles.popper}
                  {...attributes.popper}
                  className="z-50"
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
          </div>
          <Button
            variant="primary"
            onClick={handleAddItemClick}
            leftIcon={<Plus className="w-5 h-5" />}
          >
            {TRANSLATIONS.inventory.addItem}
          </Button>
        </div>
      </div>
      <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        {viewMode === 'list' ? (
          <InventoryTable filteredInventory={filteredInventory} setPreviewOpen={setPreviewOpen} />
        ) : (
          <InventoryGrid filteredInventory={filteredInventory} setPreviewOpen={setPreviewOpen} />
        )}
      </div>
      <InventoryPreviewModal
        previewOpen={previewOpen}
        setPreviewOpen={setPreviewOpen}
        filteredInventory={filteredInventory}
        imageUrl={imageUrl}
      />
      <InventoryAddItemModal
        addModalOpen={addModalOpen}
        setAddModalOpen={setAddModalOpen}
        addStep={addStep}
        setAddStep={setAddStep}
        form={form}
        setForm={setForm}
        resetAddItemForm={resetAddItemForm}
        handleAddItem={handleAddItem}
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
