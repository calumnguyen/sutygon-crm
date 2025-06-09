import type { Meta, StoryObj } from '@storybook/nextjs';
import BrowserTabBar from './BrowserTabBar';
import { TabProvider } from '@/context/TabContext';

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

export const Default: Story = {
  render: () => <BrowserTabBar />,
};
