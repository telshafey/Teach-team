import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@shared/contexts/ThemeContext";
import { ToastContainer } from "./components/ui/ToastContainer";
import { RouterProvider } from "react-router-dom";
import { router } from "@shared/router/routes";
import { useSupabase } from "@shared/contexts/SupabaseContext";
import { useAuth } from "@shared/contexts/AuthContext";
import { useAuthStore } from "@shared/stores/authStore";
import { Logo } from "./components/ui/Logo";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000, // 10 minutes
      gcTime: 24 * 60 * 60 * 1000, // 24 hours
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col h-screen w-screen items-center justify-center p-8 text-center text-red-600 bg-red-50">
          <h1 className="text-2xl font-bold mb-4">حدث خطأ غير متوقع</h1>
          <p className="mb-4">رسالة الخطأ:</p>
          <pre className="text-left bg-white p-4 rounded border text-sm overflow-auto max-w-full">
            {this.state.error?.message}
            {"\n\n"}
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const AppBootstrap: React.FC = () => {
  const { supabaseClient, isLoading: isSupabaseLoading } = useSupabase();
  const { isLoading: isAuthLoading } = useAuth();
  const initAuthListener = useAuthStore((state) => state.initAuthListener);

  React.useEffect(() => {
    const unsub = initAuthListener();
    return () => {
      if (unsub) unsub();
    };
  }, [initAuthListener]);

  if (isSupabaseLoading || isAuthLoading) {
    return (
      <div className="flex flex-col h-screen w-screen items-center justify-center bg-white dark:bg-slate-900 border-4 border-red-500">
        <div className="animate-pulse mb-4">
          <Logo />
        </div>
        <p className="text-slate-500 dark:text-slate-400 mr-4">
          جارٍ تهيئة التطبيق...
        </p>
        <div className="text-xs text-center mt-4">
          <p>Debug state:</p>
          <p>isSupabaseLoading: {String(isSupabaseLoading)}</p>
          <p>isAuthLoading: {String(isAuthLoading)}</p>
          <p>supabaseClient: {supabaseClient ? "Yes" : "No"}</p>
        </div>
      </div>
    );
  }

  if (!supabaseClient) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-white dark:bg-slate-900 text-center p-4">
        <div>
          <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">
            فشل الاتصال بقاعدة البيانات
          </h2>
          <p className="text-slate-600 dark:text-slate-300">
            لم نتمكن من الاتصال بقاعدة البيانات. يرجى مراجعة الإعدادات أو
            التواصل مع المسؤول.
          </p>
        </div>
      </div>
    );
  }

  // All good, render the router
  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AppBootstrap />
          <ToastContainer />
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;

