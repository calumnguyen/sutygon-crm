'use client';
import React, { Component, ErrorInfo, ReactNode } from 'react';

/**
 * Props for the ErrorBoundary component.
 *
 * @interface Props
 * @property {ReactNode} children - Child components to render
 * @property {ReactNode} [fallback] - Optional custom fallback UI to display when an error occurs
 * @property {function} [onError] - Optional callback to handle errors
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
 */
interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
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
  error?: Error;
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
 * @param {function} [props.onError] - Optional callback to handle errors
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
export class ErrorBoundary extends Component<Props, State> {
  /**
   * Initializes the component state.
   *
   * @param {Props} props - Component props
   */
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  /**
   * Updates the state when an error occurs.
   * This is a static lifecycle method that is called when an error is thrown in a descendant component.
   *
   * @param {Error} error - The error that was thrown
   * @returns {State} The new state
   */
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  /**
   * Logs error information when an error occurs.
   * This lifecycle method is called after an error has been thrown in a descendant component.
   *
   * @param {Error} error - The error that was thrown
   * @param {ErrorInfo} errorInfo - Additional error information
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.props.onError?.(error, errorInfo);
    console.error('Error caught by boundary:', error, errorInfo);
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
      return (
        this.props.fallback || (
          <div className="p-4 bg-red-900/50 border border-red-700 rounded-lg">
            <h2 className="text-xl font-semibold text-red-200 mb-2">Something went wrong</h2>
            <p className="text-red-100">{this.state.error?.message}</p>
            <button
              className="mt-4 px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-md"
              onClick={() => this.setState({ hasError: false })}
            >
              Try again
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
