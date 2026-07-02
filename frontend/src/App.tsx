import { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PublicLayout from './components/PublicLayout';
import AdminLayout from './components/AdminLayout';
import LandingPage from './components/LandingPage';
import ReportPage from './components/ReportPage';
import ReportsPage from './components/ReportsPage';
import TrackPage from './components/TrackPage';
import { useReports } from './hooks/useReports';

// The authority dashboard (Leaflet map + analytics) is code-split so it never
// bloats the citizen-facing bundle — it loads only inside /admin.
const DashboardPage = lazy(() => import('./components/DashboardPage'));

export default function App() {
  // Reports are loaded from Supabase and shared across routes.
  const reportsState = useReports();

  return (
    <Routes>
      {/* Public (citizen) */}
      <Route path="/" element={<PublicLayout><LandingPage /></PublicLayout>} />
      <Route path="/report" element={<PublicLayout><ReportPage reports={reportsState} /></PublicLayout>} />
      <Route path="/track" element={<PublicLayout><TrackPage /></PublicLayout>} />

      {/* Authority (passcode-gated) */}
      <Route path="/admin" element={<AdminLayout><DashboardPage reports={reportsState} /></AdminLayout>} />
      <Route path="/admin/reports" element={<AdminLayout><ReportsPage reports={reportsState} /></AdminLayout>} />

      {/* Redirects for the old routes */}
      <Route path="/dashboard" element={<Navigate to="/admin" replace />} />
      <Route path="/reports" element={<Navigate to="/admin/reports" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
