import type { Meta, StoryObj } from '@storybook/react';
import BrowserTabBar from './BrowserTabBar';
import { TabProvider } from '@/context/TabContext';
import { DEFAULT_TAB_OPTIONS } from '@/constants/tabs';

const meta = {
  title: 'Components/Tabs/BrowserTabBar',
  component: BrowserTabBar,
  decorators: [
    (Story) => (
      <TabProvider>
        <div className="bg-gray-800 p-4">
          <Story />
        </div>
      </TabProvider>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof BrowserTabBar>;

export default meta;
type Story = StoryObj<typeof BrowserTabBar>;

const defaultTabs = [
  {
    id: 'home',
    label: 'Trang Chủ',
    options: DEFAULT_TAB_OPTIONS,
  },
];

const multipleTabs = [
  ...defaultTabs,
  {
    id: 'search-1',
    label: 'Search: test query',
    options: DEFAULT_TAB_OPTIONS,
  },
  {
    id: 'search-2',
    label: 'Search: another query',
    options: DEFAULT_TAB_OPTIONS,
  },
];

const subTabs = [
  {
    id: 'sub-1',
    label: 'Sub Tab 1',
    parentId: 'home',
  },
  {
    id: 'sub-2',
    label: 'Sub Tab 2',
    parentId: 'home',
  },
];

export const Default: Story = {
  args: {
    firstLevelTabs: defaultTabs,
    secondLevelTabs: [],
    activeFirstLevelTab: defaultTabs[0],
    activeSecondLevelTab: undefined,
    onFirstLevelTabSelect: () => {},
    onSecondLevelTabSelect: () => {},
  },
};

export const WithMultipleTabs: Story = {
  args: {
    firstLevelTabs: multipleTabs,
    secondLevelTabs: [],
    activeFirstLevelTab: multipleTabs[1],
    activeSecondLevelTab: undefined,
    onFirstLevelTabSelect: () => {},
    onSecondLevelTabSelect: () => {},
  },
};

export const WithSubTabs: Story = {
  args: {
    firstLevelTabs: defaultTabs,
    secondLevelTabs: subTabs,
    activeFirstLevelTab: defaultTabs[0],
    activeSecondLevelTab: subTabs[0],
    onFirstLevelTabSelect: () => {},
    onSecondLevelTabSelect: () => {},
  },
};

export const WithDropdown: Story = {
  args: {
    firstLevelTabs: defaultTabs,
    secondLevelTabs: [],
    activeFirstLevelTab: defaultTabs[0],
    activeSecondLevelTab: undefined,
    selectedDropdownOption: DEFAULT_TAB_OPTIONS[0],
    onFirstLevelTabSelect: () => {},
    onSecondLevelTabSelect: () => {},
    onDropdownSelect: () => {},
  },
}; 