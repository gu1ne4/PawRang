import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Web icons equivalent to Ionicons
import { 
  IoHomeOutline, IoPeopleOutline, IoChevronDownOutline, IoChevronUpOutline,
  IoPersonOutline, IoMedkitOutline, IoCalendarClearOutline, IoCalendarOutline,
  IoTodayOutline, IoTimeOutline, IoDocumentTextOutline, IoSettingsOutline,
  IoLogOutOutline, IoNotifications, IoCheckmarkCircleOutline, IoCloseCircleOutline,
  IoAlertCircleOutline, IoSearchSharp, IoFilterSharp, IoRefresh
} from 'react-icons/io5';

// Import your merged CSS file
import './AdminStyles.css';
import Navbar from '../reusable_components/NavBar';

// Using standard imports for Vite images
import logoImg from '../assets/AgsikapLogo-Temp.png';
import defaultUserImg from '../assets/userImg.jpg';
import { availabilityService } from './availabilityService';

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

export default function AdminHistory() {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = location.pathname === '/History';

  const API_URL = 'http://localhost:5000';

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [showAppointmentsDropdown, setShowAppointmentsDropdown] = useState(true); // Default open for this section
  
  const [searchVisible, setSearchVisible] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [searchHovered, setSearchHovered] = useState(false);
  const [filterHovered, setFilterHovered] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [historyAppointments, setHistoryAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // LOGOUT POPUP STATE
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState<ModalConfigType>({ type: 'info', title: '', message: '', onConfirm: null, showCancel: false });

  const showAlert = (type: 'info' | 'success' | 'error' | 'confirm', title: string, message: string | React.ReactNode, onConfirm: (() => void) | null = null, showCancel = false) => {
    setModalConfig({ type, title, message, onConfirm, showCancel });
    setLogoutModalVisible(true);
  };

  const handleLogoutPress = () => {
    showAlert('confirm', 'Log Out', 'Are you sure you want to log out?', async () => {
      try {
        if (currentUser) {
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
      } catch (error) { console.error("Logout audit failed:", error); }

      localStorage.removeItem('userSession'); 
      setCurrentUser(null);
      navigate('/Login'); 
    }, true); 
  };

  useEffect(() => {
    const loadUser = () => {
      try {
        const session = localStorage.getItem('userSession');
        if (session) setCurrentUser(JSON.parse(session));
        else setCurrentUser(null);
      } catch (error) { console.error("Failed to load user session", error); }
    };
    loadUser();
  }, []);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const appointments = await availabilityService.getAppointmentHistory();
      setHistoryAppointments(appointments);
    } catch (error) {
      console.error('Error loading history:', error);
      window.alert('Error: Failed to load appointment history');
    } finally {
      setLoading(false);
    }
  };

  // Filter appointments
  const filteredAppointments = historyAppointments.filter(app => {
    if (searchQuery && !app.name?.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !app.pet_name?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (statusFilter !== 'all' && app.status !== statusFilter) return false;
    if (serviceFilter !== 'all' && app.service !== serviceFilter) return false;
    return true;
  });

  return (
    <div className="biContainer">
      <Navbar currentUser={currentUser} onLogout={handleLogoutPress} />

      {/* BODY CONTENT */}
      <div className="bodyContainer">
        <div className="topContainer">
          <div className="subTopContainer">
            <IoDocumentTextOutline size={20} color="#3d67ee" style={{ marginTop: '2px' }} />
            <span className="blueText" style={{ marginLeft: '10px' }}>Appointments / History</span>
          </div>
          <div className="subTopContainer" style={{ justifyContent: 'center', flex: 0.5, marginLeft: '12px' }}>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <IoNotifications size={21} color="#3d67ee" style={{ marginTop: '3px' }} />
            </button>
          </div>
        </div>

        {/* TABLE CONTAINER */}
        <div className="tableContainer">
          <div className="tableToolbar">
            
            {/* Search and Filters */}
            <div className="searchFilterSection">
              <div className="toolbarItem" onMouseEnter={() => setSearchHovered(true)} onMouseLeave={() => setSearchHovered(false)}>
                <button className="iconButton" onClick={() => setSearchVisible(!searchVisible)}>
                  <IoSearchSharp size={25} color={searchVisible ? "#afccf8" : "#3d67ee"} />
                </button>
                {searchHovered && <div className="tooltip">Search</div>}
              </div>

              {searchVisible && (
                <input
                  type="text"
                  placeholder="Search by patient or pet name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="searchInput"
                  maxLength={60}
                  style={{ width: '250px' }}
                />
              )}

              <div className="toolbarItem" style={{ marginLeft: '15px' }} onMouseEnter={() => setFilterHovered(true)} onMouseLeave={() => setFilterHovered(false)}>
                <button className="iconButton" onClick={() => setFilterVisible(!filterVisible)}>
                  <IoFilterSharp size={25} color={filterVisible ? "#afccf8" : "#3d67ee"} />
                </button>
                {filterHovered && <div className="tooltip">Filter</div>}
              </div>

              {filterVisible && (
                <div className="filterSection">
                  <select 
                    value={statusFilter} 
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="filterSelect"
                    style={{ width: '130px' }}
                  >
                    <option value="all" style={{color: '#a8a8a8'}}>All Status</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>

                  <select 
                    value={serviceFilter} 
                    onChange={(e) => setServiceFilter(e.target.value)}
                    className="filterSelect"
                    style={{ width: '160px', marginLeft: '10px' }}
                  >
                    <option value="all" style={{color: '#a8a8a8'}}>All Services</option>
                    <option value="Vaccination">Vaccination</option>
                    <option value="Check-up">Check-up</option>
                    <option value="Surgery">Surgery</option>
                    <option value="Grooming">Grooming</option>
                    <option value="Dental Care">Dental Care</option>
                    <option value="Emergency">Emergency</option>
                  </select>

                  {(statusFilter !== 'all' || serviceFilter !== 'all' || searchQuery) && (
                    <button 
                      onClick={() => { setStatusFilter('all'); setServiceFilter('all'); setSearchQuery(''); }}
                      style={{ background: 'none', border: 'none', color: '#3d67ee', fontSize: '12px', marginLeft: '10px', cursor: 'pointer', fontWeight: '600' }}
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Refresh Button */}
            <div className="actionSection">
              <button onClick={loadHistory} className="blackBtn" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IoRefresh color="#ffffff" size={16} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Data Table */}
          <div className="tableWrapper">
            {loading ? (
               <div className="loadingContainer"><div className="spinner"></div></div>
            ) : (
              <table className="dataTable">
                <thead>
                  <tr>
                    <th style={{ width: '20%' }}>Patient Name</th>
                    <th style={{ width: '15%', textAlign: 'center' }}>Pet Name</th>
                    <th style={{ width: '20%', textAlign: 'center' }}>Service</th>
                    <th style={{ width: '20%', textAlign: 'center' }}>Date and Time</th>
                    <th style={{ width: '15%', textAlign: 'center' }}>Doctor</th>
                    <th style={{ width: '10%', textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAppointments.length > 0 ? (
                    filteredAppointments.map((appointment) => (
                      <tr key={appointment.id}>
                        <td className="tableFont">{appointment.name}</td>
                        <td className="tableFont" style={{ textAlign: 'center' }}>{appointment.pet_name}</td>
                        <td className="tableFont" style={{ textAlign: 'center' }}>{appointment.service}</td>
                        <td className="tableFont" style={{ textAlign: 'center' }}>{appointment.date_time}</td>
                        <td className="tableFont" style={{ textAlign: 'center', color: appointment.doctor === 'Not Assigned' ? '#f57c00' : '#333' }}>
                          {appointment.doctor}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div className={`statusBadge ${appointment.status === 'completed' ? 'activeBadge' : 'inactiveBadge'}`}>
                             <span className={`statusText ${appointment.status === 'completed' ? 'activeText' : ''}`} style={{ textTransform: 'capitalize' }}>
                               {appointment.status}
                             </span>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="noData">
                        No history appointments found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* LOGOUT ALERT MODAL */}
      {logoutModalVisible && (
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
                <button className="alertBtn cancelAlertBtn" onClick={() => setLogoutModalVisible(false)}>Cancel</button>
              )}
              <button 
                className={`alertBtn ${modalConfig.type === 'error' ? 'errorBtn' : 'confirmAlertBtn'}`}
                onClick={() => { setLogoutModalVisible(false); if (modalConfig.onConfirm) modalConfig.onConfirm(); }} 
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
