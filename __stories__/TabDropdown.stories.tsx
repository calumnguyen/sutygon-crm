import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import TabDropdown from '@/components/common/dropdowns/TabDropdown';
import { DEFAULT_TAB_OPTIONS } from '@/constants/tabs';

/**
 * TabDropdown Component
 * 
 * A reusable dropdown menu component used in the tab system.
 * Handles click-outside detection and option selection.
 * 
 * @component
 */
const meta: Meta<typeof TabDropdown> = {
  title: 'Common/TabDropdown',
  component: TabDropdown,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
A reusable dropdown menu component that provides a clean and accessible interface for option selection.
Features:
- Click-outside detection
- Keyboard navigation
- Smooth transitions
- Accessible markup
        `,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    isOpen: {
      control: 'boolean',
      description: 'Whether the dropdown is currently open',
    },
    onClose: {
      action: 'closed',
      description: 'Callback function when dropdown should close',
    },
    onSelect: {
      action: 'option selected',
      description: 'Callback function when an option is selected',
    },
    options: {
      control: 'object',
      description: 'Array of options to display in the dropdown',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default state of the TabDropdown.
 */
export const Default: Story = {
  args: {
    isOpen: true,
    options: DEFAULT_TAB_OPTIONS,
  },
};

/**
 * Closed state of the TabDropdown.
 */
export const Closed: Story = {
  args: {
    isOpen: false,
    options: DEFAULT_TAB_OPTIONS,
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows the TabDropdown in its closed state.',
      },
    },
  },
}; 