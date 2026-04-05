import {
  IoArrowBack,
  IoCalendarClearOutline,
  IoCheckmarkCircleOutline,
  IoCloseCircleOutline,
  IoMedical,
  IoRefreshOutline,
} from 'react-icons/io5';

// 🟢 FIX: We added all our new variable names to the blueprint so TypeScript stops complaining!
type AppointmentLike = {
  name?: string;
  patient_email?: string;
  patientEmail?: string;
  email?: string;
  walk_in_email?: string;
  patient_phone?: string;
  patientPhone?: string;
  phone?: string;
  contact_number?: string;
  walk_in_phone?: string;
  reasonForVisit?: string;
  patient_reason?: string;
  reason?: string;
  rescheduleReason?: string;
  reschedule_reason?: string;
  pet_name?: string;
  petName?: string;
  pet_type?: string;
  petType?: string;
  type?: string;
  walk_in_pet_type?: string;
  pet_breed?: string;
  petBreed?: string;
  breed?: string;
  walk_in_breed?: string;
  petGender?: string;
  pet_gender?: string;
  gender?: string;
  walk_in_gender?: string;
  service?: string;
  date_time?: string;
  doctor?: string;
  status?: string;
  latestRescheduleRequest?: any;
  medicalInformation?: any;
  medical_information?: any;
};

type UserDetailsViewProps = {
  user: AppointmentLike | null;
  onBack: () => void;
  onAccept: (user: AppointmentLike) => void;
  onCancel: (user: AppointmentLike) => void;
  onComplete: (user: AppointmentLike) => void;
  onAssignDoctor: (user: AppointmentLike) => void;
  onReschedule: (user: AppointmentLike) => void;
  onAcceptClientPreference: (user: AppointmentLike, request: any) => void;
  onDeclineClientPreference: (user: AppointmentLike, request: any) => void;
  onRefresh: () => void;
  refreshing: boolean;
  readOnly?: boolean;
  backLabel?: string;
};

export default function UserDetailsView({
  user,
  onBack,
  onAccept,
  onCancel,
  onComplete,
  onAssignDoctor,
  onReschedule,
  onAcceptClientPreference,
  onDeclineClientPreference,
  onRefresh,
  refreshing,
  readOnly = false,
  backLabel = 'Back to Appointments',
}: UserDetailsViewProps) {
  if (!user) return null;

  const formatDate = (dateValue?: string | null) => {
    if (!dateValue) return 'Not provided';
    const parsed = new Date(`${dateValue}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return String(dateValue);
    return parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatTime = (timeValue?: string | null) => {
    if (!timeValue) return 'Not provided';
    const [hours, minutes] = String(timeValue).split(':');
    if (!hours || !minutes) return String(timeValue);
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatTimestamp = (value?: string | null) => {
    if (!value) return 'Not provided';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value);
    return parsed.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getRequestStatusMeta = (statusValue?: string) => {
    const normalized = (statusValue || '').toLowerCase();
    switch (normalized) {
      case 'needs_new_schedule':
        return { label: 'CLIENT REQUESTED ANOTHER DATE', bg: '#fff3e0', color: '#f57c00' };
      case 'pending':
        return { label: 'WAITING FOR PATIENT RESPONSE', bg: '#e3f2fd', color: '#1565c0' };
      case 'confirmed':
        return { label: 'CONFIRMED', bg: '#e8f5e9', color: '#2e7d32' };
      case 'declined':
        return { label: 'DECLINED', bg: '#ffebee', color: '#c62828' };
      case 'cancelled':
        return { label: 'CANCELLED', bg: '#ffebee', color: '#c62828' };
      case 'expired':
        return { label: 'EXPIRED', bg: '#f5f5f5', color: '#616161' };
      default:
        return { label: normalized ? normalized.toUpperCase() : 'NO REQUEST', bg: '#f5f5f5', color: '#616161' };
    }
  };

  const formatBooleanAnswer = (value?: boolean | null, yesLabel = 'Yes', noLabel = 'No') => {
    if (value === true) return yesLabel;
    if (value === false) return noLabel;
    return 'Not provided';
  };

  const status = (user.status || '').toLowerCase();
  const assignedDoctor = user.doctor || 'Not Assigned';
  const latestRescheduleRequest = user.latestRescheduleRequest || null;
  const medicalInformation = user.medicalInformation || user.medical_information || null;
  
  // Aggressively pull data from ANY possible field name
  const reasonForVisit = user.reasonForVisit || user.patient_reason || user.reason || 'Not provided';
  const rescheduleReason = user.rescheduleReason || user.reschedule_reason || '';
  const email = user.email || user.patientEmail || user.patient_email || user.walk_in_email || 'Not provided';
  const phone = user.phone || user.contact_number || user.patientPhone || user.patient_phone || user.walk_in_phone || 'Not provided';
  
  const petName = user.petName || user.pet_name || 'Unknown Pet';
  const petType = user.type || user.petType || user.pet_type || user.walk_in_pet_type || 'Unknown';
  const petBreed = user.breed || user.petBreed || user.pet_breed || user.walk_in_breed || 'Unknown';
  const petGender = user.gender || user.petGender || user.pet_gender || user.walk_in_gender || 'Unknown';

  const userDetails = {
    fullName: user.name || 'Unknown Patient',
    email: email,
    phone: phone,
    reasonForVisit: reasonForVisit,
    rescheduleReason: rescheduleReason,
    petName: petName,
    petType: petType,
    petBreed: petBreed,
    gender: petGender,
  };

  const requestStatusMeta = getRequestStatusMeta(latestRescheduleRequest?.status);
  const canReviewClientPreference =
    !readOnly &&
    latestRescheduleRequest?.status === 'needs_new_schedule' &&
    (latestRescheduleRequest?.patient_preferred_date || latestRescheduleRequest?.patient_preferred_time);
  const canAcceptAppointment = status === 'pending';
  const showBottomLifecycleActions = !readOnly && status !== 'pending';

  return (
    <div
      style={{
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '20px',
        flex: 1,
        overflowY: 'auto',
        boxShadow: '0 0 18px rgba(0,0,0,0.05)',
      }}
    >
      <button
        onClick={onBack}
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '20px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        <IoArrowBack size={20} color="#3d67ee" />
        <span style={{ color: '#3d67ee', marginLeft: '8px', fontSize: '16px', fontWeight: '500' }}>
          {backLabel}
        </span>
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', gap: '12px', flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: '25px', fontWeight: '700', margin: 0 }}>Patient Details</h2>
        {!readOnly && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {canAcceptAppointment && (
            <>
              <button
                onClick={() => onAccept(user)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: '1px solid #c8e6c9',
                  backgroundColor: '#e8f5e9',
                  color: '#2e7d32',
                  cursor: 'pointer',
                  fontWeight: '600',
                }}
              >
                <IoCheckmarkCircleOutline size={18} />
                <span>Accept Appointment</span>
              </button>
              <button
                onClick={() => onCancel(user)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: '1px solid #ffcdd2',
                  backgroundColor: '#ffebee',
                  color: '#d32f2f',
                  cursor: 'pointer',
                  fontWeight: '600',
                }}
              >
                <IoCloseCircleOutline size={18} />
                <span>Decline Appointment</span>
              </button>
            </>
            )}
            <button
              onClick={onRefresh}
              disabled={refreshing}
              title={refreshing ? 'Refreshing appointments' : 'Refresh appointment details'}
              aria-label={refreshing ? 'Refreshing appointments' : 'Refresh appointment details'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                border: '1px solid #cdd8ff',
                backgroundColor: refreshing ? '#eef2ff' : '#f4f7ff',
                color: '#3d67ee',
                cursor: refreshing ? 'not-allowed' : 'pointer',
                flexShrink: 0,
              }}
            >
              <IoRefreshOutline size={18} />
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
        <div>
          <h3 style={{ fontSize: '18px', color: '#3d67ee', borderBottom: '1px solid #f0f0f0', paddingBottom: '10px', marginBottom: '15px' }}>
            Patient Information
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div><div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Full Name</div><div style={{ fontSize: '14px', fontWeight: '500' }}>{userDetails.fullName}</div></div>
            <div><div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Email</div><div style={{ fontSize: '14px', fontWeight: '500' }}>{userDetails.email}</div></div>
            <div><div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Phone</div><div style={{ fontSize: '14px', fontWeight: '500' }}>{userDetails.phone}</div></div>
            <div><div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Reason for Visit</div><div style={{ fontSize: '14px', fontWeight: '500' }}>{userDetails.reasonForVisit}</div></div>
            <div><div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Reschedule Reason</div><div style={{ fontSize: '14px', fontWeight: '500' }}>{userDetails.rescheduleReason || 'Not provided'}</div></div>
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: '18px', color: '#3d67ee', borderBottom: '1px solid #f0f0f0', paddingBottom: '10px', marginBottom: '15px' }}>
            Pet Information
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div><div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Pet Name</div><div style={{ fontSize: '14px', fontWeight: '500' }}>{userDetails.petName}</div></div>
            <div><div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Type</div><div style={{ fontSize: '14px', fontWeight: '500' }}>{userDetails.petType}</div></div>
            <div><div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Breed</div><div style={{ fontSize: '14px', fontWeight: '500' }}>{userDetails.petBreed}</div></div>
            <div><div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Gender</div><div style={{ fontSize: '14px', fontWeight: '500' }}>{userDetails.gender}</div></div>
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: '18px', color: '#3d67ee', borderBottom: '1px solid #f0f0f0', paddingBottom: '10px', marginBottom: '15px' }}>
            Medical Information
          </h3>
          <div style={{ backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '12px', border: '1px solid #eee' }}>
            {medicalInformation ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '18px' }}>
                  <div><div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Medication in Past 72 Hours</div><div style={{ fontSize: '14px', fontWeight: '500' }}>{formatBooleanAnswer(medicalInformation?.on_medication)}</div></div>
                  <div><div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Flea/Tick Prevention</div><div style={{ fontSize: '14px', fontWeight: '500' }}>{formatBooleanAnswer(medicalInformation?.flea_tick_prevention)}</div></div>
                  <div><div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Up-to-Date Vaccinations</div><div style={{ fontSize: '14px', fontWeight: '500' }}>{formatBooleanAnswer(medicalInformation?.is_vaccinated)}</div></div>
                  <div><div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Pet is Pregnant</div><div style={{ fontSize: '14px', fontWeight: '500' }}>{formatBooleanAnswer(medicalInformation?.is_pregnant)}</div></div>
                  <div><div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Has Allergies</div><div style={{ fontSize: '14px', fontWeight: '500' }}>{formatBooleanAnswer(medicalInformation?.has_allergies)}</div></div>
                  <div><div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Has Skin Condition</div><div style={{ fontSize: '14px', fontWeight: '500' }}>{formatBooleanAnswer(medicalInformation?.has_skin_condition)}</div></div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div><div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Medication Details</div><div style={{ fontSize: '14px', fontWeight: '500', whiteSpace: 'pre-wrap' }}>{medicalInformation?.medication_details || 'Not provided'}</div></div>
                  <div><div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Additional Notes</div><div style={{ fontSize: '14px', fontWeight: '500', whiteSpace: 'pre-wrap' }}>{medicalInformation?.additional_notes || 'Not provided'}</div></div>
                </div>
              </>
            ) : (
              <div style={{ fontSize: '14px', color: '#666' }}>
                No medical information recorded for this appointment yet.
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: '18px', color: '#3d67ee', borderBottom: '1px solid #f0f0f0', paddingBottom: '10px', marginBottom: '15px' }}>
            Appointment Details
          </h3>
          <div style={{ backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '12px', border: '1px solid #eee' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <span style={{ fontSize: '16px', fontWeight: '600' }}>{user.service || 'Appointment'}</span>
              <span style={{ color: '#3d67ee', fontWeight: '600' }}>{user.date_time || 'Schedule not set'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '14px', color: '#666' }}>Assigned Doctor: </span>
                <strong style={{ color: assignedDoctor === 'Not Assigned' ? '#f57c00' : '#333' }}>{assignedDoctor}</strong>
              </div>
              {!readOnly && (
                <button
                  onClick={() => onAssignDoctor(user)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    backgroundColor: assignedDoctor === 'Not Assigned' ? '#fff3e0' : '#e8f5e9',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid',
                    borderColor: assignedDoctor === 'Not Assigned' ? '#ffcc80' : '#c8e6c9',
                    color: assignedDoctor === 'Not Assigned' ? '#f57c00' : '#2e7d32',
                    fontWeight: '600',
                    fontSize: '12px',
                  }}
                >
                  <IoMedical size={14} />
                  <span>{assignedDoctor === 'Not Assigned' ? 'Assign Doctor' : 'Change Doctor'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {latestRescheduleRequest && (
          <div>
            <h3 style={{ fontSize: '18px', color: '#3d67ee', borderBottom: '1px solid #f0f0f0', paddingBottom: '10px', marginBottom: '15px' }}>
              Reschedule Details
            </h3>
            <div style={{ backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '12px', border: '1px solid #eee' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', gap: '12px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#333', marginBottom: '6px' }}>Latest Reschedule Request</div>
                  <div
                    style={{
                      display: 'inline-block',
                      padding: '6px 10px',
                      borderRadius: '999px',
                      backgroundColor: requestStatusMeta.bg,
                      color: requestStatusMeta.color,
                      fontSize: '11px',
                      fontWeight: '700',
                    }}
                  >
                    {requestStatusMeta.label}
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  Created: <strong style={{ color: '#333' }}>{formatTimestamp(latestRescheduleRequest?.created_at)}</strong>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '18px' }}>
                <div><div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Clinic Proposed Date</div><div style={{ fontSize: '14px', fontWeight: '500' }}>{formatDate(latestRescheduleRequest?.proposed_appointment_date)}</div></div>
                <div><div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Clinic Proposed Time</div><div style={{ fontSize: '14px', fontWeight: '500' }}>{formatTime(latestRescheduleRequest?.proposed_appointment_time)}</div></div>
                <div><div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Client Preferred Date</div><div style={{ fontSize: '14px', fontWeight: '500' }}>{formatDate(latestRescheduleRequest?.patient_preferred_date)}</div></div>
                <div><div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Client Preferred Time</div><div style={{ fontSize: '14px', fontWeight: '500' }}>{formatTime(latestRescheduleRequest?.patient_preferred_time)}</div></div>
                <div><div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Clinic Reason</div><div style={{ fontSize: '14px', fontWeight: '500' }}>{latestRescheduleRequest?.reason || 'Not provided'}</div></div>
                <div><div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Patient Response</div><div style={{ fontSize: '14px', fontWeight: '500' }}>{latestRescheduleRequest?.patient_response_type || 'No response yet'}</div></div>
              </div>

              <div style={{ marginBottom: canReviewClientPreference ? '18px' : '0' }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Patient Note</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#333', whiteSpace: 'pre-wrap' }}>
                  {latestRescheduleRequest?.response_note || 'Not provided'}
                </div>
              </div>

              {canReviewClientPreference && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                  <button
                    onClick={() => onDeclineClientPreference(user, latestRescheduleRequest)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 18px',
                      backgroundColor: '#ffebee',
                      color: '#d32f2f',
                      border: '1px solid #ffcdd2',
                      borderRadius: '8px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    <IoCloseCircleOutline size={18} />
                    <span>Decline Preference</span>
                  </button>
                  <button
                    onClick={() => onAcceptClientPreference(user, latestRescheduleRequest)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 18px',
                      backgroundColor: '#e8f5e9',
                      color: '#2e7d32',
                      border: '1px solid #c8e6c9',
                      borderRadius: '8px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    <IoCheckmarkCircleOutline size={18} />
                    <span>Accept Preferred Date</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {!readOnly && (
          <div style={{ display: 'flex', justifyContent: showBottomLifecycleActions ? 'space-around' : 'center', padding: '20px 0', borderTop: '1px solid #eee', gap: '20px', flexWrap: 'wrap' }}>
            <button
              onClick={() => onReschedule(user)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                backgroundColor: '#3d67ee',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              <IoCalendarClearOutline size={18} />
              <span>Reschedule</span>
            </button>

            {showBottomLifecycleActions && (
              <button
                onClick={() => onCancel(user)}
                disabled={status === 'cancelled'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  backgroundColor: status === 'cancelled' ? '#e0e0e0' : '#ffebee',
                  color: status === 'cancelled' ? '#757575' : '#d32f2f',
                  border: '1px solid',
                  borderColor: status === 'cancelled' ? '#bdbdbd' : '#ffcdd2',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: status === 'cancelled' ? 'not-allowed' : 'pointer',
                }}
              >
                <IoCloseCircleOutline size={18} />
                <span>{status === 'cancelled' ? 'Cancelled' : 'Cancel'}</span>
              </button>
            )}

            {showBottomLifecycleActions && (
              <button
                onClick={() => onComplete(user)}
                disabled={status === 'completed'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  backgroundColor: status === 'completed' ? '#e0e0e0' : '#e8f5e9',
                  color: status === 'completed' ? '#757575' : '#2e7d32',
                  border: '1px solid',
                  borderColor: status === 'completed' ? '#bdbdbd' : '#c8e6c9',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: status === 'completed' ? 'not-allowed' : 'pointer',
                }}
              >
                <IoCheckmarkCircleOutline size={18} />
                <span>{status === 'completed' ? 'Completed' : 'Complete'}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
