# Sutygon CRM

A modern, scalable CRM application built with Next.js, TypeScript, and Tailwind CSS.

## Features

- 🎯 Two-level tab navigation system
- 🎨 Modern and responsive UI
- 🔄 Real-time state management
- 🛡️ Type-safe development
- 📱 Mobile-first design
- 🧪 Comprehensive test coverage
- 📚 Well-documented codebase

## Project Structure

```
sutygon-crm/
├── src/
│   ├── app/                 # Next.js app directory
│   ├── components/         # React components
│   │   ├── common/        # Shared components
│   │   └── tabs/         # Tab-related components
│   ├── context/          # React context providers
│   ├── types/           # TypeScript type definitions
│   ├── constants/      # Application constants
│   └── styles/        # Global styles
├── public/           # Static assets
└── tests/          # Test files
```

## Component Architecture

### Tab System

The application uses a two-level tab system:

1. **First Level Tabs**
   - Main navigation items
   - Dropdown menu for options
   - Active state management
   - Click-outside detection

2. **Second Level Tabs**
   - Sub-navigation items
   - Parent-child relationship
   - Active state management

### State Management

The application uses React Context for state management:

- `TabContext`: Manages tab state and actions
- `AppContext`: Manages application-wide state

## Development

### Prerequisites

- Node.js 18.x or later
- npm 9.x or later

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Run Storybook
npm run storybook
```

### Testing

The project uses Jest and React Testing Library for testing:

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm test -- --watch
```

### Storybook

The project uses Storybook for component development and documentation:

```bash
# Start Storybook
npm run storybook
```

## Performance Optimizations

1. **Memoization**
   - Component memoization with `React.memo`
   - Callback memoization with `useCallback`
   - Value memoization with `useMemo`

2. **State Management**
   - Efficient state updates
   - Proper state initialization
   - Error handling

3. **Rendering**
   - Conditional rendering
   - Lazy loading
   - Code splitting

## Error Handling

1. **Error Boundaries**
   - Component-level error catching
   - Fallback UI
   - Error logging

2. **Type Safety**
   - TypeScript strict mode
   - Proper type definitions
   - Null checks

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
