/* eslint-disable storybook/no-renderer-packages */
import type { Meta, StoryObj } from '@storybook/react';
import SecondLevelTab from './SecondLevelTab';
import { createTabId } from '@/types/tabTypes';

const meta = {
  title: 'Components/Tabs/SecondLevelTab',
  component: SecondLevelTab,
  decorators: [
    (Story) => (
      <div className="bg-gray-700 p-4">
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof SecondLevelTab>;

export default meta;
type Story = StoryObj<typeof SecondLevelTab>;

const defaultTab = {
  id: createTabId('sub-1'),
  label: 'Sub Tab 1',
  type: 'second' as const,
  parentId: createTabId('home'),
};

export const Default: Story = {
  args: {
    tab: defaultTab,
    isActive: true,
  },
};

export const Inactive: Story = {
  args: {
    tab: defaultTab,
    isActive: false,
  },
};

export const LongLabel: Story = {
  args: {
    tab: {
      ...defaultTab,
      label: 'This is a very long sub tab label that might need truncation',
    },
    isActive: true,
  },
};
