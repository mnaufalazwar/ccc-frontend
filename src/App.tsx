import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import CheckEmailPage from './pages/auth/CheckEmailPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import LandingPage from './pages/LandingPage';
import ProfilePage from './pages/profile/ProfilePage';
import SessionsListPage from './pages/sessions/SessionsListPage';
import SessionDetailPage from './pages/sessions/SessionDetailPage';
import MySessionsPage from './pages/sessions/MySessionsPage';
import AdminPanel from './pages/admin/AdminPanel';
import ModeratorPanel from './pages/moderator/ModeratorPanel';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/check-email" element={<CheckEmailPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sessions"
          element={
            <ProtectedRoute>
              <SessionsListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sessions/:id"
          element={
            <ProtectedRoute>
              <SessionDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-sessions"
          element={
            <ProtectedRoute>
              <MySessionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/moderator/*"
          element={
            <ProtectedRoute roles={['MODERATOR', 'ADMIN', 'SUPER_ADMIN']}>
              <ModeratorPanel />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute roles={['ADMIN', 'SUPER_ADMIN']}>
              <AdminPanel />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Layout>
  );
}
