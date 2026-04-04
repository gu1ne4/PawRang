import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './UserStyles.css';
import API_URL from '../API';
import ClientNavBar from '../reusable_components/ClientNavBar';

import {
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

  // ── Session — read once, no redirect ─────────────────────────────────────
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem('userSession');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

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
    localStorage.removeItem('userSession');
    localStorage.removeItem('access_token');
    setCurrentUser(null);
    navigate('/login');
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="user-container">
      <ClientNavBar
        currentUser={currentUser}
        onLogout={handleLogout}
        onViewProfile={() => navigate('/user/profile')}
        onMyPets={() => navigate('/user/pet-profile')}
        showAlert={showAlert}
      />

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
