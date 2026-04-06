import React, { useState, useEffect } from 'react';
import { IoClose, IoAlertCircle, IoCheckmarkCircle, IoMail, IoChevronBack, IoChevronForward } from 'react-icons/io5';
import { availabilityService } from './availabilityService';

const RESCHEDULE_REASONS = [
    {
        id: 'doctor_unavailable',
        label: 'Doctor Unavailable',
        template: 'The veterinarian assigned to your original appointment is unavailable for the scheduled time. We are proposing a new schedule and kindly ask you to review and confirm it.'
    },
    {
        id: 'patient_request',
        label: 'Client Request',
        template: 'As requested, we are proposing a new schedule for your appointment. Please review the updated date and time and confirm if it works for you.'
    },
    {
        id: 'schedule_conflict',
        label: 'Schedule Conflict',
        template: 'There is a scheduling conflict affecting your original appointment slot. We apologize for the inconvenience and are proposing a new schedule for your confirmation.'
    },
    {
        id: 'pet_condition',
        label: 'Pet Condition / Needs More Time',
        template: 'To better accommodate your pet\'s condition and give enough time for care, we are proposing a new appointment schedule. Please review and confirm if convenient.'
    },
    {
        id: 'clinic_adjustment',
        label: 'Clinic Schedule Adjustment',
        template: 'Our clinic schedule has been adjusted, so we are proposing a new appointment time for your visit. Please review the new schedule and confirm at your convenience.'
    },
    {
        id: 'transportation_issue',
        label: 'Transportation Issue',
        template: 'We understand there may be transportation or timing issues affecting the original appointment. We are proposing a new schedule and hope it works better for you.'
    },
    {
        id: 'specific',
        label: 'Specific Reason (Custom)',
        template: ''
    }
];

// ── Custom Calendar (same as AdminSchedule) ──────────────────────────
const CustomCalendar = ({ selectedDate, onSelectDate, availableDays = null, disablePastDates = false }: any) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const todayDate = new Date();
    const minMonth = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
    const maxMonth = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 1);
    const canGoPrev = currentMonth > minMonth;
    const canGoNext = currentMonth < maxMonth;

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
        const dayNamesList = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

        for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} style={{ width: '32px', height: '32px' }} />);

        for (let i = 1; i <= daysInMonth; i++) {
            const dayStr = String(i).padStart(2, '0');
            const fullDate = `${yearStr}-${monthStr}-${dayStr}`;
            const dayOfWeek = new Date(yearStr, currentMonth.getMonth(), i).getDay();
            const dayName = dayNamesList[dayOfWeek];
            const isSelected = selectedDate === fullDate;
            const isToday = fullDate === todayStr;
            const isPast = disablePastDates && fullDate < todayStr;
            const isUnavailableDay = availableDays && availableDays[dayName] === false;
            const isDisabled = isPast || isUnavailableDay;

            let bgColor = 'transparent';
            let textColor = isDisabled ? '#d3d3d3' : '#333';
            let fontWeight = '400';

            if (!isDisabled) {
                if (isSelected) { bgColor = '#3d67ee'; textColor = 'white'; fontWeight = '600'; }
                else if (isToday) { bgColor = '#f0f7ff'; textColor = '#3d67ee'; fontWeight = '700'; }
            }

            days.push(
                <div key={i} onClick={() => !isDisabled && onSelectDate(isSelected ? '' : fullDate)}
                    style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: isDisabled ? 'not-allowed' : 'pointer', backgroundColor: bgColor, color: textColor,
                        borderRadius: '50%', fontSize: '13px', fontWeight, transition: 'all 0.2s ease', opacity: isDisabled ? 0.5 : 1 }}>
                    {i}
                </div>
            );
        }
        return days;
    };

    const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];

    return (
        <div style={{ width: '100%', userSelect: 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <button onClick={prevMonth} type="button" disabled={!canGoPrev}
                    style={{ background: 'none', border: 'none', cursor: canGoPrev ? 'pointer' : 'not-allowed', color: canGoPrev ? '#3d67ee' : '#ccc' }}>
                    <IoChevronBack size={18} />
                </button>
                <h3 style={{ fontSize: '15px', fontWeight: '700', margin: 0 }}>{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</h3>
                <button onClick={nextMonth} type="button" disabled={!canGoNext}
                    style={{ background: 'none', border: 'none', cursor: canGoNext ? 'pointer' : 'not-allowed', color: canGoNext ? '#3d67ee' : '#ccc' }}>
                    <IoChevronForward size={18} />
                </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px 2px', justifyItems: 'center' }}>
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                    <div key={d} style={{ fontSize: '11px', color: '#a0a0a0', fontWeight: '700', marginBottom: '6px' }}>{d}</div>
                ))}
                {renderDays()}
            </div>
        </div>
    );
};

// ── Main Modal ────────────────────────────────────────────────────────
const AdminRescheduleModal = ({ visible, onClose, appointment, onSubmit, currentUserId }: any) => {
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedTimeSlot, setSelectedTimeSlot] = useState<any>(null);
    const [selectedReason, setSelectedReason] = useState('');
    const [emailMessage, setEmailMessage] = useState('');
    const [timeSlots, setTimeSlots] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [availableDays, setAvailableDays] = useState<any>(null);

    const CHAR_LIMIT = 500;
    const selectedReasonOption = RESCHEDULE_REASONS.find(reason => reason.id === selectedReason);
    const generatedExplanation = emailMessage;

    useEffect(() => {
        if (visible) {
            setSelectedDate('');
            setSelectedTimeSlot(null);
            setSelectedReason('');
            setEmailMessage('');
            setTimeSlots([]);
            availabilityService.getDayAvailability()
                .then(setAvailableDays)
                .catch(console.error);
        }
    }, [visible]);

    useEffect(() => {
        if (!selectedReason) {
            setEmailMessage('');
            return;
        }

        setEmailMessage(selectedReasonOption?.template || '');
    }, [selectedReason, selectedReasonOption?.template]);

    useEffect(() => {
        if (!selectedDate) { setTimeSlots([]); return; }
        const dayNamesList = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
        const dayName = dayNamesList[new Date(selectedDate).getDay()];
        setLoadingSlots(true);
        setSelectedTimeSlot(null);
        availabilityService.getTimeSlotsForDay(dayName)
            .then(slots => {
                const formatted = slots.map((s: any) => {
                    const fmt = (t: string) => {
                        if (!t) return '';
                        const [h, m] = t.split(':');
                        const hr = parseInt(h, 10);
                        return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
                    };
                    return {
                        id: s.id,
                        displayText: `${fmt(s.start_time)} - ${fmt(s.end_time)}`,
                        startTime: s.start_time,
                    };
                });
                setTimeSlots(formatted);
            })
            .catch(console.error)
            .finally(() => setLoadingSlots(false));
    }, [selectedDate]);

    const toDbTime = (t: string) => {
        if (!t) return '';
        if (/^\d{2}:\d{2}(:\d{2})?$/.test(t)) return t.length === 5 ? `${t}:00` : t;
        return t;
    };

    const handleSubmit = async () => {
        if (!selectedDate || !selectedTimeSlot) return;
        if (selectedReason && !emailMessage.trim()) return;
        setLoading(true);
        try {
            await onSubmit({
                new_date: selectedDate,
                new_time: toDbTime(selectedTimeSlot.startTime),
                reason: generatedExplanation || null,
                requested_by: currentUserId || null
            });
        } catch (error: any) {
            window.alert('Error: ' + (error.message || 'Failed to reschedule'));
        } finally {
            setLoading(false);
        }
    };

    if (!visible) return null;

    // ── Fix: use correct field names from appointment object ──
    const appointmentEmail = appointment?.patient_email || appointment?.patientEmail || appointment?.email || appointment?.walk_in_email || '';
    const petName = appointment?.petName || appointment?.pet_name || 'Unknown Pet';
    const petType = appointment?.type || appointment?.petType || appointment?.pet_type || '';

    return (
        <div className="modalOverlay">
            <div className="modalContainer" style={{ width: '70%', maxWidth: '600px', display: 'flex', flexDirection: 'column', padding: '30px', maxHeight: '90vh' }}>
                
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '22px', fontWeight: 'bold', margin: 0 }}>Reschedule Appointment</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                        <IoClose size={24} color="#333" />
                    </button>
                </div>

                <div style={{ overflowY: 'auto', flex: 1, paddingRight: '5px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* Original Appointment Info */}
                    {appointment && (
                        <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #eee' }}>
                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#3d67ee', marginBottom: '8px' }}>📋 Original Appointment</div>
                            <div style={{ display: 'flex', gap: '5px', marginBottom: '4px' }}>
                                <span style={{ fontSize: '12px', color: '#666', width: '140px' }}>Current Date & Time:</span>
                                <span style={{ fontSize: '12px', fontWeight: '600' }}>{appointment.date_time}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '5px' }}>
                                <span style={{ fontSize: '12px', color: '#666', width: '140px' }}>Pet:</span>
                                {/* ── FIXED: correct field names ── */}
                                <span style={{ fontSize: '12px', fontWeight: '600' }}>
                                    {petName}{petType ? ` (${petType})` : ''}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Select New Date — Custom Calendar */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600', fontSize: '14px' }}>
                            Select New Date <span style={{ color: '#d32f2f' }}>*</span>
                        </label>
                        <div style={{ border: '1px solid #ddd', borderRadius: '12px', padding: '15px', backgroundColor: '#fafafa' }}>
                            <CustomCalendar
                                selectedDate={selectedDate}
                                onSelectDate={setSelectedDate}
                                availableDays={availableDays}
                                disablePastDates={true}
                            />
                        </div>
                        {selectedDate && (
                            <div style={{ backgroundColor: '#e8f5e9', padding: '10px', borderRadius: '6px', marginTop: '10px', color: '#2e7d32', fontWeight: '600', fontSize: '13px' }}>
                                ✅ Selected: {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </div>
                        )}
                    </div>

                    {/* Select Time Slot */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600', fontSize: '14px' }}>
                            Select New Time Slot <span style={{ color: '#d32f2f' }}>*</span>
                            {loadingSlots && <span style={{ fontSize: '12px', color: '#999', fontWeight: 'normal' }}> Loading...</span>}
                        </label>

                        {!selectedDate ? (
                            <div style={{ padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '8px', color: '#999', textAlign: 'center', fontSize: '13px' }}>
                                Please select a date first
                            </div>
                        ) : timeSlots.length === 0 && !loadingSlots ? (
                            <div style={{ padding: '15px', backgroundColor: '#fff3e0', borderLeft: '4px solid #ff9800', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <IoAlertCircle size={18} color="#f57c00" />
                                <span style={{ fontSize: '13px', color: '#e65100' }}>No time slots configured for this day.</span>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                {timeSlots.map(slot => (
                                    <button key={slot.id} type="button" onClick={() => setSelectedTimeSlot(slot)}
                                        style={{ padding: '12px', borderRadius: '8px',
                                            border: selectedTimeSlot?.id === slot.id ? 'none' : '1px solid #ccc',
                                            backgroundColor: selectedTimeSlot?.id === slot.id ? '#3d67ee' : 'white',
                                            color: selectedTimeSlot?.id === slot.id ? 'white' : '#555',
                                            fontWeight: '600', cursor: 'pointer', fontSize: '13px',
                                            boxShadow: selectedTimeSlot?.id === slot.id ? '0 4px 10px rgba(61,103,238,0.3)' : 'none'
                                        }}>
                                        {slot.displayText}
                                    </button>
                                ))}
                            </div>
                        )}

                        {selectedTimeSlot && (
                            <div style={{ backgroundColor: '#e8f5e9', padding: '10px', borderRadius: '6px', marginTop: '10px', color: '#2e7d32', fontWeight: '600', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <IoCheckmarkCircle size={16} /> Selected: {selectedTimeSlot.displayText}
                            </div>
                        )}
                    </div>

                    {/* Reason */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                            Reason for Rescheduling
                        </label>
                        <select
                            value={selectedReason}
                            onChange={e => {
                                setSelectedReason(e.target.value);
                            }}
                            className="formSelect"
                            style={{ width: '100%', height: '45px' }}
                        >
                            <option value="">-- Select a reason (optional) --</option>
                            {RESCHEDULE_REASONS.map(reason => (
                                <option key={reason.id} value={reason.id}>
                                    {reason.label}
                                </option>
                            ))}
                        </select>
                        {selectedReason && (
                            <div style={{ marginTop: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <label style={{ fontWeight: '600', fontSize: '14px' }}>
                                        Email message to be sent to patient <span style={{ color: '#d32f2f' }}>*</span>
                                    </label>
                                    <span style={{ fontSize: '11px', color: emailMessage.length >= CHAR_LIMIT ? '#d32f2f' : '#999' }}>
                                        {emailMessage.length}/{CHAR_LIMIT}
                                    </span>
                                </div>
                                <textarea
                                    className="formInput"
                                    style={{ height: '100px', width: '100%', resize: 'vertical' }}
                                    value={emailMessage}
                                    onChange={e => setEmailMessage(e.target.value.slice(0, CHAR_LIMIT))}
                                    placeholder={
                                        selectedReason === 'specific'
                                            ? 'Write the message that should be emailed to the patient.'
                                            : 'You can edit the prepared message before sending it.'
                                    }
                                />
                                <div style={{ fontSize: '11px', color: '#666', marginTop: '6px' }}>
                                    The selected reason still helps categorize the request. You can edit the actual email wording here.
                                </div>
                            </div>
                        )}
                    </div>

                    {selectedReason && (
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                                Email to be sent to patient:
                            </label>
                            <div style={{
                                backgroundColor: '#f5f5f5',
                                padding: '15px',
                                borderRadius: '8px',
                                borderLeft: '4px solid #3d67ee'
                            }}>
                                <p style={{ fontSize: '13px', lineHeight: '20px', color: '#333', margin: 0 }}>
                                    {generatedExplanation}
                                </p>
                            </div>
                            <div style={{
                                backgroundColor: '#e3f2fd',
                                padding: '12px',
                                borderRadius: '6px',
                                border: '1px solid #90caf9',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                marginTop: '12px'
                            }}>
                                <IoMail size={18} color="#1976d2" />
                                <span style={{ fontSize: '12px', color: '#1976d2', fontWeight: '600' }}>
                                    Email will be sent to: {appointmentEmail || 'No email on record'}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Email note */}
                    <div style={{ backgroundColor: '#e3f2fd', padding: '12px', borderRadius: '6px', border: '1px solid #90caf9', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <IoMail size={18} color="#1976d2" style={{ marginTop: '1px', flexShrink: 0 }} />
                        <div>
                            <div style={{ fontSize: '12px', color: '#1976d2', fontWeight: '600' }}>Email will be sent to patient</div>
                            <div style={{ fontSize: '11px', color: '#666', marginTop: '3px' }}>The patient will need to confirm the new schedule.</div>
                        </div>
                    </div>
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '15px', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #f0f0f0' }}>
                    <button onClick={onClose} disabled={loading}
                        style={{ flex: 1, padding: '12px', backgroundColor: '#f5f5f5', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#666', fontWeight: '600' }}>
                        Cancel
                    </button>
                    <button onClick={handleSubmit} disabled={!selectedDate || !selectedTimeSlot || loading || (selectedReason && !emailMessage.trim())}
                        style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', fontWeight: '600', color: 'white',
                            backgroundColor: (!selectedDate || !selectedTimeSlot || loading || (selectedReason && !emailMessage.trim())) ? '#ccc' : '#3d67ee',
                            cursor: (!selectedDate || !selectedTimeSlot || loading || (selectedReason && !emailMessage.trim())) ? 'not-allowed' : 'pointer' }}>
                        {loading ? 'Sending...' : 'Send Reschedule Request'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminRescheduleModal;
