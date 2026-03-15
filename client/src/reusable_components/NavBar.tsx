import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../admin_pages/AdminStyles.css';

// Icons - copy all the icons you need from your original file
import { 
  IoHomeOutline, 
  IoPeopleOutline, 
  IoPersonOutline, 
  IoMedkitOutline,
  IoCalendarClearOutline,
  IoCalendarOutline,
  IoTodayOutline,
  IoTimeOutline,
  IoDocumentTextOutline,
  IoSettingsOutline,
  IoLogOutOutline,
  IoChevronUpOutline,
  IoChevronDownOutline
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

  const isActive = location.pathname === '/accounts';
  
  const [showAccountDropdown, setShowAccountDropdown] = useState<boolean>(false);
  const [showAppointmentsDropdown, setShowAppointmentsDropdown] = useState<boolean>(false);

  return (
    <div className="navbarContainer">
      <div className="navBody navGradient">
        <div className="navTitle">
          <img 
            src="../assets/AgsikapLogo-Temp.png" 
            alt="Agsikap Logo"
            className="navLogo"
          />
          <span className="brandFont">Agsikap</span>
        </div>

        {/* Account Logged In */}
        <div className="glassContainer navAccountContainer">
          <div className="navAccount">
            <img 
              src={(currentUser && currentUser.userImage) ? currentUser.userImage : '../assets/userImg.jpg'} 
              alt="User"
              className="navAvatar"
            />
            <div>
              <div className="navUserName">{currentUser ? currentUser.username : "Loading..."}</div>
              <div className="navUserRole">{currentUser ? currentUser.role : "..."}</div>
            </div>
          </div>
        </div>

        <div className="navOverview">Overview</div>

        <div className="glassContainer navMenu">
          <div className="navMenuSection">
            <button className="navBtn" onClick={() => navigate('/home')}>
              <IoHomeOutline size={15} />
              <span>Home</span>
            </button>
          </div>

          <div className="navMenuSection">
            <div className={isActive ? 'selectedGlass' : ''}>
              <button className="navBtn" onClick={() => setShowAccountDropdown(!showAccountDropdown)}>
                <IoPeopleOutline size={15} />
                <span>Account Overview</span>
                {showAccountDropdown ? <IoChevronUpOutline size={14} /> : <IoChevronDownOutline size={14} />}
              </button>
            </div>

            {showAccountDropdown && (
              <div className="navSubMenu">
                <div className={isActive ? 'subSelectedGlass' : ''}>
                  <button className="navBtn subNavBtn" onClick={() => navigate('/accounts')}>
                    <IoPersonOutline size={14} />
                    <span>Employees</span>
                  </button>
                </div>
                <button className="navBtn subNavBtn" onClick={() => navigate('/useraccounts')}>
                  <IoMedkitOutline size={14} />
                  <span>Users / Patients</span>
                </button>
              </div>
            )}
          </div>

          <div className="navMenuSection">
            <button className="navBtn" onClick={() => setShowAppointmentsDropdown(!showAppointmentsDropdown)}>
              <IoCalendarClearOutline size={15} />
              <span>Appointments</span>
              {showAppointmentsDropdown ? <IoChevronUpOutline size={14} /> : <IoChevronDownOutline size={14} />}
            </button>

            {showAppointmentsDropdown && (
              <div className="navSubMenu">
                <button className="navBtn subNavBtn" onClick={() => navigate('/schedule')}>
                  <IoCalendarOutline size={14} />
                  <span>Schedule</span>
                </button>
                <button className="navBtn subNavBtn" onClick={() => navigate('/availSettings')}>
                  <IoTodayOutline size={14} />
                  <span>Availability Settings</span>
                </button>
                <button className="navBtn subNavBtn" onClick={() => navigate('/history')}>
                  <IoTimeOutline size={14} />
                  <span>History</span>
                </button>
              </div>
            )}
          </div>

          <div className="navMenuSection">
            <button className="navBtn" onClick={() => navigate('/audit')}>
              <IoDocumentTextOutline size={15} />
              <span>System Audit</span>
            </button>
          </div>

          <div className="navMenuSection">
            <button className="navBtn" onClick={() => navigate('/settings')}>
              <IoSettingsOutline size={15} />
              <span>Settings</span>
            </button>
          </div>
        </div>

        <div className="navFooter">
          <div className="glassContainer">
            <button className="navBtn" onClick={onLogout}>
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