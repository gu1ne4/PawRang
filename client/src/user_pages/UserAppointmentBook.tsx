import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './UserStyles.css';
import API_URL from '../API';

import {
  IoPawOutline, IoCalendarOutline, IoChevronBackCircle, IoChevronForwardCircle,
  IoClose, IoHourglassOutline, IoCheckmark, IoInformationCircleOutline,
  IoCloudUploadOutline, IoCutOutline, IoMedicalOutline, IoHomeOutline,
  IoBedOutline, IoScanOutline, IoRadioOutline, IoFlaskOutline, IoAdd,
  IoCloseCircle, IoPersonCircleOutline,
} from 'react-icons/io5';
import ClientNavBar from '../reusable_components/ClientNavBar';

// ─── Types ────────────────────────────────────────────────────────────────────

interface User {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  fullname?: string;
  fullName?: string;
  email?: string;
  contact_number?: string;
  userImage?: string;
  userimage?: string;
}

interface Pet {
  pet_id: number;
  pet_name: string;
  pet_species: string;
  pet_breed: string;
  pet_gender: string;
  age: string;
  pet_photo_url: string | null;
}

interface Branch {
  branch_id: number;
  branch_name: string;
  address: string;
}

interface Service {
  id: number;
  name: string;
  icon: string;
  description: string[];
  basePrice?: string;
  hasOptions: boolean;
  options?: ServiceOption[];
}

interface ServiceOption {
  id: string;
  name: string;
  price: string;
  description: string;
}

interface AlertConfig {
  type: 'info' | 'success' | 'error' | 'confirm';
  title: string;
  message: string;
  onConfirm?: () => void;
  showCancel: boolean;
  confirmText: string;
}

// ─── Static data ──────────────────────────────────────────────────────────────

const clinicHours: Record<string, string[]> = {
  Monday:    ['8:00AM - 9:00AM','9:00AM - 10:00AM','10:00AM - 11:00AM','11:00AM - 12:00PM','1:00PM - 2:00PM','2:00PM - 3:00PM','3:00PM - 4:00PM','4:00PM - 5:00PM'],
  Tuesday:   ['8:00AM - 9:00AM','9:00AM - 10:00AM','10:00AM - 11:00AM','11:00AM - 12:00PM','1:00PM - 2:00PM','2:00PM - 3:00PM','3:00PM - 4:00PM','4:00PM - 5:00PM'],
  Wednesday: ['8:00AM - 9:00AM','9:00AM - 10:00AM','10:00AM - 11:00AM','11:00AM - 12:00PM','1:00PM - 2:00PM','2:00PM - 3:00PM','3:00PM - 4:00PM','4:00PM - 5:00PM'],
  Thursday:  ['8:00AM - 9:00AM','9:00AM - 10:00AM','10:00AM - 11:00AM','11:00AM - 12:00PM','1:00PM - 2:00PM','2:00PM - 3:00PM','3:00PM - 4:00PM','4:00PM - 5:00PM'],
  Friday:    ['8:00AM - 9:00AM','9:00AM - 10:00AM','10:00AM - 11:00AM','11:00AM - 12:00PM','1:00PM - 2:00PM','2:00PM - 3:00PM','3:00PM - 4:00PM','4:00PM - 5:00PM'],
  Saturday:  [],
  Sunday:    [],
};

const groomingOptions: ServiceOption[] = [
  { id:'g1', name:'Basic Grooming',  price:'₱500',  description:'Bath, brush, nail trim' },
  { id:'g2', name:'Full Grooming',   price:'₱800',  description:'Bath, haircut, nail trim, ear cleaning' },
  { id:'g3', name:'Deluxe Grooming', price:'₱1200', description:'Full grooming + teeth brushing + perfume' },
  { id:'g4', name:'Nail Trim Only',  price:'₱200',  description:'Nail clipping and filing' },
  { id:'g5', name:'Bath Only',       price:'₱300',  description:'Shampoo, conditioner, blow dry' },
];

const laboratoryOptions: ServiceOption[] = [
  { id:'l1', name:'Complete Blood Count', price:'₱800',  description:'CBC with differential' },
  { id:'l2', name:'Blood Chemistry',      price:'₱1200', description:'Liver, kidney, glucose levels' },
  { id:'l3', name:'Urinalysis',           price:'₱400',  description:'Complete urine analysis' },
  { id:'l4', name:'Fecal Examination',    price:'₱350',  description:'Parasite and bacteria check' },
  { id:'l5', name:'X-Ray',               price:'₱1500', description:'Single view radiograph' },
  { id:'l6', name:'Ultrasound',          price:'₱2000', description:'Abdominal ultrasound' },
];

const haircutStyles = [
  { id:'h1', name:'Puppy Cut' },
  { id:'h2', name:'Lion Cut' },
  { id:'h3', name:'Teddy Bear Cut' },
  { id:'h4', name:'Summer Cut' },
  { id:'h5', name:'Show Cut' },
  { id:'h6', name:'Custom Style' },
];

const medicalQuestions = [
  { id:'q1', question:'WERE THERE ANY MEDICATIONS GIVEN TO YOUR PET IN THE PAST 72 HOURS?', key:'medications72h', hasDetails:true  },
  { id:'q2', question:'MY PET HAS RECEIVED UP-TO-DATE FLEA AND TICK PREVENTION',             key:'fleaPrevention', hasDetails:false },
  { id:'q3', question:'MY CAT HAS UP-TO-DATE ANTI RABIES+4IN1',                              key:'catVaccinations', hasDetails:false },
  { id:'q4', question:'MY PET IS NOT PREGNANT',                                              key:'notPregnant',    hasDetails:false },
];

const services: Service[] = [
  { id:1, name:'Pet Grooming',            icon:'cut',     description:['Brushing, Nail','Trimming, Haircut,','Bathing, etc.'],         hasOptions:true,  options:groomingOptions },
  { id:2, name:'Consultation & Check-Up', icon:'medical', description:['Preventative service','to assess your',"pet's overall health"], basePrice:'₱500',         hasOptions:false },
  { id:3, name:'Dental Prophylaxis',      icon:'medical', description:['Teeth cleaning,','plaque removal,','oral health check'],       basePrice:'₱800',         hasOptions:false },
  { id:4, name:'Pet Boarding',            icon:'home',    description:['Overnight stay,','feeding,','supervision'],                    basePrice:'₱1,200/night', hasOptions:false },
  { id:5, name:'Confinement',             icon:'bed',     description:['Medical care,','monitoring, IV','fluids, medication'],         basePrice:'₱2,500/day',   hasOptions:false },
  { id:6, name:'X-Ray',                  icon:'scan',    description:['Radiography for','bone, chest,','abdominal imaging'],          basePrice:'₱1,500',       hasOptions:false },
  { id:7, name:'Ultrasound',             icon:'radio',   description:['Soft tissue,','abdominal, cardiac,','pregnancy check'],        basePrice:'₱2,000',       hasOptions:false },
  { id:8, name:'Laboratory Tests',       icon:'flask',   description:['Blood work,','urinalysis, fecal,','chemistry panel'],          hasOptions:true,  options:laboratoryOptions },
  { id:9, name:'Vaccinations',           icon:'flask',   description:['Core vaccines,','boosters,','rabies shot'],                    basePrice:'₱1,200',       hasOptions:false },
];

const DEFAULT_PET_IMG = 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400';
const getToken = () => localStorage.getItem('access_token') ?? '';

// ─── Component ────────────────────────────────────────────────────────────────

const UserAppointmentBook: React.FC = () => {
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

  // ── API data ──────────────────────────────────────────────────────────────
  const [pets,            setPets]            = useState<Pet[]>([]);
  const [branches,        setBranches]        = useState<Branch[]>([]);
  const [loadingPets,     setLoadingPets]     = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);

  // ── Steps ─────────────────────────────────────────────────────────────────
  const [step, setStep] = useState(1);

  // ── Selections ────────────────────────────────────────────────────────────
  const [selectedService,         setSelectedService]         = useState<Service | null>(null);
  const [selectedGroomingOptions, setSelectedGroomingOptions] = useState<ServiceOption[]>([]);
  const [selectedLabOptions,      setSelectedLabOptions]      = useState<ServiceOption[]>([]);
  const [selectedPet,             setSelectedPet]             = useState<Pet | null>(null);
  const [selectedBranch,          setSelectedBranch]          = useState<Branch | null>(null);
  const [selectedDate,            setSelectedDate]            = useState<Date | null>(null);
  const [selectedTime,            setSelectedTime]            = useState<string | null>(null);

  // ── Grooming prefs ────────────────────────────────────────────────────────
  const [selectedHaircutStyle,     setSelectedHaircutStyle]     = useState<string | null>(null);
  const [customHaircutDescription, setCustomHaircutDescription] = useState('');
  const [haircutImage,             setHaircutImage]             = useState<string | null>(null);
  const [haircutImageBase64,       setHaircutImageBase64]       = useState<string | null>(null);
  const [haircutImageMime,         setHaircutImageMime]         = useState('image/jpeg');

  // ── Medical answers ───────────────────────────────────────────────────────
  const [medicalAnswers, setMedicalAnswers] = useState<Record<string, boolean | null>>({
    medications72h: null, fleaPrevention: null, catVaccinations: null, notPregnant: null,
  });
  const [medicationDetails, setMedicationDetails] = useState('');
  const [additionalNotes,   setAdditionalNotes]   = useState('');

  // ── Carousel ──────────────────────────────────────────────────────────────
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [expandedService,  setExpandedService]  = useState<number | null>(null);
  const cardRef    = useRef<HTMLDivElement | null>(null);
  const panelWidth = 280;

 // Load user from localStorage
  useEffect(() => {
    const loadUser = () => {
      try {
        const session = localStorage.getItem('userSession');
        if (session) {
          setCurrentUser(JSON.parse(session));
        } else {
          setCurrentUser(null);
          
          // 👇 TEMPORARILY DISABLED THE REDIRECT HERE 👇
          // navigate('/'); 
          
        }
      } catch (error) {
        console.error("Failed to load user session", error);
      }
    };
    loadUser();
  }, [navigate]);
  // ── Modals ────────────────────────────────────────────────────────────────
  const [alertVisible,        setAlertVisible]        = useState(false);
  const [alertConfig,         setAlertConfig]         = useState<AlertConfig>({ type:'info', title:'', message:'', showCancel:false, confirmText:'OK' });
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [isChecked,           setIsChecked]           = useState(false);
  const [isSubmitting,        setIsSubmitting]        = useState(false);

  // ── Fetch pets ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser?.id) return;
    setLoadingPets(true);
    axios
      .get(`${API_URL}/pets/user/${currentUser.id}`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(res => setPets(res.data.pets ?? []))
      .catch(err => console.error('Failed to fetch pets:', err))
      .finally(() => setLoadingPets(false));
  }, [currentUser?.id]);

  // ── Fetch branches ────────────────────────────────────────────────────────
  useEffect(() => {
    setLoadingBranches(true);
    axios
      .get(`${API_URL}/branches`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(res => setBranches(res.data.branches ?? []))
      .catch(err => console.error('Failed to fetch branches:', err))
      .finally(() => setLoadingBranches(false));
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────

  /** Converts a display slot like "1:00PM - 2:00PM" → "13:00:00" */
  const toDbTime = (slot: string): string => {
    const start = slot.split(' - ')[0].trim();           // "1:00PM"
    const [time, meridiem] = start.split(/(AM|PM)/i);   // ["1:00", "PM"]
    let [hours, minutes]   = time.split(':').map(Number);
    if (meridiem.toUpperCase() === 'PM' && hours !== 12) hours += 12;
    if (meridiem.toUpperCase() === 'AM' && hours === 12) hours  = 0;
    return `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:00`;
  };

  const showAlert = (
    type: AlertConfig['type'], title: string, message: string,
    onConfirm?: () => void, showCancel = false, confirmText = 'OK',
  ) => {
    setAlertConfig({ type, title, message, onConfirm, showCancel, confirmText });
    setAlertVisible(true);
  };

  const handleLogout = () => {
    showAlert('confirm', 'Log Out', 'Are you sure you want to log out?', () => {
      localStorage.removeItem('userSession');
      localStorage.removeItem('access_token');
      navigate('/login');
    }, true, 'Log Out');
  };

  const getDayName = (date: Date | null) => {
    if (!date) return null;
    return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][date.getDay()];
  };

  const getTimeSlots = () => {
    const d = getDayName(selectedDate);
    return d ? clinicHours[d] ?? [] : [];
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' });
  };

  const getTotalPrice = () => {
    let total = 0;
    selectedGroomingOptions.forEach(o => { total += parseFloat(o.price.replace(/[₱,]/g,'')); });
    selectedLabOptions.forEach(o =>      { total += parseFloat(o.price.replace(/[₱,]/g,'')); });
    if (selectedService && !selectedService.hasOptions && selectedService.basePrice)
      total += parseFloat(selectedService.basePrice.replace(/[₱,]/g,'').split('/')[0]);
    return total;
  };

  const getIconComponent = (icon: string) => {
    switch (icon) {
      case 'cut':   return <IoCutOutline   size={40} />;
      case 'home':  return <IoHomeOutline  size={40} />;
      case 'bed':   return <IoBedOutline   size={40} />;
      case 'scan':  return <IoScanOutline  size={40} />;
      case 'radio': return <IoRadioOutline size={40} />;
      case 'flask': return <IoFlaskOutline size={40} />;
      default:      return <IoMedicalOutline size={40} />;
    }
  };

  const isGrooming = selectedService?.id === 1 && selectedGroomingOptions.length > 0;

  const getProgressSteps = () => isGrooming
    ? [{n:1,l:'Service'},{n:2,l:'Pet'},{n:3,l:'Grooming Prefs'},{n:4,l:'Branch'},{n:5,l:'Date & Time'},{n:6,l:'Medical Info'},{n:7,l:'Confirm'}]
    : [{n:1,l:'Service'},{n:2,l:'Pet'},{n:3,l:'Branch'},{n:4,l:'Date & Time'},{n:5,l:'Medical Info'},{n:6,l:'Confirm'}];

  const getStepTitle = () => {
    if (step === 1) return 'Book an Appointment';
    if (step === 2) return 'Select Your Pet';
    if (step === 3) return isGrooming ? 'Grooming Preferences' : 'Select Branch';
    if (step === 4) return isGrooming ? 'Select Branch' : 'Select Date & Time';
    if (step === 5) return isGrooming ? 'Select Date & Time' : 'Medical Information';
    if (step === 6) return isGrooming ? 'Medical Information' : 'Confirm Booking';
    if (step === 7) return 'Confirm Booking';
    return '';
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Service carousel
  // ─────────────────────────────────────────────────────────────────────────

  const handleServiceSelect = (service: Service) => {
    if (selectedService?.id === service.id) {
      setSelectedService(null); setSelectedGroomingOptions([]); setSelectedLabOptions([]); setExpandedService(null);
    } else {
      setSelectedService(service); setSelectedGroomingOptions([]); setSelectedLabOptions([]);
      setExpandedService(service.hasOptions ? service.id : null);
    }
  };

  const getVisibleCards = () => {
    const cards: { service: Service; position: number }[] = [];
    for (let i = -1; i <= 1; i++) {
      const idx = currentCardIndex + i;
      if (idx >= 0 && idx < services.length) cards.push({ service: services[idx], position: i });
    }
    return cards;
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Step navigation
  // ─────────────────────────────────────────────────────────────────────────

  const handleProceed = () => {
    if (!selectedService) { showAlert('info','No Service Selected','Please select a service first'); return; }
    if (selectedService.hasOptions) {
      if (selectedService.id === 1 && !selectedGroomingOptions.length) { showAlert('info','No Options','Please select at least one grooming option'); return; }
      if (selectedService.id === 8 && !selectedLabOptions.length)      { showAlert('info','No Tests','Please select at least one laboratory test'); return; }
    }
    setStep(2);
  };

  const handleBack = () => {
    if      (step === 2) { setStep(1); setSelectedPet(null); }
    else if (step === 3) { setStep(2); setSelectedBranch(null); }
    else if (step === 4) { setStep(3); setSelectedDate(null); setSelectedTime(null); }
    else if (step === 5) { setStep(4); }
    else if (step === 6) { setStep(5); }
    else if (step === 7) { setStep(6); }
  };

  const handleContinue = () => {
    if (step === 2) {
      if (!selectedPet) { showAlert('info','No Pet Selected','Please select a pet first'); return; }
      setStep(3);
    } else if (step === 3) {
      if (isGrooming) {
        if (!selectedHaircutStyle) { showAlert('info','No Style','Please select a haircut style'); return; }
        if (selectedHaircutStyle === 'h6' && !customHaircutDescription.trim()) { showAlert('info','Incomplete','Please describe your custom style'); return; }
        setStep(4);
      } else {
        if (!selectedBranch) { showAlert('info','No Branch','Please select a branch'); return; }
        setStep(4);
      }
    } else if (step === 4) {
      if (isGrooming) {
        if (!selectedBranch) { showAlert('info','No Branch','Please select a branch'); return; }
        setStep(5);
      } else {
        if (!selectedDate || !selectedTime) { showAlert('info','Incomplete','Please select date and time'); return; }
        setStep(5);
      }
    } else if (step === 5) {
      if (isGrooming) {
        if (!selectedDate || !selectedTime) { showAlert('info','Incomplete','Please select date and time'); return; }
        setStep(6);
      } else {
        const allAnswered = medicalQuestions.every(q => medicalAnswers[q.key] !== null);
        if (!allAnswered) { showAlert('info','Incomplete','Please answer all medical questions'); return; }
        if (medicalAnswers.medications72h && !medicationDetails.trim()) { showAlert('info','Incomplete','Please specify the medications given'); return; }
        setStep(6);
      }
    } else if (step === 6) {
      if (isGrooming) {
        const allAnswered = medicalQuestions.every(q => medicalAnswers[q.key] !== null);
        if (!allAnswered) { showAlert('info','Incomplete','Please answer all medical questions'); return; }
        if (medicalAnswers.medications72h && !medicationDetails.trim()) { showAlert('info','Incomplete','Please specify the medications given'); return; }
        setStep(7);
      } else {
        setConfirmModalVisible(true);
      }
    } else if (step === 7) {
      setConfirmModalVisible(true);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Submit booking
  // ─────────────────────────────────────────────────────────────────────────

  const handleConfirmBooking = async () => {
    if (!currentUser || !selectedPet || !selectedDate || !selectedTime || !selectedBranch || !selectedService) return;
    setIsSubmitting(true);

    try {
      let typeLabel = selectedService.name;
      if (selectedService.id === 1 && selectedGroomingOptions.length)
        typeLabel = `Pet Grooming (${selectedGroomingOptions.map(o => o.name).join(', ')})`;
      if (selectedService.id === 8 && selectedLabOptions.length)
        typeLabel = `Laboratory Tests (${selectedLabOptions.map(o => o.name).join(', ')})`;
      
      // appointments POST — cast ids to Number
      const apptRes = await axios.post(
        `${API_URL}/appointments`,
        {
          owner_id:         currentUser.id,
          pet_id:           Number(selectedPet.pet_id),       // ← fix bigint error
          appointment_type: typeLabel,
          appointment_date: selectedDate.toISOString().split('T')[0],
          appointment_time: toDbTime(selectedTime),
          branch_id:        Number(selectedBranch.branch_id), // ← fix bigint error
          patient_reason:   additionalNotes,
        },
        { headers: { Authorization: `Bearer ${getToken()}` } },
      );
          const appointmentId: number = apptRes.data.appointment_id;  // ← declared inside try

      // medical-information POST — add the three NOT NULL fields
      await axios.post(
        `${API_URL}/medical-information`,
        {
          appointment_id:       appointmentId,
          on_medication:        medicalAnswers.medications72h  ?? false,
          medication_details:   medicationDetails,
          flea_tick_prevention: medicalAnswers.fleaPrevention  ?? false,
          is_vaccinated:        medicalAnswers.catVaccinations ?? false,
          is_pregnant:          !(medicalAnswers.notPregnant   ?? true),
          additional_notes:     additionalNotes,
          has_allergies:        false,       // ← fix NOT NULL constraint
          has_skin_condition:   false,       // ← fix NOT NULL constraint
          been_groomed_before:  false,       // ← fix NOT NULL constraint
        },
        { headers: { Authorization: `Bearer ${getToken()}` } },
      );

      if (selectedService.id === 1 && selectedHaircutStyle) {
        let referenceUrl: string | undefined;
        if (haircutImageBase64) {
          try {
            const upRes = await axios.post(
              `${API_URL}/upload-pet-photo`,
              { file: haircutImageBase64, file_name: `haircut_ref_${appointmentId}.jpg`, mime_type: haircutImageMime },
              { headers: { Authorization: `Bearer ${getToken()}` } },
            );
            referenceUrl = upRes.data.photoUrl;
          } catch { /* non-fatal */ }
        }
        const styleName = haircutStyles.find(h => h.id === selectedHaircutStyle)?.name ?? selectedHaircutStyle;
        await axios.post(
          `${API_URL}/grooming-details`,
          { appointment_id: appointmentId, haircut_style: styleName, haircut_description: customHaircutDescription || undefined, haircut_reference_url: referenceUrl },
          { headers: { Authorization: `Bearer ${getToken()}` } },
        );
      }

      setIsSubmitting(false);
      setConfirmModalVisible(false);
      showAlert('success','Appointment Submitted!',
        'Your appointment is under review. You will receive an email once it is confirmed.',
        () => navigate('/user/home'),
      );
    } catch (err: any) {
      setIsSubmitting(false);
      showAlert('error','Booking Failed', err.response?.data?.error ?? 'Something went wrong. Please try again.');
      console.log(err)
    }
  };

  // ── Image picker ──────────────────────────────────────────────────────────
  const pickImage = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = e => {
      const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = evt => {
        const result = evt.target?.result as string;
        setHaircutImage(result);
        setHaircutImageBase64(result.split(',')[1]);
        setHaircutImageMime(file.type);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const displayName = currentUser
    ? (
        currentUser.fullname
        ?? currentUser.fullName
        ?? (`${currentUser.firstName ?? ''} ${currentUser.lastName ?? ''}`.trim() || currentUser.username)
      ) ?? ''
    : '';

  const timeSlots = getTimeSlots();

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="user-appointment-container">

      {/* ── Alert Modal ── */}
      {alertVisible && (
        <div className="modal-overlay" onClick={() => setAlertVisible(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-icon">
              {alertConfig.type === 'success' && <IoCheckmark                size={55} color="#2e9e0c" />}
              {alertConfig.type === 'error'   && <IoClose                    size={55} color="#d93025" />}
              {!['success','error'].includes(alertConfig.type) && <IoInformationCircleOutline size={55} color="#3d67ee" />}
            </div>
            <h3 className="modal-title">{alertConfig.title}</h3>
            <div className="modal-message"><p>{alertConfig.message}</p></div>
            <div className="modal-actions">
              {alertConfig.showCancel && (
                <button className="modal-btn modal-btn-cancel" onClick={() => setAlertVisible(false)}>Cancel</button>
              )}
              <button
                className={`modal-btn modal-btn-confirm ${alertConfig.type === 'error' ? 'error-btn' : ''}`}
                onClick={() => { setAlertVisible(false); alertConfig.onConfirm?.(); }}
              >
                {alertConfig.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Submitting overlay ── */}
      {isSubmitting && (
        <div className="modal-overlay">
          <div className="modal-content">
            <IoHourglassOutline size={55} color="#3d67ee" />
            <h3 className="modal-title">Submitting…</h3>
            <p className="modal-message">Please wait while we book your appointment.</p>
          </div>
        </div>
      )}

      {/* ── Confirmation Modal ── */}
      {confirmModalVisible && (
        <div className="modal-overlay" onClick={() => setConfirmModalVisible(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setConfirmModalVisible(false)}>
              <IoClose size={24} color="#999" />
            </button>
            <div className="confirmation-icon"><IoHourglassOutline size={70} color="#3d67ee" /></div>
            <h2 className="confirmation-title">Appointment Under Review</h2>
            <p className="confirmation-text">
              Your appointment will be reviewed by our team. You will receive an email once it is confirmed.
            </p>
            <div className="checkbox-container">
              <label className="checkbox-label">
                <input type="checkbox" checked={isChecked} onChange={e => setIsChecked(e.target.checked)} className="checkbox-input" />
                <span className="checkbox-text">I understand</span>
              </label>
            </div>
            <button
              className={`confirmation-btn ${!isChecked ? 'disabled' : ''}`}
              onClick={handleConfirmBooking}
              disabled={!isChecked || isSubmitting}
            >
              Confirm Booking
            </button>
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

      <div className="appointment-content">

        {/* Progress bar */}
        <div className="progress-container">
          <div className="progress-steps">
            {getProgressSteps().map((s, i, arr) => (
              <React.Fragment key={s.n}>
                <div className="step-item">
                  <div className={`step-circle ${step >= s.n ? 'active' : ''}`}><span>{s.n}</span></div>
                  <span className={`step-label ${step === s.n ? 'active' : ''}`}>{s.l}</span>
                </div>
                {i < arr.length - 1 && <div className={`step-line ${step > s.n ? 'active' : ''}`} />}
              </React.Fragment>
            ))}
          </div>
        </div>

        <h1 className="step-title">{getStepTitle()}</h1>

        {/* ══ STEP 1 — Service ══ */}
        {step === 1 && (
          <div className="step-content">
            <div className="service-carousel">
              <div className="carousel-controls">
                <button className="carousel-arrow" onClick={() => { if (currentCardIndex > 0) { setCurrentCardIndex(c => c-1); setExpandedService(null); }}} disabled={currentCardIndex === 0}>
                  <IoChevronBackCircle size={50} color={currentCardIndex === 0 ? '#ccc' : '#3d67ee'} />
                </button>
              </div>

              <div className="carousel-cards">
                {getVisibleCards().map(({ service, position }) => {
                  const isSelected = selectedService?.id === service.id;
                  return (
                    <div
                      key={service.id}
                      className={`service-card-wrapper ${position === 0 ? 'center-card' : ''}`}
                      style={{ transform:`scale(${position===0?1:0.85})`, opacity:position===0?1:0.5, zIndex:position===0?30:position===-1?20:10 }}
                      ref={position === 0 ? cardRef : null}
                    >
                      <button
                        className={`service-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleServiceSelect(service)}
                        disabled={position !== 0}
                      >
                        <div className="service-icon">{getIconComponent(service.icon)}</div>
                        <h3 className="service-name">{service.name}</h3>
                        <div className="service-description">{service.description.map((l,i) => <p key={i}>{l}</p>)}</div>
                        {service.basePrice && <p className="service-price">{service.basePrice}</p>}
                      </button>

                      {position === 0 && service.hasOptions && expandedService === service.id && (
                        <div className="options-panel" style={{ left:210, top:0, width:panelWidth }}>
                          <h3 className="options-title">{service.id === 1 ? 'Grooming Options' : 'Lab Options'}</h3>
                          <div className="options-list">
                            {(service.id === 1 ? groomingOptions : laboratoryOptions).map(opt => {
                              const isSel = service.id === 1
                                ? selectedGroomingOptions.some(o => o.id === opt.id)
                                : selectedLabOptions.some(o => o.id === opt.id);
                              return (
                                <button
                                  key={opt.id}
                                  className={`option-item ${isSel ? 'selected' : ''}`}
                                  onClick={() => {
                                    if (service.id === 1) {
                                      setSelectedGroomingOptions(prev => prev.some(o => o.id === opt.id) ? prev.filter(o => o.id !== opt.id) : [...prev, opt]);
                                    } else {
                                      setSelectedLabOptions(prev => {
                                        if (prev.some(o => o.id === opt.id)) return prev.filter(o => o.id !== opt.id);
                                        if (prev.length >= 3) { showAlert('info','Max 3','You can only select up to 3 lab tests'); return prev; }
                                        return [...prev, opt];
                                      });
                                    }
                                  }}
                                >
                                  <h4 className="option-name">{opt.name}</h4>
                                  <p className="option-description">{opt.description}</p>
                                  <p className="option-price">{opt.price}</p>
                                </button>
                              );
                            })}
                          </div>
                          {service.id === 8 && <p className="lab-limit-note">Select up to 3 tests</p>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="carousel-controls">
                <button className="carousel-arrow" onClick={() => { if (currentCardIndex < services.length-1) { setCurrentCardIndex(c => c+1); setExpandedService(null); }}} disabled={currentCardIndex === services.length-1}>
                  <IoChevronForwardCircle size={50} color={currentCardIndex === services.length-1 ? '#ccc' : '#3d67ee'} />
                </button>
              </div>
            </div>

            {selectedService && (
              <div className="selected-services">
                <h4>Selected:</h4>
                <div className="selected-services-list">
                  <div className="selected-service-tag">
                    <span>{selectedService.name}</span>
                    <button onClick={() => { setSelectedService(null); setSelectedGroomingOptions([]); setSelectedLabOptions([]); setExpandedService(null); }}>
                      <IoCloseCircle size={16} color="white" />
                    </button>
                  </div>
                  {selectedGroomingOptions.map(o => (
                    <div key={o.id} className="selected-service-tag grooming">
                      <span>{o.name}</span>
                      <button onClick={() => setSelectedGroomingOptions(prev => prev.filter(x => x.id !== o.id))}><IoCloseCircle size={16} color="white" /></button>
                    </div>
                  ))}
                  {selectedLabOptions.map(o => (
                    <div key={o.id} className="selected-service-tag lab">
                      <span>{o.name}</span>
                      <button onClick={() => setSelectedLabOptions(prev => prev.filter(x => x.id !== o.id))}><IoCloseCircle size={16} color="white" /></button>
                    </div>
                  ))}
                </div>
                <p className="selected-total">Total: ₱{getTotalPrice().toLocaleString()}</p>
              </div>
            )}

            <div className="action-buttons">
              <button className="btn-primary" onClick={handleProceed}>Proceed</button>
            </div>
          </div>
        )}

        {/* ══ STEP 2 — Pet ══ */}
        {step === 2 && (
          <div className="step-content">
            {loadingPets ? (
              <p style={{ textAlign:'center', color:'#999', padding:40 }}>Loading your pets…</p>
            ) : pets.length === 0 ? (
              <div style={{ textAlign:'center', padding:40 }}>
                <IoPawOutline size={60} color="#ccc" />
                <p style={{ color:'#999', marginTop:10 }}>No pets found. Add a pet first!</p>
              </div>
            ) : (
              <div className="pets-grid">
                {pets.map(pet => (
                  <button
                    key={pet.pet_id}
                    className={`pet-card ${selectedPet?.pet_id === pet.pet_id ? 'selected' : ''}`}
                    onClick={() => setSelectedPet(pet)}
                  >
                    <img src={pet.pet_photo_url ?? DEFAULT_PET_IMG} alt={pet.pet_name} className="pet-image" />
                    <h3 className="pet-name">{pet.pet_name}</h3>
                    <p className="pet-details">{pet.pet_species} • {pet.pet_breed}</p>
                    <p className="pet-details">{pet.pet_gender} • {pet.age} yrs</p>
                  </button>
                ))}
                <button className="add-pet-card" onClick={() => navigate('/user/pet-profile')}>
                  <div className="add-pet-icon"><IoAdd size={50} color="#3d67ee" /></div>
                  <span className="add-pet-text">Add Pet</span>
                </button>
              </div>
            )}
            <div className="action-buttons-row">
              <button className="btn-secondary" onClick={handleBack}>Back</button>
              <button className="btn-primary"   onClick={handleContinue}>Proceed</button>
            </div>
          </div>
        )}

        {/* ══ STEP 3 — Grooming prefs / Branch ══ */}
        {step === 3 && isGrooming && (
          <div className="step-content">
            <div className="grooming-preferences-container">
              <div className="haircut-styles-grid">
                {haircutStyles.map(style => (
                  <button
                    key={style.id}
                    className={`haircut-style-card ${selectedHaircutStyle === style.id ? 'selected' : ''}`}
                    onClick={() => setSelectedHaircutStyle(style.id)}
                  >
                    <div className="haircut-image-wrapper">
                      <img src="https://images.unsplash.com/photo-1544568100-847a948585b9?w=300" alt={style.name} className="haircut-image" />
                      <div className="haircut-gradient-overlay">
                        <span className="haircut-name-overlay">{style.name}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              {selectedHaircutStyle === 'h6' && (
                <>
                  <div style={{ marginTop:20 }}>
                    <label className="grooming-label">Describe your custom style <span className="required-asterisk">*</span></label>
                    <textarea className="custom-style-input" rows={3} placeholder="Describe the desired haircut…" value={customHaircutDescription} onChange={e => setCustomHaircutDescription(e.target.value)} />
                  </div>
                  <div style={{ marginTop:15 }}>
                    <label className="grooming-label">Reference Image (Optional)</label>
                    <button className="image-upload-btn" onClick={pickImage} type="button">
                      {haircutImage
                        ? <div className="upload-preview"><img src={haircutImage} alt="Ref" style={{ width:'100%', height:'100%', objectFit:'cover' }} /><p>Tap to change</p></div>
                        : <div className="upload-placeholder"><IoCloudUploadOutline size={30} color="#3d67ee" /><p>Upload Reference Image</p></div>}
                    </button>
                  </div>
                </>
              )}
            </div>
            <div className="action-buttons-row" style={{ marginTop:40 }}>
              <button className="btn-secondary" onClick={handleBack}>Back</button>
              <button className="btn-primary" onClick={handleContinue} disabled={!selectedHaircutStyle}>Continue</button>
            </div>
          </div>
        )}

        {step === 3 && !isGrooming && (
          <div className="step-content">
            {loadingBranches
              ? <p style={{ textAlign:'center', color:'#999', padding:40 }}>Loading branches…</p>
              : (
                <div className="branches-grid">
                  {branches.map(branch => (
                    <button
                      key={branch.branch_id}
                      className={`branch-card ${selectedBranch?.branch_id === branch.branch_id ? 'selected' : ''}`}
                      onClick={() => setSelectedBranch(branch)}
                    >
                      <h3 className="branch-name">📍 {branch.branch_name}</h3>
                      <p className="branch-address">{branch.address}</p>
                    </button>
                  ))}
                </div>
              )}
            <div className="action-buttons-row">
              <button className="btn-secondary" onClick={handleBack}>Back</button>
              <button className="btn-primary"   onClick={handleContinue}>Proceed</button>
            </div>
          </div>
        )}

        {/* ══ STEP 4 — Branch (grooming) / Date+Time (others) ══ */}
        {step === 4 && isGrooming && (
          <div className="step-content">
            {loadingBranches
              ? <p style={{ textAlign:'center', color:'#999', padding:40 }}>Loading branches…</p>
              : (
                <div className="branches-grid">
                  {branches.map(branch => (
                    <button
                      key={branch.branch_id}
                      className={`branch-card ${selectedBranch?.branch_id === branch.branch_id ? 'selected' : ''}`}
                      onClick={() => setSelectedBranch(branch)}
                    >
                      <h3 className="branch-name">📍 {branch.branch_name}</h3>
                      <p className="branch-address">{branch.address}</p>
                    </button>
                  ))}
                </div>
              )}
            <div className="action-buttons-row">
              <button className="btn-secondary" onClick={handleBack}>Back</button>
              <button className="btn-primary"   onClick={handleContinue}>Proceed</button>
            </div>
          </div>
        )}

        {((step === 4 && !isGrooming) || (step === 5 && isGrooming)) && (
          <div className="step-content">
            {selectedDate && (
              <div className="selected-datetime-display">
                <div className="selected-datetime-badge">
                  <span>{formatDate(selectedDate)}{selectedTime ? ` at ${selectedTime}` : ''}</span>
                </div>
              </div>
            )}
            <div className="datetime-container">
              <div className="calendar-wrapper">
                <div className="calendar-gradient">
                  <Calendar
                    onChange={(v: any) => { if (v instanceof Date) { setSelectedDate(v); setSelectedTime(null); } }}
                    value={selectedDate}
                    minDate={new Date()}
                    maxDate={(() => { const d = new Date(); d.setMonth(d.getMonth()+2); return d; })()}
                    tileDisabled={({ date, view }) => {
                      if (view === 'month') { const d = getDayName(date); return d ? !clinicHours[d]?.length : true; }
                      return false;
                    }}
                  />
                </div>
              </div>
              <div className="time-slots-wrapper">
                <h3 className="time-slots-title">Available Time Slots</h3>
                {!selectedDate
                  ? <div className="time-slots-empty"><p>Select a date first</p></div>
                  : timeSlots.length > 0
                    ? <div className="time-slots-grid">
                        {timeSlots.map((t,i) => (
                          <button key={i} className={`time-slot-btn ${selectedTime===t?'selected':''}`} onClick={() => setSelectedTime(t)}>{t}</button>
                        ))}
                      </div>
                    : <div className="time-slots-empty"><p>No slots available for this date</p></div>
                }
              </div>
            </div>
            <div className="action-buttons-row">
              <button className="btn-secondary" onClick={handleBack}>Back</button>
              <button className="btn-primary"   onClick={handleContinue}>Proceed</button>
            </div>
          </div>
        )}

        {/* ══ Medical Info ══ */}
        {((step === 5 && !isGrooming) || (step === 6 && isGrooming)) && (
          <div className="step-content">
            <div className="medical-questionnaire">
              <div className="required-info-banner">
                <IoInformationCircleOutline size={24} color="#ee3d5a" />
                <p><strong>Required:</strong> All questions must be answered before proceeding.</p>
              </div>
              <div className="questions-list">
                {medicalQuestions.map(q => (
                  <div key={q.id} className="question-item">
                    <div className="question-header">
                      <h4>{q.question}<span className="required-asterisk">*</span></h4>
                    </div>
                    <div className="question-options">
                      {[true, false].map(val => (
                        <label key={String(val)} className="radio-label">
                          <input type="radio" name={q.key} checked={medicalAnswers[q.key] === val} onChange={() => setMedicalAnswers(prev => ({ ...prev, [q.key]: val }))} />
                          <span>{val ? 'Yes' : 'No'}</span>
                        </label>
                      ))}
                    </div>
                    {q.key === 'medications72h' && medicalAnswers.medications72h === true && (
                      <div className="medication-details">
                        <label>Please specify: <span className="required-asterisk">*</span></label>
                        <textarea className="medication-textarea" rows={3} placeholder="e.g. Antibiotics, dosage, when given…" value={medicationDetails} onChange={e => setMedicationDetails(e.target.value)} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="additional-notes">
                <label>Additional Notes (Optional)</label>
                <textarea className="notes-textarea" rows={4} placeholder="Any specific concerns…" value={additionalNotes} onChange={e => setAdditionalNotes(e.target.value)} />
              </div>
            </div>
            <div className="action-buttons-row">
              <button className="btn-secondary" onClick={handleBack}>Back</button>
              <button
                className="btn-primary"
                onClick={handleContinue}
                disabled={
                  Object.values(medicalAnswers).some(v => v === null) ||
                  (medicalAnswers.medications72h === true && !medicationDetails.trim())
                }
              >
                Proceed
              </button>
            </div>
          </div>
        )}

        {/* ══ Confirmation ══ */}
        {((step === 6 && !isGrooming) || step === 7) && (
          <div className="step-content">
            <div className="confirmation-details">

              <div className="confirmation-card">
                <div className="card-header"><IoPersonCircleOutline size={27} color="#3d67ee" /><h3>Owner Details</h3></div>
                <div className="card-details">
                  <div className="detail-row"><span className="detail-label">Full Name</span><span className="detail-value">{displayName}</span></div>
                  <div className="detail-row"><span className="detail-label">Email</span><span className="detail-value">{currentUser?.email ?? 'N/A'}</span></div>
                  <div className="detail-row"><span className="detail-label">Phone</span><span className="detail-value">{currentUser?.contact_number ?? 'N/A'}</span></div>
                </div>
              </div>

              {selectedPet && (
                <div className="confirmation-card">
                  <div className="card-header"><IoPawOutline size={22} color="#3d67ee" /><h3>Pet Details</h3></div>
                  <div className="pet-details-row">
                    <img src={selectedPet.pet_photo_url ?? DEFAULT_PET_IMG} alt={selectedPet.pet_name} className="pet-detail-image" />
                    <div className="pet-detail-info">
                      <div className="detail-row"><span className="detail-label">Name</span><span className="detail-value">{selectedPet.pet_name}</span></div>
                      <div className="detail-row"><span className="detail-label">Species</span><span className="detail-value">{selectedPet.pet_species}</span></div>
                      <div className="detail-row"><span className="detail-label">Breed</span><span className="detail-value">{selectedPet.pet_breed}</span></div>
                      <div className="detail-row"><span className="detail-label">Gender</span><span className="detail-value">{selectedPet.pet_gender}</span></div>
                    </div>
                  </div>
                </div>
              )}

              {step === 7 && selectedHaircutStyle && (
                <div className="confirmation-card">
                  <div className="card-header"><IoCutOutline size={22} color="#3d67ee" /><h3>Grooming Preferences</h3></div>
                  <div className="card-details">
                    <div className="detail-row"><span className="detail-label">Style</span><span className="detail-value">{haircutStyles.find(h => h.id === selectedHaircutStyle)?.name}</span></div>
                    {selectedHaircutStyle === 'h6' && customHaircutDescription && (
                      <div className="detail-row"><span className="detail-label">Description</span><span className="detail-value">{customHaircutDescription}</span></div>
                    )}
                  </div>
                </div>
              )}

              <div className="confirmation-card">
                <div className="card-header"><IoMedicalOutline size={22} color="#3d67ee" /><h3>Medical Information</h3></div>
                <div className="card-details">
                  <div className="detail-row"><span className="detail-label">Medications (72h)</span><span className="detail-value">{medicalAnswers.medications72h ? `Yes — ${medicationDetails}` : 'No'}</span></div>
                  <div className="detail-row"><span className="detail-label">Flea/Tick Prev.</span><span className="detail-value">{medicalAnswers.fleaPrevention ? 'Yes' : 'No'}</span></div>
                  <div className="detail-row"><span className="detail-label">Vaccinations</span><span className="detail-value">{medicalAnswers.catVaccinations ? 'Yes' : 'No'}</span></div>
                  <div className="detail-row"><span className="detail-label">Not Pregnant</span><span className="detail-value">{medicalAnswers.notPregnant ? 'Yes' : 'No'}</span></div>
                  {additionalNotes && <div className="detail-row"><span className="detail-label">Notes</span><span className="detail-value">{additionalNotes}</span></div>}
                </div>
              </div>

              {selectedDate && selectedTime && selectedBranch && (
                <div className="confirmation-card">
                  <div className="card-header"><IoCalendarOutline size={22} color="#3d67ee" /><h3>Appointment Details</h3></div>
                  <div className="card-details">
                    <div className="detail-row">
                      <span className="detail-label">Service</span>
                      <div className="service-list">
                        <div className="service-main-item">{selectedService?.name}</div>
                        {selectedGroomingOptions.map(o => <div key={o.id} className="service-subitem">• {o.name}</div>)}
                        {selectedLabOptions.map(o => <div key={o.id} className="service-subitem">• {o.name}</div>)}
                      </div>
                    </div>
                    <div className="detail-row"><span className="detail-label">Date</span><span className="detail-value">{formatDate(selectedDate)}</span></div>
                    <div className="detail-row"><span className="detail-label">Time</span><span className="detail-value">{selectedTime}</span></div>
                    <div className="detail-divider" />
                    <div className="detail-row"><span className="detail-label">Branch</span><span className="detail-value">{selectedBranch.branch_name}</span></div>
                    <div className="detail-row"><span className="detail-label">Address</span><span className="detail-value">{selectedBranch.address}</span></div>
                    <div className="detail-divider" />
                    <div className="total-row">
                      <span className="total-label">Total</span>
                      <span className="total-value">₱{getTotalPrice().toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="action-buttons-row">
              <button className="btn-secondary" onClick={handleBack}>Back</button>
              <button className="btn-primary"   onClick={handleContinue}>Confirm Booking</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default UserAppointmentBook;