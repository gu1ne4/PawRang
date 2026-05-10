import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../admin_pages/AdminStyles.css';
import { PiUsersThree } from "react-icons/pi";
import { TbPresentationAnalytics } from "react-icons/tb";
import { TbLayoutSidebarLeftCollapse, TbLayoutSidebarRightCollapse } from "react-icons/tb";
import { CiBoxes } from "react-icons/ci";
import { TbArrowsUpDown } from "react-icons/tb";
import { IoIosArchive } from "react-icons/io";
import petShieldLogo from '../assets/PetshieldLogo.png';
import pawRangLogomarkWhite from '../assets/PawRang Logomark White.png';
import defaultUserAvatar from '../assets/userAvatar.jpg';
import { isAdminRole, isDoctorRole, normalizeRole } from '../auth/roles';

// Icons
import { 
  IoHomeOutline, 
  IoPeopleOutline, 
  IoPersonOutline, 
  IoCalendarClearOutline,
  IoCalendarOutline,
  IoTodayOutline,
  IoTimeOutline,
  IoSettingsOutline,
  IoLogOutOutline,
  IoChevronUpOutline,
  IoChevronDownOutline,
  IoDocumentTextOutline as IoDocumentText, 
  IoLayersOutline,  
  IoFileTrayFullOutline,
  IoArrowDownOutline,
  IoArrowUpOutline,
  IoReceiptOutline,
  IoCloseOutline,
  IoMenuOutline
} from 'react-icons/io5';

interface NavbarProps {
  currentUser: {
    id?: string | number;
    pk?: string | number;
    username?: string;
    fullName?: string;
    role?: string;
    image?: string;
    userImage?: string;
    userimage?: string;
    user_image?: string;
    profileImage?: string;
    employee_image?: string;
  } | null;
  onLogout: () => void;
  onNavigateAttempt?: (path: string, navigateFn: () => void) => void;
  confirmLogout?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ currentUser, onLogout, onNavigateAttempt, confirmLogout = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Load collapsed state from localStorage
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem('navbarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });
  
  const [showAccountDropdown, setShowAccountDropdown] = useState<boolean>(false);
  const [showAppointmentsDropdown, setShowAppointmentsDropdown] = useState<boolean>(false);
  const [showInventoryDropdown, setShowInventoryDropdown] = useState<boolean>(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isHoveringTitle, setIsHoveringTitle] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(() => window.innerWidth <= 900);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  const accountDropdownRef = useRef<HTMLDivElement>(null);
  const appointmentsDropdownRef = useRef<HTMLDivElement>(null);
  const inventoryDropdownRef = useRef<HTMLDivElement>(null);
  const normalizedRole = normalizeRole(currentUser?.role);
  const isAdminWorkspace = isAdminRole(currentUser?.role);
  const isDoctorWorkspace =
    !isAdminWorkspace &&
    (location.pathname.startsWith('/doctor') || isDoctorRole(normalizedRole));
  const homePath = isDoctorWorkspace ? '/doctor/home' : '/admin/home';
  const appointmentsPath = isDoctorWorkspace ? '/doctor/appointments' : '/admin/schedule';
  const recordsPath = isDoctorWorkspace ? '/doctor/medical-records' : '/patient-records';
  const inventoryPath = isDoctorWorkspace ? '/doctor/inventory' : '/inventory';
  const profileImage =
    currentUser?.profileImage ||
    currentUser?.employee_image ||
    currentUser?.image ||
    currentUser?.userImage ||
    currentUser?.userimage ||
    currentUser?.user_image ||
    '';
  const avatarSource = profileImage || defaultUserAvatar;

  const isActive = (path: string): boolean => {
    return location.pathname === path;
  };

  const isAppointmentsActive = (): boolean => {
    if (isDoctorWorkspace) {
      return isActive('/doctor/appointments');
    }
    return isActive('/admin/schedule') || isActive('/admin/availability') || isActive('/admin/history');
  };

  const isAccountActive = (): boolean => {
    return isActive('/admin/dashboard') || isActive('/admin/users');
  };

  const isInventoryActive = (): boolean => {
    if (isDoctorWorkspace) {
      return isActive('/doctor/inventory');
    }
    return isActive('/manage-inventory') || isActive('/inventory') || isActive('/inventory-logs') || isActive('/inventory-in') || isActive('/inventory-out') || isActive('/inventory-archive');
  };
  
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 900;
      setIsMobile(mobile);
      if (!mobile) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(event.target as Node)) {
        setShowAccountDropdown(false);
      }
      if (appointmentsDropdownRef.current && !appointmentsDropdownRef.current.contains(event.target as Node)) {
        setShowAppointmentsDropdown(false);
      }
      if (inventoryDropdownRef.current && !inventoryDropdownRef.current.contains(event.target as Node)) {
        setShowInventoryDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Keep dropdowns open when on sub-pages (for expanded mode)
  useEffect(() => {
    if (!isCollapsed) {
      if (isAccountActive()) {
        setShowAccountDropdown(true);
      }
      if (isAppointmentsActive()) {
        setShowAppointmentsDropdown(true);
      }
      if (isInventoryActive()) {
        setShowInventoryDropdown(true);
      }
    }
  }, [location.pathname, isCollapsed, isDoctorWorkspace]);

  useEffect(() => {
    if (isMobile) {
      setIsCollapsed(false);
    }
  }, [isMobile]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const toggleNavbar = () => {
    if (isMobile) {
      setIsMobileMenuOpen((current) => !current);
      return;
    }

    const newCollapsedState = !isCollapsed;
    setIsCollapsed(newCollapsedState);
    localStorage.setItem('navbarCollapsed', JSON.stringify(newCollapsedState));
    if (newCollapsedState) {
      setShowAccountDropdown(false);
      setShowAppointmentsDropdown(false);
      setShowInventoryDropdown(false);
    }
  };

  const handleMouseEnter = (e: React.MouseEvent, itemName: string) => {
    if (isCollapsed && !isMobile) {
      const rect = e.currentTarget.getBoundingClientRect();
      setHoverPosition({
        x: rect.right + 10,
        y: rect.top + (rect.height / 2)
      });
      setHoveredItem(itemName);
    }
  };

  const handleMouseLeave = () => {
    if (isCollapsed && !isMobile) {
      setHoveredItem(null);
    }
  };

  // Close other dropdown when opening one
  const handleAccountDropdownToggle = () => {
    if (showAccountDropdown) {
      setShowAccountDropdown(false);
    } else {
      setShowAppointmentsDropdown(false);
      setShowInventoryDropdown(false);
      setShowAccountDropdown(true);
    }
  };

  const handleAppointmentsDropdownToggle = () => {
    if (showAppointmentsDropdown) {
      setShowAppointmentsDropdown(false);
    } else {
      setShowAccountDropdown(false);
      setShowInventoryDropdown(false);
      setShowAppointmentsDropdown(true);
    }
  };

  const handleInventoryDropdownToggle = () => {
    if (showInventoryDropdown) {
      setShowInventoryDropdown(false);
    } else {
      setShowAccountDropdown(false);
      setShowAppointmentsDropdown(false);
      setShowInventoryDropdown(true);
    }
  };

  const handleNavigate = (path: string, afterNavigate?: () => void) => {
    const runNavigation = () => {
      navigate(path);
      if (afterNavigate) afterNavigate();
    };

    if (onNavigateAttempt) {
      onNavigateAttempt(path, runNavigation);
      return;
    }

    runNavigation();
  };

  const handleLogoutClick = () => {
    if (confirmLogout) {
      setShowLogoutConfirm(true);
      return;
    }

    onLogout();
  };

  const confirmLogoutClick = () => {
    setShowLogoutConfirm(false);
    onLogout();
  };

  const renderTooltip = () => {
    if (!hoveredItem || !isCollapsed || isMobile) return null;

    let tooltipText = '';
    switch(hoveredItem) {
      case 'Home': tooltipText = 'Home'; break;
      case 'Analytics': tooltipText = 'Analytics'; break;
      case 'Account Overview': tooltipText = 'Account Overview'; break;
      case 'Appointments': tooltipText = 'Appointments'; break;
      case 'Patient Records': tooltipText = isDoctorWorkspace ? 'Medical Records' : 'Patient Records'; break;
      case 'Inventory': tooltipText = 'Inventory'; break;
      case 'System Audit': tooltipText = 'System Audit'; break;
      case 'Settings': tooltipText = 'Settings'; break;
      case 'Log Out': tooltipText = 'Log Out'; break;
      default: return null;
    }

    return (
      <div 
        className="hoverTooltip"
        style={{
          position: 'fixed',
          left: `${hoverPosition.x}px`,
          top: `${hoverPosition.y}px`,
          transform: 'translateY(-50%)'
        }}
      >
        {tooltipText}
      </div>
    );
  };

  return (
    <>
      {isMobile && (
        <>
          <button
            type="button"
            className="mobileNavToggle"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Open navigation menu"
          >
            <IoMenuOutline size={24} />
          </button>
          {isMobileMenuOpen && (
            <button
              type="button"
              className="mobileNavBackdrop"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-label="Close navigation menu"
            />
          )}
        </>
      )}

      <div className={`navbarContainer ${isCollapsed ? 'collapsed' : ''} ${isMobile ? 'mobile' : ''} ${isMobileMenuOpen ? 'mobileOpen' : ''}`}>
        <div className="navBody navGradient">
          <div 
            className="navTitle"
            onMouseEnter={() => setIsHoveringTitle(true)}
            onMouseLeave={() => setIsHoveringTitle(false)}
          >
            <div className="navLogoContainer">
              {isCollapsed && !isMobile && isHoveringTitle ? (
                <button className="navLogoCollapseBtn" onClick={toggleNavbar}>
                  <TbLayoutSidebarRightCollapse size={24} />
                </button>
              ) : (
                <img 
                  src={petShieldLogo}
                  alt="PetShield Logo"
                  className="navLogo"
                />
              )}
              {(!isCollapsed || isMobile) && <span className="brandFont">PetShield</span>}
            </div>
            {isMobile ? (
              <button
                className="navMobileCloseBtn"
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="Close navigation menu"
              >
                <IoCloseOutline size={22} />
              </button>
            ) : !isCollapsed && isHoveringTitle && (
              <button 
                className="navCollapseBtn" 
                onClick={toggleNavbar}
              >
                <TbLayoutSidebarLeftCollapse size={20} />
              </button>
            )}
          </div>

          {/* Account Logged In */}
          <div className="navGlassContainer navAccountContainer">
            <div className="navAccount">
              <img 
                src={avatarSource} 
                alt="User"
                className="navAvatar"
              />
              {(!isCollapsed || isMobile) && (
                <div style={{lineHeight: '20px'}}>
                  <div className="navUserName">{currentUser?.username || "Username Here"}</div>
                  <div className="navUserRole">{currentUser?.role || "User Role Here"}</div>
                </div>
              )}
            </div>
          </div>

          {(!isCollapsed || isMobile) && <div className="navOverview">Overview</div>}

          <div className="navGlassContainer scrollable-nav">
            <div className="navMenu">
              <div className="navMenuSection">
                <button 
                  className={`navBtn ${isActive(homePath) ? 'active' : ''}`} 
                  onClick={() => handleNavigate(homePath)}
                  onMouseEnter={(e) => handleMouseEnter(e, 'Home')}
                  onMouseLeave={handleMouseLeave}
                >
                  <IoHomeOutline size={isCollapsed ? 20 : 16} />
                  {!isCollapsed && <span>Home</span>}
                </button>
              </div>

              {!isDoctorWorkspace && (
                <div className="navMenuSection">
                  <button 
                    className={`navBtn ${isActive('/analytics') ? 'active' : ''}`} 
                    onClick={() => handleNavigate('/analytics')}
                    onMouseEnter={(e) => handleMouseEnter(e, 'Analytics')}
                    onMouseLeave={handleMouseLeave}
                  >
                    <TbPresentationAnalytics size={isCollapsed ? 20 : 16} />
                    {!isCollapsed && <span>Analytics</span>}
                  </button>
                </div>
              )}

              {!isDoctorWorkspace && (
              <div className="navMenuSection" ref={accountDropdownRef}>
                {!isCollapsed ? (
                  <>
                    <button 
                      className={`navBtn ${isAccountActive() ? 'active' : ''}`}
                      onClick={handleAccountDropdownToggle}
                    >
                      <IoPeopleOutline size={16} />
                      <span>Account Overview</span>
                      {showAccountDropdown ? <IoChevronUpOutline size={12} /> : <IoChevronDownOutline size={12} />}
                    </button>

                    {showAccountDropdown && (
                      <div className="navSubMenu">
                        <button 
                          className={`navBtn subNavBtn ${isActive('/admin/dashboard') ? 'active' : ''}`}
                          onClick={() => handleNavigate('/admin/dashboard')}
                        >
                          <IoPersonOutline size={14} />
                          <span>Employees</span>
                        </button>
                        <button 
                          className={`navBtn subNavBtn ${isActive('/admin/users') ? 'active' : ''}`}
                          onClick={() => handleNavigate('/admin/users')}
                        >
                          <PiUsersThree size={16} />
                          <span>Users</span>
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <button 
                      className={`navBtn ${isAccountActive() ? 'active' : ''}`}
                      onClick={handleAccountDropdownToggle}
                      onMouseEnter={(e) => handleMouseEnter(e, 'Account Overview')}
                      onMouseLeave={handleMouseLeave}
                    >
                      <IoPeopleOutline size={20} />
                    </button>
                    {showAccountDropdown && (
                      <div className="collapsedDropdown">
                        <button className="collapsedDropdownItem" onClick={() => {
                          handleNavigate('/admin/dashboard', () => setShowAccountDropdown(false));
                        }}>
                          <IoPersonOutline size={14} />
                          <span>Employees</span>
                        </button>
                        <button className="collapsedDropdownItem" onClick={() => {
                          handleNavigate('/admin/users', () => setShowAccountDropdown(false));
                        }}>
                          <PiUsersThree size={16} />
                          <span>Users</span>
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
              )}

              <div className="navMenuSection" ref={appointmentsDropdownRef}>
                {isDoctorWorkspace ? (
                  <button 
                    className={`navBtn ${isAppointmentsActive() ? 'active' : ''}`}
                    onClick={() => handleNavigate(appointmentsPath)}
                    onMouseEnter={(e) => handleMouseEnter(e, 'Appointments')}
                    onMouseLeave={handleMouseLeave}
                  >
                    <IoCalendarClearOutline size={isCollapsed ? 20 : 16} />
                    {!isCollapsed && <span>Appointments</span>}
                  </button>
                ) : !isCollapsed ? (
                  <>
                    <button 
                      className={`navBtn ${isAppointmentsActive() ? 'active' : ''}`}
                      onClick={handleAppointmentsDropdownToggle}
                    >
                      <IoCalendarClearOutline size={16} />
                      <span>Appointments</span>
                      {showAppointmentsDropdown ? <IoChevronUpOutline size={12} /> : <IoChevronDownOutline size={12} />}
                    </button>

                    {showAppointmentsDropdown && (
                      <div className="navSubMenu">
                        <button 
                          className={`navBtn subNavBtn ${isActive('/admin/schedule') ? 'active' : ''}`}
                          onClick={() => handleNavigate('/admin/schedule')}
                        >
                          <IoCalendarOutline size={14} />
                          <span>Schedule</span>
                        </button>
                        <button 
                          className={`navBtn subNavBtn ${isActive('/admin/availability') ? 'active' : ''}`}
                          onClick={() => handleNavigate('/admin/availability')}
                        >
                          <IoTodayOutline size={14} />
                          <span>Availability Settings</span>
                        </button>
                        <button 
                          className={`navBtn subNavBtn ${isActive('/admin/history') ? 'active' : ''}`}
                          onClick={() => handleNavigate('/admin/history')}
                        >
                          <IoTimeOutline size={14} />
                          <span>History</span>
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <button 
                      className={`navBtn ${isAppointmentsActive() ? 'active' : ''}`}
                      onClick={handleAppointmentsDropdownToggle}
                      onMouseEnter={(e) => handleMouseEnter(e, 'Appointments')}
                      onMouseLeave={handleMouseLeave}
                    >
                      <IoCalendarClearOutline size={20} />
                    </button>
                    {showAppointmentsDropdown && (
                      <div className="collapsedDropdown">
                        <button className="collapsedDropdownItem" onClick={() => {
                          handleNavigate('/admin/schedule', () => setShowAppointmentsDropdown(false));
                        }}>
                          <IoCalendarOutline size={14} />
                          <span>Schedule</span>
                        </button>
                        <button className="collapsedDropdownItem" onClick={() => {
                          handleNavigate('/admin/availability', () => setShowAppointmentsDropdown(false));
                        }}>
                          <IoTodayOutline size={14} />
                          <span>Availability Settings</span>
                        </button>
                        <button className="collapsedDropdownItem" onClick={() => {
                          handleNavigate('/admin/history', () => setShowAppointmentsDropdown(false));
                        }}>
                          <IoTimeOutline size={14} />
                          <span>History</span>
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Patient Records */}
              <div className="navMenuSection">
                <button 
                  className={`navBtn ${isActive(recordsPath) ? 'active' : ''}`} 
                  onClick={() => handleNavigate(recordsPath)}
                  onMouseEnter={(e) => handleMouseEnter(e, 'Patient Records')}
                  onMouseLeave={handleMouseLeave}
                >
                  <IoDocumentText size={isCollapsed ? 20 : 16} />
                  {!isCollapsed && <span>{isDoctorWorkspace ? 'Medical Records' : 'Patient Records'}</span>}
                </button>
              </div>

              {!isDoctorWorkspace && (
                <div className="navMenuSection">
                  <button 
                    className={`navBtn ${isActive('/billing') ? 'active' : ''}`} 
                    onClick={() => handleNavigate('/billing')}
                    onMouseEnter={(e) => handleMouseEnter(e, 'Billing')}
                    onMouseLeave={handleMouseLeave}
                  >
                    <IoReceiptOutline size={isCollapsed ? 20 : 16} />
                    {!isCollapsed && <span>Billing</span>}
                  </button>
                </div>
              )}

              {/* Inventory with Dropdown */}
              <div className="navMenuSection" ref={inventoryDropdownRef}>
                {isDoctorWorkspace ? (
                  <button 
                    className={`navBtn ${isInventoryActive() ? 'active' : ''}`}
                    onClick={() => handleNavigate(inventoryPath)}
                    onMouseEnter={(e) => handleMouseEnter(e, 'Inventory')}
                    onMouseLeave={handleMouseLeave}
                  >
                    <IoLayersOutline size={isCollapsed ? 20 : 16} />
                    {!isCollapsed && <span>Inventory</span>}
                  </button>
                ) : !isCollapsed ? (
                  <>
                    <button 
                      className={`navBtn ${isInventoryActive() ? 'active' : ''}`}
                      onClick={handleInventoryDropdownToggle}
                    >
                      <IoLayersOutline size={16} />
                      <span>Inventory</span>
                      {showInventoryDropdown ? <IoChevronUpOutline size={12} /> : <IoChevronDownOutline size={12} />}
                    </button>

                    {showInventoryDropdown && (
                      <div className="navSubMenu">
                        <button 
                          className={`navBtn subNavBtn ${isActive('/manage-inventory') ? 'active' : ''}`}
                          onClick={() => handleNavigate(inventoryPath)}
                        >
                          <CiBoxes size={14} />
                          <span>Item Catalog</span>
                        </button>
                        <button 
                          className={`navBtn subNavBtn ${isActive('/inventory-logs') ? 'active' : ''}`}
                          onClick={() => handleNavigate('/inventory-logs')}
                        >
                          <TbArrowsUpDown size={16} />
                          <span>Movement Logs</span>
                        </button>
                        <button 
                          className={`navBtn subNavBtn ${isActive('/inventory-in') ? 'active' : ''}`}
                          onClick={() => handleNavigate('/inventory-in')}
                        >
                          <IoArrowDownOutline size={16} />
                          <span>Inventory IN</span>
                        </button>
                        <button 
                          className={`navBtn subNavBtn ${isActive('/inventory-out') ? 'active' : ''}`}
                          onClick={() => handleNavigate('/inventory-out')}
                        >
                          <IoArrowUpOutline size={16} />
                          <span>Inventory OUT</span>
                        </button>
                        <button 
                          className={`navBtn subNavBtn ${isActive('/inventory-archive') ? 'active' : ''}`}
                          onClick={() => handleNavigate('/inventory-archive')}
                        >
                          <IoIosArchive size={16} />
                          <span>Archived Items</span>
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <button 
                      className={`navBtn ${isInventoryActive() ? 'active' : ''}`}
                      onClick={handleInventoryDropdownToggle}
                      onMouseEnter={(e) => handleMouseEnter(e, 'Inventory')}
                      onMouseLeave={handleMouseLeave}
                    >
                      <IoLayersOutline size={20} />
                    </button>
                    {showInventoryDropdown && (
                      <div className="collapsedDropdown">
                        <button className="collapsedDropdownItem" onClick={() => {
                          handleNavigate('/inventory', () => setShowInventoryDropdown(false));
                        }}>
                          <CiBoxes size={16} />
                          <span>Item Catalog</span>
                        </button>
                        <button className="collapsedDropdownItem" onClick={() => {
                          handleNavigate('/inventory-logs', () => setShowInventoryDropdown(false));
                        }}>
                          <TbArrowsUpDown size={16} />
                          <span>Movement Logs</span>
                        </button>
                        <button className="collapsedDropdownItem" onClick={() => {
                          handleNavigate('/inventory-in', () => setShowInventoryDropdown(false));
                        }}>
                          <IoArrowDownOutline size={16} />
                          <span>Inventory IN</span>
                        </button>
                        <button className="collapsedDropdownItem" onClick={() => {
                          handleNavigate('/inventory-out', () => setShowInventoryDropdown(false));
                        }}>
                          <IoArrowUpOutline size={16} />
                          <span>Inventory OUT</span>
                        </button>
                        <button className="collapsedDropdownItem" onClick={() => {
                          handleNavigate('/inventory-archive', () => setShowInventoryDropdown(false));
                        }}>
                          <IoIosArchive size={16} />
                          <span>Archived Items</span>
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {!isDoctorWorkspace && (
                <div className="navMenuSection">
                  <button 
                    className={`navBtn ${isActive('/admin/audit') ? 'active' : ''}`} 
                    onClick={() => handleNavigate('/admin/audit')}
                    onMouseEnter={(e) => handleMouseEnter(e, 'System Audit')}
                    onMouseLeave={handleMouseLeave}
                  >
                    <IoFileTrayFullOutline size={isCollapsed ? 20 : 16} />
                    {!isCollapsed && <span>System Audit</span>}
                  </button>
                </div>
              )}

              {!isDoctorWorkspace && (
                <div className="navMenuSection">
                  <button 
                    className={`navBtn ${isActive('/admin/settings') ? 'active' : ''}`} 
                    onClick={() => handleNavigate('/admin/settings')}
                    onMouseEnter={(e) => handleMouseEnter(e, 'Settings')}
                    onMouseLeave={handleMouseLeave}
                  >
                    <IoSettingsOutline size={isCollapsed ? 20 : 16} />
                    {!isCollapsed && <span>Settings</span>}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="navFooter">
            <div className="navGlassContainer">
              <button 
                className="navBtn" 
                onClick={handleLogoutClick}
                onMouseEnter={(e) => handleMouseEnter(e, 'Log Out')}
                onMouseLeave={handleMouseLeave}
              >
                <IoLogOutOutline size={isCollapsed ? 20 : 16} />
                {!isCollapsed && <span>Log Out</span>}
              </button>
            </div>
            {(!isCollapsed || isMobile) && (
              <div className="navPoweredBy">
                <span>Powered by</span>
                <img src={pawRangLogomarkWhite} alt="PawRang" className="navPoweredByLogo" />
              </div>
            )}
          </div>
        </div>
      </div>
      {!isMobile && renderTooltip()}
      {showLogoutConfirm && (
        <div className="modalOverlay">
          <div className="alertModal">
            <div className="alertIcon">
              <IoLogOutOutline size={55} color="#3d67ee" />
            </div>
            <h3 className="alertTitle">Log Out</h3>
            <p className="alertMessage">Are you sure you want to log out?</p>
            <div className="alertActions">
              <button className="alertBtn cancelAlertBtn" onClick={() => setShowLogoutConfirm(false)}>
                Cancel
              </button>
              <button className="alertBtn confirmAlertBtn" onClick={confirmLogoutClick}>
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
