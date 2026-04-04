import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../admin_pages/AdminStyles.css';
import { PiUsersThree } from "react-icons/pi";
import { TbPresentationAnalytics } from "react-icons/tb";

// Icons - copy all the icons you need from your original file
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
  IoDocumentTextOutline as IoDocumentText,  // For Patient Records
  IoLayersOutline,  // For Inventory
  IoFileTrayFullOutline
} from 'react-icons/io5';

// Define the props that the Navbar will receive
interface NavbarProps {
  currentUser: {
    id?: string | number;
    pk?: string | number;
    username?: string;
    fullName?: string;
    role?: string;
    userImage?: string;
  } | null;
  onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentUser, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string): boolean => location.pathname === path;
  const isAppointmentsSection = ['/admin/schedule', '/admin/availability', '/admin/history'].includes(location.pathname);
  const isAccountsSection = ['/admin/home', '/admin/users'].includes(location.pathname);
  const inventoryPaths = ['/inventory', '/inventory-in', '/inventory-out', '/inventory-logs', '/inventory-archive'];
  const isInventorySection = inventoryPaths.includes(location.pathname);
  
  const [showAccountDropdown, setShowAccountDropdown] = useState<boolean>(isAccountsSection);
  const [showAppointmentsDropdown, setShowAppointmentsDropdown] = useState<boolean>(isAppointmentsSection);
  const [showInventoryDropdown, setShowInventoryDropdown] = useState<boolean>(isInventorySection);

  return (
    <div className="navbarContainer">
      <div className="navBody navGradient">
        <div className="navTitle">
          <img 
            src="/src/assets/AgsikapLogo-Temp.png"
            alt="PawRang Logo"
            className="navLogo"
          />
          <span className="brandFont">PawRang</span>
        </div>

        {/* Account Logged In */}
        <div className="glassContainer navAccountContainer">
          <div className="navAccount">
            <img 
              src={(currentUser && currentUser.userImage) ? currentUser.userImage : "/src/assets/userAvatar.jpg"} 
              alt="User"
              className="navAvatar"
            />
            <div style={{lineHeight: '20px'}}>
              <div className="navUserName">{currentUser ? currentUser.username : "Username Here"}</div>
              <div className="navUserRole">{currentUser ? currentUser.role : "User Role Here"}</div>
            </div>
          </div>
        </div>

        <div className="navOverview">Overview</div>

        {/* This glassContainer now has a scrollable-nav class */}
        <div className="glassContainer scrollable-nav">
          <div className="navMenu">
            <div className="navMenuSection" style={{marginTop: '10px'}}>
              <button 
                className={`navBtn ${isActive('/admin/home') ? 'active' : ''}`} 
                onClick={() => navigate('/admin/home')}
              >
                <IoHomeOutline size={15} />
                <span>Home</span>
              </button>
            </div>

            <div className="navMenuSection">
              <button 
                className={`navBtn ${isActive('/admin/dashboard') ? 'active' : ''}`} 
                onClick={() => navigate('/admin/dashboard')}
              >
                <TbPresentationAnalytics size={15} />
                <span>Analytics</span>
              </button>
            </div>

            <div className="navMenuSection">
              <div className={isAccountsSection ? 'selectedGlass' : ''}>
                <button className="navBtn" onClick={() => setShowAccountDropdown(!showAccountDropdown)}>
                  <IoPeopleOutline size={15} />
                  <span>Account Overview</span>
                  {showAccountDropdown ? <IoChevronUpOutline size={14} /> : <IoChevronDownOutline size={14} />}
                </button>
              </div>

              {showAccountDropdown && (
                <div className="navSubMenu">
                  <div className={isActive('/admin/home') ? 'subSelectedGlass' : ''}>
                    <button className="navBtn subNavBtn" onClick={() => navigate('/admin/home')}>
                      <IoPersonOutline size={14} />
                      <span>Employees</span>
                    </button>
                  </div>
                  <div className={isActive('/admin/users') ? 'subSelectedGlass' : ''}>
                    <button className="navBtn subNavBtn" onClick={() => navigate('/admin/users')}>
                      <PiUsersThree size={18} />
                      <span>Users</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="navMenuSection">
              <div className={isAppointmentsSection ? 'selectedGlass' : ''}>
                <button className="navBtn" onClick={() => setShowAppointmentsDropdown(!showAppointmentsDropdown)}>
                  <IoCalendarClearOutline size={15} />
                  <span>Appointments</span>
                  {showAppointmentsDropdown ? <IoChevronUpOutline size={14} /> : <IoChevronDownOutline size={14} />}
                </button>
              </div>

              {showAppointmentsDropdown && (
                <div className="navSubMenu">
                  <div className={isActive('/admin/schedule') ? 'subSelectedGlass' : ''}>
                    <button className="navBtn subNavBtn" onClick={() => navigate('/admin/schedule')}>
                      <IoCalendarOutline size={14} />
                      <span>Schedule</span>
                    </button>
                  </div>
                  <div className={isActive('/admin/availability') ? 'subSelectedGlass' : ''}>
                    <button className="navBtn subNavBtn" onClick={() => navigate('/admin/availability')}>
                      <IoTodayOutline size={14} />
                      <span>Availability Settings</span>
                    </button>
                  </div>
                  <div className={isActive('/admin/history') ? 'subSelectedGlass' : ''}>
                    <button className="navBtn subNavBtn" onClick={() => navigate('/admin/history')}>
                      <IoTimeOutline size={14} />
                      <span>History</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Patient Records - New Section */}
            <div className="navMenuSection">
              <button 
                className={`navBtn ${isActive('/patient-records') ? 'active' : ''}`}
                onClick={() => navigate('/patient-records')}
              >
                <IoDocumentText size={15} />
                <span>Patient Records</span>
              </button>
            </div>

            {/* Inventory - New Section */}
            <div className="navMenuSection">
              <div className={isInventorySection ? 'selectedGlass' : ''}>
                <button className="navBtn" onClick={() => setShowInventoryDropdown(!showInventoryDropdown)}>
                  <IoLayersOutline size={15} />
                  <span>Inventory</span>
                  {showInventoryDropdown ? <IoChevronUpOutline size={14} /> : <IoChevronDownOutline size={14} />}
                </button>
              </div>

              {showInventoryDropdown && (
                <div className="navSubMenu">
                  <div className={isActive('/inventory') ? 'subSelectedGlass' : ''}>
                    <button className="navBtn subNavBtn" onClick={() => navigate('/inventory')}>
                      <IoLayersOutline size={14} />
                      <span>Overview</span>
                    </button>
                  </div>
                  <div className={isActive('/inventory-in') ? 'subSelectedGlass' : ''}>
                    <button className="navBtn subNavBtn" onClick={() => navigate('/inventory-in')}>
                      <IoLayersOutline size={14} />
                      <span>Stock In</span>
                    </button>
                  </div>
                  <div className={isActive('/inventory-out') ? 'subSelectedGlass' : ''}>
                    <button className="navBtn subNavBtn" onClick={() => navigate('/inventory-out')}>
                      <IoLayersOutline size={14} />
                      <span>Stock Out</span>
                    </button>
                  </div>
                  <div className={isActive('/inventory-logs') ? 'subSelectedGlass' : ''}>
                    <button className="navBtn subNavBtn" onClick={() => navigate('/inventory-logs')}>
                      <IoLayersOutline size={14} />
                      <span>Logs</span>
                    </button>
                  </div>
                  <div className={isActive('/inventory-archive') ? 'subSelectedGlass' : ''}>
                    <button className="navBtn subNavBtn" onClick={() => navigate('/inventory-archive')}>
                      <IoLayersOutline size={14} />
                      <span>Archive</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="navMenuSection">
              <button 
                className={`navBtn ${isActive('/admin/audit') ? 'active' : ''}`} 
                onClick={() => navigate('/admin/audit')}
              >
                <IoFileTrayFullOutline size={15} />
                <span>System Audit</span>
              </button>
            </div>

            <div className="navMenuSection">
              <button 
                className={`navBtn ${isActive('/admin/settings') ? 'active' : ''}`} 
                onClick={() => navigate('/admin/settings')}
              >
                <IoSettingsOutline size={15} />
                <span>Settings</span>
              </button>
            </div>
          </div>
        </div>

        <div className="navFooter">
          <div className="glassContainer" style={{paddingBottom: '1px', marginTop: '20px'}}>
            <button className="navBtn" style={{paddingTop: '1px', paddingBottom: '1px'}} onClick={onLogout}>
              <IoLogOutOutline size={15} />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
