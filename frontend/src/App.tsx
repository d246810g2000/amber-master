import React, { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { BadmintonLoader } from './components/BadmintonLoader';

// Lazy load pages
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const PlayerProfilePage = lazy(() => import('./pages/PlayerProfilePage').then(m => ({ default: m.PlayerProfilePage })));
const AdminMatchesPage = lazy(() => import('./pages/AdminMatchesPage').then(m => ({ default: m.AdminMatchesPage })));

function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/players/:playerId" element={<PlayerProfilePage />} />
        <Route path="/admin/matches" element={<AdminMatchesPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
