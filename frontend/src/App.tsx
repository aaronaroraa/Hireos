import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { LandingPage } from './pages/LandingPage';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { JobsPage } from './pages/JobsPage';
import { CandidatesPage } from './pages/CandidatesPage';
import { SettingsPage } from './pages/SettingsPage';
import { CandidateApply } from './pages/CandidateApply';
import { AIInterview } from './pages/AIInterview';
import { PipelineConfigPage } from './pages/PipelineConfigPage';
import { BulkHirePage } from './pages/BulkHirePage';
import { PortalLogin } from './portal/PortalLogin';
import { CandidatePortal } from './portal/CandidatePortal';
import { DemoPresenter } from './pages/DemoPresenter';
import { DevSwitcher } from './components/DevSwitcher';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
    const { token } = useAuth();
    return token ? <>{children}</> : <Navigate to="/login" />;
};

function AppRoutes() {
    return (
        <Routes>
            {/* Public — landing page */}
            <Route path="/" element={<LandingPage />} />

            {/* Auth */}
            <Route path="/login" element={<Login />} />

            {/* Sales presenter */}
            <Route path="/demo" element={<DemoPresenter />} />

            {/* Public candidate-facing pages */}
            <Route path="/apply/:token" element={<CandidateApply />} />
            <Route path="/interview/:sessionId" element={<AIInterview />} />

            {/* Persistent candidate portal */}
            <Route path="/portal/login" element={<PortalLogin />} />
            <Route path="/portal/:tab" element={<CandidatePortal />} />
            <Route path="/portal" element={<Navigate to="/portal/overview" replace />} />

            {/* Recruiter workspace — layout wraps all, no parent path */}
            <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/jobs" element={<JobsPage />} />
                <Route path="/candidates" element={<CandidatesPage />} />
                <Route path="/bulk-hire" element={<BulkHirePage />} />
                <Route path="/pipeline" element={<PipelineConfigPage />} />
                <Route path="/settings" element={<SettingsPage />} />
            </Route>
        </Routes>
    );
}

function App() {
    return (
        <Router>
            <AuthProvider>
                <DevSwitcher />
                <AppRoutes />
            </AuthProvider>
        </Router>
    );
}

export default App;
