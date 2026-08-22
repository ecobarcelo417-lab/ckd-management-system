import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import PatientDetail from './pages/PatientDetail';
import DialysisSessions from './pages/DialysisSessions';
import SessionDetail from './pages/SessionDetail';
import LabResults from './pages/LabResults';
import Prescriptions from './pages/Prescriptions';
import Appointments from './pages/Appointments';
import Users from './pages/Users';
import Reports from './pages/Reports';
import Profile from './pages/Profile';
import SymptomLog from './pages/SymptomLog';
import ShiftHandoff from './pages/ShiftHandoff';

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({
  children,
  allowedRoles
}) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role || '')) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={
        isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />
      } />

      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />

        {/* Staff-only patient directory */}
        <Route path="patients" element={
          <ProtectedRoute allowedRoles={['admin', 'doctor', 'nurse']}>
            <Patients />
          </ProtectedRoute>
        } />
        <Route path="patients/:id" element={
          <ProtectedRoute allowedRoles={['admin', 'doctor', 'nurse', 'patient']}>
            <PatientDetail />
          </ProtectedRoute>
        } />

        {/* Dialysis: all roles (patients see own only via API) */}
        <Route path="dialysis" element={<DialysisSessions />} />
        <Route path="dialysis/:id" element={<SessionDetail />} />

        {/* Labs: all can view (scoped); create restricted in UI + API */}
        <Route path="lab-results" element={<LabResults />} />

        {/* Prescriptions: all can view (scoped); create doctor/admin only */}
        <Route path="prescriptions" element={<Prescriptions />} />

        <Route path="appointments" element={<Appointments />} />


        {/* Nurse shift handoff protocol */}
        <Route path="handoffs" element={
          <ProtectedRoute allowedRoles={['admin', 'nurse', 'doctor']}>
            <ShiftHandoff />
          </ProtectedRoute>
        } />
        {/* Patient self-report + care team review */}
        <Route path="symptoms" element={
          <ProtectedRoute allowedRoles={['admin', 'doctor', 'nurse', 'patient']}>
            <SymptomLog />
          </ProtectedRoute>
        } />

        {/* Admin only */}
        <Route path="users" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Users />
          </ProtectedRoute>
        } />

        {/* Clinical / system analytics — not for patients */}
        <Route path="reports" element={
          <ProtectedRoute allowedRoles={['admin', 'doctor']}>
            <Reports />
          </ProtectedRoute>
        } />

        <Route path="profile" element={<Profile />} />
      </Route>
    </Routes>
  );
};

export default App;
