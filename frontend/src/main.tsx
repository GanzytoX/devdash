import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { SWRConfig } from 'swr'
import { AppRouter } from './components/AppRouter.tsx'
import './index.css'
import { swrFetcher } from './lib/fetcher.ts'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SWRConfig value={{
      fetcher: swrFetcher,
      revalidateOnFocus: true,
      dedupingInterval: 5000,
      errorRetryCount: 3,
    }}>
      <AppRouter />
    </SWRConfig>
  </StrictMode>,
)
