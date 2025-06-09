import type { Meta, StoryObj } from '@storybook/nextjs';
import FirstLevelTab from './FirstLevelTab';
import { DEFAULT_TAB_OPTIONS } from '@/constants/tabs';

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
  id: 'home',
  label: 'Trang Chủ',
  options: DEFAULT_TAB_OPTIONS,
};

const searchTab = {
  id: 'search-1',
  label: 'Search: test query',
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
