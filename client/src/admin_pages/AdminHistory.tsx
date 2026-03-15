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
      {/* NAVBAR */}
      <div className="navbarContainer">
        <div className="navBody" style={{ background: 'linear-gradient(135deg, #3db6ee, #3d67ee, #0738D9, #0f3bca)' }}>
          
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
                      <span className="navFont" style={{ fontWeight: '400', fontSize: '12px' }}>Availability</span>
                    </button>
                  </div>
                  <div className={isActive ? "subSelectedGlass" : ""} style={{ width: '100%' }}>
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

            <div>
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