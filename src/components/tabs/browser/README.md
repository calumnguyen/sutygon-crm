# Browser Tab Components

## Overview
The browser tab components provide a scalable and maintainable tab navigation system that mimics modern browser behavior. The system is designed to be highly customizable while maintaining consistent behavior across different use cases.

## Component Hierarchy
```
BrowserTabBar
├── FirstLevelTab
│   └── TabDropdown
└── SecondLevelTab
```

## Key Features
- **Scalable Architecture**: Components are designed to handle any number of tabs and nested levels
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **State Management**: Centralized state management through TabProvider
- **Customization**: Highly customizable through props and CSS classes
- **Accessibility**: Built with accessibility in mind
- **Performance**: Optimized with React.memo and efficient state updates

## Components

### BrowserTabBar
The main container component that manages the layout and interaction between first and second-level tabs.

#### Props
```typescript
interface BrowserTabBarProps {
  firstLevelTabs: FirstLevelTab[];
  secondLevelTabs: SecondLevelTab[];
  activeFirstLevelTab: FirstLevelTab | null;
  activeSecondLevelTab: SecondLevelTab | null;
  onFirstLevelTabSelect: (tab: FirstLevelTab) => void;
  onSecondLevelTabSelect: (tab: SecondLevelTab) => void;
  selectedDropdownOption?: TabOption;
  onDropdownSelect?: (option: TabOption) => void;
  onCloseTab?: (tab: FirstLevelTab) => void;
}
```

### FirstLevelTab
Represents a top-level tab with dropdown functionality and close button.

#### Props
```typescript
interface FirstLevelTabProps {
  tab: FirstLevelTab;
  isActive?: boolean;
  onSelect?: (tab: FirstLevelTab) => void;
  onClose?: (tab: FirstLevelTab) => void;
  dropdownOption?: TabOption;
  onDropdownSelect?: (option: TabOption) => void;
  isDefaultTab?: boolean;
}
```

### SecondLevelTab
Represents a sub-tab that appears under an active first-level tab.

#### Props
```typescript
interface SecondLevelTabProps {
  tab: SecondLevelTab;
  isActive?: boolean;
  onSelect?: (tab: SecondLevelTab) => void;
}
```

## Usage Examples

### Basic Implementation
```tsx
<TabProvider>
  <BrowserTabBar
    firstLevelTabs={tabs}
    secondLevelTabs={subTabs}
    activeFirstLevelTab={activeTab}
    activeSecondLevelTab={activeSubTab}
    onFirstLevelTabSelect={handleTabSelect}
    onSecondLevelTabSelect={handleSubTabSelect}
  />
</TabProvider>
```

### With Search Integration
```tsx
const handleSearch = (query: string) => {
  const newTab: FirstLevelTab = {
    id: `search-${Date.now()}`,
    label: `Search: ${query}`,
    options: DEFAULT_TAB_OPTIONS
  };
  // Add tab and update state
};
```

## Best Practices

1. **State Management**
   - Use TabProvider for centralized state management
   - Keep tab state in a parent component
   - Use immutable state updates

2. **Performance**
   - Memoize callback functions
   - Use React.memo for components
   - Implement efficient tab switching

3. **Styling**
   - Use consistent height and spacing
   - Maintain visual hierarchy
   - Follow accessibility guidelines

4. **Error Handling**
   - Validate tab data
   - Handle edge cases
   - Provide fallback UI

## Future Improvements

1. **Planned Features**
   - Tab reordering
   - Tab groups
   - Tab persistence
   - Keyboard navigation

2. **Technical Debt**
   - Performance optimization
   - Test coverage
   - Documentation updates

## Contributing
When contributing to these components:
1. Follow the established patterns
2. Update documentation
3. Add tests
4. Create Storybook stories
5. Consider accessibility
6. Maintain type safety 