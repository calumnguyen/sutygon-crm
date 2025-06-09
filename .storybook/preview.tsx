import React from 'react';
import type { Preview } from '@storybook/react';
import { TabProvider } from '../src/context/TabContext';
import { AppProvider } from '../src/context/AppContext';
import '../src/app/globals.css';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <AppProvider>
        <TabProvider>
          <div className="min-h-screen bg-gray-900">
            <Story />
          </div>
        </TabProvider>
      </AppProvider>
    ),
  ],
};

export default preview; 