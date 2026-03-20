import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import './UserStyles.css';
import API_URL from '../API';

import {
  IoPersonOutline, IoPawOutline, IoCalendarOutline,
  IoNotificationsOutline, IoLogOutOutline,
  IoChevronDownOutline, IoChevronUpOutline,
  IoCheckmarkCircleOutline, IoCloseCircleOutline, IoAlertCircleOutline,
} from 'react-icons/io5';

// ─── Types ────────────────────────────────────────────────────────────────────

interface User {
  id?: string;
  username: string;
  firstName?: string;
  lastName?: string;
  fullname?: string;
  fullName?: string;
  userImage?: string;
  userimage?: string;
  role?: string;
  email?: string;
  contact_number?: string;
}

interface ModalConfig {
  type: 'info' | 'success' | 'error' | 'confirm';
  title: string;
  message: string | React.ReactNode;
  onConfirm?: () => void;
  showCancel: boolean;
  confirmText: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

const UserHome: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // ── Session — read once, no redirect ─────────────────────────────────────
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem('userSession');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [modalVisible,    setModalVisible]    = useState(false);
  const [modalConfig,     setModalConfig]     = useState<ModalConfig>({
    type: 'info', title: '', message: '', showCancel: false, confirmText: 'OK',
  });

  // ── Refresh profile from API when user id is available ───────────────────
  useEffect(() => {
    if (!currentUser?.id) return;
    const token = localStorage.getItem('access_token');
    axios
      .get(`${API_URL}/profile/${currentUser.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(res => {
        const updated = { ...currentUser, ...res.data.user };
        setCurrentUser(updated);
        localStorage.setItem('userSession', JSON.stringify(updated));
      })
      .catch(err => console.error('Failed to refresh profile:', err));
  }, [currentUser?.id]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const isActive = (path: string) => location.pathname === path;

  const showAlert = (
    type: ModalConfig['type'],
    title: string,
    message: string | React.ReactNode,
    onConfirm?: () => void,
    showCancel = false,
    confirmText = 'OK',
  ) => {
    setModalConfig({ type, title, message, onConfirm, showCancel, confirmText });
    setModalVisible(true);
  };

  const handleLogout = () => {
    setDropdownVisible(false);
    showAlert(
      'confirm', 'Log Out', 'Are you sure you want to log out?',
      () => {
        localStorage.removeItem('userSession');
        localStorage.removeItem('access_token');
        setCurrentUser(null);
        navigate('/login');
      },
      true, 'Log Out',
    );
  };

  const displayName = currentUser
  ? (
      currentUser.fullname
      ?? currentUser.fullName
      ?? (`${currentUser.firstName ?? ''} ${currentUser.lastName ?? ''}`.trim()
          || currentUser.username
          || 'User')
    )
  : '';
  
  const getInitial = () => displayName.charAt(0).toUpperCase() || 'U';

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="user-container">

      {/* ── Sticky Navbar ── */}
      <div className="navbar-sticky">
        <div className="user-navbar">

          {/* Profile dropdown */}
          <div className="profile-dropdown-container">
            {currentUser && (
              <button className="profile-button" onClick={() => setDropdownVisible(v => !v)}>
                <div className="profile-section">
                  {currentUser.userImage || currentUser.userimage ? (
                    <img
                      src={currentUser.userImage ?? currentUser.userimage}
                      alt={displayName}
                      className="profile-image"
                    />
                  ) : (
                    <div className="profile-initial"><span>{getInitial()}</span></div>
                  )}
                  <div className="profile-info">
                    <span className="profile-name">{displayName}</span>
                  </div>
                  {dropdownVisible
                    ? <IoChevronUpOutline   size={18} color="#3d67ee" />
                    : <IoChevronDownOutline size={18} color="#3d67ee" />}
                </div>
              </button>
            )}

            {dropdownVisible && currentUser && (
              <div className="dropdown-menu">
                <button className="dropdown-item" onClick={() => { setDropdownVisible(false); navigate('/user/profile'); }}>
                  <IoPersonOutline size={18} color="#3d67ee" /><span>View Profile</span>
                </button>
                <button className="dropdown-item" onClick={() => { setDropdownVisible(false); navigate('/user/pet-profile'); }}>
                  <IoPawOutline size={18} color="#3d67ee" /><span>My Pets</span>
                </button>
                <button className="dropdown-item logout-item" onClick={handleLogout}>
                  <IoLogOutOutline size={18} color="#ee3d5a" />
                  <span style={{ color: '#ee3d5a' }}>Logout</span>
                </button>
              </div>
            )}
          </div>

          {/* Center nav */}
          <div className="nav-center">
            <div className="nav-links">
              <button className={`nav-link ${isActive('/user/home') ? 'active' : ''}`} onClick={() => navigate('/user/home')}>
                Home
              </button>
              <button className="nav-link">About Us</button>
              <button className="nav-link">Our Services</button>
              <button className="nav-link" onClick={() => navigate('/user/book-appointment')}>
                Book an Appointment
              </button>
            </div>
          </div>

          {/* Right icons */}
          <div className="nav-icons">
            <button className="icon-button" onClick={() => navigate('/user/pet-profile')}>
              <IoPawOutline size={21} color="#3d67ee" />
            </button>
            <button className="icon-button" onClick={() => navigate('/user/appointments')}>
              <IoCalendarOutline size={21} color="#3d67ee" />
            </button>
            <button className="icon-button" onClick={() => console.log('Notifications')}>
              <IoNotificationsOutline size={21} color="#3d67ee" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="user-content">
        <div className="welcome-section">
          <h1 className="welcome-title">Welcome to,</h1>
          <h1 className="brand-title" style={{ marginBottom: 60 }}>PawRang!</h1>
          <p className="welcome-description">
            Your trusted partner in veterinary management and client care, empowering
          </p>
          <p className="welcome-description">
            clinics with modern solutions, seamless workflows, and compassionate service.
          </p>
        </div>
      </div>

      {/* ── Modal ── */}
      {modalVisible && (
        <div className="modal-overlay" onClick={() => setModalVisible(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-icon">
              {modalConfig.type === 'success' && <IoCheckmarkCircleOutline size={55} color="#2e9e0c" />}
              {modalConfig.type === 'error'   && <IoCloseCircleOutline     size={55} color="#d93025" />}
              {!['success','error'].includes(modalConfig.type) && <IoAlertCircleOutline size={55} color="#3d67ee" />}
            </div>
            <h3 className="modal-title">{modalConfig.title}</h3>
            <div className="modal-message">
              {typeof modalConfig.message === 'string'
                ? <p>{modalConfig.message}</p>
                : modalConfig.message}
            </div>
            <div className="modal-actions">
              {modalConfig.showCancel && (
                <button className="modal-btn modal-btn-cancel" onClick={() => setModalVisible(false)}>Cancel</button>
              )}
              <button
                className={`modal-btn modal-btn-confirm ${modalConfig.type === 'error' ? 'error-btn' : ''}`}
                onClick={() => { setModalVisible(false); modalConfig.onConfirm?.(); }}
              >
                {modalConfig.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserHome;