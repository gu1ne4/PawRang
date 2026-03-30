// reusable_components/ClientNavBar.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  IoPersonOutline,
  IoPawOutline,
  IoCalendarOutline,
  IoNotificationsOutline,
  IoChevronDownOutline,
  IoChevronUpOutline,
  IoClose
} from 'react-icons/io5';

// Types and Interfaces
interface User {
  id?: string | number;
  pk?: string | number;
  username: string;
  fullname?: string;
  fullName?: string;
  userImage?: string;
  userimage?: string;
  email?: string;
  contact_number?: string;
  contactnumber?: string;
  contactNumber?: string;
  address?: string;
}

interface AlertConfig {
  type: 'info' | 'success' | 'error' | 'confirm';
  title: string;
  message: string;
  onConfirm?: () => void;
  showCancel: boolean;
  confirmText: string;
}

interface ClientNavBarProps {
  currentUser: User | null;
  onLogout: () => void;
  onViewProfile: () => void;      // Add this
  onMyPets: () => void;            // Add this
  showAlert?: (
    type: AlertConfig['type'], 
    title: string, 
    message: string, 
    onConfirm?: () => void, 
    showCancel?: boolean, 
    confirmText?: string
  ) => void;
}

const ClientNavBar: React.FC<ClientNavBarProps> = ({ 
  currentUser, 
  onLogout,
  onViewProfile,    // Add this
  onMyPets,         // Add this
  showAlert 
}) => {
  const navigate = useNavigate();
  const [dropdownVisible, setDropdownVisible] = useState<boolean>(false);

  const handleLogoutClick = () => {
    setDropdownVisible(false);
    if (showAlert) {
      showAlert('confirm', 'Log Out', 'Are you sure you want to log out?', () => {
        onLogout();
        navigate('/login');
      }, true, 'Log Out');
    } else {
      onLogout();
      navigate('/login');
    }
  };

  const handleViewProfile = () => {
    setDropdownVisible(false);
    onViewProfile(); // Call the prop function
  };

  const handleMyPets = () => {
    setDropdownVisible(false);
    onMyPets(); // Call the prop function
  };

  const displayName = currentUser ? (
    currentUser.fullname || currentUser.fullName || currentUser.username || "User"
  ) : "";

  // Function to check if a route is active
  const isActive = (path: string) => {
    return window.location.pathname === path ? 'active' : '';
  };

  return (
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
                    <span>{displayName.charAt(0).toUpperCase()}</span>
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
                onClick={handleLogoutClick}
              >
                <IoClose size={18} color="#ee3d5a" />
                <span style={{ color: '#ee3d5a' }}>Logout</span>
              </button>
            </div>
          )}
        </div>

        {/* Center Navigation */}
        <div className="nav-center">
          <div className="nav-links">
            <button 
              className={`nav-link ${isActive('/user/home')}`}
              onClick={() => navigate('/user/home')}
            >
              Home
            </button>
            <button 
              className={`nav-link ${isActive('/about')}`}
              onClick={() => navigate('/about')}
            >
              About Us
            </button>
            <button 
              className={`nav-link ${isActive('/services')}`}
              onClick={() => navigate('/services')}
            >
              Our Services
            </button>
            <button 
              className={`nav-link ${isActive('/user/book-appointment')}`}
              onClick={() => navigate('/user/book-appointment')}
            >
              Book an Appointment
            </button>
          </div>
        </div>

        {/* Right Side Icons */}
        <div className="nav-icons">
          <button 
            className="icon-button"
            onClick={() => navigate('/user/pet-profile')}
          >
            <IoPawOutline size={21} color="#3d67ee" />
          </button>
          
          <button 
            className="icon-button"
            onClick={() => navigate('/user/appointments')}
          >
            <IoCalendarOutline size={21} color="#3d67ee" />
          </button>

          <button 
            className="icon-button"
            onClick={() => navigate('/user/book-appointment')}
          >
            <IoNotificationsOutline size={21} color="#3d67ee" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientNavBar;
