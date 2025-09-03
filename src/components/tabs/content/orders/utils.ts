import { format, addDays, parse } from 'date-fns';
import { vi } from 'date-fns/locale';

export const formatPhoneNumber = (phone: string) => {
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{4})(\d{3})(\d{3})$/);
  if (match) {
    return `${match[1]} ${match[2]} ${match[3]}`;
  }
  return phone;
};

export const getDayLabel = (dateStr: string) => {
  try {
    const date = parse(dateStr, 'dd/MM/yyyy', new Date());
    return format(date, 'EEEE', { locale: vi });
  } catch (error) {
    return '';
  }
};

export const getExpectedReturnDate = (dateStr: string) => {
  try {
    const date = parse(dateStr, 'dd/MM/yyyy', new Date());
    const returnDate = addDays(date, 2); // Add 2 days for 3-day rental period (rent on day 1, return on day 3)
    return {
      date: format(returnDate, 'dd/MM/yyyy'),
      day: format(returnDate, 'EEEE', { locale: vi }),
    };
  } catch (error) {
    return null;
  }
};
