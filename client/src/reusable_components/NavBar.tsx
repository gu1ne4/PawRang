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
import { isAdminRole, isClinicStaffRole, isDoctorRole, isNurseRole, normalizeRole } from '../auth/roles';

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
  const isDoctorPath = location.pathname.startsWith('/doctor');
  const isClinicStaffPath = location.pathname.startsWith('/clinic-staff');
  const isNursePath = location.pathname.startsWith('/nurse');
  const isAdminWorkspace = !isDoctorPath && !isClinicStaffPath && !isNursePath && isAdminRole(currentUser?.role);
  const isDoctorWorkspace =
    !isAdminWorkspace &&
    (isDoctorPath || isDoctorRole(normalizedRole));
  const isClinicStaffWorkspace =
    !isAdminWorkspace &&
    !isDoctorWorkspace &&
    (isClinicStaffPath || isClinicStaffRole(normalizedRole));
  const isNurseWorkspace =
    !isAdminWorkspace &&
    !isDoctorWorkspace &&
    !isClinicStaffWorkspace &&
    (isNursePath || isNurseRole(normalizedRole));
  const homePath = isDoctorWorkspace
    ? '/doctor/home'
    : isClinicStaffWorkspace
      ? '/clinic-staff/home'
      : isNurseWorkspace
        ? '/nurse/home'
        : '/admin/home';
  const analyticsPath = isClinicStaffWorkspace ? '/clinic-staff/analytics' : '/analytics';
  const appointmentSchedulePath = isDoctorWorkspace
    ? '/doctor/appointments/schedule'
    : isClinicStaffWorkspace
      ? '/clinic-staff/appointments/schedule'
      : isNurseWorkspace
        ? '/nurse/appointments/schedule'
        : '/admin/schedule';
  const appointmentAvailabilityPath = isDoctorWorkspace
    ? '/doctor/appointments/availability'
    : isClinicStaffWorkspace
      ? '/clinic-staff/appointments/availability'
      : isNurseWorkspace
        ? '/nurse/appointments/availability'
      : '/admin/availability';
  const appointmentHistoryPath = isDoctorWorkspace
    ? '/doctor/appointments/history'
    : isClinicStaffWorkspace
      ? '/clinic-staff/appointments/history'
      : isNurseWorkspace
        ? '/nurse/appointments/history'
      : '/admin/history';
  const recordsPath = isDoctorWorkspace
    ? '/doctor/medical-records'
    : isClinicStaffWorkspace
      ? '/clinic-staff/medical-records'
      : isNurseWorkspace
        ? '/nurse/medical-records'
        : '/patient-records';
  const billingPath = isClinicStaffWorkspace ? '/clinic-staff/billing' : isNurseWorkspace ? '/nurse/billing' : '/billing';
  const inventoryPath = isDoctorWorkspace
    ? '/doctor/inventory'
    : isClinicStaffWorkspace
      ? '/clinic-staff/inventory'
      : isNurseWorkspace
        ? '/nurse/inventory'
        : '/inventory';
  const inventoryLogsPath = isDoctorWorkspace ? '/doctor/inventory-logs' : isClinicStaffWorkspace ? '/clinic-staff/inventory-logs' : isNurseWorkspace ? '/nurse/inventory-logs' : '/inventory-logs';
  const inventoryInPath = isClinicStaffWorkspace ? '/clinic-staff/inventory-in' : isNurseWorkspace ? '/nurse/inventory-in' : '/inventory-in';
  const inventoryOutPath = isClinicStaffWorkspace ? '/clinic-staff/inventory-out' : isNurseWorkspace ? '/nurse/inventory-out' : '/inventory-out';
  const inventoryArchivePath = isClinicStaffWorkspace ? '/clinic-staff/inventory-archive' : isNurseWorkspace ? '/nurse/inventory-archive' : '/inventory-archive';
  const settingsPath = isDoctorWorkspace
    ? '/doctor/settings'
    : isClinicStaffWorkspace
      ? '/clinic-staff/settings'
      : isNurseWorkspace
        ? '/nurse/settings'
        : '/admin/settings';
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
      return location.pathname === '/doctor/appointments' || location.pathname.startsWith('/doctor/appointments/');
    }
    if (isNurseWorkspace) {
      return location.pathname === '/nurse/appointments' || location.pathname.startsWith('/nurse/appointments/');
    }
    return isActive(appointmentSchedulePath) || isActive(appointmentAvailabilityPath) || isActive(appointmentHistoryPath);
  };

  const isAccountActive = (): boolean => {
    return isActive('/admin/dashboard') || isActive('/admin/users');
  };

  const isInventoryActive = (): boolean => {
    if (isDoctorWorkspace) {
      return isActive('/doctor/inventory') || isActive('/doctor/inventory/catalog') || isActive('/doctor/inventory-logs');
    }
    return isActive('/manage-inventory') || isActive(inventoryPath) || isActive(inventoryLogsPath) || isActive(inventoryInPath) || isActive(inventoryOutPath) || isActive(inventoryArchivePath);
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
  }, [location.pathname, isCollapsed, isDoctorWorkspace, isClinicStaffWorkspace, isNurseWorkspace]);

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
      case 'Billing': tooltipText = 'Billing'; break;
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

              {!isDoctorWorkspace && !isNurseWorkspace && (
                <div className="navMenuSection">
                  <button 
                    className={`navBtn ${isActive(analyticsPath) ? 'active' : ''}`}
                    onClick={() => handleNavigate(analyticsPath)}
                    onMouseEnter={(e) => handleMouseEnter(e, 'Analytics')}
                    onMouseLeave={handleMouseLeave}
                  >
                    <TbPresentationAnalytics size={isCollapsed ? 20 : 16} />
                    {!isCollapsed && <span>Analytics</span>}
                  </button>
                </div>
              )}

              {!isDoctorWorkspace && !isClinicStaffWorkspace && !isNurseWorkspace && (
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
                {!isCollapsed || isMobile ? (
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
                          className={`navBtn subNavBtn ${isActive(appointmentSchedulePath) || (isDoctorWorkspace && isActive('/doctor/appointments')) ? 'active' : ''}`}
                          onClick={() => handleNavigate(appointmentSchedulePath)}
                        >
                          <IoCalendarOutline size={14} />
                          <span>Schedule</span>
                        </button>
                        <button 
                          className={`navBtn subNavBtn ${isActive(appointmentAvailabilityPath) ? 'active' : ''}`}
                          onClick={() => handleNavigate(appointmentAvailabilityPath)}
                        >
                          <IoTodayOutline size={14} />
                          <span>Availability Settings</span>
                        </button>
                        <button 
                          className={`navBtn subNavBtn ${isActive(appointmentHistoryPath) ? 'active' : ''}`}
                          onClick={() => handleNavigate(appointmentHistoryPath)}
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
                          handleNavigate(appointmentSchedulePath, () => setShowAppointmentsDropdown(false));
                        }}>
                          <IoCalendarOutline size={14} />
                          <span>Schedule</span>
                        </button>
                        <button className="collapsedDropdownItem" onClick={() => {
                          handleNavigate(appointmentAvailabilityPath, () => setShowAppointmentsDropdown(false));
                        }}>
                          <IoTodayOutline size={14} />
                          <span>Availability Settings</span>
                        </button>
                        <button className="collapsedDropdownItem" onClick={() => {
                          handleNavigate(appointmentHistoryPath, () => setShowAppointmentsDropdown(false));
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
                    className={`navBtn ${isActive(billingPath) ? 'active' : ''}`}
                    onClick={() => handleNavigate(billingPath)}
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
                {!isCollapsed ? (
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
                          className={`navBtn subNavBtn ${isActive(inventoryPath) || (isDoctorWorkspace && isActive('/doctor/inventory/catalog')) || isActive('/manage-inventory') ? 'active' : ''}`}
                          onClick={() => handleNavigate(inventoryPath)}
                        >
                          <CiBoxes size={14} />
                          <span>Item Catalog</span>
                        </button>
                        <button 
                          className={`navBtn subNavBtn ${isActive(inventoryLogsPath) ? 'active' : ''}`}
                          onClick={() => handleNavigate(inventoryLogsPath)}
                        >
                          <TbArrowsUpDown size={16} />
                          <span>Movement Logs</span>
                        </button>
                        {!isDoctorWorkspace && (
                          <>
                            <button
                              className={`navBtn subNavBtn ${isActive(inventoryInPath) ? 'active' : ''}`}
                              onClick={() => handleNavigate(inventoryInPath)}
                            >
                              <IoArrowDownOutline size={16} />
                              <span>Inventory IN</span>
                            </button>
                            <button
                              className={`navBtn subNavBtn ${isActive(inventoryOutPath) ? 'active' : ''}`}
                              onClick={() => handleNavigate(inventoryOutPath)}
                            >
                              <IoArrowUpOutline size={16} />
                              <span>Inventory OUT</span>
                            </button>
                            <button
                              className={`navBtn subNavBtn ${isActive(inventoryArchivePath) ? 'active' : ''}`}
                              onClick={() => handleNavigate(inventoryArchivePath)}
                            >
                              <IoIosArchive size={16} />
                              <span>Archived Items</span>
                            </button>
                          </>
                        )}
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
                          handleNavigate(inventoryPath, () => setShowInventoryDropdown(false));
                        }}>
                          <CiBoxes size={16} />
                          <span>Item Catalog</span>
                        </button>
                        <button className="collapsedDropdownItem" onClick={() => {
                          handleNavigate(inventoryLogsPath, () => setShowInventoryDropdown(false));
                        }}>
                          <TbArrowsUpDown size={16} />
                          <span>Movement Logs</span>
                        </button>
                        {!isDoctorWorkspace && (
                          <>
                            <button className="collapsedDropdownItem" onClick={() => {
                              handleNavigate(inventoryInPath, () => setShowInventoryDropdown(false));
                            }}>
                              <IoArrowDownOutline size={16} />
                              <span>Inventory IN</span>
                            </button>
                            <button className="collapsedDropdownItem" onClick={() => {
                              handleNavigate(inventoryOutPath, () => setShowInventoryDropdown(false));
                            }}>
                              <IoArrowUpOutline size={16} />
                              <span>Inventory OUT</span>
                            </button>
                            <button className="collapsedDropdownItem" onClick={() => {
                              handleNavigate(inventoryArchivePath, () => setShowInventoryDropdown(false));
                            }}>
                              <IoIosArchive size={16} />
                              <span>Archived Items</span>
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {!isDoctorWorkspace && !isClinicStaffWorkspace && !isNurseWorkspace && (
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

              <div className="navMenuSection">
                <button
                  className={`navBtn ${isActive(settingsPath) ? 'active' : ''}`}
                  onClick={() => handleNavigate(settingsPath)}
                  onMouseEnter={(e) => handleMouseEnter(e, 'Settings')}
                  onMouseLeave={handleMouseLeave}
                >
                  <IoSettingsOutline size={isCollapsed ? 20 : 16} />
                  {!isCollapsed && <span>Settings</span>}
                </button>
              </div>
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
