import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../admin_pages/AdminStyles.css';
import { PiUsersThree } from "react-icons/pi";
import { TbPresentationAnalytics } from "react-icons/tb";
import { TbLayoutSidebarLeftCollapse, TbLayoutSidebarRightCollapse } from "react-icons/tb";

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
  IoFileTrayFullOutline
} from 'react-icons/io5';

interface NavbarProps {
  currentUser: {
    id?: number;
    pk?: number;
    username: string;
    fullName?: string;
    role: string;
    userImage?: string;
  } | null;
  onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentUser, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [showAccountDropdown, setShowAccountDropdown] = useState<boolean>(false);
  const [showAppointmentsDropdown, setShowAppointmentsDropdown] = useState<boolean>(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isHoveringTitle, setIsHoveringTitle] = useState<boolean>(false);
  
  const accountDropdownRef = useRef<HTMLDivElement>(null);
  const appointmentsDropdownRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string): boolean => {
    return location.pathname === path;
  };
  
  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(event.target as Node)) {
        setShowAccountDropdown(false);
      }
      if (appointmentsDropdownRef.current && !appointmentsDropdownRef.current.contains(event.target as Node)) {
        setShowAppointmentsDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleNavbar = () => {
    setIsCollapsed(!isCollapsed);
    if (!isCollapsed) {
      setShowAccountDropdown(false);
      setShowAppointmentsDropdown(false);
    }
  };

  const handleMouseEnter = (e: React.MouseEvent, itemName: string) => {
    if (isCollapsed) {
      const rect = e.currentTarget.getBoundingClientRect();
      setHoverPosition({
        x: rect.right + 10,
        y: rect.top + (rect.height / 2)
      });
      setHoveredItem(itemName);
    }
  };

  const handleMouseLeave = () => {
    if (isCollapsed) {
      setHoveredItem(null);
    }
  };

  // Close other dropdown when opening one
  const handleAccountDropdownToggle = () => {
    if (showAccountDropdown) {
      setShowAccountDropdown(false);
    } else {
      setShowAppointmentsDropdown(false);
      setShowAccountDropdown(true);
    }
  };

  const handleAppointmentsDropdownToggle = () => {
    if (showAppointmentsDropdown) {
      setShowAppointmentsDropdown(false);
    } else {
      setShowAccountDropdown(false);
      setShowAppointmentsDropdown(true);
    }
  };

  const renderTooltip = () => {
    if (!hoveredItem || !isCollapsed) return null;

    let tooltipText = '';
    switch(hoveredItem) {
      case 'Home': tooltipText = 'Home'; break;
      case 'Analytics': tooltipText = 'Analytics'; break;
      case 'Account Overview': tooltipText = 'Account Overview'; break;
      case 'Appointments': tooltipText = 'Appointments'; break;
      case 'Patient Records': tooltipText = 'Patient Records'; break;
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
      <div className={`navbarContainer ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="navBody navGradient">
          <div 
            className="navTitle"
            onMouseEnter={() => setIsHoveringTitle(true)}
            onMouseLeave={() => setIsHoveringTitle(false)}
          >
            <div className="navLogoContainer">
              {isCollapsed && isHoveringTitle ? (
                <button className="navLogoCollapseBtn" onClick={toggleNavbar}>
                  <TbLayoutSidebarRightCollapse size={24} />
                </button>
              ) : (
                <img 
                  src="/src/assets/AgsikapLogo-Temp.png"
                  alt="PawRang Logo"
                  className="navLogo"
                />
              )}
              {!isCollapsed && <span className="brandFont">PawRang</span>}
            </div>
            {!isCollapsed && isHoveringTitle && (
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
                src={(currentUser && currentUser.userImage) ? currentUser.userImage : "/src/assets/userAvatar.jpg"} 
                alt="User"
                className="navAvatar"
              />
              {!isCollapsed && (
                <div style={{lineHeight: '20px'}}>
                  <div className="navUserName">{currentUser ? currentUser.username : "Username Here"}</div>
                  <div className="navUserRole">{currentUser ? currentUser.role : "User Role Here"}</div>
                </div>
              )}
            </div>
          </div>

          {!isCollapsed && <div className="navOverview">Overview</div>}

          <div className="navGlassContainer scrollable-nav">
            <div className="navMenu">
              <div className="navMenuSection">
                <button 
                  className={`navBtn ${isActive('/home') ? 'active' : ''}`} 
                  onClick={() => navigate('/home')}
                  onMouseEnter={(e) => handleMouseEnter(e, 'Home')}
                  onMouseLeave={handleMouseLeave}
                >
                  <IoHomeOutline size={isCollapsed ? 20 : 16} />
                  {!isCollapsed && <span>Home</span>}
                </button>
              </div>

              <div className="navMenuSection">
                <button 
                  className={`navBtn ${isActive('/analytics') ? 'active' : ''}`} 
                  onClick={() => navigate('/analytics')}
                  onMouseEnter={(e) => handleMouseEnter(e, 'Analytics')}
                  onMouseLeave={handleMouseLeave}
                >
                  <TbPresentationAnalytics size={isCollapsed ? 20 : 16} />
                  {!isCollapsed && <span>Analytics</span>}
                </button>
              </div>

              <div className="navMenuSection" ref={accountDropdownRef}>
                {!isCollapsed ? (
                  <>
                    <div className={isActive('/accounts') || isActive('/useraccounts') ? 'selectedGlass' : ''}>
                      <button className="navBtn" onClick={handleAccountDropdownToggle}>
                        <IoPeopleOutline size={16} />
                        <span>Account Overview</span>
                        {showAccountDropdown ? <IoChevronUpOutline size={12} /> : <IoChevronDownOutline size={12} />}
                      </button>
                    </div>

                    {showAccountDropdown && (
                      <div className="navSubMenu">
                        <div className={isActive('/accounts') ? 'subSelectedGlass' : ''}>
                          <button className="navBtn subNavBtn" onClick={() => navigate('/accounts')}>
                            <IoPersonOutline size={14} />
                            <span>Employees</span>
                          </button>
                        </div>
                        <div className={isActive('/useraccounts') ? 'subSelectedGlass' : ''}>
                          <button className="navBtn subNavBtn" onClick={() => navigate('/useraccounts')}>
                            <PiUsersThree size={16} />
                            <span>Users</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <button 
                      className={`navBtn ${isActive('/accounts') || isActive('/useraccounts') ? 'active' : ''}`}
                      onClick={handleAccountDropdownToggle}
                      onMouseEnter={(e) => handleMouseEnter(e, 'Account Overview')}
                      onMouseLeave={handleMouseLeave}
                    >
                      <IoPeopleOutline size={20} />
                    </button>
                    {showAccountDropdown && (
                      <div className="collapsedDropdown">
                        <button className="collapsedDropdownItem" onClick={() => {
                          navigate('/accounts');
                          setShowAccountDropdown(false);
                        }}>
                          <IoPersonOutline size={14} />
                          <span>Employees</span>
                        </button>
                        <button className="collapsedDropdownItem" onClick={() => {
                          navigate('/useraccounts');
                          setShowAccountDropdown(false);
                        }}>
                          <PiUsersThree size={16} />
                          <span>Users</span>
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="navMenuSection" ref={appointmentsDropdownRef}>
                {!isCollapsed ? (
                  <>
                    <div className={
                      isActive('/schedule') || isActive('/availSettings') || isActive('/history') 
                        ? 'selectedGlass' 
                        : ''
                    }>
                      <button className="navBtn" onClick={handleAppointmentsDropdownToggle}>
                        <IoCalendarClearOutline size={16} />
                        <span>Appointments</span>
                        {showAppointmentsDropdown ? <IoChevronUpOutline size={12} /> : <IoChevronDownOutline size={12} />}
                      </button>
                    </div>

                    {showAppointmentsDropdown && (
                      <div className="navSubMenu">
                        <div className={isActive('/schedule') ? 'subSelectedGlass' : ''}>
                          <button className="navBtn subNavBtn" onClick={() => navigate('/schedule')}>
                            <IoCalendarOutline size={14} />
                            <span>Schedule</span>
                          </button>
                        </div>
                        <div className={isActive('/availSettings') ? 'subSelectedGlass' : ''}>
                          <button className="navBtn subNavBtn" onClick={() => navigate('/availSettings')}>
                            <IoTodayOutline size={14} />
                            <span>Availability Settings</span>
                          </button>
                        </div>
                        <div className={isActive('/history') ? 'subSelectedGlass' : ''}>
                          <button className="navBtn subNavBtn" onClick={() => navigate('/history')}>
                            <IoTimeOutline size={14} />
                            <span>History</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <button 
                      className={`navBtn ${isActive('/schedule') || isActive('/availSettings') || isActive('/history') ? 'active' : ''}`}
                      onClick={handleAppointmentsDropdownToggle}
                      onMouseEnter={(e) => handleMouseEnter(e, 'Appointments')}
                      onMouseLeave={handleMouseLeave}
                    >
                      <IoCalendarClearOutline size={20} />
                    </button>
                    {showAppointmentsDropdown && (
                      <div className="collapsedDropdown">
                        <button className="collapsedDropdownItem" onClick={() => {
                          navigate('/schedule');
                          setShowAppointmentsDropdown(false);
                        }}>
                          <IoCalendarOutline size={14} />
                          <span>Schedule</span>
                        </button>
                        <button className="collapsedDropdownItem" onClick={() => {
                          navigate('/availSettings');
                          setShowAppointmentsDropdown(false);
                        }}>
                          <IoTodayOutline size={14} />
                          <span>Availability Settings</span>
                        </button>
                        <button className="collapsedDropdownItem" onClick={() => {
                          navigate('/history');
                          setShowAppointmentsDropdown(false);
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
                  className={`navBtn ${isActive('/patient-records') ? 'active' : ''}`} 
                  onClick={() => navigate('/patient-records')}
                  onMouseEnter={(e) => handleMouseEnter(e, 'Patient Records')}
                  onMouseLeave={handleMouseLeave}
                >
                  <IoDocumentText size={isCollapsed ? 20 : 16} />
                  {!isCollapsed && <span>Patient Records</span>}
                </button>
              </div>

              {/* Inventory */}
              <div className="navMenuSection">
                <button 
                  className={`navBtn ${isActive('/inventory') ? 'active' : ''}`} 
                  onClick={() => navigate('/inventory')}
                  onMouseEnter={(e) => handleMouseEnter(e, 'Inventory')}
                  onMouseLeave={handleMouseLeave}
                >
                  <IoLayersOutline size={isCollapsed ? 20 : 16} />
                  {!isCollapsed && <span>Inventory</span>}
                </button>
              </div>

              <div className="navMenuSection">
                <button 
                  className={`navBtn ${isActive('/audit') ? 'active' : ''}`} 
                  onClick={() => navigate('/audit')}
                  onMouseEnter={(e) => handleMouseEnter(e, 'System Audit')}
                  onMouseLeave={handleMouseLeave}
                >
                  <IoFileTrayFullOutline size={isCollapsed ? 20 : 16} />
                  {!isCollapsed && <span>System Audit</span>}
                </button>
              </div>

              <div className="navMenuSection">
                <button 
                  className={`navBtn ${isActive('/settings') ? 'active' : ''}`} 
                  onClick={() => navigate('/settings')}
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
                onClick={onLogout}
                onMouseEnter={(e) => handleMouseEnter(e, 'Log Out')}
                onMouseLeave={handleMouseLeave}
              >
                <IoLogOutOutline size={isCollapsed ? 20 : 16} />
                {!isCollapsed && <span>Log Out</span>}
              </button>
            </div>
          </div>
        </div>
      </div>
      {renderTooltip()}
    </>
  );
};

export default Navbar;