// Minimal interface for items that can have extensions
interface ItemWithExtension {
  isExtension?: boolean;
  extraDays?: number | null;
}

// Calculate expected return date based on order date and extension items
export function calculateExpectedReturnDate(orderDate: Date, orderItems: ItemWithExtension[]): Date {
  const extensionItem = orderItems.find(item => item.isExtension);
  const extraDays = extensionItem?.extraDays || 0;
  const totalRentalDays = 3 + extraDays; // Total rental period (3 base days + extensions)
  
  // For rental period calculation:
  // - Rent on day 1, return on day 3 = 3 days rental (add 2 days to start date)
  // - So we add (totalRentalDays - 1) to the order date
  const returnDate = new Date(orderDate);
  returnDate.setDate(orderDate.getDate() + (totalRentalDays - 1));
  
  return returnDate;
} 