import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../admin_pages/AdminStyles.css';
import { PiUsersThree } from "react-icons/pi";
import { TbPresentationAnalytics } from "react-icons/tb";
import { TbLayoutSidebarLeftCollapse, TbLayoutSidebarRightCollapse } from "react-icons/tb";
import { CiBoxes } from "react-icons/ci";
import { TbArrowsUpDown } from "react-icons/tb";
import { IoIosArchive } from "react-icons/io";

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
  IoArrowUpOutline
} from 'react-icons/io5';

interface NavbarProps {
  currentUser: {
    id?: string | number;
    pk?: string | number;
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
  
  const accountDropdownRef = useRef<HTMLDivElement>(null);
  const appointmentsDropdownRef = useRef<HTMLDivElement>(null);
  const inventoryDropdownRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string): boolean => {
    return location.pathname === path;
  };

  // Check if any appointment sub-page is active
  const isAppointmentsActive = (): boolean => {
    return isActive('/schedule') || isActive('/availSettings') || isActive('/history');
  };

  // Check if any account sub-page is active
  const isAccountActive = (): boolean => {
    return isActive('/accounts') || isActive('/useraccounts');
  };

  // Check if any inventory sub-page is active
  const isInventoryActive = (): boolean => {
    return isActive('/manage-inventory') || isActive('/inventory-logs') || isActive('/inventory-in') || isActive('/inventory-out') || isActive('/inventory-archive');
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
  }, [location.pathname, isCollapsed]);

  const toggleNavbar = () => {
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
                          className={`navBtn subNavBtn ${isActive('/accounts') ? 'active' : ''}`}
                          onClick={() => navigate('/accounts')}
                        >
                          <IoPersonOutline size={14} />
                          <span>Employees</span>
                        </button>
                        <button 
                          className={`navBtn subNavBtn ${isActive('/useraccounts') ? 'active' : ''}`}
                          onClick={() => navigate('/useraccounts')}
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
                          className={`navBtn subNavBtn ${isActive('/schedule') ? 'active' : ''}`}
                          onClick={() => navigate('/schedule')}
                        >
                          <IoCalendarOutline size={14} />
                          <span>Schedule</span>
                        </button>
                        <button 
                          className={`navBtn subNavBtn ${isActive('/availSettings') ? 'active' : ''}`}
                          onClick={() => navigate('/availSettings')}
                        >
                          <IoTodayOutline size={14} />
                          <span>Availability Settings</span>
                        </button>
                        <button 
                          className={`navBtn subNavBtn ${isActive('/history') ? 'active' : ''}`}
                          onClick={() => navigate('/history')}
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
                          className={`navBtn subNavBtn ${isActive('/manage-inventory') ? 'active' : ''}`}
                          onClick={() => navigate('/inventory')}
                        >
                          <CiBoxes size={14} />
                          <span>Item Catalog</span>
                        </button>
                        <button 
                          className={`navBtn subNavBtn ${isActive('/inventory-logs') ? 'active' : ''}`}
                          onClick={() => navigate('/inventory-logs')}
                        >
                          <TbArrowsUpDown size={16} />
                          <span>Movement Logs</span>
                        </button>
                        <button 
                          className={`navBtn subNavBtn ${isActive('/inventory-in') ? 'active' : ''}`}
                          onClick={() => navigate('/inventory-in')}
                        >
                          <IoArrowDownOutline size={16} />
                          <span>Inventory IN</span>
                        </button>
                        <button 
                          className={`navBtn subNavBtn ${isActive('/inventory-out') ? 'active' : ''}`}
                          onClick={() => navigate('/inventory-out')}
                        >
                          <IoArrowUpOutline size={16} />
                          <span>Inventory OUT</span>
                        </button>
                        <button 
                          className={`navBtn subNavBtn ${isActive('/inventory-archive') ? 'active' : ''}`}
                          onClick={() => navigate('/inventory-archive')}
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
                          navigate('/inventory');
                          setShowInventoryDropdown(false);
                        }}>
                          <CiBoxes size={16} />
                          <span>Item Catalog</span>
                        </button>
                        <button className="collapsedDropdownItem" onClick={() => {
                          navigate('/inventory-logs');
                          setShowInventoryDropdown(false);
                        }}>
                          <TbArrowsUpDown size={16} />
                          <span>Movement Logs</span>
                        </button>
                        <button className="collapsedDropdownItem" onClick={() => {
                          navigate('/inventory-in');
                          setShowInventoryDropdown(false);
                        }}>
                          <IoArrowDownOutline size={16} />
                          <span>Inventory IN</span>
                        </button>
                        <button className="collapsedDropdownItem" onClick={() => {
                          navigate('/inventory-out');
                          setShowInventoryDropdown(false);
                        }}>
                          <IoArrowUpOutline size={16} />
                          <span>Inventory OUT</span>
                        </button>
                        <button className="collapsedDropdownItem" onClick={() => {
                          navigate('/inventory-archive');
                          setShowInventoryDropdown(false);
                        }}>
                          <IoIosArchive size={16} />
                          <span>Archived Items</span>
                        </button>
                      </div>
                    )}
                  </>
                )}
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