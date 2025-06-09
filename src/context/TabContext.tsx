'use client';
import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { TabState, TabAction, FirstLevelTab, SecondLevelTab } from '@/types/tabs';

// Context type definition
interface TabContextType {
  state: TabState;
  dispatch: React.Dispatch<TabAction>;
  addFirstLevelTab: (tab: FirstLevelTab) => void;
  removeFirstLevelTab: (tabId: string) => void;
  addSecondLevelTab: (tab: SecondLevelTab) => void;
  removeSecondLevelTab: (tabId: string) => void;
  setActiveFirstLevelTab: (tab: FirstLevelTab) => void;
  setActiveSecondLevelTab: (tab: SecondLevelTab) => void;
}

/**
 * Initial state for the tab context.
 *
 * @constant
 * @type {TabState}
 */
const initialState: TabState = {
  firstLevelTabs: [],
  secondLevelTabs: [],
  isLoading: false,
  error: null,
};

/**
 * TabContext provides a centralized state management for the tab system.
 * It manages the state of first and second level tabs, their active states,
 * loading states, and error handling.
 *
 * @type {React.Context<TabContextType>}
 *
 * @example
 * ```tsx
 * // Using the context in a component
 * const { state, dispatch } = useContext(TabContext);
 *
 * // Accessing state
 * const { firstLevelTabs, activeFirstLevelTab } = state;
 *
 * // Dispatching actions
 * dispatch({ type: 'SET_ACTIVE_FIRST_LEVEL_TAB', payload: tab });
 * ```
 */
const TabContext = createContext<TabContextType | undefined>(undefined);

/**
 * Tab reducer function that handles all tab-related state updates.
 *
 * @param {TabState} state - Current state
 * @param {TabAction} action - Action to perform
 * @returns {TabState} New state
 *
 * @example
 * ```tsx
 * // Setting first level tabs
 * dispatch({ type: 'SET_FIRST_LEVEL_TABS', payload: tabs });
 *
 * // Setting active first level tab
 * dispatch({ type: 'SET_ACTIVE_FIRST_LEVEL_TAB', payload: tab });
 *
 * // Setting loading state
 * dispatch({ type: 'SET_LOADING', payload: true });
 *
 * // Setting error state
 * dispatch({ type: 'SET_ERROR', payload: new Error('Failed to load tabs') });
 * ```
 */
function tabReducer(state: TabState, action: TabAction): TabState {
  switch (action.type) {
    case 'SET_FIRST_LEVEL_TABS':
      return {
        ...state,
        firstLevelTabs: action.payload,
        error: null,
      };

    case 'SET_SECOND_LEVEL_TABS':
      return {
        ...state,
        secondLevelTabs: action.payload,
        error: null,
      };

    case 'SET_ACTIVE_FIRST_LEVEL_TAB':
      return {
        ...state,
        activeFirstLevelTab: action.payload,
        error: null,
      };

    case 'SET_ACTIVE_SECOND_LEVEL_TAB':
      return {
        ...state,
        activeSecondLevelTab: action.payload,
        error: null,
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
        error: null,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };

    case 'ADD_FIRST_LEVEL_TAB':
      return {
        ...state,
        firstLevelTabs: [...state.firstLevelTabs, action.payload],
        activeFirstLevelTab: action.payload,
        error: null,
      };

    case 'REMOVE_FIRST_LEVEL_TAB':
      const updatedFirstLevelTabs = state.firstLevelTabs.filter((tab) => tab.id !== action.payload);
      return {
        ...state,
        firstLevelTabs: updatedFirstLevelTabs,
        activeFirstLevelTab:
          state.activeFirstLevelTab?.id === action.payload
            ? updatedFirstLevelTabs[0]
            : state.activeFirstLevelTab,
        error: null,
      };

    case 'ADD_SECOND_LEVEL_TAB':
      return {
        ...state,
        secondLevelTabs: [...state.secondLevelTabs, action.payload],
        activeSecondLevelTab: action.payload,
        error: null,
      };

    case 'REMOVE_SECOND_LEVEL_TAB':
      const updatedSecondLevelTabs = state.secondLevelTabs.filter(
        (tab) => tab.id !== action.payload
      );
      return {
        ...state,
        secondLevelTabs: updatedSecondLevelTabs,
        activeSecondLevelTab:
          state.activeSecondLevelTab?.id === action.payload
            ? updatedSecondLevelTabs[0]
            : state.activeSecondLevelTab,
        error: null,
      };

    case 'UPDATE_FIRST_LEVEL_TAB':
      return {
        ...state,
        firstLevelTabs: state.firstLevelTabs.map((tab) =>
          tab.id === action.payload.id ? { ...tab, label: action.payload.label } : tab
        ),
      };

    default:
      return state;
  }
}

/**
 * Props for the TabProvider component.
 *
 * @interface TabProviderProps
 * @property {ReactNode} children - Child components to render
 * @property {Object} initialTabs - Initial tabs to set
 */
interface TabProviderProps {
  children: ReactNode;
  initialTabs?: {
    firstLevelTabs?: FirstLevelTab[];
    secondLevelTabs?: SecondLevelTab[];
  };
}

/**
 * TabProvider Component
 *
 * A context provider component that manages the state of the tab system.
 * It provides access to the tab state and dispatch function to all child components.
 *
 * @component
 * @param {TabProviderProps} props - Component props
 * @param {ReactNode} props.children - Child components to render
 *
 * @example
 * ```tsx
 * // Basic usage
 * <TabProvider>
 *   <YourComponent />
 * </TabProvider>
 *
 * // Using the context in a child component
 * const YourComponent = () => {
 *   const { state, dispatch } = useContext(TabContext);
 *
 *   return (
 *     <div>
 *       {state.firstLevelTabs.map(tab => (
 *         <button
 *           key={tab.id}
 *           onClick={() => dispatch({ type: 'SET_ACTIVE_FIRST_LEVEL_TAB', payload: tab })}
 *         >
 *           {tab.label}
 *         </button>
 *       ))}
 *     </div>
 *   );
 * };
 * ```
 *
 * @remarks
 * - The provider should be placed at a high level in the component tree
 * - All components that need access to tab state should be children of this provider
 * - The context provides both state and dispatch function
 * - State updates are handled through the reducer function
 * - Loading and error states are managed automatically
 *
 * @see {@link TabContext} for more information about the context
 * @see {@link tabReducer} for more information about state updates
 */
export function TabProvider({ children, initialTabs }: TabProviderProps) {
  const [state, dispatch] = useReducer(tabReducer, {
    ...initialState,
    firstLevelTabs: initialTabs?.firstLevelTabs || [],
    secondLevelTabs: initialTabs?.secondLevelTabs || [],
  });

  const addFirstLevelTab = (tab: FirstLevelTab) => {
    dispatch({ type: 'ADD_FIRST_LEVEL_TAB', payload: tab });
  };

  const removeFirstLevelTab = (tabId: string) => {
    dispatch({ type: 'REMOVE_FIRST_LEVEL_TAB', payload: tabId });
  };

  const addSecondLevelTab = (tab: SecondLevelTab) => {
    dispatch({ type: 'ADD_SECOND_LEVEL_TAB', payload: tab });
  };

  const removeSecondLevelTab = (tabId: string) => {
    dispatch({ type: 'REMOVE_SECOND_LEVEL_TAB', payload: tabId });
  };

  const setActiveFirstLevelTab = (tab: FirstLevelTab) => {
    dispatch({ type: 'SET_ACTIVE_FIRST_LEVEL_TAB', payload: tab });
  };

  const setActiveSecondLevelTab = (tab: SecondLevelTab) => {
    dispatch({ type: 'SET_ACTIVE_SECOND_LEVEL_TAB', payload: tab });
  };

  const value = {
    state,
    dispatch,
    addFirstLevelTab,
    removeFirstLevelTab,
    addSecondLevelTab,
    removeSecondLevelTab,
    setActiveFirstLevelTab,
    setActiveSecondLevelTab,
  };

  return <TabContext.Provider value={value}>{children}</TabContext.Provider>;
}

/**
 * Custom hook to use the tab context.
 *
 * @returns {TabContextType} The tab context
 *
 * @example
 * ```tsx
 * const YourComponent = () => {
 *   const { state, dispatch } = useTabContext();
 *
 *   // Access state
 *   const { firstLevelTabs, activeFirstLevelTab } = state;
 *
 *   // Dispatch actions
 *   const handleTabClick = (tab: FirstLevelTab) => {
 *     dispatch({ type: 'SET_ACTIVE_FIRST_LEVEL_TAB', payload: tab });
 *   };
 *
 *   return (
 *     <div>
 *       {firstLevelTabs.map(tab => (
 *         <button
 *           key={tab.id}
 *           onClick={() => handleTabClick(tab)}
 *           className={tab.id === activeFirstLevelTab?.id ? 'active' : ''}
 *         >
 *           {tab.label}
 *         </button>
 *       ))}
 *     </div>
 *   );
 * };
 * ```
 *
 * @throws {Error} If used outside of a TabProvider
 */
export function useTabContext() {
  const context = useContext(TabContext);
  if (context === undefined) {
    throw new Error('useTabContext must be used within a TabProvider');
  }
  return context;
}

export default TabContext;
