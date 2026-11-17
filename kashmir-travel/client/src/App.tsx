import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Packages from './pages/Packages';
import AuthForm from './pages/AuthForm';
import MyBookings from './pages/MyBookings';
 import PackageDetail from './pages/PackageDetail';
 import Admin from './pages/Admin';

function Navbar() {
  const { user, logout } = useAuth();
  return (
    <header className="border-b bg-white">
      <nav className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="font-bold text-lake">Kashmir Travel</Link>
        <div className="flex items-center gap-4 text-sm font-semibold">
          {user ? (
            <>

              {user.role === 'admin' && <Link to="/admin">Admin</Link>}
              <Link to="/bookings">My bookings</Link>
              <button onClick={logout}>Log out ({user.name})</button>
            </>
          ) : (
            <>
              <Link to="/login">Log in</Link>
              <Link to="/register" className="px-3 py-1.5 rounded bg-lake text-white">Sign up</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

function Private({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="p-6">Loading…</p>;
  return user ? children : <Navigate to="/login" replace />;
}

function AdminOnly({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="p-6">Loading…</p>;
  return user?.role === 'admin' ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-ink">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Packages />} />
          <Route path="/login" element={<AuthForm mode="login" />} />
          <Route path="/register" element={<AuthForm mode="register" />} />
          <Route path="/bookings" element={<Private><MyBookings /></Private>} />
            <Route path="/packages/:slug" element={<PackageDetail />} />
          <Route path="/admin" element={<AdminOnly><Admin /></AdminOnly>} />
        </Routes>
      </main>
    </div>
  );
}
