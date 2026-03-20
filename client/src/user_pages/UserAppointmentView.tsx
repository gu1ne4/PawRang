import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_URL from '../API';
import ClientNavBar from '../reusable_components/ClientNavBar';
import {
  IoCalendar, IoClose, IoSearchOutline, IoTimeOutline, IoEllipse,
  IoCutOutline, IoDocumentTextOutline, IoAlertCircleOutline,
  IoCheckmarkCircleOutline, IoCloseCircleOutline, IoChevronDown,
  IoInformationCircleOutline,
} from 'react-icons/io5';
import './UserStyles2.css';

// ─── Types ────────────────────────────────────────────────────────────────────

interface User {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  fullname?: string;
  fullName?: string;
  userImage?: string;
  userimage?: string;
}

interface Pet {
  pet_id: number;
  pet_name: string;
  pet_photo_url: string | null;
}

interface Appointment {
  appointment_id: number;
  owner_id: string;
  pet_id: number;
  appointment_type: string;
  appointment_date: string;
  appointment_time: string;
  patient_reason: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  branch_id: number | null;
  created_at: string;
  pet_profile?: Pet;
}

interface AlertConfig {
  type: 'info' | 'success' | 'error' | 'confirm';
  title: string;
  message: string | React.ReactNode;
  onConfirm: (() => void) | null;
  showCancel: boolean;
  confirmText: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const clinicHours: Record<string, string[]> = {
  Monday:    ['8:00AM - 9:00AM','9:00AM - 10:00AM','10:00AM - 11:00AM','11:00AM - 12:00PM','1:00PM - 2:00PM','2:00PM - 3:00PM','3:00PM - 4:00PM','4:00PM - 5:00PM'],
  Tuesday:   ['8:00AM - 9:00AM','9:00AM - 10:00AM','10:00AM - 11:00AM','11:00AM - 12:00PM','1:00PM - 2:00PM','2:00PM - 3:00PM','3:00PM - 4:00PM','4:00PM - 5:00PM'],
  Wednesday: ['8:00AM - 9:00AM','9:00AM - 10:00AM','10:00AM - 11:00AM','11:00AM - 12:00PM','1:00PM - 2:00PM','2:00PM - 3:00PM','3:00PM - 4:00PM','4:00PM - 5:00PM'],
  Thursday:  ['8:00AM - 9:00AM','9:00AM - 10:00AM','10:00AM - 11:00AM','11:00AM - 12:00PM','1:00PM - 2:00PM','2:00PM - 3:00PM','3:00PM - 4:00PM','4:00PM - 5:00PM'],
  Friday:    ['8:00AM - 9:00AM','9:00AM - 10:00AM','10:00AM - 11:00AM','11:00AM - 12:00PM','1:00PM - 2:00PM','2:00PM - 3:00PM','3:00PM - 4:00PM','4:00PM - 5:00PM'],
  Saturday:  [], Sunday: [],
};

const MIN_REASON_CHARS = 10;
const DEFAULT_PET_IMG  = 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400';
const getToken         = () => localStorage.getItem('access_token') ?? '';

// ─── Component ────────────────────────────────────────────────────────────────

const UserAppointmentView: React.FC = () => {
  const navigate = useNavigate();

  // ── Session — read once, no redirect ─────────────────────────────────────
  const [currentUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem('userSession');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  // ── Data ──────────────────────────────────────────────────────────────────
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingAppts, setLoadingAppts] = useState(false);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [selectedForDetails, setSelectedForDetails] = useState<Appointment | null>(null);
  const [activeFilter,       setActiveFilter]       = useState<'All' | 'Active' | 'Pending'>('Active');
  const [searchQuery,        setSearchQuery]        = useState('');
  const [currentPage,        setCurrentPage]        = useState(1);
  const itemsPerPage = 5;

  // ── Cancel modal ──────────────────────────────────────────────────────────
  const [cancelModalVisible,       setCancelModalVisible]       = useState(false);
  const [cancelStep,               setCancelStep]               = useState(1);
  const [cancelReason,             setCancelReason]             = useState('');
  const [cancelUnderstoodChecked,  setCancelUnderstoodChecked]  = useState(false);
  const [cancelReasonError,        setCancelReasonError]        = useState('');
  const [cancelTarget,             setCancelTarget]             = useState<Appointment | null>(null);

  // ── Reschedule modal ──────────────────────────────────────────────────────
  const [rescheduleModalVisible,        setRescheduleModalVisible]        = useState(false);
  const [rescheduleStep,                setRescheduleStep]                = useState(1);
  const [newDate,                       setNewDate]                       = useState('');
  const [newTime,                       setNewTime]                       = useState('');
  const [rescheduleReason,              setRescheduleReason]              = useState('');
  const [rescheduleUnderstoodChecked,   setRescheduleUnderstoodChecked]   = useState(false);
  const [rescheduleReasonError,         setRescheduleReasonError]         = useState('');
  const [rescheduleTarget,              setRescheduleTarget]              = useState<Appointment | null>(null);

  // ── Shared ────────────────────────────────────────────────────────────────
  const [isMutating,    setIsMutating]    = useState(false);
  const [alertVisible,  setAlertVisible]  = useState(false);
  const [alertConfig,   setAlertConfig]   = useState<AlertConfig>({
    type:'info', title:'', message:'', onConfirm:null, showCancel:false, confirmText:'OK',
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Alert
  // ─────────────────────────────────────────────────────────────────────────

  const showAlert = useCallback((
    type: AlertConfig['type'],
    title: string,
    message: string | React.ReactNode,
    onConfirm: (() => void) | null = null,
    showCancel = false,
    confirmText = 'OK',
  ) => {
    setAlertConfig({ type, title, message, onConfirm, showCancel, confirmText });
    setAlertVisible(true);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Fetch appointments — returns fresh list
  // ─────────────────────────────────────────────────────────────────────────

  const fetchAppointments = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoadingAppts(true);
    try {
      const res = await axios.get(`${API_URL}/appointments/user/${currentUser.id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setAppointments(res.data.appointments ?? []);
    } catch (err) {
      console.error('Failed to fetch appointments:', err);
    } finally {
      setLoadingAppts(false);
    }
  }, [currentUser?.id]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  // ─────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────

  const handleLogout = () => {
    showAlert('confirm','Log Out','Are you sure you want to log out?', () => {
      localStorage.removeItem('userSession');
      localStorage.removeItem('access_token');
      navigate('/login');
    }, true, 'Log Out');
  };

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return '#00aa00';
      case 'pending':   return '#ffaa00';
      case 'completed': return '#3d67ee';
      case 'cancelled': return '#ee3d5a';
      default:          return '#666';
    }
  };

  const capitalize    = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const isActionable  = (status: string) => status === 'pending' || status === 'confirmed';

  const getDayName = (dateString: string) => {
    const d = new Date(dateString);
    return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d.getDay()];
  };

  const getTimeSlotsForDate = (date: string) =>
    date ? clinicHours[getDayName(date)] ?? [] : [];

  // ─────────────────────────────────────────────────────────────────────────
  // Filtering & pagination
  // ─────────────────────────────────────────────────────────────────────────

  const filtered = appointments.filter(a => {
    if (activeFilter === 'Active'  && a.status !== 'confirmed') return false;
    if (activeFilter === 'Pending' && a.status !== 'pending')   return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        a.appointment_type.toLowerCase().includes(q) ||
        (a.pet_profile?.pet_name ?? '').toLowerCase().includes(q) ||
        a.status.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages   = Math.ceil(filtered.length / itemsPerPage);
  const currentItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // ─────────────────────────────────────────────────────────────────────────
  // Cancel
  // ─────────────────────────────────────────────────────────────────────────

  const openCancel = (appt: Appointment) => {
    setCancelTarget(appt); setCancelStep(1); setCancelReason('');
    setCancelUnderstoodChecked(false); setCancelReasonError('');
    setCancelModalVisible(true);
  };

  const handleCancelNext = () => {
    if (cancelReason.trim().length < MIN_REASON_CHARS) {
      setCancelReasonError(`Reason must be at least ${MIN_REASON_CHARS} characters`); return;
    }
    setCancelReasonError(''); setCancelStep(2);
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setIsMutating(true);
    try {
      await axios.patch(
        `${API_URL}/appointments/${cancelTarget.appointment_id}/cancel`,
        { cancel_reason: cancelReason },
        { headers: { Authorization: `Bearer ${getToken()}` } },
      );
      await fetchAppointments();
      if (selectedForDetails?.appointment_id === cancelTarget.appointment_id)
        setSelectedForDetails(prev => prev ? { ...prev, status: 'cancelled' } : prev);
      showAlert('success','Cancelled','Appointment cancelled successfully');
    } catch (err: any) {
      showAlert('error','Error', err.response?.data?.error ?? 'Failed to cancel appointment');
    } finally {
      setIsMutating(false); setCancelModalVisible(false); setCancelTarget(null);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Reschedule
  // ─────────────────────────────────────────────────────────────────────────

  const openReschedule = (appt: Appointment) => {
    setRescheduleTarget(appt); setRescheduleStep(1); setNewDate(''); setNewTime('');
    setRescheduleReason(''); setRescheduleUnderstoodChecked(false); setRescheduleReasonError('');
    setRescheduleModalVisible(true);
  };

  const handleRescheduleNext = () => {
    if (rescheduleStep === 1) {
      if (!newDate || !newTime) { showAlert('info','Incomplete','Please select both date and time'); return; }
      setRescheduleStep(2);
    } else if (rescheduleStep === 2) {
      if (rescheduleReason.trim().length < MIN_REASON_CHARS) {
        setRescheduleReasonError(`Reason must be at least ${MIN_REASON_CHARS} characters`); return;
      }
      setRescheduleReasonError(''); setRescheduleStep(3);
    }
  };

  const confirmReschedule = async () => {
    if (!rescheduleTarget || !newDate || !newTime) return;
    setIsMutating(true);
    try {
      await axios.patch(
        `${API_URL}/appointments/${rescheduleTarget.appointment_id}/reschedule`,
        { new_date: newDate, new_time: newTime, reschedule_reason: rescheduleReason },
        { headers: { Authorization: `Bearer ${getToken()}` } },
      );
      await fetchAppointments();
      if (selectedForDetails?.appointment_id === rescheduleTarget.appointment_id)
        setSelectedForDetails(prev => prev ? { ...prev, appointment_date: newDate, appointment_time: newTime, status: 'pending' } : prev);
      showAlert('success','Submitted','Reschedule request submitted for review');
    } catch (err: any) {
      showAlert('error','Error', err.response?.data?.error ?? 'Failed to reschedule');
    } finally {
      setIsMutating(false); setRescheduleModalVisible(false); setRescheduleTarget(null);
    }
  };

  const timeSlots = getTimeSlotsForDate(newDate);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="app-view-root">

      {/* ── Alert ── */}
      {alertVisible && (
        <div className="app-modal-overlay" onClick={() => setAlertVisible(false)}>
          <div className="app-modal-base" onClick={e => e.stopPropagation()}>
            {alertConfig.type === 'success' ? <IoCheckmarkCircleOutline size={55} color="#2e9e0c" />
              : alertConfig.type === 'error' ? <IoCloseCircleOutline size={55} color="#d93025" />
              : <IoAlertCircleOutline size={55} color="#3d67ee" />}
            <h3 className="app-modal-title">{alertConfig.title}</h3>
            {typeof alertConfig.message === 'string'
              ? <p className="app-modal-message">{alertConfig.message}</p>
              : <div className="app-modal-message">{alertConfig.message}</div>}
            <div className="app-modal-actions">
              {alertConfig.showCancel && (
                <button className="app-modal-btn app-modal-btn-cancel" onClick={() => setAlertVisible(false)}>Cancel</button>
              )}
              <button
                className={`app-modal-btn app-modal-btn-confirm ${alertConfig.type === 'error' ? 'app-modal-btn-error' : ''}`}
                onClick={() => { setAlertVisible(false); alertConfig.onConfirm?.(); }}
              >
                {alertConfig.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      <ClientNavBar
        currentUser={currentUser}
        onLogout={handleLogout}
        onViewProfile={() => navigate('/user/profile')}
        onMyPets={() => navigate('/user/pet-profile')}
        showAlert={showAlert}
      />

      <div className="app-main-layout">

        {/* ════════ LEFT: List ════════ */}
        <div className="app-list-panel">
          <div className="app-list-header"><h2>Your Appointments</h2></div>

          <div className="app-search-wrapper">
            <IoSearchOutline size={20} color="#3d67ee" />
            <input
              type="text"
              className="app-search-field"
              placeholder="Search by service, pet, or status…"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            />
            {searchQuery && (
              <button className="app-search-clear" onClick={() => { setSearchQuery(''); setCurrentPage(1); }}>
                <IoClose size={20} color="#999" />
              </button>
            )}
          </div>

          <div className="app-filter-bar">
            {(['All','Active','Pending'] as const).map(f => (
              <button
                key={f}
                className={`app-filter-option ${activeFilter === f ? 'active' : ''}`}
                onClick={() => { setActiveFilter(f); setCurrentPage(1); }}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="app-table-container">
            <div className="app-table-head">
              <div className="app-table-head-cell" style={{flex:1.2}}>Service</div>
              <div className="app-table-head-cell" style={{flex:1}}>Pet</div>
              <div className="app-table-head-cell" style={{flex:1.5}}>Date & Time</div>
              <div className="app-table-head-cell" style={{flex:0.9}}>Status</div>
            </div>
            <div className="app-table-body">
              {loadingAppts ? (
                <div className="app-empty-state"><p>Loading appointments…</p></div>
              ) : currentItems.length > 0 ? currentItems.map(item => (
                <div
                  key={item.appointment_id}
                  className={`app-table-row ${selectedForDetails?.appointment_id === item.appointment_id ? 'selected' : ''}`}
                  onClick={() => setSelectedForDetails(item)}
                >
                  <div className="app-table-cell" style={{flex:1.2}} title={item.appointment_type}>{item.appointment_type}</div>
                  <div className="app-table-cell" style={{flex:1}}>{item.pet_profile?.pet_name ?? 'N/A'}</div>
                  <div className="app-table-cell" style={{flex:1.5}}>
                    <div>{formatDate(item.appointment_date)}</div>
                    <div className="app-time-cell">{item.appointment_time}</div>
                  </div>
                  <div className="app-table-cell" style={{flex:0.9}}>
                    <span className="app-status-pill" style={{ backgroundColor: getStatusColor(item.status)+'20', color: getStatusColor(item.status) }}>
                      {capitalize(item.status)}
                    </span>
                  </div>
                </div>
              )) : (
                <div className="app-empty-state">
                  <IoCalendar size={50} color="#ccc" />
                  <p>No appointments found</p>
                </div>
              )}
            </div>

            {totalPages > 1 && (
              <div className="app-pagination-bar">
                <button className="app-page-btn" onClick={() => setCurrentPage(p => p-1)} disabled={currentPage===1}>
                  <IoChevronDown size={20} className="app-rotate-90" />
                </button>
                {[...Array(totalPages)].map((_,i) => (
                  <button key={i} className={`app-page-btn ${currentPage===i+1?'active':''}`} onClick={() => setCurrentPage(i+1)}>{i+1}</button>
                ))}
                <button className="app-page-btn" onClick={() => setCurrentPage(p => p+1)} disabled={currentPage===totalPages}>
                  <IoChevronDown size={20} className="app-rotate-270" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ════════ RIGHT: Details ════════ */}
        <div className="app-details-panel">
          <div className="app-details-title"><h3>Appointment Details</h3></div>
          <div className="app-details-scroll">
            {selectedForDetails ? (
              <>
                <div className="app-pet-summary">
                  <img
                    src={selectedForDetails.pet_profile?.pet_photo_url ?? DEFAULT_PET_IMG}
                    alt={selectedForDetails.pet_profile?.pet_name}
                    className="app-pet-thumb"
                  />
                  <div className="app-pet-name-badge">
                    <h4>{selectedForDetails.pet_profile?.pet_name ?? 'Unknown Pet'}</h4>
                    <p>{selectedForDetails.appointment_type}</p>
                  </div>
                </div>

                <div className="app-info-row"><IoCutOutline size={18} color="#3d67ee" /><span className="app-info-label">Service:</span><span className="app-info-value">{selectedForDetails.appointment_type}</span></div>
                <div className="app-info-row"><IoCalendar size={18} color="#3d67ee" /><span className="app-info-label">Date:</span><span className="app-info-value">{formatDate(selectedForDetails.appointment_date)}</span></div>
                <div className="app-info-row"><IoTimeOutline size={18} color="#3d67ee" /><span className="app-info-label">Time:</span><span className="app-info-value">{selectedForDetails.appointment_time}</span></div>
                <div className="app-info-row">
                  <IoEllipse size={18} color={getStatusColor(selectedForDetails.status)} />
                  <span className="app-info-label">Status:</span>
                  <span className="app-status-pill" style={{ backgroundColor: getStatusColor(selectedForDetails.status)+'20', color: getStatusColor(selectedForDetails.status) }}>
                    {capitalize(selectedForDetails.status)}
                  </span>
                </div>

                {selectedForDetails.patient_reason && (
                  <div className="app-notes-block">
                    <h4>Notes</h4>
                    <p>{selectedForDetails.patient_reason}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="app-empty-details">
                <IoDocumentTextOutline size={60} color="#ccc" />
                <p>Select an appointment to view details</p>
              </div>
            )}
          </div>

          {selectedForDetails && isActionable(selectedForDetails.status) && (
            <div className="app-action-bar">
              <button className="app-action-btn cancel" onClick={() => openCancel(selectedForDetails)} disabled={isMutating}>
                <IoClose size={18} color="white" /><span>Cancel</span>
              </button>
              <button className="app-action-btn reschedule" onClick={() => openReschedule(selectedForDetails)} disabled={isMutating}>
                <IoCalendar size={18} color="white" /><span>Reschedule</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════
          CANCEL MODAL
      ════════════════════════════════════════════ */}
      {cancelModalVisible && cancelTarget && (
        <div className="app-modal-overlay" onClick={() => setCancelModalVisible(false)}>
          <div className="app-modal-base app-modal-wide app-cancel-modal" onClick={e => e.stopPropagation()}>
            <button className="app-modal-close" onClick={() => setCancelModalVisible(false)}><IoClose size={24} color="#999" /></button>
            <div className="app-cancel-header">
              <div className="app-cancel-icon"><IoCloseCircleOutline size={40} color="#ee3d5a" /></div>
              <h2>Cancel Appointment</h2>
              <p className="app-step-subtitle">Step {cancelStep} of 2</p>
            </div>
            <div className="app-modal-body">
              {cancelStep === 1 && (
                <div>
                  <div className="app-step-guide"><h3>Reason for Cancellation</h3><p>Please provide a reason.</p></div>
                  <div className="app-input-group">
                    <label className="app-field-label required">Cancellation Reason</label>
                    <textarea
                      className={`app-textarea-field ${cancelReasonError ? 'error' : ''}`}
                      rows={5}
                      placeholder="e.g. Emergency, change of plans…"
                      value={cancelReason}
                      onChange={e => { setCancelReason(e.target.value); if (cancelReasonError) setCancelReasonError(''); }}
                    />
                    <div className="app-input-footer">
                      {cancelReasonError
                        ? <span className="error-message"><IoAlertCircleOutline size={14} /> {cancelReasonError}</span>
                        : <span className="app-char-indicator"><IoDocumentTextOutline size={14} /> {cancelReason.length}/{MIN_REASON_CHARS} min. chars</span>}
                    </div>
                  </div>
                </div>
              )}
              {cancelStep === 2 && (
                <div>
                  <div className="app-step-guide"><h3>Review Cancellation</h3></div>
                  <div className="app-summary-card">
                    <div className="app-card-header"><IoCalendar size={18} color="#3d67ee" /><h4>Appointment Details</h4></div>
                    <div className="app-card-body">
                      <div className="app-summary-line"><span className="app-summary-tag">Pet:</span><span className="app-summary-data">{cancelTarget.pet_profile?.pet_name ?? 'N/A'}</span></div>
                      <div className="app-summary-line"><span className="app-summary-tag">Service:</span><span className="app-summary-data">{cancelTarget.appointment_type}</span></div>
                      <div className="app-summary-line"><span className="app-summary-tag">Date:</span><span className="app-summary-data">{formatDate(cancelTarget.appointment_date)}</span></div>
                      <div className="app-summary-line"><span className="app-summary-tag">Time:</span><span className="app-summary-data">{cancelTarget.appointment_time}</span></div>
                    </div>
                  </div>
                  {cancelReason && (
                    <div className="app-reason-card">
                      <div className="app-card-header"><IoDocumentTextOutline size={18} color="#ee3d5a" /><h4>Your Reason</h4></div>
                      <div className="app-card-body"><p className="app-quote-text">"{cancelReason}"</p></div>
                    </div>
                  )}
                  <div className="app-warning-box">
                    <div className="app-warning-header"><IoAlertCircleOutline size={20} color="#b71c1c" /><h4>⚠️ Non-Refundable</h4></div>
                    <ul><li>Any payments made are non-refundable</li><li>This action cannot be undone</li></ul>
                  </div>
                  <label className="app-checkbox-wrapper">
                    <input type="checkbox" checked={cancelUnderstoodChecked} onChange={() => setCancelUnderstoodChecked(p => !p)} />
                    <span className="app-checkbox-label">I understand this cancellation is final and non-refundable</span>
                  </label>
                </div>
              )}
            </div>
            <div className="app-modal-bottom">
              <div className="app-modal-footer-actions">
                {cancelStep > 1
                  ? <button className="app-btn-outline" onClick={() => setCancelStep(1)}>Back</button>
                  : <button className="app-btn-outline" onClick={() => setCancelModalVisible(false)}><IoClose size={16} /> Close</button>}
                {cancelStep < 2
                  ? <button className="app-btn-primary cancel" onClick={handleCancelNext} disabled={cancelReason.length < MIN_REASON_CHARS}>Next</button>
                  : <button className={`app-btn-primary cancel ${!cancelUnderstoodChecked ? 'disabled' : ''}`} onClick={confirmCancel} disabled={!cancelUnderstoodChecked || isMutating}>
                      {isMutating ? 'Processing…' : 'Confirm Cancellation'}
                    </button>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          RESCHEDULE MODAL
      ════════════════════════════════════════════ */}
      {rescheduleModalVisible && rescheduleTarget && (
        <div className="app-modal-overlay" onClick={() => setRescheduleModalVisible(false)}>
          <div className="app-modal-base app-modal-wide app-reschedule-modal" onClick={e => e.stopPropagation()}>
            <button className="app-modal-close" onClick={() => setRescheduleModalVisible(false)}><IoClose size={24} color="#999" /></button>
            <div className="app-reschedule-header">
              <div className="app-reschedule-icon"><IoCalendar size={40} color="#3d67ee" /></div>
              <h2>Reschedule Appointment</h2>
              <p className="app-step-subtitle">Step {rescheduleStep} of 3</p>
            </div>
            <div className="app-modal-body">
              {rescheduleStep === 1 && (
                <div>
                  <div className="app-step-guide"><h3>Select New Date & Time</h3></div>
                  <div className="app-calendar-panel">
                    <label style={{ display:'block', marginBottom:8, fontSize:14, color:'#333', fontWeight:500 }}>New Date</label>
                    <input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      max={(() => { const d = new Date(); d.setMonth(d.getMonth()+2); return d.toISOString().split('T')[0]; })()}
                      value={newDate}
                      onChange={e => { setNewDate(e.target.value); setNewTime(''); }}
                      style={{ width:'100%', padding:'10px', borderRadius:'8px', border:'1px solid #e0e0e0', fontSize:'14px', marginBottom:16 }}
                    />
                    {newDate && (
                      <div className="app-time-panel">
                        <div className="app-time-header"><IoTimeOutline size={18} color="#3d67ee" /><h4>Available slots for {formatDate(newDate)}</h4></div>
                        <div className="app-time-grid">
                          {timeSlots.length > 0 ? timeSlots.map((t,i) => (
                            <button key={i} className={`app-time-option ${newTime===t?'selected':''}`} onClick={() => setNewTime(t)}>
                              <IoTimeOutline size={14} /><span>{t}</span>
                            </button>
                          )) : (
                            <div className="app-no-slots"><IoAlertCircleOutline size={24} color="#999" /><p>No slots available for this date</p></div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {rescheduleStep === 2 && (
                <div>
                  <div className="app-step-guide"><h3>Reason for Rescheduling</h3></div>
                  <div className="app-input-group">
                    <label className="app-field-label required">Reschedule Reason</label>
                    <textarea
                      className={`app-textarea-field ${rescheduleReasonError ? 'error' : ''}`}
                      rows={5}
                      placeholder="e.g. Work conflict, pet not feeling well…"
                      value={rescheduleReason}
                      onChange={e => { setRescheduleReason(e.target.value); if (rescheduleReasonError) setRescheduleReasonError(''); }}
                    />
                    <div className="app-input-footer">
                      {rescheduleReasonError
                        ? <span className="error-message"><IoAlertCircleOutline size={14} /> {rescheduleReasonError}</span>
                        : <span className="app-char-indicator"><IoDocumentTextOutline size={14} /> {rescheduleReason.length}/{MIN_REASON_CHARS} min. chars</span>}
                    </div>
                  </div>
                </div>
              )}
              {rescheduleStep === 3 && (
                <div>
                  <div className="app-step-guide"><h3>Review Request</h3></div>
                  <div className="app-summary-card original">
                    <div className="app-card-header"><IoCalendar size={18} color="#ee3d5a" /><h4>Original Schedule</h4></div>
                    <div className="app-card-body">
                      <div className="app-summary-line"><span className="app-summary-tag">Date:</span><span className="app-summary-data">{formatDate(rescheduleTarget.appointment_date)}</span></div>
                      <div className="app-summary-line"><span className="app-summary-tag">Time:</span><span className="app-summary-data">{rescheduleTarget.appointment_time}</span></div>
                    </div>
                  </div>
                  <div className="app-summary-card new">
                    <div className="app-card-header"><IoCalendar size={18} color="#00aa00" /><h4>Requested Schedule</h4></div>
                    <div className="app-card-body">
                      <div className="app-summary-line"><span className="app-summary-tag">Date:</span><span className="app-summary-data highlight">{formatDate(newDate)}</span></div>
                      <div className="app-summary-line"><span className="app-summary-tag">Time:</span><span className="app-summary-data highlight">{newTime}</span></div>
                    </div>
                    {rescheduleTarget.status === 'confirmed' && (
                      <div className="app-status-note"><IoInformationCircleOutline size={16} /><span>This appointment will be set back to Pending for re-approval</span></div>
                    )}
                  </div>
                  <div className="app-info-box">
                    <div className="app-info-header"><IoTimeOutline size={20} color="#856404" /><h4>⏳ Under Review</h4></div>
                    <p>Your request will be reviewed within 1-2 business days. You will receive an email once approved.</p>
                  </div>
                  <label className="app-checkbox-wrapper">
                    <input type="checkbox" checked={rescheduleUnderstoodChecked} onChange={() => setRescheduleUnderstoodChecked(p => !p)} />
                    <span className="app-checkbox-label">I understand this request must be reviewed before approval</span>
                  </label>
                </div>
              )}
            </div>
            <div className="app-modal-bottom">
              <div className="app-modal-footer-actions">
                {rescheduleStep > 1
                  ? <button className="app-btn-outline" onClick={() => setRescheduleStep(p => p-1)}>Back</button>
                  : <button className="app-btn-outline" onClick={() => setRescheduleModalVisible(false)}><IoClose size={16} /> Cancel</button>}
                {rescheduleStep < 3
                  ? <button className="app-btn-primary" onClick={handleRescheduleNext} disabled={rescheduleStep===1 ? (!newDate||!newTime) : rescheduleReason.length < MIN_REASON_CHARS}>
                      Next
                    </button>
                  : <button className={`app-btn-primary ${!rescheduleUnderstoodChecked?'disabled':''}`} onClick={confirmReschedule} disabled={!rescheduleUnderstoodChecked || isMutating}>
                      {isMutating ? 'Processing…' : 'Submit Request'}
                    </button>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserAppointmentView;