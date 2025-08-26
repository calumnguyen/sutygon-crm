import React, { RefObject, useState, useCallback, useRef, useEffect } from 'react';
import { ImageFilter } from './hooks';

interface InventoryFilterDropdownProps {
  CATEGORY_OPTIONS: string[];
  selectedCategories: string[];
  setSelectedCategories: (v: string[]) => void;
  categoryDropdownOpen: boolean;
  setCategoryDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
  categoryDropdownRef: RefObject<HTMLDivElement>;
  imageFilter: ImageFilter;
  setImageFilter: (v: ImageFilter) => void;
  sortBy: 'newest' | 'oldest' | 'none';
  setSortBy: (v: 'newest' | 'oldest' | 'none') => void;
}

const InventoryFilterDropdown: React.FC<InventoryFilterDropdownProps> = ({
  CATEGORY_OPTIONS,
  selectedCategories,
  setSelectedCategories,
  categoryDropdownOpen,
  setCategoryDropdownOpen,
  categoryDropdownRef,
  imageFilter,
  setImageFilter,
  sortBy,
  setSortBy,
}) => {
  const [dropdownPosition, setDropdownPosition] = useState<'top' | 'bottom'>('bottom');
  const [localDropdownOpen, setLocalDropdownOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Use local state for mobile, external state for desktop
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
  const actualDropdownOpen = isMobile ? localDropdownOpen : categoryDropdownOpen;
  const setActualDropdownOpen = isMobile ? setLocalDropdownOpen : setCategoryDropdownOpen;

  // Determine dropdown position based on available space
  useEffect(() => {
    if (actualDropdownOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - buttonRect.bottom;
      const dropdownHeight = 240; // Approximate height of dropdown

      // Only position above if there's really not enough space below
      if (spaceBelow < dropdownHeight + 20) {
        setDropdownPosition('top');
      } else {
        setDropdownPosition('bottom');
      }
    }
  }, [actualDropdownOpen]);

  // Simple escape key handler
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && actualDropdownOpen) {
        setActualDropdownOpen(false);
      }
    };

    if (actualDropdownOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [actualDropdownOpen, setActualDropdownOpen]);

  const clearCategoryFilters = () => {
    setSelectedCategories([]);
  };

  const clearImageFilter = () => {
    setImageFilter({ hasImage: 'all' });
  };

  const clearSort = () => {
    setSortBy('none');
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-lg p-4 space-y-4 text-sm">
      <div className="flex justify-between items-center mb-2">
        <span className="font-semibold text-white">Bộ lọc</span>
        <button
          className="text-xs text-blue-400 hover:underline"
          onClick={() => {
            setSelectedCategories([]);
            setImageFilter({ hasImage: 'all' });
            setSortBy('none');
          }}
        >
          Xoá tất cả
        </button>
      </div>

      {/* Category Filter */}
      <div>
        <div className="font-medium text-gray-200 mb-3">Lọc theo danh mục</div>
        <div className="relative" ref={categoryDropdownRef}>
          <button
            ref={buttonRef}
            type="button"
            className="w-full flex items-center justify-between px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm hover:bg-gray-700 focus:outline-none focus:border-blue-500"
            onClick={() => setActualDropdownOpen(!actualDropdownOpen)}
          >
            <span className={selectedCategories.length > 0 ? 'text-white' : 'text-gray-400'}>
              {selectedCategories.length > 0
                ? `${selectedCategories.length} danh mục đã chọn`
                : 'Chọn danh mục...'}
            </span>
            <svg
              className="w-4 h-4 text-gray-400"
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

          {actualDropdownOpen && (
            <div
              className={`absolute left-0 w-full bg-gray-900 border border-gray-700 rounded-lg shadow-lg z-[9999] p-2 max-h-60 overflow-y-auto ${dropdownPosition === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}`}
            >
              {CATEGORY_OPTIONS.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className="w-full flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-gray-800 rounded text-left"
                  onClick={() => {
                    const isSelected = selectedCategories.includes(cat);
                    if (isSelected) {
                      setSelectedCategories(selectedCategories.filter((c) => c !== cat));
                    } else {
                      setSelectedCategories([...selectedCategories, cat]);
                    }
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(cat)}
                    readOnly
                    className="accent-blue-500 pointer-events-none"
                  />
                  <span className="text-gray-200 text-sm flex-1">{cat}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {selectedCategories.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {selectedCategories.map((cat) => (
              <span key={cat} className="bg-blue-700 text-white text-xs px-2 py-0.5 rounded-full">
                {cat}
              </span>
            ))}
            <button
              onClick={clearCategoryFilters}
              className="text-xs text-blue-400 hover:underline"
            >
              Xóa danh mục
            </button>
          </div>
        )}
      </div>

      {/* Image Filter */}
      <div>
        <div className="font-medium text-gray-200 mb-3">Lọc theo hình ảnh</div>
        <div className="relative">
          <select
            value={imageFilter.hasImage}
            onChange={(e) =>
              setImageFilter({ hasImage: e.target.value as 'all' | 'with_image' | 'without_image' })
            }
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm hover:bg-gray-700 focus:outline-none focus:border-blue-500 appearance-none cursor-pointer"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
              backgroundPosition: 'right 0.5rem center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: '1.5em 1.5em',
              paddingRight: '2.5rem',
            }}
          >
            <option value="all">Tất cả sản phẩm</option>
            <option value="with_image">Có hình ảnh</option>
            <option value="without_image">Không có hình ảnh</option>
          </select>
        </div>
        {imageFilter.hasImage !== 'all' && (
          <div className="flex flex-wrap gap-1 mt-2">
            <span className="bg-green-700 text-white text-xs px-2 py-0.5 rounded-full">
              {imageFilter.hasImage === 'with_image' ? 'Có hình ảnh' : 'Không có hình ảnh'}
            </span>
            <button onClick={clearImageFilter} className="text-xs text-green-400 hover:underline">
              Xóa bộ lọc
            </button>
          </div>
        )}
      </div>

      {/* Sort by Date Added */}
      <div>
        <div className="font-medium text-gray-200 mb-3">Sắp xếp theo ngày thêm</div>
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'none')}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm hover:bg-gray-700 focus:outline-none focus:border-blue-500 appearance-none cursor-pointer"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
              backgroundPosition: 'right 0.5rem center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: '1.5em 1.5em',
              paddingRight: '2.5rem',
            }}
          >
            <option value="none">Không sắp xếp</option>
            <option value="newest">Mới nhất trước</option>
            <option value="oldest">Cũ nhất trước</option>
          </select>
        </div>
        {sortBy !== 'none' && (
          <div className="flex flex-wrap gap-1 mt-2">
            <span className="bg-blue-700 text-white text-xs px-2 py-0.5 rounded-full">
              {sortBy === 'newest' ? 'Mới nhất trước' : 'Cũ nhất trước'}
            </span>
            <button onClick={clearSort} className="text-xs text-blue-400 hover:underline">
              Xóa sắp xếp
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryFilterDropdown;
