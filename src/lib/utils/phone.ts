export function validatePhoneNumber(phone: string): boolean {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  // Must be 10 or 11 digits
  return /^\d{10,11}$/.test(digits);
}

export function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    // (XXXX) XXX - XXX
    return `(${digits.slice(0, 4)}) ${digits.slice(4, 7)} - ${digits.slice(7, 10)}`;
  } else if (digits.length === 11) {
    // (XXX) XXX - XXXX
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)} - ${digits.slice(6, 11)}`;
  }
  return phone;
}
