import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FirstLevelTab from '../FirstLevelTab';
import { DEFAULT_TAB_OPTIONS } from '@/constants/tabs';

describe('FirstLevelTab', () => {
  const mockTab = {
    id: 'home',
    label: 'Trang Chủ',
    options: DEFAULT_TAB_OPTIONS,
  };

  const mockOnSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with default props', () => {
    render(
      <FirstLevelTab
        tab={mockTab}
        isActive={false}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText('Trang Chủ')).toBeInTheDocument();
  });

  it('applies active styles when isActive is true', () => {
    render(
      <FirstLevelTab
        tab={mockTab}
        isActive={true}
        onSelect={mockOnSelect}
      />
    );

    const tab = screen.getByText('Trang Chủ').parentElement;
    expect(tab).toHaveClass('bg-gray-800');
  });

  it('toggles dropdown when clicked', () => {
    render(
      <FirstLevelTab
        tab={mockTab}
        isActive={false}
        onSelect={mockOnSelect}
      />
    );

    const tab = screen.getByText('Trang Chủ').parentElement;
    fireEvent.click(tab!);

    // Check if dropdown options are rendered
    DEFAULT_TAB_OPTIONS.forEach(option => {
      expect(screen.getByText(option.label)).toBeInTheDocument();
    });
  });

  it('calls onSelect with correct tab when option is selected', () => {
    render(
      <FirstLevelTab
        tab={mockTab}
        isActive={false}
        onSelect={mockOnSelect}
      />
    );

    // Open dropdown
    const tab = screen.getByText('Trang Chủ').parentElement;
    fireEvent.click(tab!);

    // Select an option
    const option = screen.getByText('Đơn Hàng');
    fireEvent.click(option);

    expect(mockOnSelect).toHaveBeenCalledWith({
      id: 'orders',
      label: 'Đơn Hàng',
      options: DEFAULT_TAB_OPTIONS,
    });
  });

  it('closes dropdown when clicking outside', () => {
    render(
      <FirstLevelTab
        tab={mockTab}
        isActive={false}
        onSelect={mockOnSelect}
      />
    );

    // Open dropdown
    const tab = screen.getByText('Trang Chủ').parentElement;
    fireEvent.click(tab!);

    // Click outside
    fireEvent.mouseDown(document.body);

    // Check if dropdown is closed
    DEFAULT_TAB_OPTIONS.forEach(option => {
      expect(screen.queryByText(option.label)).not.toBeInTheDocument();
    });
  });
}); 