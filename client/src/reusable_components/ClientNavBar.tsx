import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  IoCalendarOutline,
  IoChevronDownOutline,
  IoChevronUpOutline,
  IoClose,
  IoHomeOutline,
  IoGridOutline,
  IoInformationCircleOutline,
  IoLogOutOutline,
  IoMenuOutline,
  IoPawOutline,
  IoPersonOutline,
  IoRibbonOutline,
} from 'react-icons/io5';
import './ClientNavBar.css';
import UserNotifications from './UserNotifications';
import petshieldLogo from '../assets/PetshieldLogo.png';

interface User {
  id?: string | number;
  pk?: string | number;
  username?: string;
  fullname?: string;
  fullName?: string;
  firstName?: string;
  first_name?: string;
  lastName?: string;
  last_name?: string;
  profileImage?: string | null;
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
  onConfirm?: (() => void) | null;
  showCancel: boolean;
  confirmText: string;
}

interface ClientNavBarProps {
  currentUser: User | null;
  onLogout: () => void;
  onViewProfile: () => void;
  onMyPets: () => void;
  onAuthRequested?: () => void;
  onNavigateAttempt?: (action: () => void) => void;
  showAlert?: (
    type: AlertConfig['type'],
    title: string,
    message: string | React.ReactNode,
    onConfirm?: (() => void) | null,
    showCancel?: boolean,
    confirmText?: string
  ) => void;
}

const ClientNavBar: React.FC<ClientNavBarProps> = ({
  currentUser,
  onLogout,
  onViewProfile,
  onMyPets,
  onAuthRequested,
  onNavigateAttempt,
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

  const isHomeActive = location.pathname === '/user/home' && !['#about', '#services', '#certifications'].includes(location.hash);
  const isServicesActive = location.pathname === '/user/home' && location.hash === '#services';
  const isAboutActive = location.pathname === '/user/home' && location.hash === '#about';
  const isCertificationsActive = location.pathname === '/user/home' && location.hash === '#certifications';
  const isPetsActive = location.pathname === '/user/pet-profile';
  const isAppointmentsActive = location.pathname === '/user/appointments';
  const isUserHomePage = location.pathname === '/user/home';
  const usesTransparentNav = isUserHomePage || location.pathname === '/user/book-appointment' || location.pathname === '/user/pet-profile' || location.pathname === '/user/appointments' || location.pathname === '/user/profile';
  const navIconColor = usesTransparentNav ? '#ffffff' : '#0a1156';

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const runMobileAction = (action: () => void) => {
    closeMobileMenu();
    if (onNavigateAttempt) {
      onNavigateAttempt(action);
      return;
    }
    action();
  };

  const executeNavigation = (action: () => void) => {
    if (onNavigateAttempt) {
      onNavigateAttempt(action);
      return;
    }
    action();
  };

  const requestAuth = () => {
    setDropdownVisible(false);
    closeMobileMenu();

    if (onAuthRequested) {
      onAuthRequested();
      return;
    }

    navigate('/user/home', { state: { authMode: 'login' } });
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

  const navigateToServices = () => {
    if (location.pathname === '/user/home' && location.hash === '#services') {
      document.getElementById('services')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    navigate('/user/home#services');
  };

  const navigateToCertifications = () => {
    if (location.pathname === '/user/home' && location.hash === '#certifications') {
      document.getElementById('certifications')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    navigate('/user/home#certifications');
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
      key: 'services',
      label: 'Services',
      icon: <IoGridOutline size={20} />,
      action: navigateToServices,
      active: isServicesActive,
    },
    {
      key: 'about',
      label: 'About Us',
      icon: <IoInformationCircleOutline size={20} />,
      action: navigateToAbout,
      active: isAboutActive,
    },
    {
      key: 'certifications',
      label: 'Certifications',
      icon: <IoRibbonOutline size={20} />,
      action: navigateToCertifications,
      active: isCertificationsActive,
    },
  ];

  const navShellClassName = `navbar-sticky client-nav-shell ${usesTransparentNav ? 'client-nav-home' : ''}`;
  const profileDropdown = (
    <div className="profile-dropdown-container">
      {currentUser ? (
        <button
          type="button"
          className="profile-button"
          onClick={() => setDropdownVisible(prev => !prev)}
        >
          <div className="profile-section profile-section-account">
            {avatar}
            <div className="profile-info">
              <span className="profile-name" title={displayName}>{displayName}</span>
            </div>
            {dropdownVisible ? (
              <IoChevronUpOutline size={18} color={navIconColor} />
            ) : (
              <IoChevronDownOutline size={18} color={navIconColor} />
            )}
          </div>
        </button>
      ) : (
        <button
          type="button"
          className="profile-button"
          onClick={requestAuth}
        >
          <div className="profile-section profile-section-auth">
            <IoPersonOutline size={18} color={navIconColor} />
            <span className="login-text">Login or Sign-up</span>
          </div>
        </button>
      )}

      {dropdownVisible && currentUser && (
        <div className="dropdown-menu">
          <button type="button" className="dropdown-item" onClick={handleViewProfile}>
            <IoPersonOutline size={18} color="#3d67ee" />
            <span>Profile Settings</span>
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
  );

  return (
    <div className={navShellClassName}>
      <div className="user-navbar">
        <div className="mobile-nav-header">
          <button type="button" className="client-nav-brand mobile-nav-brand" onClick={() => runMobileAction(navigateHome)}>
            <img src={petshieldLogo} alt="PetShield" className="client-nav-logo" />
            <span>PetShield</span>
          </button>

          <div className="mobile-nav-user">
            {avatar}
            <span className="mobile-nav-name">{displayName || 'Menu'}</span>
          </div>

          <button
            type="button"
            className="mobile-nav-toggle"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open navigation menu"
          >
            <IoMenuOutline size={28} color={navIconColor} />
          </button>
        </div>

        <div className="client-nav-left">
          <button type="button" className="client-nav-brand desktop-nav-brand" onClick={() => executeNavigation(navigateHome)}>
            <img src={petshieldLogo} alt="PetShield" className="client-nav-logo" />
          </button>

          {profileDropdown}
        </div>

        <div className="nav-center">
          <div className="nav-links">
            <button
              type="button"
              className={`nav-link ${isHomeActive ? 'active' : ''}`}
              onClick={() => executeNavigation(navigateHome)}
            >
              Home
            </button>
            <button
              type="button"
              className={`nav-link ${isServicesActive ? 'active' : ''}`}
              onClick={() => executeNavigation(navigateToServices)}
            >
              Services
            </button>
            <button
              type="button"
              className={`nav-link ${isAboutActive ? 'active' : ''}`}
              onClick={() => executeNavigation(navigateToAbout)}
            >
              About Us
            </button>
            <button
              type="button"
              className={`nav-link ${isCertificationsActive ? 'active' : ''}`}
              onClick={() => executeNavigation(navigateToCertifications)}
            >
              Certifications
            </button>
          </div>
        </div>

        <div className="nav-icons">
          <button
            type="button"
            className={`icon-button ${isPetsActive ? 'active' : ''}`}
            onClick={() => executeNavigation(() => navigate('/user/pet-profile'))}
            aria-label="Open pet profile"
          >
            <IoPawOutline size={21} color={navIconColor} />
          </button>

          <button
            type="button"
            className={`icon-button ${isAppointmentsActive ? 'active' : ''}`}
            onClick={() => executeNavigation(() => navigate('/user/appointments'))}
            aria-label="Open appointments"
          >
            <IoCalendarOutline size={21} color={navIconColor} />
          </button>

          <UserNotifications
            userId={currentUser?.id || currentUser?.pk}
            onOpenAppointments={() => executeNavigation(() => navigate('/user/appointments'))}
            iconColor={navIconColor}
          />
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
