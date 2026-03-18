import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './UserStyles.css';

// Icons
import { 
  IoPersonOutline,
  IoPawOutline,
  IoCalendarOutline,
  IoNotificationsOutline,
  IoLogOutOutline,
  IoChevronDownOutline,
  IoChevronUpOutline,
  IoCheckmarkCircleOutline,
  IoCloseCircleOutline,
  IoAlertCircleOutline
} from 'react-icons/io5';

// Interfaces
interface User {
  id?: number;
  pk?: number;
  username: string;
  fullname?: string;
  fullName?: string;
  userImage?: string;
  userimage?: string;
  role?: string;
}

interface ModalConfig {
  type: 'info' | 'success' | 'error' | 'confirm';
  title: string;
  message: string | JSX.Element;
  onConfirm?: () => void;
  showCancel: boolean;
  confirmText: string;
}

const UserHome: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // State
  const [dropdownVisible, setDropdownVisible] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Modal State
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [modalConfig, setModalConfig] = useState<ModalConfig>({
    type: 'info',
    title: '',
    message: '',
    showCancel: false,
    confirmText: 'OK'
  });

  // Check if current route is active
  const isActive = (path: string): boolean => {
    return location.pathname === path;
  };

  // Show Alert Helper
  const showAlert = (
    type: ModalConfig['type'],
    title: string,
    message: string | JSX.Element,
    onConfirm?: () => void,
    showCancel: boolean = false,
    confirmText: string = 'OK'
  ) => {
    setModalConfig({ type, title, message, onConfirm, showCancel, confirmText });
    setModalVisible(true);
  };

  // Load user from storage
  useEffect(() => {
    const loadUser = async () => {
      try {
        const session = localStorage.getItem('userSession');
        if (session) {
          setCurrentUser(JSON.parse(session));
        } else {
          setCurrentUser(null);
        }
      } catch (error) {
        console.error("Failed to load user session", error);
      }
    };
    loadUser();
  }, []);

  // Protected Action Handler
  const handleProtectedAction = (action: () => void) => {
    if (currentUser) {
      action();
    } else {
      showAlert(
        'info',
        'Account Required',
        'You need to log in or sign up to access this feature.',
        () => navigate('/login'),
        true,
        'Go to Login'
      );
    }
  };

  // Logout Handler
  const handleLogout = () => {
    setDropdownVisible(false);
    showAlert('confirm', 'Log Out', 'Are you sure you want to log out?', async () => {
      localStorage.removeItem('userSession');
      setCurrentUser(null);
      navigate('/login');
    }, true, 'Log Out');
  };

  // Navigation Handlers
  const handleViewProfile = () => {
    setDropdownVisible(false);
    navigate('/user-profile');
  };

  const handleMyPets = () => {
    setDropdownVisible(false);
    navigate('/user-pets');
  };

  // Get display name
  const displayName = currentUser 
    ? (currentUser.fullname || currentUser.fullName || currentUser.username || "User") 
    : "";

  // Get first letter for avatar fallback
  const getInitial = (): string => {
    return displayName ? displayName.charAt(0).toUpperCase() : 'U';
  };

  return (
    <div className="user-container">
      {/* Sticky Navigation Bar */}
      <div className="navbar-sticky">
        <div className="user-navbar">
          {/* Profile Section with Dropdown */}
          <div className="profile-dropdown-container">
            {currentUser ? (
              <button 
                className="profile-button"
                onClick={() => setDropdownVisible(!dropdownVisible)}
              >
                <div className="profile-section">
                  {currentUser.userImage || currentUser.userimage ? (
                    <img 
                      src={currentUser.userImage || currentUser.userimage} 
                      alt={displayName}
                      className="profile-image"
                    />
                  ) : (
                    <div className="profile-initial">
                      <span>{getInitial()}</span>
                    </div>
                  )}
                  <div className="profile-info">
                    <span className="profile-name">{displayName}</span>
                  </div>
                  {dropdownVisible ? (
                    <IoChevronUpOutline size={18} color="#3d67ee" />
                  ) : (
                    <IoChevronDownOutline size={18} color="#3d67ee" />
                  )}
                </div>
              </button>
            ) : (
              <button 
                className="profile-button"
                onClick={() => navigate('/login')}
              >
                <div className="profile-section">
                  <IoPersonOutline size={21} color="#3d67ee" />
                  <span className="login-text">Login or Sign-up</span>
                </div>
              </button>
            )}

            {/* Dropdown Menu */}
            {dropdownVisible && currentUser && (
              <div className="dropdown-menu">
                <button 
                  className="dropdown-item"
                  onClick={handleViewProfile}
                >
                  <IoPersonOutline size={18} color="#3d67ee" />
                  <span>View Profile</span>
                </button>
                
                <button 
                  className="dropdown-item"
                  onClick={handleMyPets}
                >
                  <IoPawOutline size={18} color="#3d67ee" />
                  <span>My Pets</span>
                </button>
                
                <button 
                  className="dropdown-item logout-item"
                  onClick={handleLogout}
                >
                  <IoLogOutOutline size={18} color="#ee3d5a" />
                  <span style={{ color: '#ee3d5a' }}>Logout</span>
                </button>
              </div>
            )}
          </div>

          {/* Center Navigation */}
          <div className="nav-center">
            <div className="nav-links">
              <button 
                className={`nav-link ${isActive('/') ? 'active' : ''}`}
                onClick={() => navigate('/')}
              >
                Home
              </button>
              <button className="nav-link">About Us</button>
              <button className="nav-link">Our Services</button>
              <button 
                className="nav-link"
                onClick={() => handleProtectedAction(() => navigate('/appointment-booking'))}
              >
                Book an Appointment
              </button>
            </div>
          </div>

          {/* Right Side Icons */}
          <div className="nav-icons">
            <button 
              className="icon-button"
              onClick={() => handleProtectedAction(() => navigate('/user-pets'))}
            >
              <IoPawOutline size={21} color="#3d67ee" />
            </button>
            
            <button 
              className="icon-button"
              onClick={() => handleProtectedAction(() => navigate('/appointments-view'))}
            >
              <IoCalendarOutline size={21} color="#3d67ee" />
            </button>

            <button 
              className="icon-button"
              onClick={() => handleProtectedAction(() => console.log('Notifications clicked'))}
            >
              <IoNotificationsOutline size={21} color="#3d67ee" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="user-content">
        <div className="welcome-section">
          <h1 className="welcome-title">Welcome to,</h1>
          <h1 className="brand-title" style={{marginBottom: 60}}>PawRang!</h1>
          <p className="welcome-description">
            Your trusted partner in veterinary management and client care, empowering 
          </p>
          <p className="welcome-description">
            clinics with modern solutions, seamless workflows, and compassionate service.
          </p>
        </div>
      </div>

      {/* Custom Alert Modal */}
      {modalVisible && (
        <div className="modal-overlay" onClick={() => setModalVisible(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-icon">
              {modalConfig.type === 'success' && (
                <IoCheckmarkCircleOutline size={55} color="#2e9e0c" />
              )}
              {modalConfig.type === 'error' && (
                <IoCloseCircleOutline size={55} color="#d93025" />
              )}
              {modalConfig.type !== 'success' && modalConfig.type !== 'error' && (
                <IoAlertCircleOutline size={55} color="#3d67ee" />
              )}
            </div>
            
            <h3 className="modal-title">{modalConfig.title}</h3>
            
            <div className="modal-message">
              {typeof modalConfig.message === 'string' 
                ? <p>{modalConfig.message}</p>
                : modalConfig.message
              }
            </div>
            
            <div className="modal-actions">
              {modalConfig.showCancel && (
                <button 
                  className="modal-btn modal-btn-cancel"
                  onClick={() => setModalVisible(false)}
                >
                  Cancel
                </button>
              )}
              
              <button 
                className={`modal-btn modal-btn-confirm ${modalConfig.type === 'error' ? 'error-btn' : ''}`}
                onClick={() => {
                  setModalVisible(false);
                  if (modalConfig.onConfirm) modalConfig.onConfirm();
                }}
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