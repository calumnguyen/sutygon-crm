/* eslint-disable storybook/no-renderer-packages */
import type { Meta, StoryObj } from '@storybook/react';
import FirstLevelTab from './FirstLevelTab';
import { DEFAULT_TAB_OPTIONS } from '@/constants/tabs';
import { createTabId } from '@/types/tabTypes';

const meta: Meta<typeof FirstLevelTab> = {
  title: 'Components/Tabs/FirstLevelTab',
  component: FirstLevelTab,
  decorators: [
    (Story) => (
      <div className="bg-gray-800 p-4">
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof FirstLevelTab>;

const defaultTab = {
  id: createTabId('home'),
  label: 'Trang Chủ',
  type: 'first' as const,
  options: DEFAULT_TAB_OPTIONS,
};

const searchTab = {
  id: createTabId('search-1'),
  label: 'Search: test query',
  type: 'first' as const,
  options: DEFAULT_TAB_OPTIONS,
};

export const Default: Story = {
  args: {
    tab: defaultTab,
    isActive: true,
    isDefaultTab: true,
  },
};

export const Inactive: Story = {
  args: {
    tab: defaultTab,
    isActive: false,
    isDefaultTab: true,
  },
};

export const SearchTab: Story = {
  args: {
    tab: searchTab,
    isActive: true,
    isDefaultTab: false,
  },
};

export const WithDropdown: Story = {
  args: {
    tab: defaultTab,
    isActive: true,
    isDefaultTab: true,
    dropdownOption: DEFAULT_TAB_OPTIONS[0],
    onDropdownSelect: () => {},
  },
};

export const WithCloseButton: Story = {
  args: {
    tab: searchTab,
    isActive: true,
    isDefaultTab: false,
    onClose: () => {},
  },
};
