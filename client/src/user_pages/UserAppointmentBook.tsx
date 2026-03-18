// UserAppointmentBook.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './UserStyles.css';

// Icons
import { 
  IoPersonOutline,
  IoPawOutline,
  IoCalendarOutline,
  IoNotificationsOutline,
  IoChevronDownOutline,
  IoChevronUpOutline,
  IoChevronBackCircle,
  IoChevronForwardCircle,
  IoClose,
  IoHourglassOutline,
  IoCheckmark,
  IoInformationCircleOutline,
  IoCloudUploadOutline,
  IoCutOutline,
  IoMedicalOutline,
  IoHomeOutline,
  IoBedOutline,
  IoScanOutline,
  IoRadioOutline,
  IoFlaskOutline,
  IoAdd,
  IoCloseCircle,
  IoPersonCircleOutline
} from 'react-icons/io5';
import ClientNavBar from '../reusable_components/ClientNavBar';

// Types and Interfaces
interface User {
  id?: number;
  pk?: number;
  username: string;
  fullname?: string;
  fullName?: string;
  userImage?: string;
  userimage?: string;
  email?: string;
  contactnumber?: string;
  contactNumber?: string;
  address?: string;
}

interface Pet {
  id: number;
  name: string;
  icon: string;
  species: string;
  breed: string;
  age: number;
  gender: string;
  image: string;
}

interface Branch {
  id: number;
  name: string;
  address: string;
  image: string;
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

interface GroomingOption extends ServiceOption {}

interface LabOption extends ServiceOption {}

interface HaircutStyle {
  id: string;
  name: string;
  description: string;
  image: string;
}

interface MedicalQuestion {
  id: string;
  question: string;
  key: string;
  hasDetails: boolean;
}

interface MedicalAnswers {
  medications72h: boolean | null;
  fleaPrevention: boolean | null;
  catVaccinations: boolean | null;
  notPregnant: boolean | null;
}

interface AlertConfig {
  type: 'info' | 'success' | 'error' | 'confirm';
  title: string;
  message: string;
  onConfirm?: () => void;
  showCancel: boolean;
  confirmText: string;
}

// Clinic hours data
const clinicHours: Record<string, string[]> = {
  'Monday': ['8:00AM - 9:00AM', '9:00AM - 10:00AM', '10:00AM - 11:00AM', '11:00AM - 12:00PM', '1:00PM - 2:00PM', '2:00PM - 3:00PM', '3:00PM - 4:00PM', '4:00PM - 5:00PM'],
  'Tuesday': ['8:00AM - 9:00AM', '9:00AM - 10:00AM', '10:00AM - 11:00AM', '11:00AM - 12:00PM', '1:00PM - 2:00PM', '2:00PM - 3:00PM', '3:00PM - 4:00PM', '4:00PM - 5:00PM'],
  'Wednesday': ['8:00AM - 9:00AM', '9:00AM - 10:00AM', '10:00AM - 11:00AM', '11:00AM - 12:00PM', '1:00PM - 2:00PM', '2:00PM - 3:00PM', '3:00PM - 4:00PM', '4:00PM - 5:00PM'],
  'Thursday': ['8:00AM - 9:00AM', '9:00AM - 10:00AM', '10:00AM - 11:00AM', '11:00AM - 12:00PM', '1:00PM - 2:00PM', '2:00PM - 3:00PM', '3:00PM - 4:00PM', '4:00PM - 5:00PM'],
  'Friday': ['8:00AM - 9:00AM', '9:00AM - 10:00AM', '10:00AM - 11:00AM', '11:00AM - 12:00PM', '1:00PM - 2:00PM', '2:00PM - 3:00PM', '3:00PM - 4:00PM', '4:00PM - 5:00PM'],
  'Saturday': [],
  'Sunday': []
};

// Vet Branches with image paths
const vetBranches: Branch[] = [
  {
    id: 1,
    name: '📍 PetShield Veterinary Clinic and Grooming Center - Las Piñas',
    address: 'BF Resort village, 65 judge b tan, Talon Dos, Las Piñas, 1747 Metro Manila',
    image: '/assets/branchLP.jpg'
  },
  {
    id: 2,
    name: '📍 PetShield Veterinary Clinic and Grooming Center - Taguig',
    address: '99 General Espino St, cor Bravo St, Central Signal, Taguig, 1630 Metro Manila',
    image: '/assets/branchTaguig.jpg'
  }
];

// Mock user pets with image paths
const userPets: Pet[] = [
  {
    id: 1,
    name: 'Max',
    icon: 'paw',
    species: 'Dog',
    breed: 'Golden Retriever',
    age: 3,
    gender: 'Male',
    image: '/assets/samplePet.jpg'
  },
  {
    id: 2,
    name: 'Luna',
    icon: 'paw',
    species: 'Cat',
    breed: 'Siamese',
    age: 2,
    gender: 'Female',
    image: '/assets/samplePet.jpg'
  },
  {
    id: 3,
    name: 'Charlie',
    icon: 'paw',
    species: 'Dog',
    breed: 'French Bulldog',
    age: 1,
    gender: 'Male',
    image: '/assets/samplePet.jpg'
  }
];

// Grooming options
const groomingOptions: GroomingOption[] = [
  { id: 'g1', name: 'Basic Grooming', price: '₱500', description: 'Bath, brush, nail trim' },
  { id: 'g2', name: 'Full Grooming', price: '₱800', description: 'Bath, haircut, nail trim, ear cleaning' },
  { id: 'g3', name: 'Deluxe Grooming', price: '₱1200', description: 'Full grooming + teeth brushing + perfume' },
  { id: 'g4', name: 'Nail Trim Only', price: '₱200', description: 'Nail clipping and filing' },
  { id: 'g5', name: 'Bath Only', price: '₱300', description: 'Shampoo, conditioner, blow dry' },
];

// Haircut styles with image examples
const haircutStyles: HaircutStyle[] = [
  { 
    id: 'h1', 
    name: 'Puppy Cut', 
    description: 'Even length all over, short and easy maintenance',
    image: '/assets/haircuts/puppy-cut.jpg'
  },
  { 
    id: 'h2', 
    name: 'Lion Cut', 
    description: 'Shaved body with full mane and tail tip',
    image: '/assets/haircuts/lion-cut.jpg'
  },
  { 
    id: 'h3', 
    name: 'Teddy Bear Cut', 
    description: 'Round face with fluffy body',
    image: '/assets/haircuts/teddy-bear.jpg'
  },
  { 
    id: 'h4', 
    name: 'Summer Cut', 
    description: 'Very short all over for hot weather',
    image: '/assets/haircuts/summer-cut.jpg'
  },
  { 
    id: 'h5', 
    name: 'Show Cut', 
    description: 'Breed-specific standard cut',
    image: '/assets/haircuts/show-cut.jpg'
  },
  { 
    id: 'h6', 
    name: 'Custom Style', 
    description: 'Specify your preferred style',
    image: '/assets/haircuts/custom.jpg'
  },
];

// Laboratory options
const laboratoryOptions: LabOption[] = [
  { id: 'l1', name: 'Complete Blood Count', price: '₱800', description: 'CBC with differential' },
  { id: 'l2', name: 'Blood Chemistry', price: '₱1200', description: 'Liver, kidney, glucose levels' },
  { id: 'l3', name: 'Urinalysis', price: '₱400', description: 'Complete urine analysis' },
  { id: 'l4', name: 'Fecal Examination', price: '₱350', description: 'Parasite and bacteria check' },
  { id: 'l5', name: 'X-Ray', price: '₱1500', description: 'Single view radiograph' },
  { id: 'l6', name: 'Ultrasound', price: '₱2000', description: 'Abdominal ultrasound' },
];

// Medical questionnaire
const medicalQuestions: MedicalQuestion[] = [
  {
    id: 'q1',
    question: 'WERE THERE ANY MEDICATIONS GIVEN TO YOUR PET IN THE PAST 72 HOURS?',
    key: 'medications72h',
    hasDetails: true
  },
  {
    id: 'q2',
    question: 'MY PET HAS RECEIVED UP-TO-DATE FLEA AND TICK PREVENTION AND IS NOT INFESTED WITH FLEAS OR TICKS',
    key: 'fleaPrevention',
    hasDetails: false 
  },
  {
    id: 'q3',
    question: 'MY CAT HAS UP-TO-DATE ANTI RABIES+4IN1',
    key: 'catVaccinations',
    hasDetails: false 
  },
  {
    id: 'q4',
    question: 'MY PET IS NOT PREGNANT',
    key: 'notPregnant',
    hasDetails: false 
  }
];

// Services data - Updated with no basePrice for services with options
const services: Service[] = [
  {
    id: 1,
    name: 'Pet Grooming',
    icon: 'cut',
    description: ['Brushing, Nail', 'Trimming, Haircut,', 'Bathing, etc.'],
    hasOptions: true,
    options: groomingOptions
  },
  {
    id: 2,
    name: 'Consultation & Check-Up',
    icon: 'medical',
    description: ['Preventative service', 'to assess your', "pet's overall health"],
    basePrice: '₱500',
    hasOptions: false
  },
  {
    id: 3,
    name: 'Dental Prophylaxis',
    icon: 'medical',
    description: ['Teeth cleaning,', 'plaque removal,', 'oral health check'],
    basePrice: '₱800',
    hasOptions: false
  },
  {
    id: 4,
    name: 'Pet Boarding',
    icon: 'home',
    description: ['Overnight stay,', 'feeding,', 'supervision'],
    basePrice: '₱1,200/night',
    hasOptions: false
  },
  {
    id: 5,
    name: 'Confinement',
    icon: 'bed',
    description: ['Medical care,', 'monitoring, IV', 'fluids, medication'],
    basePrice: '₱2,500/day',
    hasOptions: false
  },
  {
    id: 6,
    name: 'X-Ray',
    icon: 'scan',
    description: ['Radiography for', 'bone, chest,', 'abdominal imaging'],
    basePrice: '₱1,500',
    hasOptions: false
  },
  {
    id: 7,
    name: 'Ultrasound',
    icon: 'radio',
    description: ['Soft tissue,', 'abdominal, cardiac,', 'pregnancy check'],
    basePrice: '₱2,000',
    hasOptions: false
  },
  {
    id: 8,
    name: 'Laboratory Tests',
    icon: 'flask',
    description: ['Blood work,', 'urinalysis, fecal,', 'chemistry panel'],
    hasOptions: true,
    options: laboratoryOptions
  },
  {
    id: 9,
    name: 'Vaccinations',
    icon: 'flask',
    description: ['Core vaccines,', 'boosters,', 'rabies shot'],
    basePrice: '₱1,200',
    hasOptions: false
  }
];

const UserAppointmentBook: React.FC = () => {
  const navigate = useNavigate();
  
  // State
  const [step, setStep] = useState<number>(1);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [isChecked, setIsChecked] = useState<boolean>(false);
  
  // Custom Alert Modal State
  const [customAlertVisible, setCustomAlertVisible] = useState<boolean>(false);
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    type: 'info',
    title: '',
    message: '',
    showCancel: false,
    confirmText: 'OK'
  });

  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(1);
  const [expandedService, setExpandedService] = useState<number | null>(null);
  const [selectedGroomingOptions, setSelectedGroomingOptions] = useState<GroomingOption[]>([]);
  const [selectedLabOptions, setSelectedLabOptions] = useState<LabOption[]>([]);

  const [dropdownVisible, setDropdownVisible] = useState<boolean>(false);

  // Dynamic user state
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [medicalAnswers, setMedicalAnswers] = useState<MedicalAnswers>({
    medications72h: null,
    fleaPrevention: null,
    catVaccinations: null,
    notPregnant: null
  });
  const [medicationDetails, setMedicationDetails] = useState<string>('');
  const [additionalNotes, setAdditionalNotes] = useState<string>('');
  
  // Grooming specific state
  const [selectedHaircutStyle, setSelectedHaircutStyle] = useState<string | null>(null);
  const [customHaircutDescription, setCustomHaircutDescription] = useState<string>('');
  const [haircutImage, setHaircutImage] = useState<string | null>(null);

  const cardRef = useRef<HTMLDivElement | null>(null);
  
  // Animation values
  const [panelPosition, setPanelPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
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
          // If they are not logged in, redirect them back to Home
          navigate('/');
        }
      } catch (error) {
        console.error("Failed to load user session", error);
      }
    };
    loadUser();
  }, [navigate]);

  // Helper functions
  const showAlert = (
    type: AlertConfig['type'], 
    title: string, 
    message: string, 
    onConfirm?: () => void, 
    showCancel: boolean = false, 
    confirmText: string = 'OK'
  ) => {
    setAlertConfig({ type, title, message, onConfirm, showCancel, confirmText });
    setCustomAlertVisible(true);
  };

  const handleLogout = () => {
    setDropdownVisible(false);
    showAlert('confirm', 'Log Out', 'Are you sure you want to log out?', () => {
      localStorage.removeItem('userSession');
      setCurrentUser(null);
      navigate('/login');
    }, true, 'Log Out');
  };
  
  const handleViewProfile = () => {
    navigate('/user-profile');
  };
  
  const handleMyPets = () => {
    navigate('/user-pets');
  };

  const getTodayDate = (): Date => {
    return new Date();
  };

  const getMaxDate = (): Date => {
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 2);
    return maxDate;
  };

  const handleServiceSelect = (service: Service) => {
    // If clicking the same service that's already selected, deselect it
    if (selectedServices.some(s => s.id === service.id)) {
      setSelectedServices([]);
      setSelectedGroomingOptions([]);
      setSelectedLabOptions([]);
      setSelectedHaircutStyle(null);
      setCustomHaircutDescription('');
      setHaircutImage(null);
      setExpandedService(null);
    } else {
      // Replace with new service (only one allowed)
      setSelectedServices([service]);
      
      // Clear previous options
      setSelectedGroomingOptions([]);
      setSelectedLabOptions([]);
      setSelectedHaircutStyle(null);
      setCustomHaircutDescription('');
      setHaircutImage(null);
      
      // Expand options if available
      if (service.hasOptions) {
        setExpandedService(service.id);
      } else {
        setExpandedService(null);
      }
    }
  };

  const handleGroomingOptionSelect = (option: GroomingOption) => {
    const isSelected = selectedGroomingOptions.some(o => o.id === option.id);
    if (isSelected) {
      setSelectedGroomingOptions(selectedGroomingOptions.filter(o => o.id !== option.id));
    } else {
      setSelectedGroomingOptions([...selectedGroomingOptions, option]);
    }
  };

  const handleLabOptionSelect = (option: LabOption) => {
    setSelectedLabOptions(prev => {
      const isSelected = prev.some(o => o.id === option.id);
      if (isSelected) {
        return prev.filter(o => o.id !== option.id);
      } else {
        // Limit to 3 selections
        if (prev.length >= 3) {
          showAlert('info', 'Maximum Reached', 'You can only select up to 3 laboratory tests');
          return prev;
        }
        return [...prev, option];
      }
    });
  };

  const handleProceed = () => {
    if (selectedServices.length > 0) {
      const service = selectedServices[0]; // Get the single selected service
      
      // Check if service has options and none are selected
      if (service.hasOptions) {
        if (service.id === 1 && selectedGroomingOptions.length === 0) {
          showAlert('info', 'No Options Selected', 'Please select at least one grooming option');
          return;
        }
        if (service.id === 8 && selectedLabOptions.length === 0) {
          showAlert('info', 'No Tests Selected', 'Please select at least one laboratory test');
          return;
        }
      }
      
      // Always go to pet selection next
      setStep(2);
    } else {
      showAlert('info', 'No Service Selected', 'Please select a service first');
    }
  };

  const handleBack = () => {
    const service = selectedServices[0];
    
    if (step === 2) {
      setStep(1); // Back to service selection
      setSelectedPet(null);
    } else if (step === 3) {
      if (service?.id === 1) {
        setStep(2); // Back to pet selection
      } else {
        setStep(2); // Back to pet selection
      }
      setSelectedBranch(null);
    } else if (step === 4) {
      if (service?.id === 1) {
        setStep(3); // Back to grooming preferences
      } else {
        setStep(3); // Back to branch selection
      }
      setSelectedDate(null);
      setSelectedTime(null);
    } else if (step === 5) {
      if (service?.id === 1) {
        setStep(4); // Back to branch selection
      } else {
        setStep(4); // Back to date & time
      }
    } else if (step === 6) {
      if (service?.id === 1) {
        setStep(5); // Back to date & time
      } else {
        setStep(5); // Back to medical info
      }
    } else if (step === 7) {
      setStep(6); // Back to medical info
    }
  };

  const handleContinue = () => {
    const service = selectedServices[0];
    
    if (step === 2) {
      // Pet selection step
      if (selectedPet) {
        if (service?.id === 1) {
          // If grooming, go to grooming preferences
          setStep(3);
        } else {
          // If not grooming, go to branch selection
          setStep(3);
        }
      } else {
        showAlert('info', 'No Pet Selected', 'Please select a pet first');
      }
    } else if (step === 3) {
      if (service?.id === 1) {
        // Grooming preferences step
        if (!selectedHaircutStyle) {
          showAlert('info', 'No Style Selected', 'Please select a haircut style');
          return;
        }
        if (selectedHaircutStyle === 'h6' && !customHaircutDescription.trim()) {
          showAlert('info', 'Incomplete', 'Please describe your custom haircut style');
          return;
        }
        setStep(4); // Go to branch selection
      } else {
        // Branch selection step (for non-grooming)
        if (selectedBranch) {
          setStep(4); // Go to date & time
        } else {
          showAlert('info', 'No Branch Selected', 'Please select a branch');
        }
      }
    } else if (step === 4) {
      if (service?.id === 1) {
        // Branch selection for grooming
        if (selectedBranch) {
          setStep(5); // Go to date & time
        } else {
          showAlert('info', 'No Branch Selected', 'Please select a branch');
        }
      } else {
        // Date & time for non-grooming
        if (selectedDate && selectedTime) {
          setStep(5); // Go to medical info
        } else {
          showAlert('info', 'Incomplete', 'Please select date and time');
        }
      }
    } else if (step === 5) {
      if (service?.id === 1) {
        // Date & time for grooming
        if (selectedDate && selectedTime) {
          setStep(6); // Go to medical info
        } else {
          showAlert('info', 'Incomplete', 'Please select date and time');
        }
      } else {
        // Medical info for non-grooming
        const allAnswered = medicalQuestions.every(q => medicalAnswers[q.key as keyof MedicalAnswers] !== null);
        if (allAnswered) {
          setStep(6); // Go to confirmation
        } else {
          showAlert('info', 'Incomplete', 'Please answer all medical questions');
        }
      }
    } else if (step === 6) {
      if (service?.id === 1) {
        // Medical info for grooming
        const allAnswered = medicalQuestions.every(q => medicalAnswers[q.key as keyof MedicalAnswers] !== null);
        if (allAnswered) {
          setStep(7); // Go to confirmation
        } else {
          showAlert('info', 'Incomplete', 'Please answer all medical questions');
        }
      } else {
        // Confirmation for non-grooming
        setModalVisible(true);
      }
    } else if (step === 7) {
      // Confirmation for grooming
      setModalVisible(true);
    }
  };

  const handleDateSelect = (value: Date | null | [Date | null, Date | null]) => {
    if (value instanceof Date) {
      setSelectedDate(value);
      setSelectedTime(null);
    }
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
  };

  const handlePetSelect = (pet: Pet) => {
    setSelectedPet(pet);
  };

  const handleBranchSelect = (branch: Branch) => {
    setSelectedBranch(branch);
  };

  const handleAddPet = () => {
    showAlert('info', 'Add Pet', 'Navigate to Add Pet screen');
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setIsChecked(false);
    navigate('/');
  };

  const handleMedicalAnswer = (questionKey: string, answer: boolean) => {
    setMedicalAnswers({
      ...medicalAnswers,
      [questionKey]: answer
    });
  };

  const pickImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setHaircutImage(event.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  // Get day name from date string
  const getDayName = (date: Date | null): string | null => {
    if (!date) return null;
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  };

  // Get time slots based on day of week
  const getTimeSlotsForSelectedDate = (): string[] => {
    if (!selectedDate) return [];
    const dayName = getDayName(selectedDate);
    return dayName ? clinicHours[dayName] || [] : [];
  };

  const formatSelectedDate = (): string => {
    if (!selectedDate) return '';
    return selectedDate.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const goToPreviousCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
      setExpandedService(null);
    }
  };

  const goToNextCard = () => {
    if (currentCardIndex < services.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setExpandedService(null);
    }
  };

  const getVisibleCards = () => {
    const cards: { service: Service; position: number; index: number }[] = [];
    for (let i = -1; i <= 1; i++) {
      const index = currentCardIndex + i;
      if (index >= 0 && index < services.length) {
        cards.push({
          service: services[index],
          position: i,
          index: index
        });
      }
    }
    return cards;
  };

  const getTotalPrice = (): number => {
    let total = 0;
    
    selectedGroomingOptions.forEach(option => {
      const price = parseFloat(option.price.replace(/[₱,]/g, ''));
      total += price;
    });
    
    selectedLabOptions.forEach(option => {
      const price = parseFloat(option.price.replace(/[₱,]/g, ''));
      total += price;
    });
    
    // Add base prices for non-option services
    selectedServices.forEach(service => {
      if (!service.hasOptions && service.basePrice) {
        const price = parseFloat(service.basePrice.replace(/[₱,]/g, '').split('/')[0]);
        total += price;
      }
    });
    
    return total;
  };

  const getIconComponent = (iconName: string) => {
    switch(iconName) {
      case 'cut': return <IoCutOutline size={40} />;
      case 'medical': return <IoMedicalOutline size={40} />;
      case 'home': return <IoHomeOutline size={40} />;
      case 'bed': return <IoBedOutline size={40} />;
      case 'scan': return <IoScanOutline size={40} />;
      case 'radio': return <IoRadioOutline size={40} />;
      case 'flask': return <IoFlaskOutline size={40} />;
      default: return <IoMedicalOutline size={40} />;
    }
  };

  const getSelectedHaircutStyleName = (): string => {
    if (!selectedHaircutStyle) return 'Not specified';
    const style = haircutStyles.find(s => s.id === selectedHaircutStyle);
    return style ? style.name : 'Not specified';
  };

  const getProgressSteps = () => {
    const service = selectedServices[0];
    const hasGrooming = service?.id === 1 && selectedGroomingOptions.length > 0;
    
    if (hasGrooming) {
      return [
        { number: 1, label: 'Select Service' },
        { number: 2, label: 'Select Pet' },
        { number: 3, label: 'Grooming Preferences' },
        { number: 4, label: 'Select Branch' },
        { number: 5, label: 'Select Date & Time' },
        { number: 6, label: 'Medical Info' },
        { number: 7, label: 'Confirm' }
      ];
    } else {
      return [
        { number: 1, label: 'Select Service' },
        { number: 2, label: 'Select Pet' },
        { number: 3, label: 'Select Branch' },
        { number: 4, label: 'Select Date & Time' },
        { number: 5, label: 'Medical Info' },
        { number: 6, label: 'Confirm' }
      ];
    }
  };

  const timeSlots = getTimeSlotsForSelectedDate();
  const displayName = currentUser ? (currentUser.fullname || currentUser.fullName || currentUser.username || "User") : "";

  // Determine if grooming is selected
  const hasGrooming = selectedServices.some(s => s.id === 1) && selectedGroomingOptions.length > 0;

  // Get the current step title based on step number and grooming status
  const getStepTitle = () => {
    const service = selectedServices[0];
    
    if (step === 1) return 'Book an Appointment';
    if (step === 2) return 'Select Your Pet';
    if (step === 3) {
      return service?.id === 1 ? 'Grooming Preferences' : 'Select Branch';
    }
    if (step === 4) {
      return service?.id === 1 ? 'Select Branch' : 'Select Date & Time';
    }
    if (step === 5) {
      return service?.id === 1 ? 'Select Date & Time' : 'Medical Information';
    }
    if (step === 6) {
      return service?.id === 1 ? 'Medical Information' : 'Confirm Booking';
    }
    if (step === 7) return 'Confirm Booking';
    return '';
  };

  // Get the current step subtitle
  const getStepSubtitle = () => {
    const service = selectedServices[0];
    
    if (step === 1) {
      return 'Choose a service and schedule your appointment with ease with PetShield.';
    }
    if (step === 2) {
      return 'Select which pet will receive the service';
    }
    if (step === 3) {
      return service?.id === 1 
        ? 'Tell us your grooming preferences for your pet (required)'
        : 'Select which branch you prefer for your appointment';
    }
    if (step === 4) {
      return service?.id === 1
        ? 'Select which branch you prefer for your appointment'
        : 'Select available date and time for your appointment';
    }
    if (step === 5) {
      return service?.id === 1
        ? 'Select available date and time for your appointment'
        : 'Please answer the following medical questions about your pet';
    }
    if (step === 6) {
      return service?.id === 1
        ? 'Please answer the following medical questions about your pet'
        : 'Please review your booking details before confirming';
    }
    if (step === 7) {
      return 'Please review your booking details before confirming';
    }
    return '';
  };

  return (
    <div className="user-appointment-container">
      {/* CUSTOM ALERT MODAL */}
      {customAlertVisible && (
        <div className="modal-overlay" onClick={() => setCustomAlertVisible(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-icon">
              {alertConfig.type === 'success' && <IoCheckmark size={55} color="#2e9e0c" />}
              {alertConfig.type === 'error' && <IoClose size={55} color="#d93025" />}
              {alertConfig.type !== 'success' && alertConfig.type !== 'error' && <IoInformationCircleOutline size={55} color="#3d67ee" />}
            </div>
            
            <h3 className="modal-title">{alertConfig.title}</h3>
            
            <div className="modal-message">
              <p>{alertConfig.message}</p>
            </div>
            
            <div className="modal-actions">
              {alertConfig.showCancel && (
                <button 
                  className="modal-btn modal-btn-cancel"
                  onClick={() => setCustomAlertVisible(false)}
                >
                  Cancel
                </button>
              )}
              
              <button 
                className={`modal-btn modal-btn-confirm ${alertConfig.type === 'error' ? 'error-btn' : ''}`}
                onClick={() => {
                  setCustomAlertVisible(false);
                  if (alertConfig.onConfirm) alertConfig.onConfirm();
                }}
              >
                {alertConfig.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {modalVisible && (
        <div className="modal-overlay" onClick={() => setModalVisible(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button 
              className="modal-close-btn"
              onClick={() => setModalVisible(false)}
            >
              <IoClose size={24} color="#999" />
            </button>
            
            <div className="confirmation-icon">
              <IoHourglassOutline size={70} color="#3d67ee" />
            </div>
            
            <h2 className="confirmation-title">Appointment Under Review</h2>
            
            <p className="confirmation-text">
              Your appointment is currently under reviewal! {'\n'} 
              You will receive an email confirmation once your appointment 
              has been scheduled and approved.
            </p>

            {/* Checkbox Section */}
            <div className="checkbox-container">
              <label className="checkbox-label">
                <input 
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => setIsChecked(e.target.checked)}
                  className="checkbox-input"
                />
                <span className="checkbox-text">I understand</span>
              </label>
            </div>
            
            <button
              className={`confirmation-btn ${!isChecked ? 'disabled' : ''}`}
              onClick={handleModalClose}
              disabled={!isChecked}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      <ClientNavBar 
        currentUser={currentUser}
        onLogout={handleLogout}
        onViewProfile={handleViewProfile}
        onMyPets={handleMyPets}
        showAlert={showAlert}
      />

      <div className="appointment-content">
        {/* Progress Indicator with Labels */}
        <div className="progress-container">
          <div className="progress-steps">
            {getProgressSteps().map((stepItem, index) => (
              <React.Fragment key={stepItem.number}>
                <div className="step-item">
                  <div className={`step-circle ${step >= stepItem.number ? 'active' : ''} ${step === stepItem.number ? 'current' : ''}`}>
                    <span>{stepItem.number}</span>
                  </div>
                  <span className={`step-label ${step === stepItem.number ? 'active' : ''}`}>
                    {stepItem.label}
                  </span>
                </div>
                {index < getProgressSteps().length - 1 && (
                  <div className={`step-line ${step > stepItem.number ? 'active' : ''}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step Title */}
        <h1 className="step-title">{getStepTitle()}</h1>
        <p className="step-subtitle">{getStepSubtitle()}</p>

        {/* Step 1 - Select Service */}
        {step === 1 && (
          <div className="step-content">
            <div className="service-carousel">
              <div className="carousel-controls">
                <button 
                  className="carousel-arrow"
                  onClick={goToPreviousCard}
                  disabled={currentCardIndex === 0}
                >
                  <IoChevronBackCircle 
                    size={50} 
                    color={currentCardIndex === 0 ? '#ccc' : '#3d67ee'} 
                  />
                </button>
              </div>

              <div className="carousel-cards">
                {getVisibleCards().map(({service, position}) => {
                  const isSelected = selectedServices.some(s => s.id === service.id);
                  const opacity = position === 0 ? 1 : 0.5;
                  const scale = position === 0 ? 1 : 0.85;
                  
                  let marginLeft = 0;
                  let marginRight = 0;
                  
                  if (position === -1) {
                    marginRight = expandedService ? -panelWidth/2 : -20;
                    if (expandedService) {
                      marginLeft = -20;
                    }
                  } else if (position === 1) {
                    marginLeft = expandedService ? panelWidth/2 : -20;
                    if (expandedService) {
                      marginRight = -20;
                    }
                  }
                  
                  return (
                    <div 
                      key={service.id} 
                      className={`service-card-wrapper ${position === 0 ? 'center-card' : ''}`}
                      style={{
                        marginLeft,
                        marginRight,
                        transform: `scale(${scale})`,
                        opacity,
                        zIndex: position === 0 ? 30 : position === -1 ? 20 : 10,
                      }}
                      ref={position === 0 ? cardRef : null}
                    >
                      <button 
                        className={`service-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleServiceSelect(service)}
                        disabled={position !== 0}
                      >
                        <div className="service-icon">
                          {getIconComponent(service.icon)}
                        </div>
                        <h3 className="service-name">{service.name}</h3>
                        <div className="service-description">
                          {service.description.map((line, index) => (
                            <p key={index}>{line}</p>
                          ))}
                        </div>
                        {service.basePrice && (
                          <p className="service-price">{service.basePrice}</p>
                        )}
                      </button>

                      {/* Extension Panel for Options */}
                      {position === 0 && service.hasOptions && expandedService === service.id && (
                        <div 
                          className="options-panel"
                          style={{
                            left: 210,
                            top: 0,
                            width: panelWidth,
                            transform: `translateX(0)`,
                            opacity: 1,
                          }}
                        >
                          <h3 className="options-title">
                            {service.id === 1 ? 'Grooming Options' : 'Laboratory Options'}
                          </h3>
                          <div className="options-list">
                            {(service.id === 1 ? groomingOptions : laboratoryOptions).map((option) => {
                              const isSelected = service.id === 1 
                                ? selectedGroomingOptions.some(o => o.id === option.id)
                                : selectedLabOptions.some(o => o.id === option.id);
                              
                              return (
                                <button
                                  key={option.id}
                                  className={`option-item ${isSelected ? 'selected' : ''}`}
                                  onClick={() => service.id === 1 
                                    ? handleGroomingOptionSelect(option as GroomingOption)
                                    : handleLabOptionSelect(option as LabOption)
                                  }
                                >
                                  <h4 className="option-name">{option.name}</h4>
                                  <p className="option-description">{option.description}</p>
                                  <p className="option-price">{option.price}</p>
                                </button>
                              );
                            })}
                          </div>
                          {service.id === 8 && (
                            <p className="lab-limit-note">You can select up to 3 tests</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="carousel-controls">
                <button 
                  className="carousel-arrow"
                  onClick={goToNextCard}
                  disabled={currentCardIndex === services.length - 1}
                >
                  <IoChevronForwardCircle 
                    size={50} 
                    color={currentCardIndex === services.length - 1 ? '#ccc' : '#3d67ee'} 
                  />
                </button>
              </div>
            </div>

            {selectedServices.length > 0 && (
              <div className="selected-services">
                <h4>Selected Services:</h4>
                <div className="selected-services-list">
                  {selectedServices.map(service => (
                    <div key={service.id} className="selected-service-tag">
                      <span>{service.name}</span>
                      <button onClick={() => handleServiceSelect(service)}>
                        <IoCloseCircle size={16} color="white" />
                      </button>
                    </div>
                  ))}
                  {selectedGroomingOptions.map(option => (
                    <div key={option.id} className="selected-service-tag grooming">
                      <span>Grooming: {option.name}</span>
                      <button onClick={() => handleGroomingOptionSelect(option)}>
                        <IoCloseCircle size={16} color="white" />
                      </button>
                    </div>
                  ))}
                  {selectedLabOptions.map(option => (
                    <div key={option.id} className="selected-service-tag lab">
                      <span>Lab: {option.name}</span>
                      <button onClick={() => handleLabOptionSelect(option)}>
                        <IoCloseCircle size={16} color="white" />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="selected-total">Total: ₱{getTotalPrice().toLocaleString()}</p>
              </div>
            )}

            <div className="action-buttons">
              <button className="btn-primary" onClick={handleProceed}>
                Proceed
              </button>
            </div>
          </div>
        )}

        {/* Step 2 - Select Pet (always) */}
        {step === 2 && (
          <div className="step-content">
            <div className="pets-grid">
              {userPets.map((pet) => (
                <button 
                  key={pet.id}
                  className={`pet-card ${selectedPet?.id === pet.id ? 'selected' : ''}`}
                  onClick={() => handlePetSelect(pet)}
                >
                  <img 
                    src={pet.image} 
                    alt={pet.name}
                    className="pet-image"
                  />
                  <h3 className="pet-name">{pet.name}</h3>
                  <p className="pet-details">{pet.species} • {pet.breed}</p>
                  <p className="pet-details">{pet.gender} • {pet.age} years</p>
                </button>
              ))}

              <button 
                className="add-pet-card"
                onClick={handleAddPet}
              >
                <div className="add-pet-icon">
                  <IoAdd size={50} color="#3d67ee" />
                </div>
                <span className="add-pet-text">Add Pet</span>
              </button>
            </div>

            <div className="action-buttons-row">
              <button className="btn-secondary" onClick={handleBack}>
                Back
              </button>
              <button className="btn-primary" onClick={handleContinue}>
                Proceed
              </button>
            </div>
          </div>
        )}

        {/* Step 3 - Grooming Preferences (only when grooming is selected) OR Branch Selection (for non-grooming) */}
        {step === 3 && hasGrooming && (
          <div className="step-content">
            <div className="grooming-preferences-container">
              <div className="grooming-section">
                <div className="haircut-styles-grid">
                  {haircutStyles.map((style) => (
                    <button
                      key={style.id}
                      className={`haircut-style-card ${selectedHaircutStyle === style.id ? 'selected' : ''}`}
                      onClick={() => setSelectedHaircutStyle(style.id)}
                    >
                      <div className="haircut-image-wrapper">
                        <img 
                          src={`https://source.unsplash.com/300x300/?${style.name.toLowerCase().replace(' ', '-')},pet,dog`} 
                          alt={style.name}
                          className="haircut-image"
                          onError={(e) => {
                            const fallbacks = [
                              'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=300',
                              'https://images.unsplash.com/photo-1544568100-847a948585b9?w=300',
                              'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?w=300',
                              'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=300',
                              'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=300',
                              'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=300'
                            ];
                            e.currentTarget.src = fallbacks[Math.floor(Math.random() * fallbacks.length)];
                          }}
                        />
                        <div className="haircut-gradient-overlay">
                          <span className="haircut-name-overlay">{style.name}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Style Description - Only show when custom style selected */}
              {selectedHaircutStyle === 'h6' && (
                <div className="grooming-section" style={{ marginTop: 30 }}>
                  <label className="grooming-label">
                    Describe your custom style <span className="required-asterisk">*</span>
                  </label>
                  <textarea
                    className="custom-style-input"
                    placeholder="Please describe the desired haircut style in detail..."
                    value={customHaircutDescription}
                    onChange={(e) => setCustomHaircutDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              )}

              {/* Reference Image Upload - Only show when custom style selected */}
              {selectedHaircutStyle === 'h6' && (
                <div className="grooming-section">
                  <label className="grooming-label">Reference Image (Optional)</label>
                  <button
                    className="image-upload-btn"
                    onClick={pickImage}
                    type="button"
                  >
                    {haircutImage ? (
                      <div className="upload-preview">
                        <img src={haircutImage} alt="Reference" />
                        <p>Tap to change image</p>
                      </div>
                    ) : (
                      <div className="upload-placeholder">
                        <IoCloudUploadOutline size={30} color="#3d67ee" />
                        <p>Upload Reference Image</p>
                        <small>Show us your desired hairstyle</small>
                      </div>
                    )}
                  </button>
                </div>
              )}
            </div>

            <div className="action-buttons-row" style={{marginTop: 50}}>
              <button className="btn-secondary" onClick={handleBack}>
                Back
              </button>
              <button 
                className="btn-primary"
                onClick={handleContinue}
                disabled={!selectedHaircutStyle}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3 - Branch Selection (for non-grooming) */}
        {step === 3 && !hasGrooming && (
          <div className="step-content">
            <div className="branches-grid">
              {vetBranches.map((branch) => (
                <button 
                  key={branch.id}
                  className={`branch-card ${selectedBranch?.id === branch.id ? 'selected' : ''}`}
                  onClick={() => handleBranchSelect(branch)}
                >
                  <img 
                    src={branch.image} 
                    alt={branch.name}
                    className="branch-image"
                  />
                  <h3 className="branch-name">{branch.name}</h3>
                  <p className="branch-address">{branch.address}</p>
                </button>
              ))}
            </div>

            <div className="action-buttons-row">
              <button className="btn-secondary" onClick={handleBack}>
                Back
              </button>
              <button className="btn-primary" onClick={handleContinue}>
                Proceed
              </button>
            </div>
          </div>
        )}

        {/* Step 4 - Branch Selection (for grooming) OR Date & Time (for non-grooming) */}
        {step === 4 && hasGrooming && (
          <div className="step-content">
            <div className="branches-grid">
              {vetBranches.map((branch) => (
                <button 
                  key={branch.id}
                  className={`branch-card ${selectedBranch?.id === branch.id ? 'selected' : ''}`}
                  onClick={() => handleBranchSelect(branch)}
                >
                  <img 
                    src={branch.image} 
                    alt={branch.name}
                    className="branch-image"
                  />
                  <h3 className="branch-name">{branch.name}</h3>
                  <p className="branch-address">{branch.address}</p>
                </button>
              ))}
            </div>

            <div className="action-buttons-row">
              <button className="btn-secondary" onClick={handleBack}>
                Back
              </button>
              <button className="btn-primary" onClick={handleContinue}>
                Proceed
              </button>
            </div>
          </div>
        )}

        {step === 4 && !hasGrooming && (
          <div className="step-content">
            {selectedDate && (
              <div className="selected-datetime-display">
                <div className="selected-datetime-badge">
                  <span>
                    {formatSelectedDate()}
                    {selectedTime ? ` at ${selectedTime}` : ''}
                  </span>
                </div>
              </div>
            )}

            <div className="datetime-container">
              <div className="calendar-wrapper">
                <div className="calendar-gradient">
                  <Calendar
                    onChange={handleDateSelect}
                    value={selectedDate}
                    minDate={getTodayDate()}
                    maxDate={getMaxDate()}
                    tileClassName={({ date, view }) => {
                        if (view === 'month') {
                        const dayName = getDayName(date);
                        const hasSlots = dayName ? clinicHours[dayName]?.length > 0 : false;
                        return hasSlots ? 'available-day' : 'unavailable-day';
                        }
                        return '';
                    }}
                    tileDisabled={({ date, view }) => {
                        if (view === 'month') {
                        const dayName = getDayName(date);
                        return dayName ? !clinicHours[dayName]?.length : true;
                        }
                        return false;
                    }}
                    />
                </div>
              </div>

              <div className="time-slots-wrapper">
                <h3 className="time-slots-title">Available Time Slots</h3>
                
                {!selectedDate ? (
                  <div className="time-slots-empty">
                    <p>Please select a date from the calendar</p>
                  </div>
                ) : timeSlots.length > 0 ? (
                  <div className="time-slots-grid">
                    {timeSlots.map((time, index) => {
                      const isSelected = selectedTime === time;
                      return (
                        <button
                          key={index}
                          className={`time-slot-btn ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleTimeSelect(time)}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="time-slots-empty">
                    <p>No time slots available for this date</p>
                  </div>
                )}
              </div>
            </div>

            <div className="action-buttons-row">
              <button className="btn-secondary" onClick={handleBack}>
                Back
              </button>
              <button className="btn-primary" onClick={handleContinue}>
                Proceed
              </button>
            </div>
          </div>
        )}

        {/* Step 5 - Date & Time (for grooming) OR Medical Info (for non-grooming) */}
        {step === 5 && hasGrooming && (
          <div className="step-content">
            {selectedDate && (
              <div className="selected-datetime-display">
                <div className="selected-datetime-badge">
                  <span>
                    {formatSelectedDate()}
                    {selectedTime ? ` at ${selectedTime}` : ''}
                  </span>
                </div>
              </div>
            )}

            <div className="datetime-container">
              <div className="calendar-wrapper">
                <div className="calendar-gradient">
                  <Calendar
                    onChange={handleDateSelect}
                    value={selectedDate}
                    minDate={getTodayDate()}
                    maxDate={getMaxDate()}
                    tileClassName={({ date, view }) => {
                        if (view === 'month') {
                        const dayName = getDayName(date);
                        const hasSlots = dayName ? clinicHours[dayName]?.length > 0 : false;
                        return hasSlots ? 'available-day' : 'unavailable-day';
                        }
                        return '';
                    }}
                    tileDisabled={({ date, view }) => {
                        if (view === 'month') {
                        const dayName = getDayName(date);
                        return dayName ? !clinicHours[dayName]?.length : true;
                        }
                        return false;
                    }}
                    />
                </div>
              </div>

              <div className="time-slots-wrapper">
                <h3 className="time-slots-title">Available Time Slots</h3>
                
                {!selectedDate ? (
                  <div className="time-slots-empty">
                    <p>Please select a date from the calendar</p>
                  </div>
                ) : timeSlots.length > 0 ? (
                  <div className="time-slots-grid">
                    {timeSlots.map((time, index) => {
                      const isSelected = selectedTime === time;
                      return (
                        <button
                          key={index}
                          className={`time-slot-btn ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleTimeSelect(time)}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="time-slots-empty">
                    <p>No time slots available for this date</p>
                  </div>
                )}
              </div>
            </div>

            <div className="action-buttons-row">
              <button className="btn-secondary" onClick={handleBack}>
                Back
              </button>
              <button className="btn-primary" onClick={handleContinue}>
                Proceed
              </button>
            </div>
          </div>
        )}

        {step === 5 && !hasGrooming && (
          <div className="step-content">
            <div className="medical-questionnaire">
              <div className="required-info-banner">
                <IoInformationCircleOutline size={24} color="#ee3d5a" />
                <p>
                  <strong>Required:</strong> All medical questions must be answered before proceeding.
                </p>
              </div>
              
              <div className="questions-list">
                {medicalQuestions.map((q) => (
                  <div key={q.id} className="question-item">
                    <div className="question-header">
                      <h4>{q.question}<span className="required-asterisk">*</span></h4>
                    </div>
                    
                    <div className="question-options">
                      <label className="radio-label">
                        <input 
                          type="radio"
                          name={q.key}
                          checked={medicalAnswers[q.key as keyof MedicalAnswers] === true}
                          onChange={() => {
                            handleMedicalAnswer(q.key, true);
                            if (q.key === 'medications72h' && medicalAnswers[q.key] === true) {
                              setMedicationDetails('');
                            }
                          }}
                        />
                        <span>Yes</span>
                      </label>
                      
                      <label className="radio-label">
                        <input 
                          type="radio"
                          name={q.key}
                          checked={medicalAnswers[q.key as keyof MedicalAnswers] === false}
                          onChange={() => {
                            handleMedicalAnswer(q.key, false);
                            if (q.key === 'medications72h') {
                              setMedicationDetails('');
                            }
                          }}
                        />
                        <span>No</span>
                      </label>
                    </div>
                    
                    {/* Medication Details Field */}
                    {q.key === 'medications72h' && medicalAnswers[q.key] === true && (
                      <div className="medication-details">
                        <label>
                          Please specify the medication(s) given: <span className="required-asterisk">*</span>
                        </label>
                        <textarea
                          className="medication-textarea"
                          placeholder="e.g., Antibiotics, Pain medication, etc."
                          value={medicationDetails}
                          onChange={(e) => setMedicationDetails(e.target.value)}
                          rows={3}
                        />
                        <p className="medication-hint">
                          Include medication names, dosage, and when it was given
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Additional Notes */}
              <div className="additional-notes">
                <label>Additional Notes (Optional)</label>
                <textarea
                  className="notes-textarea"
                  placeholder="Any specific concerns or information you'd like to share..."
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  rows={4}
                />
              </div>
            </div>

            <div className="action-buttons-row">
              <button className="btn-secondary" onClick={handleBack}>
                Back
              </button>
              <button 
                className="btn-primary"
                onClick={handleContinue}
                disabled={
                  medicalAnswers.medications72h === null || 
                  medicalAnswers.fleaPrevention === null || 
                  medicalAnswers.catVaccinations === null || 
                  medicalAnswers.notPregnant === null ||
                  (medicalAnswers.medications72h === true && !medicationDetails.trim())
                }
              >
                Proceed
              </button>
            </div>
          </div>
        )}

        {/* Step 6 - Medical Info (for grooming) OR Confirmation (for non-grooming) */}
        {step === 6 && hasGrooming && (
          <div className="step-content">
            <div className="medical-questionnaire">
              <div className="required-info-banner">
                <IoInformationCircleOutline size={24} color="#ee3d5a" />
                <p>
                  <strong>Required:</strong> All medical questions must be answered before proceeding.
                </p>
              </div>
              
              <div className="questions-list">
                {medicalQuestions.map((q) => (
                  <div key={q.id} className="question-item">
                    <div className="question-header">
                      <h4>{q.question}<span className="required-asterisk">*</span></h4>
                    </div>
                    
                    <div className="question-options">
                      <label className="radio-label">
                        <input 
                          type="radio"
                          name={q.key}
                          checked={medicalAnswers[q.key as keyof MedicalAnswers] === true}
                          onChange={() => {
                            handleMedicalAnswer(q.key, true);
                            if (q.key === 'medications72h' && medicalAnswers[q.key] === true) {
                              setMedicationDetails('');
                            }
                          }}
                        />
                        <span>Yes</span>
                      </label>
                      
                      <label className="radio-label">
                        <input 
                          type="radio"
                          name={q.key}
                          checked={medicalAnswers[q.key as keyof MedicalAnswers] === false}
                          onChange={() => {
                            handleMedicalAnswer(q.key, false);
                            if (q.key === 'medications72h') {
                              setMedicationDetails('');
                            }
                          }}
                        />
                        <span>No</span>
                      </label>
                    </div>
                    
                    {/* Medication Details Field */}
                    {q.key === 'medications72h' && medicalAnswers[q.key] === true && (
                      <div className="medication-details">
                        <label>
                          Please specify the medication(s) given: <span className="required-asterisk">*</span>
                        </label>
                        <textarea
                          className="medication-textarea"
                          placeholder="e.g., Antibiotics, Pain medication, etc."
                          value={medicationDetails}
                          onChange={(e) => setMedicationDetails(e.target.value)}
                          rows={3}
                        />
                        <p className="medication-hint">
                          Include medication names, dosage, and when it was given
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Additional Notes */}
              <div className="additional-notes">
                <label>Additional Notes (Optional)</label>
                <textarea
                  className="notes-textarea"
                  placeholder="Any specific concerns or information you'd like to share..."
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  rows={4}
                />
              </div>
            </div>

            <div className="action-buttons-row">
              <button className="btn-secondary" onClick={handleBack}>
                Back
              </button>
              <button 
                className="btn-primary"
                onClick={handleContinue}
                disabled={
                  medicalAnswers.medications72h === null || 
                  medicalAnswers.fleaPrevention === null || 
                  medicalAnswers.catVaccinations === null || 
                  medicalAnswers.notPregnant === null ||
                  (medicalAnswers.medications72h === true && !medicationDetails.trim())
                }
              >
                Proceed
              </button>
            </div>
          </div>
        )}

        {step === 6 && !hasGrooming && (
          <div className="step-content">
            <div className="confirmation-details">
              {/* Owner Details Card */}
              <div className="confirmation-card">
                <div className="card-header">
                  <IoPersonCircleOutline size={27} color="#3d67ee" />
                  <h3>Owner Details</h3>
                </div>
                
                <div className="card-details">
                  <div className="detail-row">
                    <span className="detail-label">Full Name</span>
                    <span className="detail-value">{displayName}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Email</span>
                    <span className="detail-value">{currentUser?.email || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Phone</span>
                    <span className="detail-value">{currentUser?.contactnumber || currentUser?.contactNumber || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Address</span>
                    <span className="detail-value">{currentUser?.address || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Pet Details Card */}
              {selectedPet && (
                <div className="confirmation-card">
                  <div className="card-header">
                    <IoPawOutline size={22} color="#3d67ee" />
                    <h3>Pet Details</h3>
                  </div>
                  
                  <div className="pet-details-row">
                    <img 
                      src={selectedPet.image} 
                      alt={selectedPet.name}
                      className="pet-detail-image"
                    />
                    <div className="pet-detail-info">
                      <div className="detail-row">
                        <span className="detail-label">Pet Name</span>
                        <span className="detail-value">{selectedPet.name}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Species</span>
                        <span className="detail-value">{selectedPet.species}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Gender</span>
                        <span className="detail-value">{selectedPet.gender}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Breed</span>
                        <span className="detail-value">{selectedPet.breed}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Medical Information Card */}
              <div className="confirmation-card">
                <div className="card-header">
                  <IoMedicalOutline size={22} color="#3d67ee" />
                  <h3>Medical Information</h3>
                </div>
                
                <div className="card-details">
                  <div className="detail-row">
                    <span className="detail-label">Medications (72h)</span>
                    <span className="detail-value">
                      {medicalAnswers.medications72h ? 'Yes' : 'No'}
                      {medicalAnswers.medications72h && medicationDetails && ` - ${medicationDetails}`}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Flea/Tick Prevention</span>
                    <span className="detail-value">{medicalAnswers.fleaPrevention ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Cat Vaccinations</span>
                    <span className="detail-value">{medicalAnswers.catVaccinations ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Not Pregnant</span>
                    <span className="detail-value">{medicalAnswers.notPregnant ? 'Yes' : 'No'}</span>
                  </div>
                  
                  {additionalNotes && (
                    <>
                      <div className="detail-divider" />
                      <div className="detail-row">
                        <span className="detail-label">Additional Notes</span>
                        <span className="detail-value">{additionalNotes}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Appointment Details Card */}
              {selectedServices.length > 0 && selectedDate && selectedTime && (
                <div className="confirmation-card">
                  <div className="card-header">
                    <IoCalendarOutline size={22} color="#3d67ee" />
                    <h3>Appointment Details</h3>
                  </div>
                  
                  <div className="card-details">
                    <div className="detail-row">
                      <span className="detail-label">Services</span>
                      <div className="service-list">
                        {selectedServices.map((service, index) => (
                          <div key={index} className="service-main-item">{service.name}</div>
                        ))}
                        {selectedGroomingOptions.map((option) => (
                          <div key={option.id} className="service-subitem">• {option.name}</div>
                        ))}
                        {selectedLabOptions.map((option) => (
                          <div key={option.id} className="service-subitem">• {option.name}</div>
                        ))}
                      </div>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Date</span>
                      <span className="detail-value">{formatSelectedDate()}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Time</span>
                      <span className="detail-value">{selectedTime}</span>
                    </div>
                    
                    <div className="detail-divider" />
                    
                    <div className="detail-row">
                      <span className="detail-label">Branch</span>
                      <span className="detail-value">{selectedBranch?.name}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Address</span>
                      <span className="detail-value">{selectedBranch?.address}</span>
                    </div>
                    
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
              <button className="btn-secondary" onClick={handleBack}>
                Back
              </button>
              <button className="btn-primary" onClick={handleContinue}>
                Confirm Booking
              </button>
            </div>
          </div>
        )}

        {/* Step 7 - Confirmation (for grooming) */}
        {step === 7 && hasGrooming && (
          <div className="step-content">
            <div className="confirmation-details">
              {/* Owner Details Card */}
              <div className="confirmation-card">
                <div className="card-header">
                  <IoPersonCircleOutline size={27} color="#3d67ee" />
                  <h3>Owner Details</h3>
                </div>
                
                <div className="card-details">
                  <div className="detail-row">
                    <span className="detail-label">Full Name</span>
                    <span className="detail-value">{displayName}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Email</span>
                    <span className="detail-value">{currentUser?.email || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Phone</span>
                    <span className="detail-value">{currentUser?.contactnumber || currentUser?.contactNumber || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Address</span>
                    <span className="detail-value">{currentUser?.address || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Pet Details Card */}
              {selectedPet && (
                <div className="confirmation-card">
                  <div className="card-header">
                    <IoPawOutline size={22} color="#3d67ee" />
                    <h3>Pet Details</h3>
                  </div>
                  
                  <div className="pet-details-row">
                    <img 
                      src={selectedPet.image} 
                      alt={selectedPet.name}
                      className="pet-detail-image"
                    />
                    <div className="pet-detail-info">
                      <div className="detail-row">
                        <span className="detail-label">Pet Name</span>
                        <span className="detail-value">{selectedPet.name}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Species</span>
                        <span className="detail-value">{selectedPet.species}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Gender</span>
                        <span className="detail-value">{selectedPet.gender}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Breed</span>
                        <span className="detail-value">{selectedPet.breed}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Medical Information Card */}
              <div className="confirmation-card">
                <div className="card-header">
                  <IoMedicalOutline size={22} color="#3d67ee" />
                  <h3>Medical Information</h3>
                </div>
                
                <div className="card-details">
                  <div className="detail-row">
                    <span className="detail-label">Medications (72h)</span>
                    <span className="detail-value">
                      {medicalAnswers.medications72h ? 'Yes' : 'No'}
                      {medicalAnswers.medications72h && medicationDetails && ` - ${medicationDetails}`}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Flea/Tick Prevention</span>
                    <span className="detail-value">{medicalAnswers.fleaPrevention ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Cat Vaccinations</span>
                    <span className="detail-value">{medicalAnswers.catVaccinations ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Not Pregnant</span>
                    <span className="detail-value">{medicalAnswers.notPregnant ? 'Yes' : 'No'}</span>
                  </div>
                  
                  {additionalNotes && (
                    <>
                      <div className="detail-divider" />
                      <div className="detail-row">
                        <span className="detail-label">Additional Notes</span>
                        <span className="detail-value">{additionalNotes}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Grooming Preferences Card */}
              <div className="confirmation-card">
                <div className="card-header">
                  <IoCutOutline size={22} color="#3d67ee" />
                  <h3>Grooming Preferences</h3>
                </div>
                
                <div className="card-details">
                  <div className="detail-row">
                    <span className="detail-label">Haircut Style</span>
                    <span className="detail-value">{getSelectedHaircutStyleName()}</span>
                  </div>
                  
                  {selectedHaircutStyle === 'h6' && customHaircutDescription && (
                    <div className="detail-row">
                      <span className="detail-label">Custom Description</span>
                      <span className="detail-value">{customHaircutDescription}</span>
                    </div>
                  )}
                  
                  {haircutImage && (
                    <div className="detail-row">
                      <span className="detail-label">Reference Image</span>
                      <div className="detail-value">
                        <img 
                          src={haircutImage} 
                          alt="Haircut reference" 
                          className="reference-image-preview"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Appointment Details Card */}
              {selectedServices.length > 0 && selectedDate && selectedTime && (
                <div className="confirmation-card">
                  <div className="card-header">
                    <IoCalendarOutline size={22} color="#3d67ee" />
                    <h3>Appointment Details</h3>
                  </div>
                  
                  <div className="card-details">
                    <div className="detail-row">
                      <span className="detail-label">Services</span>
                      <div className="service-list">
                        {selectedServices.map((service, index) => (
                          <div key={index}>{service.name}</div>
                        ))}
                        {selectedGroomingOptions.map((option) => (
                          <div key={option.id} className="service-subitem">• {option.name}</div>
                        ))}
                        {selectedLabOptions.map((option) => (
                          <div key={option.id} className="service-subitem">• {option.name}</div>
                        ))}
                      </div>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Date</span>
                      <span className="detail-value">{formatSelectedDate()}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Time</span>
                      <span className="detail-value">{selectedTime}</span>
                    </div>
                    
                    <div className="detail-divider" />
                    
                    <div className="detail-row">
                      <span className="detail-label">Branch</span>
                      <span className="detail-value">{selectedBranch?.name}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Address</span>
                      <span className="detail-value">{selectedBranch?.address}</span>
                    </div>
                    
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
              <button className="btn-secondary" onClick={handleBack}>
                Back
              </button>
              <button className="btn-primary" onClick={handleContinue}>
                Confirm Booking
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserAppointmentBook;