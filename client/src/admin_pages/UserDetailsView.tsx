import {
  IoArrowBack,
  IoCalendarClearOutline,
  IoCheckmarkCircleOutline,
  IoCloseCircleOutline,
  IoMedical,
} from 'react-icons/io5';

type AppointmentLike = {
  name?: string;
  patient_email?: string;
  patient_phone?: string;
  reasonForVisit?: string;
  patient_reason?: string;
  pet_name?: string;
  pet_type?: string;
  pet_breed?: string;
  petGender?: string;
  pet_gender?: string;
  service?: string;
  date_time?: string;
  doctor?: string;
  status?: string;
};

type UserDetailsViewProps = {
  user: AppointmentLike | null;
  onBack: () => void;
  onCancel: (user: AppointmentLike) => void;
  onComplete: (user: AppointmentLike) => void;
  onAssignDoctor: (user: AppointmentLike) => void;
  onReschedule: (user: AppointmentLike) => void;
};

export default function UserDetailsView({
  user,
  onBack,
  onCancel,
  onComplete,
  onAssignDoctor,
  onReschedule,
}: UserDetailsViewProps) {
  if (!user) return null;

  const status = (user.status || '').toLowerCase();
  const assignedDoctor = user.doctor || 'Not Assigned';
  const reasonForVisit = user.reasonForVisit || user.patient_reason || 'Not provided';

  const userDetails = {
    fullName: user.name || 'Unknown Patient',
    email: user.patient_email || 'Not provided',
    phone: user.patient_phone || 'Not provided',
    reasonForVisit,
    petName: user.pet_name || 'Unknown Pet',
    petType: user.pet_type || 'Unknown',
    petBreed: user.pet_breed || 'Unknown',
    gender: user.petGender || user.pet_gender || 'Unknown',
  };

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
          Back to Appointments
        </span>
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2 style={{ fontSize: '25px', fontWeight: '700', margin: 0 }}>Patient Details</h2>
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
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-around', padding: '20px 0', borderTop: '1px solid #eee' }}>
          <button
            onClick={() => onReschedule(user)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: '#3d67ee', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
          >
            <IoCalendarClearOutline size={18} />
            <span>Reschedule</span>
          </button>

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
        </div>
      </div>
    </div>
  );
}
