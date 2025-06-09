import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import BrowserTabBar from '@/components/tabs/browser/BrowserTabBar';
import { TabProvider } from '@/context/TabContext';

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
  decorators: [
    (Story) => (
      <TabProvider>
        <div style={{ background: '#222', padding: 24 }}>
          <Story />
        </div>
      </TabProvider>
    ),
  ],
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
type Story = StoryObj<typeof BrowserTabBar>;

export const Default: Story = {
  render: () => <BrowserTabBar />,
}; 