# Sutygon CRM

A modern, scalable CRM system built with Next.js and TypeScript.

## Project Structure

```
src/
├── app/                 # Next.js app directory
├── components/          # React components
│   ├── common/         # Shared components
│   └── tabs/           # Tab-related components
├── context/            # React context providers
├── hooks/              # Custom React hooks
├── styles/             # Global styles
├── types/              # TypeScript type definitions
└── constants/          # Application constants
```

## Key Features

- **Tab System**: Hierarchical tab management with first and second level tabs
- **Search Functionality**: Dynamic tab creation based on search queries
- **Responsive Design**: Modern UI with dark theme
- **Type Safety**: Full TypeScript support

## Development

### Prerequisites

- Node.js 18+
- npm 9+

### Setup

1. Install dependencies:

```bash
npm install
```

2. Run development server:

```bash
npm run dev
```

3. Build for production:

```bash
npm run build
```

## Architecture

### Tab System

The tab system is built with scalability in mind:

- **TabContext**: Manages tab state and operations
- **TabId**: Branded type for type-safe tab identification
- **Tab Actions**: Centralized tab operations
- **Tab Components**: Reusable tab UI components

### Error Handling

- Error boundaries for component-level error catching
- Type-safe error handling with TypeScript
- Graceful fallbacks for failed operations

### Performance

- Lazy loading for tab content
- Memoized components to prevent unnecessary re-renders
- Efficient state management with React Context

## Contributing

1. Create a feature branch
2. Make your changes
3. Submit a pull request

## License

MIT
