import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Web icons equivalent to Ionicons
import { 
  IoHomeOutline, IoPeopleOutline, IoChevronDownOutline, IoChevronUpOutline,
  IoPersonOutline, IoMedkitOutline, IoCalendarClearOutline, IoCalendarOutline,
  IoTodayOutline, IoTimeOutline, IoDocumentTextOutline, IoSettingsOutline,
  IoLogOutOutline, IoNotifications, IoCheckmarkCircleOutline, IoCloseCircleOutline,
  IoAlertCircleOutline, IoChevronUp, IoChevronDown, IoTrashOutline, IoClose, IoCreateOutline,
  IoChevronBack, IoChevronForward // 🟢 Restored Custom Calendar Icons
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

// ==========================================
//  0. CUSTOM CALENDAR COMPONENT (Restored)
// ==========================================
const getMonthStartFromDateKey = (dateKey?: string) => {
    if (!dateKey) return null;
    const [year, month] = dateKey.split('-').map(Number);
    if (!year || !month) return null;
    return new Date(year, month - 1, 1);
};

const CustomCalendar = ({ selectedDate, onSelectDate, bookedDates = {}, availableDays = null, disabledDates = {}, disabledAnnualDates = {}, disablePastDates = false, allowAllMonths = false }: any) => {
    const todayDate = new Date();
    const [currentMonth, setCurrentMonth] = useState(() => getMonthStartFromDateKey(selectedDate) || new Date(todayDate.getFullYear(), todayDate.getMonth(), 1));

    const minMonth = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
    const maxMonth = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 1);

    useEffect(() => {
        const selectedMonth = getMonthStartFromDateKey(selectedDate);
        if (selectedMonth && allowAllMonths) setCurrentMonth(selectedMonth);
    }, [allowAllMonths, selectedDate]);

    const canGoPrev = allowAllMonths || currentMonth > minMonth;
    const canGoNext = allowAllMonths || currentMonth < maxMonth;

    const nextMonth = () => { if (canGoNext) setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)); };
    const prevMonth = () => { if (canGoPrev) setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)); };

    const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

    const todayStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;

    const renderDays = () => {
        const daysInMonth = getDaysInMonth(currentMonth);
        const firstDay = getFirstDayOfMonth(currentMonth);
        const days = [];
        const monthStr = String(currentMonth.getMonth() + 1).padStart(2, '0');
        const yearStr = currentMonth.getFullYear();

        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} style={{ width: '40px', height: '40px' }}></div>);
        }

        const dayNamesList = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

        for (let i = 1; i <= daysInMonth; i++) {
            const dayStr = String(i).padStart(2, '0');
            const fullDate = `${yearStr}-${monthStr}-${dayStr}`;
            
            const dayOfWeek = new Date(yearStr, currentMonth.getMonth(), i).getDay();
            const dayName = dayNamesList[dayOfWeek];

            const isSelected = selectedDate === fullDate;
            const isToday = fullDate === todayStr; 
            const hasAppointment = bookedDates[fullDate];
            const isExactDateDisabled = Array.isArray(disabledDates)
              ? disabledDates.includes(fullDate)
              : Boolean(disabledDates[fullDate]);
            const annualDateKey = `${monthStr}-${dayStr}`;
            const isAnnualDateDisabled = Array.isArray(disabledAnnualDates)
              ? disabledAnnualDates.includes(annualDateKey)
              : Boolean(disabledAnnualDates[annualDateKey]);

            const isPast = disablePastDates && fullDate < todayStr;
            const isUnavailableDay = availableDays && availableDays[dayName] === false;
            const isDisabled = isPast || isUnavailableDay || isExactDateDisabled || isAnnualDateDisabled;

            let bgColor = 'transparent';
            let textColor = isDisabled ? '#d3d3d3' : '#333';
            let fontWeight = '400';
            let cursor = isDisabled ? 'not-allowed' : 'pointer';

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
                        width: '40px', height: '40px', display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', cursor: cursor,
                        backgroundColor: bgColor, color: textColor,
                        borderRadius: '50%', position: 'relative',
                        fontSize: '14px', fontWeight: fontWeight,
                        transition: 'all 0.2s ease', opacity: isDisabled ? 0.6 : 1
                    }}
                >
                    {i}
                    {hasAppointment && (
                        <div style={{ 
                            width: '5px', height: '5px', 
                            backgroundColor: isSelected ? 'white' : (isDisabled ? '#ccc' : '#3d67ee'), 
                            borderRadius: '50%', position: 'absolute', bottom: '2px' 
                        }}></div>
                    )}
                </div>
            );
        }
        return days;
    };

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    return (
        <div style={{ width: '100%', userSelect: 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '0 10px' }}>
                <button onClick={prevMonth} type="button" disabled={!canGoPrev} style={{ background: 'none', border: 'none', cursor: canGoPrev ? 'pointer' : 'not-allowed', color: canGoPrev ? '#3d67ee' : '#ccc', display: 'flex', alignItems: 'center' }}><IoChevronBack size={18} /></button>
                <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0, color: '#111' }}>{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</h3>
                <button onClick={nextMonth} type="button" disabled={!canGoNext} style={{ background: 'none', border: 'none', cursor: canGoNext ? 'pointer' : 'not-allowed', color: canGoNext ? '#3d67ee' : '#ccc', display: 'flex', alignItems: 'center' }}><IoChevronForward size={18} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px', textAlign: 'center', marginBottom: '15px' }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (<div key={day} style={{ fontSize: '12px', color: '#a0a0a0', fontWeight: '600' }}>{day}</div>))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px 5px', justifyItems: 'center', minHeight: '200px' }}>{renderDays()}</div>
        </div>
    );
};

// ==========================================
//  TIME SELECTOR COMPONENT
// ==========================================
const TimeSelector = ({ label, value, onChange }: any) => {
  const parseTime = (timeStr: string) => {
    if (!timeStr) return { hours: 8, minutes: 0, isAM: true };
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (match) {
      let h = parseInt(match[1]);
      const m = parseInt(match[2]);
      const ampm = match[3]?.toUpperCase();
      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      return { hours: h > 12 ? h - 12 : h, minutes: m, isAM: h < 12 };
    }
    return { hours: 8, minutes: 0, isAM: true };
  };

  const initialTime = parseTime(value);
  const [hours, setHours] = useState(initialTime.hours);
  const [minutes, setMinutes] = useState(initialTime.minutes);
  const [isAM, setIsAM] = useState(initialTime.isAM);

  useEffect(() => {
    const newTime = parseTime(value);
    setHours(newTime.hours);
    setMinutes(newTime.minutes);
    setIsAM(newTime.isAM);
  }, [value]);

  const updateTime = (newHours: number, newMinutes: number, newIsAM: boolean) => {
    const displayTime = `${newHours}:${newMinutes.toString().padStart(2, '0')} ${newIsAM ? 'AM' : 'PM'}`;
    onChange(displayTime);
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: '8px', padding: '10px' }}>
        
        {/* Hours */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
          <button onClick={() => { const newHours = hours === 12 ? 1 : hours + 1; setHours(newHours); updateTime(newHours, minutes, isAM); }} style={{ padding: '5px', background: 'none', border: 'none', cursor: 'pointer' }}>
            <IoChevronUp size={20} color="#3d67ee" />
          </button>
          <span style={{ fontSize: '18px', fontWeight: '600', margin: '5px 0' }}>{hours.toString().padStart(2, '0')}</span>
          <button onClick={() => { const newHours = hours === 1 ? 12 : hours - 1; setHours(newHours); updateTime(newHours, minutes, isAM); }} style={{ padding: '5px', background: 'none', border: 'none', cursor: 'pointer' }}>
            <IoChevronDown size={20} color="#3d67ee" />
          </button>
          <span style={{ fontSize: '10px', color: '#666', marginTop: '5px' }}>HOURS</span>
        </div>

        <span style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 5px' }}>:</span>

        {/* Minutes */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
          <button onClick={() => { const newMinutes = (minutes + 1) % 60; setMinutes(newMinutes); updateTime(hours, newMinutes, isAM); }} style={{ padding: '5px', background: 'none', border: 'none', cursor: 'pointer' }}>
            <IoChevronUp size={20} color="#3d67ee" />
          </button>
          <span style={{ fontSize: '18px', fontWeight: '600', margin: '5px 0' }}>{minutes.toString().padStart(2, '0')}</span>
          <button onClick={() => { const newMinutes = minutes === 0 ? 59 : minutes - 1; setMinutes(newMinutes); updateTime(hours, newMinutes, isAM); }} style={{ padding: '5px', background: 'none', border: 'none', cursor: 'pointer' }}>
            <IoChevronDown size={20} color="#3d67ee" />
          </button>
          <span style={{ fontSize: '10px', color: '#666', marginTop: '5px' }}>MINUTES</span>
        </div>

        {/* AM/PM */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
          <button onClick={() => { setIsAM(true); updateTime(hours, minutes, true); }} style={{ padding: '8px', backgroundColor: isAM ? '#3d67ee' : 'transparent', color: isAM ? 'white' : '#666', border: 'none', borderRadius: '5px', marginBottom: '5px', cursor: 'pointer', fontWeight: isAM ? 'bold' : 'normal', width: '100%' }}>
            AM
          </button>
          <button onClick={() => { setIsAM(false); updateTime(hours, minutes, false); }} style={{ padding: '8px', backgroundColor: !isAM ? '#3d67ee' : 'transparent', color: !isAM ? 'white' : '#666', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: !isAM ? 'bold' : 'normal', width: '100%' }}>
            PM
          </button>
        </div>
      </div>
      <div style={{ marginTop: '5px', fontSize: '12px', color: '#666', textAlign: 'center' }}>
        Selected: {hours}:{minutes.toString().padStart(2, '0')} {isAM ? 'AM' : 'PM'}
      </div>
    </div>
  );
};

// 🟢 NEW: Helper to convert 12h time (9:00 AM) to 24h time (09:00:00) for Supabase
const formatTo24Hour = (timeStr: string) => {
    if (!timeStr) return '';
    if (!timeStr.includes('AM') && !timeStr.includes('PM')) {
      return timeStr.length === 5 ? `${timeStr}:00` : timeStr;
    }
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = match[2];
      const ampm = match[3].toUpperCase();
      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
      return `${hours.toString().padStart(2, '0')}:${minutes}:00`;
    }
    return timeStr;
};

// Helper to format back to AM/PM for the UI
const formatToAMPM = (timeStr: string) => {
    if (!timeStr) return '';
    if (timeStr.includes('AM') || timeStr.includes('PM')) return timeStr;
    const [hours, minutes] = timeStr.split(':');
    let h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h.toString().padStart(2, '0')}:${minutes} ${ampm}`;
};

const timeToMinutes = (timeStr: string) => {
    const normalized = formatTo24Hour(timeStr);
    const [hours, minutes] = normalized.split(':').map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return NaN;
    return hours * 60 + minutes;
};

const minutesToDbTime = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
};

const formatToTimeInput = (timeStr: string) => {
    const normalized = formatTo24Hour(timeStr);
    return normalized ? normalized.slice(0, 5) : '';
};

const createBreakTimeRow = (startTime = '', endTime = '') => ({
    id: `break-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    startTime,
    endTime
});

const getSpecialEventName = (event: any) => event?.event_name || event?.name || 'Special Event';
const getSpecialEventDate = (event: any) => event?.event_date || event?.date || '';
const getSpecialEventDescription = (event: any) => event?.event_description || event?.description || '';
const getSpecialEventRecurrence = (event: any) => {
  const rawValue = String(event?.event_recurrence || event?.recurrence_type || 'once').toLowerCase();
  return rawValue === 'annual' || rawValue === 'yearly' ? 'annual' : 'once';
};
const getSpecialEventMonth = (event: any) => {
  const eventMonth = Number(event?.event_month);
  if (eventMonth) return eventMonth;
  const eventDate = getSpecialEventDate(event);
  return eventDate ? Number(eventDate.split('-')[1]) : 0;
};
const getSpecialEventDay = (event: any) => {
  const eventDay = Number(event?.event_day);
  if (eventDay) return eventDay;
  const eventDate = getSpecialEventDate(event);
  return eventDate ? Number(eventDate.split('-')[2]) : 0;
};
const getAnnualDateKey = (month: number, day: number) =>
  `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
const getAnnualDateKeyFromDate = (dateKey: string) => {
  const [, month, day] = dateKey.split('-');
  return month && day ? `${month}-${day}` : '';
};
const getSpecialEventDisplayDate = (event: any) => {
  if (getSpecialEventRecurrence(event) === 'annual') {
    const month = getSpecialEventMonth(event);
    const day = getSpecialEventDay(event);
    if (!month || !day) return 'Annual Event';
    return new Date(2024, month - 1, day).toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
  }
  return getSpecialEventDate(event);
};
const getSpecialEventIdentifier = (event: any) => {
  if (getSpecialEventRecurrence(event) === 'annual') {
    return `annual-${getAnnualDateKey(getSpecialEventMonth(event), getSpecialEventDay(event))}`;
  }
  return getSpecialEventDate(event);
};

// ==========================================
//  MAIN COMPONENT
// ==========================================
export default function AdminAvailSettings() {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = location.pathname === '/AvailSettings';

  const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:5000';

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [showAppointmentsDropdown, setShowAppointmentsDropdown] = useState(true);

  // LOGOUT POPUP STATE
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState<ModalConfigType>({ type: 'info', title: '', message: '', onConfirm: null, showCancel: false });

  const [deleteConfirmationVisible, setDeleteConfirmationVisible] = useState(false);
  const [slotToDelete, setSlotToDelete] = useState<any>(null);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>('');
  const [bookedDates, setBookedDates] = useState({});
  
  const [modalVisible, setModalVisible] = useState(false);
  const [modalVisible2, setModalVisible2] = useState(false);

  // Time slots storage
  const [timeSlotsByDay, setTimeSlotsByDay] = useState<any>({
    sunday: [], monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: []
  });

  const [currentEditingDay, setCurrentEditingDay] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [slotIntervalMinutes, setSlotIntervalMinutes] = useState('30');
  const [breakTimes, setBreakTimes] = useState<any[]>([]);

  const [dayAvailability, setDayAvailability] = useState<any>({
    sunday: false, monday: false, tuesday: false, wednesday: false, thursday: false, friday: false, saturday: false
  });

  const [specialDates, setSpecialDates] = useState<any[]>([]);
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventRecurrence, setEventRecurrence] = useState<'once' | 'annual'>('annual');
  const [editingSpecialDateOriginalDate, setEditingSpecialDateOriginalDate] = useState<string | null>(null);
  const [editingSpecialDateOriginalRecurrence, setEditingSpecialDateOriginalRecurrence] = useState<'once' | 'annual'>('once');
  const [editingSpecialDateOriginalMonth, setEditingSpecialDateOriginalMonth] = useState<number | null>(null);
  const [editingSpecialDateOriginalDay, setEditingSpecialDateOriginalDay] = useState<number | null>(null);

  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);

  const DEFAULT_START_TIME = '8:00 AM';
  const DEFAULT_END_TIME = '9:00 AM';

  const specialDateMap = useMemo(() => {
    return specialDates.reduce((dates: Record<string, boolean>, event: any) => {
      const dateKey = getSpecialEventRecurrence(event) === 'once' ? getSpecialEventDate(event) : '';
      if (dateKey) dates[dateKey] = true;
      return dates;
    }, {});
  }, [specialDates]);

  const annualSpecialDateMap = useMemo(() => {
    return specialDates.reduce((dates: Record<string, boolean>, event: any) => {
      if (getSpecialEventRecurrence(event) === 'annual') {
        const month = getSpecialEventMonth(event);
        const day = getSpecialEventDay(event);
        if (month && day) dates[getAnnualDateKey(month, day)] = true;
      }
      return dates;
    }, {});
  }, [specialDates]);

  const specialDateMapForForm = useMemo(() => {
    return specialDates.reduce((dates: Record<string, boolean>, event: any) => {
      const dateKey = getSpecialEventRecurrence(event) === 'once' ? getSpecialEventDate(event) : '';
      if (dateKey && !(editingSpecialDateOriginalRecurrence === 'once' && dateKey === editingSpecialDateOriginalDate)) dates[dateKey] = true;
      return dates;
    }, {});
  }, [editingSpecialDateOriginalDate, editingSpecialDateOriginalRecurrence, specialDates]);

  const annualSpecialDateMapForForm = useMemo(() => {
    return specialDates.reduce((dates: Record<string, boolean>, event: any) => {
      if (getSpecialEventRecurrence(event) === 'annual') {
        const month = getSpecialEventMonth(event);
        const day = getSpecialEventDay(event);
        const annualKey = month && day ? getAnnualDateKey(month, day) : '';
        const isCurrentEvent = editingSpecialDateOriginalRecurrence === 'annual' && month === editingSpecialDateOriginalMonth && day === editingSpecialDateOriginalDay;
        if (annualKey && !isCurrentEvent) dates[annualKey] = true;
      }
      return dates;
    }, {});
  }, [editingSpecialDateOriginalDay, editingSpecialDateOriginalMonth, editingSpecialDateOriginalRecurrence, specialDates]);

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
    loadInitialData();
    loadAppointmentsForCalendar(); 
  }, []);

  const loadInitialData = async () => {
    try {
      const dayData = await availabilityService.getDayAvailability();
      setDayAvailability(dayData);

      const loadedSpecialDates = await availabilityService.getSpecialDates();
      setSpecialDates(loadedSpecialDates);
      
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const slotsByDay: any = { ...timeSlotsByDay };
      
      for (const day of days) {
        const slots = await availabilityService.getTimeSlotsForDay(day);
        slotsByDay[day] = slots.map((slot: any) => ({
          id: slot.id,
          startTime: slot.start_time,
          endTime: slot.end_time
        }));
      }
      setTimeSlotsByDay(slotsByDay);
    } catch (error) {
      console.error('Failed to load initial data:', error);
    }
  };

  const loadAppointmentsForCalendar = async () => {
    try {
      const appointments = await availabilityService.getAppointmentsForTable();
      const booked: any = {};
      appointments.forEach((app: any) => {
        const dateTimeParts = app.date_time.split(' - ');
        if (dateTimeParts.length > 0) {
          const dateStr = dateTimeParts[0];
          const date = new Date(dateStr);
          if(!isNaN(date.getTime())) {
             const year = date.getFullYear();
             const month = String(date.getMonth() + 1).padStart(2, '0');
             const day = String(date.getDate()).padStart(2, '0');
             booked[`${year}-${month}-${day}`] = true;
          }
        }
      });
      setBookedDates(booked);
    } catch (error) {
      console.error('Failed to load appointments for calendar:', error);
    }
  };

  const handleDayToggle = async (dayName: string) => {
    const dayKey = dayName.toLowerCase();
    const newValue = !dayAvailability[dayKey];
    
    setDayAvailability((prev: any) => ({ ...prev, [dayKey]: newValue }));
    
    try {
      await availabilityService.saveDayAvailability(dayKey, newValue);
    } catch (error) {
      setDayAvailability((prev: any) => ({ ...prev, [dayKey]: !newValue }));
      console.error('Failed to save day availability:', error);
    }
  };

  const addBreakTime = () => {
    setBreakTimes((prev) => [...prev, createBreakTimeRow()]);
  };

  const updateBreakTime = (breakId: string, field: 'startTime' | 'endTime', value: string) => {
    setBreakTimes((prev) => prev.map((breakItem) => (
      breakItem.id === breakId ? { ...breakItem, [field]: value } : breakItem
    )));
  };

  const removeBreakTime = (breakId: string) => {
    setBreakTimes((prev) => prev.filter((breakItem) => breakItem.id !== breakId));
  };

  const buildSlotGeneratorSettingsPayload = () => ({
    opening_time: formatTo24Hour(startTime),
    closing_time: formatTo24Hour(endTime),
    interval_minutes: Number(slotIntervalMinutes) || 30,
    break_times: breakTimes
      .filter((breakItem) => breakItem.startTime && breakItem.endTime)
      .map((breakItem) => ({
        start_time: formatTo24Hour(breakItem.startTime),
        end_time: formatTo24Hour(breakItem.endTime)
      }))
  });

  const openTimeSlotModalForDay = async (dayName: string) => {
    const dayKey = dayName.toLowerCase();
    setCurrentEditingDay(dayKey);
    setModalVisible(true);
    setStartTime(DEFAULT_START_TIME);
    setEndTime(DEFAULT_END_TIME);
    setSlotIntervalMinutes('30');
    setBreakTimes([]);
    setLoadingTimeSlots(true);
    
    try {
      const [existingSlots, generatorSettings] = await Promise.all([
        availabilityService.getTimeSlotsForDay(dayKey),
        availabilityService.getTimeSlotGeneratorSettings(dayKey)
      ]);
      const formattedSlots = existingSlots.map((slot: any) => ({
        id: slot.id,
        startTime: slot.start_time,
        endTime: slot.end_time
      }));
      setTimeSlotsByDay((prev: any) => ({ ...prev, [dayKey]: formattedSlots }));
      if (generatorSettings) {
        setStartTime(formatToAMPM(generatorSettings.opening_time || generatorSettings.openingTime || DEFAULT_START_TIME));
        setEndTime(formatToAMPM(generatorSettings.closing_time || generatorSettings.closingTime || DEFAULT_END_TIME));
        setSlotIntervalMinutes(String(generatorSettings.interval_minutes || generatorSettings.intervalMinutes || 30));
        const savedBreaks = generatorSettings.break_times || generatorSettings.breakTimes || [];
        setBreakTimes(
          Array.isArray(savedBreaks)
            ? savedBreaks.map((item: any) => createBreakTimeRow(
                formatToTimeInput(item.start_time || item.startTime || item.start),
                formatToTimeInput(item.end_time || item.endTime || item.end)
              ))
            : []
        );
      }
    } catch (error) {
      console.error('Error loading slots:', error);
    } finally {
      setLoadingTimeSlots(false);
    }
  };

  const generateSlots = async () => {
    if (!currentEditingDay || !startTime.trim() || !endTime.trim()) {
      window.alert('Please select both opening and closing time.');
      return;
    }

    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    const intervalMinutes = Number(slotIntervalMinutes);

    if (Number.isNaN(startMinutes) || Number.isNaN(endMinutes) || startMinutes >= endMinutes) {
      window.alert('Invalid Time: Opening time must be before closing time.');
      return;
    }

    if (!Number.isInteger(intervalMinutes) || intervalMinutes < 5 || intervalMinutes > 240) {
      window.alert('Invalid Interval: Enter a whole number between 5 and 240 minutes.');
      return;
    }

    const normalizedBreaks = breakTimes
      .map((breakItem) => ({
        ...breakItem,
        startMinutes: timeToMinutes(breakItem.startTime),
        endMinutes: timeToMinutes(breakItem.endTime)
      }))
      .filter((breakItem) => Boolean(breakItem.startTime || breakItem.endTime));

    for (const breakItem of normalizedBreaks) {
      if (!breakItem.startTime || !breakItem.endTime) {
        window.alert('Please set both break start and break end, or remove the incomplete break row.');
        return;
      }
      if (
        Number.isNaN(breakItem.startMinutes) ||
        Number.isNaN(breakItem.endMinutes) ||
        breakItem.startMinutes >= breakItem.endMinutes
      ) {
        window.alert('Invalid Break Time: Break start must be before break end.');
        return;
      }
    }
    normalizedBreaks.sort((a, b) => a.startMinutes - b.startMinutes);

    const generatedSlots: any[] = [];
    let cursor = startMinutes;
    let safetyCounter = 0;

    while (cursor + intervalMinutes <= endMinutes && safetyCounter < 200) {
      const next = cursor + intervalMinutes;
      const overlappingBreak = normalizedBreaks.find((breakItem) => (
        cursor < breakItem.endMinutes && next > breakItem.startMinutes
      ));

      if (overlappingBreak) {
        cursor = Math.max(next, overlappingBreak.endMinutes);
      } else {
        generatedSlots.push({
          id: `temp-${currentEditingDay}-${cursor}-${next}`,
          startTime: minutesToDbTime(cursor),
          endTime: minutesToDbTime(next)
        });
        cursor = next;
      }
      safetyCounter += 1;
    }

    if (generatedSlots.length === 0) {
      window.alert('No slots were generated. Check the opening/closing time, interval, and break times.');
      return;
    }

    setTimeSlotsByDay((prev: any) => ({
      ...prev,
      [currentEditingDay]: generatedSlots
    }));

    try {
      await availabilityService.saveTimeSlotGeneratorSettings(
        currentEditingDay,
        buildSlotGeneratorSettingsPayload()
      );
    } catch (error) {
      console.error('Failed to save generated slot settings:', error);
      window.alert('Slots were generated, but the generator settings could not be saved. Please try Save Changes before closing.');
    }
  };

  const addEvent = async () => {
    const trimmedEventName = eventName.trim();
    const trimmedDescription = eventDescription.trim();
    const isEditing = Boolean(editingSpecialDateOriginalDate);

    if (!trimmedEventName || !eventDate) {
      window.alert('Please enter an event name and select a date.');
      return;
    }

    const selectedAnnualKey = getAnnualDateKeyFromDate(eventDate);
    if (eventRecurrence === 'annual' && annualSpecialDateMapForForm[selectedAnnualKey]) {
      window.alert('This annual special day already exists.');
      return;
    }

    if (eventRecurrence === 'once' && specialDateMapForForm[eventDate]) {
      window.alert('This date is already marked as a special date.');
      return;
    }

    try {
      const savedEvent = isEditing
        ? await availabilityService.updateSpecialDate(
            editingSpecialDateOriginalDate || getSpecialEventIdentifier({
              event_recurrence: editingSpecialDateOriginalRecurrence,
              event_month: editingSpecialDateOriginalMonth,
              event_day: editingSpecialDateOriginalDay
            }),
            trimmedEventName,
            eventDate,
            trimmedDescription,
            eventRecurrence,
            editingSpecialDateOriginalRecurrence,
            editingSpecialDateOriginalMonth,
            editingSpecialDateOriginalDay
          )
        : await availabilityService.saveSpecialDate(trimmedEventName, eventDate, trimmedDescription, eventRecurrence);
      const newEvent = savedEvent?.specialDate || {
        event_name: trimmedEventName,
        event_date: eventRecurrence === 'annual' ? null : eventDate,
        event_description: trimmedDescription,
        event_recurrence: eventRecurrence,
        event_month: Number(eventDate.split('-')[1]),
        event_day: Number(eventDate.split('-')[2])
      };

      setSpecialDates((prev) => {
        const withoutOldEvent = isEditing
          ? prev.filter((event) => getSpecialEventIdentifier(event) !== getSpecialEventIdentifier({
              event_recurrence: editingSpecialDateOriginalRecurrence,
              event_date: editingSpecialDateOriginalDate,
              event_month: editingSpecialDateOriginalMonth,
              event_day: editingSpecialDateOriginalDay
            }))
          : prev;
        return [...withoutOldEvent, newEvent].sort((a, b) => getSpecialEventIdentifier(a).localeCompare(getSpecialEventIdentifier(b)));
      });
      setEventName('');
      setEventDate('');
      setEventDescription('');
      setEventRecurrence('annual');
      setEditingSpecialDateOriginalDate(null);
      setEditingSpecialDateOriginalRecurrence('once');
      setEditingSpecialDateOriginalMonth(null);
      setEditingSpecialDateOriginalDay(null);
      setModalVisible2(false);
    } catch (error) {
      console.error('Failed to save special date:', error);
      window.alert('Failed to save special date. Please try again.');
    }
  };

  const openAddSpecialDateModal = () => {
    setEventName('');
    setEventDate('');
    setEventDescription('');
    setEventRecurrence('annual');
    setEditingSpecialDateOriginalDate(null);
    setEditingSpecialDateOriginalRecurrence('once');
    setEditingSpecialDateOriginalMonth(null);
    setEditingSpecialDateOriginalDay(null);
    setModalVisible2(true);
  };

  const openEditSpecialDateModal = (event: any) => {
    const dateKey = getSpecialEventDate(event);
    const recurrence = getSpecialEventRecurrence(event);
    const month = getSpecialEventMonth(event);
    const day = getSpecialEventDay(event);
    setEventName(getSpecialEventName(event));
    setEventDate(dateKey || `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    setEventDescription(getSpecialEventDescription(event));
    setEventRecurrence(recurrence);
    setEditingSpecialDateOriginalDate(dateKey);
    setEditingSpecialDateOriginalRecurrence(recurrence);
    setEditingSpecialDateOriginalMonth(month || null);
    setEditingSpecialDateOriginalDay(day || null);
    setModalVisible2(true);
  };

  const deleteSpecialDate = async (event: any) => {
    const dateKey = getSpecialEventDate(event) || getSpecialEventIdentifier(event);
    const eventTitle = getSpecialEventName(event);
    if (!dateKey) return;

    showAlert(
      'confirm',
      'Delete Special Date',
      `Delete ${eventTitle} on ${getSpecialEventDisplayDate(event)}?`,
      async () => {
        try {
          await availabilityService.deleteSpecialDate(
            dateKey,
            getSpecialEventRecurrence(event),
            getSpecialEventMonth(event),
            getSpecialEventDay(event)
          );
          setSpecialDates((prev) => prev.filter((item) => getSpecialEventIdentifier(item) !== getSpecialEventIdentifier(event)));
        } catch (error) {
          console.error('Failed to delete special date:', error);
          window.alert('Failed to delete special date. Please try again.');
        }
      },
      true
    );
  };

  const closeSpecialDateModal = () => {
    setModalVisible2(false);
    setEventName('');
    setEventDate('');
    setEventDescription('');
    setEventRecurrence('annual');
    setEditingSpecialDateOriginalDate(null);
    setEditingSpecialDateOriginalRecurrence('once');
    setEditingSpecialDateOriginalMonth(null);
    setEditingSpecialDateOriginalDay(null);
  };

  const deleteSlot = (slotId: any) => {
    if (!currentEditingDay) return;
    const slot = timeSlotsByDay[currentEditingDay].find((s: any) => s.id === slotId);
    if (!slot) return;
    
    setSlotToDelete(slot);
    setDeleteConfirmationVisible(true);
  };

  const confirmDeleteSlot = async () => {
    if (!slotToDelete) return;
    const slotId = slotToDelete.id;
    
    try {
      if (slotId.toString().startsWith('temp-')) {
        setTimeSlotsByDay((prev: any) => ({
          ...prev,
          [currentEditingDay]: prev[currentEditingDay].filter((s: any) => s.id !== slotId)
        }));
      } else {
        await availabilityService.deleteTimeSlot(slotId);
        setTimeSlotsByDay((prev: any) => ({
          ...prev,
          [currentEditingDay]: prev[currentEditingDay].filter((s: any) => s.id !== slotId)
        }));
      }
      setDeleteConfirmationVisible(false);
      setSlotToDelete(null);
    } catch (error) {
      console.error('Failed to delete slot:', error);
    }
  };

  // 🟢 RESTORED: Fixed Database Save function with 24-hour conversion & Temp ID blocking
  const saveTimeSlotsToDatabase = async () => {
    if (!currentEditingDay) { setModalVisible(false); return; }
    
    try {
      const currentSlots = timeSlotsByDay[currentEditingDay] || [];
      const generatorSettings = buildSlotGeneratorSettingsPayload();
      const slotsToSave = currentSlots.map((slot: any) => {
        // Send snake_case and 24-hour time formatting to avoid Supabase 400 Errors
        const payload: any = {
          start_time: formatTo24Hour(slot.startTime),
          end_time: formatTo24Hour(slot.endTime)
        };
        
        // Prevent 'temp-' generated IDs from crashing the database
        if (slot.id && !String(slot.id).startsWith('temp-')) {
          payload.id = slot.id;
        }
        
        return payload;
      });
      
      await availabilityService.saveTimeSlotGeneratorSettings(currentEditingDay, generatorSettings);
      await availabilityService.saveTimeSlots(currentEditingDay, slotsToSave);
      
      setModalVisible(false);
      setStartTime(DEFAULT_START_TIME);
      setEndTime(DEFAULT_END_TIME);
      setSlotIntervalMinutes('30');
      setBreakTimes([]);
      
      const updatedSlots = await availabilityService.getTimeSlotsForDay(currentEditingDay);
      const formattedSlots = updatedSlots.map((slot: any) => ({
        id: slot.id, 
        startTime: slot.start_time,
        endTime: slot.end_time
      }));
      
      setTimeSlotsByDay((prev: any) => ({ ...prev, [currentEditingDay]: formattedSlots }));
    } catch (error) {
      console.error('Failed to save time slots:', error);
    }
  };

  const cancelTimeSlotEditing = () => {
    if (currentEditingDay) {
      availabilityService.getTimeSlotsForDay(currentEditingDay)
        .then((existingSlots: any[]) => {
          const formattedSlots = existingSlots.map((slot: any) => ({
            id: slot.id,
            startTime: slot.start_time,
            endTime: slot.end_time
          }));
          setTimeSlotsByDay((prev: any) => ({ ...prev, [currentEditingDay]: formattedSlots }));
        })
        .catch((error: any) => {
          setTimeSlotsByDay((prev: any) => ({ ...prev, [currentEditingDay]: [] }));
        });
    }
    setModalVisible(false);
    setStartTime(DEFAULT_START_TIME);
    setEndTime(DEFAULT_END_TIME);
    setSlotIntervalMinutes('30');
    setBreakTimes([]);
  };

  const DAYS_OF_WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  return (
    <div className="biContainer">
      <Navbar currentUser={currentUser} onLogout={handleLogoutPress} />

      {/* BODY CONTENT */}
      <div className="bodyContainer">
        <div className="topContainer">
          <div className="subTopContainer">
            <IoDocumentTextOutline size={20} color="#3d67ee" style={{ marginTop: '2px' }} />
            <span className="blueText" style={{ marginLeft: '10px' }}>Appointments / Availability Settings</span>
          </div>
          <div className="subTopContainer" style={{ justifyContent: 'center', flex: 0.5, marginLeft: '12px' }}>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <IoNotifications size={21} color="#3d67ee" style={{ marginTop: '3px' }} />
            </button>
          </div>
        </div>

        {/* SETTINGS CONTAINER */}
        <div style={{ display: 'flex', flexDirection: 'row', gap: '20px', marginTop: '30px', height: '85%' }}>
          
          {/* LEFT SIDE (Calendar & Events) */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', minWidth: '300px' }}>
            
            {/* 🟢 RESTORED: Custom Calendar replaces standard date input */}
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '20px', boxShadow: '0 0 18px rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '15px', color: '#333' }}>Check Booked Dates</h3>
                <CustomCalendar 
                    selectedDate={selectedCalendarDate} 
                    onSelectDate={setSelectedCalendarDate} 
                    bookedDates={bookedDates} 
                    disabledDates={specialDateMap}
                    disabledAnnualDates={annualSpecialDateMap}
                    availableDays={dayAvailability} /* 🟢 NEW: Grays out toggled-off days! */
                />
                <div style={{ marginTop: '15px', fontSize: '12px', color: '#888', fontStyle: 'italic' }}>
                    <p>Use this reference tool to see which dates have active appointments before closing slots.</p>
                </div>
            </div>

            {/* Special Dates Section */}
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '20px', flex: 1, boxShadow: '0 0 18px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '15px' }}>Special Dates</h3>
              
              <div style={{ overflowY: 'auto', flex: 1, marginBottom: '15px' }}>
                <table className="dataTable" style={{ width: '100%' }}>
                    <thead>
                        <tr>
                            <th style={{ textAlign: 'left', paddingBottom: '10px', borderBottom: '1px solid #eee' }}>Event</th>
                            <th style={{ textAlign: 'right', paddingBottom: '10px', borderBottom: '1px solid #eee' }}>Date</th>
                            <th style={{ textAlign: 'right', paddingBottom: '10px', borderBottom: '1px solid #eee' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {specialDates.length === 0 ? (
                            <tr><td colSpan={3} style={{ textAlign: 'center', padding: '20px', color: '#999', fontStyle: 'italic' }}>No special dates added.</td></tr>
                        ) : (
                            specialDates.map((item, index) => {
                              const description = getSpecialEventDescription(item);
                              return (
                                <tr key={`${getSpecialEventDate(item)}-${index}`}>
                                    <td style={{ padding: '10px 0', fontSize: '13px' }}>
                                      <div style={{ fontWeight: 600 }}>{getSpecialEventName(item)}</div>
                                      {description && (
                                        <div style={{ color: '#777', fontSize: '12px', marginTop: '4px', lineHeight: 1.35 }}>
                                          {description}
                                        </div>
                                      )}
                                    </td>
                                    <td style={{ padding: '10px 0', fontSize: '13px', textAlign: 'right' }}>
                                      <div>{getSpecialEventDisplayDate(item)}</div>
                                      <div style={{ color: '#777', fontSize: '11px', marginTop: '4px', textTransform: 'capitalize' }}>
                                        {getSpecialEventRecurrence(item) === 'annual' ? 'Every year' : 'One-time'}
                                      </div>
                                    </td>
                                    <td style={{ padding: '10px 0', textAlign: 'right' }}>
                                      <div style={{ display: 'inline-flex', gap: '8px', justifyContent: 'flex-end' }}>
                                        <button
                                          type="button"
                                          onClick={() => openEditSpecialDateModal(item)}
                                          title="Edit special date"
                                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                                        >
                                          <IoCreateOutline size={18} color="#3d67ee" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => deleteSpecialDate(item)}
                                          title="Delete special date"
                                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                                        >
                                          <IoTrashOutline size={18} color="#d32f2f" />
                                        </button>
                                      </div>
                                    </td>
                                </tr>
                              );
                            })
                        )}
                    </tbody>
                </table>
              </div>

              <button 
                onClick={openAddSpecialDateModal}
                className="gradientBtn submitBtn" 
                style={{ width: '100%', padding: '12px', margin: 0 }}
              >
                + Add Special Date
              </button>
            </div>
          </div>

          {/* RIGHT SIDE (Availability Toggles) */}
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '20px', flex: 2, overflowY: 'auto', boxShadow: '0 0 18px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize: '28px', fontWeight: '700', margin: 0 }}>Availability Settings</h2>
            <p style={{ fontSize: '14px', marginTop: '10px', color: '#888' }}>Manage available days, working hours, and appointment slots for vet bookings.</p>

            <div style={{ marginTop: '20px' }}>
              {DAYS_OF_WEEK.map((day) => (
                <React.Fragment key={day}>
                  <div style={{ display: 'flex', alignItems: 'center', opacity: dayAvailability[day] ? 1 : 0.6, padding: '15px 0' }}>
                    <label className="switch" style={{ margin: 0, marginRight: '20px' }}>
                      <input 
                        type="checkbox" 
                        checked={dayAvailability[day]} 
                        onChange={() => handleDayToggle(day)} 
                      />
                      <span className="slider"></span>
                    </label>
                    <span style={{ fontSize: '16px', fontWeight: '500', color: dayAvailability[day] ? '#000' : '#666', width: '100px', textTransform: 'capitalize' }}>
                      {day}
                    </span>
                    
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                        <button 
                        onClick={() => dayAvailability[day] && openTimeSlotModalForDay(day)}
                        disabled={!dayAvailability[day]}
                        style={{
                            display: 'flex', alignItems: 'center', background: 'none', border: 'none', 
                            cursor: dayAvailability[day] ? 'pointer' : 'not-allowed',
                            color: dayAvailability[day] ? '#3d67ee' : '#999',
                            fontWeight: '600', fontSize: '15px'
                        }}
                        >
                        <span>Time Slot</span>
                        <IoTimeOutline size={18} style={{ marginLeft: '8px' }} />
                        </button>
                    </div>
                  </div>
                  {day !== 'saturday' && <div style={{ height: '1px', backgroundColor: '#f0f0f0' }}></div>}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* TIME SLOTS EDITOR MODAL */}
        {modalVisible && (
          <div className="modalOverlay">
            <div className="modalContainer" style={{ width: '70%', maxWidth: '800px', display: 'flex', flexDirection: 'column', padding: '30px', maxHeight: '85%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>
                  {currentEditingDay ? `Time Slots for ${currentEditingDay.charAt(0).toUpperCase() + currentEditingDay.slice(1)}` : 'Time Slots'}
                </h2>
                <button onClick={cancelTimeSlotEditing} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <IoClose size={24} color="#333" />
                </button>
              </div>

              {loadingTimeSlots ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="spinner"></div></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'row', gap: '30px', flex: 1, overflow: 'hidden' }}>
                  
                  {/* Left Section: Time Inputs */}
                  <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px' }}>
                    <TimeSelector label="Opening Time" value={startTime} onChange={setStartTime} />
                    <TimeSelector label="Closing Time" value={endTime} onChange={setEndTime} />
                    <div className="formGroup">
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: '#333' }}>
                        Slot Interval
                      </label>
                      <input
                        type="number"
                        min="5"
                        max="240"
                        step="5"
                        placeholder="30"
                        value={slotIntervalMinutes}
                        onChange={(event) => setSlotIntervalMinutes(event.target.value.replace(/[^\d]/g, ''))}
                        className="formInput"
                      />
                      <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#64748b' }}>
                        Minutes per generated appointment slot.
                      </p>
                    </div>

                    <div className="formGroup">
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: '#333' }}>
                        Break Times
                      </label>
                      {breakTimes.length === 0 ? (
                        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>
                          No break time configured.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {breakTimes.map((breakItem) => (
                            <div
                              key={breakItem.id}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr auto',
                                gap: '8px',
                                alignItems: 'center'
                              }}
                            >
                              <input
                                type="time"
                                value={breakItem.startTime}
                                onChange={(event) => updateBreakTime(breakItem.id, 'startTime', event.target.value)}
                                className="formInput"
                                aria-label="Break start time"
                              />
                              <input
                                type="time"
                                value={breakItem.endTime}
                                onChange={(event) => updateBreakTime(breakItem.id, 'endTime', event.target.value)}
                                className="formInput"
                                aria-label="Break end time"
                              />
                              <button
                                type="button"
                                onClick={() => removeBreakTime(breakItem.id)}
                                title="Remove break time"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px' }}
                              >
                                <IoTrashOutline size={18} color="#d32f2f" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#64748b' }}>
                        Optional. Generated slots that overlap these ranges are skipped.
                      </p>
                      <button
                        type="button"
                        onClick={addBreakTime}
                        style={{
                          width: '100%',
                          marginTop: '10px',
                          padding: '10px 12px',
                          border: '1px solid #d9e1f2',
                          borderRadius: '8px',
                          backgroundColor: '#fff',
                          color: '#3d67ee',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        + Add Another Break Time
                      </button>
                    </div>

                    <button onClick={generateSlots} className="gradientBtn submitBtn" style={{ width: '100%', margin: 0, marginTop: '10px' }}>
                      Generate Slots
                    </button>
                  </div>

                  {/* Right Section: Slots Table */}
                  <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', borderLeft: '1px solid #eee', paddingLeft: '30px' }}>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                      <table className="dataTable" style={{ width: '100%' }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left' }}>Start</th>
                            <th style={{ textAlign: 'left' }}>End</th>
                            <th style={{ textAlign: 'right' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {timeSlotsByDay[currentEditingDay]?.length === 0 ? (
                            <tr><td colSpan={3} style={{ textAlign: 'center', padding: '30px', color: '#999', fontStyle: 'italic' }}>No time slots configured</td></tr>
                          ) : (
                            timeSlotsByDay[currentEditingDay]?.map((item: any) => (
                              <tr key={item.id}>
                                <td>{formatToAMPM(item.startTime)}</td>
                                <td>{formatToAMPM(item.endTime)}</td>
                                <td style={{ textAlign: 'right' }}>
                                  <button onClick={() => deleteSlot(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                    <IoTrashOutline size={20} color="#d32f2f" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                    {currentEditingDay && timeSlotsByDay[currentEditingDay] && (
                      <div style={{ textAlign: 'center', fontSize: '12px', color: '#666', marginTop: '15px' }}>
                        {timeSlotsByDay[currentEditingDay].length} time slot(s) configured
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
                <button onClick={cancelTimeSlotEditing} style={{ padding: '10px 25px', backgroundColor: '#f5f5f5', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#d32f2f', fontWeight: '600' }}>Cancel</button>
                <button onClick={saveTimeSlotsToDatabase} style={{ padding: '10px 25px', backgroundColor: '#3d67ee', border: 'none', borderRadius: '8px', cursor: 'pointer', color: 'white', fontWeight: '600' }}>Save Changes</button>
              </div>
            </div>
          </div>
        )}

        {/* ADD SPECIAL DATE MODAL */}
        {modalVisible2 && (
          <div className="modalOverlay">
            <div className="modalContainer" style={{ width: '430px', maxWidth: '92vw', maxHeight: '90vh', overflowY: 'auto', padding: '30px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '20px' }}>
                {editingSpecialDateOriginalDate ? 'Edit Special Event' : 'Add Special Event'}
              </h2>
              
              <div className="formGroup">
                <input type="text" placeholder="Event Name" value={eventName} onChange={(e) => setEventName(e.target.value)} className="formInput" />
              </div>
              <div className="formGroup">
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: '#333' }}>
                  Special Event Type
                </label>
                <select
                  value={eventRecurrence}
                  onChange={(e) => setEventRecurrence(e.target.value as 'once' | 'annual')}
                  className="formInput"
                >
                  <option value="annual">Annual Event</option>
                  <option value="once">One-time Date</option>
                </select>
              </div>
              <div className="formGroup">
                <textarea
                  placeholder="Event Description"
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  className="formInput"
                  rows={3}
                  style={{ resize: 'vertical', minHeight: '76px', paddingTop: '12px' }}
                />
              </div>
              <div className="formGroup">
                <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: '#333' }}>Event Date</div>
                <CustomCalendar
                  selectedDate={eventDate}
                  onSelectDate={setEventDate}
                  disabledDates={specialDateMapForForm}
                  disabledAnnualDates={annualSpecialDateMapForForm}
                  allowAllMonths={true}
                />
                <div style={{ marginTop: '10px', fontSize: '12px', color: eventDate ? '#3d67ee' : '#777', fontWeight: eventDate ? 600 : 400 }}>
                  {eventDate
                    ? eventRecurrence === 'annual'
                      ? `Selected: ${getSpecialEventDisplayDate({ event_recurrence: 'annual', event_month: Number(eventDate.split('-')[1]), event_day: Number(eventDate.split('-')[2]) })} every year`
                      : `Selected: ${eventDate}`
                    : 'Select any date to close it for appointments.'}
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '10px', marginTop: '25px' }}>
                <button onClick={closeSpecialDateModal} style={{ flex: 1, padding: '10px', backgroundColor: '#f5f5f5', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#d32f2f', fontWeight: '600' }}>Cancel</button>
                <button onClick={addEvent} style={{ flex: 1, padding: '10px', backgroundColor: '#3d67ee', border: 'none', borderRadius: '8px', cursor: 'pointer', color: 'white', fontWeight: '600' }}>
                  {editingSpecialDateOriginalDate ? 'Save Changes' : '+ Add Event'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DELETE CONFIRMATION MODAL */}
        {deleteConfirmationVisible && (
          <div className="modalOverlay">
            <div className="modalContainer" style={{ width: '40%', maxWidth: '400px', padding: '30px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '15px' }}>Delete Time Slot</h2>
              <p style={{ fontSize: '16px', marginBottom: '25px', color: '#555' }}>
                Are you sure you want to delete {slotToDelete ? `${formatToAMPM(slotToDelete.startTime)} - ${formatToAMPM(slotToDelete.endTime)}` : 'this time slot'}?
              </p>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button onClick={() => { setDeleteConfirmationVisible(false); setSlotToDelete(null); }} style={{ padding: '8px 16px', borderRadius: '5px', border: 'none', backgroundColor: '#e0e0e0', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
                <button onClick={confirmDeleteSlot} style={{ padding: '8px 16px', borderRadius: '5px', border: 'none', backgroundColor: '#d32f2f', color: 'white', cursor: 'pointer', fontWeight: '600' }}>Delete</button>
              </div>
            </div>
          </div>
        )}

        {/* LOGOUT/ALERT MODAL */}
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
    </div>
  );
}
