import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function Layout() {
  const { logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h1>Card Game</h1>
          <p>Admin Dashboard</p>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/users" className={({ isActive }) => (isActive ? 'active' : '')}>
            User Activity
          </NavLink>
          <NavLink to="/general-activity" className={({ isActive }) => (isActive ? 'active' : '')}>
            General Activity
          </NavLink>
          <NavLink to="/general-points" className={({ isActive }) => (isActive ? 'active' : '')}>
            General Points
          </NavLink>
          <NavLink to="/custom-pois" className={({ isActive }) => (isActive ? 'active' : '')}>
            Custom POIs
          </NavLink>
        </nav>
        <button type="button" className="logout-btn" onClick={logout}>
          Log out
        </button>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
