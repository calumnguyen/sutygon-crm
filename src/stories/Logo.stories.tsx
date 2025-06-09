import React from 'react';
import { Meta, StoryObj } from '@storybook/react';
import Logo from '@/components/common/Logo';

const meta: Meta<typeof Logo> = {
  title: 'Common/Logo',
  component: Logo,
  parameters: {
    layout: 'centered',
  },
};

export default meta;

type Story = StoryObj<typeof Logo>;

export const Default: Story = {
  render: () => (
    <div style={{ backgroundColor: '#f0f0f0', padding: '20px', borderRadius: '8px' }}>
      <Logo />
    </div>
  ),
}; 