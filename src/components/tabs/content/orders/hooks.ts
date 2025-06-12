import { useState, useEffect } from 'react';
import { parse, format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface Customer {
  id: number;
  name: string;
  company?: string | null;
  phone: string;
}

interface AddCustomerData {
  name: string;
  phone: string;
  company?: string;
  notes?: string;
}

export function useOrderNewFlow() {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [phone, setPhone] = useState<string>('');
  const [searching, setSearching] = useState<boolean>(false);
  const [searched, setSearched] = useState<boolean>(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [date, setDate] = useState<string>('');
  const [showCalendarModal, setShowCalendarModal] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [existingPhones, setExistingPhones] = useState<string[]>([]);
  const [prefillPhone, setPrefillPhone] = useState<string>('');

  useEffect(() => {
    async function fetchPhones() {
      try {
        const res = await fetch('/api/customers');
        const customers: Customer[] = await res.json();
        setExistingPhones(customers.map((c: Customer) => c.phone));
      } catch (err) {
        setExistingPhones([]);
      }
    }
    fetchPhones();
  }, []);

  const handlePhoneInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 11);
    setPhone(value);
    setSearched(false);
    setCustomer(null);
  };

  const handlePhoneEnter = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && phone) {
      setSearching(true);
      setSearched(false);
      setCustomer(null);
      try {
        const res = await fetch(`/api/customers?phone=${phone}`);
        const data: Customer = await res.json();
        setCustomer(data);
      } catch (err) {
        setCustomer(null);
      } finally {
        setSearching(false);
        setSearched(true);
      }
    }
  };

  const handleAddCustomer = async (customerData: AddCustomerData) => {
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: customerData.name,
          phone: customerData.phone,
          company: customerData.company ?? null,
          notes: customerData.notes ?? null,
          address: null,
          activeOrdersCount: 0,
          lateOrdersCount: 0,
        }),
      });
      if (!res.ok) throw new Error('Failed to add customer');
      const inserted: Customer = await res.json();
      setCustomer(inserted);
      setIsAddModalOpen(false);
      setExistingPhones((prev: string[]) => [...prev, inserted.phone]);
      return true;
    } catch (error) {
      console.error('Failed to add customer:', error);
      return false;
    }
  };

  const handleOpenAddModal = () => {
    setPrefillPhone(phone);
    setIsAddModalOpen(true);
  };

  const handleCustomerSelect = () => {
    if (customer) {
      setCurrentStep(1);
    }
  };

  const handleDateInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d]/g, '').slice(0, 8);
    let formatted = '';
    if (value.length > 0) {
      formatted = value.slice(0, 2);
    }
    if (value.length > 2) {
      formatted += '/' + value.slice(2, 4);
    }
    if (value.length > 4) {
      formatted += '/' + value.slice(4, 8);
    }
    setDate(formatted);
  };

  const validateDate = (dateStr: string): boolean => {
    if (!dateStr || dateStr.length !== 10) return false;
    const [day, month, year] = dateStr.split('/').map(Number);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return false;
    if (year < 2000 || year > 2100) return false;
    if (month < 1 || month > 12) return false;
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day < 1 || day > daysInMonth) return false;
    return true;
  };

  const parseDate = (str: string): Date | null => {
    if (!str || str.length !== 10) return null;
    const parsed = parse(str, 'dd/MM/yyyy', new Date());
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  const formatDateString = (date: Date): string => {
    return format(date, 'dd/MM/yyyy');
  };

  useEffect(() => {
    if (currentStep === 1 && validateDate(date)) {
      const timeout = setTimeout(() => setCurrentStep(2), 350);
      return () => clearTimeout(timeout);
    }
  }, [date, currentStep]);

  return {
    currentStep,
    setCurrentStep,
    phone,
    setPhone,
    searching,
    setSearching,
    searched,
    setSearched,
    customer,
    setCustomer,
    date,
    setDate,
    showCalendarModal,
    setShowCalendarModal,
    isAddModalOpen,
    setIsAddModalOpen,
    existingPhones,
    setExistingPhones,
    prefillPhone,
    setPrefillPhone,
    handlePhoneInput,
    handlePhoneEnter,
    handleAddCustomer,
    handleOpenAddModal,
    handleCustomerSelect,
    handleDateInput,
    validateDate,
    parseDate,
    formatDateString,
  };
}
