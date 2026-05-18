import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You could send this to an error tracking service
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen items-center justify-center bg-[#09090b] text-white">
          <div className="p-8 bg-[#1a1a1a] rounded-2xl shadow-2xl max-w-md text-center">
            <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
            <p className="mb-6 text-gray-300">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            <details className="whitespace-pre-wrap text-left text-gray-500">
              {this.state.error && this.state.error.toString()}
            </details>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
