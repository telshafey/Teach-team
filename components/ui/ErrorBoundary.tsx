import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex w-full h-full p-8 flex-col items-center justify-center text-center bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-red-100 dark:border-red-900">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">
            عذراً، حدث خطأ ما
          </h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto mb-4">
            واجه التطبيق مشكلة في تحميل هذه الصفحة. يرجى تحديث الصفحة أو
            المحاولة مرة أخرى لاحقاً.
          </p>
          <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded text-left text-xs text-red-500 overflow-auto max-w-full max-h-32 mb-4 whitespace-pre-wrap">
            {this.state.error?.message || "Unknown error"}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-slate-800 text-white rounded-md hover:bg-slate-700 font-medium"
          >
            تحديث الصفحة
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
