import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const { user, isAdmin, isModerator, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <img src="/logo.png" alt="ChitChatClub" className="navbar-logo" />
          ChitChatClub
        </Link>
        <div className="navbar-links">
          {user ? (
            <>
              <Link to="/sessions">Browse Sessions</Link>
              <Link to="/my-sessions">My Schedule</Link>
              <Link to="/profile">Profile</Link>
              {isModerator && <Link to="/moderator">Moderator</Link>}
              {isAdmin && <Link to="/admin">Admin</Link>}
              <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
