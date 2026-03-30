import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// 1. Web icons equivalent to Ionicons
import { 
  IoHomeOutline, IoPeopleOutline, IoChevronDownOutline, IoChevronUpOutline,
  IoPersonOutline, IoMedkitOutline, IoCalendarClearOutline, IoCalendarOutline,
  IoTodayOutline, IoTimeOutline, IoDocumentTextOutline, IoSettingsOutline,
  IoLogOutOutline, IoNotifications, IoCheckmarkCircleOutline, IoCloseCircleOutline,
  IoAlertCircleOutline, IoAddCircle, IoFilterSharp, IoCloseCircle, IoEyeOutline,
  IoClose, IoCamera, IoImageOutline, IoPersonCircleOutline,
  IoInformationCircle
} from 'react-icons/io5';

// 2. Import your merged CSS file
import './AdminStyles.css';

// 3. Using standard imports for Vite images
import logoImg from '../assets/AgsikapLogo-Temp.png';
import defaultUserImg from '../assets/userImg.jpg';
import UserDetailsView from './UserDetailsView';
import Navbar from '../reusable_components/NavBar';

// Imported Modals and Services (Assuming these are also converted to React web)
import AdminCancelAppointmentModal from './AdminCancelAppointmentModal';
import AdminRescheduleModal from './AdminRescheduleModal';
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
//  1. CREATE APPOINTMENT MODAL
// ==========================================
const CreateAppointmentModal = ({ visible, onClose, onSubmit }: any) => {
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
    const [appointmentType, setAppointmentType] = useState('');
    const [patientName, setPatientName] = useState('');
    const [patientEmail, setPatientEmail] = useState('');
    const [patientPhone, setPatientPhone] = useState('');
    const [petName, setPetName] = useState('');
    const [petType, setPetType] = useState('');
    const [petGender, setPetGender] = useState('');
    const [reasonForVisit, setReasonForVisit] = useState('');
    
    // Character count states
    const [patientNameCount, setPatientNameCount] = useState(0);
    const [emailCount, setEmailCount] = useState(0);
    const [phoneCount, setPhoneCount] = useState(0);
    const [petNameCount, setPetNameCount] = useState(0);
    const [petTypeCount, setPetTypeCount] = useState(0);
    const [reasonCount, setReasonCount] = useState(0);
    
    // Availability State
    const [dayAvailability, setDayAvailability] = useState<any>(null);
    const [availableTimeSlots, setAvailableTimeSlots] = useState<any[]>([]);
    const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);

    const CHAR_LIMITS = { PATIENT_NAME: 50, EMAIL: 60, PHONE: 13, PET_NAME: 30, PET_TYPE: 30, REASON: 200 };

    const getTodayDate = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const isDateDisabled = (dateString: string) => {
        if (!dayAvailability || !dateString) return true;
        const dayName = availabilityService.getDayNameFromDate(dateString);
        return !dayAvailability[dayName];
    };

    const isTimeSlotFullyBooked = (slotId: any) => {
        const slot = availableTimeSlots.find(s => s.id === slotId);
        if (!slot) return true;
        return slot.availableSlots <= 0;
    };

    useEffect(() => {
        if (visible) {
            const todayString = getTodayDate();
            setSelectedDate(todayString);
            loadDayAvailability();
            const dayName = availabilityService.getDayNameFromDate(todayString);
            loadTimeSlotsForDay(dayName);
            
            // Reset counts
            setPatientNameCount(0); setEmailCount(0); setPhoneCount(0);
            setPetNameCount(0); setPetTypeCount(0); setReasonCount(0);
        } else {
            // Reset Form
            setSelectedDate(''); setSelectedTimeSlot(''); setAppointmentType('');
            setPatientName(''); setPatientEmail(''); setPatientPhone('');
            setPetName(''); setPetType(''); setPetGender(''); setReasonForVisit('');
            setAvailableTimeSlots([]); setDayAvailability(null);
        }
    }, [visible]);

    const loadDayAvailability = async () => {
        try {
            const dayData = await availabilityService.getDayAvailability();
            setDayAvailability(dayData);
        } catch (error) {
            console.error('Failed to load day availability:', error);
        }
    };

    const loadTimeSlotsForDay = async (dayName: string) => {
        if (!dayName || !selectedDate) return;
        setLoadingTimeSlots(true);
        try {
            const slots = await availabilityService.getTimeSlotsForDay(dayName);
            const formattedSlotsWithAvailability = await Promise.all(
                slots.map(async (slot: any) => {
                    const slotAvailability = await availabilityService.getBookedSlotsCount(slot.id, selectedDate);
                    const formatTime = (timeStr: string) => {
                        if (!timeStr) return '';
                        const [hours, minutes] = timeStr.split(':');
                        const hour = parseInt(hours);
                        const ampm = hour >= 12 ? 'PM' : 'AM';
                        const displayHour = hour % 12 || 12;
                        return `${displayHour}:${minutes} ${ampm}`;
                    };
                    return {
                        id: slot.id,
                        displayText: `${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}`,
                        startTime: slot.start_time,
                        endTime: slot.end_time,
                        capacity: slot.capacity || 1,
                        bookedCount: slotAvailability.bookedCount || 0,
                        availableSlots: slotAvailability.availableSlots || 0
                    };
                })
            );
            const availableSlots = formattedSlotsWithAvailability.filter(slot => slot.availableSlots > 0);
            setAvailableTimeSlots(availableSlots);
            setSelectedTimeSlot('');
        } catch (error) {
            setAvailableTimeSlots([]);
        } finally {
            setLoadingTimeSlots(false);
        }
    };

    const refreshTimeSlotAvailability = async () => {
        if (!selectedDate) return;
        const dayName = availabilityService.getDayNameFromDate(selectedDate);
        if (!dayName) return;
        
        setLoadingTimeSlots(true);
        try {
            const slots = await availabilityService.getTimeSlotsForDay(dayName);
            const formattedSlotsWithAvailability = await Promise.all(
                slots.map(async (slot: any) => {
                    const slotAvailability = await availabilityService.getBookedSlotsCount(slot.id, selectedDate);
                    const formatTime = (timeStr: string) => {
                        if (!timeStr) return '';
                        const [hours, minutes] = timeStr.split(':');
                        const hour = parseInt(hours);
                        const ampm = hour >= 12 ? 'PM' : 'AM';
                        const displayHour = hour % 12 || 12;
                        return `${displayHour}:${minutes} ${ampm}`;
                    };
                    return {
                        id: slot.id,
                        displayText: `${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}`,
                        startTime: slot.start_time,
                        endTime: slot.end_time,
                        capacity: slot.capacity || 1,
                        bookedCount: slotAvailability.bookedCount || 0,
                        availableSlots: slotAvailability.availableSlots || 0
                    };
                })
            );
            const availableSlots = formattedSlotsWithAvailability.filter(slot => slot.availableSlots > 0);
            setAvailableTimeSlots(availableSlots);
            
            if (selectedTimeSlot) {
                const currentSlot = formattedSlotsWithAvailability.find(slot => slot.displayText === selectedTimeSlot);
                if (!currentSlot || currentSlot.availableSlots <= 0) {
                    setSelectedTimeSlot('');
                    window.alert('Slot Unavailable: The previously selected time slot is no longer available.');
                }
            }
        } catch (error) {
            console.error('Failed to refresh time slots:', error);
        } finally {
            setLoadingTimeSlots(false);
        }
    };

    useEffect(() => {
        if (selectedDate) refreshTimeSlotAvailability();
    }, [selectedDate]);

    const handleDateSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const dateString = e.target.value;
        if (isDateDisabled(dateString)) {
            window.alert('Date Not Available: This date is not available for appointments.');
            return;
        }
        setSelectedDate(dateString);
        const dayName = availabilityService.getDayNameFromDate(dateString);
        loadTimeSlotsForDay(dayName);
    };

    const handleTimeSlotSelect = (slotId: any) => {
        if (isTimeSlotFullyBooked(slotId)) {
            window.alert('Slot Full: This time slot is fully booked. Please select another time.');
            return;
        }
        const slot = availableTimeSlots.find(s => s.id === slotId);
        if (slot) setSelectedTimeSlot(slot.displayText);
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const text = e.target.value;
        let cleaned = text.replace(/\D/g, '');
        if (cleaned.length > 11) cleaned = cleaned.substring(0, 11);
        
        let formatted = cleaned;
        if (cleaned.length > 4) formatted = `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
        if (cleaned.length > 7) formatted = `${cleaned.slice(0, 4)}-${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
        
        setPatientPhone(formatted);
        setPhoneCount(formatted.length);
    };

    const handleSubmit = async () => {
        if (!patientName.trim()) { window.alert('Error: Please enter patient name'); return; }
        if (!appointmentType) { window.alert('Error: Please select appointment type'); return; }
        if (!selectedDate) { window.alert('Error: Please select a date'); return; }
        if (!selectedTimeSlot) { window.alert('Error: Please select a time slot'); return; }

        const selectedSlot = availableTimeSlots.find(slot => slot.displayText === selectedTimeSlot);
        if (!selectedSlot) { window.alert('Error: Selected time slot is no longer available'); return; }
        if (selectedSlot.availableSlots <= 0) { window.alert('Slot Full: This time slot is now fully booked.'); return; }

        try {
            const appointmentData = {
                patientName, patientEmail, patientPhone, petName, petType, petGender,
                appointmentType, reasonForVisit, selectedDate,
                timeSlotId: selectedSlot.id, timeSlotDisplay: selectedSlot.displayText
            };

            await availabilityService.createAppointment(appointmentData);
            onClose();
        } catch (error: any) {
            window.alert('Error: ' + (error.message || 'Failed to create appointment. Please try again.'));
        }
    };

    if (!visible) return null;

    return (
        <div className="modalOverlay">
            <div className="modalContainer" style={{ maxHeight: '90%', width: '95%', maxWidth: '800px', display: 'flex', flexDirection: 'column', padding: '30px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Create New Appointment</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                        <IoClose size={24} color="#333" />
                    </button>
                </div>

                <div style={{ overflowY: 'auto', flex: 1, paddingRight: '10px' }}>
                    {/* Patient Information */}
                    <div style={{ marginBottom: '25px' }}>
                        <h3 style={{ fontSize: '18px', color: '#3d67ee', borderBottom: '1px solid #f0f0f0', paddingBottom: '10px', marginBottom: '15px' }}>Patient Information</h3>
                        <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
                            <div className="formGroup" style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <label>Full Name *</label>
                                    <span style={{ fontSize: '11px', color: patientNameCount >= CHAR_LIMITS.PATIENT_NAME ? '#d32f2f' : '#999' }}>{patientNameCount}/{CHAR_LIMITS.PATIENT_NAME}</span>
                                </div>
                                <input type="text" className="formInput" value={patientName} onChange={(e) => { if(e.target.value.length <= CHAR_LIMITS.PATIENT_NAME) { setPatientName(e.target.value); setPatientNameCount(e.target.value.length); }}} placeholder="Enter patient name" />
                            </div>
                            <div className="formGroup" style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <label>Email</label>
                                    <span style={{ fontSize: '11px', color: emailCount >= CHAR_LIMITS.EMAIL ? '#d32f2f' : '#999' }}>{emailCount}/{CHAR_LIMITS.EMAIL}</span>
                                </div>
                                <input type="email" className="formInput" value={patientEmail} onChange={(e) => { if(e.target.value.length <= CHAR_LIMITS.EMAIL) { setPatientEmail(e.target.value); setEmailCount(e.target.value.length); }}} placeholder="Enter email address" />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
                            <div className="formGroup" style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <label>Phone Number</label>
                                    <span style={{ fontSize: '11px', color: phoneCount >= CHAR_LIMITS.PHONE ? '#d32f2f' : '#999' }}>{phoneCount}/{CHAR_LIMITS.PHONE}</span>
                                </div>
                                <input type="text" className="formInput" value={patientPhone} onChange={handlePhoneChange} placeholder="0917-123-4567" />
                            </div>
                            <div className="formGroup" style={{ flex: 1 }}></div>
                        </div>
                        <div className="formGroup" style={{ marginBottom: '25px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <label>Reason for Visit</label>
                                <span style={{ fontSize: '11px', color: reasonCount >= CHAR_LIMITS.REASON ? '#d32f2f' : '#999' }}>{reasonCount}/{CHAR_LIMITS.REASON}</span>
                            </div>
                            <textarea className="formInput" style={{ height: '80px', resize: 'vertical' }} value={reasonForVisit} onChange={(e) => { if(e.target.value.length <= CHAR_LIMITS.REASON) { setReasonForVisit(e.target.value); setReasonCount(e.target.value.length); }}} placeholder="Please describe the reason for your visit" />
                        </div>
                    </div>

                    {/* Pet Information */}
                    <div style={{ marginBottom: '25px' }}>
                        <h3 style={{ fontSize: '18px', color: '#3d67ee', borderBottom: '1px solid #f0f0f0', paddingBottom: '10px', marginBottom: '15px' }}>Pet Information</h3>
                        <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
                            <div className="formGroup" style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <label>Pet Name</label>
                                    <span style={{ fontSize: '11px', color: petNameCount >= CHAR_LIMITS.PET_NAME ? '#d32f2f' : '#999' }}>{petNameCount}/{CHAR_LIMITS.PET_NAME}</span>
                                </div>
                                <input type="text" className="formInput" value={petName} onChange={(e) => { if(e.target.value.length <= CHAR_LIMITS.PET_NAME) { setPetName(e.target.value); setPetNameCount(e.target.value.length); }}} placeholder="Enter pet name" />
                            </div>
                            <div className="formGroup" style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <label>Pet Type</label>
                                    <span style={{ fontSize: '11px', color: petTypeCount >= CHAR_LIMITS.PET_TYPE ? '#d32f2f' : '#999' }}>{petTypeCount}/{CHAR_LIMITS.PET_TYPE}</span>
                                </div>
                                <input type="text" className="formInput" value={petType} onChange={(e) => { if(e.target.value.length <= CHAR_LIMITS.PET_TYPE) { setPetType(e.target.value); setPetTypeCount(e.target.value.length); }}} placeholder="e.g., Dog, Cat" />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
                            <div className="formGroup" style={{ flex: 1 }}>
                                <label>Gender</label>
                                <select className="formSelect" value={petGender} onChange={(e) => setPetGender(e.target.value)}>
                                    <option value="" disabled>Select gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                </select>
                            </div>
                            <div className="formGroup" style={{ flex: 1 }}></div>
                        </div>
                    </div>

                    {/* Appointment Details */}
                    <div style={{ marginBottom: '25px' }}>
                        <h3 style={{ fontSize: '18px', color: '#3d67ee', borderBottom: '1px solid #f0f0f0', paddingBottom: '10px', marginBottom: '15px' }}>Appointment Details</h3>
                        <div className="formGroup" style={{ marginBottom: '15px' }}>
                            <label>Appointment Type *</label>
                            <select className="formSelect" value={appointmentType} onChange={(e) => setAppointmentType(e.target.value)}>
                                <option value="" disabled>Select appointment type</option>
                                <option value="Vaccination">Wellness & Vaccination</option>
                                <option value="Check-up">Check-up or Consultation</option>
                                <option value="Deworming">Deworming</option>
                                <option value="Parasite Control">Parasite Control</option>
                                <option value="Grooming">Grooming</option>
                            </select>
                        </div>
                        <div className="formGroup" style={{ marginBottom: '15px' }}>
                            <label>Select Date *</label>
                            <input 
                                type="date" 
                                className="formInput" 
                                value={selectedDate} 
                                min={getTodayDate()}
                                onChange={handleDateSelect} 
                            />
                        </div>
                        <div className="formGroup">
                            <label>
                                Select Time Slot * {loadingTimeSlots && <span style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}> Loading slots...</span>}
                            </label>
                            
                            {!selectedDate ? (
                                <p style={{ textAlign: 'center', color: '#666', fontStyle: 'italic', padding: '20px' }}>Please select a date first</p>
                            ) : availableTimeSlots.length === 0 ? (
                                <p style={{ textAlign: 'center', color: '#666', fontStyle: 'italic', padding: '20px' }}>No time slots available for this day</p>
                            ) : (
                                <div style={{ display: 'flex', overflowX: 'auto', paddingBottom: '10px', gap: '10px' }}>
                                    {availableTimeSlots.map(slot => {
                                        const isFullyBooked = slot.availableSlots <= 0;
                                        const isSelected = selectedTimeSlot === slot.displayText;
                                        return (
                                            <button
                                                key={slot.id}
                                                onClick={() => !isFullyBooked && handleTimeSlotSelect(slot.id)}
                                                disabled={isFullyBooked}
                                                style={{
                                                    padding: '10px 15px', borderRadius: '8px', minWidth: '120px', cursor: isFullyBooked ? 'not-allowed' : 'pointer',
                                                    border: `1px solid ${isSelected ? '#3d67ee' : '#ccc'}`,
                                                    backgroundColor: isSelected ? '#3d67ee' : (isFullyBooked ? '#f5f5f5' : 'white'),
                                                    color: isSelected ? 'white' : (isFullyBooked ? '#aaa' : '#333'),
                                                    fontWeight: '500', transition: 'all 0.2s'
                                                }}
                                            >
                                                {slot.displayText}
                                            </button>
                                        )
                                    })}
                                </div>
                            )}

                            {selectedTimeSlot && (
                                <div style={{ backgroundColor: '#e8f5e9', padding: '10px', borderRadius: '5px', marginTop: '10px', display: 'flex', alignItems: 'center' }}>
                                    <IoCheckmarkCircleOutline size={20} color="#2e7d32" />
                                    <span style={{ marginLeft: '10px', color: '#2e7d32', fontWeight: '600' }}>Selected: {selectedTimeSlot}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
                    <button onClick={onClose} style={{ padding: '10px 25px', backgroundColor: '#f5f5f5', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', color: '#666', fontWeight: '600' }}>
                        Cancel
                    </button>
                    <button 
                        onClick={handleSubmit} 
                        disabled={!selectedDate || !selectedTimeSlot || !patientName || !appointmentType}
                        style={{ 
                            padding: '10px 25px', borderRadius: '8px', border: 'none', fontWeight: '600', color: 'white',
                            backgroundColor: (!selectedDate || !selectedTimeSlot || !patientName || !appointmentType) ? '#ccc' : '#3d67ee',
                            cursor: (!selectedDate || !selectedTimeSlot || !patientName || !appointmentType) ? 'not-allowed' : 'pointer'
                        }}
                    >
                        Create Appointment
                    </button>
                </div>
            </div>
        </div>
    );
};

// ==========================================
//  2. CONFIRMATION MODAL
// ==========================================
const ConfirmationModal = ({ visible, onClose, onConfirm, title, message, confirmText = 'Yes', cancelText = 'No', confirmColor = '#3d67ee', type = 'info' }: any) => {
    if (!visible) return null;

    const getIconProps = () => {
        switch(type) {
            case 'cancel': return { icon: <IoCloseCircle size={40} color="#d32f2f" />, bg: '#ffebee' };
            case 'complete': return { icon: <IoCheckmarkCircleOutline size={40} color="#2e7d32" />, bg: '#e8f5e9' };
            default: return { icon: <IoInformationCircle size={40} color="#3d67ee" />, bg: '#e3f2fd' };
        }
    };
    const { icon, bg } = getIconProps();
    const btnColor = type === 'cancel' ? '#d32f2f' : (type === 'complete' ? '#2e7d32' : confirmColor);

    return (
        <div className="modalOverlay">
            <div className="modalContainer" style={{ width: '40%', maxWidth: '400px', padding: '0', display: 'flex', flexDirection: 'column' }}>
                <div style={{ alignItems: 'center', paddingTop: '30px', paddingBottom: '20px', display: 'flex', justifyContent: 'center' }}>
                    <div style={{ width: '70px', height: '70px', borderRadius: '35px', backgroundColor: bg, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        {icon}
                    </div>
                </div>
                <div style={{ padding: '0 30px', textAlign: 'center', flex: 1 }}>
                    <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#333', marginBottom: '10px' }}>{title}</h2>
                    <p style={{ fontSize: '16px', color: '#666', lineHeight: '22px' }}>{message}</p>
                </div>
                <div style={{ display: 'flex', padding: '20px', borderTop: '1px solid #f0f0f0', marginTop: '20px', gap: '15px' }}>
                    <button onClick={onClose} style={{ flex: 1, padding: '12px', backgroundColor: '#f5f5f5', border: 'none', borderRadius: '8px', color: '#666', fontWeight: '600', cursor: 'pointer' }}>{cancelText}</button>
                    <button onClick={() => { onConfirm(); onClose(); }} style={{ flex: 1, padding: '12px', backgroundColor: btnColor, border: 'none', borderRadius: '8px', color: 'white', fontWeight: '600', cursor: 'pointer' }}>{confirmText}</button>
                </div>
            </div>
        </div>
    );
};

// ==========================================
//  3. ASSIGN DOCTOR MODAL
// ==========================================
const AssignDoctorModal = ({ visible, onClose, appointment, doctors, onAssign }: any) => {
    const [selectedDoctorId, setSelectedDoctorId] = useState<any>('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible && appointment) setSelectedDoctorId(appointment.assignedDoctor || '');
        else setSelectedDoctorId('');
    }, [visible, appointment]);

    const handleAssign = async () => {
        if (!selectedDoctorId) { window.alert('Error: Please select a doctor'); return; }
        setLoading(true);
        try {
            await onAssign(appointment.id, selectedDoctorId);
            onClose();
        } catch (error) {
            window.alert('Error: Failed to assign doctor');
        } finally {
            setLoading(false);
        }
    };

    if (!visible) return null;

    return (
        <div className="modalOverlay">
            <div className="modalContainer" style={{ width: '60%', maxWidth: '600px', display: 'flex', flexDirection: 'column', padding: '30px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Assign Doctor</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><IoClose size={24} color="#333" /></button>
                </div>

                <div style={{ overflowY: 'auto', flex: 1 }}>
                    <p style={{ fontSize: '16px', marginBottom: '20px', color: '#555' }}>Assign a doctor to <strong style={{color: '#333'}}>{appointment?.name}'s</strong> appointment</p>

                    <div style={{ backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #eee' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '10px' }}>Appointment Details</h4>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}><span style={{ fontSize: '12px', color: '#666' }}>Service:</span><span style={{ fontSize: '12px', fontWeight: '600' }}>{appointment?.service}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}><span style={{ fontSize: '12px', color: '#666' }}>Date & Time:</span><span style={{ fontSize: '12px', fontWeight: '600' }}>{appointment?.date_time}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: '12px', color: '#666' }}>Pet:</span><span style={{ fontSize: '12px', fontWeight: '600' }}>{appointment?.pet_name} ({appointment?.pet_type})</span></div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontWeight: '600', marginBottom: '10px' }}>Select Doctor *</label>
                        {doctors.length === 0 ? (
                            <p style={{ textAlign: 'center', color: '#666', fontStyle: 'italic', padding: '20px' }}>No doctors available</p>
                        ) : (
                            <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {doctors.map((doctor: any) => {
                                    const isSelected = selectedDoctorId === (doctor.pk || doctor.id);
                                    return (
                                        <button 
                                            key={doctor.pk || doctor.id}
                                            onClick={() => setSelectedDoctorId(doctor.pk || doctor.id)}
                                            style={{
                                                display: 'flex', alignItems: 'center', padding: '15px', borderRadius: '8px', cursor: 'pointer', textAlign: 'left',
                                                border: `1px solid ${isSelected ? '#3d67ee' : '#e0e0e0'}`,
                                                backgroundColor: isSelected ? '#f0f4ff' : 'white', transition: 'all 0.2s'
                                            }}
                                        >
                                            <img src={doctor.userImage || defaultUserImg} style={{ width: '40px', height: '40px', borderRadius: '20px', marginRight: '15px', objectFit: 'cover' }} alt="Doctor" />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '14px', fontWeight: isSelected ? '600' : '500', color: isSelected ? '#3d67ee' : '#333' }}>{doctor.fullName || doctor.name}</div>
                                                <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>{doctor.role || 'Veterinarian'} • {doctor.department || 'General'}</div>
                                            </div>
                                            {isSelected && <IoCheckmarkCircleOutline size={20} color="#3d67ee" />}
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
                    <button onClick={onClose} disabled={loading} style={{ padding: '10px 25px', backgroundColor: '#f5f5f5', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', color: '#666', fontWeight: '600' }}>Cancel</button>
                    <button 
                        onClick={handleAssign} 
                        disabled={!selectedDoctorId || loading} 
                        style={{ padding: '10px 25px', backgroundColor: (!selectedDoctorId) ? '#ccc' : '#3d67ee', border: 'none', borderRadius: '8px', cursor: (!selectedDoctorId || loading) ? 'not-allowed' : 'pointer', color: 'white', fontWeight: '600' }}
                    >
                        {loading ? 'Assigning...' : 'Assign Doctor'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ==========================================
//  4. TABLE VIEW COMPONENT
// ==========================================
const TableView = ({ onViewUser, loading, filteredAppointments, service, setService, doctorFilter, setDoctorFilter, doctors, userData, handleCreateAppointment }: any) => {
  return (
    <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '20px', flex: 1, display: 'flex', flexDirection: 'column', boxShadow: '0 0 18px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <div>
          <h2 style={{ fontSize: '25px', fontWeight: '700', margin: 0 }}>Booked Appointments</h2>
          <p style={{ fontSize: '14px', marginTop: '5px', color: '#888', margin: 0 }}>
            {loading ? 'Loading appointments...' : `Total appointments: ${filteredAppointments.length}`}
          </p>
        </div>
        
        <button onClick={handleCreateAppointment} className="blackBtn" style={{ backgroundColor: '#3d67ee' }}>
          <IoAddCircle size={20} color="#fff" />
          <span>Create Appointment</span>
        </button>
      </div>
      
      {loading ? (
        <div className="loadingContainer"><div className="spinner"></div></div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginLeft: '5px', marginTop: '20px', marginBottom: '20px' }}>
            <IoFilterSharp size={25} color="#3d67ee" style={{ marginRight: '10px' }} />
            
            <div style={{ marginRight: '15px' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Service</div>
              <select value={service} onChange={(e) => setService(e.target.value)} className="filterSelect" style={{ width: '150px' }}>
                <option value="" style={{color: '#a8a8a8'}}>All Services</option>
                <option value="Vaccination">Wellness & Vaccination</option>
                <option value="Check-up">Check-up or Consultation</option>
                <option value="Deworming">Deworming</option>
                <option value="Parasite Control">Parasite Control</option>
                <option value="Grooming">Grooming</option>
              </select>
            </div>
            
            <div>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Doctor</div>
              <select value={doctorFilter} onChange={(e) => setDoctorFilter(e.target.value)} className="filterSelect" style={{ width: '180px' }}>
                <option value="" style={{color: '#a8a8a8'}}>All Doctors</option>
                <option value="Not Assigned">Not Assigned</option>
                {doctors.map((doctor: any) => (
                  <option key={doctor.pk || doctor.id} value={doctor.fullName || doctor.name}>
                    {doctor.fullName || doctor.name} ({doctor.role || 'Doctor'})
                  </option>
                ))}
              </select>
            </div>
            
            {(service || doctorFilter) && (
              <button onClick={() => { setService(''); setDoctorFilter(''); }} style={{ marginLeft: '15px', display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer' }}>
                <IoCloseCircle size={18} color="#666" />
                <span style={{ marginLeft: '5px', fontSize: '12px', color: '#666' }}>Clear</span>
              </button>
            )}
          </div>

          <div className="tableWrapper" style={{ marginTop: '0' }}>
            <table className="dataTable">
                <thead>
                    <tr>
                        <th style={{ width: '20%' }}>Name</th>
                        <th style={{ textAlign: 'center', width: '20%' }}>Service</th>
                        <th style={{ textAlign: 'center', width: '20%' }}>Time & Date</th>
                        <th style={{ textAlign: 'center', width: '15%' }}>Status</th>
                        <th style={{ textAlign: 'center', width: '20%' }}>Doctor</th>
                        <th style={{ textAlign: 'right', width: '10%' }}>View</th>
                    </tr>
                </thead>
                <tbody>
                {filteredAppointments.length > 0 ? (
                    filteredAppointments.map((user: any) => (
                    <tr key={user.id}>
                        <td className="tableFont">{user.name}</td>
                        <td className="tableFont" style={{ textAlign: 'center' }}>{user.service}</td>
                        <td className="tableFont" style={{ textAlign: 'center' }}>{user.date_time}</td>
                        <td style={{ textAlign: 'center' }}>
                            <div className="statusBadge" style={{
                                backgroundColor: user.status === 'pending' ? '#fff3e0' : (user.status === 'scheduled' ? '#e8f5e9' : '#ffebee')
                            }}>
                                <span style={{
                                    fontSize: '11px', fontWeight: '600',
                                    color: user.status === 'pending' ? '#f57c00' : (user.status === 'scheduled' ? '#2e7d32' : '#d32f2f')
                                }}>
                                    {user.status ? user.status.toUpperCase() : 'SCHEDULED'}
                                </span>
                            </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: '12px', color: user.doctor === 'Not Assigned' ? '#f57c00' : '#333' }}>{user.doctor}</span>
                                {user.doctor === 'Not Assigned' && <IoAlertCircleOutline size={14} color="#f57c00" style={{ marginLeft: '5px' }} />}
                            </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                            <button
                                onClick={() => onViewUser(user)}
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
                        <td colSpan={6} className="noData">
                            {userData.length === 0 ? 'No appointments found' : 'No appointments matching your filters'}
                        </td>
                    </tr>
                )}
                </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
//  5. MAIN COMPONENT (SCHEDULE)
// ==========================================
export default function Schedule() {
    const navigate = useNavigate();
    const location = useLocation();
    const isActive = location.pathname === '/Schedule';

    const API_URL = 'http://localhost:5000';

    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

    const [showAccountDropdown, setShowAccountDropdown] = useState(false);
    const [showAppointmentsDropdown, setShowAppointmentsDropdown] = useState(true); // Default open for this section
    const [service, setService] = useState('');
    const [doctorFilter, setDoctorFilter] = useState('');
    const [bookedDates, setBookedDates] = useState<any>({});
    
    // LOGOUT POPUP STATE
    const [logoutModalVisible, setLogoutModalVisible] = useState(false);
    const [modalConfig, setModalConfig] = useState<ModalConfigType>({ type: 'info', title: '', message: '', onConfirm: null, showCancel: false });

    // Calendar state (Using standard date input for side panel)
    const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>('');
    
    const [currentView, setCurrentView] = useState('table'); 
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [selectedDoctor, setSelectedDoctor] = useState('');
    const [showDoctorModal, setShowDoctorModal] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
    
    const [showCreateModal, setShowCreateModal] = useState(false);

    const [showCancelModal, setShowCancelModal] = useState(false);
    const [selectedAppointmentForCancel, setSelectedAppointmentForCancel] = useState<any>(null);

    const [showRescheduleModal, setShowRescheduleModal] = useState(false);
    const [selectedAppointmentForReschedule, setSelectedAppointmentForReschedule] = useState<any>(null);

    const [userData, setUserData] = useState<any[]>([]);
    const [doctors, setDoctors] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const [showConfirmationModal, setShowConfirmationModal] = useState(false);
    const [confirmationAction, setConfirmationAction] = useState<any>(null);
    const [selectedAppointmentForAction, setSelectedAppointmentForAction] = useState<any>(null);
    const [confirmationType, setConfirmationType] = useState('info');

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

    const filteredAppointments = userData.filter(appointment => {
      // Filter out completed or cancelled from standard view unless specifically requested
      if (appointment.status === 'completed' || appointment.status === 'cancelled') return false;
      // Date filter from side panel
      if (selectedCalendarDate && !appointment.date_time.includes(selectedCalendarDate)) return false; // Basic matching string logic

      const matchesService = service === '' || appointment.service === service;
      const matchesDoctor = doctorFilter === '' || appointment.doctor === doctorFilter;
      return matchesService && matchesDoctor;
    });

    const handleViewUser = (user: any) => {
        setSelectedUser(user);
        setSelectedAppointment(user); 
        setSelectedDoctor(user.assignedDoctor || '');
        setCurrentView('userDetails');
    };

    const openDoctorModal = (appointment: any) => {
        setSelectedAppointment(appointment);
        setShowDoctorModal(true);
    };
    
    const handleBackToList = () => {
        setCurrentView('table');
        setSelectedUser(null);
        setSelectedDoctor('');
    };

    const handleAssignDoctor = async (appointmentId: any, doctorId: any) => {
        try {
            const result = await availabilityService.assignDoctor(appointmentId, doctorId);
            const updatedUserData = userData.map(appointment => {
                if (appointment.id === appointmentId) {
                    const doctor = doctors.find(d => (d.pk || d.id) === doctorId);
                    return {
                        ...appointment,
                        doctor: doctor ? doctor.fullName : 'Unknown Doctor',
                        assignedDoctor: doctorId
                    };
                }
                return appointment;
            });
            setUserData(updatedUserData);
            
            if (selectedUser && selectedUser.id === appointmentId) {
                const doctor = doctors.find(d => (d.pk || d.id) === doctorId);
                setSelectedUser((prev: any) => ({
                    ...prev,
                    doctor: doctor ? doctor.fullName : 'Unknown Doctor',
                    assignedDoctor: doctorId
                }));
            }
            window.alert('Success: ' + (result.message || 'Doctor assigned successfully!'));
            return result;
        } catch (error: any) {
            window.alert('Error: ' + (error.message || 'Failed to assign doctor'));
            throw error;
        }
    };

    const handleCancelAppointment = (appointment: any) => {
        if (!appointment || !appointment.id) { window.alert('Error: Invalid appointment data'); return; }
        setSelectedAppointmentForCancel(appointment);
        setShowCancelModal(true);
    };

    const handleCancelWithReason = async (cancellationData: any) => {
        try {
            setLoading(true);
            const currentUserId = 1; // TODO: Auth context
            const fullCancelData = { ...cancellationData, cancelled_by: currentUserId };
            
            const result = await availabilityService.cancelAppointmentWithReason(selectedAppointmentForCancel.id, fullCancelData);
            
            const updatedUserData = userData.filter(user => user.id !== selectedAppointmentForCancel.id);
            setUserData(updatedUserData);
            
            if (selectedUser && selectedUser.id === selectedAppointmentForCancel.id) {
                setCurrentView('table');
                setSelectedUser(null);
            }
            
            setShowCancelModal(false);
            setSelectedAppointmentForCancel(null);
            return result;
        } catch (error: any) {
            window.alert('Error: ' + (error.message || 'Failed to cancel appointment'));
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const handleRescheduleAppointment = (appointment: any) => {
        if (!appointment || !appointment.id) { window.alert('Error: Invalid appointment data'); return; }
        setSelectedAppointmentForReschedule(appointment);
        setShowRescheduleModal(true);
    };

    const handleRescheduleSubmit = async (rescheduleData: any) => {
        try {
            setLoading(true);
            const currentUserId = 1; // TODO: Auth context
            const fullRescheduleData = { ...rescheduleData, requested_by: currentUserId };
            const result = await availabilityService.createRescheduleRequest(selectedAppointmentForReschedule.id, fullRescheduleData);
            
            setShowRescheduleModal(false);
            setSelectedAppointmentForReschedule(null);
            return result;
        } catch (error: any) {
            window.alert('Error: ' + (error.message || 'Failed to create reschedule request'));
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const handleCompleteAppointment = (appointment: any) => {
        if (!appointment || !appointment.id) { window.alert('Error: Invalid appointment data'); return; }
        setSelectedAppointmentForAction(appointment);
        setConfirmationType('complete');
        setConfirmationAction(() => async () => {
            try {
                setLoading(true);
                const result = await availabilityService.updateAppointmentStatus(appointment.id, 'completed');
                if (result) {
                    const updatedUserData = userData.filter(user => user.id !== appointment.id);
                    setUserData(updatedUserData);
                    if (selectedUser && selectedUser.id === appointment.id) {
                        setCurrentView('table');
                        setSelectedUser(null);
                    }
                    window.alert('Success: Appointment marked as completed and moved to history.');
                }
            } catch (error: any) {
                window.alert('Error: ' + (error.message || 'Failed to complete appointment.'));
            } finally {
                setLoading(false);
                setSelectedAppointmentForAction(null);
            }
        });
        setShowConfirmationModal(true);
    };

    const handleCreateAppointment = () => setShowCreateModal(true);

    const loadAppointments = async () => {
        setLoading(true);
        try {
            const appointments = await availabilityService.getAppointmentsForTable();
            setUserData(appointments);
            
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
            window.alert('Error: Failed to load appointments');
        } finally {
            setLoading(false);
        }
    };

    const loadDoctors = async () => {
        try {
            const doctorsList = await availabilityService.getDoctors();
            const formattedDoctors = doctorsList.map((doctor: any) => ({
                id: doctor.pk || doctor.id,
                pk: doctor.pk,
                fullName: doctor.fullname || doctor.fullName || doctor.name || 'Unknown',
                name: doctor.fullname || doctor.fullName || doctor.name || 'Unknown',
                role: doctor.role || 'Veterinarian',
                department: doctor.department || 'General',
                userImage: doctor.userImage || doctor.userimage,
            }));
            setDoctors(formattedDoctors);
        } catch (error) {
            console.error('Failed to load doctors:', error);
        }
    };

    const handleSubmitAppointment = async (appointmentData: any) => {
        try {
            setShowCreateModal(false);
            setTimeout(() => { loadAppointments(); }, 1000);
        } catch (error) {
            setShowCreateModal(false);
            loadAppointments(); 
        }
    };

    useEffect(() => {
        loadAppointments();
        loadDoctors();
    }, []);

    const handleCloseModal = () => {
        setShowCreateModal(false);
        setTimeout(() => { loadAppointments(); }, 300);
    };

    return (
        <div className="biContainer">
            <Navbar currentUser={currentUser} onLogout={handleLogoutPress} />

            {/* BODY CONTAINER */}
            <div className="bodyContainer">
                <div className="topContainer">
                    <div className="subTopContainer">
                        <IoDocumentTextOutline size={20} color="#3d67ee" style={{ marginTop: '2px' }} />
                        <span className="blueText" style={{ marginLeft: '10px' }}>
                            {currentView === 'table' ? 'Appointments / Schedule' : 'Patient Details'}
                        </span>
                    </div>
                    <div className="subTopContainer" style={{ justifyContent: 'center', flex: 0.5, marginLeft: '12px' }}>
                        <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={loadAppointments}>
                            <IoNotifications size={21} color="#3d67ee" style={{ marginTop: '3px' }} />
                        </button>
                    </div>
                </div>

                {/* TABLE/VIEW AREA WITH SIDEBAR */}
                <div className="tableContainer" style={{ flexDirection: 'row', gap: '20px', padding: 0, backgroundColor: 'transparent', boxShadow: 'none' }}>
                    
                    {/* LEFT SIDEBAR (Calendar & Doctors) */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', minWidth: '250px', maxWidth: '300px' }}>
                        
                        {/* Web Calendar Adaptation */}
                        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '20px', boxShadow: '0 0 18px rgba(0,0,0,0.05)' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '15px', color: '#333' }}>Filter by Date</h3>
                            <input 
                                type="date" 
                                value={selectedCalendarDate} 
                                onChange={(e) => setSelectedCalendarDate(e.target.value)} 
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                            />
                            {selectedCalendarDate && (
                                <button 
                                    onClick={() => setSelectedCalendarDate('')} 
                                    style={{ marginTop: '10px', width: '100%', padding: '8px', border: 'none', backgroundColor: '#f5f5f5', borderRadius: '8px', cursor: 'pointer', color: '#666', fontSize: '12px' }}
                                >
                                    Clear Date Filter
                                </button>
                            )}
                            <div style={{ marginTop: '20px', fontSize: '12px', color: '#888', fontStyle: 'italic' }}>
                                <p><strong>Note:</strong> On the web dashboard, use this date picker to filter the table to a specific date.</p>
                            </div>
                        </div>

                        {/* Doctors List */}
                        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '20px', flex: 1, boxShadow: '0 0 18px rgba(0,0,0,0.05)' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '15px' }}>Doctors Available</h3>
                            <div style={{ overflowY: 'auto', maxHeight: '400px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                {doctors.map((doctor) => (
                                    <div key={doctor.id} style={{ display: 'flex', alignItems: 'center' }}>
                                        <img src={doctor.userImage || defaultUserImg} style={{ width: '35px', height: '35px', borderRadius: '50%', marginRight: '10px', objectFit: 'cover' }} alt="Dr" />
                                        <div>
                                            <div style={{ fontSize: '14px', fontWeight: '500' }}>{doctor.name}</div>
                                            <div style={{ fontSize: '12px', color: '#666' }}>{doctor.department}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* MAIN CONTENT AREA */}
                    <div style={{ flex: 3, display: 'flex', flexDirection: 'column' }}>
                        {currentView === 'table' ? (
                            <TableView 
                                onViewUser={handleViewUser}
                                loading={loading}
                                filteredAppointments={filteredAppointments}
                                service={service}
                                setService={setService}
                                doctorFilter={doctorFilter}
                                setDoctorFilter={setDoctorFilter}
                                doctors={doctors}
                                userData={userData}
                                handleCreateAppointment={handleCreateAppointment}
                            />
                        ) : (
                            <UserDetailsView 
                                user={selectedUser} 
                                onBack={handleBackToList}
                                onCancel={handleCancelAppointment}
                                onComplete={handleCompleteAppointment}
                                onAssignDoctor={openDoctorModal} 
                                onReschedule={handleRescheduleAppointment}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* MODALS */}
            <AssignDoctorModal 
                visible={showDoctorModal}
                onClose={() => setShowDoctorModal(false)}
                appointment={selectedAppointment}
                doctors={doctors}
                onAssign={handleAssignDoctor}
            />

            <CreateAppointmentModal 
                visible={showCreateModal}
                onClose={handleCloseModal}
                onSubmit={handleSubmitAppointment}
            />

            <ConfirmationModal 
                visible={showConfirmationModal}
                onClose={() => {
                    setShowConfirmationModal(false);
                    setSelectedAppointmentForAction(null);
                }}
                onConfirm={confirmationAction}
                title={confirmationType === 'cancel' ? 'Cancel Appointment' : 'Complete Appointment'}
                message={confirmationType === 'cancel' 
                    ? 'Are you sure you want to cancel this appointment? This will move it to history.'
                    : 'Mark this appointment as completed? It will be moved to history.'
                }
                confirmText={confirmationType === 'cancel' ? 'Yes, Cancel' : 'Yes, Complete'}
                cancelText="No"
                type={confirmationType}
            />

            {showCancelModal && (
                <AdminCancelAppointmentModal 
                    visible={showCancelModal}
                    onClose={() => { setShowCancelModal(false); setSelectedAppointmentForCancel(null); }}
                    appointment={selectedAppointmentForCancel}
                    onSubmit={handleCancelWithReason}
                    currentUserId={1} // Replace with Auth ID
                />
            )}

            {showRescheduleModal && (
                <AdminRescheduleModal 
                    visible={showRescheduleModal}
                    onClose={() => { setShowRescheduleModal(false); setSelectedAppointmentForReschedule(null); }}
                    appointment={selectedAppointmentForReschedule}
                    onSubmit={handleRescheduleSubmit}
                    currentUserId={1} // Replace with Auth ID
                />
            )}

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
                                onClick={() => {
                                    setLogoutModalVisible(false);
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
