import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from './components/Dashboard/DashboardLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/Layout/AppLayout';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { VirtualCardsPage } from './pages/VirtualCardsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { OAuthCallbackPage } from './pages/OAuthCallbackPage';
import { IntegrationsPage } from './pages/IntegrationsPage';
import { IntegrationDetailPage } from './pages/IntegrationDetailPage';
import { SettingsPage } from './pages/SettingsPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<LandingPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="auth/callback" element={<OAuthCallbackPage />} />
        <Route path="dashboard" element={<ProtectedRoute><DashboardLayout><DashboardPage /></DashboardLayout></ProtectedRoute>} />
        <Route path="virtual-cards" element={<ProtectedRoute><DashboardLayout><VirtualCardsPage /></DashboardLayout></ProtectedRoute>} />
        <Route path="virtual-cards/create" element={<ProtectedRoute><DashboardLayout><VirtualCardsPage mode="create" /></DashboardLayout></ProtectedRoute>} />
        <Route path="virtual-cards/templates" element={<ProtectedRoute><DashboardLayout><VirtualCardsPage mode="templates" /></DashboardLayout></ProtectedRoute>} />
        <Route path="virtual-cards/settings" element={<ProtectedRoute><DashboardLayout><VirtualCardsPage mode="settings" /></DashboardLayout></ProtectedRoute>} />
        <Route path="analytics" element={<ProtectedRoute><DashboardLayout><AnalyticsPage /></DashboardLayout></ProtectedRoute>} />
        <Route path="integrations" element={<ProtectedRoute><DashboardLayout><IntegrationsPage /></DashboardLayout></ProtectedRoute>} />
        <Route path="integrations/:integrationId" element={<ProtectedRoute><DashboardLayout><IntegrationDetailPage /></DashboardLayout></ProtectedRoute>} />
        <Route path="settings" element={<ProtectedRoute><DashboardLayout><SettingsPage /></DashboardLayout></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
