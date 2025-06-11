'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Plus, List, Grid, Search, Eye, SlidersHorizontal } from 'lucide-react';
import Button from '@/components/common/dropdowns/Button';
import { TRANSLATIONS } from '@/config/translations';
import AddItemStep1 from './inventory/AddItemStep1';
import AddItemStep2 from './inventory/AddItemStep2';
import { AddItemFormState, InventoryItem } from '@/types/inventory';
import { formatPriceVND } from './inventory/InventoryUtils';
import { CATEGORY_OPTIONS } from './inventory/InventoryConstants';
import { useInventory } from './inventory/useInventory';
import IdentityConfirmModal from '@/components/common/IdentityConfirmModal';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addStep, setAddStep] = useState(1);
  const [form, setForm] = useState<AddItemFormState>(initialForm);
  const { inventory, refreshInventory } = useInventory();
  const [showFilter, setShowFilter] = useState(false);
  const [priceSort, setPriceSort] = useState<'asc' | 'desc' | ''>('');
  const [priceRange, setPriceRange] = useState<{ min: string; max: string }>({ min: '', max: '' });
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [lastModifiedSort, setLastModifiedSort] = useState<'asc' | 'desc' | ''>('');
  const [nameSort, setNameSort] = useState<'asc' | 'desc' | ''>('');
  const [idSort, setIdSort] = useState<'asc' | 'desc' | ''>('');
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const [identityModalOpen, setIdentityModalOpen] = useState(false);

  const priceRangeInvalid =
    priceRange.min && priceRange.max && Number(priceRange.max) < Number(priceRange.min);

  // Helper: get min/max price for an item
  const getItemPrice = (item: InventoryItem) => {
    if (!item.sizes.length) return 0;
    return Math.min(...item.sizes.map((s) => s.price));
  };

  // Filtering and sorting logic
  let filteredInventory = inventory.filter((item) => {
    if (priceRangeInvalid) return false;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      const inId = String(item.id).toLowerCase().includes(q);
      const inName = item.name.toLowerCase().includes(q);
      const inTags = item.tags.some((tag) => tag.toLowerCase().includes(q));
      if (!(inId || inName || inTags)) return false;
    }
    if (selectedCategories.length > 0 && !selectedCategories.includes(item.category)) return false;
    const price = getItemPrice(item);
    if (priceRange.min && price < Number(priceRange.min)) return false;
    if (priceRange.max && price > Number(priceRange.max)) return false;
    return true;
  });
  // Sorting
  if (priceSort) {
    filteredInventory = [...filteredInventory].sort((a, b) => {
      const pa = getItemPrice(a);
      const pb = getItemPrice(b);
      return priceSort === 'asc' ? pa - pb : pb - pa;
    });
  }
  if (nameSort) {
    filteredInventory = [...filteredInventory].sort((a, b) => {
      return nameSort === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    });
  }
  if (lastModifiedSort) {
    filteredInventory = [...filteredInventory].sort((a, b) => {
      const aId = String(a.id);
      const bId = String(b.id);
      return lastModifiedSort === 'asc' ? aId.localeCompare(bId) : bId.localeCompare(aId);
    });
  }
  if (idSort) {
    filteredInventory = [...filteredInventory].sort((a, b) => {
      const aId = a.formattedId || String(a.id);
      const bId = b.formattedId || String(b.id);
      return idSort === 'asc' ? aId.localeCompare(bId) : bId.localeCompare(aId);
    });
  }

  // For now, mockItem has no imageUrl
  const imageUrl =
    inventory.length > 0 && inventory[0].imageUrl ? inventory[0].imageUrl : '/no-image.png';

  const resetAddItemForm = () => {
    setAddStep(1);
    setForm(initialForm);
  };

  // Handler for Add Item button
  const handleAddItemClick = () => {
    setIdentityModalOpen(true);
  };

  // Handler for successful identity confirmation
  const handleIdentitySuccess = () => {
    setIdentityModalOpen(false);
    setAddModalOpen(true);
  };

  // Add new item handler
  const handleAddItem = async () => {
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
    // For image, just use imageUrl for now (no upload logic)
    const imageUrl = form.photoFile ? URL.createObjectURL(form.photoFile) : undefined;
    await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        category: form.category,
        imageUrl,
        tags,
        sizes,
      }),
    });
    // Refresh inventory
    refreshInventory();
    resetAddItemForm();
    setAddModalOpen(false);
  };

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
                variant="secondary"
                className="p-2 border-blue-500 text-blue-400 hover:bg-blue-900/30 hover:text-blue-300 focus:ring-2 focus:ring-blue-500 border"
                title="Sắp xếp/Lọc"
                onClick={() => setShowFilter((v) => !v)}
              >
                <SlidersHorizontal className="w-5 h-5" />
              </Button>
              {showFilter && (
                <div
                  ref={filterDropdownRef}
                  className="absolute right-0 mt-2 w-80 bg-gray-900 border border-gray-700 rounded-lg shadow-lg z-50 p-4 space-y-4 text-sm"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-white">Bộ lọc & Sắp xếp</span>
                    <button
                      className="text-xs text-blue-400 hover:underline"
                      onClick={() => {
                        setPriceSort('');
                        setPriceRange({ min: '', max: '' });
                        setSelectedCategories([]);
                        setLastModifiedSort('');
                        setNameSort('');
                        setIdSort('');
                      }}
                    >
                      Xoá tất cả
                    </button>
                  </div>
                  {/* Price Sort */}
                  <div>
                    <div className="font-medium text-gray-200 mb-1">Sắp xếp giá</div>
                    <div className="flex gap-2">
                      <Button
                        variant={priceSort === 'asc' ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => setPriceSort('asc')}
                      >
                        Tăng
                      </Button>
                      <Button
                        variant={priceSort === 'desc' ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => setPriceSort('desc')}
                      >
                        Giảm
                      </Button>
                      <Button
                        variant={!priceSort ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => setPriceSort('')}
                      >
                        Không
                      </Button>
                    </div>
                  </div>
                  {/* Price Range */}
                  <div>
                    <div className="font-medium text-gray-200 mb-1">Khoảng giá (VNĐ)</div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="0"
                        placeholder="Tối thiểu"
                        className={`w-24 px-2 py-1 rounded bg-gray-800 border ${priceRangeInvalid ? 'border-red-500' : 'border-gray-700'} text-white`}
                        value={priceRange.min}
                        onChange={(e) => setPriceRange((r) => ({ ...r, min: e.target.value }))}
                      />
                      <span className="text-gray-400">-</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="Tối đa"
                        className={`w-24 px-2 py-1 rounded bg-gray-800 border ${priceRangeInvalid ? 'border-red-500' : 'border-gray-700'} text-white`}
                        value={priceRange.max}
                        onChange={(e) => setPriceRange((r) => ({ ...r, max: e.target.value }))}
                      />
                    </div>
                    {priceRangeInvalid && (
                      <div className="text-xs text-red-400 mt-1">
                        Giá tối đa phải lớn hơn hoặc bằng giá tối thiểu.
                      </div>
                    )}
                  </div>
                  {/* Category Dropdown Multi-select */}
                  <div className="relative" ref={categoryDropdownRef}>
                    <div className="font-medium text-gray-200 mb-1">Danh mục</div>
                    <button
                      type="button"
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-left text-gray-200 flex items-center justify-between hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onClick={() => setCategoryDropdownOpen((v) => !v)}
                    >
                      <span>
                        {selectedCategories.length === 0
                          ? 'Chọn danh mục...'
                          : selectedCategories.length === 1
                            ? selectedCategories[0]
                            : `${selectedCategories.length} danh mục`}
                      </span>
                      <svg
                        className={`w-4 h-4 ml-2 transition-transform ${categoryDropdownOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                    {categoryDropdownOpen && (
                      <div className="absolute left-0 mt-2 w-full bg-gray-900 border border-gray-700 rounded-lg shadow-lg z-50 p-2 max-h-60 overflow-y-auto">
                        {CATEGORY_OPTIONS.map((cat) => (
                          <label
                            key={cat}
                            className="flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-gray-800 rounded"
                          >
                            <input
                              type="checkbox"
                              checked={selectedCategories.includes(cat)}
                              onChange={(e) => {
                                setSelectedCategories((arr) =>
                                  e.target.checked ? [...arr, cat] : arr.filter((c) => c !== cat)
                                );
                              }}
                              className="accent-blue-500"
                            />
                            <span className="text-gray-200 text-sm">{cat}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    {/* Show selected as tags below */}
                    {selectedCategories.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {selectedCategories.map((cat) => (
                          <span
                            key={cat}
                            className="bg-blue-700 text-white text-xs px-2 py-0.5 rounded-full"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Last Modified Sort */}
                  <div>
                    <div className="font-medium text-gray-200 mb-1">Sắp xếp ngày thêm</div>
                    <div className="flex gap-2">
                      <Button
                        variant={lastModifiedSort === 'asc' ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => setLastModifiedSort('asc')}
                      >
                        Cũ → Mới
                      </Button>
                      <Button
                        variant={lastModifiedSort === 'desc' ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => setLastModifiedSort('desc')}
                      >
                        Mới → Cũ
                      </Button>
                      <Button
                        variant={!lastModifiedSort ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => setLastModifiedSort('')}
                      >
                        Không
                      </Button>
                    </div>
                  </div>
                  {/* Name Sort */}
                  <div>
                    <div className="font-medium text-gray-200 mb-1">Sắp xếp tên</div>
                    <div className="flex gap-2">
                      <Button
                        variant={nameSort === 'asc' ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => setNameSort('asc')}
                      >
                        A → Z
                      </Button>
                      <Button
                        variant={nameSort === 'desc' ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => setNameSort('desc')}
                      >
                        Z → A
                      </Button>
                      <Button
                        variant={!nameSort ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => setNameSort('')}
                      >
                        Không
                      </Button>
                    </div>
                  </div>
                  {/* ID Sort */}
                  <div>
                    <div className="font-medium text-gray-200 mb-1">Sắp xếp ID</div>
                    <div className="flex gap-2">
                      <Button
                        variant={idSort === 'asc' ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => setIdSort('asc')}
                      >
                        A → Z
                      </Button>
                      <Button
                        variant={idSort === 'desc' ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => setIdSort('desc')}
                      >
                        Z → A
                      </Button>
                      <Button
                        variant={!idSort ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => setIdSort('')}
                      >
                        Không
                      </Button>
                    </div>
                  </div>
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
          filteredInventory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-900 text-gray-400 text-sm">
                    <th className="px-4 py-3 text-left font-medium">ID</th>
                    <th className="px-4 py-3 text-left font-medium">Tên sản phẩm</th>
                    <th className="px-4 py-3 text-left font-medium">Tồn kho</th>
                    <th className="px-4 py-3 text-left font-medium">Danh mục</th>
                    <th className="px-4 py-3 text-left font-medium">Tags</th>
                    <th className="px-4 py-3 text-left font-medium">Giá</th>
                    <th className="px-4 py-3 text-left font-medium">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredInventory.map((item) => (
                    <tr key={item.id} className="text-white hover:bg-gray-700/50">
                      <td className="px-4 py-3 font-mono text-sm">{item.formattedId}</td>
                      <td className="px-4 py-3">{item.name}</td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <div className="text-sm text-gray-400">Tổng số:</div>
                          <div className="flex gap-4 text-sm">
                            {item.sizes.map((size) => (
                              <span key={size.title}>
                                {size.title}: {size.quantity}
                              </span>
                            ))}
                          </div>
                          <div className="text-sm text-gray-400 mt-2">Còn lại:</div>
                          <div className="flex gap-4 text-sm">
                            {item.sizes.map((size) => (
                              <span key={size.title}>
                                {size.title}: {size.onHand}
                              </span>
                            ))}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">{item.category}</td>
                      <td className="px-4 py-3">
                        {item.tags.length === 0 ? (
                          <span className="text-yellow-400 text-xs italic">
                            Chưa có tag. Thêm tag để quản lý sản phẩm tốt hơn.
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {item.tags.map((tag, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-gray-700 rounded-full text-xs"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          {item.sizes.map((size) => (
                            <div
                              key={size.title}
                              className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0"
                              style={{ wordBreak: 'break-all' }}
                            >
                              <span className="text-gray-400 font-mono text-xs sm:text-sm break-all">
                                {size.title}:
                              </span>
                              <span className="text-xs sm:text-sm break-all">
                                {formatPriceVND(size.price)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="secondary"
                          onClick={() => setPreviewOpen(true)}
                          className="p-2"
                          title="Xem trước sản phẩm"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center text-gray-400 py-10">Chưa có sản phẩm nào trong kho.</div>
          )
        ) : filteredInventory.length > 0 ? (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredInventory.map((item) => (
              <div
                key={item.id}
                className="bg-gray-900 rounded-lg shadow border border-gray-700 flex flex-col items-center p-3 w-full min-w-0"
              >
                <img
                  src={item.imageUrl || '/no-image.png'}
                  alt={item.name}
                  className="w-24 h-32 object-contain rounded bg-gray-700 border border-gray-800 mb-2 cursor-pointer hover:opacity-80 transition"
                  onClick={() => setPreviewOpen(true)}
                />
                <div className="w-full flex flex-col items-center mb-2">
                  <span className="font-mono text-xs text-gray-400 mb-1">{item.formattedId}</span>
                  <h3 className="text-base font-bold text-white text-center w-full truncate mb-1">
                    {item.name}
                  </h3>
                </div>
                {/* Inventory & Price Table */}
                <div className="w-full mb-2 overflow-x-auto">
                  <div className="grid grid-cols-4 text-xs text-gray-400 mb-1 min-w-max">
                    <span className="font-semibold">Size</span>
                    <span className="font-semibold">Tồn</span>
                    <span className="font-semibold">Còn</span>
                    <span className="font-semibold">Giá</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {item.sizes.map((size) => (
                      <div
                        key={size.title}
                        className="grid grid-cols-4 text-xs text-gray-200 min-w-max"
                      >
                        <span className="font-mono whitespace-nowrap text-ellipsis overflow-hidden">
                          {size.title}
                        </span>
                        <span className="whitespace-nowrap text-ellipsis overflow-hidden">
                          {size.quantity}
                        </span>
                        <span className="whitespace-nowrap text-ellipsis overflow-hidden">
                          {size.onHand}
                        </span>
                        <span className="whitespace-nowrap text-ellipsis overflow-hidden">
                          {formatPriceVND(size.price)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Move tags and category to the bottom for consistency */}
                <div className="flex flex-col gap-1 w-full mt-auto">
                  <div className="flex flex-wrap gap-1 w-full justify-center mb-1">
                    {item.tags.map((tag, index) => (
                      <span key={index} className="px-2 py-0.5 bg-gray-700 rounded-full text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="w-full text-xs text-gray-400 text-center">
                    Danh mục: <span className="text-gray-200">{item.category}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-400 py-10">Chưa có sản phẩm nào trong kho.</div>
        )}
      </div>
      {/* Preview Modal */}
      {previewOpen && filteredInventory.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl p-8 w-full max-w-md shadow-2xl border border-gray-700 flex flex-col items-center">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">
              {filteredInventory[0].name}
            </h2>
            <img
              src={imageUrl}
              alt={filteredInventory[0].name}
              className="w-60 h-80 object-contain rounded-lg bg-gray-700 border border-gray-800 mb-6"
            />
            <Button variant="secondary" onClick={() => setPreviewOpen(false)} type="button">
              Đóng
            </Button>
          </div>
        </div>
      )}
      {/* Add Item Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl p-8 w-full max-w-2xl shadow-2xl border border-gray-700 flex flex-col items-center">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Thêm sản phẩm mới</h2>
            {addStep === 1 && <AddItemStep1 form={form} setForm={setForm} />}
            {addStep === 2 && <AddItemStep2 form={form} setForm={setForm} />}
            <div className="flex justify-end w-full mt-4 space-x-3">
              {addStep === 2 && (
                <Button variant="secondary" onClick={() => setAddStep(1)} type="button">
                  Quay lại
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={() => {
                  resetAddItemForm();
                  setAddModalOpen(false);
                }}
                type="button"
              >
                Huỷ
              </Button>
              {addStep === 1 && (
                <Button
                  variant="primary"
                  type="button"
                  onClick={() => setAddStep(2)}
                  disabled={!form.name.trim()}
                >
                  Tiếp tục
                </Button>
              )}
              {addStep === 2 && (
                <Button
                  variant="primary"
                  type="button"
                  disabled={
                    form.sizes.length < 1 ||
                    form.sizes.some((s) => !s.title.trim() || !s.quantity || !s.price)
                  }
                  onClick={handleAddItem}
                >
                  Thêm sản phẩm
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
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
