import { lazy, Suspense } from 'react';
import { DashboardProvider } from '../context/DashboardProvider';

const App = lazy(() => import('../App'));
const PublicStatusPage = lazy(() =>
  import('./public/PublicStatusPage').then(module => ({
    default: module.PublicStatusPage,
  })),
);

export function AppRouter() {
  const isPublicStatus = window.location.pathname.startsWith('/status');

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#040815] text-slate-400 flex items-center justify-center">
          Cargando DevDash…
        </div>
      }
    >
      {isPublicStatus ? (
        <PublicStatusPage />
      ) : (
        <DashboardProvider>
          <App />
        </DashboardProvider>
      )}
    </Suspense>
  );
}
