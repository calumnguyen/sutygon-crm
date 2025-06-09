import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import FirstLevelTab from '@/components/tabs/browser/FirstLevelTab';
import { DEFAULT_TAB_OPTIONS } from '@/constants/tabs';

/**
 * FirstLevelTab Component
 * 
 * A specialized tab component that includes a dropdown menu for navigation options.
 * This is typically used as the first tab in the tab bar, providing access to main navigation items.
 * 
 * @component
 */
const meta: Meta<typeof FirstLevelTab> = {
  title: 'Navigation/FirstLevelTab',
  component: FirstLevelTab,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
A specialized tab component that provides a dropdown menu for navigation options.
Features:
- Dropdown menu with navigation options
- Active state indication
- Click-outside detection
- Smooth transitions
        `,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    isActive: {
      control: 'boolean',
      description: 'Whether the tab is currently active',
    },
    onSelect: {
      action: 'option selected',
      description: 'Callback function when a tab option is selected',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default state of the FirstLevelTab.
 */
export const Default: Story = {
  args: {
    isActive: false,
  },
};

/**
 * Active state of the FirstLevelTab.
 */
export const Active: Story = {
  args: {
    isActive: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows the FirstLevelTab in its active state.',
      },
    },
  },
}; 