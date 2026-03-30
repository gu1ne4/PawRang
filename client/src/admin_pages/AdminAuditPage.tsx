import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Web icons equivalent to Ionicons
import { 
  IoHomeOutline, IoPeopleOutline, IoChevronDownOutline, IoChevronUpOutline,
  IoPersonOutline, IoMedkitOutline, IoCalendarClearOutline, IoCalendarOutline,
  IoTodayOutline, IoTimeOutline, IoDocumentTextOutline, IoSettingsOutline,
  IoLogOutOutline, IoRefresh, IoSearchSharp, IoFilterSharp, IoCloseCircleSharp,
  IoPersonCircleOutline, IoCheckmarkCircleOutline, IoCloseCircleOutline, IoAlertCircleOutline
} from 'react-icons/io5';

// Import your merged CSS file
import './AdminStyles.css';
import Navbar from '../reusable_components/NavBar';

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

export default function AdminAuditPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = location.pathname === '/Audit';
  const API_URL = 'http://localhost:5000'; 

  // ==========================================
  //  STATE MANAGEMENT
  // ==========================================
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  
  // Navbar Dropdowns
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [showAppointmentsDropdown, setShowAppointmentsDropdown] = useState(false);

  // Table UI State
  const [searchVisible, setSearchVisible] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHovered, setSearchHovered] = useState(false);
  const [filterHovered, setFilterHovered] = useState(false);

  // Pagination & Filter
  const [page, setPage] = useState(0);
  const itemsPerPage = 8;
  const [statusFilter, setStatusFilter] = useState("defaultStatus");
  const [roleFilter, setRoleFilter] = useState("defaultRole");

  // ==========================================
  //  1. MODAL STATE
  // ==========================================
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState<ModalConfigType>({
    type: 'info', 
    title: '',
    message: '', 
    onConfirm: null, 
    showCancel: false 
  });

  // ==========================================
  //  2. HELPER FUNCTION
  // ==========================================
  const showAlert = (
      type: 'info' | 'success' | 'error' | 'confirm', 
      title: string, 
      message: string | React.ReactNode, 
      onConfirm: (() => void) | null = null, 
      showCancel = false
  ) => {
    setModalConfig({ type, title, message, onConfirm, showCancel });
    setModalVisible(true);
  };

  // ==========================================
  //  API FUNCTIONS
  // ==========================================
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

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/access_logs`); 
      const data = await res.json();
      
      if (Array.isArray(data)) {
        // Sort newest first
        setAuditLogs(data.sort((a, b) => new Date(b.login_time).getTime() - new Date(a.login_time).getTime()));
      } else {
        setAuditLogs([]);
      }
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  // ==========================================
  //  3. LOGOUT HANDLER
  // ==========================================
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

  // ==========================================
  //  FILTER LOGIC
  // ==========================================
  const filteredLogs = auditLogs.filter(log => {
    const uName = (log.username || 'Unknown').toLowerCase();
    const uAction = (log.action || '').toLowerCase();
    const uStatus = log.status || '';
    const uRole = log.role || '';

    const matchesSearch = 
      uName.includes(searchQuery.toLowerCase()) || 
      uAction.includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter !== "defaultStatus" ? uStatus === statusFilter : true;
    const matchesRole = roleFilter !== "defaultRole" ? uRole === roleFilter : true;

    return matchesSearch && matchesStatus && matchesRole;
  });

  const noMatchFilters = statusFilter === "defaultStatus" && roleFilter === "defaultRole";
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

  // ==========================================
  //  RENDER
  // ==========================================
  return (
    <div className="biContainer">
      <Navbar currentUser={currentUser} onLogout={handleLogoutPress} />

      {/* BODY */}
      <div className="bodyContainer">
        <div className="topContainer">
          <div className="subTopContainer">
            <IoDocumentTextOutline size={20} color="#3d67ee" style={{ marginTop: '2px' }} />
            <span className="blueText" style={{ marginLeft: '10px' }}>System Audit / Access Logs</span>
          </div>
          <div className="subTopContainer" style={{ justifyContent: 'center', flex: 0.5, marginLeft: '12px' }}>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={fetchAuditLogs}>
              <IoRefresh size={21} color="#3d67ee" style={{ marginTop: '3px' }} />
            </button>
          </div>
        </div>

        {/* TABLE CONTAINER */}
        <div className="tableContainer">
          <div className="tableToolbar">
            
            {/* SEARCH AND FILTER BAR */}
            <div className="searchFilterSection">
              
              {/* Search Icon */}
              <div className="toolbarItem" onMouseEnter={() => setSearchHovered(true)} onMouseLeave={() => setSearchHovered(false)}>
                <button className="iconButton" onClick={() => setSearchVisible(!searchVisible)}>
                  <IoSearchSharp size={25} color={searchVisible ? "#afccf8" : "#3d67ee"} />
                </button>
                {searchHovered && <div className="tooltip">Search</div>}
              </div>

              {searchVisible && (
                <input
                  type="text"
                  placeholder="Search user or action..."
                  value={searchQuery}
                  onChange={(e) => {setSearchQuery(e.target.value); setPage(0);}}
                  className="searchInput"
                  maxLength={60} 
                />
              )}

              {/* Filter Icon */}
              <div className="toolbarItem" onMouseEnter={() => setFilterHovered(true)} onMouseLeave={() => setFilterHovered(false)}>
                <button className="iconButton" onClick={() => setFilterVisible(!filterVisible)}>
                  <IoFilterSharp size={25} color={filterVisible ? "#afccf8" : "#3d67ee"} />
                </button>
                {filterHovered && <div className="tooltip">Filter</div>}
              </div>
              
              {filterVisible && (
                <div className="filterSection">
                  {/* Status Picker (Success/Failed) */}
                  <select 
                    value={statusFilter} 
                    className="filterSelect" 
                    onChange={(e) => {setStatusFilter(e.target.value); setPage(0);}}
                  >
                    <option value="defaultStatus" style={{color: '#a8a8a8'}}>Status</option>
                    <option value="SUCCESS">Success</option>
                    <option value="FAILED">Failed</option>
                  </select>

                  {/* Role Picker */}
                  <select 
                    value={roleFilter} 
                    className="filterSelect wide" 
                    onChange={(e) => {setRoleFilter(e.target.value); setPage(0);}}
                  >
                    <option value="defaultRole" style={{color: '#a8a8a8'}}>Role</option>
                    <option value="Admin">Admin</option>
                    <option value="Veterinarian">Veterinarian</option>
                    <option value="Receptionist">Receptionist</option>
                    <option value="User">User</option>
                  </select>

                  {/* Clear Filters Button */}
                  <button
                    onClick={() => {
                      setStatusFilter("defaultStatus");
                      setRoleFilter("defaultRole");
                      setSearchQuery("");
                      setPage(0);
                    }}
                    className="clearFilterBtn"
                  >
                    <IoCloseCircleSharp size={15} color="#ffffff" style={{ marginTop: '1px' }} />
                    <span>Clear Filters</span>
                  </button>
                </div>
              )}
            </div>
            
            <div className="actionSection">
               {/* Placeholder for future Export button */}
            </div>
          </div>

          {/* DATATABLE */}
          {loading ? (
            <div className="loadingContainer"><div className="spinner"></div></div>
          ) : (
            <div className="tableWrapper">
              <table className="dataTable">
                <thead>
                  <tr>
                    <th style={{ width: '25%' }}>User</th>
                    <th style={{ textAlign: 'center', width: '15%' }}>Role</th>
                    <th style={{ textAlign: 'center', width: '15%' }}>Action</th>
                    <th style={{ textAlign: 'center', width: '20%' }}>Date & Time</th>
                    <th style={{ textAlign: 'center', width: '15%' }}>IP Address</th>
                    <th style={{ textAlign: 'center', width: '10%' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.length > 0 ? (
                    filteredLogs.slice(page * itemsPerPage, (page + 1) * itemsPerPage).map((log, index) => {
                      const isSuccess = log.status === 'SUCCESS';
                      const dateObj = new Date(log.login_time);
                      const formattedDate = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                      return (
                        <tr key={log.log_id || index}>
                          <td>
                            <div className="userCell">
                              <IoPersonCircleOutline size={30} color="#3d67ee" style={{marginRight: '10px'}} />
                              <span className="tableFont">{log.username || 'Unknown'}</span>
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }} className="tableFont">{log.role}</td>
                          <td style={{ textAlign: 'center' }} className="tableFont">{log.action}</td>
                          <td style={{ textAlign: 'center' }} className="tableFont">{formattedDate}</td>
                          <td style={{ textAlign: 'center' }} className="tableFont">{log.ip_address || 'N/A'}</td>
                          <td style={{ textAlign: 'center' }}>
                            <div className={`statusBadge ${isSuccess ? 'activeBadge' : 'inactiveBadge'}`}>
                              <span className={`statusText ${isSuccess ? 'activeText' : ''}`}>{log.status}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="noData">
                        {noMatchFilters ? "Showing all logs (no filters applied)" : "No logs found"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Web Pagination */}
              {totalPages > 0 && (
                <div className="pagination">
                  <button className="paginationBtn" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>Previous</button>
                  <span className="paginationInfo">Page {page + 1} of {totalPages || 1}</span>
                  <button className="paginationBtn" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}>Next</button>
                </div>
              )}
            </div>
          )}
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
