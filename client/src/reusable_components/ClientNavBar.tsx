import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  IoCalendarOutline,
  IoChevronDownOutline,
  IoChevronUpOutline,
  IoClose,
  IoHomeOutline,
  IoInformationCircleOutline,
  IoLogOutOutline,
  IoMenuOutline,
  IoNotificationsOutline,
  IoPawOutline,
  IoPersonOutline,
} from 'react-icons/io5';
import './ClientNavBar.css';

interface User {
  id?: string | number;
  pk?: string | number;
  username: string;
  fullname?: string;
  fullName?: string;
  firstName?: string;
  first_name?: string;
  lastName?: string;
  last_name?: string;
  profileImage?: string;
  userImage?: string;
  userimage?: string;
  user_image?: string;
  email?: string;
  contact_number?: string;
  contactnumber?: string;
  contactNumber?: string;
  address?: string;
}

interface AlertConfig {
  type: 'info' | 'success' | 'error' | 'confirm';
  title: string;
  message: string | React.ReactNode;
  onConfirm?: () => void;
  showCancel: boolean;
  confirmText: string;
}

interface ClientNavBarProps {
  currentUser: User | null;
  onLogout: () => void;
  onViewProfile: () => void;
  onMyPets: () => void;
  showAlert?: (
    type: AlertConfig['type'],
    title: string,
    message: string | React.ReactNode,
    onConfirm?: () => void,
    showCancel?: boolean,
    confirmText?: string
  ) => void;
}

const ClientNavBar: React.FC<ClientNavBarProps> = ({
  currentUser,
  onLogout,
  onViewProfile,
  onMyPets,
  showAlert,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setDropdownVisible(false);
    setMobileMenuOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (!mobileMenuOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  const firstName = currentUser?.firstName || currentUser?.first_name || '';
  const lastName = currentUser?.lastName || currentUser?.last_name || '';
  const combinedName = `${firstName} ${lastName}`.trim();
  const displayName = currentUser
    ? combinedName || currentUser.fullname || currentUser.fullName || currentUser.username || 'User'
    : '';

  const isHomeActive = location.pathname === '/user/home' && location.hash !== '#about';
  const isBookActive = location.pathname === '/user/book-appointment';
  const isPetProfilesActive = location.pathname === '/user/pet-profile';
  const isAboutActive = location.pathname === '/user/home' && location.hash === '#about';

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const runMobileAction = (action: () => void) => {
    closeMobileMenu();
    action();
  };

  const handleViewProfile = () => {
    setDropdownVisible(false);
    onViewProfile();
  };

  const handleMyPets = () => {
    setDropdownVisible(false);
    onMyPets();
  };

  const scrollHomePageToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
    document.body.scrollTo({ top: 0, behavior: 'smooth' });

    const homePage = document.querySelector('.user-home-page');
    if (homePage instanceof HTMLElement) {
      homePage.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const navigateHome = () => {
    if (location.pathname === '/user/home') {
      if (location.hash) {
        navigate('/user/home', { replace: true });
      }

      scrollHomePageToTop();
      window.setTimeout(scrollHomePageToTop, 60);
      return;
    }

    navigate('/user/home');
  };

  const navigateToAbout = () => {
    if (location.pathname === '/user/home' && location.hash === '#about') {
      document.getElementById('about')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    navigate('/user/home#about');
  };

  const confirmLogout = () => {
    setDropdownVisible(false);
    closeMobileMenu();
    onLogout();
  };

  const handleLogoutClick = () => {
    if (showAlert) {
      showAlert(
        'confirm',
        'Log Out',
        'Are you sure you want to log out?',
        confirmLogout,
        true,
        'Log Out',
      );
      return;
    }

    confirmLogout();
  };

  const profileImage = currentUser?.profileImage || currentUser?.userImage || currentUser?.userimage || currentUser?.user_image;

  const avatar = profileImage ? (
    <img
      src={profileImage}
      alt={displayName}
      className="profile-image"
    />
  ) : (
    <div className="profile-initial">
      <span>{displayName.charAt(0).toUpperCase() || 'U'}</span>
    </div>
  );

  const mobileNavItems = [
    {
      key: 'home',
      label: 'Home',
      icon: <IoHomeOutline size={20} />,
      action: navigateHome,
      active: isHomeActive,
    },
    {
      key: 'book',
      label: 'Book an Appointment',
      icon: <IoNotificationsOutline size={20} />,
      action: () => navigate('/user/book-appointment'),
      active: isBookActive,
    },
    {
      key: 'pets',
      label: 'Pet Profiles',
      icon: <IoPawOutline size={20} />,
      action: handleMyPets,
      active: isPetProfilesActive,
    },
    {
      key: 'about',
      label: 'About Us',
      icon: <IoInformationCircleOutline size={20} />,
      action: navigateToAbout,
      active: isAboutActive,
    },
  ];

  return (
    <div className="navbar-sticky client-nav-shell">
      <div className="user-navbar">
        <div className="mobile-nav-header">
          <button
            type="button"
            className="mobile-nav-toggle"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open navigation menu"
          >
            <IoMenuOutline size={28} color="#3d67ee" />
          </button>

          <div className="mobile-nav-user">
            {avatar}
            <span className="mobile-nav-name">{displayName || 'Menu'}</span>
          </div>
        </div>

        <div className="profile-dropdown-container">
          {currentUser ? (
            <button
              type="button"
              className="profile-button"
              onClick={() => setDropdownVisible(prev => !prev)}
            >
              <div className="profile-section">
                {avatar}
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
              type="button"
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
              <button type="button" className="dropdown-item" onClick={handleViewProfile}>
                <IoPersonOutline size={18} color="#3d67ee" />
                <span>View Profile</span>
              </button>

              <button type="button" className="dropdown-item" onClick={handleMyPets}>
                <IoPawOutline size={18} color="#3d67ee" />
                <span>My Pets</span>
              </button>

              <button
                type="button"
                className="dropdown-item logout-item"
                onClick={handleLogoutClick}
              >
                <IoLogOutOutline size={18} color="#ee3d5a" />
                <span style={{ color: '#ee3d5a' }}>Logout</span>
              </button>
            </div>
          )}
        </div>

        <div className="nav-center">
          <div className="nav-links">
            <button
              type="button"
              className={`nav-link ${isHomeActive ? 'active' : ''}`}
              onClick={navigateHome}
            >
              Home
            </button>
            <button
              type="button"
              className={`nav-link ${isBookActive ? 'active' : ''}`}
              onClick={() => navigate('/user/book-appointment')}
            >
              Book an Appointment
            </button>
            <button
              type="button"
              className={`nav-link ${isPetProfilesActive ? 'active' : ''}`}
              onClick={handleMyPets}
            >
              Pet Profiles
            </button>
            <button
              type="button"
              className={`nav-link ${isAboutActive ? 'active' : ''}`}
              onClick={navigateToAbout}
            >
              About Us
            </button>
          </div>
        </div>

        <div className="nav-icons">
          <button
            type="button"
            className="icon-button"
            onClick={() => navigate('/user/pet-profile')}
            aria-label="Open pet profile"
          >
            <IoPawOutline size={21} color="#3d67ee" />
          </button>

          <button
            type="button"
            className="icon-button"
            onClick={() => navigate('/user/appointments')}
            aria-label="Open appointments"
          >
            <IoCalendarOutline size={21} color="#3d67ee" />
          </button>

          <button
            type="button"
            className="icon-button"
            onClick={() => navigate('/user/book-appointment')}
            aria-label="Book an appointment"
          >
            <IoNotificationsOutline size={21} color="#3d67ee" />
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <>
          <button
            type="button"
            className="mobile-nav-backdrop"
            onClick={closeMobileMenu}
            aria-label="Close navigation menu"
          />

          <div className="mobile-nav-drawer" role="dialog" aria-modal="true">
            <div className="mobile-nav-drawer-header">
              <div className="mobile-nav-drawer-user">
                {avatar}
                <div className="mobile-nav-drawer-copy">
                  <span className="mobile-nav-drawer-title">{displayName || 'Navigation'}</span>
                  <span className="mobile-nav-drawer-subtitle">User Pages</span>
                </div>
              </div>

              <button
                type="button"
                className="mobile-nav-close"
                onClick={closeMobileMenu}
                aria-label="Close navigation menu"
              >
                <IoClose size={24} color="#3d67ee" />
              </button>
            </div>

            <div className="mobile-nav-list">
              {mobileNavItems.map(item => (
                <button
                  key={item.key}
                  type="button"
                  className={`mobile-nav-item ${item.active ? 'is-active' : ''}`}
                  onClick={() => runMobileAction(item.action)}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}

              <button
                type="button"
                className="mobile-nav-item mobile-nav-item-signout"
                onClick={handleLogoutClick}
              >
                <IoLogOutOutline size={20} />
                <span>Signout</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ClientNavBar;
