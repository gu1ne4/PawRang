import React, { useState, useEffect } from 'react'; 
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../reusable_components/NavBar';

// Web icons equivalent to Ionicons
import { 
  IoHomeOutline, IoPeopleOutline, IoChevronDownOutline, IoChevronUpOutline,
  IoPersonOutline, IoMedkitOutline, IoCalendarClearOutline, IoCalendarOutline,
  IoTodayOutline, IoTimeOutline, IoDocumentTextOutline, IoSettingsOutline,
  IoLogOutOutline, IoNotifications, IoCheckmarkCircleOutline, IoCloseCircleOutline,
  IoAlertCircleOutline
} from 'react-icons/io5';

// Import your converted CSS file
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

export default function AdminDashboardPage() {
    // React Router Dom hooks for web navigation
    const navigate = useNavigate(); 
    const location = useLocation();
    
    // Check if the current path matches the home route
    const isActive = location.pathname === '/Home' || location.pathname === '/'; 

    const API_URL = 'http://localhost:5000'; // Platform check removed, assuming web

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

    // 3. UPDATED LOGOUT 
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

        // Web uses localStorage instead of AsyncStorage (synchronous)
        localStorage.removeItem('userSession'); 
        setCurrentUser(null);
        navigate('/Login'); 
      }, true); 
    };

    useEffect(() => {
      // Web local storage is synchronous, no need for async/await here
      try {
        const session = localStorage.getItem('userSession');
        if (session) {
          setCurrentUser(JSON.parse(session));
        }
      } catch (error) {
        console.error("Failed to load user session", error);
      }
    }, []);

  return (
    <div className="biContainer">
      <Navbar currentUser={currentUser} onLogout={handleLogoutPress} />

      <div className="bodyContainer">
        <div className="topContainer">
          <div className="subTopContainer">
            <IoHomeOutline size={20} color="#3d67ee" style={{ marginTop: '2px' }} />
            <span className="blueText" style={{ marginLeft: '10px' }}>Home</span>
          </div>
          <div className="subTopContainer" style={{ justifyContent: 'center', flex: 0.5, marginLeft: '12px' }}>
            <div style={{ cursor: 'pointer' }}>
              <IoNotifications size={21} color="#3d67ee" style={{ marginTop: '3px' }} />
            </div>
          </div>
        </div>

        {/* TABLE CONTAINER */}
        <div className="tableContainer">
          
        </div>
      </div>

      {/* 4. CUSTOM ALERT MODAL COMPONENT (Web implementation) */}
      {modalVisible && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white', padding: '25px', borderRadius: '12px', 
            width: '80%', maxWidth: '350px', display: 'flex', flexDirection: 'column', 
            alignItems: 'center', boxShadow: '0px 5px 15px rgba(0,0,0,0.3)'
          }}>
            {modalConfig.type === 'success' ? (
              <IoCheckmarkCircleOutline size={55} color="#2e9e0c" />
            ) : modalConfig.type === 'error' ? (
              <IoCloseCircleOutline size={55} color="#d93025" />
            ) : (
              <IoAlertCircleOutline size={55} color="#3d67ee" />
            )}
            
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: '10px 0', fontFamily: '"Segoe UI", sans-serif', color: 'black' }}>
              {modalConfig.title}
            </h2>
            
            {typeof modalConfig.message === 'string' ? (
              <p style={{ textAlign: 'center', color: '#666', marginBottom: '25px', fontSize: '14px' }}>
                {modalConfig.message}
              </p>
            ) : (
              <div style={{ marginBottom: '25px' }}>
                {modalConfig.message}
              </div>
            )}
            
            <div style={{ display: 'flex', flexDirection: 'row', gap: '15px', width: '100%', justifyContent: 'center' }}>
              {modalConfig.showCancel && (
                <button 
                  onClick={() => setModalVisible(false)} 
                  style={{
                    padding: '10px 20px', backgroundColor: '#f0f0f0', border: 'none', 
                    borderRadius: '8px', minWidth: '100px', cursor: 'pointer',
                    color: '#333', fontWeight: '600'
                  }}
                >
                  Cancel
                </button>
              )}
              
              <button 
                onClick={() => {
                  setModalVisible(false);
                  if (modalConfig.onConfirm) modalConfig.onConfirm();
                }} 
                style={{
                  padding: '10px 20px', 
                  backgroundColor: modalConfig.type === 'error' ? '#d93025' : '#3d67ee', 
                  border: 'none', borderRadius: '8px', minWidth: '100px', cursor: 'pointer',
                  color: 'white', fontWeight: '600'
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
