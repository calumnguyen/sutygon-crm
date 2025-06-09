import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import BrowserTabBar from '@/components/tabs/browser/BrowserTabBar';
import { DEFAULT_TAB_OPTIONS } from '@/constants/tabs';

/**
 * BrowserTabBar Component
 * 
 * A tab bar component that displays both first and second level tabs.
 * Features:
 * - First level tabs with dropdown menu
 * - Second level tabs for sub-navigation
 * - Active state management
 * - Tab closing functionality
 * 
 * @component
 */
const meta: Meta<typeof BrowserTabBar> = {
  title: 'Navigation/BrowserTabBar',
  component: BrowserTabBar,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
A tab bar component that provides a browser-like navigation experience.
Features:
- First level tabs with dropdown menu
- Second level tabs for sub-navigation
- Active state management
- Tab closing functionality
        `,
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const defaultFirstLevelTabs = [
  {
    id: 'home',
    label: 'Trang Chủ',
    options: DEFAULT_TAB_OPTIONS,
  },
];

const defaultSecondLevelTabs = [
  {
    id: 'all',
    label: 'Tất Cả',
    parentId: 'orders',
  },
];

/**
 * Default state of the BrowserTabBar.
 */
export const Default: Story = {
  args: {
    firstLevelTabs: defaultFirstLevelTabs,
    secondLevelTabs: [],
    activeFirstLevelTab: defaultFirstLevelTabs[0],
    activeSecondLevelTab: undefined,
    onFirstLevelTabSelect: (tab) => console.log('First level tab selected:', tab),
    onSecondLevelTabSelect: (tab) => console.log('Second level tab selected:', tab),
  },
};

/**
 * BrowserTabBar with multiple first level tabs.
 */
export const MultipleLevel1Tabs: Story = {
  args: {
    firstLevelTabs: [
      ...defaultFirstLevelTabs,
      {
        id: 'orders',
        label: 'Đơn Hàng',
        options: DEFAULT_TAB_OPTIONS,
      },
    ],
    secondLevelTabs: [],
    activeFirstLevelTab: defaultFirstLevelTabs[0],
    activeSecondLevelTab: undefined,
    onFirstLevelTabSelect: (tab) => console.log('First level tab selected:', tab),
    onSecondLevelTabSelect: (tab) => console.log('Second level tab selected:', tab),
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows the BrowserTabBar with multiple first level tabs.',
      },
    },
  },
};

/**
 * BrowserTabBar with both first and second level tabs.
 */
export const WithLevel2Tabs: Story = {
  args: {
    firstLevelTabs: defaultFirstLevelTabs,
    secondLevelTabs: defaultSecondLevelTabs,
    activeFirstLevelTab: defaultFirstLevelTabs[0],
    activeSecondLevelTab: defaultSecondLevelTabs[0],
    onFirstLevelTabSelect: (tab) => console.log('First level tab selected:', tab),
    onSecondLevelTabSelect: (tab) => console.log('Second level tab selected:', tab),
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows the BrowserTabBar with both first and second level tabs.',
      },
    },
  },
};

export const SearchResults: Story = {
  args: {
    level1Tabs: [
      {
        id: 'search-1',
        title: 'Search: "John"',
        isActive: true,
        level: 1,
      },
    ],
    level2Tabs: [
      {
        id: 'search-customers',
        title: 'Customers',
        isActive: true,
        level: 2,
      },
      {
        id: 'search-orders',
        title: 'Orders',
        isActive: false,
        level: 2,
      },
      {
        id: 'search-inventory',
        title: 'Inventory',
        isActive: false,
        level: 2,
      },
    ],
  },
}; 