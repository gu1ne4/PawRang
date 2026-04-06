import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../apiService';
import ClientNavBar from '../reusable_components/ClientNavBar';
import {
  IoCalendar, IoClose, IoSearchOutline, IoTimeOutline, IoEllipse,
  IoCutOutline, IoDocumentTextOutline, IoAlertCircleOutline,
  IoCheckmarkCircleOutline, IoCloseCircleOutline, IoChevronDown,
  IoInformationCircleOutline, IoMedicalOutline, IoBugOutline,
  IoShieldCheckmarkOutline, IoHeartOutline, IoPersonOutline,
  IoLocationOutline, IoChevronBack, IoChevronForward,
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
  pet_breed?: string;
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
  pet_name?: string;
  petName?: string;
  pet_breed?: string;
  petBreed?: string;
  pet_photo_url?: string | null;
  doctor?: string;
  assignedDoctor?: string | null;
  branch_name?: string;
  branchName?: string;
  medicalInformation?: MedicalInformation | null;
  medical_information?: MedicalInformation | null;
  pet_profile?: Pet;
  latestRescheduleRequest?: any;
}

interface MedicalInformation {
  on_medication?: boolean;
  medication_details?: string;
  flea_tick_prevention?: boolean;
  is_vaccinated?: boolean;
  is_pregnant?: boolean;
  additional_notes?: string;
}

interface AlertConfig {
  type: 'info' | 'success' | 'error' | 'confirm';
  title: string;
  message: string | React.ReactNode;
  onConfirm: (() => void) | null;
  showCancel: boolean;
  confirmText: string;
}

type AppointmentModalLayer = 'details' | 'cancel' | 'reschedule';

// ─── Constants ────────────────────────────────────────────────────────────────

type DayAvailability = Record<string, boolean>;

interface RescheduleTimeSlot {
  id: string | number;
  startTime: string;
  endTime: string;
  displayText: string;
}

const RescheduleCalendar = ({
  selectedDate,
  onSelectDate,
  availableDays = null,
  specialDates = [],
  disablePastDates = false,
}: {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  availableDays?: DayAvailability | null;
  specialDates?: string[];
  disablePastDates?: boolean;
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const todayDate = new Date();
  const minMonth = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
  const maxMonth = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 1);
  const canGoPrev = currentMonth > minMonth;
  const canGoNext = currentMonth < maxMonth;
  const specialDateSet = new Set(specialDates);
  const dayNamesList = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const todayStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const renderDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];
    const monthStr = String(currentMonth.getMonth() + 1).padStart(2, '0');
    const yearStr = currentMonth.getFullYear();

    for (let i = 0; i < firstDay; i += 1) {
      days.push(<div key={`empty-${i}`} style={{ width: '32px', height: '32px' }} />);
    }

    for (let i = 1; i <= daysInMonth; i += 1) {
      const dayStr = String(i).padStart(2, '0');
      const fullDate = `${yearStr}-${monthStr}-${dayStr}`;
      const dayOfWeek = new Date(yearStr, currentMonth.getMonth(), i).getDay();
      const dayName = dayNamesList[dayOfWeek];
      const isSelected = selectedDate === fullDate;
      const isToday = fullDate === todayStr;
      const isPast = disablePastDates && fullDate < todayStr;
      const isUnavailableDay = availableDays && availableDays[dayName] === false;
      const isSpecialDate = specialDateSet.has(fullDate);
      const isDisabled = isPast || isUnavailableDay || isSpecialDate;

      let bgColor = 'transparent';
      let textColor = isDisabled ? '#d3d3d3' : '#333';
      let fontWeight = '400';

      if (!isDisabled) {
        if (isSelected) {
          bgColor = '#3d67ee';
          textColor = 'white';
          fontWeight = '600';
        } else if (isToday) {
          bgColor = '#f0f7ff';
          textColor = '#3d67ee';
          fontWeight = '700';
        }
      }

      days.push(
        <div
          key={i}
          onClick={() => !isDisabled && onSelectDate(isSelected ? '' : fullDate)}
          style={{
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            backgroundColor: bgColor,
            color: textColor,
            borderRadius: '50%',
            fontSize: '13px',
            fontWeight,
            transition: 'all 0.2s ease',
            opacity: isDisabled ? 0.5 : 1,
          }}
        >
          {i}
        </div>
      );
    }

    return days;
  };

  return (
    <div style={{ width: '100%', userSelect: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <button
          onClick={() => canGoPrev && setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
          type="button"
          disabled={!canGoPrev}
          style={{ background: 'none', border: 'none', cursor: canGoPrev ? 'pointer' : 'not-allowed', color: canGoPrev ? '#3d67ee' : '#ccc' }}
        >
          <IoChevronBack size={18} />
        </button>
        <h3 style={{ fontSize: '15px', fontWeight: '700', margin: 0 }}>
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h3>
        <button
          onClick={() => canGoNext && setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
          type="button"
          disabled={!canGoNext}
          style={{ background: 'none', border: 'none', cursor: canGoNext ? 'pointer' : 'not-allowed', color: canGoNext ? '#3d67ee' : '#ccc' }}
        >
          <IoChevronForward size={18} />
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px 2px', justifyItems: 'center' }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} style={{ fontSize: '11px', color: '#a0a0a0', fontWeight: '700', marginBottom: '6px' }}>
            {day}
          </div>
        ))}
        {renderDays()}
      </div>
    </div>
  );
};

const MIN_REASON_CHARS = 10;
const RESCHEDULE_LOCK_MESSAGE = 'A reschedule request is already under review. You can request another change after the clinic reviews the current request.';

const hasStructuredRescheduleMetadata = (value?: string | null) =>
  /(^|\|)\s*Preferred (date|time):/i.test(value || '');

const extractRescheduleRequestNote = (value?: string | null) => {
  const rawValue = (value || '').trim();
  if (!rawValue) return '';

  const noteMatch = rawValue.match(/(?:^|\|)\s*Patient note:\s*([^|]+)/i);
  if (noteMatch?.[1]) {
    return noteMatch[1].trim();
  }

  if (!hasStructuredRescheduleMetadata(rawValue)) {
    return rawValue;
  }

  return '';
};

const isPatientInitiatedRescheduleRequest = (request?: any | null) =>
  request?.patient_response_type === 'choose_another_date' &&
  String(request?.proposed_appointment_date || '') === String(request?.current_appointment_date || '') &&
  String(request?.proposed_appointment_time || '') === String(request?.current_appointment_time || '');

const getOpenRescheduleRequest = (appointment: Appointment) => {
  const request = appointment.latestRescheduleRequest ?? null;
  const normalizedStatus = (request?.status || '').toLowerCase();
  return ['pending', 'needs_new_schedule'].includes(normalizedStatus) ? request : null;
};

const canWithdrawRescheduleRequest = (appointment: Appointment) => {
  const request = getOpenRescheduleRequest(appointment);
  return Boolean(request && isPatientInitiatedRescheduleRequest(request));
};
const DEFAULT_PET_IMG  = 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400';
const isMobileViewport = () =>
  typeof window !== 'undefined' && window.innerWidth <= 768;

const getAppointmentCreatedTime = (appointment: Appointment) => {
  const createdAt = new Date(appointment.created_at).getTime();
  if (!Number.isNaN(createdAt)) return createdAt;

  const fallback = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`).getTime();
  return Number.isNaN(fallback) ? 0 : fallback;
};

const getAppointmentPetData = (appointment: Appointment) => ({
  name: appointment.pet_profile?.pet_name ?? appointment.pet_name ?? appointment.petName ?? 'Unknown Pet',
  breed: appointment.pet_profile?.pet_breed ?? appointment.pet_breed ?? appointment.petBreed ?? 'Breed not available',
  photoUrl: appointment.pet_profile?.pet_photo_url ?? appointment.pet_photo_url ?? DEFAULT_PET_IMG,
});

const getAppointmentDoctorName = (appointment: Appointment) =>
  appointment.doctor?.trim() || 'Not yet assigned';

const getAppointmentBranchName = (appointment: Appointment) =>
  appointment.branch_name?.trim() || appointment.branchName?.trim() || 'Not specified';

const getAppointmentMedicalInfo = (appointment: Appointment) =>
  appointment.medicalInformation ?? appointment.medical_information ?? null;

const renderMedicalInformation = (appointment: Appointment) => {
  const medicalInfo = getAppointmentMedicalInfo(appointment);

  if (!medicalInfo) return null;

  const medicalItems = [
    {
      key: 'medications',
      icon: <IoMedicalOutline size={16} color="#8c63ff" />,
      label: 'Medications (72h)',
      value: medicalInfo.on_medication,
      details: medicalInfo.medication_details,
    },
    {
      key: 'flea',
      icon: <IoBugOutline size={16} color="#ff9a3c" />,
      label: 'Flea/Tick Prevention',
      value: medicalInfo.flea_tick_prevention,
    },
    {
      key: 'vaccine',
      icon: <IoShieldCheckmarkOutline size={16} color="#3d67ee" />,
      label: 'Vaccinations',
      value: medicalInfo.is_vaccinated,
    },
    {
      key: 'pregnancy',
      icon: <IoHeartOutline size={16} color="#ef5da8" />,
      label: 'Pregnant',
      value: medicalInfo.is_pregnant,
    },
  ];

  return (
    <div className="app-medical-block">
      <h4>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <IoInformationCircleOutline size={17} color="#3d67ee" />
          Medical Information
        </span>
      </h4>

      {medicalItems.map(item => {
        const displayValue = item.value ? 'Yes' : 'No';
        return (
          <React.Fragment key={item.key}>
            <div className="app-medical-item">
              {item.icon}
              <span className="app-medical-tag">{item.label}</span>
              <span className={`app-medical-status ${item.value ? 'success' : 'warning'}`}>
                {displayValue}
              </span>
            </div>
            {item.details && (
              <div className="app-medical-note">{item.details}</div>
            )}
          </React.Fragment>
        );
      })}

      {medicalInfo.additional_notes?.trim() && (
        <div className="app-notes-block">
          <h4>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <IoDocumentTextOutline size={16} color="#3d67ee" />
              Additional Notes
            </span>
          </h4>
          <p>{medicalInfo.additional_notes}</p>
        </div>
      )}
    </div>
  );
};

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
  const [activeFilter,       setActiveFilter]       = useState<'All' | 'Active' | 'Pending'>('All');
  const [searchQuery,        setSearchQuery]        = useState('');
  const [currentPage,        setCurrentPage]        = useState(1);
  const [isMobileView,       setIsMobileView]       = useState(isMobileViewport);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [alertRestoreModal, setAlertRestoreModal] = useState<AppointmentModalLayer | null>(null);
  const itemsPerPage = 5;

  // ── Cancel modal ──────────────────────────────────────────────────────────
  const [cancelModalVisible,       setCancelModalVisible]       = useState(false);
  const [cancelStep,               setCancelStep]               = useState(1);
  const [cancelReason,             setCancelReason]             = useState('');
  const [cancelUnderstoodChecked,  setCancelUnderstoodChecked]  = useState(false);
  const [cancelReasonError,        setCancelReasonError]        = useState('');
  const [cancelTarget,             setCancelTarget]             = useState<Appointment | null>(null);
  const [cancelParentModal,        setCancelParentModal]        = useState<AppointmentModalLayer | null>(null);

  // ── Reschedule modal ──────────────────────────────────────────────────────
  const [rescheduleModalVisible,        setRescheduleModalVisible]        = useState(false);
  const [rescheduleStep,                setRescheduleStep]                = useState(1);
  const [newDate,                       setNewDate]                       = useState('');
  const [newTime,                       setNewTime]                       = useState('');
  const [rescheduleReason,              setRescheduleReason]              = useState('');
  const [rescheduleUnderstoodChecked,   setRescheduleUnderstoodChecked]   = useState(false);
  const [rescheduleReasonError,         setRescheduleReasonError]         = useState('');
  const [rescheduleTarget,              setRescheduleTarget]              = useState<Appointment | null>(null);
  const [rescheduleParentModal,         setRescheduleParentModal]         = useState<AppointmentModalLayer | null>(null);
  const [rescheduleAvailableDays,       setRescheduleAvailableDays]       = useState<DayAvailability | null>(null);
  const [rescheduleSpecialDates,        setRescheduleSpecialDates]        = useState<string[]>([]);
  const [rescheduleTimeSlots,           setRescheduleTimeSlots]           = useState<RescheduleTimeSlot[]>([]);
  const [loadingRescheduleSlots,        setLoadingRescheduleSlots]        = useState(false);

  // ── Shared ────────────────────────────────────────────────────────────────
  const [isMutating,    setIsMutating]    = useState(false);
  const [alertVisible,  setAlertVisible]  = useState(false);
  const [alertConfig,   setAlertConfig]   = useState<AlertConfig>({
    type:'info', title:'', message:'', onConfirm:null, showCancel:false, confirmText:'OK',
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Alert
  // ─────────────────────────────────────────────────────────────────────────

  const setAppointmentModalVisible = useCallback((
    modal: AppointmentModalLayer,
    visible: boolean,
  ) => {
    if (modal === 'details') setDetailsModalVisible(visible);
    if (modal === 'cancel') setCancelModalVisible(visible);
    if (modal === 'reschedule') setRescheduleModalVisible(visible);
  }, []);

  const restoreAppointmentModal = useCallback((modal: AppointmentModalLayer | null) => {
    if (!modal) return;
    if (modal === 'details' && selectedForDetails && isMobileView) setDetailsModalVisible(true);
    if (modal === 'cancel' && cancelTarget) setCancelModalVisible(true);
    if (modal === 'reschedule' && rescheduleTarget) setRescheduleModalVisible(true);
  }, [cancelTarget, isMobileView, rescheduleTarget, selectedForDetails]);

  const getActiveAppointmentModal = useCallback((): AppointmentModalLayer | null => {
    if (rescheduleModalVisible) return 'reschedule';
    if (cancelModalVisible) return 'cancel';
    if (detailsModalVisible) return 'details';
    return null;
  }, [cancelModalVisible, detailsModalVisible, rescheduleModalVisible]);

  const showAlert = useCallback((
    type: AlertConfig['type'],
    title: string,
    message: string | React.ReactNode,
    onConfirm: (() => void) | null = null,
    showCancel = false,
    confirmText = 'OK',
    options?: {
      hideModal?: AppointmentModalLayer | null;
      restoreModal?: AppointmentModalLayer | null;
    },
  ) => {
    const modalToHide = options?.hideModal === undefined
      ? getActiveAppointmentModal()
      : options.hideModal;
    const modalToRestore = options?.restoreModal === undefined
      ? modalToHide
      : options.restoreModal;

    if (modalToHide) setAppointmentModalVisible(modalToHide, false);
    setAlertRestoreModal(modalToRestore ?? null);
    setAlertConfig({ type, title, message, onConfirm, showCancel, confirmText });
    setAlertVisible(true);
  }, [getActiveAppointmentModal, setAppointmentModalVisible]);

  const closeAlert = useCallback((restoreParent = true) => {
    setAlertVisible(false);
    const modalToRestore = alertRestoreModal;
    setAlertRestoreModal(null);
    if (restoreParent) restoreAppointmentModal(modalToRestore);
  }, [alertRestoreModal, restoreAppointmentModal]);

  // ─────────────────────────────────────────────────────────────────────────
  // Fetch appointments — returns fresh list
  // ─────────────────────────────────────────────────────────────────────────

  const fetchAppointments = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoadingAppts(true);
    try {
      const res = await apiService.getUserAppointments(currentUser.id);
      const sortedAppointments = [...(res.appointments ?? [])].sort(
        (a: Appointment, b: Appointment) => getAppointmentCreatedTime(b) - getAppointmentCreatedTime(a),
      );
      setAppointments(sortedAppointments);
      setSelectedForDetails((prev) => {
        if (!prev) return prev;
        return sortedAppointments.find((item) => item.appointment_id === prev.appointment_id) ?? prev;
      });
    } catch (err) {
      console.error('Failed to fetch appointments:', err);
    } finally {
      setLoadingAppts(false);
    }
  }, [currentUser?.id]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  useEffect(() => {
    const handleResize = () => setIsMobileView(isMobileViewport());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isMobileView) setDetailsModalVisible(false);
  }, [isMobileView]);

  useEffect(() => {
    if (!isMobileView) {
      setCancelParentModal(null);
      setRescheduleParentModal(null);
      setAlertRestoreModal(null);
    }
  }, [isMobileView]);

  // ─────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!rescheduleModalVisible) return;

    let isActive = true;
    setRescheduleAvailableDays(null);
    setRescheduleSpecialDates([]);
    setRescheduleTimeSlots([]);

    Promise.all([
      apiService.getDayAvailability().catch(() => null),
      apiService.getSpecialDates().catch(() => []),
    ]).then(([dayAvailability, specialDates]) => {
      if (!isActive) return;
      setRescheduleAvailableDays(dayAvailability);
      setRescheduleSpecialDates(
        (Array.isArray(specialDates) ? specialDates : [])
          .map((event: any) => event?.event_date)
          .filter(Boolean)
      );
    });

    return () => {
      isActive = false;
    };
  }, [rescheduleModalVisible]);

  useEffect(() => {
    if (!rescheduleModalVisible || !newDate) {
      setRescheduleTimeSlots([]);
      setLoadingRescheduleSlots(false);
      return;
    }

    let isActive = true;
    const dayNamesList = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const selectedDayName = dayNamesList[new Date(`${newDate}T00:00:00`).getDay()];

    setLoadingRescheduleSlots(true);
    apiService.getTimeSlotsForDay(selectedDayName)
      .then((slots: any[]) => {
        if (!isActive) return;

        const formattedSlots: RescheduleTimeSlot[] = (slots || []).map((slot: any) => ({
          id: slot.id,
          startTime: slot.start_time,
          endTime: slot.end_time,
          displayText: formatTimeSlotDisplay(slot.start_time, slot.end_time),
        }));

        setRescheduleTimeSlots(formattedSlots);
      })
      .catch((error) => {
        if (!isActive) return;
        console.error('Failed to load reschedule time slots:', error);
        setRescheduleTimeSlots([]);
      })
      .finally(() => {
        if (isActive) setLoadingRescheduleSlots(false);
      });

    return () => {
      isActive = false;
    };
  }, [newDate, rescheduleModalVisible]);

  const handleLogout = () => {
    localStorage.removeItem('userSession');
    localStorage.removeItem('access_token');
    navigate('/login');
  };

  const formatDate = (s?: string | null) => {
    if (!s) return 'Not provided';

    const parsedDate = new Date(s);
    if (Number.isNaN(parsedDate.getTime())) return String(s);

    return parsedDate.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
  };

  const formatTime = (value: string) => {
    if (!value) return 'Not provided';

    const normalized = value.trim().toUpperCase();
    if (normalized.includes('AM') || normalized.includes('PM')) return value;

    const match = normalized.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (!match) return value;

    const [, rawHour, minute] = match;
    const hour24 = Number(rawHour);
    if (Number.isNaN(hour24)) return value;

    const period = hour24 >= 12 ? 'PM' : 'AM';
    const hour12 = hour24 % 12 || 12;
    return `${hour12}:${minute} ${period}`;
  };

  const formatCalendarDateLabel = (value: string) =>
    new Date(`${value}T00:00:00`).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  const formatTimeSlotDisplay = (startTime: string, endTime: string) =>
    `${formatTime(startTime)} - ${formatTime(endTime)}`;

  const toDbTime = (value: string) => {
    if (!value) return '';
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(value)) {
      return value.length === 5 ? `${value}:00` : value;
    }
    return value;
  };

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

  const openAppointmentDetails = (appointment: Appointment) => {
    setSelectedForDetails(appointment);

    if (isMobileView) {
      setDetailsModalVisible(true);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Filtering & pagination
  // ─────────────────────────────────────────────────────────────────────────

  const filtered = appointments.filter(a => {
    if (activeFilter === 'Active'  && a.status !== 'confirmed') return false;
    if (activeFilter === 'Pending' && a.status !== 'pending')   return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const petName = getAppointmentPetData(a).name.toLowerCase();
      return (
        a.appointment_type.toLowerCase().includes(q) ||
        petName.includes(q) ||
        a.status.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages   = Math.ceil(filtered.length / itemsPerPage);
  const currentItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const selectedOpenRescheduleRequest = selectedForDetails ? getOpenRescheduleRequest(selectedForDetails) : null;
  const isSelectedRescheduleLocked = Boolean(selectedOpenRescheduleRequest);
  const canWithdrawSelectedReschedule = selectedForDetails ? canWithdrawRescheduleRequest(selectedForDetails) : false;
  const selectedRescheduleHelperMessage = canWithdrawSelectedReschedule
    ? 'This reschedule request is under clinic review. If your plans changed, you can withdraw it and keep your current appointment schedule.'
    : RESCHEDULE_LOCK_MESSAGE;

  // ─────────────────────────────────────────────────────────────────────────
  // Cancel
  // ─────────────────────────────────────────────────────────────────────────

  const openCancel = (appt: Appointment) => {
    if (detailsModalVisible) {
      setDetailsModalVisible(false);
      setCancelParentModal('details');
    } else {
      setCancelParentModal(null);
    }
    setCancelTarget(appt); setCancelStep(1); setCancelReason('');
    setCancelUnderstoodChecked(false); setCancelReasonError('');
    setCancelModalVisible(true);
  };

  const closeCancelModal = (restoreParent = true) => {
    setCancelModalVisible(false);
    setCancelTarget(null);

    if (restoreParent && cancelParentModal === 'details' && selectedForDetails && isMobileView) {
      setDetailsModalVisible(true);
    }

    setCancelParentModal(null);
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
    const restoreModal = cancelParentModal;
    try {
      await apiService.cancelAppointment(cancelTarget.appointment_id, cancelReason.trim());
      await fetchAppointments();
      if (selectedForDetails?.appointment_id === cancelTarget.appointment_id)
        setSelectedForDetails(prev => prev ? { ...prev, status: 'cancelled' } : prev);
      showAlert(
        'success',
        'Cancelled',
        'Appointment cancelled successfully',
        null,
        false,
        'OK',
        { restoreModal },
      );
    } catch (err: any) {
      showAlert(
        'error',
        'Error',
        err.response?.data?.error ?? err.data?.error ?? err.message ?? 'Failed to cancel appointment',
        null,
        false,
        'OK',
        { restoreModal },
      );
    } finally {
      setIsMutating(false);
      setCancelModalVisible(false);
      setCancelTarget(null);
      setCancelParentModal(null);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Reschedule
  // ─────────────────────────────────────────────────────────────────────────

  const openReschedule = (appt: Appointment) => {
    if (getOpenRescheduleRequest(appt)) {
      showAlert('info', 'Request Under Review', RESCHEDULE_LOCK_MESSAGE);
      return;
    }

    if (detailsModalVisible) {
      setDetailsModalVisible(false);
      setRescheduleParentModal('details');
    } else {
      setRescheduleParentModal(null);
    }
    setRescheduleTarget(appt); setRescheduleStep(1); setNewDate(''); setNewTime('');
    setRescheduleReason(''); setRescheduleUnderstoodChecked(false); setRescheduleReasonError('');
    setRescheduleTimeSlots([]);
    setRescheduleModalVisible(true);
  };

  const closeRescheduleModal = (restoreParent = true) => {
    setRescheduleModalVisible(false);
    setRescheduleTarget(null);

    if (restoreParent && rescheduleParentModal === 'details' && selectedForDetails && isMobileView) {
      setDetailsModalVisible(true);
    }

    setRescheduleParentModal(null);
  };

  const handleRescheduleNext = () => {
    if (rescheduleStep === 1) {
      if (!newDate || !newTime) {
        showAlert('info','Incomplete','Please select both date and time');
        return;
      }
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
    const restoreModal = rescheduleParentModal;
    try {
      await apiService.rescheduleAppointment(rescheduleTarget.appointment_id, {
        new_date: newDate,
        new_time: toDbTime(newTime),
        reschedule_reason: rescheduleReason,
        requested_by: currentUser?.id ?? null,
        recordType: 'appointment',
      });
      await fetchAppointments();
      if (selectedForDetails?.appointment_id === rescheduleTarget.appointment_id)
        setSelectedForDetails(prev => prev ? { ...prev, status: 'pending' } : prev);
      showAlert(
        'success',
        'Submitted',
        'Reschedule request submitted for review',
        null,
        false,
        'OK',
        { restoreModal },
      );
    } catch (err: any) {
      showAlert(
        'error',
        'Error',
        err.response?.data?.error ?? err.data?.error ?? err.message ?? 'Failed to reschedule',
        null,
        false,
        'OK',
        { restoreModal },
      );
    } finally {
      setIsMutating(false);
      setRescheduleModalVisible(false);
      setRescheduleTarget(null);
      setRescheduleParentModal(null);
    }
  };

  const withdrawRescheduleRequest = async (appointment: Appointment) => {
    const openRequest = getOpenRescheduleRequest(appointment);
    if (!openRequest?.request_id) return;

    setIsMutating(true);
    try {
      await apiService.withdrawRescheduleRequest(openRequest.request_id);
      await fetchAppointments();
      showAlert(
        'success',
        'Request Withdrawn',
        'Your reschedule request has been withdrawn. Your appointment schedule remains unchanged.',
      );
    } catch (err: any) {
      showAlert(
        'error',
        'Error',
        err.response?.data?.error ?? err.data?.error ?? err.message ?? 'Failed to withdraw the reschedule request',
      );
    } finally {
      setIsMutating(false);
    }
  };

  const renderRescheduleRequestDetails = (appointment: Appointment) => {
    const request = getOpenRescheduleRequest(appointment);
    if (!request) return null;

    const patientInitiated = isPatientInitiatedRescheduleRequest(request);
    const extractedPatientNote = extractRescheduleRequestNote(request.response_note);
    const noteDisplay = extractedPatientNote ||
      (!hasStructuredRescheduleMetadata(request.response_note) ? (request.response_note?.trim() || 'Not provided') : 'Not provided');

    const requestRows = patientInitiated
      ? [
          {
            label: 'Current Appointment Date',
            value: formatDate(request.current_appointment_date || appointment.appointment_date),
          },
          {
            label: 'Current Appointment Time',
            value: formatTime(request.current_appointment_time || appointment.appointment_time),
          },
          {
            label: 'Preferred Appointment Date',
            value: formatDate(request.patient_preferred_date),
          },
          {
            label: 'Preferred Appointment Time',
            value: formatTime(request.patient_preferred_time),
          },
        ]
      : [
          {
            label: 'Clinic Proposed Date',
            value: formatDate(request.proposed_appointment_date),
          },
          {
            label: 'Clinic Proposed Time',
            value: formatTime(request.proposed_appointment_time),
          },
          {
            label: 'Your Preferred Date',
            value: formatDate(request.patient_preferred_date),
          },
          {
            label: 'Your Preferred Time',
            value: formatTime(request.patient_preferred_time),
          },
        ];

    const noteLabel = patientInitiated ? 'Your Reason' : 'Clinic Note';
    const reviewLabel = patientInitiated
      ? 'Waiting for clinic review. If your plans changed, you can withdraw this request below.'
      : 'Waiting for your review';
    const noteValue = patientInitiated
      ? noteDisplay
      : (request.reason?.trim() || noteDisplay || 'Not provided');

    return (
      <div className="app-reschedule-request-block">
        <h4>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <IoCalendar size={17} color="#3d67ee" />
            Reschedule Request In Review
          </span>
        </h4>

        <div className="app-reschedule-request-helper">
          <IoInformationCircleOutline size={16} color="#3d67ee" />
          <span>{reviewLabel}</span>
        </div>

        <div className="app-reschedule-request-grid">
          {requestRows.map((row) => (
            <div key={row.label} className="app-reschedule-request-card">
              <span className="app-reschedule-request-label">{row.label}</span>
              <span className="app-reschedule-request-value">{row.value}</span>
            </div>
          ))}
        </div>

        <div className="app-reschedule-request-note">
          <h5>{noteLabel}</h5>
          <p>{noteValue || 'Not provided'}</p>
        </div>
      </div>
    );
  };

  const renderAppointmentDetailsContent = (appointment: Appointment) => (
    (() => {
      const pet = getAppointmentPetData(appointment);
      return (
    <>
      <div className="app-pet-summary">
        <img
          src={pet.photoUrl}
          alt={pet.name}
          className="app-pet-thumb"
        />
        <div className="app-pet-name-badge">
          <h4>{pet.name}</h4>
          <p>{appointment.appointment_type}</p>
        </div>
      </div>

      <div className="app-info-row">
        <IoCutOutline size={18} color="#3d67ee" />
        <span className="app-info-label">Service:</span>
        <span className="app-info-value">{appointment.appointment_type}</span>
      </div>
      <div className="app-info-row">
        <IoCalendar size={18} color="#3d67ee" />
        <span className="app-info-label">Date:</span>
        <span className="app-info-value">{formatDate(appointment.appointment_date)}</span>
      </div>
      <div className="app-info-row">
        <IoTimeOutline size={18} color="#3d67ee" />
        <span className="app-info-label">Time:</span>
        <span className="app-info-value">{formatTime(appointment.appointment_time)}</span>
      </div>
      <div className="app-info-row">
        <IoPersonOutline size={18} color="#3d67ee" />
        <span className="app-info-label">Doctor:</span>
        <span className="app-info-value">{getAppointmentDoctorName(appointment)}</span>
      </div>
      <div className="app-info-row">
        <IoLocationOutline size={18} color="#3d67ee" />
        <span className="app-info-label">Branch:</span>
        <span className="app-info-value">{getAppointmentBranchName(appointment)}</span>
      </div>
      <div className="app-info-row">
        <IoEllipse size={18} color={getStatusColor(appointment.status)} />
        <span className="app-info-label">Status:</span>
        <span
          className="app-status-pill"
          style={{
            backgroundColor: `${getStatusColor(appointment.status)}20`,
            color: getStatusColor(appointment.status),
          }}
        >
          {capitalize(appointment.status)}
        </span>
      </div>

      {appointment.patient_reason && (
        <div className="app-notes-block">
          <h4>Notes</h4>
          <p>{appointment.patient_reason}</p>
        </div>
      )}

      {renderRescheduleRequestDetails(appointment)}
      {renderMedicalInformation(appointment)}
    </>
      );
    })()
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="app-view-root">

      {/* ── Alert ── */}
      {alertVisible && (
        <div className="app-modal-overlay" onClick={() => closeAlert()}>
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
                <button className="app-modal-btn app-modal-btn-cancel" onClick={() => closeAlert()}>Cancel</button>
              )}
              <button
                className={`app-modal-btn app-modal-btn-confirm ${alertConfig.type === 'error' ? 'app-modal-btn-error' : ''}`}
                onClick={() => {
                  const hasConfirmAction = Boolean(alertConfig.onConfirm);
                  closeAlert(!hasConfirmAction);
                  alertConfig.onConfirm?.();
                }}
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
                (() => {
                  const pet = getAppointmentPetData(item);
                  return (
                    <div
                      key={item.appointment_id}
                      className={`app-table-row ${selectedForDetails?.appointment_id === item.appointment_id ? 'selected' : ''}`}
                      onClick={() => openAppointmentDetails(item)}
                    >
                      <div className="app-table-cell app-service-cell" style={{flex:1.2}} title={item.appointment_type}>
                        {item.appointment_type}
                      </div>
                      <div className="app-table-cell app-pet-cell" style={{flex:1}}>
                        <img
                          src={pet.photoUrl}
                          alt={pet.name}
                          className="app-pet-card-thumb"
                        />
                        <div className="app-pet-card-copy">
                          <div className="app-pet-card-name">{pet.name}</div>
                          <div className="app-pet-card-breed">{pet.breed}</div>
                        </div>
                      </div>
                      <div className="app-table-cell app-schedule-cell" style={{flex:1.5}}>
                        <div className="app-schedule-date">{formatDate(item.appointment_date)}</div>
                        <div className="app-time-cell">{formatTime(item.appointment_time)}</div>
                      </div>
                      <div className="app-table-cell" style={{flex:0.9}}>
                        <span className="app-status-pill" style={{ backgroundColor: getStatusColor(item.status)+'20', color: getStatusColor(item.status) }}>
                          {capitalize(item.status)}
                        </span>
                      </div>
                    </div>
                  );
                })()
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
              (() => {
                const pet = getAppointmentPetData(selectedForDetails);
                return (
              <>
                <div className="app-pet-summary">
                  <img
                    src={pet.photoUrl}
                    alt={pet.name}
                    className="app-pet-thumb"
                  />
                  <div className="app-pet-name-badge">
                    <h4>{pet.name}</h4>
                    <p>{selectedForDetails.appointment_type}</p>
                  </div>
                </div>

                <div className="app-info-row"><IoCutOutline size={18} color="#3d67ee" /><span className="app-info-label">Service:</span><span className="app-info-value">{selectedForDetails.appointment_type}</span></div>
                <div className="app-info-row"><IoCalendar size={18} color="#3d67ee" /><span className="app-info-label">Date:</span><span className="app-info-value">{formatDate(selectedForDetails.appointment_date)}</span></div>
                <div className="app-info-row"><IoTimeOutline size={18} color="#3d67ee" /><span className="app-info-label">Time:</span><span className="app-info-value">{formatTime(selectedForDetails.appointment_time)}</span></div>
                <div className="app-info-row"><IoLocationOutline size={18} color="#3d67ee" /><span className="app-info-label">Branch:</span><span className="app-info-value">{getAppointmentBranchName(selectedForDetails)}</span></div>
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

                {renderRescheduleRequestDetails(selectedForDetails)}
                {renderMedicalInformation(selectedForDetails)}
              </>
                );
              })()
            ) : (
              <div className="app-empty-details">
                <IoDocumentTextOutline size={60} color="#ccc" />
                <p>Select an appointment to view details</p>
              </div>
            )}
          </div>

          {selectedForDetails && isActionable(selectedForDetails.status) && (
            <>
              <div className="app-action-bar">
                <button className="app-action-btn cancel" onClick={() => openCancel(selectedForDetails)} disabled={isMutating}>
                  <IoClose size={18} color="white" /><span>Cancel</span>
                </button>
                {canWithdrawSelectedReschedule ? (
                  <button
                    className="app-action-btn withdraw"
                    onClick={() => withdrawRescheduleRequest(selectedForDetails)}
                    disabled={isMutating}
                  >
                    <IoCloseCircleOutline size={18} color="white" /><span>Withdraw</span>
                  </button>
                ) : (
                  <button
                    className="app-action-btn reschedule"
                    onClick={() => openReschedule(selectedForDetails)}
                    disabled={isMutating || isSelectedRescheduleLocked}
                    title={isSelectedRescheduleLocked ? selectedRescheduleHelperMessage : undefined}
                  >
                    <IoCalendar size={18} color="white" /><span>Reschedule</span>
                  </button>
                )}
              </div>
              {isSelectedRescheduleLocked && (
                <div className="app-action-helper">
                  <IoInformationCircleOutline size={16} color="#3d67ee" />
                  <span>{selectedRescheduleHelperMessage}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════
          CANCEL MODAL
      ════════════════════════════════════════════ */}
      {detailsModalVisible && selectedForDetails && (
        <div className="app-modal-overlay app-details-modal-overlay" onClick={() => setDetailsModalVisible(false)}>
          <div className="app-modal-base app-modal-wide app-details-modal" onClick={e => e.stopPropagation()}>
            <button className="app-modal-close" onClick={() => setDetailsModalVisible(false)}>
              <IoClose size={24} color="#999" />
            </button>
            <div className="app-details-modal-header">
              <h3>Appointment Details</h3>
            </div>
            <div className="app-details-modal-body">
              {renderAppointmentDetailsContent(selectedForDetails)}
            </div>
            {isActionable(selectedForDetails.status) && (
              <>
                <div className="app-action-bar app-action-bar-modal">
                  <button className="app-action-btn cancel" onClick={() => openCancel(selectedForDetails)} disabled={isMutating}>
                    <IoClose size={18} color="white" />
                    <span>Cancel</span>
                  </button>
                  {canWithdrawSelectedReschedule ? (
                    <button
                      className="app-action-btn withdraw"
                      onClick={() => withdrawRescheduleRequest(selectedForDetails)}
                      disabled={isMutating}
                    >
                      <IoCloseCircleOutline size={18} color="white" />
                      <span>Withdraw</span>
                    </button>
                  ) : (
                    <button
                      className="app-action-btn reschedule"
                      onClick={() => openReschedule(selectedForDetails)}
                      disabled={isMutating || isSelectedRescheduleLocked}
                      title={isSelectedRescheduleLocked ? selectedRescheduleHelperMessage : undefined}
                    >
                      <IoCalendar size={18} color="white" />
                      <span>Reschedule</span>
                    </button>
                  )}
                </div>
                {isSelectedRescheduleLocked && (
                  <div className="app-action-helper">
                    <IoInformationCircleOutline size={16} color="#3d67ee" />
                    <span>{selectedRescheduleHelperMessage}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {cancelModalVisible && cancelTarget && (
        <div className="app-modal-overlay" onClick={() => closeCancelModal()}>
          <div className="app-modal-base app-modal-wide app-cancel-modal" onClick={e => e.stopPropagation()}>
            <button className="app-modal-close" onClick={() => closeCancelModal()}><IoClose size={24} color="#999" /></button>
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
                  <div className="app-step-guide"><h3>Review Cancellation</h3><p>Please double-check the appointment details before confirming.</p></div>
                  <div className="app-summary-card">
                    <div className="app-card-header"><IoCalendar size={18} color="#3d67ee" /><h4>Appointment Details</h4></div>
                    <div className="app-card-body">
                      <div className="app-summary-line"><span className="app-summary-tag">Pet:</span><span className="app-summary-data">{getAppointmentPetData(cancelTarget).name}</span></div>
                      <div className="app-summary-line"><span className="app-summary-tag">Service:</span><span className="app-summary-data">{cancelTarget.appointment_type}</span></div>
                      <div className="app-summary-line"><span className="app-summary-tag">Date:</span><span className="app-summary-data">{formatDate(cancelTarget.appointment_date)}</span></div>
                      <div className="app-summary-line"><span className="app-summary-tag">Time:</span><span className="app-summary-data">{formatTime(cancelTarget.appointment_time)}</span></div>
                      <div className="app-summary-line"><span className="app-summary-tag">Doctor:</span><span className="app-summary-data">{getAppointmentDoctorName(cancelTarget)}</span></div>
                      <div className="app-summary-line"><span className="app-summary-tag">Branch:</span><span className="app-summary-data">{getAppointmentBranchName(cancelTarget)}</span></div>
                      <div className="app-summary-line"><span className="app-summary-tag">Status:</span><span className="app-summary-data">{capitalize(cancelTarget.status)}</span></div>
                    </div>
                  </div>
                  {cancelReason && (
                    <div className="app-reason-card">
                      <div className="app-card-header"><IoDocumentTextOutline size={18} color="#ee3d5a" /><h4>Your Reason</h4></div>
                      <div className="app-card-body"><p className="app-quote-text">{cancelReason.trim()}</p></div>
                    </div>
                  )}
                  <div className="app-info-banner">
                    <IoInformationCircleOutline size={18} color="#3d67ee" />
                    <span>Your cancellation reason will be included in the clinic notification.</span>
                  </div>
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
                  : <button className="app-btn-outline" onClick={() => closeCancelModal()}><IoClose size={16} /> Close</button>}
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
        <div className="app-modal-overlay" onClick={() => closeRescheduleModal()}>
          <div className="app-modal-base app-modal-wide app-reschedule-modal" onClick={e => e.stopPropagation()}>
            <button className="app-modal-close" onClick={() => closeRescheduleModal()}><IoClose size={24} color="#999" /></button>
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
                    <label style={{ display:'block', marginBottom:10, fontSize:14, color:'#333', fontWeight:600 }}>Select New Date</label>
                    <div style={{ border: '1px solid #ddd', borderRadius: '12px', padding: '15px', backgroundColor: '#fafafa' }}>
                      <RescheduleCalendar
                        selectedDate={newDate}
                        onSelectDate={(selectedDate) => {
                          setNewDate(selectedDate);
                          setNewTime('');
                        }}
                        availableDays={rescheduleAvailableDays}
                        specialDates={rescheduleSpecialDates}
                        disablePastDates
                      />
                    </div>
                    {newDate && (
                      <div style={{ backgroundColor: '#e8f5e9', padding: '10px', borderRadius: '6px', marginTop: '10px', color: '#2e7d32', fontWeight: '600', fontSize: '13px' }}>
                        Selected: {formatCalendarDateLabel(newDate)}
                      </div>
                    )}

                    <div className="app-time-panel">
                      <div className="app-time-header">
                        <IoTimeOutline size={18} color="#3d67ee" />
                        <h4>Select New Time Slot</h4>
                        {loadingRescheduleSlots && <span style={{ fontSize: '12px', color: '#999', fontWeight: 400 }}>Loading...</span>}
                      </div>

                      {!newDate ? (
                        <div className="app-no-slots">
                          <IoAlertCircleOutline size={24} color="#999" />
                          <p>Please select a date first</p>
                        </div>
                      ) : rescheduleTimeSlots.length > 0 ? (
                        <>
                          <div className="app-time-grid">
                            {rescheduleTimeSlots.map((slot) => (
                              <button
                                key={slot.id}
                                className={`app-time-option ${newTime === slot.startTime ? 'selected' : ''}`}
                                onClick={() => setNewTime(slot.startTime)}
                              >
                                <IoTimeOutline size={14} />
                                <span>{slot.displayText}</span>
                              </button>
                            ))}
                          </div>
                          {newTime && (
                            <div style={{ backgroundColor: '#e8f5e9', padding: '10px', borderRadius: '6px', marginTop: '10px', color: '#2e7d32', fontWeight: '600', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <IoCheckmarkCircleOutline size={16} />
                              Selected: {formatTime(newTime)}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="app-no-slots">
                          <IoAlertCircleOutline size={24} color="#999" />
                          <p>No time slots configured for this date</p>
                        </div>
                      )}
                    </div>
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
                      <div className="app-summary-line"><span className="app-summary-tag">Time:</span><span className="app-summary-data">{formatTime(rescheduleTarget.appointment_time)}</span></div>
                    </div>
                  </div>
                  <div className="app-summary-card new">
                    <div className="app-card-header"><IoCalendar size={18} color="#00aa00" /><h4>Requested Schedule</h4></div>
                    <div className="app-card-body">
                      <div className="app-summary-line"><span className="app-summary-tag">Date:</span><span className="app-summary-data highlight">{formatDate(newDate)}</span></div>
                      <div className="app-summary-line"><span className="app-summary-tag">Time:</span><span className="app-summary-data highlight">{formatTime(newTime)}</span></div>
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
                  : <button className="app-btn-outline" onClick={() => closeRescheduleModal()}><IoClose size={16} /> Cancel</button>}
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
