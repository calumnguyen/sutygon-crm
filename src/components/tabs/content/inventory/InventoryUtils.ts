// Format a number string with commas
export function formatNumberWithCommas(value: string) {
  if (!value) return '';
  return value.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Format a number as VND currency
export function formatPriceVND(price: number | string) {
  const num = typeof price === 'string' ? parseInt(price.replace(/\D/g, ''), 10) : price;
  if (isNaN(num)) return '';
  return num.toLocaleString('vi-VN') + ' ₫';
}

// Parse tags from input string
export function parseTags(input: string, max = 10) {
  return input
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .slice(0, max);
}

// Map category to code
export const CATEGORY_CODE_MAP: Record<string, string> = {
  'Áo Dài': 'AD',
  Áo: 'AO',
  Quần: 'QU',
  'Văn Nghệ': 'VN',
  'Đồ Tây': 'DT',
  Giầy: 'GI',
  'Dụng Cụ': 'DC',
};

// Generate item ID based on category and count
export function generateItemId(category: string, count: number) {
  let code = CATEGORY_CODE_MAP[category] || 'XX';
  // Remove accent marks from code
  code = code
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\u0300-\u036f/g, '');
  return `${code}-${count.toString().padStart(6, '0')}`;
}
