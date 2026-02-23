import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const { user, isAdmin, isModerator, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMenuOpen(false);
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand" onClick={closeMenu}>
          <img src="/logo.png" alt="ChitChatClub" className="navbar-logo" />
          ChitChatClub
        </Link>

        <button
          className="navbar-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span className={`hamburger ${menuOpen ? 'open' : ''}`} />
        </button>

        <div className={`navbar-links ${menuOpen ? 'navbar-links--open' : ''}`}>
          {user ? (
            <>
              <Link to="/sessions" onClick={closeMenu}>Browse Sessions</Link>
              <Link to="/my-sessions" onClick={closeMenu}>My Schedule</Link>
              <Link to="/profile" onClick={closeMenu}>Profile</Link>
              {isModerator && <Link to="/moderator" onClick={closeMenu}>Moderator</Link>}
              {isAdmin && <Link to="/admin" onClick={closeMenu}>Admin</Link>}
              <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={closeMenu}>Login</Link>
              <Link to="/register" onClick={closeMenu}>Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
