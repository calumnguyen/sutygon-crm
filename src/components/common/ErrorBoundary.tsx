"use client";
import React, { Component, ErrorInfo, ReactNode } from 'react';

/**
 * Props for the ErrorBoundary component.
 * 
 * @interface Props
 * @property {ReactNode} children - Child components to render
 * @property {ReactNode} [fallback] - Optional custom fallback UI to display when an error occurs
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 * 
 * // With custom fallback
 * <ErrorBoundary fallback={<div>Something went wrong</div>}>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */
interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * State for the ErrorBoundary component.
 * 
 * @interface State
 * @property {boolean} hasError - Whether an error has occurred
 * @property {Error | null} error - The error that was caught, if any
 * 
 * @example
 * ```tsx
 * const state: State = {
 *   hasError: true,
 *   error: new Error('Something went wrong')
 * };
 * ```
 */
interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary Component
 * 
 * A reusable error boundary component that catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of the component tree that crashed.
 * 
 * This component implements the error boundary lifecycle methods:
 * - `getDerivedStateFromError`: Updates state when an error occurs
 * - `componentDidCatch`: Logs error information
 * 
 * @component
 * @param {Props} props - Component props
 * @param {ReactNode} props.children - Child components to render
 * @param {ReactNode} [props.fallback] - Optional custom fallback UI
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 * 
 * // With custom fallback
 * <ErrorBoundary fallback={<div>Something went wrong</div>}>
 *   <YourComponent />
 * </ErrorBoundary>
 * 
 * // With error logging
 * <ErrorBoundary
 *   fallback={({ error, resetError }) => (
 *     <div>
 *       <h2>Something went wrong</h2>
 *       <p>{error.message}</p>
 *       <button onClick={resetError}>Try again</button>
 *     </div>
 *   )}
 * >
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 * 
 * @remarks
 * - This component should be used to wrap components that might throw errors
 * - It will catch errors in the component tree below it
 * - It will not catch errors in:
 *   - Event handlers
 *   - Asynchronous code
 *   - Server-side rendering
 *   - Errors thrown in the error boundary itself
 * 
 * @see {@link https://reactjs.org/docs/error-boundaries.html React Error Boundaries}
 */
class ErrorBoundary extends Component<Props, State> {
  /**
   * Initializes the component state.
   * 
   * @param {Props} props - Component props
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  /**
   * Updates the state when an error occurs.
   * This is a static lifecycle method that is called when an error is thrown in a descendant component.
   * 
   * @param {Error} error - The error that was thrown
   * @returns {State} The new state
   */
  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  /**
   * Logs error information when an error occurs.
   * This lifecycle method is called after an error has been thrown in a descendant component.
   * 
   * @param {Error} error - The error that was thrown
   * @param {ErrorInfo} errorInfo - Additional error information
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to an error reporting service
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
  }

  /**
   * Renders the component.
   * If an error has occurred, it renders the fallback UI.
   * Otherwise, it renders the children.
   * 
   * @returns {ReactNode} The rendered component
   */
  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h2 className="text-lg font-semibold text-red-800">Something went wrong</h2>
          <p className="mt-2 text-sm text-red-600">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 