import type { Meta, StoryObj } from '@storybook/nextjs';
import SecondLevelTab from './SecondLevelTab';

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
  id: 'sub-1',
  label: 'Sub Tab 1',
  parentId: 'home',
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
