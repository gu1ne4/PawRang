import React, { useState, useEffect } from 'react'; 
import { useNavigate, useLocation } from 'react-router-dom';

// 🟢 Reusable Navbar
import Navbar from '../reusable_components/NavBar'; 

// Web icons 
import { 
  IoHomeOutline, IoNotifications, IoCheckmarkCircleOutline, 
  IoCloseCircleOutline, IoAlertCircleOutline
} from 'react-icons/io5';

// Import your converted CSS file
import './AdminStyles.css';
import Notifications from '../reusable_components/Notifications';

// --- TYPESCRIPT INTERFACES ---
interface CurrentUser {
id?: string | number;
  pk?: string | number;
  username: string;    
  fullName?: string;
  role: string;          
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
    const navigate = useNavigate(); 
    const location = useLocation();
    const API_URL = 'http://localhost:5000'; 

    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

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

        localStorage.removeItem('userSession'); 
        setCurrentUser(null);
        navigate('/Login'); 
      }, true); 
    };

    useEffect(() => {
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

      {/* 🟢 REUSABLE NAVBAR INSERTED HERE */}
      <Navbar currentUser={currentUser} onLogout={handleLogoutPress} />

      {/* BODY */}
      <div className="bodyContainer">
        <div className="topContainer">
          <div className="subTopContainer">
            <IoHomeOutline size={20} color="#3d67ee" style={{ marginTop: '2px' }} />
            <span className="blueText" style={{ marginLeft: '10px' }}>Home</span>
          </div>
          <div className="invSubTopContainer invNotificationContainer" style={{padding: 20}}>
            <Notifications 
              buttonClassName="invIconButton"
              iconClassName="invBlueIcon"
              onViewAll={() => {
                // Handle view all notifications
                console.log('View all notifications');
              }}
              onNotificationClick={(notification) => {
                // Handle individual notification click
                if (notification.link) {
                  navigate(notification.link);
                }
              }}
            />
          </div>
        </div>

        {/* TABLE CONTAINER */}
        <div className="tableContainer">
          {/* Add your Dashboard Widgets, Charts, or Tables here in the future! */}
        </div>
      </div>

      {/* 4. UNIFIED CUSTOM ALERT MODAL */}
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