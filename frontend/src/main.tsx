/* oxlint-disable react/only-export-components */
import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { SWRConfig } from 'swr'
import './index.css'
import { DashboardProvider } from './context/DashboardContext.tsx'
import { swrFetcher } from './lib/fetcher.ts'
const App = lazy(() => import('./App.tsx'))
const PublicStatusPage = lazy(() => import('./components/public/PublicStatusPage.tsx').then(m => ({ default: m.PublicStatusPage })))

const isPublicStatus = window.location.pathname.startsWith('/status');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SWRConfig value={{
      fetcher: swrFetcher,
      revalidateOnFocus: true,
      dedupingInterval: 5000,
      errorRetryCount: 3,
    }}>
      <Suspense fallback={<div className="min-h-screen bg-[#040815] text-slate-400 flex items-center justify-center">Cargando DevDash…</div>}>
        {isPublicStatus ? <PublicStatusPage /> : <DashboardProvider><App /></DashboardProvider>}
      </Suspense>
    </SWRConfig>
  </StrictMode>,
)
