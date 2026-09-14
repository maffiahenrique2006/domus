import { type ReactNode } from 'react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@workspace/domus-ds/components/ui/toaster';
import { TooltipProvider } from '@workspace/domus-ds/components/ui/tooltip';
import { useLocation, Router as WouterRouter } from 'wouter';
import { AppProvider } from '@/data/store';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import LoginPage from '@/pages/login';
import AppRoutes from './routes';

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function AppShell() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="h-screen w-full bg-background dark" />;
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <AppProvider>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <RoutedErrorBoundary>
            <AppRoutes />
          </RoutedErrorBoundary>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </AppProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

export default App;
