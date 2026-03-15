import React, { useState, useEffect } from 'react';
import { IoClose, IoCalendarOutline, IoTimeOutline, IoAlertCircle, IoCheckmarkCircle, IoMail } from 'react-icons/io5';
import { availabilityService } from './availabilityService';

const AdminRescheduleModal = ({ visible, onClose, appointment, onSubmit, currentUserId }: any) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<any>(null);
  const [reason, setReason] = useState('');
  const [reasonCount, setReasonCount] = useState(0);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [dayAvailability, setDayAvailability] = useState<any>(null);

  const CHAR_LIMIT = 300;

  // Helper functions
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return 'Select Date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTimeForDisplay = (timeStr: string) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Load day availability on mount
  useEffect(() => {
    if (visible) {
      loadDayAvailability();
      setSelectedDate('');
      setSelectedTimeSlot(null);
      setReason('');
      setReasonCount(0);
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

  // Load time slots when date changes
  useEffect(() => {
    if (selectedDate) {
      loadTimeSlotsForDate(selectedDate);
    } else {
      setAvailableTimeSlots([]);
    }
  }, [selectedDate]);

  const loadTimeSlotsForDate = async (date: string) => {
    setLoadingSlots(true);
    try {
      const slots = await availabilityService.getAvailableTimeSlots(date);
      
      // Format slots for display
      const formattedSlots = slots.map((slot: any) => ({
        id: slot.id,
        displayText: `${formatTimeForDisplay(slot.start_time)} - ${formatTimeForDisplay(slot.end_time)}`,
        startTime: slot.start_time,
        endTime: slot.end_time,
        availableSlots: slot.availableSlots || 1
      }));
      
      setAvailableTimeSlots(formattedSlots);
    } catch (error) {
      console.error('Failed to load time slots:', error);
      setAvailableTimeSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  // Check if a date is disabled
  const isDateDisabled = (dateString: string) => {
    if (!dayAvailability || !dateString) return true;
    
    const date = new Date(dateString);
    // Adjust for timezone differences potentially shifting the day
    const adjustedDate = new Date(date.getTime() + Math.abs(date.getTimezoneOffset() * 60000));
    
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = days[adjustedDate.getDay()];
    
    return !dayAvailability[dayName];
  };

  const handleDateSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateString = e.target.value;
    
    if (isDateDisabled(dateString)) {
      window.alert('Date Not Available: This date is not available for appointments.');
      // Reset input back to empty or previous valid state
      setSelectedDate(''); 
      return;
    }
    
    setSelectedDate(dateString);
    setSelectedTimeSlot(null); // Reset time slot when date changes
  };

  const handleTimeSlotSelect = (slot: any) => {
    setSelectedTimeSlot(slot);
  };

  const handleReasonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    if (text.length <= CHAR_LIMIT) {
      setReason(text);
      setReasonCount(text.length);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!selectedDate) {
      window.alert('Error: Please select a new date');
      return;
    }
    
    if (!selectedTimeSlot) {
      window.alert('Error: Please select a new time slot');
      return;
    }

    setLoading(true);
    
    try {
      const rescheduleData = {
        new_date: selectedDate,
        new_time_slot_id: selectedTimeSlot.id,
        new_time_slot_display: selectedTimeSlot.displayText,
        reason: reason.trim() || null,
        requested_by: currentUserId || null
      };

      const result = await onSubmit(rescheduleData);
      
      // Show success message with email status
      if (result && result.emailSent) {
        window.alert('✅ Success: Reschedule request created successfully.\n\nAn email has been sent to the patient for approval.');
      } else {
        window.alert('✅ Success: Reschedule request created successfully.\n\nNote: Email could not be sent. Please contact the patient manually.');
      }
      
    } catch (error: any) {
      console.error('Error in reschedule submission:', error);
      window.alert('Error: ' + (error.message || 'Failed to create reschedule request'));
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="modalOverlay">
      <div className="modalContainer" style={{ width: '70%', maxWidth: '700px', display: 'flex', flexDirection: 'column', padding: '30px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Reschedule Appointment</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <IoClose size={24} color="#333" />
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, paddingRight: '10px' }}>
          
          {/* Original Appointment Summary */}
          {appointment && (
            <div style={{ 
              marginBottom: '20px', 
              backgroundColor: '#f8f9fa',
              padding: '15px',
              borderRadius: '8px',
              border: '1px solid #eee'
            }}>
              <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '10px', color: '#3d67ee' }}>
                📋 Original Appointment
              </div>
              <div style={{ display: 'flex', marginBottom: '5px' }}>
                <span style={{ fontSize: '12px', color: '#666', width: '150px' }}>Current Date & Time:</span>
                <span style={{ fontSize: '12px', fontWeight: '600', flex: 1 }}>{appointment.date_time}</span>
              </div>
              <div style={{ display: 'flex' }}>
                <span style={{ fontSize: '12px', color: '#666', width: '150px' }}>Pet:</span>
                <span style={{ fontSize: '12px', fontWeight: '600', flex: 1 }}>
                  {appointment.pet_name} ({appointment.pet_type})
                </span>
              </div>
            </div>
          )}

          {/* Select New Date */}
          <div className="formGroup" style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
              Select New Date <span style={{ color: '#d32f2f' }}>*</span>
            </label>
            
            <input 
                type="date"
                min={getTodayDate()}
                value={selectedDate}
                onChange={handleDateSelect}
                className="formInput"
                style={{ width: '100%', cursor: 'pointer' }}
            />
            
            {selectedDate && (
              <div style={{ 
                backgroundColor: '#e8f5e9', 
                padding: '10px', 
                borderRadius: '5px', 
                marginTop: '10px',
                display: 'flex',
                alignItems: 'center'
              }}>
                <IoCalendarOutline size={18} color="#2e7d32" />
                <span style={{ marginLeft: '8px', color: '#2e7d32', fontWeight: '600', fontSize: '14px' }}>
                  Selected: {formatDateForDisplay(selectedDate)}
                </span>
              </div>
            )}
          </div>

          {/* Select New Time Slot */}
          <div className="formGroup" style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
              Select New Time Slot <span style={{ color: '#d32f2f' }}>*</span>
              {loadingSlots && (
                <span style={{ fontSize: '12px', color: '#666', fontStyle: 'italic', fontWeight: 'normal' }}>
                  {' '}Loading...
                </span>
              )}
            </label>
            
            {!selectedDate ? (
              <div style={{ 
                backgroundColor: '#f5f5f5', 
                padding: '20px', 
                borderRadius: '5px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}>
                <IoTimeOutline size={24} color="#999" />
                <span style={{ color: '#666', fontStyle: 'italic', marginTop: '10px', fontSize: '14px' }}>
                  Please select a date first
                </span>
              </div>
            ) : availableTimeSlots.length === 0 ? (
              <div style={{ 
                backgroundColor: '#fff3e0', 
                padding: '20px', 
                borderRadius: '5px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                border: '1px solid #ffcc80'
              }}>
                <IoAlertCircle size={24} color="#f57c00" />
                <span style={{ color: '#f57c00', marginTop: '10px', fontSize: '14px' }}>
                  No time slots available for this date
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', overflowX: 'auto', paddingBottom: '10px', gap: '10px' }}>
                {availableTimeSlots.map((slot) => {
                    const isSelected = selectedTimeSlot?.id === slot.id;
                    return (
                        <button
                            key={slot.id}
                            onClick={() => handleTimeSlotSelect(slot)}
                            style={{
                                padding: '10px 15px', borderRadius: '8px', minWidth: '120px', cursor: 'pointer',
                                border: `1px solid ${isSelected ? '#3d67ee' : '#ccc'}`,
                                backgroundColor: isSelected ? '#3d67ee' : 'white',
                                color: isSelected ? 'white' : '#333',
                                fontWeight: '500', transition: 'all 0.2s', whiteSpace: 'nowrap'
                            }}
                        >
                            {slot.displayText}
                        </button>
                    )
                })}
              </div>
            )}
            
            {selectedTimeSlot && (
              <div style={{
                backgroundColor: '#e8f5e9',
                padding: '10px',
                borderRadius: '5px',
                marginTop: '10px',
                display: 'flex',
                alignItems: 'center'
              }}>
                <IoCheckmarkCircle size={20} color="#2e7d32" />
                <span style={{ marginLeft: '10px', color: '#2e7d32', fontWeight: '600', fontSize: '14px' }}>
                  Selected: {selectedTimeSlot.displayText}
                </span>
              </div>
            )}
          </div>

          {/* Reason for Rescheduling */}
          <div className="formGroup" style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontWeight: '600', fontSize: '14px' }}>Reason for Rescheduling</label>
              <span style={{ fontSize: '11px', color: reasonCount >= CHAR_LIMIT ? '#d32f2f' : '#999' }}>
                {reasonCount}/{CHAR_LIMIT}
              </span>
            </div>
            <textarea
              className="formInput"
              style={{ height: '80px', width: '100%', resize: 'vertical' }}
              value={reason}
              onChange={handleReasonChange}
              placeholder="Please explain why you need to reschedule (optional)"
              maxLength={CHAR_LIMIT}
            />
          </div>

          {/* Email Preview Note */}
          <div style={{ 
            backgroundColor: '#e3f2fd', 
            padding: '12px', 
            borderRadius: '5px', 
            marginTop: '20px',
            border: '1px solid #90caf9'
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <IoMail size={18} color="#1976d2" />
              <span style={{ marginLeft: '8px', fontSize: '12px', color: '#1976d2', fontWeight: '600' }}>
                Email will be sent to {appointment?.patient_email || 'patient'}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#666', marginTop: '5px' }}>
              The patient will need to confirm the new schedule.
            </div>
          </div>

        </div>

        {/* Action Buttons */}
        <div style={{ 
          display: 'flex', justifyContent: 'flex-end', gap: '15px', 
          marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #f0f0f0' 
        }}>
          <button 
            onClick={onClose}
            disabled={loading}
            style={{ 
              flex: 1, padding: '12px 20px', backgroundColor: '#f5f5f5', 
              border: 'none', borderRadius: '8px', cursor: 'pointer', 
              color: '#666', fontWeight: '600', fontSize: '14px'
            }}
          >
            Cancel
          </button>
          
          <button 
            onClick={handleSubmit}
            disabled={!selectedDate || !selectedTimeSlot || loading}
            style={{ 
              flex: 1, padding: '12px 20px', borderRadius: '8px', border: 'none',
              fontWeight: '600', color: 'white', fontSize: '14px',
              backgroundColor: (!selectedDate || !selectedTimeSlot) ? '#ccc' : '#3d67ee',
              cursor: (!selectedDate || !selectedTimeSlot || loading) ? 'not-allowed' : 'pointer',
              opacity: (!selectedDate || !selectedTimeSlot || loading) ? 0.6 : 1
            }}
          >
            {loading ? 'Creating...' : 'Create Reschedule Request'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminRescheduleModal;