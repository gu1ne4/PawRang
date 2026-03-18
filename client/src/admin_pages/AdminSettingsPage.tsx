import React, { useState, useEffect } from 'react'; 
import { useNavigate, useLocation } from 'react-router-dom';

// Web icons equivalent to Ionicons
import { 
  IoHomeOutline, IoPeopleOutline, IoChevronDownOutline, IoChevronUpOutline,
  IoPersonOutline, IoMedkitOutline, IoCalendarClearOutline, IoCalendarOutline,
  IoTodayOutline, IoTimeOutline, IoDocumentTextOutline, IoSettingsOutline,
  IoLogOutOutline, IoNotifications, IoCheckmarkCircleOutline, IoCloseCircleOutline,
  IoAlertCircleOutline
} from 'react-icons/io5';

// Import your merged CSS file
import './AdminStyles.css';

// Using standard imports for Vite images
import logoImg from '../assets/AgsikapLogo-Temp.png';
import defaultUserImg from '../assets/userImg.jpg';

// --- TYPESCRIPT INTERFACES ---
interface CurrentUser {
  id?: string | number;
  pk?: string | number;
  username?: string;
  fullName?: string;
  role?: string;
  userImage?: string;
}

interface ModalConfigType {
  type: 'info' | 'success' | 'error' | 'confirm';
  title: string;
  message: string | React.ReactNode;
  onConfirm: (() => void) | null;
  showCancel: boolean;
}

export default function AdminSettingsPage() {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Highlighting the correct Sidebar Item
    const isActive = location.pathname === '/Settings';

    const API_URL = 'http://localhost:5000'; // Platform check removed for web

    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
    const [showAccountDropdown, setShowAccountDropdown] = useState<boolean>(false);
    const [showAppointmentsDropdown, setShowAppointmentsDropdown] = useState<boolean>(false);

    // 1. MODAL STATE FOR CUSTOM ALERT
    const [modalVisible, setModalVisible] = useState<boolean>(false);
    const [modalConfig, setModalConfig] = useState<ModalConfigType>({
      type: 'info', 
      title: '',
      message: '', 
      onConfirm: null, 
      showCancel: false 
    });

    // 2. SHOW ALERT HELPER
    const showAlert = (
        type: 'info' | 'success' | 'error' | 'confirm', 
        title: string, 
        message: string | React.ReactNode, 
        onConfirm: (() => void) | null = null, 
        showCancel: boolean = false
    ) => {
      setModalConfig({ type, title, message, onConfirm, showCancel });
      setModalVisible(true);
    };

    // 3. UPDATED LOGOUT TO USE POPUP & AUDIT LOG
    const handleLogoutPress = () => {
      showAlert('confirm', 'Log Out', 'Are you sure you want to log out?', async () => {
        try {
          if (currentUser) {
            console.log("Sending logout audit for:", currentUser.username);
            await fetch(`${API_URL}/logout`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: currentUser.id || currentUser.pk, 
                userType: 'EMPLOYEE', 
                username: currentUser.username || currentUser.fullName,
                role: currentUser.role
              })
            });
          }
        } catch (error) {
          console.error("Logout audit failed:", error);
        }

        // Explicitly clear session and state
        localStorage.removeItem('userSession'); 
        setCurrentUser(null);
        navigate('/Login'); 
      }, true); 
    };

    // Load the session data when the page opens
    useEffect(() => {
      const loadUser = () => {
        try {
          const session = localStorage.getItem('userSession');
          if (session) {
            setCurrentUser(JSON.parse(session));
          }
        } catch (error) {
          console.error("Failed to load user session", error);
        }
      };
      loadUser();
    }, []);

  return (
    <div className="biContainer">
      
      {/* NAVBAR */}
      <div className="navbarContainer">
        <div className="navBody" style={{ background: 'linear-gradient(135deg, #3db6ee, #3d67ee, #0738D9, #0f3bca)' }}>
          
          {/* LOGO AND BRAND NAME */}
          <div className="navTitle" style={{ gap: '10px' }}>
            <img src={logoImg} style={{ width: '25px', height: '25px', marginTop: '1px', objectFit: 'contain' }} alt="Logo" />
            <span className="brandFont">Agsikap</span>
          </div>

          <div className="glassContainer" style={{ paddingLeft: '8px' }}>
            <div className="navAccount" style={{ gap: '8px' }}>
              <img 
                src={(currentUser && currentUser.userImage) ? currentUser.userImage : defaultUserImg} 
                style={{ width: '35px', height: '35px', borderRadius: '25px', marginTop: '2px', objectFit: 'cover' }}
                alt="Profile"
              />
              <div>
                <div style={{ color: '#fff', fontSize: '13px', fontWeight: '600' }}>
                  {currentUser ? currentUser.username : "Loading..."}
                </div>
                <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '10px' }}>
                  {currentUser ? currentUser.role : "..."}
                </div>
              </div>
            </div>
          </div>

          <span style={{ color: 'rgba(255, 255, 255, 0.83)', fontSize: '11px', fontStyle: 'italic', marginLeft: '5px', marginTop: '20px', display: 'block' }}>Overview</span>

          {/* NAVIGATION MENU */}
          <div className="glassContainer scrollable-nav">
            <div style={{ marginTop: '8px' }}>
              <button className="navBtn" onClick={() => navigate('/Home')}>
                <IoHomeOutline size={15} color="#fffefe" style={{ marginTop: '2px' }}/>
                <span className="navFont" style={{ fontWeight: '400' }}>Home</span>
              </button>
            </div>

            <div>
              <button className="navBtn" onClick={() => setShowAccountDropdown(!showAccountDropdown)}>
                <IoPeopleOutline size={15} color="#fffefe" style={{ marginTop: '2px' }}/>
                <span className="navFont" style={{ fontWeight: '400' }}>Account Overview</span>
                {showAccountDropdown ? 
                  <IoChevronUpOutline size={14} color="#fffefe" style={{ marginLeft: '5px', marginTop: '2px' }} /> : 
                  <IoChevronDownOutline size={14} color="#fffefe" style={{ marginLeft: '5px', marginTop: '2px' }} />
                }
              </button>

                {showAccountDropdown && (
                <div style={{ marginLeft: '25px', marginTop: '5px' }}>
                    <div>
                    <button className="navBtn" onClick={() => navigate('/Accounts')}>
                        <IoPersonOutline size={14} color="#fffefe" style={{ marginTop: '2px' }}/>
                        <span className="navFont" style={{ fontWeight: '400', fontSize: '12px' }}>Employees</span>
                    </button>
                    </div>

                    <div>
                    <button className="navBtn" onClick={() => navigate('/UserAccounts')}>
                        <IoMedkitOutline size={14} color="#fffefe" style={{ marginTop: '2px' }}/>
                        <span className="navFont" style={{ fontWeight: '400', fontSize: '12px' }}>Users / Patients</span>
                    </button>
                    </div>
                </div>
                )}
            </div>

            <div>
              <button className="navBtn" onClick={() => setShowAppointmentsDropdown(!showAppointmentsDropdown)}>
                <IoCalendarClearOutline size={15} color="#fffefe" style={{ marginTop: '2px' }}/>
                <span className="navFont" style={{ fontWeight: '400' }}>Appointments</span>
                {showAppointmentsDropdown ? 
                  <IoChevronUpOutline size={14} color="#fffefe" style={{ marginLeft: '5px', marginTop: '2px' }} /> : 
                  <IoChevronDownOutline size={14} color="#fffefe" style={{ marginLeft: '5px', marginTop: '2px' }} />
                }
              </button>

                {showAppointmentsDropdown && (
                <div style={{ marginLeft: '25px', marginTop: '5px' }}>
                    <div>
                    <button className="navBtn" onClick={() => navigate('/Schedule')}>
                        <IoCalendarOutline size={14} color="#fffefe" style={{ marginTop: '2px' }}/>
                        <span className="navFont" style={{ fontWeight: '400', fontSize: '12px' }}>Schedule</span>
                    </button>
                    </div>

                    <div>
                    <button className="navBtn" onClick={() => navigate('/AvailSettings')}>
                        <IoTodayOutline size={14} color="#fffefe" style={{ marginTop: '2px' }}/>
                        <span className="navFont" style={{ fontWeight: '400', fontSize: '12px' }}>Availability Settings</span>
                    </button>
                    </div>

                    <div>
                    <button className="navBtn" onClick={() => navigate('/History')}>
                        <IoTimeOutline size={14} color="#fffefe" style={{ marginTop: '2px' }}/>
                        <span className="navFont" style={{ fontWeight: '400', fontSize: '12px' }}>History</span>
                    </button>
                    </div>
                </div>
                )}
            </div>

            <div>
              <button className="navBtn" onClick={() => navigate('/Audit')}>
                <IoDocumentTextOutline size={15} color="#fffefe" style={{ marginTop: '2px' }}/>
                <span className="navFont" style={{ fontWeight: '400' }}>System Audit</span>
              </button>
            </div>

            <div className={isActive ? "selectedGlass" : ""}> 
              <button className="navBtn" onClick={() => navigate('/Settings')}>
                <IoSettingsOutline size={15} color="#fffefe" style={{ marginTop: '2px' }}/>
                <span className="navFont" style={{ fontWeight: '400' }}>Settings</span>
              </button>
            </div>

          </div>

          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', paddingBottom: '10px' }}>
            <div className="glassContainer" style={{ paddingTop: '12px', paddingBottom: '12px' }}>
              <button className="navBtn" onClick={handleLogoutPress} style={{ marginBottom: 0 }}>
                <IoLogOutOutline size={15} color="#fffefe" style={{ marginTop: '2px' }}/>
                <span className="navFont" style={{ fontWeight: '400' }}>Log Out</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      <div className="bodyContainer">
        <div className="topContainer">
            <div className="subTopContainer">
            <IoSettingsOutline size={20} color="#3d67ee" style={{ marginTop: '2px' }} />
            <span className="blueText" style={{ marginLeft: '10px' }}>Settings</span>
          </div>
          <div className="subTopContainer" style={{ justifyContent: 'center', flex: 0.5, marginLeft: '12px' }}>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <IoNotifications size={21} color="#3d67ee" style={{ marginTop: '3px' }} />
            </button>
          </div>
        </div>

        <div className="tableContainer">
          
          {/* Main settings content will go here */}

        </div>
      </div>

      {/* 4. CUSTOM ALERT MODAL COMPONENT */}
      {modalVisible && (
        <div className="modalOverlay">
          <div className="alertModal">
            <div className="alertIcon">
              {modalConfig.type === 'success' ? <IoCheckmarkCircleOutline size={55} color="#2e9e0c" /> : 
               modalConfig.type === 'error' ? <IoCloseCircleOutline size={55} color="#d93025" /> : 
               <IoAlertCircleOutline size={55} color="#3d67ee" />}
            </div>
            
            <h3 className="alertTitle">{modalConfig.title}</h3>
            
            {typeof modalConfig.message === 'string' ? (
              <p className="alertMessage">{modalConfig.message}</p>
            ) : (
              <div style={{ marginBottom: '25px' }}>{modalConfig.message}</div>
            )}
            
            <div className="alertActions">
              {modalConfig.showCancel && (
                <button className="alertBtn cancelAlertBtn" onClick={() => setModalVisible(false)}>
                  Cancel
                </button>
              )}
              
              <button 
                className={`alertBtn ${modalConfig.type === 'error' ? 'errorBtn' : 'confirmAlertBtn'}`}
                onClick={() => {
                  setModalVisible(false);
                  if (modalConfig.onConfirm) modalConfig.onConfirm();
                }} 
              >
                {modalConfig.type === 'confirm' ? 'Confirm' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}