import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './UserStyles.css';
import API_URL from '../API';
import { formatPetAge } from '../utils/formatPetAge';

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
  birthday?: string | null;
  pet_photo_url: string | null;
}

interface Branch {
  branch_id: number;
  branch_name: string;
  address: string;
}

interface DayAvailabilityMap {
  [key: string]: boolean;
}

interface TimeSlotRecord {
  id: number | string;
  start_time: string;
  end_time: string;
  is_available?: boolean;
}

interface SpecialDateRecord {
  event_date?: string;
}

const normalizeBranches = (payload: any): Branch[] => {
  const rawBranches = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.branches)
      ? payload.branches
      : [];

  return rawBranches
    .map((branch: any) => ({
      branch_id: Number(branch?.branch_id ?? branch?.id ?? 0),
      branch_name: String(branch?.branch_name ?? branch?.name ?? '').trim(),
      address: String(branch?.address ?? '').trim(),
    }))
    .filter((branch: Branch) => branch.branch_id > 0 && branch.branch_name !== '');
};

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
  message: string | React.ReactNode;
  onConfirm?: () => void;
  showCancel: boolean;
  confirmText: string;
}

type BookingConfirmStage = 'terms' | 'submitting' | 'submitted';

interface BookingDraft {
  step: number;
  selectedServiceId: number | null;
  selectedGroomingOptionIds: string[];
  selectedLabOptionIds: string[];
  currentCardIndex: number;
  expandedService: number | null;
}

interface BookingReturnState {
  newPetId?: number;
  returnFromPetCreate?: boolean;
}

// ─── Static data ──────────────────────────────────────────────────────────────

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
const isMobileViewport = () =>
  typeof window !== 'undefined' && window.innerWidth <= 768;
const BOOKING_DRAFT_KEY = 'userAppointmentBookingDraft';
const DEFAULT_SUBMITTED_BOOKING_MESSAGE =
  'Your appointment is under review. You will receive an email once it is confirmed.';

// ─── Component ────────────────────────────────────────────────────────────────

const UserAppointmentBook: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileCarousel, setIsMobileCarousel] = useState(isMobileViewport);
  const pageContainerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const progressStepRefs = useRef<Record<number, HTMLDivElement | null>>({});

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
  const [dayAvailability,         setDayAvailability]         = useState<DayAvailabilityMap>({});
  const [specialDates,            setSpecialDates]            = useState<string[]>([]);
  const [dayTimeSlots,            setDayTimeSlots]            = useState<string[]>([]);
  const [loadingAvailability,     setLoadingAvailability]     = useState(false);
  const [loadingTimeSlots,        setLoadingTimeSlots]        = useState(false);

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
  const touchStartX = useRef<number | null>(null);
  const touchCurrentX = useRef<number | null>(null);

  // ── Modals ────────────────────────────────────────────────────────────────
  const [alertVisible,        setAlertVisible]        = useState(false);
  const [alertConfig,         setAlertConfig]         = useState<AlertConfig>({ type:'info', title:'', message:'', showCancel:false, confirmText:'OK' });
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmModalStage,   setConfirmModalStage]   = useState<BookingConfirmStage>('terms');
  const [submittedBookingMessage, setSubmittedBookingMessage] = useState(DEFAULT_SUBMITTED_BOOKING_MESSAGE);
  const [isChecked,           setIsChecked]           = useState(false);
  const restoredDraftRef = useRef(false);
  const handledReturnedPetRef = useRef<number | null>(null);

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

  useEffect(() => {
    if (restoredDraftRef.current) return;

    const rawDraft = sessionStorage.getItem(BOOKING_DRAFT_KEY);
    if (!rawDraft) {
      restoredDraftRef.current = true;
      return;
    }

    try {
      const draft = JSON.parse(rawDraft) as BookingDraft;
      const restoredService = services.find(service => service.id === draft.selectedServiceId) ?? null;
      const restoredGroomingOptions = groomingOptions.filter(option =>
        draft.selectedGroomingOptionIds.includes(option.id),
      );
      const restoredLabOptions = laboratoryOptions.filter(option =>
        draft.selectedLabOptionIds.includes(option.id),
      );

      setSelectedService(restoredService);
      setSelectedGroomingOptions(restoredGroomingOptions);
      setSelectedLabOptions(restoredLabOptions);
      setCurrentCardIndex(draft.currentCardIndex ?? 0);
      setExpandedService(draft.expandedService ?? null);
      setStep(draft.step ?? 2);
    } catch (err) {
      console.error('Failed to restore booking draft:', err);
    } finally {
      sessionStorage.removeItem(BOOKING_DRAFT_KEY);
      restoredDraftRef.current = true;
    }
  }, []);

  // ── Fetch branches ────────────────────────────────────────────────────────
  useEffect(() => {
    setLoadingBranches(true);
    axios
      .get(`${API_URL}/branches`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(res => setBranches(normalizeBranches(res.data)))
      .catch(err => console.error('Failed to fetch branches:', err))
      .finally(() => setLoadingBranches(false));
  }, []);

  useEffect(() => {
    setLoadingAvailability(true);
    Promise.all([
      axios.get(`${API_URL}/api/day-availability`),
      axios.get(`${API_URL}/api/special-dates`),
    ])
      .then(([availabilityRes, specialDatesRes]) => {
        const rawAvailability = Array.isArray(availabilityRes.data) ? availabilityRes.data : [];
        const nextAvailability: DayAvailabilityMap = {};

        rawAvailability.forEach((day: any) => {
          const key = String(day?.day_of_week ?? '').trim().toLowerCase();
          if (key) nextAvailability[key] = Boolean(day?.is_available);
        });

        const nextSpecialDates = Array.isArray(specialDatesRes.data?.specialDates)
          ? specialDatesRes.data.specialDates
              .map((event: SpecialDateRecord) => String(event?.event_date ?? '').trim())
              .filter(Boolean)
          : [];

        setDayAvailability(nextAvailability);
        setSpecialDates(nextSpecialDates);
      })
      .catch(err => console.error('Failed to fetch clinic availability:', err))
      .finally(() => setLoadingAvailability(false));
  }, []);

  useEffect(() => {
    if (!selectedDate) {
      setDayTimeSlots([]);
      return;
    }

    const dayName = getDayName(selectedDate);
    if (!dayName || !dayAvailability[dayName.toLowerCase()]) {
      setDayTimeSlots([]);
      return;
    }

    setLoadingTimeSlots(true);
    axios
      .get(`${API_URL}/api/time-slots/${dayName.toLowerCase()}`)
      .then(res => {
        const rawSlots = Array.isArray(res.data?.timeSlots) ? res.data.timeSlots : [];
        const formattedSlots = rawSlots
          .filter((slot: TimeSlotRecord) => slot?.start_time && slot?.end_time && slot?.is_available !== false)
          .map((slot: TimeSlotRecord) => `${formatSlotTime(slot.start_time)} - ${formatSlotTime(slot.end_time)}`);

        setDayTimeSlots(formattedSlots);
        setSelectedTime(prev => (prev && formattedSlots.includes(prev) ? prev : null));
      })
      .catch(err => {
        console.error('Failed to fetch time slots:', err);
        setDayTimeSlots([]);
        setSelectedTime(null);
      })
      .finally(() => setLoadingTimeSlots(false));
  }, [selectedDate, dayAvailability]);

  useEffect(() => {
    const handleResize = () => setIsMobileCarousel(isMobileViewport());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    pageContainerRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    contentRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    window.scrollTo({ top: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [step]);

  useEffect(() => {
    const returnState = location.state as BookingReturnState | null;
    const newPetId = returnState?.newPetId;

    if (!returnState?.returnFromPetCreate || !newPetId || loadingPets || pets.length === 0) return;
    if (handledReturnedPetRef.current === newPetId) return;

    const createdPet = pets.find(pet => pet.pet_id === newPetId);
    if (!createdPet) return;

    handledReturnedPetRef.current = newPetId;
    setSelectedPet(createdPet);
    setStep(3);
    navigate(location.pathname, { replace: true, state: null });
  }, [loadingPets, location.pathname, location.state, navigate, pets]);

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
    type: AlertConfig['type'], title: string, message: string | React.ReactNode,
    onConfirm?: () => void, showCancel = false, confirmText = 'OK',
  ) => {
    setAlertConfig({ type, title, message, onConfirm, showCancel, confirmText });
    setAlertVisible(true);
  };

  const openConfirmModal = () => {
    setIsChecked(false);
    setConfirmModalStage('terms');
    setSubmittedBookingMessage(DEFAULT_SUBMITTED_BOOKING_MESSAGE);
    setConfirmModalVisible(true);
  };

  const closeConfirmModal = () => {
    if (confirmModalStage === 'submitting') return;
    setConfirmModalVisible(false);
    setConfirmModalStage('terms');
    setSubmittedBookingMessage(DEFAULT_SUBMITTED_BOOKING_MESSAGE);
    setIsChecked(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('userSession');
    localStorage.removeItem('access_token');
    navigate('/login');
  };

  const persistBookingDraft = () => {
    const draft: BookingDraft = {
      step,
      selectedServiceId: selectedService?.id ?? null,
      selectedGroomingOptionIds: selectedGroomingOptions.map(option => option.id),
      selectedLabOptionIds: selectedLabOptions.map(option => option.id),
      currentCardIndex,
      expandedService,
    };

    sessionStorage.setItem(BOOKING_DRAFT_KEY, JSON.stringify(draft));
  };

  const handleAddPetFromBooking = () => {
    persistBookingDraft();
    navigate('/user/pet-profile', {
      state: { returnToBooking: true },
    });
  };

  const getDayName = (date: Date | null) => {
    if (!date) return null;
    return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][date.getDay()];
  };

  const toDateKey = (date: Date | null) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatSlotTime = (timeStr: string) => {
    const [rawHours, rawMinutes] = String(timeStr ?? '').split(':');
    const hours = Number(rawHours);
    const minutes = rawMinutes ?? '00';

    if (Number.isNaN(hours)) return timeStr;

    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 || 12;
    return `${displayHour}:${minutes} ${period}`;
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

  const goToPreviousService = () => {
    if (currentCardIndex === 0) return;
    setCurrentCardIndex(prev => prev - 1);
    setExpandedService(null);
  };

  const goToNextService = () => {
    if (currentCardIndex === services.length - 1) return;
    setCurrentCardIndex(prev => prev + 1);
    setExpandedService(null);
  };

  const handleCarouselTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.touches[0].clientX;
    touchCurrentX.current = event.touches[0].clientX;
  };

  const handleCarouselTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    touchCurrentX.current = event.touches[0].clientX;
  };

  const handleCarouselTouchEnd = () => {
    if (touchStartX.current === null || touchCurrentX.current === null) return;

    const deltaX = touchStartX.current - touchCurrentX.current;
    const swipeThreshold = 45;

    if (deltaX > swipeThreshold) goToNextService();
    if (deltaX < -swipeThreshold) goToPreviousService();

    touchStartX.current = null;
    touchCurrentX.current = null;
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
        openConfirmModal();
      }
    } else if (step === 7) {
      openConfirmModal();
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Submit booking
  // ─────────────────────────────────────────────────────────────────────────

  const handleConfirmBooking = async () => {
    if (!currentUser || !selectedPet || !selectedDate || !selectedTime || !selectedBranch || !selectedService) return;
    setConfirmModalStage('submitting');

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
      const appointmentId: number = apptRes.data.appointment_id;
      const bookingEmailSent = apptRes.data?.emailSent !== false;

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

      setSubmittedBookingMessage(
        bookingEmailSent
          ? 'Your appointment is under review. A booking confirmation email has been sent, and we will email you again once it is confirmed.'
          : 'Your appointment is under review. The request was submitted successfully, but the booking confirmation email could not be sent right now.',
      );
      setConfirmModalStage('submitted');
      setIsChecked(false);
    } catch (err: any) {
      setConfirmModalVisible(false);
      setConfirmModalStage('terms');
      setSubmittedBookingMessage(DEFAULT_SUBMITTED_BOOKING_MESSAGE);
      showAlert('error','Booking Failed', err.response?.data?.error ?? 'Something went wrong. Please try again.');
      console.log(err);
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

  const timeSlots = dayTimeSlots;
  const progressSteps = getProgressSteps();

  useEffect(() => {
    const activeNode = progressStepRefs.current[step];
    if (!activeNode) return;

    activeNode.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, [step]);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="user-appointment-container" ref={pageContainerRef}>

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
            <div className="modal-message">
              {typeof alertConfig.message === 'string'
                ? <p>{alertConfig.message}</p>
                : alertConfig.message}
            </div>
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

      {/* ── Confirmation Modal ── */}
      {confirmModalVisible && (
        <div className="modal-overlay" onClick={closeConfirmModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            {confirmModalStage !== 'submitting' && (
              <button className="modal-close-btn" onClick={closeConfirmModal}>
                <IoClose size={24} color="#999" />
              </button>
            )}

            {confirmModalStage === 'terms' && (
              <>
                <div className="confirmation-icon"><IoHourglassOutline size={70} color="#3d67ee" /></div>
                <h2 className="confirmation-title">Appointment Under Review</h2>
                <p className="confirmation-text">
                  Your appointment will be reviewed by our team. We will send a booking confirmation email after submission, and another update once it is confirmed.
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
                  disabled={!isChecked}
                >
                  Confirm Booking
                </button>
              </>
            )}

            {confirmModalStage === 'submitting' && (
              <>
                <div className="confirmation-icon"><IoHourglassOutline size={70} color="#3d67ee" /></div>
                <h2 className="confirmation-title">Submitting Appointment</h2>
                <p className="confirmation-text">
                  Please wait while we finalize your booking.
                </p>
                <button className="confirmation-btn disabled" disabled>
                  Processing...
                </button>
              </>
            )}

            {confirmModalStage === 'submitted' && (
              <>
                <div className="confirmation-icon"><IoCheckmark size={70} color="#2e9e0c" /></div>
                <h2 className="confirmation-title">Appointment Submitted!</h2>
                <p className="confirmation-text">
                  {submittedBookingMessage}
                </p>
                <button
                  className="confirmation-btn"
                  onClick={() => {
                    closeConfirmModal();
                    navigate('/user/home');
                  }}
                >
                  Go to Home
                </button>
              </>
            )}
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

      <div className="appointment-content" ref={contentRef}>

        {/* Progress bar */}
        <div className="progress-container">
          <div className="progress-steps">
            {progressSteps.map((s, i, arr) => (
              <React.Fragment key={s.n}>
                <div
                  className={`progress-step-segment ${
                    step === s.n ? 'current' : step > s.n ? 'completed' : 'upcoming'
                  }`}
                  ref={node => {
                    progressStepRefs.current[s.n] = node;
                  }}
                >
                  <div className={`step-item ${step === s.n ? 'current' : ''}`}>
                    <div className="step-circle-shell">
                      <div className={`step-circle ${step >= s.n ? 'active' : ''}`}><span>{s.n}</span></div>
                    </div>
                    <span className={`step-label ${step === s.n ? 'active' : ''}`}>{s.l}</span>
                  </div>
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
            <p className="service-instruction">Click to select an appointment.</p>

            <div className="service-carousel-shell">
              <div
                className="service-carousel"
                onTouchStart={handleCarouselTouchStart}
                onTouchMove={handleCarouselTouchMove}
                onTouchEnd={handleCarouselTouchEnd}
              >
                <div className="carousel-viewport">
                  <div
                    className="carousel-track"
                    style={{
                      transform: `translateX(calc(50% - ${isMobileCarousel ? 143 : 130}px - ${currentCardIndex * (isMobileCarousel ? 304 : 288)}px))`,
                    }}
                  >
                    {services.map((service, index) => {
                      const isSelected = selectedService?.id === service.id;
                      const isActive = currentCardIndex === index;

                      return (
                        <div
                          key={service.id}
                          className={`service-card-wrapper ${isActive ? 'center-card' : ''}`}
                          aria-hidden={!isActive}
                        >
                          <button
                            className={`service-card ${isSelected ? 'selected' : ''} ${isActive ? 'active' : 'inactive'}`}
                            onClick={() => handleServiceSelect(service)}
                            disabled={!isActive}
                          >
                            <div className="service-icon">{getIconComponent(service.icon)}</div>
                            <h3 className="service-name">{service.name}</h3>
                            <div className="service-description">{service.description.map((l,i) => <p key={i}>{l}</p>)}</div>
                            {service.basePrice && <p className="service-price">{service.basePrice}</p>}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="service-carousel-nav">
                <button className="carousel-arrow" onClick={goToPreviousService} disabled={currentCardIndex === 0} aria-label="Previous service">
                  <IoChevronBackCircle size={50} color={currentCardIndex === 0 ? '#ccc' : '#3d67ee'} />
                </button>
                <button className="carousel-arrow" onClick={goToNextService} disabled={currentCardIndex === services.length-1} aria-label="Next service">
                  <IoChevronForwardCircle size={50} color={currentCardIndex === services.length-1 ? '#ccc' : '#3d67ee'} />
                </button>
              </div>
            </div>

            {selectedService?.hasOptions && expandedService === selectedService.id && (
              <div className="options-panel service-options-panel">
                <h3 className="options-title">{selectedService.id === 1 ? 'Grooming Options' : 'Lab Options'}</h3>
                <div className="options-list">
                  {(selectedService.id === 1 ? groomingOptions : laboratoryOptions).map(opt => {
                    const isSel = selectedService.id === 1
                      ? selectedGroomingOptions.some(o => o.id === opt.id)
                      : selectedLabOptions.some(o => o.id === opt.id);
                    return (
                      <button
                        key={opt.id}
                        className={`option-item ${isSel ? 'selected' : ''}`}
                        onClick={() => {
                          if (selectedService.id === 1) {
                            setSelectedGroomingOptions(prev =>
                              prev.some(o => o.id === opt.id) ? [] : [opt],
                            );
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
                {selectedService.id === 8 && <p className="lab-limit-note">Select up to 3 tests</p>}
              </div>
            )}

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
                    <p className="pet-details">{pet.pet_gender} • {formatPetAge(pet.age, pet.birthday)}</p>
                  </button>
                ))}
                <button className="add-pet-card" onClick={handleAddPetFromBooking}>
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
              : branches.length > 0 ? (
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
              ) : (
                <p style={{ textAlign:'center', color:'#999', padding:40 }}>No branches available right now.</p>
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
              : branches.length > 0 ? (
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
              ) : (
                <p style={{ textAlign:'center', color:'#999', padding:40 }}>No branches available right now.</p>
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
                      if (view !== 'month') return false;

                      const dayName = getDayName(date);
                      const dateKey = toDateKey(date);
                      const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
                      const isEnabledDay = dayName ? Boolean(dayAvailability[dayName.toLowerCase()]) : false;
                      const isSpecialDate = specialDates.includes(dateKey);

                      return loadingAvailability || isPast || !isEnabledDay || isSpecialDate;
                    }}
                  />
                </div>
              </div>
              <div className="time-slots-wrapper">
                <h3 className="time-slots-title">Clinic Time Slots</h3>
                {!selectedDate
                  ? <div className="time-slots-empty"><p>Select a date first</p></div>
                  : loadingTimeSlots
                    ? <div className="time-slots-empty"><p>Loading time slots…</p></div>
                  : timeSlots.length > 0
                    ? <div className="time-slots-grid">
                        {timeSlots.map((t,i) => (
                          <button key={i} className={`time-slot-btn ${selectedTime===t?'selected':''}`} onClick={() => setSelectedTime(t)}>{t}</button>
                        ))}
                      </div>
                    : <div className="time-slots-empty"><p>No configured time slots for this date</p></div>
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
