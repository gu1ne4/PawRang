import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './UserStyles.css';
import './UserSharedFooterStyles.css';
import API_URL from '../API';
import { formatPetAge } from '../utils/formatPetAge';
import branchLP from '../assets/branchLP.jpg';
import branchTaguig from '../assets/branchTaguig.jpg';
import petshieldLogo from '../assets/PetshieldLogo.png';
import pawRangLogo from '../assets/PawRang Logomark White.png';
import consultationImage from '../assets/ConsultationImage.jpg';
import groomingImage from '../assets/GroomingImage.jpg';
import diagnosticsImage from '../assets/DiagnosticsImage.jpg';
import confinementImage from '../assets/ConfinementImage.jpg';
import sampleDoc from '../assets/sampleDoc.jpg';

import {
  IoPawOutline, IoCalendarOutline, IoChevronBackCircle, IoChevronForwardCircle,
  IoClose, IoHourglassOutline, IoCheckmark, IoInformationCircleOutline,
  IoCloudUploadOutline, IoCutOutline, IoMedicalOutline, IoHomeOutline,
  IoScanOutline, IoRadioOutline, IoFlaskOutline, IoAdd,
  IoCloseCircle, IoPersonCircleOutline, IoLocationOutline, IoReceiptOutline,
  IoShieldCheckmarkOutline, IoMailOutline, IoCallOutline,
} from 'react-icons/io5';
import ClientNavBar from '../reusable_components/ClientNavBar';
import PayrexMockPayment from '../reusable_components/PayrexMockPayment';
import {
  formatCurrency,
  generatePayrexMockReference,
  parsePriceLabel,
  PAYREX_MOCK_PAYMENT_METHOD,
} from '../utils/payrexMockUtils';

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
  capacity?: number;
  bookedCount?: number;
  booked_count?: number;
  availableSlots?: number;
  available_slots?: number;
  displayText?: string;
}

interface TimeSlotView {
  value: string;
  label: string;
  disabled: boolean;
}

interface SpecialDateRecord {
  event_date?: string;
  event_recurrence?: string;
  event_month?: number | string;
  event_day?: number | string;
}

const getSpecialDateAnnualKey = (event: SpecialDateRecord) => {
  const recurrence = String(event?.event_recurrence || 'once').toLowerCase();
  if (recurrence !== 'annual') return '';
  const month = Number(event?.event_month) || Number(String(event?.event_date || '').split('-')[1]);
  const day = Number(event?.event_day) || Number(String(event?.event_date || '').split('-')[2]);
  return month && day ? `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
};

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
    .filter((branch: Branch) => (
      branch.branch_id > 0 &&
      branch.branch_name !== '' &&
      branch.branch_name.toLowerCase() !== 'both branches'
    ));
};

interface Service {
  id: number;
  name: string;
  icon: string;
  image: string;
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
  onConfirm?: (() => void) | null;
  showCancel: boolean;
  confirmText: string;
}

type BookingConfirmStage = 'terms' | 'payment' | 'submitting' | 'submitted';

interface BookingDraft {
  step: number;
  selectedServiceId: number | null;
  selectedGroomingOptionIds: string[];
  selectedLabOptionIds: string[];
  boardingDays: string;
  currentCardIndex: number;
  expandedService: number | null;
}

interface BookingReturnState {
  newPetId?: number;
  returnFromPetCreate?: boolean;
}

interface SymptomGroup {
  title: string;
  items: string[];
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
];

const imagingOptions: ServiceOption[] = [
  { id:'i1', name:'X-Ray',      price:'₱1500', description:'Single view radiograph' },
  { id:'i2', name:'Ultrasound', price:'₱2000', description:'Abdominal ultrasound' },
];

const surgeryOptions: ServiceOption[] = [
  { id:'s1', name:'Child Delivery', price:'₱3500', description:'Assisted delivery support and monitoring' },
  { id:'s2', name:'Neuter / Spay',  price:'₱2500', description:'Sterilization procedure consultation and surgery' },
];

const vaccinationOptions: ServiceOption[] = [
  { id:'v1', name:'Anti-Rabies Vaccine', price:'₱650',  description:'Rabies protection and vaccine record update' },
  { id:'v2', name:'5-in-1 Vaccine',      price:'₱900',  description:'Core canine vaccine protection' },
  { id:'v3', name:'8-in-1 Vaccine',      price:'₱1200', description:'Expanded canine vaccine protection' },
  { id:'v4', name:'4-in-1 Cat Vaccine',  price:'₱1000', description:'Core feline vaccine protection' },
];

const nonGroomingOptionServices = [
  ...laboratoryOptions,
  ...imagingOptions,
  ...surgeryOptions,
  ...vaccinationOptions,
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
  { id:'q3', question:'MY PET HAS AN UP-TO-DATE ANTI-RABIES VACCINATION',                    key:'catVaccinations', hasDetails:false },
  { id:'q4', question:'MY PET IS NOT PREGNANT',                                              key:'notPregnant',    hasDetails:false },
];

const symptomGroups: SymptomGroup[] = [
  { title: 'General', items: ['Lethargy', 'Weakness', 'Loss of appetite', 'Not eating', 'Fever', 'Weight loss', 'Shivering'] },
  { title: 'Digestive', items: ['Vomiting', 'Diarrhea', 'Bloody stool', 'Constipation', 'Retching', 'Stomach pain / bloating'] },
  { title: 'Respiratory', items: ['Coughing', 'Sneezing', 'Runny nose', 'Wheezing', 'Difficulty breathing', 'Rapid breathing'] },
  { title: 'Urinary', items: ['Straining to urinate', 'Frequent urination', 'Blood in urine', 'Crying while urinating'] },
  { title: 'Skin / Coat', items: ['Itching', 'Scratching', 'Hair loss', 'Skin redness', 'Swelling', 'Rash'] },
  { title: 'Eyes / Nose / Mouth', items: ['Watery eyes', 'Eye discharge', 'Drooling', 'Bad smell from mouth'] },
  { title: 'Behavior / Movement', items: ['Limping', 'Hiding', 'Restlessness', 'Collapse', 'Confusion'] },
];

const commonSymptoms = ['Vomiting', 'Diarrhea', 'Not eating', 'Weakness', 'Coughing', 'Itching', 'Limping', 'Other'];
const symptomDurationOptions = ['Today', '1-2 days', '3-7 days', 'More than a week'];
const intakeStatusOptions = ['Normal', 'Less than usual', 'Not at all', 'Not sure'];
const worseningOptions = ['Yes', 'No', 'Not sure'];

const services: Service[] = [
  { id:1,  name:'Pet Grooming',            icon:'cut',     image:groomingImage,     description:['Brushing, nail trimming, haircut, bathing, and coat care.'],       hasOptions:true,  options:groomingOptions },
  { id:2,  name:'Consultation & Check-Up', icon:'medical', image:consultationImage, description:['Preventive care and assessment for your pet’s overall health.'], basePrice:'₱500',         hasOptions:false },
  { id:3,  name:'Dental Prophylaxis',      icon:'shield',  image:sampleDoc,         description:['Teeth cleaning, plaque removal, and oral health check.'],       basePrice:'₱800',         hasOptions:false },
  { id:4,  name:'Pet Boarding',            icon:'home',    image:confinementImage,  description:['Overnight stay, feeding, care supervision, and monitoring.'],    basePrice:'₱1,200/night', hasOptions:false },
  { id:6,  name:'Imaging',                 icon:'scan',    image:diagnosticsImage,  description:['X-ray and ultrasound services for diagnostic support.'],         hasOptions:true,  options:imagingOptions },
  { id:8,  name:'Laboratory Tests',        icon:'flask',   image:diagnosticsImage,  description:['Blood work, urinalysis, fecal exam, and chemistry panel.'],       hasOptions:true,  options:laboratoryOptions },
  { id:9,  name:'Vaccinations',            icon:'shield',  image:consultationImage, description:['Core vaccines, boosters, and rabies protection.'],               hasOptions:true,  options:vaccinationOptions },
  { id:10, name:'Surgery',                 icon:'medical', image:sampleDoc,         description:['Surgical care options available by clinic assessment.'],         hasOptions:true,  options:surgeryOptions },
];
const DEFAULT_SERVICE_CARD_INDEX = Math.max(0, services.findIndex(service => service.id === 2));

const DEFAULT_PET_IMG = 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400';
const getToken = () => localStorage.getItem('access_token') ?? '';
const isMobileViewport = () =>
  typeof window !== 'undefined' && window.innerWidth <= 768;
const BOOKING_DRAFT_KEY = 'userAppointmentBookingDraft';
const DEFAULT_SUBMITTED_BOOKING_MESSAGE =
  'Your appointment is confirmed. A confirmation email has been sent with your visit details.';

const addDays = (date: Date, days: number) => {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};

const getBranchImage = (branch: Branch) => {
  const label = `${branch.branch_name} ${branch.address}`.toLowerCase();
  if (label.includes('taguig')) return branchTaguig;
  return branchLP;
};

const parseResponseBody = async (response: Response): Promise<any> => {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const getErrorMessage = (payload: any, fallback: string): string => {
  if (typeof payload === 'string' && payload.trim()) return payload;
  if (payload && typeof payload === 'object') {
    if (typeof payload.error === 'string' && payload.error.trim()) return payload.error;
    if (typeof payload.message === 'string' && payload.message.trim()) return payload.message;
  }
  return fallback;
};

const requestJson = async <T,>(url: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(url, options);
  const payload = await parseResponseBody(response);

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, `Request failed with status ${response.status}`));
  }

  return (payload ?? {}) as T;
};

const apiClient = {
  async get<T>(url: string, options?: RequestInit): Promise<{ data: T }> {
    const data = await requestJson<T>(url, { ...(options ?? {}), method: 'GET' });
    return { data };
  },
  async post<T>(url: string, body?: unknown, options?: RequestInit): Promise<{ data: T }> {
    const headers = new Headers(options?.headers);
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

    const response = await fetch(url, {
      ...(options ?? {}),
      method: 'POST',
      headers,
      body: JSON.stringify(body ?? {}),
    });
    const payload = await parseResponseBody(response);

    if (!response.ok) {
      const error: any = new Error(getErrorMessage(payload, `Request failed with status ${response.status}`));
      error.response = { data: payload, status: response.status };
      throw error;
    }

    return { data: (payload ?? {}) as T };
  },
};

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
  const [annualSpecialDates,      setAnnualSpecialDates]      = useState<string[]>([]);
  const [dayTimeSlots,            setDayTimeSlots]            = useState<TimeSlotView[]>([]);
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
  const [boardingDays,      setBoardingDays]      = useState('');
  const [selectedSymptoms,  setSelectedSymptoms]  = useState<string[]>([]);
  const [ownerSymptomNotes, setOwnerSymptomNotes] = useState('');
  const [symptomDuration,   setSymptomDuration]   = useState('');
  const [eatingStatus,      setEatingStatus]      = useState('');
  const [drinkingStatus,    setDrinkingStatus]    = useState('');
  const [worseningStatus,   setWorseningStatus]   = useState('');
  const [showMoreSymptomDetails, setShowMoreSymptomDetails] = useState(false);

  // ── Carousel ──────────────────────────────────────────────────────────────
  const [currentCardIndex, setCurrentCardIndex] = useState(DEFAULT_SERVICE_CARD_INDEX);
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
  const [bookingPaymentReference, setBookingPaymentReference] = useState(generatePayrexMockReference);
  const restoredDraftRef = useRef(false);
  const handledReturnedPetRef = useRef<number | null>(null);

  const buildHeaders = (includeJson = false): HeadersInit => {
    const headers: Record<string, string> = {};
    const token = getToken();

    if (includeJson) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;

    return headers;
  };

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms(prev =>
      prev.includes(symptom)
        ? prev.filter(item => item !== symptom)
        : [...prev, symptom],
    );
  };

  // ── Fetch pets ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser?.id) return;
    let isCancelled = false;

    setLoadingPets(true);
    requestJson<{ pets?: Pet[] }>(`${API_URL}/pets/user/${currentUser.id}`, {
      headers: buildHeaders(),
    })
      .then(data => {
        if (!isCancelled) setPets(data.pets ?? []);
      })
      .catch(() => {
        if (!isCancelled) setPets([]);
      })
      .finally(() => {
        if (!isCancelled) setLoadingPets(false);
      });

    return () => {
      isCancelled = true;
    };
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
      const restoredLabOptions = nonGroomingOptionServices.filter(option =>
        draft.selectedLabOptionIds.includes(option.id),
      );

      setSelectedService(restoredService);
      setSelectedGroomingOptions(restoredGroomingOptions);
      setSelectedLabOptions(restoredLabOptions);
      setBoardingDays(draft.boardingDays ?? '');
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
    let isCancelled = false;

    setLoadingBranches(true);
    requestJson<any>(`${API_URL}/branches`, {
      headers: buildHeaders(),
    })
      .then(data => {
        if (!isCancelled) setBranches(normalizeBranches(data));
      })
      .catch(() => {
        if (!isCancelled) setBranches([]);
      })
      .finally(() => {
        if (!isCancelled) setLoadingBranches(false);
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    setLoadingAvailability(true);
    Promise.allSettled([
      requestJson<any[]>(`${API_URL}/api/day-availability`),
      requestJson<{ specialDates?: SpecialDateRecord[] }>(`${API_URL}/api/special-dates`),
    ])
      .then(([availabilityResult, specialDatesResult]) => {
        if (isCancelled) return;

        const rawAvailability = availabilityResult.status === 'fulfilled' && Array.isArray(availabilityResult.value)
          ? availabilityResult.value
          : [];
        const nextAvailability: DayAvailabilityMap = {};

        rawAvailability.forEach((day: any) => {
          const key = String(day?.day_of_week ?? '').trim().toLowerCase();
          if (key) nextAvailability[key] = Boolean(day?.is_available);
        });

        const loadedSpecialDates = specialDatesResult.status === 'fulfilled' && Array.isArray(specialDatesResult.value?.specialDates)
          ? specialDatesResult.value.specialDates
          : [];
        const nextSpecialDates = loadedSpecialDates
          .filter((event: SpecialDateRecord) => String(event?.event_recurrence || 'once').toLowerCase() !== 'annual')
          .map((event: SpecialDateRecord) => String(event?.event_date ?? '').trim())
          .filter(Boolean);
        const nextAnnualSpecialDates = loadedSpecialDates
          .map(getSpecialDateAnnualKey)
          .filter(Boolean);

        setDayAvailability(nextAvailability);
        setSpecialDates(nextSpecialDates);
        setAnnualSpecialDates(nextAnnualSpecialDates);
      })
      .finally(() => {
        if (!isCancelled) setLoadingAvailability(false);
      });

    return () => {
      isCancelled = true;
    };
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

    if (isSpecialBookingDate(selectedDate)) {
      setDayTimeSlots([]);
      setSelectedTime(null);
      return;
    }

    let isCancelled = false;
    const capacityManagedServiceIds = new Set([2, 3, 6, 7, 8, 9, 10]);
    const shouldUseCapacity =
      Boolean(selectedBranch && selectedService && capacityManagedServiceIds.has(selectedService.id));
    const capacityServiceName =
      selectedService?.hasOptions && selectedService.id !== 1 && selectedLabOptions.length === 1
        ? selectedLabOptions[0].name
        : selectedService?.name;
    const slotParams = new URLSearchParams({
      date: toDateKey(selectedDate),
    });

    if (shouldUseCapacity && selectedBranch && capacityServiceName) {
      slotParams.set('branch_id', String(selectedBranch.branch_id));
      slotParams.set('service', capacityServiceName);
    }

    setLoadingTimeSlots(true);
    requestJson<{ timeSlots?: TimeSlotRecord[] }>(`${API_URL}/api/available-time-slots?${slotParams.toString()}`)
      .then(data => {
        if (isCancelled) return;

        const rawSlots = Array.isArray(data?.timeSlots) ? data.timeSlots : [];
        const formattedSlots = rawSlots
          .filter((slot: TimeSlotRecord) => slot?.start_time && slot?.end_time)
          .filter((slot: TimeSlotRecord) => shouldUseCapacity || slot?.is_available !== false)
          .map((slot: TimeSlotRecord) => {
            const displayText = slot.displayText || `${formatSlotTime(slot.start_time)} - ${formatSlotTime(slot.end_time)}`;
            if (!shouldUseCapacity) {
              return {
                value: displayText,
                label: displayText,
                disabled: false,
              };
            }

            const availableSlots = Number(slot.availableSlots ?? slot.available_slots ?? 0);
            const capacity = Number(slot.capacity ?? 0);
            const isFull = slot.is_available === false || availableSlots <= 0;
            return {
              value: displayText,
              label: capacity > 0 ? `${displayText} (${Math.max(availableSlots, 0)}/${capacity} slots)` : displayText,
              disabled: isFull,
            };
          });

        setDayTimeSlots(formattedSlots);
        setSelectedTime(prev => {
          const selectedSlot = formattedSlots.find(slot => slot.value === prev);
          return selectedSlot && !selectedSlot.disabled ? prev : null;
        });
      })
      .catch(() => {
        if (!isCancelled) {
          setDayTimeSlots([]);
          setSelectedTime(null);
        }
      })
      .finally(() => {
        if (!isCancelled) setLoadingTimeSlots(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedDate, selectedBranch, selectedService, selectedLabOptions, dayAvailability, specialDates, annualSpecialDates]);

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
    const start = slot.split(' - ')[0].replace(/\s*\(.+\)$/, '').trim();           // "1:00PM"
    const [time, meridiem] = start.split(/(AM|PM)/i);   // ["1:00", "PM"]
    let [hours, minutes]   = time.split(':').map(Number);
    if (meridiem.toUpperCase() === 'PM' && hours !== 12) hours += 12;
    if (meridiem.toUpperCase() === 'AM' && hours === 12) hours  = 0;
    return `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:00`;
  };

  const showAlert = (
    type: AlertConfig['type'], title: string, message: string | React.ReactNode,
    onConfirm?: (() => void) | null, showCancel = false, confirmText = 'OK',
  ) => {
    setAlertConfig({ type, title, message, onConfirm, showCancel, confirmText });
    setAlertVisible(true);
  };

  const buildMissingFieldsMessage = (fields: string[]): React.ReactNode => (
    <div style={{ display: 'grid', gap: '6px', textAlign: 'left' }}>
      <div>Please complete the required fields:</div>
      {Array.from(new Set(fields)).map((field, index) => (
        <div key={`${index}-${field}`}>- {field}</div>
      ))}
    </div>
  );

  const getBookingMissingFields = (): string[] => {
    const missingFields: string[] = [];

    if (!currentUser) missingFields.push('Active user session');
    if (!selectedService) missingFields.push('Service');
    if (selectedService?.id === 1 && selectedGroomingOptions.length === 0) missingFields.push('Grooming option');
    if (selectedService?.hasOptions && selectedService.id !== 1 && selectedLabOptions.length === 0) missingFields.push(`${selectedService.name} option`);
    if (selectedService?.id === 4 && (!boardingDays || Number(boardingDays) < 1 || Number(boardingDays) > 14)) missingFields.push('Boarding stay duration');
    if (!selectedPet) missingFields.push('Pet');
    if (isGrooming && !selectedHaircutStyle) missingFields.push('Haircut style');
    if (isGrooming && selectedHaircutStyle === 'h6' && !customHaircutDescription.trim()) missingFields.push('Custom haircut description');
    if (!selectedBranch) missingFields.push('Branch');
    if (!selectedDate) missingFields.push('Appointment date');
    if (selectedDate && isDateBeforeBookingLeadTime(selectedDate)) missingFields.push('Appointment date at least 2 days after today');
    if (selectedDate && isSpecialBookingDate(selectedDate)) missingFields.push('Available appointment date');
    if (!selectedTime) missingFields.push('Time slot');

    const allMedicalAnswered = medicalQuestions.every(question => medicalAnswers[question.key] !== null);
    if (!allMedicalAnswered) missingFields.push('Medical information');
    if (medicalAnswers.medications72h === true && !medicationDetails.trim()) missingFields.push('Medication details');

    return missingFields;
  };

  const bookingPaymentAmount = useMemo(() => {
    if (!selectedService) return 0;

    const selectedOptions = selectedService.id === 1 ? selectedGroomingOptions : selectedLabOptions;
    if (selectedService.hasOptions && selectedOptions.length) {
      return selectedOptions.reduce((sum, option) => sum + parsePriceLabel(option.price), 0);
    }

    if (selectedService.id === 4 && boardingDays) {
      const nightlyRate = parsePriceLabel(selectedService.basePrice);
      return nightlyRate * Number(boardingDays);
    }

    return parsePriceLabel(selectedService.basePrice);
  }, [boardingDays, selectedGroomingOptions, selectedLabOptions, selectedService]);

  const openConfirmModal = () => {
    setIsChecked(false);
    setConfirmModalStage('terms');
    setSubmittedBookingMessage(DEFAULT_SUBMITTED_BOOKING_MESSAGE);
    setBookingPaymentReference(generatePayrexMockReference());
    setConfirmModalVisible(true);
  };

  const proceedToBookingPayment = () => {
    if (!isChecked) return;
    setBookingPaymentReference(generatePayrexMockReference());
    setConfirmModalStage('payment');
  };

  const closeConfirmModal = () => {
    if (confirmModalStage === 'submitting') return;
    setConfirmModalVisible(false);
    setConfirmModalStage('terms');
    setSubmittedBookingMessage(DEFAULT_SUBMITTED_BOOKING_MESSAGE);
    setIsChecked(false);
    setBookingPaymentReference(generatePayrexMockReference());
  };

  const handleLogout = () => {
    localStorage.removeItem('userSession');
    localStorage.removeItem('access_token');
    navigate('/user/home', { replace: true, state: { authMode: 'login' } });
  };

  const persistBookingDraft = () => {
    const draft: BookingDraft = {
      step,
      selectedServiceId: selectedService?.id ?? null,
      selectedGroomingOptionIds: selectedGroomingOptions.map(option => option.id),
      selectedLabOptionIds: selectedLabOptions.map(option => option.id),
      boardingDays,
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

  const isSpecialBookingDate = (date: Date | null) => {
    const dateKey = toDateKey(date);
    if (!dateKey) return false;
    return specialDates.includes(dateKey) || annualSpecialDates.includes(dateKey.slice(5));
  };

  const getEarliestBookableDate = () => {
    const earliest = new Date();
    earliest.setHours(0, 0, 0, 0);
    earliest.setDate(earliest.getDate() + 2);
    return earliest;
  };

  const isDateBeforeBookingLeadTime = (date: Date | null) => {
    if (!date) return false;
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);
    return normalizedDate < getEarliestBookableDate();
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
    const parsePrice = (price: string) => parseFloat(price.replace(/[^\d.]/g, '')) || 0;
    selectedGroomingOptions.forEach(o => { total += parsePrice(o.price); });
    selectedLabOptions.forEach(o =>      { total += parsePrice(o.price); });
    if (selectedService && !selectedService.hasOptions && selectedService.basePrice) {
      const basePrice = parsePrice(selectedService.basePrice.split('/')[0]);
      total += selectedService.id === 4 ? basePrice * Math.max(1, Number(boardingDays) || 1) : basePrice;
    }
    return total;
  };

  const getIconComponent = (icon: string) => {
    switch (icon) {
      case 'cut':   return <IoCutOutline   size={40} />;
      case 'home':  return <IoHomeOutline  size={40} />;
      case 'scan':  return <IoScanOutline  size={40} />;
      case 'radio': return <IoRadioOutline size={40} />;
      case 'flask': return <IoFlaskOutline size={40} />;
      case 'shield': return <IoShieldCheckmarkOutline size={40} />;
      default:      return <IoMedicalOutline size={40} />;
    }
  };

  const isGrooming = selectedService?.id === 1 && selectedGroomingOptions.length > 0;
  const hasGroomingPreferenceStep = isGrooming && selectedGroomingOptions.some(option => !['g4', 'g5'].includes(option.id));
  const isPetBoarding = selectedService?.id === 4;
  const skipsSymptomStep = selectedService ? [1, 3, 4].includes(selectedService.id) : false;
  const hasSymptomStep = !skipsSymptomStep;
  const groomingPrefsStep = hasGroomingPreferenceStep ? 3 : null;
  const branchStep = hasGroomingPreferenceStep ? 4 : 3;
  const dateTimeStep = branchStep + 1;
  const symptomStep = hasSymptomStep ? dateTimeStep + 1 : null;
  const medicalInfoStep = hasSymptomStep ? dateTimeStep + 2 : dateTimeStep + 1;
  const confirmStep = medicalInfoStep + 1;

  const getProgressSteps = () => {
    const steps = [
      { n: 1, l: 'Service' },
      { n: 2, l: 'Pet' },
    ];

    if (hasGroomingPreferenceStep) steps.push({ n: 3, l: 'Grooming Prefs' });
    steps.push({ n: branchStep, l: 'Branch' });
    steps.push({ n: dateTimeStep, l: 'Date & Time' });
    if (hasSymptomStep && symptomStep) steps.push({ n: symptomStep, l: 'Symptoms' });
    steps.push({ n: medicalInfoStep, l: 'Medical Info' });
    steps.push({ n: confirmStep, l: 'Confirm' });

    return steps;
  };

  const getStepTitle = () => {
    if (step === 1) return 'Book an Appointment';
    if (step === 2) return 'Select Your Pet';
    if (groomingPrefsStep && step === groomingPrefsStep) return 'Grooming Preferences';
    if (step === branchStep) return 'Select Branch';
    if (step === dateTimeStep) return 'Select Date & Time';
    if (symptomStep && step === symptomStep) return 'Symptom Intake';
    if (step === medicalInfoStep) return 'Medical Information';
    if (step === confirmStep) return 'Confirm Booking';
    return '';
  };

  const getStepDescription = () => {
    if (step === 1) return 'Choose the service your pet needs and select any required options.';
    if (step === 2) return 'Pick the pet profile for this appointment.';
    if (groomingPrefsStep && step === groomingPrefsStep) return 'Tell the groomer what style you prefer.';
    if (step === branchStep) return 'Choose the PetShield branch for your visit.';
    if (step === dateTimeStep) return 'Pick an available date and clinic time slot.';
    if (symptomStep && step === symptomStep) return 'Share symptoms so the clinic can prepare.';
    if (step === medicalInfoStep) return 'Answer these health questions before confirming.';
    if (step === confirmStep) return 'Review everything before submitting your booking.';
    return '';
  };

  const getStepHeroIcon = () => {
    const title = getStepTitle();
    if (title.includes('Pet')) return <IoPawOutline size={30} />;
    if (title.includes('Branch')) return <IoLocationOutline size={30} />;
    if (title.includes('Date')) return <IoCalendarOutline size={30} />;
    if (title.includes('Symptom') || title.includes('Medical')) return <IoMedicalOutline size={30} />;
    if (title.includes('Grooming')) return <IoCutOutline size={30} />;
    if (title.includes('Confirm')) return <IoShieldCheckmarkOutline size={30} />;
    return <IoCalendarOutline size={30} />;
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Service carousel
  // ─────────────────────────────────────────────────────────────────────────

  const handleServiceSelect = (service: Service) => {
    if (selectedService?.id === service.id) {
      setSelectedService(null); setSelectedGroomingOptions([]); setSelectedLabOptions([]); setBoardingDays(''); setSelectedSymptoms([]); setOwnerSymptomNotes(''); setSymptomDuration(''); setEatingStatus(''); setDrinkingStatus(''); setWorseningStatus(''); setExpandedService(null);
    } else {
      setSelectedService(service); setSelectedGroomingOptions([]); setSelectedLabOptions([]);
      if (service.id !== 4) setBoardingDays('');
      if ([1, 3, 4].includes(service.id)) {
        setSelectedSymptoms([]);
        setOwnerSymptomNotes('');
        setSymptomDuration('');
        setEatingStatus('');
        setDrinkingStatus('');
        setWorseningStatus('');
      }
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
      if (selectedService.id !== 1 && !selectedLabOptions.length)      { showAlert('info','No Options','Please select at least one option'); return; }
    }
    if (selectedService.id === 4 && (!boardingDays || Number(boardingDays) < 1 || Number(boardingDays) > 14)) {
      showAlert('info','Stay Duration Needed','Please enter a boarding stay from 1 to 14 days.');
      return;
    }
    setStep(2);
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setSelectedPet(null);
      return;
    }

    if (groomingPrefsStep && step === groomingPrefsStep) {
      setStep(2);
      return;
    }

    if (step === branchStep) {
      setStep(groomingPrefsStep ?? 2);
      setSelectedBranch(null);
      return;
    }

    if (step === dateTimeStep) {
      setStep(branchStep);
      setSelectedDate(null);
      setSelectedTime(null);
      return;
    }

    if (symptomStep && step === symptomStep) {
      setStep(dateTimeStep);
      return;
    }

    if (step === medicalInfoStep) {
      setStep(symptomStep ?? dateTimeStep);
      return;
    }

    if (step === confirmStep) {
      setStep(medicalInfoStep);
    }
  };

  const handleContinue = () => {
    if (step === 2) {
      if (!selectedPet) { showAlert('info','No Pet Selected','Please select a pet first'); return; }
      setStep(groomingPrefsStep ?? branchStep);
    } else if (groomingPrefsStep && step === groomingPrefsStep) {
      if (!selectedHaircutStyle) { showAlert('info','No Style','Please select a haircut style'); return; }
      if (selectedHaircutStyle === 'h6' && !customHaircutDescription.trim()) { showAlert('info','Incomplete','Please describe your custom style'); return; }
      setStep(branchStep);
    } else if (step === branchStep) {
      if (!selectedBranch) { showAlert('info','No Branch','Please select a branch'); return; }
      setStep(dateTimeStep);
    } else if (step === dateTimeStep) {
      if (!selectedDate || !selectedTime) { showAlert('info','Incomplete','Please select date and time'); return; }
      if (isDateBeforeBookingLeadTime(selectedDate)) {
        showAlert('info', 'Date Too Soon', 'Please choose an appointment date at least 2 days after today.');
        return;
      }
      if (isSpecialBookingDate(selectedDate)) {
        showAlert('info', 'Date Unavailable', 'Please choose another date. This date is blocked for booking.');
        return;
      }
      setStep(symptomStep ?? medicalInfoStep);
    } else if (symptomStep && step === symptomStep) {
      setStep(medicalInfoStep);
    } else if (step === medicalInfoStep) {
      const allAnswered = medicalQuestions.every(q => medicalAnswers[q.key] !== null);
      if (!allAnswered) { showAlert('info','Incomplete','Please answer all medical questions'); return; }
      if (medicalAnswers.medications72h && !medicationDetails.trim()) { showAlert('info','Incomplete','Please specify the medications given'); return; }
      setStep(confirmStep);
    } else if (step === confirmStep) {
      openConfirmModal();
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Submit booking
  // ─────────────────────────────────────────────────────────────────────────

  const handleConfirmBooking = async () => {
    const missingFields = getBookingMissingFields();
    if (missingFields.length > 0) {
      showAlert('error', 'Missing Information', buildMissingFieldsMessage(missingFields));
      return;
    }

    if (!currentUser || !selectedPet || !selectedDate || !selectedTime || !selectedBranch || !selectedService) {
      showAlert('error', 'Missing Information', buildMissingFieldsMessage(['Booking details']));
      return;
    }

    const bookingService = selectedService;

    setConfirmModalStage('submitting');

    try {
      let typeLabel = bookingService.name;
      if (bookingService.id === 1 && selectedGroomingOptions.length)
        typeLabel = `Pet Grooming (${selectedGroomingOptions.map(o => o.name).join(', ')})`;
      if (bookingService.id !== 1 && selectedLabOptions.length)
        typeLabel = `${bookingService.name} (${selectedLabOptions.map(o => o.name).join(', ')})`;
      if (bookingService.id === 4 && boardingDays)
        typeLabel = `Pet Boarding (${boardingDays} ${Number(boardingDays) === 1 ? 'day' : 'days'})`;

      const patientReasonParts = [
        bookingService.id === 4 && boardingDays
          ? `Boarding stay: ${boardingDays} ${Number(boardingDays) === 1 ? 'day' : 'days'}`
          : '',
        additionalNotes.trim(),
      ].filter(Boolean);
      
      // appointments POST — cast ids to Number
      const apptRes = await apiClient.post<{
        appointment_id: number;
        emailSent?: boolean;
        status?: string;
      }>(
        `${API_URL}/appointments`,
        {
          owner_id:         currentUser.id,
          pet_id:           Number(selectedPet.pet_id),       // ← fix bigint error
          appointment_type: typeLabel,
          appointment_date: toDateKey(selectedDate),
          appointment_time: toDbTime(selectedTime),
          branch_id:        Number(selectedBranch.branch_id), // ← fix bigint error
          patient_reason:   patientReasonParts.join('\n'),
          payment_method:   PAYREX_MOCK_PAYMENT_METHOD,
          payment_reference: bookingPaymentReference,
        },
        { headers: { Authorization: `Bearer ${getToken()}` } },
      );
      const appointmentId = apptRes.data.appointment_id;
      const bookingEmailSent = apptRes.data.emailSent !== false;

      // medical-information POST — add the three NOT NULL fields
      await apiClient.post(
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
          reported_symptoms:    selectedSymptoms,
          owner_symptom_notes:  ownerSymptomNotes,
          symptom_duration:     symptomDuration,
          eating_status:        eatingStatus,
          drinking_status:      drinkingStatus,
          worsening_status:     worseningStatus,
        },
        { headers: { Authorization: `Bearer ${getToken()}` } },
      );

      if (hasGroomingPreferenceStep && selectedHaircutStyle) {
        let referenceUrl: string | undefined;
        if (haircutImageBase64) {
          try {
            const upRes = await apiClient.post<{ photoUrl?: string }>(
              `${API_URL}/upload-pet-photo`,
              { file: haircutImageBase64, file_name: `haircut_ref_${appointmentId}.jpg`, mime_type: haircutImageMime },
              { headers: { Authorization: `Bearer ${getToken()}` } },
            );
            referenceUrl = upRes.data.photoUrl;
          } catch { /* non-fatal */ }
        }
        const styleName = haircutStyles.find(h => h.id === selectedHaircutStyle)?.name ?? selectedHaircutStyle;
        await apiClient.post(
          `${API_URL}/grooming-details`,
          { appointment_id: appointmentId, haircut_style: styleName, haircut_description: customHaircutDescription || undefined, haircut_reference_url: referenceUrl },
          { headers: { Authorization: `Bearer ${getToken()}` } },
        );
      }

      const isConfirmed = apptRes.data.status === 'confirmed';
      setSubmittedBookingMessage(
        isConfirmed
          ? bookingEmailSent
            ? 'Your appointment is confirmed. A confirmation email has been sent with your visit details.'
            : 'Your appointment is confirmed. The booking was saved successfully, but the confirmation email could not be sent right now.'
          : bookingEmailSent
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

  const removeHaircutImage = () => {
    setHaircutImage(null);
    setHaircutImageBase64(null);
    setHaircutImageMime('image/jpeg');
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
  const selectedServiceOptions = selectedService?.id === 1 ? selectedGroomingOptions : selectedLabOptions;
  const progressPercent = Math.max(8, (step / progressSteps.length) * 100);
  const encouragementMessage =
    progressPercent >= 86
      ? 'Almost there! ✨'
      : progressPercent >= 58
        ? 'Just a couple more steps 🐾'
        : progressPercent >= 30
          ? 'Nice start! Keep going ❤️'
          : 'Let’s book this visit 🐶';

  const handleBoardingDaysChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '');
    if (!digitsOnly) {
      setBoardingDays('');
      return;
    }

    const clampedDays = Math.min(14, Math.max(1, Number(digitsOnly)));
    setBoardingDays(String(clampedDays));
  };

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
    <div className="user-appointment-container user-page-surface" ref={pageContainerRef}>

      {/* ── Alert Modal ── */}
      {alertVisible && (
        <div className="modal-overlay" onClick={() => setAlertVisible(false)}>
          <div className="modal-content user-alert-modal" onClick={e => e.stopPropagation()}>
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
                <div className="confirmation-icon"><IoReceiptOutline size={28} color="#3d67ee" /></div>
                <h2 className="confirmation-title">Complete Booking Payment</h2>
                <p className="confirmation-text">
                  Your appointment will be confirmed after PayRex mock payment. Estimated amount:{' '}
                  <strong>{formatCurrency(bookingPaymentAmount)}</strong>.
                </p>
                <div className="checkbox-container">
                  <label className="checkbox-label">
                    <input type="checkbox" checked={isChecked} onChange={e => setIsChecked(e.target.checked)} className="checkbox-input" />
                    <span className="checkbox-text">I understand that payment is required to confirm this booking</span>
                  </label>
                </div>
                <button
                  className={`confirmation-btn ${!isChecked ? 'disabled' : ''}`}
                  onClick={proceedToBookingPayment}
                  disabled={!isChecked}
                >
                  Proceed to Payment
                </button>
              </>
            )}

            {confirmModalStage === 'payment' && (
              <>
                <div className="confirmation-icon"><IoReceiptOutline size={28} color="#3d67ee" /></div>
                <h2 className="confirmation-title">PayRex Mock Payment</h2>
                <p className="confirmation-text">
                  Complete the mock QR payment below to confirm your appointment.
                </p>
                <PayrexMockPayment
                  amount={bookingPaymentAmount}
                  onReferenceChange={setBookingPaymentReference}
                />
                <button className="confirmation-btn" onClick={handleConfirmBooking}>
                  I Have Completed Payment
                </button>
                <button
                  type="button"
                  className="confirmation-btn confirmation-btn-secondary"
                  onClick={() => setConfirmModalStage('terms')}
                >
                  Back
                </button>
              </>
            )}

            {confirmModalStage === 'submitting' && (
              <>
                <div className="confirmation-icon"><IoHourglassOutline size={28} color="#3d67ee" /></div>
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
                <div className="confirmation-icon"><IoCheckmark size={30} color="#2e9e0c" /></div>
                <h2 className="confirmation-title">Appointment Confirmed!</h2>
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
        <div className={`progress-container booking-progress-hidden ${!hasSymptomStep ? 'no-symptom-step' : ''}`}>
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

        <div className={`step-hero ${step === confirmStep ? 'step-hero-confirm' : ''}`}>
          <div className="step-hero-icon">
            {getStepHeroIcon()}
          </div>
          <div className="step-hero-copy">
            <div className="step-hero-topline">
              <span className="step-hero-kicker">Step {step} of {progressSteps.length}</span>
              {selectedService && (
                <span className="selected-service-heading-chip">
                  {getIconComponent(selectedService.icon)}
                  Your selected service is {selectedService.name}
                  {selectedServiceOptions.length > 0 && <strong>{selectedServiceOptions.length}</strong>}
                </span>
              )}
            </div>
            <div className="step-hero-title-row">
              <h2>{getStepTitle()}</h2>
            </div>
            <p>{getStepDescription()}</p>
            <div className="step-hero-progress-row">
              <div className="step-hero-progress" aria-label={`Step ${step} of ${progressSteps.length}`}>
                <span style={{ width: `${progressPercent}%` }} />
              </div>
              <span className="step-hero-encouragement">{encouragementMessage}</span>
            </div>
          </div>
          {step === confirmStep && (
            <div className="confirmation-total-chip">
              <IoReceiptOutline size={18} />
              <span>Total</span>
              <strong>₱{getTotalPrice().toLocaleString()}</strong>
            </div>
          )}
        </div>

        {/* ══ STEP 1 — Service ══ */}
        {step === 1 && (
          <div className="step-content">
            <div className="service-carousel-shell">
              <div
                className="service-carousel"
                onTouchStart={handleCarouselTouchStart}
                onTouchMove={handleCarouselTouchMove}
                onTouchEnd={handleCarouselTouchEnd}
              >
                <div className="carousel-viewport">
                  <div className="carousel-track booking-service-grid">
                    {services.map((service, index) => {
                      const isSelected = selectedService?.id === service.id;
                      const isActive = currentCardIndex === index;
                      const selectedOptions = service.id === 1 ? selectedGroomingOptions : selectedLabOptions;
                      const serviceOptions = service.options ?? [];

                      return (
                        <div
                          key={service.id}
                          className={`service-card-wrapper ${isActive ? 'center-card' : ''}`}
                        >
                          <div
                            className={`service-card ${service.hasOptions ? 'has-options' : ''} ${isSelected ? 'selected' : ''} ${isActive ? 'active' : 'inactive'}`}
                          >
                            <div className="service-card-inner">
                              <button
                                type="button"
                                className="service-card-face service-card-front"
                                onClick={() => handleServiceSelect(service)}
                              >
                                <img src={service.image} alt="" className="service-card-image" />
                                <div className="service-card-overlay" />
                                <div className="service-card-copy">
                                  <div className="service-icon">{getIconComponent(service.icon)}</div>
                                  <h3 className="service-name">{service.name}</h3>
                                  <div className="service-description">{service.description.map((l,i) => <p key={i}>{l}</p>)}</div>
                                  <p className="service-price">{service.basePrice || 'Select options'}</p>
                                </div>
                              </button>

                              <div className="service-card-face service-card-back">
                                <h3>{service.name}</h3>
                                {serviceOptions.length > 0 ? (
                                  <div className="service-card-option-list">
                                    {serviceOptions.map(option => {
                                      const optionSelected = selectedOptions.some(selected => selected.id === option.id);

                                      return (
                                        <button
                                          key={option.id}
                                          type="button"
                                          className={optionSelected ? 'is-picked' : ''}
                                          onClick={() => {
                                            if (service.id === 1) {
                                              setSelectedGroomingOptions(prev =>
                                                prev.some(o => o.id === option.id) ? [] : [option],
                                              );
                                            } else {
                                              setSelectedLabOptions(prev => {
                                                if (prev.some(o => o.id === option.id)) return prev.filter(o => o.id !== option.id);
                                                if (service.id === 8 && prev.length >= 3) {
                                                  showAlert('info','Max 3','You can only select up to 3 lab tests');
                                                  return prev;
                                                }
                                                return [...prev, option];
                                              });
                                            }
                                          }}
                                        >
                                          <span>{option.name}</span>
                                          <strong>{option.price}</strong>
                                        </button>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <p>{service.basePrice || 'Ready to book'}</p>
                                )}
                              </div>
                            </div>
                          </div>
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
                <h3 className="options-title">{selectedService.name} Options</h3>
                <div className="options-list">
                  {(selectedService.options ?? []).map(opt => {
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
                              if (selectedService.id === 8 && prev.length >= 3) { showAlert('info','Max 3','You can only select up to 3 lab tests'); return prev; }
                              return [...prev, opt];
                            });
                          }
                        }}
                      >
                        <span className="option-check">{isSel ? <IoCheckmark size={15} /> : null}</span>
                        <span className="option-copy">
                          <h4 className="option-name">{opt.name}</h4>
                          <p className="option-description">{opt.description}</p>
                        </span>
                        <span className="option-price">{opt.price}</span>
                      </button>
                    );
                  })}
                </div>
                {selectedService.id === 8 && <p className="lab-limit-note">Select up to 3 tests</p>}
              </div>
            )}

            {isPetBoarding && (
              <div className="boarding-days-panel">
                <div className="boarding-days-copy">
                  <h3>Boarding Stay Duration</h3>
                  <p>How many days will your pet stay with us?</p>
                </div>
                <label className="boarding-days-field">
                  <span>Number of days</span>
                  <input
                    type="number"
                    min="1"
                    max="14"
                    step="1"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={boardingDays}
                    onChange={event => handleBoardingDaysChange(event.target.value)}
                    onKeyDown={event => {
                      if (['e', 'E', '+', '-', '.'].includes(event.key)) event.preventDefault();
                    }}
                    placeholder="1-14 days"
                  />
                </label>
              </div>
            )}

            {false && selectedService && (
              <div className="selected-services">
                <h4>Selected:</h4>
                <div className="selected-services-list">
                  <div className="selected-service-tag">
                    <span>{selectedService?.name}</span>
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
                  <span className="add-pet-text">Can't find your pet here?</span>
                  <span className="add-pet-subtext">Click here to create a Pet Profile for them 🐾✨</span>
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
        {groomingPrefsStep && step === groomingPrefsStep && (
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
                <div className="custom-grooming-panel">
                  <div className="custom-grooming-copy">
                    <span className="custom-grooming-kicker">Custom Style</span>
                    <p>Describe the look you want and add a reference photo if you have one.</p>
                  </div>
                  <div>
                    <label className="grooming-label">Describe your custom style <span className="required-asterisk">*</span></label>
                    <textarea className="custom-style-input" rows={3} placeholder="Describe the desired haircut…" value={customHaircutDescription} onChange={e => setCustomHaircutDescription(e.target.value)} />
                  </div>
                  <div className="reference-upload-field">
                    <label className="grooming-label">Reference Image (Optional)</label>
                    <div className={`reference-upload-card ${haircutImage ? 'has-image' : ''}`}>
                      {haircutImage ? (
                        <>
                          <img src={haircutImage} alt="Haircut reference" className="reference-upload-preview" />
                          <div className="reference-upload-actions">
                            <button className="reference-upload-change" onClick={pickImage} type="button">Change image</button>
                            <button className="reference-upload-remove" onClick={removeHaircutImage} type="button">Remove</button>
                          </div>
                        </>
                      ) : (
                        <button className="image-upload-btn" onClick={pickImage} type="button">
                          <IoCloudUploadOutline size={24} color="#0818a0" />
                          <span>Upload Reference Image</span>
                          <small>PNG, JPG, or JPEG</small>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="action-buttons-row" style={{ marginTop:40 }}>
              <button className="btn-secondary" onClick={handleBack}>Back</button>
              <button className="btn-primary" onClick={handleContinue} disabled={!selectedHaircutStyle}>Continue</button>
            </div>
          </div>
        )}

        {step === branchStep && !isGrooming && (
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
                      <img src={getBranchImage(branch)} alt={branch.branch_name} className="branch-image" />
                      <div className="branch-card-body">
                        <span className="branch-pill"><IoLocationOutline size={13} /> Branch</span>
                        <h3 className="branch-name">{branch.branch_name}</h3>
                        <p className="branch-address">{branch.address}</p>
                      </div>
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
        {step === branchStep && isGrooming && (
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
                      <img src={getBranchImage(branch)} alt={branch.branch_name} className="branch-image" />
                      <div className="branch-card-body">
                        <span className="branch-pill"><IoLocationOutline size={13} /> Branch</span>
                        <h3 className="branch-name">{branch.branch_name}</h3>
                        <p className="branch-address">{branch.address}</p>
                      </div>
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

        {step === dateTimeStep && (
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
                    minDate={getEarliestBookableDate()}
                    maxDate={(() => { const d = new Date(); d.setMonth(d.getMonth()+2); return d; })()}
                    tileDisabled={({ date, view }) => {
                      if (view !== 'month') return false;

                      const dayName = getDayName(date);
                      const isTooSoon = isDateBeforeBookingLeadTime(date);
                      const isEnabledDay = dayName ? Boolean(dayAvailability[dayName.toLowerCase()]) : false;
                      const isSpecialDate = isSpecialBookingDate(date);

                      return loadingAvailability || isTooSoon || !isEnabledDay || isSpecialDate;
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
                        {timeSlots.map((slot,i) => (
                          <button
                            key={`${slot.value}-${i}`}
                            className={`time-slot-btn ${selectedTime===slot.value?'selected':''} ${slot.disabled ? 'disabled' : ''}`}
                            onClick={() => {
                              if (!slot.disabled) setSelectedTime(slot.value);
                            }}
                            disabled={slot.disabled}
                            title={slot.disabled ? 'This time slot is fully booked' : undefined}
                          >
                            {slot.label}
                          </button>
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

        {/* ══ Symptom Intake ══ */}
        {symptomStep && step === symptomStep && (
          <div className="step-content">
            <div className="medical-questionnaire medical-info-step-panel symptom-intake-panel">
              <div className="required-info-banner symptom-intake-banner">
                <IoMedicalOutline size={24} color="#3d67ee" />
                <p><strong>Helpful for the clinic:</strong> Share any symptoms or changes you noticed so the team can prepare before the visit.</p>
              </div>

              <div className="symptom-section-block">
                <div className="symptom-section-heading">
                  <h4>What did you notice?</h4>
                  <p>Select any that apply. You can add more details below.</p>
                </div>
                <div className="symptom-chip-grid common-symptom-grid">
                  {commonSymptoms.map(symptom => {
                    const isSelected = selectedSymptoms.includes(symptom);
                    return (
                      <button
                        key={symptom}
                        type="button"
                        className={`symptom-chip${isSelected ? ' selected' : ''}`}
                        onClick={() => toggleSymptom(symptom)}
                      >
                        {symptom}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="selected-symptoms-panel">
                <span className="selected-symptoms-label">Selected Symptoms</span>
                <div className="selected-symptoms-list">
                  {selectedSymptoms.length > 0 ? selectedSymptoms.map(symptom => (
                    <span key={symptom} className="selected-symptom-pill">{symptom}</span>
                  )) : <span className="selected-symptoms-empty">No symptoms selected yet.</span>}
                </div>
              </div>

              <div className="additional-notes">
                <label>Describe What You Noticed</label>
                <textarea
                  className="notes-textarea"
                  rows={4}
                  placeholder="Example: My dog vomited twice today and has been weaker than usual."
                  value={ownerSymptomNotes}
                  onChange={e => setOwnerSymptomNotes(e.target.value)}
                />
              </div>

              <div className="symptom-followups-grid">
                <div className="symptom-select-field">
                  <label>How long has this been happening?</label>
                  <select value={symptomDuration} onChange={e => setSymptomDuration(e.target.value)}>
                    <option value="">Select duration</option>
                    {symptomDurationOptions.map(option => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>

                <div className="symptom-select-field">
                  <label>Is the condition getting worse?</label>
                  <select value={worseningStatus} onChange={e => setWorseningStatus(e.target.value)}>
                    <option value="">Select status</option>
                    {worseningOptions.map(option => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
              </div>

              <div className="symptom-more-details">
                <button
                  type="button"
                  className="symptom-more-toggle"
                  onClick={() => setShowMoreSymptomDetails(prev => !prev)}
                >
                  {showMoreSymptomDetails ? 'Hide more details' : 'Add more details'}
                </button>

                {showMoreSymptomDetails && (
                  <div className="symptom-advanced-panel">
                    <div className="symptom-followups-grid">
                      <div className="symptom-select-field">
                        <label>Is your pet eating normally?</label>
                        <select value={eatingStatus} onChange={e => setEatingStatus(e.target.value)}>
                          <option value="">Select status</option>
                          {intakeStatusOptions.map(option => <option key={option} value={option}>{option}</option>)}
                        </select>
                      </div>

                      <div className="symptom-select-field">
                        <label>Is your pet drinking normally?</label>
                        <select value={drinkingStatus} onChange={e => setDrinkingStatus(e.target.value)}>
                          <option value="">Select status</option>
                          {intakeStatusOptions.map(option => <option key={option} value={option}>{option}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="symptom-groups">
                      {symptomGroups.map(group => (
                        <div key={group.title} className="symptom-group-card">
                          <div className="symptom-group-header">
                            <h4>{group.title}</h4>
                          </div>
                          <div className="symptom-chip-grid">
                            {group.items.map(symptom => {
                              const isSelected = selectedSymptoms.includes(symptom);
                              return (
                                <button
                                  key={symptom}
                                  type="button"
                                  className={`symptom-chip${isSelected ? ' selected' : ''}`}
                                  onClick={() => toggleSymptom(symptom)}
                                >
                                  {symptom}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="action-buttons-row">
              <button className="btn-secondary" onClick={handleBack}>Back</button>
              <button className="btn-primary" onClick={handleContinue}>Proceed</button>
            </div>
          </div>
        )}

        {/* ══ Medical Info ══ */}
        {step === medicalInfoStep && (
          <div className="step-content">
            <div className="medical-questionnaire medical-info-step-panel">
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
                          <span className="custom-radio-dot" aria-hidden="true" />
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
        {step === confirmStep && (
          <div className="step-content">
            <div className="confirmation-hero legacy-confirmation-hero-hidden">
              <div className="confirmation-hero-icon">
                <IoShieldCheckmarkOutline size={30} />
              </div>
              <div className="confirmation-hero-copy">
                <span className="confirmation-kicker">Ready for review</span>
                <h2>Confirm Booking</h2>
                <p>Review the owner, pet, service, branch, schedule, and intake details before submitting.</p>
              </div>
              <div className="confirmation-total-chip">
                <IoReceiptOutline size={18} />
                <span>Total</span>
                <strong>₱{getTotalPrice().toLocaleString()}</strong>
              </div>
            </div>

            <div className="confirmation-details">
              <div className="confirmation-column confirmation-column-left">

              <div className="confirmation-card confirmation-owner-card">
                <div className="card-header"><IoPersonCircleOutline size={27} color="#3d67ee" /><h3>Owner Details</h3></div>
                <div className="card-details">
                  <div className="detail-row"><span className="detail-label">Full Name</span><span className="detail-value">{displayName}</span></div>
                  <div className="detail-row"><span className="detail-label">Email</span><span className="detail-value">{currentUser?.email ?? 'N/A'}</span></div>
                  <div className="detail-row"><span className="detail-label">Phone</span><span className="detail-value">{currentUser?.contact_number ?? 'N/A'}</span></div>
                </div>
              </div>

              {hasSymptomStep && (
                <div className="confirmation-card confirmation-intake-card confirmation-left-stack">
                  <div className="card-header"><IoMedicalOutline size={22} color="#3d67ee" /><h3>Symptom Intake</h3></div>
                  <div className="card-details">
                    <div className="detail-row">
                      <span className="detail-label">Selected Symptoms</span>
                      <span className="detail-value">{selectedSymptoms.length > 0 ? selectedSymptoms.join(', ') : 'No symptoms selected'}</span>
                    </div>
                    {ownerSymptomNotes && <div className="detail-row"><span className="detail-label">Owner Notes</span><span className="detail-value">{ownerSymptomNotes}</span></div>}
                    {symptomDuration && <div className="detail-row"><span className="detail-label">Duration</span><span className="detail-value">{symptomDuration}</span></div>}
                    {eatingStatus && <div className="detail-row"><span className="detail-label">Eating</span><span className="detail-value">{eatingStatus}</span></div>}
                    {drinkingStatus && <div className="detail-row"><span className="detail-label">Drinking</span><span className="detail-value">{drinkingStatus}</span></div>}
                    {worseningStatus && <div className="detail-row"><span className="detail-label">Getting Worse</span><span className="detail-value">{worseningStatus}</span></div>}
                  </div>
                </div>
              )}

              <div className="confirmation-card medical-info-card confirmation-left-stack">
                <div className="card-header"><IoMedicalOutline size={22} color="#3d67ee" /><h3>Medical Information</h3></div>
                <div className="card-details">
                  <div className="detail-row"><span className="detail-label">Medications (72h)</span><span className="detail-value">{medicalAnswers.medications72h ? `Yes — ${medicationDetails}` : 'No'}</span></div>
                  <div className="detail-row"><span className="detail-label">Flea/Tick Prev.</span><span className="detail-value">{medicalAnswers.fleaPrevention ? 'Yes' : 'No'}</span></div>
                  <div className="detail-row"><span className="detail-label">Vaccinations</span><span className="detail-value">{medicalAnswers.catVaccinations ? 'Yes' : 'No'}</span></div>
                  <div className="detail-row medical-not-pregnant-row"><span className="detail-label">Not Pregnant</span><span className="detail-value">{medicalAnswers.notPregnant ? 'Yes' : 'No'}</span></div>
                  {additionalNotes && <div className="detail-row medical-notes-row"><span className="detail-label">Notes</span><span className="detail-value">{additionalNotes}</span></div>}
                </div>
              </div>
              </div>

              <div className="confirmation-column confirmation-column-right">
              {selectedPet && (
                <div className="confirmation-card confirmation-pet-card">
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

              {isGrooming && selectedHaircutStyle && (
                <div className="confirmation-card confirmation-grooming-card">
                  <div className="card-header"><IoCutOutline size={22} color="#3d67ee" /><h3>Grooming Preferences</h3></div>
                  <div className="card-details">
                    <div className={haircutImage ? 'grooming-review-layout' : ''}>
                      {haircutImage && (
                        <div className="grooming-reference-review">
                          <img src={haircutImage} alt="Uploaded grooming reference" />
                        </div>
                      )}
                      <div className="grooming-review-details">
                        <div className="detail-row"><span className="detail-label">Style</span><span className="detail-value">{haircutStyles.find(h => h.id === selectedHaircutStyle)?.name}</span></div>
                        {selectedHaircutStyle === 'h6' && customHaircutDescription && (
                          <div className="detail-row"><span className="detail-label">Description</span><span className="detail-value">{customHaircutDescription}</span></div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedDate && selectedTime && selectedBranch && (
                <div className="confirmation-card confirmation-card-primary">
                  <div className="card-header"><IoCalendarOutline size={22} color="#3d67ee" /><h3>Appointment Details</h3></div>
                  <div className="card-details">
                    <div className="detail-row">
                      <span className="detail-label">Service</span>
                      <div className="service-list">
                        <div className="service-main-item">{selectedService?.name}</div>
                        {selectedGroomingOptions.map(o => <div key={o.id} className="service-subitem">{o.name} <span>{o.price}</span></div>)}
                        {selectedLabOptions.map(o => <div key={o.id} className="service-subitem">{o.name} <span>{o.price}</span></div>)}
                        {selectedService?.id === 4 && boardingDays && (
                          <div className="service-subitem">Boarding stay <span>{boardingDays} {Number(boardingDays) === 1 ? 'day' : 'days'}</span></div>
                        )}
                        {selectedService?.basePrice && <div className="service-subitem">Service fee <span>{selectedService.basePrice}</span></div>}
                      </div>
                    </div>
                    <div className="detail-row"><span className="detail-label">Date</span><span className="detail-value">{formatDate(selectedDate)}</span></div>
                    <div className="detail-row"><span className="detail-label">Time</span><span className="detail-value">{selectedTime}</span></div>
                    <div className="detail-divider" />
                    <div className="detail-row"><span className="detail-label">Branch</span><span className="detail-value">{selectedBranch.branch_name}</span></div>
                    <div className="detail-row"><span className="detail-label">Address</span><span className="detail-value">{selectedBranch.address}</span></div>
                    <div className="detail-divider" />
                    <div className="total-row">
                      <span className="total-label">Estimated Total</span>
                      <span className="total-value">₱{getTotalPrice().toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}
              </div>

              {hasSymptomStep && (
                <div className="confirmation-card confirmation-intake-card">
                  <div className="card-header"><IoMedicalOutline size={22} color="#3d67ee" /><h3>Symptom Intake</h3></div>
                  <div className="card-details">
                    <div className="detail-row">
                      <span className="detail-label">Selected Symptoms</span>
                      <span className="detail-value">{selectedSymptoms.length > 0 ? selectedSymptoms.join(', ') : 'No symptoms selected'}</span>
                    </div>
                    {ownerSymptomNotes && <div className="detail-row"><span className="detail-label">Owner Notes</span><span className="detail-value">{ownerSymptomNotes}</span></div>}
                    {symptomDuration && <div className="detail-row"><span className="detail-label">Duration</span><span className="detail-value">{symptomDuration}</span></div>}
                    {eatingStatus && <div className="detail-row"><span className="detail-label">Eating</span><span className="detail-value">{eatingStatus}</span></div>}
                    {drinkingStatus && <div className="detail-row"><span className="detail-label">Drinking</span><span className="detail-value">{drinkingStatus}</span></div>}
                    {worseningStatus && <div className="detail-row"><span className="detail-label">Getting Worse</span><span className="detail-value">{worseningStatus}</span></div>}
                  </div>
                </div>
              )}

              <div className="confirmation-card medical-info-card">
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
      <footer className="user-page-footer" aria-label="Petshield footer">
        <div className="home-footer-main">
          <div className="home-footer-brand">
            <img src={petshieldLogo} alt="Petshield" />
            <div>
              <h2>Petshield</h2>
              <p>Veterinary Clinic & Grooming Center</p>
            </div>
          </div>

          <div className="home-footer-branches">
            <div className="home-footer-branch">
              <h3>Petshield Las Piñas</h3>
              <p>Las Pinas City, Metro Manila</p>
              <div className="home-footer-contact-actions">
                <a href="mailto:petshieldlaspinas@gmail.com">
                  <IoMailOutline size={17} />
                  Email
                </a>
                <a href="tel:+639958590382">
                  <IoCallOutline size={17} />
                  Call
                </a>
              </div>
            </div>
            <div className="home-footer-branch">
              <h3>Petshield Taguig</h3>
              <p>Taguig City, Metro Manila</p>
              <div className="home-footer-contact-actions">
                <a href="mailto:petshieldtaguig@gmail.com">
                  <IoMailOutline size={17} />
                  Email
                </a>
                <a href="tel:+639054570190">
                  <IoCallOutline size={17} />
                  Call
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="home-footer-powered">
          <span>Powered by</span>
          <img src={pawRangLogo} alt="PawRang" />
        </div>
      </footer>
    </div>
  );
};

export default UserAppointmentBook;


