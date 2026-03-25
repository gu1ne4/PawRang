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
  IoDocumentTextOutline as IoDocumentText, 
  IoLayersOutline,  
  IoFileTrayFullOutline
} from 'react-icons/io5';

// Define the props that the Navbar will receive
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

  const isActive = (path: string): boolean => {
    return location.pathname === path;
  };
  
  const [showAccountDropdown, setShowAccountDropdown] = useState<boolean>(false);
  const [showAppointmentsDropdown, setShowAppointmentsDropdown] = useState<boolean>(false);

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
        <div className="navGlassContainer navAccountContainer">
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

        <div className="navGlassContainer scrollable-nav">
          <div className="navMenu">
            <div className="navMenuSection" style={{marginTop: '10px'}}>
              <button 
                className={`navBtn ${isActive('/home') ? 'active' : ''}`} 
                onClick={() => navigate('/home')}
              >
                <IoHomeOutline size={15} />
                <span>Home</span>
              </button>
            </div>

            <div className="navMenuSection">
              <button 
                className={`navBtn ${isActive('/analytics') ? 'active' : ''}`} 
                onClick={() => navigate('/analytics')}
              >
                <TbPresentationAnalytics size={15} />
                <span>Analytics</span>
              </button>
            </div>

            <div className="navMenuSection">
              <div className={isActive('/accounts') || isActive('/useraccounts') ? 'selectedGlass' : ''}>
                <button className="navBtn" onClick={() => setShowAccountDropdown(!showAccountDropdown)}>
                  <IoPeopleOutline size={15} />
                  <span>Account Overview</span>
                  {showAccountDropdown ? <IoChevronUpOutline size={14} /> : <IoChevronDownOutline size={14} />}
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
                      <PiUsersThree size={18} />
                      <span>Users</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="navMenuSection">
              <div className={
                isActive('/schedule') || isActive('/availSettings') || isActive('/history') 
                  ? 'selectedGlass' 
                  : ''
              }>
                <button className="navBtn" onClick={() => setShowAppointmentsDropdown(!showAppointmentsDropdown)}>
                  <IoCalendarClearOutline size={15} />
                  <span>Appointments</span>
                  {showAppointmentsDropdown ? <IoChevronUpOutline size={14} /> : <IoChevronDownOutline size={14} />}
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
              <button 
                className={`navBtn ${isActive('/inventory') ? 'active' : ''}`} 
                onClick={() => navigate('/inventory')}
              >
                <IoLayersOutline size={15} />
                <span>Inventory</span>
              </button>
            </div>

            <div className="navMenuSection">
              <button 
                className={`navBtn ${isActive('/audit') ? 'active' : ''}`} 
                onClick={() => navigate('/audit')}
              >
                <IoFileTrayFullOutline size={15} />
                <span>System Audit</span>
              </button>
            </div>

            <div className="navMenuSection">
              <button 
                className={`navBtn ${isActive('/settings') ? 'active' : ''}`} 
                onClick={() => navigate('/settings')}
              >
                <IoSettingsOutline size={15} />
                <span>Settings</span>
              </button>
            </div>
          </div>
        </div>

        <div className="navFooter">
          <div className="navGlassContainer" style={{paddingBottom: '1px', marginTop: '20px'}}>
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