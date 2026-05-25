// 英语学习应用 - 主应用组件（路由配置）
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { ImportPage } from './pages/ImportPage';
import { ReviewPage } from './pages/ReviewPage';
import { LibraryPage } from './pages/LibraryPage';
import { LoginPage } from './pages/LoginPage';
import { NavBar } from './components/NavBar';
import { isLoggedIn } from './services/auth';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  if (!isLoggedIn()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavBar />
      <div style={{ minHeight: 'calc(100vh - 56px)', background: '#f7fafc' }}>
        {children}
      </div>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={
          isLoggedIn() ? <Navigate to="/" replace /> : <LoginPage />
        } />
        <Route path="/" element={
          <ProtectedRoute>
            <AppLayout><HomePage /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/import" element={
          <ProtectedRoute>
            <AppLayout><ImportPage /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/review" element={
          <ProtectedRoute>
            <AppLayout><ReviewPage /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/library" element={
          <ProtectedRoute>
            <AppLayout><LibraryPage /></AppLayout>
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
