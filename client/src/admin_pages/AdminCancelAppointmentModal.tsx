import React, { useState, useEffect } from 'react';
import { IoClose, IoMailOutline } from 'react-icons/io5';

// Predefined cancellation reasons with auto-generated explanations
const CANCELLATION_REASONS = [
  { 
    id: 'doctor_unavailable', 
    label: 'Doctor Unavailable',
    template: 'The veterinarian scheduled for your appointment is currently unavailable due to an emergency. We sincerely apologize for any inconvenience this may cause.'
  },
  { 
    id: 'holiday', 
    label: 'Holiday / Clinic Closed',
    template: 'Our clinic will be closed on the scheduled date due to a holiday. Please contact us to reschedule your appointment at your earliest convenience.'
  },
  { 
    id: 'emergency', 
    label: 'Clinic Emergency',
    template: 'Our clinic is currently attending to an urgent emergency case. We need to reschedule all non-emergency appointments. We apologize for the inconvenience.'
  },
  { 
    id: 'client_request', 
    label: 'Client Request',
    template: 'As per your request, your appointment has been cancelled. Please feel free to book a new appointment at your convenience.'
  },
  { 
    id: 'staff_training', 
    label: 'Staff Training',
    template: 'We have a mandatory staff training session on your appointment date. Please contact us to reschedule. We apologize for any inconvenience.'
  },
  { 
    id: 'facility_maintenance', 
    label: 'Facility Maintenance',
    template: 'Our facility requires urgent maintenance on your scheduled date. Please contact us to reschedule your appointment.'
  },
  { 
    id: 'specific', 
    label: 'Specific Reason (Custom)',
    template: '' // Empty for custom reason
  }
];

const AdminCancelAppointmentModal = ({ visible, onClose, appointment, onSubmit, currentUserId }: any) => {
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [generatedExplanation, setGeneratedExplanation] = useState('');
  const [loading, setLoading] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (visible) {
      setSelectedReason('');
      setCustomReason('');
      setGeneratedExplanation('');
    }
  }, [visible]);

  // Update generated explanation when reason changes
  useEffect(() => {
    if (selectedReason) {
      const reason = CANCELLATION_REASONS.find(r => r.id === selectedReason);
      if (reason) {
        if (selectedReason === 'specific') {
          setGeneratedExplanation(customReason);
        } else {
          setGeneratedExplanation(reason.template);
        }
      }
    } else {
      setGeneratedExplanation('');
    }
  }, [selectedReason, customReason]);

  const handleReasonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const reasonId = e.target.value;
    setSelectedReason(reasonId);
    if (reasonId !== 'specific') {
      setCustomReason('');
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!selectedReason) {
      window.alert('Error: Please select a cancellation reason');
      return;
    }

    if (selectedReason === 'specific' && !customReason.trim()) {
      window.alert('Error: Please enter the specific reason for cancellation');
      return;
    }

    setLoading(true);
    
    try {
      const cancellationData = {
        cancellation_reason: selectedReason,
        cancellation_details: generatedExplanation,
        cancelled_by: currentUserId || null
      };

      const result = await onSubmit(cancellationData);
      
      // Show email status in success message
      if (result && result.emailSent) {
        window.alert('✅ Success: Appointment cancelled successfully.\n\nAn email notification has been sent to the patient.');
      } else {
        window.alert('⚠️ Success with Note: Appointment cancelled successfully.\n\nNote: Email notification could not be sent. Please contact the patient manually.');
      }
      
    } catch (error: any) {
      console.error('Error in cancel submission:', error);
      window.alert('Error: ' + (error.message || 'Failed to cancel appointment'));
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="modalOverlay">
      <div className="modalContainer" style={{ width: '60%', maxWidth: '600px', display: 'flex', flexDirection: 'column', padding: '30px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Cancel Appointment</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <IoClose size={24} color="#333" />
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, paddingRight: '10px' }}>
          
          {/* Appointment Summary */}
          {appointment && (
            <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '12px', marginBottom: '25px', border: '1px solid #eee' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '15px', color: '#3d67ee', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📋 Appointment Details
              </h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#666' }}>Patient:</span>
                <span style={{ fontSize: '12px', fontWeight: '600' }}>{appointment.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#666' }}>Email:</span>
                <span style={{ fontSize: '12px', fontWeight: '600' }}>{appointment.patient_email}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#666' }}>Service:</span>
                <span style={{ fontSize: '12px', fontWeight: '600' }}>{appointment.service}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#666' }}>Date & Time:</span>
                <span style={{ fontSize: '12px', fontWeight: '600' }}>{appointment.date_time}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: '#666' }}>Pet:</span>
                <span style={{ fontSize: '12px', fontWeight: '600' }}>{appointment.pet_name} ({appointment.pet_type})</span>
              </div>
            </div>
          )}

          {/* Cancellation Reason Dropdown */}
          <div className="formGroup" style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
              Cancellation Reason <span style={{ color: '#d32f2f' }}>*</span>
            </label>
            <select 
              value={selectedReason} 
              onChange={handleReasonChange}
              className="formSelect"
              style={{ width: '100%', height: '45px' }}
            >
              <option value="" disabled style={{ color: '#a8a8a8' }}>-- Select a reason --</option>
              {CANCELLATION_REASONS.map(reason => (
                <option key={reason.id} value={reason.id}>
                  {reason.label}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Reason Input */}
          {selectedReason === 'specific' && (
            <div className="formGroup" style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                Specific Reason <span style={{ color: '#d32f2f' }}>*</span>
              </label>
              <textarea
                className="formInput"
                style={{ height: '80px', width: '100%', resize: 'vertical' }}
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Please explain the specific reason for cancellation..."
                maxLength={300}
              />
              <div style={{ fontSize: '11px', color: '#999', textAlign: 'right', marginTop: '5px' }}>
                {customReason.length}/300
              </div>
            </div>
          )}

          {/* Generated Explanation Preview */}
          {generatedExplanation && (
            <div className="formGroup" style={{ marginTop: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                📧 Email to be sent to patient:
              </label>
              <div style={{ 
                backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '8px',
                borderLeft: '4px solid #3d67ee'
              }}>
                <p style={{ fontSize: '13px', lineHeight: '20px', color: '#333', margin: 0 }}>
                  {generatedExplanation}
                </p>
              </div>
              
              {/* Email Preview Note */}
              <div style={{ 
                backgroundColor: '#e3f2fd', padding: '12px', borderRadius: '5px', 
                marginTop: '15px', border: '1px solid #90caf9',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}>
                <IoMailOutline size={18} color="#1976d2" />
                <span style={{ fontSize: '12px', color: '#1976d2', fontWeight: '600' }}>
                  Email will be sent to: {appointment?.patient_email || 'No email on record'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
          <button 
            onClick={onClose} 
            disabled={loading}
            style={{ 
              flex: 1, padding: '12px 20px', backgroundColor: '#f5f5f5', 
              border: 'none', borderRadius: '8px', cursor: 'pointer', 
              color: '#666', fontWeight: '600', fontSize: '14px'
            }}
          >
            Go Back
          </button>
          
          <button 
            onClick={handleSubmit} 
            disabled={!selectedReason || (selectedReason === 'specific' && !customReason) || loading}
            style={{ 
              flex: 1, padding: '12px 20px', borderRadius: '8px', border: 'none',
              fontWeight: '600', color: 'white', fontSize: '14px',
              backgroundColor: (!selectedReason || (selectedReason === 'specific' && !customReason)) ? '#ccc' : '#d32f2f',
              cursor: (!selectedReason || (selectedReason === 'specific' && !customReason) || loading) ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Processing...' : 'Confirm Cancellation'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default AdminCancelAppointmentModal;