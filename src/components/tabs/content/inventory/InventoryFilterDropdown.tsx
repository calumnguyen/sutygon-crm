import React, { RefObject } from 'react';
import Button from '@/components/common/dropdowns/Button';

interface InventoryFilterDropdownProps {
  priceSort: string | null;
  setPriceSort: (v: 'asc' | 'desc' | null) => void;
  priceRange: { min: string; max: string };
  setPriceRange: (v: { min: string; max: string }) => void;
  priceRangeInvalid: boolean | string;
  CATEGORY_OPTIONS: string[];
  selectedCategories: string[];
  setSelectedCategories: (v: string[]) => void;
  categoryDropdownOpen: boolean;
  setCategoryDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
  categoryDropdownRef: RefObject<HTMLDivElement>;
  lastModifiedSort: string | null;
  setLastModifiedSort: (v: 'asc' | 'desc' | null) => void;
  nameSort: string | null;
  setNameSort: (v: 'asc' | 'desc' | null) => void;
  idSort: string | null;
  setIdSort: (v: 'asc' | 'desc' | null) => void;
}

const InventoryFilterDropdown: React.FC<InventoryFilterDropdownProps> = ({
  priceSort,
  setPriceSort,
  priceRange,
  setPriceRange,
  priceRangeInvalid,
  CATEGORY_OPTIONS,
  selectedCategories,
  setSelectedCategories,
  categoryDropdownOpen,
  setCategoryDropdownOpen,
  categoryDropdownRef,
  lastModifiedSort,
  setLastModifiedSort,
  nameSort,
  setNameSort,
  idSort,
  setIdSort,
}) => (
  <div className="z-50 w-full sm:w-80 bg-gray-900 border border-gray-700 rounded-lg shadow-lg p-3 sm:p-4 space-y-3 sm:space-y-4 text-sm max-h-[80vh] overflow-y-auto">
    <div className="flex justify-between items-center mb-2">
      <span className="font-semibold text-white">Bộ lọc & Sắp xếp</span>
      <button
        className="text-xs text-blue-400 hover:underline"
        onClick={() => {
          setPriceSort(null);
          setPriceRange({ min: '', max: '' });
          setSelectedCategories([]);
          setLastModifiedSort(null);
          setNameSort(null);
          setIdSort(null);
        }}
      >
        Xoá tất cả
      </button>
    </div>
    {/* Price Sort */}
    <div>
      <div className="font-medium text-gray-200 mb-1">Sắp xếp giá</div>
      <div className="flex flex-wrap gap-1 sm:gap-2">
        <Button
          variant={priceSort === 'asc' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setPriceSort('asc')}
          className="text-xs"
        >
          Tăng
        </Button>
        <Button
          variant={priceSort === 'desc' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setPriceSort('desc')}
          className="text-xs"
        >
          Giảm
        </Button>
        <Button
          variant={!priceSort ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setPriceSort(null)}
          className="text-xs"
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
          className={`flex-1 sm:w-24 px-2 py-1 rounded bg-gray-800 border ${priceRangeInvalid ? 'border-red-500' : 'border-gray-700'} text-white text-xs sm:text-sm`}
          value={priceRange.min}
          onChange={(e) => setPriceRange({ min: e.target.value, max: priceRange.max })}
        />
        <span className="text-gray-400">-</span>
        <input
          type="number"
          min="0"
          placeholder="Tối đa"
          className={`flex-1 sm:w-24 px-2 py-1 rounded bg-gray-800 border ${priceRangeInvalid ? 'border-red-500' : 'border-gray-700'} text-white text-xs sm:text-sm`}
          value={priceRange.max}
          onChange={(e) => setPriceRange({ min: priceRange.min, max: e.target.value })}
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
        className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-left text-gray-200 flex items-center justify-between hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
        onClick={() => setCategoryDropdownOpen((v: boolean) => !v)}
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
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
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
                  if (e.target.checked) {
                    setSelectedCategories([...selectedCategories, cat]);
                  } else {
                    setSelectedCategories(selectedCategories.filter((c) => c !== cat));
                  }
                }}
                className="accent-blue-500"
              />
              <span className="text-gray-200 text-sm">{cat}</span>
            </label>
          ))}
        </div>
      )}
      {selectedCategories.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {selectedCategories.map((cat) => (
            <span key={cat} className="bg-blue-700 text-white text-xs px-2 py-0.5 rounded-full">
              {cat}
            </span>
          ))}
        </div>
      )}
    </div>
    {/* Last Modified Sort */}
    <div>
      <div className="font-medium text-gray-200 mb-1">Sắp xếp ngày thêm</div>
      <div className="flex flex-wrap gap-1 sm:gap-2">
        <Button
          variant={lastModifiedSort === 'asc' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setLastModifiedSort('asc')}
          className="text-xs"
        >
          Cũ → Mới
        </Button>
        <Button
          variant={lastModifiedSort === 'desc' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setLastModifiedSort('desc')}
          className="text-xs"
        >
          Mới → Cũ
        </Button>
        <Button
          variant={!lastModifiedSort ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setLastModifiedSort(null)}
          className="text-xs"
        >
          Không
        </Button>
      </div>
    </div>
    {/* Name Sort */}
    <div>
      <div className="font-medium text-gray-200 mb-1">Sắp xếp tên</div>
      <div className="flex flex-wrap gap-1 sm:gap-2">
        <Button
          variant={nameSort === 'asc' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setNameSort('asc')}
          className="text-xs"
        >
          A → Z
        </Button>
        <Button
          variant={nameSort === 'desc' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setNameSort('desc')}
          className="text-xs"
        >
          Z → A
        </Button>
        <Button
          variant={!nameSort ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setNameSort(null)}
          className="text-xs"
        >
          Không
        </Button>
      </div>
    </div>
    {/* ID Sort */}
    <div>
      <div className="font-medium text-gray-200 mb-1">Sắp xếp ID</div>
      <div className="flex flex-wrap gap-1 sm:gap-2">
        <Button
          variant={idSort === 'asc' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setIdSort('asc')}
          className="text-xs"
        >
          A → Z
        </Button>
        <Button
          variant={idSort === 'desc' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setIdSort('desc')}
          className="text-xs"
        >
          Z → A
        </Button>
        <Button
          variant={!idSort ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setIdSort(null)}
          className="text-xs"
        >
          Không
        </Button>
      </div>
    </div>
  </div>
);

export default InventoryFilterDropdown;
