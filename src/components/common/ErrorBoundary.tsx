import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error boundary caught:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto font-bold text-lg">
              !
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-[#0F172A]">
                {((this as any).props as Props).fallbackTitle || 'Something went wrong'}
              </h2>
              <p className="text-xs text-[#64748B]">
                {this.state.error?.message || 'An unexpected error occurred while rendering this route.'}
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => {
                  (this as any).setState({ hasError: false, error: null });
                  window.location.href = '/';
                }}
                className="px-4 py-2 bg-[#4F46E5] text-white text-xs font-medium rounded-lg hover:bg-[#4338CA] transition-colors shadow-xs"
              >
                Reload Application
              </button>
            </div>
          </div>
        </div>
      );
    }

    return ((this as any).props as Props).children;
  }
}
