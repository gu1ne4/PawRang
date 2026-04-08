import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Web icons equivalent to Ionicons
import { 
  IoHomeOutline, IoPeopleOutline, IoChevronDownOutline, IoChevronUpOutline,
  IoPersonOutline, IoMedkitOutline, IoCalendarClearOutline, IoCalendarOutline,
  IoTodayOutline, IoTimeOutline, IoDocumentTextOutline, IoSettingsOutline,
  IoLogOutOutline, IoNotifications, IoCheckmarkCircleOutline, IoCloseCircleOutline,
  IoAlertCircleOutline, IoSearchSharp, IoFilterSharp, IoRefresh, IoEyeOutline
} from 'react-icons/io5';

// Import your merged CSS file
import './AdminStyles.css';
import Navbar from '../reusable_components/NavBar';

// Using standard imports for Vite images
import logoImg from '../assets/AgsikapLogo-Temp.png';
import defaultUserImg from '../assets/userImg.jpg';
import { availabilityService } from './availabilityService';
import UserDetailsView from './UserDetailsView';

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
  const [selectedHistoryAppointment, setSelectedHistoryAppointment] = useState<any>(null);
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
      if (selectedHistoryAppointment) {
        const refreshedSelection = appointments.find((appointment: any) =>
          (appointment.dbId ?? appointment.id) === (selectedHistoryAppointment.dbId ?? selectedHistoryAppointment.id) &&
          (appointment.recordType || 'appointment') === (selectedHistoryAppointment.recordType || 'appointment')
        );

        if (refreshedSelection) {
          setSelectedHistoryAppointment(refreshedSelection);
        }
      }
    } catch (error) {
      console.error('Error loading history:', error);
      window.alert('Error: Failed to load appointment history');
    } finally {
      setLoading(false);
    }
  };

  const serviceOptions = Array.from(
    new Set(
      historyAppointments
        .map(app => app.service)
        .filter((service): service is string => Boolean(service))
    )
  ).sort((a, b) => a.localeCompare(b));

  // Filter appointments
  const filteredAppointments = historyAppointments.filter(app => {
    const normalizedQuery = searchQuery.toLowerCase();
    const patientName = (app.name || app.patient_name || '').toLowerCase();
    const petName = (app.pet_name || app.petName || '').toLowerCase();

    if (searchQuery && !patientName.includes(normalizedQuery) && !petName.includes(normalizedQuery)) {
      return false;
    }
    if (statusFilter !== 'all' && app.status !== statusFilter) return false;
    if (serviceFilter !== 'all' && app.service !== serviceFilter) return false;
    return true;
  });

  const getAppointmentDate = (appointment: any) => {
    if (appointment.date_display) return appointment.date_display;
    const dateTime = appointment.date_time || '';
    return dateTime.split(' ').slice(0, 1).join('') || 'Not provided';
  };

  const getAppointmentTime = (appointment: any) => {
    if (appointment.time_display) return appointment.time_display;
    const dateTime = appointment.date_time || '';
    return dateTime.split(' ').slice(1).join(' ') || 'Not provided';
  };

  const handleViewAppointment = (appointment: any) => {
    setSelectedHistoryAppointment(appointment);
  };

  const handleBackToHistory = () => {
    setSelectedHistoryAppointment(null);
  };

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
          {selectedHistoryAppointment ? (
            <UserDetailsView
              user={selectedHistoryAppointment}
              onBack={handleBackToHistory}
              onAccept={() => {}}
              onCancel={() => {}}
              onComplete={() => {}}
              onAssignDoctor={() => {}}
              onReschedule={() => {}}
              onAcceptClientPreference={() => {}}
              onDeclineClientPreference={() => {}}
              onRefresh={loadHistory}
              refreshing={loading}
              readOnly={true}
              backLabel="Back to History"
            />
          ) : (
            <>
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
                        {serviceOptions.map((service) => (
                          <option key={service} value={service}>{service}</option>
                        ))}
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
                        <th style={{ width: '16%' }}>Patient Name</th>
                        <th style={{ width: '14%', textAlign: 'center' }}>Pet Name</th>
                        <th style={{ width: '19%', textAlign: 'center' }}>Service</th>
                        <th style={{ width: '11%', textAlign: 'center' }}>Date</th>
                        <th style={{ width: '15%', textAlign: 'center' }}>Time</th>
                        <th style={{ width: '11%', textAlign: 'center' }}>Doctor</th>
                        <th style={{ width: '8%', textAlign: 'center' }}>Status</th>
                        <th style={{ width: '6%', textAlign: 'right' }}>View</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAppointments.length > 0 ? (
                        filteredAppointments.map((appointment) => (
                          <tr key={`${appointment.recordType || 'appointment'}-${appointment.dbId ?? appointment.id}`}>
                            <td className="tableFont">{appointment.name || appointment.patient_name || 'Unknown Patient'}</td>
                            <td className="tableFont" style={{ textAlign: 'center' }}>{appointment.pet_name || appointment.petName || 'Unknown Pet'}</td>
                            <td className="tableFont" style={{ textAlign: 'center' }}>{appointment.service}</td>
                            <td className="tableFont" style={{ textAlign: 'center' }}>{getAppointmentDate(appointment)}</td>
                            <td className="tableFont" style={{ textAlign: 'center' }}>{getAppointmentTime(appointment)}</td>
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
                            <td style={{ textAlign: 'right' }}>
                              <button
                                onClick={() => handleViewAppointment(appointment)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '8px 12px',
                                  borderRadius: '8px',
                                  border: '1px solid #cdd8ff',
                                  backgroundColor: '#f4f7ff',
                                  color: '#3d67ee',
                                  cursor: 'pointer',
                                  fontWeight: '600',
                                }}
                              >
                                <IoEyeOutline size={18} color="#3d67ee" />
                                <span>View</span>
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} className="noData">
                            No history appointments found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
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
