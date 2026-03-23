import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import App from './App.tsx';
import './index.css';
import { HashRouter } from 'react-router-dom';

import { DialogProvider } from './context/DialogContext.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { GoogleOAuthProvider } from '@react-oauth/google';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30,  // 30 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
import { GOOGLE_CLIENT_ID } from './lib/config';

const FINAL_GOOGLE_CLIENT_ID = GOOGLE_CLIENT_ID || "PROVIDE_YOUR_CLIENT_ID_IN_ENV";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={FINAL_GOOGLE_CLIENT_ID}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <DialogProvider>
            <HashRouter>
              <App />
            </HashRouter>
          </DialogProvider>
        </AuthProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </GoogleOAuthProvider>
  </StrictMode>
);
