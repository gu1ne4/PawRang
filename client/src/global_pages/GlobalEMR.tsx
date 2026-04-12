import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../reusable_components/NavBar';
import Notifications from '../reusable_components/Notifications';
import { HiOutlineClipboardDocumentList } from "react-icons/hi2";
import { ImLab } from "react-icons/im";
import { CiMedicalClipboard } from "react-icons/ci";
import { FaEye } from "react-icons/fa";
import { TbReportMedical } from "react-icons/tb";
import RichTextEditor from '../reusable_components/RichTextEditor';
import { FaFilePdf } from "react-icons/fa6";

import './GlobalEMR.css';
import './GlobalEMR2.css';

import { pdf } from '@react-pdf/renderer';
import MedicalRecordPDF from './pdf_generation/MedicalRecordPDF';
import PrescriptionPDF from './pdf_generation/PrescriptionPDF';

import { 
  IoSearchSharp,
  IoFilterSharp,
  IoAdd,
  IoTrashOutline,
  IoCheckmarkCircleOutline,
  IoCloseCircleOutline,
  IoAlertCircleOutline,
  IoArrowBackOutline,
  IoEyeOutline,
  IoCloseOutline,
  IoPawOutline,
  IoMedicalOutline,
  IoDocumentTextOutline,
  IoRefreshOutline,
  IoMaleFemaleOutline,
  IoTimeOutline,
  IoAddCircleOutline,
  IoCreateOutline,
  IoWarningOutline,
  IoListOutline,
  IoCloudUploadOutline,
  IoTrashBinOutline,
  IoImageOutline,
  IoMedkitOutline,
  IoCalendarOutline,
  IoTimeSharp,
  IoReceipt,
  IoChevronUpOutline,
  IoChevronDownOutline
} from 'react-icons/io5';

interface MedicalRecord {
  id?: number;
  pk?: number;
  patientId: string;
  petName: string;
  ownerName: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerEmail: string;
  ownerContact: string;
  lastVisit: string;
  veterinarian: string;
  reason: string;
  deceased?: boolean;
  visitHistory?: VisitHistory[];
  petDetails?: PetDetails;
}

interface GlobalEMRProps {
  autoOpenAddMode?: boolean;
}

interface LabResult {
  id: string;
  testType: string;
  fileName: string;
  fileUrl: string;
  fileData?: string;
  interpretation: string;
}

interface Prescription {
  id: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  prescribedDate: string;
  instructions?: string;
}

interface VisitHistory {
  id: string;
  date: string;
  time: string;
  veterinarian: string;
  reason: string;
  doctorRemarks: string;
  weight: number;
  weightUnit: 'kg' | 'lbs';
  sameAsLastWeight?: boolean;
  neutered?: boolean;
  vaccinated?: boolean;
  deceased?: boolean;
  clinicalExam?: {
    length: number;
    lengthUnit: 'cm' | 'inches';
    temperature: number;
    tempUnit: 'C' | 'F';
    heartRate: string;
    breathingRate: string;
    additionalFindings: string;
  };
  labResults?: LabResult[];
  prescriptions?: Prescription[];
  selectedServices?: ServiceItem[];
  appointmentId?: string;
  vaccinationDetails?: VaccinationDetails;
}

interface PetDetails {
  name: string;
  breed: string;
  species: 'Dog' | 'Cat';
  gender: 'Male' | 'Female';
  dateOfBirth: string;
  age: string;
  weight: number;
  weightUnit: 'kg' | 'lbs';
  colorMarkings: string;
  neutered: boolean;
  deceased: boolean;
  vaccinated: boolean;
  vaccinationProof?: string;
  image?: string;
  doctorRemarks: string;
  doctorAssigned: string;
  reasonForVisit: string;
  reasonOther?: string;
}

interface CurrentUser {
  id?: number;
  pk?: number;
  username: string;
  fullName?: string;
  role: string;
  userImage?: string;
}

interface ModalConfig {
  type: 'info' | 'success' | 'error' | 'confirm';
  title: string;
  message: React.ReactNode;
  onConfirm?: () => void;
  showCancel: boolean;
}

interface FormErrors {
  patientId?: string;
  petName?: string;
  ownerFirstName?: string;
  ownerLastName?: string;
  ownerEmail?: string;
  ownerContact?: string;
  veterinarian?: string;
  reason?: string;
}

interface SearchResult {
  id: number;
  petName: string;
  ownerName: string;
  ownerUsername?: string;
  species: string;
  breed: string;
  ownerEmail: string;
  ownerContact: string;
  gender: string;
  dateOfBirth: string;
  colorMarkings: string;
  neutered: boolean;
  vaccinated: boolean;
  vaccinationProof?: string;
  image?: string;
  hasExistingRecord?: boolean;
  existingRecordId?: number;
  deceased?: boolean;
}

interface MedicationTemplate {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface AppointmentRecord {
  id: string;
  date: string;
  time: string;
  veterinarian: string;
  reason: string;
  services: ServiceItem[];
  status: 'scheduled' | 'completed' | 'cancelled';
}

interface VaccinationDetails {
  vaccineName: string;
  doseVolume: string;
  injectionSite: string;
  manufacturer: string;
  dateAdministered: string;
  nextDueDate: string;
}

interface ServiceItem {
  id: string;
  name: string;
  price: number;
  description?: string;
}

type ViewMode = 'list' | 'add' | 'edit';
type Species = 'Dog' | 'Cat';
type Gender = 'Male' | 'Female';

const API_URL = 'http://localhost:3000';
const DOG_BREEDS = [
  'Labrador Retriever', 'German Shepherd', 'Golden Retriever', 'Bulldog', 
  'Beagle', 'Poodle', 'Rottweiler', 'Yorkshire Terrier', 'Boxer', 
  'Siberian Husky', 'Dachshund', 'Great Dane', 'Shih Tzu', 'Mixed Breed',
  'N/A', 'Others'
];
const CAT_BREEDS = [
  'Persian', 'Maine Coon', 'Siamese', 'Ragdoll', 'Bengal', 
  'Sphynx', 'British Shorthair', 'Abyssinian', 'Scottish Fold', 
  'Birman', 'Burmese', 'Mixed Breed',
  'N/A', 'Others'
];
const REASONS = [
  'Checkup or Consultation', 'Vaccination', 'Surgery', 'Dental Cleaning', 'Grooming', 'Emergency', 'Laboratory'
];
const LAB_TEST_TYPES = [
  'Complete Blood Count (CBC)',
  'Blood Chemistry',
  'Urinalysis',
  'Fecal Examination',
  'Skin Scraping',
  'Radiology/X-Ray',
  'Ultrasound',
  'Biopsy',
  'Microbiology/Culture',
  'Parasitology',
  'Allergy Testing',
  'Other'
];
const VETERINARIANS = ['Dr. Sarah Johnson', 'Dr. Michael Chen', 'Dr. Emily Rodriguez', 'Dr. James Wilson'];

const AVAILABLE_SERVICES: ServiceItem[] = [
  { id: 's1', name: 'Consultation', price: 0, description: 'Standard veterinary consultation' },
  { id: 's2', name: 'Vaccination', price: 0, description: 'Annual vaccination' },
  { id: 's3', name: 'Laboratory Test', price: 0, description: 'Blood work and lab tests' },
  { id: 's4', name: 'X-Ray', price: 0, description: 'Radiology services' },
  { id: 's5', name: 'Ultrasound', price: 0, description: 'Ultrasound examination' },
  { id: 's6', name: 'Surgery', price: 0, description: 'Surgical procedure' },
  { id: 's7', name: 'Dental Cleaning', price: 0, description: 'Professional dental cleaning' },
  { id: 's8', name: 'Grooming', price: 0, description: 'Basic grooming services' },
];

// Mock appointment data
const MOCK_APPOINTMENTS: AppointmentRecord[] = [
  {
    id: 'app1',
    date: '2024-03-25',
    time: '10:00 AM',
    veterinarian: 'Dr. Sarah Johnson',
    reason: 'Routine Checkup',
    services: [{ id: 's1', name: 'Consultation', price: 500 }],
    status: 'scheduled'
  },
  {
    id: 'app2',
    date: '2024-03-28',
    time: '2:30 PM',
    veterinarian: 'Dr. Michael Chen',
    reason: 'Vaccination',
    services: [
      { id: 's1', name: 'Consultation', price: 500 },
      { id: 's2', name: 'Vaccination', price: 800 }
    ],
    status: 'scheduled'
  },
  {
    id: 'app3',
    date: '2024-04-02',
    time: '11:15 AM',
    veterinarian: 'Dr. Emily Rodriguez',
    reason: 'Follow-up',
    services: [{ id: 's1', name: 'Consultation', price: 500 }],
    status: 'scheduled'
  }
];

// Medication templates database with "Other" option
const MEDICATION_TEMPLATES: MedicationTemplate[] = [
  { id: 'other', name: 'Other', dosage: '', frequency: '', duration: '', instructions: '' },
  { id: '1', name: 'Amoxicillin', dosage: '250mg', frequency: 'Twice daily', duration: '7 days', instructions: '' },
  { id: '2', name: 'Amoxicillin', dosage: '500mg', frequency: 'Twice daily', duration: '7 days', instructions: '' },
  { id: '3', name: 'Amoxicillin', dosage: '125mg/5mL', frequency: 'Twice daily', duration: '7-10 days', instructions: '' },
  { id: '4', name: 'Metronidazole', dosage: '100mg', frequency: 'Twice daily', duration: '5-7 days', instructions: '' },
  { id: '5', name: 'Metronidazole', dosage: '250mg', frequency: 'Twice daily', duration: '5-7 days', instructions: '' },
  { id: '6', name: 'Enrofloxacin', dosage: '5mg/kg', frequency: 'Once daily', duration: '7-10 days', instructions: '' },
  { id: '7', name: 'Enrofloxacin', dosage: '10mg/kg', frequency: 'Once daily', duration: '7-10 days', instructions: '' },
  { id: '8', name: 'Meloxicam', dosage: '0.1mg/kg', frequency: 'Once daily', duration: '3-5 days', instructions: '' },
  { id: '9', name: 'Carprofen', dosage: '2mg/kg', frequency: 'Twice daily', duration: '5-7 days', instructions: '' },
  { id: '10', name: 'Prednisolone', dosage: '0.5mg/kg', frequency: 'Once daily', duration: '5-10 days', instructions: '' },
  { id: '11', name: 'Cephalexin', dosage: '10-15mg/kg', frequency: 'Twice daily', duration: '7-14 days', instructions: '' },
  { id: '12', name: 'Doxycycline', dosage: '5mg/kg', frequency: 'Twice daily', duration: '14 days', instructions: '' },
  { id: '13', name: 'Clindamycin', dosage: '5mg/kg', frequency: 'Twice daily', duration: '10-14 days', instructions: '' },
  { id: '14', name: 'Fenbendazole', dosage: '50mg/kg', frequency: 'Once daily', duration: '3 days', instructions: '' },
  { id: '15', name: 'Praziquantel', dosage: '5mg/kg', frequency: 'Once', duration: 'Single dose', instructions: '' },
  { id: '16', name: 'Fipronil', dosage: 'Spot-on', frequency: 'Monthly', duration: '1 month', instructions: '' },
  { id: '17', name: 'Ivermectin', dosage: '0.2mg/kg', frequency: 'Once monthly', duration: 'Monthly', instructions: '' },
  { id: '18', name: 'Gabapentin', dosage: '5-10mg/kg', frequency: 'Every 8-12 hours', duration: 'As needed', instructions: '' },
  { id: '19', name: 'Tramadol', dosage: '2-5mg/kg', frequency: 'Every 8-12 hours', duration: 'As needed', instructions: '' },
  { id: '20', name: 'Omeprazole', dosage: '0.7-1mg/kg', frequency: 'Once daily', duration: '14-28 days', instructions: '' },
];

// Mock data for pet search
const MOCK_PET_DATABASE: SearchResult[] = [
  {
    id: 1,
    petName: 'Max',
    ownerName: 'John Doe',
    ownerUsername: 'johndoe',
    species: 'Dog',
    breed: 'Labrador Retriever',
    ownerEmail: 'john.doe@email.com',
    ownerContact: '09123456789',
    gender: 'Male',
    dateOfBirth: '2020-05-15',
    colorMarkings: 'Golden brown',
    neutered: true,
    vaccinated: true,
    vaccinationProof: 'https://example.com/vax-proof-max.pdf',
    image: 'https://via.placeholder.com/150/3d67ee/ffffff?text=Max',
    hasExistingRecord: true,
    existingRecordId: 1,
    deceased: false
  },
  {
    id: 2,
    petName: 'Luna',
    ownerName: 'Jane Smith',
    ownerUsername: 'janesmith',
    species: 'Cat',
    breed: 'Persian',
    ownerEmail: 'jane.smith@email.com',
    ownerContact: '09876543210',
    gender: 'Female',
    dateOfBirth: '2021-03-22',
    colorMarkings: 'White with gray patches',
    neutered: true,
    vaccinated: true,
    vaccinationProof: 'https://example.com/vax-proof-luna.pdf',
    image: 'https://via.placeholder.com/150/ec489a/ffffff?text=Luna',
    hasExistingRecord: true,
    existingRecordId: 2,
    deceased: false
  },
  {
    id: 3,
    petName: 'Charlie',
    ownerName: 'Robert Brown',
    ownerUsername: 'robertb',
    species: 'Dog',
    breed: 'Golden Retriever',
    ownerEmail: 'robert.brown@email.com',
    ownerContact: '09123456788',
    gender: 'Male',
    dateOfBirth: '2019-11-08',
    colorMarkings: 'Golden',
    neutered: false,
    vaccinated: false,
    image: 'https://via.placeholder.com/150/f39c12/ffffff?text=Charlie',
    hasExistingRecord: true,
    existingRecordId: 3,
    deceased: false
  },
  {
    id: 4,
    petName: 'Bella',
    ownerName: 'Maria Garcia',
    ownerUsername: 'mariag',
    species: 'Cat',
    breed: 'Siamese',
    ownerEmail: 'maria.garcia@email.com',
    ownerContact: '09234567890',
    gender: 'Female',
    dateOfBirth: '2022-01-10',
    colorMarkings: 'Cream with dark points',
    neutered: true,
    vaccinated: true,
    vaccinationProof: 'https://example.com/vax-proof-bella.pdf',
    image: 'https://www.freepik.com/free-photos-vectors/happy-pets',
    hasExistingRecord: false,
    deceased: false
  },
  {
    id: 5,
    petName: 'Rocky',
    ownerName: 'James Wilson',
    ownerUsername: 'jamesw',
    species: 'Dog',
    breed: 'Bulldog',
    ownerEmail: 'james.wilson@email.com',
    ownerContact: '09345678901',
    gender: 'Male',
    dateOfBirth: '2020-08-20',
    colorMarkings: 'Brindle',
    neutered: true,
    vaccinated: true,
    vaccinationProof: 'https://example.com/vax-proof-rocky.pdf',
    image: 'https://via.placeholder.com/150/e67e22/ffffff?text=Rocky',
    hasExistingRecord: false,
    deceased: false
  },
  {
    id: 6,
    petName: 'Mochi',
    ownerName: 'Sarah Lee',
    ownerUsername: 'sarahlee',
    species: 'Cat',
    breed: 'Ragdoll',
    ownerEmail: 'sarah.lee@email.com',
    ownerContact: '09456789012',
    gender: 'Female',
    dateOfBirth: '2021-12-03',
    colorMarkings: 'Seal point',
    neutered: false,
    vaccinated: false,
    image: 'https://via.placeholder.com/150/95a5a6/ffffff?text=Mochi',
    hasExistingRecord: false,
    deceased: false
  }
];

const MOCK_RECORDS: MedicalRecord[] = [
  {
    id: 1,
    patientId: 'PET-001',
    petName: 'Max',
    ownerName: 'John Doe',
    ownerFirstName: 'John',
    ownerLastName: 'Doe',
    ownerEmail: 'john.doe@email.com',
    ownerContact: '09123456789',
    lastVisit: '03/20/2024',
    veterinarian: 'Dr. Sarah Johnson',
    reason: 'Routine Checkup',
    deceased: false,
    visitHistory: [
      {
        id: 'v1',
        date: '03/20/2024',
        time: '10:30 AM',
        veterinarian: 'Dr. Sarah Johnson',
        reason: 'Routine Checkup',
        doctorRemarks: 'Healthy pet, regular checkup',
        weight: 25.5,
        weightUnit: 'kg',
        clinicalExam: {
          length: 65,
          lengthUnit: 'cm',
          temperature: 38.5,
          tempUnit: 'C',
          heartRate: '80-120',
          breathingRate: '15-30',
          additionalFindings: 'No abnormalities detected'
        }
      }
    ],
    petDetails: {
      name: 'Max',
      breed: 'Labrador Retriever',
      species: 'Dog',
      gender: 'Male',
      dateOfBirth: '2020-05-15',
      age: '4 years',
      weight: 25.5,
      weightUnit: 'kg',
      colorMarkings: 'Golden brown',
      neutered: true,
      deceased: false,
      vaccinated: true,
      doctorRemarks: '',
      doctorAssigned: 'Dr. Sarah Johnson',
      reasonForVisit: 'Routine Checkup'
    }
  },
  {
    id: 2,
    patientId: 'PET-002',
    petName: 'Luna',
    ownerName: 'Jane Smith',
    ownerFirstName: 'Jane',
    ownerLastName: 'Smith',
    ownerEmail: 'jane.smith@email.com',
    ownerContact: '09876543210',
    lastVisit: '03/18/2024',
    veterinarian: 'Dr. Michael Chen',
    reason: 'Vaccination',
    deceased: false,
    visitHistory: [
      {
        id: 'v1',
        date: '03/18/2024',
        time: '2:15 PM',
        veterinarian: 'Dr. Michael Chen',
        reason: 'Vaccination',
        doctorRemarks: 'Annual vaccination administered',
        weight: 4.2,
        weightUnit: 'kg'
      }
    ],
    petDetails: {
      name: 'Luna',
      breed: 'Persian',
      species: 'Cat',
      gender: 'Female',
      dateOfBirth: '2021-03-22',
      age: '3 years',
      weight: 4.2,
      weightUnit: 'kg',
      colorMarkings: 'White with gray patches',
      neutered: true,
      deceased: false,
      vaccinated: true,
      doctorRemarks: '',
      doctorAssigned: 'Dr. Michael Chen',
      reasonForVisit: 'Vaccination'
    }
  }
];


const GlobalEMR: React.FC<GlobalEMRProps> = ({ autoOpenAddMode = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { autoOpenAddMode?: boolean } | null;

  // State
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Medication Modal States
  const [showMedicationModal, setShowMedicationModal] = useState<boolean>(false);
  const [medicationSearchQuery, setMedicationSearchQuery] = useState<string>('');
  const [filteredMedications, setFilteredMedications] = useState<MedicationTemplate[]>(MEDICATION_TEMPLATES);

  const [showLabPanel, setShowLabPanel] = useState<boolean>(false);
  
  // Appointment/Walk-in States
  const [visitType, setVisitType] = useState<'appointment' | 'walkin'>('walkin');
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentRecord | null>(null);
  const [appointmentRecords, setAppointmentRecords] = useState<AppointmentRecord[]>([]);
  const [selectedServices, setSelectedServices] = useState<ServiceItem[]>([]);
  const [showServicesPanel, setShowServicesPanel] = useState<boolean>(false);
  
  // UI State
  const [searchVisible, setSearchVisible] = useState<boolean>(false);
  const [filterVisible, setFilterVisible] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchHovered, setSearchHovered] = useState<boolean>(false);
  const [filterHovered, setFilterHovered] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedRecords, setSelectedRecords] = useState<Set<number>>(new Set());
  const [activeFilter, setActiveFilter] = useState<string>('');
  const [showPetSearch, setShowPetSearch] = useState<boolean>(false);
  const [petSearchQuery, setPetSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>(MOCK_PET_DATABASE);
  const [showVaccinationProof, setShowVaccinationProof] = useState<boolean>(false);
  const [selectedVaccinationProof, setSelectedVaccinationProof] = useState<string>('');
  const [editModeEnabled, setEditModeEnabled] = useState<boolean>(false);
  const [showAddVisit, setShowAddVisit] = useState<boolean>(false);
  const [visitSearchQuery, setVisitSearchQuery] = useState<string>('');
  const [visitDateFilter, setVisitDateFilter] = useState<string>('');
  const [visitDoctorFilter, setVisitDoctorFilter] = useState<string>('');
  const [petStatusFilter, setPetStatusFilter] = useState<string>('all');
  const [showModeOverlay, setShowModeOverlay] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'info' | 'visits' | 'medicalHistory'>('info');
  const [petImage, setPetImage] = useState<string>('');
  const [petImageFile, setPetImageFile] = useState<File | null>(null);
  const [lastWeight, setLastWeight] = useState<{ value: number; unit: 'kg' | 'lbs' } | null>(null);
  const [showPrescriptionPanel, setShowPrescriptionPanel] = useState<boolean>(false);
  const [expandedVisitId, setExpandedVisitId] = useState<string | null>(null);
  
  const [newVisit, setNewVisit] = useState<VisitHistory>({
    id: '',
    date: '',
    time: '',
    veterinarian: VETERINARIANS[0],
    reason: REASONS[0],
    doctorRemarks: '',
    weight: 0,
    weightUnit: 'kg',
    sameAsLastWeight: false,
    neutered: false,
    vaccinated: false,
    deceased: false,
    clinicalExam: {
      length: 0,
      lengthUnit: 'cm',
      temperature: 0,
      tempUnit: 'C',
      heartRate: '',
      breathingRate: '',
      additionalFindings: ''
    },
    labResults: [],
    prescriptions: [],
    selectedServices: []
  });

  // Modal States
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [modalConfig, setModalConfig] = useState<ModalConfig>({
    type: 'info',
    title: '',
    message: '',
    showCancel: false
  });

  // Filter States
  const [dateFilter, setDateFilter] = useState<string>('');
  const [doctorFilter, setDoctorFilter] = useState<string>('');

  // Pagination
  const [page, setPage] = useState<number>(0);
  const itemsPerPage = 10;

  // Form States
  const [editingId, setEditingId] = useState<number | null>(null);
  const [patientId, setPatientId] = useState<string>('');
  const [petName, setPetName] = useState<string>('');
  const [species, setSpecies] = useState<Species>('Dog');
  const [breed, setBreed] = useState<string>('');
  const [breedOther, setBreedOther] = useState<string>('');
  const [gender, setGender] = useState<Gender>('Male');
  const [dateOfBirth, setDateOfBirth] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [weight, setWeight] = useState<string>('');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [colorMarkings, setColorMarkings] = useState<string>('');
  const [neutered, setNeutered] = useState<boolean>(false);
  const [deceased, setDeceased] = useState<boolean>(false);
  const [vaccinated, setVaccinated] = useState<boolean>(false);
  const [vaccinationProof, setVaccinationProof] = useState<string>('');
  const [doctorRemarks, setDoctorRemarks] = useState<string>('');
  const [doctorAssigned, setDoctorAssigned] = useState<string>(VETERINARIANS[0]);
  const [reasonForVisit, setReasonForVisit] = useState<string>(REASONS[0]);
  const [reasonOther, setReasonOther] = useState<string>('');
  const [visitHistory, setVisitHistory] = useState<VisitHistory[]>([]);
  
  // Owner Details
  const [ownerFirstName, setOwnerFirstName] = useState<string>('');
  const [ownerLastName, setOwnerLastName] = useState<string>('');
  const [ownerEmail, setOwnerEmail] = useState<string>('');
  const [ownerContact, setOwnerContact] = useState<string>('');

  // Medical History Filter States
  const [medicalHistoryFilter, setMedicalHistoryFilter] = useState<'all' | 'lab' | 'prescription' | 'vaccination'>('all');
  const [medicalHistorySearch, setMedicalHistorySearch] = useState<string>('');

  // Vaccination Details State
  const [showVaccinationDetails, setShowVaccinationDetails] = useState<boolean>(false);
  const [vaccinationDetails, setVaccinationDetails] = useState<VaccinationDetails>({
    vaccineName: '',
    doseVolume: '',
    injectionSite: '',
    manufacturer: '',
    dateAdministered: new Date().toISOString().split('T')[0],
    nextDueDate: ''
  });
    
  // Form Errors
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Helper functions
  const formatRate = (value: string): string => {
    const cleaned = value.replace(/[^\d-]/g, '');
    if (cleaned.match(/^\d+-\d+$/)) return cleaned;
    if (cleaned.match(/^\d+$/)) return `${cleaned}-${cleaned}`;
    return cleaned;
  };

  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setPetImage(reader.result as string);
      setPetImageFile(file);
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (labId: string, file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      updateLabResult(labId, 'fileName', file.name);
      updateLabResult(labId, 'fileData', reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const filterMedications = (query: string) => {
    setMedicationSearchQuery(query);
    if (!query.trim()) {
      // Keep "Other" at the top always
      const otherMed = MEDICATION_TEMPLATES.filter(m => m.id === 'other');
      const otherMeds = MEDICATION_TEMPLATES.filter(m => m.id !== 'other');
      setFilteredMedications([...otherMed, ...otherMeds]);
      return;
    }
    const filtered = MEDICATION_TEMPLATES.filter(med =>
      med.name.toLowerCase().includes(query.toLowerCase()) ||
      med.dosage.toLowerCase().includes(query.toLowerCase()) ||
      med.frequency.toLowerCase().includes(query.toLowerCase())
    );
    // Keep "Other" at the top if it matches or always show it
    const otherMed = filtered.find(m => m.id === 'other');
    const otherMeds = filtered.filter(m => m.id !== 'other');
    if (otherMed) {
      setFilteredMedications([otherMed, ...otherMeds]);
    } else {
      setFilteredMedications(otherMeds);
    }
  };

  const isVaccinationSelected = () => {
    const isReasonVaccination = newVisit.reason === 'Vaccination';
    const isServiceVaccination = selectedServices.some(service => service.name === 'Vaccination');
    return isReasonVaccination || isServiceVaccination;
  };

  const fetchAppointmentsForPet = async (petId: string) => {
    setAppointmentRecords(MOCK_APPOINTMENTS);
  };

  const toggleService = (service: ServiceItem) => {
    setSelectedServices(prev => {
      const exists = prev.find(s => s.id === service.id);
      if (exists) {
        return prev.filter(s => s.id !== service.id);
      } else {
        return [...prev, service];
      }
    });
  };

  const isLaboratorySelected = () => {
    const isReasonLaboratory = newVisit.reason === 'Laboratory';
    const isServiceLaboratory = selectedServices.some(service => service.name === 'Laboratory Test');
    return isReasonLaboratory || isServiceLaboratory;
  };

  const getTotalServicesPrice = () => {
    return selectedServices.reduce((total, service) => total + service.price, 0);
  };

  const addPrescriptionFromTemplate = (medication: MedicationTemplate) => {
    if (medication.id === 'other') {
      // Add empty prescription row for "Other"
      const newPrescription: Prescription = {
        id: Date.now().toString(),
        medicationName: '',
        dosage: '',
        frequency: '',
        duration: '',
        prescribedDate: new Date().toISOString().split('T')[0],
        instructions: ''
      };
      setNewVisit({
        ...newVisit,
        prescriptions: [...(newVisit.prescriptions || []), newPrescription]
      });
    } else {
      const newPrescription: Prescription = {
        id: Date.now().toString(),
        medicationName: medication.name,
        dosage: medication.dosage,
        frequency: medication.frequency,
        duration: medication.duration,
        prescribedDate: new Date().toISOString().split('T')[0],
        instructions: medication.instructions
      };
      setNewVisit({
        ...newVisit,
        prescriptions: [...(newVisit.prescriptions || []), newPrescription]
      });
    }
    setShowMedicationModal(false);
    setMedicationSearchQuery('');
  };

  const addPrescription = () => {
    setShowMedicationModal(true);
  };

  const updatePrescription = (id: string, field: keyof Prescription, value: string) => {
    setNewVisit({
      ...newVisit,
      prescriptions: newVisit.prescriptions?.map(pres => 
        pres.id === id ? { ...pres, [field]: value } : pres
      )
    });
  };

  const removePrescription = (id: string) => {
    setNewVisit({
      ...newVisit,
      prescriptions: newVisit.prescriptions?.filter(pres => pres.id !== id)
    });
  };

  const addLabResult = () => {
    const newLabResult: LabResult = {
      id: Date.now().toString(),
      testType: LAB_TEST_TYPES[0],
      fileName: '',
      fileUrl: '',
      fileData: '',
      interpretation: ''
    };
    setNewVisit({
      ...newVisit,
      labResults: [...(newVisit.labResults || []), newLabResult]
    });
  };

  const updateLabResult = (id: string, field: keyof LabResult, value: string) => {
    setNewVisit({
      ...newVisit,
      labResults: newVisit.labResults?.map(lab => 
        lab.id === id ? { ...lab, [field]: value } : lab
      )
    });
  };

  const removeLabResult = (id: string) => {
    setNewVisit({
      ...newVisit,
      labResults: newVisit.labResults?.filter(lab => lab.id !== id)
    });
  };

  const showAlert = (
    type: ModalConfig['type'], 
    title: string, 
    message: React.ReactNode,
    onConfirm?: () => void, 
    showCancel: boolean = false
  ) => {
    setModalConfig({ type, title, message, onConfirm, showCancel });
    setModalVisible(true);
  };

  const loadCurrentUser = async (): Promise<void> => {
    try {
      const session = localStorage.getItem('userSession');
      if (session) {
        const user = JSON.parse(session);
        setCurrentUser(user);
      }
    } catch (error) {
      console.log('Error loading user session', error);
    }
  };

  const fetchRecords = async (): Promise<void> => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      setRecords(MOCK_RECORDS);
    } catch (error) {
      console.error(error);
      showAlert('error', 'Error', 'Failed to fetch medical records.');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePDF = async () => {
    try {

      const pdfData = {
        petDetails: {
          name: petName,
          breed: breed === 'Others' ? breedOther : breed,
          species: species,
          gender: gender,
          dateOfBirth: dateOfBirth,
          age: age,
          weight: parseFloat(weight) || 0,
          weightUnit: weightUnit,
          colorMarkings: colorMarkings,
          neutered: neutered,
          deceased: deceased,
          vaccinated: vaccinated,
        },
        ownerName: `${ownerFirstName} ${ownerLastName}`,
        ownerEmail: ownerEmail,
        ownerContact: ownerContact,
        patientId: patientId,
        visitHistory: visitHistory,
      };

      const blob = await pdf(<MedicalRecordPDF {...pdfData} />).toBlob();
      
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 100);
      
      showAlert('success', 'Success', 'PDF opened in new tab!');
    } catch (error) {
      console.error('PDF generation error:', error);
      showAlert('error', 'Error', 'Failed to generate PDF. Please try again.');
    }
  };

  const handleViewPrescription = async (visit: VisitHistory) => {
    try {

      const validPrescriptions = (visit.prescriptions || []).filter(
        p => p.medicationName && p.medicationName.trim() !== ''
      );

      if (validPrescriptions.length === 0) {
        showAlert('error', 'No Prescription', 'This visit has no prescribed medications.');
        return;
      }

      const pdfData = {
        petName: petName,
        ownerName: `${ownerFirstName} ${ownerLastName}`,
        visitDate: `${visit.date} at ${visit.time}`,
        veterinarian: visit.veterinarian,
        prescriptions: validPrescriptions,
        doctorRemarks: visit.doctorRemarks ? stripHtmlForPDF(visit.doctorRemarks) : '',
      };


      const blob = await pdf(<PrescriptionPDF {...pdfData} />).toBlob();
      

      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Prescription PDF generation error:', error);
      showAlert('error', 'Error', 'Failed to generate prescription. Please try again.');
    }
  };


  const stripHtmlForPDF = (html: string): string => {
    if (!html) return '';
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  };

  const filterSearchResults = (query: string) => {
    if (!query.trim()) {
      setSearchResults(MOCK_PET_DATABASE);
      return;
    }
    const filtered = MOCK_PET_DATABASE.filter(result => 
      result.petName.toLowerCase().includes(query.toLowerCase()) ||
      result.ownerName.toLowerCase().includes(query.toLowerCase()) ||
      result.ownerUsername?.toLowerCase().includes(query.toLowerCase())
    );
    setSearchResults(filtered);
  };

  const handlePetSearchChange = (query: string) => {
    setPetSearchQuery(query);
    filterSearchResults(query);
  };

  const clearVisitFilters = () => {
    setVisitSearchQuery('');
    setVisitDateFilter('');
    setVisitDoctorFilter('');
  };

  const toggleVisitExpand = (visitId: string) => {
    if (expandedVisitId === visitId) {
      setExpandedVisitId(null);
    } else {
      setExpandedVisitId(visitId);
    }
  };

  const addNewVisit = () => {
    // Show confirmation dialog first
    showAlert(
      'confirm',
      'Confirm Add Visit',
      `Are you sure you want to add a new visit record for ${petName}?`,
      () => {
        // Proceed with adding the visit
        const now = new Date();
        
        let lastWeightValue = null;
        if (visitHistory.length > 0) {
          const lastVisit = visitHistory[visitHistory.length - 1];
          lastWeightValue = { value: lastVisit.weight, unit: lastVisit.weightUnit };
        }
        
        const finalWeight = newVisit.sameAsLastWeight && lastWeightValue 
          ? lastWeightValue.value 
          : parseFloat(newVisit.weight.toString()) || 0;
        const finalWeightUnit = newVisit.sameAsLastWeight && lastWeightValue 
          ? lastWeightValue.unit 
          : newVisit.weightUnit;
        
        const newVisitEntry: VisitHistory = {
          id: Date.now().toString(),
          date: visitType === 'appointment' && selectedAppointment 
            ? selectedAppointment.date 
            : now.toLocaleDateString(),
          time: visitType === 'appointment' && selectedAppointment 
            ? selectedAppointment.time 
            : now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          veterinarian: visitType === 'appointment' && selectedAppointment
            ? selectedAppointment.veterinarian
            : newVisit.veterinarian,
          reason: visitType === 'appointment' && selectedAppointment
            ? selectedAppointment.reason
            : newVisit.reason,
          doctorRemarks: newVisit.doctorRemarks,
          weight: finalWeight,
          weightUnit: finalWeightUnit,
          sameAsLastWeight: newVisit.sameAsLastWeight,
          neutered: newVisit.neutered,
          vaccinated: newVisit.vaccinated,
          deceased: newVisit.deceased,
          clinicalExam: newVisit.clinicalExam,
          labResults: newVisit.labResults,
          prescriptions: newVisit.prescriptions,
          selectedServices: selectedServices,
          appointmentId: selectedAppointment?.id,
          vaccinationDetails: isVaccinationSelected() && showVaccinationDetails ? vaccinationDetails : undefined
        };
        setVisitHistory([...visitHistory, newVisitEntry]);
        
        if (newVisit.neutered && !neutered) setNeutered(true);
        if (newVisit.vaccinated && !vaccinated) setVaccinated(true);
        if (newVisit.deceased && !deceased) setDeceased(true);
        
        setShowAddVisit(false);
        setShowPrescriptionPanel(false);
        setShowLabPanel(false);
        setShowServicesPanel(false);
        setSelectedServices([]);
        setSelectedAppointment(null);
        setVisitType('walkin');
        setShowVaccinationDetails(false);
        setVaccinationDetails({
          vaccineName: '',
          doseVolume: '',
          injectionSite: '',
          manufacturer: '',
          dateAdministered: new Date().toISOString().split('T')[0],
          nextDueDate: ''
        });
        setNewVisit({
          id: '',
          date: '',
          time: '',
          veterinarian: VETERINARIANS[0],
          reason: REASONS[0],
          doctorRemarks: '',
          weight: 0,
          weightUnit: 'kg',
          sameAsLastWeight: false,
          neutered: false,
          vaccinated: false,
          deceased: false,
          clinicalExam: {
            length: 0,
            lengthUnit: 'cm',
            temperature: 0,
            tempUnit: 'C',
            heartRate: '',
            breathingRate: '',
            additionalFindings: ''
          },
          labResults: [],
          prescriptions: [],
          selectedServices: []
        });
      },
      true  // Show cancel button
    );
  };

  const selectPet = (pet: SearchResult) => {
    if (pet.hasExistingRecord) {
      showAlert(
        'confirm',
        'Existing Medical Record Found',
        `${pet.petName} already has an existing medical record. Would you like to edit the existing record?`,
        () => {
          loadRecordForEdit(pet.existingRecordId || 0);
          setShowPetSearch(false);
          setPetSearchQuery('');
          setSearchResults(MOCK_PET_DATABASE);
        },
        true
      );
      return;
    }

    setPetName(pet.petName);
    setSpecies(pet.species as Species);
    setBreed(pet.breed);
    setGender(pet.gender as Gender);
    setDateOfBirth(pet.dateOfBirth);
    setAge(calculateAge(pet.dateOfBirth));
    setColorMarkings(pet.colorMarkings);
    setNeutered(pet.neutered);
    setVaccinated(pet.vaccinated);
    setVaccinationProof(pet.vaccinationProof || '');
    setDeceased(pet.deceased || false);
    setPetImage(pet.image || '');
    setOwnerFirstName(pet.ownerName.split(' ')[0]);
    setOwnerLastName(pet.ownerName.split(' ').slice(1).join(' '));
    setOwnerEmail(pet.ownerEmail);
    setOwnerContact(pet.ownerContact);
    setPatientId(`PET-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`);
    setShowPetSearch(false);
    setPetSearchQuery('');
    setSearchResults(MOCK_PET_DATABASE);
  };

  const loadRecordForEdit = (recordId: number) => {
    const record = records.find(r => r.id === recordId);
    if (record) {
      setEditingId(recordId);
      setPatientId(record.patientId);
      setPetName(record.petName);
      setOwnerFirstName(record.ownerFirstName);
      setOwnerLastName(record.ownerLastName);
      setOwnerEmail(record.ownerEmail);
      setOwnerContact(record.ownerContact);
      setDeceased(record.deceased || false);
      setVisitHistory(record.visitHistory || []);
      
      if (record.petDetails) {
        setSpecies(record.petDetails.species);
        setBreed(record.petDetails.breed);
        setGender(record.petDetails.gender);
        setDateOfBirth(record.petDetails.dateOfBirth);
        setAge(record.petDetails.age);
        setWeight(record.petDetails.weight.toString());
        setWeightUnit(record.petDetails.weightUnit);
        setColorMarkings(record.petDetails.colorMarkings);
        setNeutered(record.petDetails.neutered);
        setVaccinated(record.petDetails.vaccinated);
        setVaccinationProof(record.petDetails.vaccinationProof || '');
        setPetImage(record.petDetails.image || '');
        
        if (record.visitHistory && record.visitHistory.length > 0) {
          const lastVisit = record.visitHistory[record.visitHistory.length - 1];
          setLastWeight({ value: lastVisit.weight, unit: lastVisit.weightUnit });
        }
        
        // Fetch appointments for this pet
        fetchAppointmentsForPet(record.patientId);
      }
      
      setViewMode('edit');
      setEditModeEnabled(false);
      setShowModeOverlay(true);
      setActiveTab('info');
    }
  };

  const calculateAge = (dob: string): string => {
    if (!dob) return '';
    const birthDate = new Date(dob);
    const today = new Date();
    
    if (birthDate > today) return 'Invalid date';
    
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    let days = today.getDate() - birthDate.getDate();
    
    if (days < 0) {
      months--;
      const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days += lastMonth.getDate();
    }
    
    if (months < 0) {
      years--;
      months += 12;
    }
    
    if (years > 0) return `${years} year${years > 1 ? 's' : ''}`;
    else if (months > 0) return `${months} month${months > 1 ? 's' : ''}`;
    else if (days > 1) return `${days} days old`;
    else if (days === 1) return `1 day old`;
    else return 'Born today';
  };

  const handleDateOfBirthChange = (value: string) => {
    const today = new Date().toISOString().split('T')[0];
    if (value > today) {
      showAlert('error', 'Invalid Date', 'Date of birth cannot be in the future.');
      return;
    }
    setDateOfBirth(value);
    if (value) setAge(calculateAge(value));
    else setAge('');
  };

  const clearFilters = () => {
    setDateFilter('');
    setDoctorFilter('');
    setSearchQuery('');
    setActiveFilter('');
    setPetStatusFilter('all');
    setPage(0);
  };

  useEffect(() => {
    fetchRecords();
    loadCurrentUser();
  }, []);


  const resetForm = (): void => {
    setPatientId('');
    setPetName('');
    setSpecies('Dog');
    setBreed('');
    setBreedOther('');
    setGender('Male');
    setDateOfBirth('');
    setAge('');
    setWeight('');
    setWeightUnit('kg');
    setColorMarkings('');
    setNeutered(false);
    setDeceased(false);
    setVaccinated(false);
    setVaccinationProof('');
    setDoctorRemarks('');
    setDoctorAssigned(VETERINARIANS[0]);
    setReasonForVisit(REASONS[0]);
    setReasonOther('');
    setVisitHistory([]);
    setOwnerFirstName('');
    setOwnerLastName('');
    setOwnerEmail('');
    setOwnerContact('');
    setPetImage('');
    setPetImageFile(null);
    setEditingId(null);
    setFormErrors({});
    setEditModeEnabled(false);
    setShowModeOverlay(true);
    setActiveTab('info');
    setLastWeight(null);
    setExpandedVisitId(null);
    setSelectedServices([]);
    setSelectedAppointment(null);
    setVisitType('walkin');
    setShowVaccinationDetails(false);
    setVaccinationDetails({
      vaccineName: '',
      doseVolume: '',
      injectionSite: '',
      manufacturer: '',
      dateAdministered: new Date().toISOString().split('T')[0],
      nextDueDate: ''
    });
  };

  useEffect(() => {
    const shouldOpenAddMode = autoOpenAddMode || locationState?.autoOpenAddMode;
    if (shouldOpenAddMode) {
      const timer = setTimeout(() => {
        resetForm();
        setViewMode('add');
        setShowModeOverlay(true);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [autoOpenAddMode, locationState?.autoOpenAddMode]);

  // Filter Medical History tabs
useEffect(() => {
  const searchInput = document.getElementById('medicalHistorySearch') as HTMLInputElement;
  const filterChips = document.querySelectorAll('.emrFilterChip');
  
  const filterHistory = () => {
    const searchTerm = searchInput?.value.toLowerCase() || '';
    const activeFilter = document.querySelector('.emrFilterChipActive')?.getAttribute('data-filter') || 'all';
    
    const sections = document.querySelectorAll('.emrHistorySection');
    
    sections.forEach(section => {
      const category = section.getAttribute('data-category');
      let hasVisibleItems = false;
      
      // Filter by category
      if (activeFilter !== 'all' && category !== activeFilter) {
        (section as HTMLElement).style.display = 'none';
        return;
      } else {
        (section as HTMLElement).style.display = '';
      }
      
      // Filter by search term
      const cards = section.querySelectorAll('.emrHistoryCard');
      cards.forEach(card => {
        const cardText = card.textContent?.toLowerCase() || '';
        if (searchTerm === '' || cardText.includes(searchTerm)) {
          (card as HTMLElement).style.display = '';
          hasVisibleItems = true;
        } else {
          (card as HTMLElement).style.display = 'none';
        }
      });
      
      // Hide section if no visible items
      if (!hasVisibleItems && searchTerm !== '') {
        (section as HTMLElement).style.display = 'none';
      } else if (activeFilter === 'all' || category === activeFilter) {
        (section as HTMLElement).style.display = '';
      }
    });
  };
  
  // Add event listeners
  if (searchInput) {
    searchInput.addEventListener('input', filterHistory);
  }
  
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('emrFilterChipActive'));
      chip.classList.add('emrFilterChipActive');
      filterHistory();
    });
  });
  
  return () => {
    if (searchInput) {
      searchInput.removeEventListener('input', filterHistory);
    }
  };
}, [visitHistory]);

  const handleReturnToList = () => {
    clearFilters();
  };

  const handleLogoutPress = (): void => {
    showAlert('confirm', 'Log Out', 'Are you sure you want to log out?', async () => {
      try {
        if (currentUser && (currentUser.id || currentUser.pk)) {
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
      } catch (error) {
        console.log("Logout audit failed:", error);
      }

      localStorage.removeItem('userSession');
      navigate('/login');
    }, true);
  };

  const handleCreateInvoice = (visit: VisitHistory) => {
    console.log('Create invoice for visit:', visit);
    showAlert('info', 'Coming Soon', 'Invoice feature will be available soon.');
  };

  const handleCancel = (): void => {
    let hasUnsavedChanges = false;
    
    if (viewMode === 'add') {
      hasUnsavedChanges = !!(petName || ownerFirstName || ownerLastName);
    } else if (viewMode === 'edit') {
      hasUnsavedChanges = false;
    }

    if (hasUnsavedChanges) {
      showAlert('confirm', 'Unsaved Changes', 'You have unsaved changes. Are you sure you want to discard them?', () => {
        setViewMode('list');
        resetForm();
      }, true);
    } else {
      setViewMode('list');
      resetForm();
    }
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    
    if (!petName.trim()) errors.petName = 'Pet name is required';
    if (!ownerFirstName.trim()) errors.ownerFirstName = 'Owner first name is required';
    if (!ownerLastName.trim()) errors.ownerLastName = 'Owner last name is required';
    if (!ownerEmail.trim()) errors.ownerEmail = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(ownerEmail)) errors.ownerEmail = 'Email is invalid';
    if (!ownerContact.trim()) errors.ownerContact = 'Contact number is required';
    else if (!/^\d{11}$/.test(ownerContact.replace(/\D/g, ''))) errors.ownerContact = 'Contact number must be 11 digits';
    if (!doctorAssigned) errors.veterinarian = 'Veterinarian is required';
    if (!reasonForVisit) errors.reason = 'Reason for visit is required';
    
    setFormErrors(errors);
    return !Object.values(errors).some(error => error);
  };

  const handleSaveRecord = async (): Promise<void> => {
    if (!validateForm()) return;

    const finalBreed = breed === 'Others' ? breedOther : breed;

    const recordData = {
      patientId: patientId || `PET-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
      petName,
      ownerName: `${ownerFirstName} ${ownerLastName}`,
      ownerFirstName,
      ownerLastName,
      ownerEmail,
      ownerContact,
      lastVisit: new Date().toLocaleDateString(),
      veterinarian: doctorAssigned,
      reason: reasonForVisit === 'Others' ? reasonOther : reasonForVisit,
      deceased,
      visitHistory: viewMode === 'edit' ? visitHistory : [],
      petDetails: {
        name: petName,
        breed: finalBreed,
        species,
        gender,
        dateOfBirth,
        age,
        weight: parseFloat(weight),
        weightUnit,
        colorMarkings,
        neutered,
        deceased,
        vaccinated,
        vaccinationProof,
        image: petImage,
        doctorRemarks,
        doctorAssigned,
        reasonForVisit: reasonForVisit === 'Others' ? reasonOther : reasonForVisit
      }
    };

    showAlert('confirm', viewMode === 'add' ? 'Create Record' : 'Save Changes', 
      `Are you sure you want to ${viewMode === 'add' ? 'create this medical record' : 'save changes to this record'}?`, 
      async () => {
        try {
          await new Promise(resolve => setTimeout(resolve, 500));
          
          let updatedRecords;
          if (viewMode === 'add') {
            const newRecord = {
              ...recordData,
              id: Math.max(...records.map(r => r.id || 0), 0) + 1
            };
            updatedRecords = [...records, newRecord];
          } else {
            updatedRecords = records.map(r => 
              (r.id === editingId || r.pk === editingId) 
                ? { ...r, ...recordData, visitHistory }
                : r
            );
          }
          
          setRecords(updatedRecords);
          setViewMode('list');
          setShowModeOverlay(false);
          showAlert('success', 'Success', 
            viewMode === 'add' ? 'Medical record created successfully!' : 'Record updated successfully!', 
            () => resetForm()
          );
        } catch (error) {
          showAlert('error', 'Error', 'Failed to save medical record.');
        }
      }, true);
  };

  const handleDeleteSelected = (): void => {
    if (selectedRecords.size === 0) {
      showAlert('error', 'No Selection', 'Please select records to delete.');
      return;
    }

    showAlert('confirm', 'Delete Records', 
      `Are you sure you want to delete ${selectedRecords.size} selected record(s)?`, 
      async () => {
        try {
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const updatedRecords = records.filter(r => 
            !selectedRecords.has(r.id || r.pk || 0)
          );
          
          setRecords(updatedRecords);
          setSelectedRecords(new Set());
          
          showAlert('success', 'Success', 'Records deleted successfully!');
        } catch (error) {
          showAlert('error', 'Error', 'Failed to delete records.');
        }
      }, true);
  };

  const toggleRecordSelection = (id: number) => {
    const newSelected = new Set(selectedRecords);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedRecords(newSelected);
  };

  const toggleAllRecords = () => {
    if (selectedRecords.size === paginatedRecords.length) {
      setSelectedRecords(new Set());
    } else {
      const allIds = paginatedRecords.map(r => r.id || r.pk || 0).filter(id => id !== 0);
      setSelectedRecords(new Set(allIds));
    }
  };

  const filteredRecords = records.filter(record => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      record.patientId?.toLowerCase().includes(searchLower) ||
      record.petName.toLowerCase().includes(searchLower) ||
      record.ownerName.toLowerCase().includes(searchLower);

    const matchesDate = dateFilter ? record.lastVisit === dateFilter : true;
    const matchesDoctor = doctorFilter ? record.veterinarian === doctorFilter : true;
    
    let matchesStatus = true;
    const isDeceased = record.deceased || false;
    if (petStatusFilter === 'active') matchesStatus = !isDeceased;
    else if (petStatusFilter === 'deceased') matchesStatus = isDeceased;

    return matchesSearch && matchesDate && matchesDoctor && matchesStatus;
  });

  const paginatedRecords = filteredRecords.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);

  const filteredVisits = visitHistory.filter(visit => {
    const matchesSearch = visitSearchQuery === '' || 
      visit.reason.toLowerCase().includes(visitSearchQuery.toLowerCase()) ||
      visit.doctorRemarks.toLowerCase().includes(visitSearchQuery.toLowerCase());
    const matchesDate = visitDateFilter === '' || visit.date === visitDateFilter;
    const matchesDoctor = visitDoctorFilter === '' || visit.veterinarian === visitDoctorFilter;
    return matchesSearch && matchesDate && matchesDoctor;
  });

  // Medical History filtered data
const filteredLabResults = visitHistory.flatMap(visit => 
  (visit.labResults || []).map(lab => ({
    ...lab,
    visitDate: visit.date,
    visitId: visit.id,
    veterinarian: visit.veterinarian
  }))
).filter(lab => {
  if (medicalHistorySearch === '') return true;
  const searchLower = medicalHistorySearch.toLowerCase();
  return lab.testType.toLowerCase().includes(searchLower) ||
         lab.interpretation?.toLowerCase().includes(searchLower) ||
         lab.veterinarian.toLowerCase().includes(searchLower);
});

const filteredPrescriptionsVisits = visitHistory.filter(visit => 
  visit.prescriptions && 
  visit.prescriptions.length > 0 && 
  visit.prescriptions.some(p => p.medicationName && p.medicationName.trim() !== '')
).filter(visit => {
  if (medicalHistorySearch === '') return true;
  const searchLower = medicalHistorySearch.toLowerCase();
  const hasMatchingMedication = (visit.prescriptions || []).some(p => 
    p.medicationName?.toLowerCase().includes(searchLower) ||
    p.dosage?.toLowerCase().includes(searchLower) ||
    p.instructions?.toLowerCase().includes(searchLower)
  );
  return visit.veterinarian.toLowerCase().includes(searchLower) || hasMatchingMedication;
});

const filteredVaccinations = visitHistory.filter(visit => visit.vaccinationDetails).filter(visit => {
  if (medicalHistorySearch === '') return true;
  const searchLower = medicalHistorySearch.toLowerCase();
  return visit.vaccinationDetails?.vaccineName.toLowerCase().includes(searchLower) ||
         visit.veterinarian.toLowerCase().includes(searchLower) ||
         visit.vaccinationDetails?.manufacturer?.toLowerCase().includes(searchLower);
});

  const breedOptions = species === 'Dog' ? DOG_BREEDS : CAT_BREEDS;

  const getLastWeight = () => {
    if (visitHistory.length > 0) {
      const lastVisit = visitHistory[visitHistory.length - 1];
      return { value: lastVisit.weight, unit: lastVisit.weightUnit };
    }
    return null;
  };

  return (
    <div className="emrContainer">
      {showModeOverlay && viewMode !== 'list' && (
        <div className="emrToast">
          <div className="emrToastContent">
            <div className="emrToastIcon">
              {viewMode === 'add' ? <IoCreateOutline size={18} /> : <FaEye size={18} />}
            </div>
            <span className="emrToastMessage">
              {viewMode === 'add' ? 'Creating a Medical Record' : 'Viewing a Medical Record'}
            </span>
            <button className="emrToastClose" onClick={() => setShowModeOverlay(false)}>
              <IoCloseOutline size={18} />
            </button>
          </div>
        </div>
      )}
      
      <Navbar currentUser={currentUser} onLogout={handleLogoutPress} />
      
      <div className="emrBodyContainer">
        <div className="emrTopContainer">
          <div className="emrSubTopContainer">
            <div className="emrSubTopLeft">
              <CiMedicalClipboard size={20} className="emrBlueIcon" />
              <span className="emrBlueText">Medical Records</span>
            </div>
          </div>
          <div className="emrSubTopContainer emrNotificationContainer">
            <Notifications 
              buttonClassName="emrIconButton"
              iconClassName="emrBlueIcon"
              onViewAll={() => console.log('View all notifications')}
              onNotificationClick={(notification) => {
                if (notification.link) navigate(notification.link);
              }}
            />
          </div>
        </div>

        <div className="emrTableContainer">
          {viewMode === 'list' ? (
            <>
              <div className="emrTableToolbar">
                <div className="emrSearchFilterSection">
                  <div className="emrToolbarItem">
                    <button 
                      className="emrIconButton"
                      onMouseEnter={() => setSearchHovered(true)}
                      onMouseLeave={() => setSearchHovered(false)}
                      onClick={() => setSearchVisible(!searchVisible)}
                    >
                      <IoSearchSharp size={20} className={searchVisible ? "emrIconActive" : "emrIconDefault"} />
                    </button>
                    {searchHovered && <div className="emrTooltip">Search</div>}
                  </div>

                  {searchVisible && (
                    <input
                      type="text"
                      placeholder="Search by Patient ID, Pet Name, or Owner..."
                      value={searchQuery}
                      onChange={(e) => {setSearchQuery(e.target.value); setPage(0);}}
                      className="emrSearchInput"
                    />
                  )}

                  <div className="emrToolbarItem">
                    <button 
                      className="emrIconButton"
                      onMouseEnter={() => setFilterHovered(true)}
                      onMouseLeave={() => setFilterHovered(false)}
                      onClick={() => setFilterVisible(!filterVisible)}
                    >
                      <IoFilterSharp size={20} className={filterVisible ? "emrIconActive" : "emrIconDefault"} />
                    </button>
                    {filterHovered && <div className="emrTooltip">Filter</div>}
                  </div>
                  
                  {filterVisible && (
                    <div className="emrFilterSection">
                      <input
                        type="date"
                        value={dateFilter}
                        onChange={(e) => {setDateFilter(e.target.value); setPage(0);}}
                        className="emrFilterInput"
                        placeholder="Filter by date"
                      />
                      <select 
                        value={doctorFilter} 
                        onChange={(e) => {setDoctorFilter(e.target.value); setPage(0);}}
                        className="emrFilterSelect"
                      >
                        <option value="">All Veterinarians</option>
                        {VETERINARIANS.map(doc => (
                          <option key={doc} value={doc}>{doc}</option>
                        ))}
                      </select>
                      <select 
                        value={petStatusFilter} 
                        onChange={(e) => {setPetStatusFilter(e.target.value); setPage(0);}}
                        className="emrFilterSelect"
                      >
                        <option value="all">All Pets</option>
                        <option value="active">Active Pets</option>
                        <option value="deceased">Deceased Pets</option>
                      </select>
                      <button className="emrClearFilterBtn" onClick={clearFilters}>
                        <IoRefreshOutline size={14} /> Clear
                      </button>
                    </div>
                  )}
                </div>

                <div className="emrActionSection">
                  {selectedRecords.size > 0 && (
                    <button className="emrDeleteBtn" onClick={handleDeleteSelected}>
                      <IoTrashOutline size={14} /> Delete ({selectedRecords.size})
                    </button>
                  )}
                  {activeFilter && (
                    <button className="emrReturnBtn" onClick={handleReturnToList}>
                      <IoArrowBackOutline size={14} /> Return
                    </button>
                  )}
                  <button className="emrBlackBtn" onClick={() => { resetForm(); setViewMode('add'); setShowModeOverlay(true); }}>
                    <IoAdd size={14} /> New Record
                  </button>
                </div>
              </div>

              <div className="emrLegend">
                <div className="emrLegendTitle">Legends:</div>
                <div className="emrLegendItem">
                  <div className="emrLegendColor emrDeceasedColor"></div>
                  <span>Deceased Pet</span>
                </div>
                <div className="emrLegendItem">
                  <div className="emrLegendColor emrActiveColor"></div>
                  <span>Active Pet</span>
                </div>
              </div>

              {loading ? (
                <div className="emrLoadingContainer">
                  <div className="emrSpinner"></div>
                </div>
              ) : (
                <div className="emrTableWrapper">
                  <table className="emrDataTable">
                    <thead>
                      <tr>
                        <th style={{ width: '32px' }}>
                          <input
                            type="checkbox"
                            checked={selectedRecords.size === paginatedRecords.length && paginatedRecords.length > 0}
                            onChange={toggleAllRecords}
                            className="emrCheckbox"
                          />
                        </th>
                        <th>Patient ID</th>
                        <th>Pet Name</th>
                        <th>Owner</th>
                        <th>Last Visit</th>
                        <th>Veterinarian</th>
                        <th>Reason</th>
                        <th>Status</th>
                        <th style={{ width: '70px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedRecords.length > 0 ? (
                        paginatedRecords.map(record => {
                          const recordId = record.id || record.pk || 0;
                          const isDeceased = record.deceased || false;
                          return (
                            <tr key={recordId} className={isDeceased ? 'emrDeceasedRow' : ''}>
                              <td>
                                <input
                                  type="checkbox"
                                  checked={selectedRecords.has(recordId)}
                                  onChange={() => toggleRecordSelection(recordId)}
                                  className="emrCheckbox"
                                />
                              </td>
                              <td>{record.patientId}</td>
                              <td>
                                {record.petName}
                                {isDeceased && <span className="emrDeceasedBadge">Deceased</span>}
                              </td>
                              <td>{record.ownerName}</td>
                              <td>{record.lastVisit}</td>
                              <td>{record.veterinarian}</td>
                              <td>{record.reason}</td>
                              <td>
                                {isDeceased ? (
                                  <span className="emrStatusDeceased">
                                    <IoWarningOutline size={12} /> Deceased
                                  </span>
                                ) : (
                                  <span className="emrStatusActive">Active</span>
                                )}
                              </td>
                              <td>
                                <div className="emrActionButtons">
                                  <button 
                                    className="emrActionBtn" 
                                    onClick={() => loadRecordForEdit(recordId)}
                                    disabled={isDeceased}
                                    title={isDeceased ? "Cannot edit deceased pet" : "Edit record"}
                                  >
                                    <FaEye size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={9} className="emrNoData">
                            No medical records found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  <div className="emrPagination">
                    <button 
                      onClick={() => setPage(Math.max(0, page - 1))}
                      disabled={page === 0}
                      className="emrPaginationBtn"
                    >
                      Previous
                    </button>
                    <span className="emrPaginationInfo">{page + 1} of {totalPages}</span>
                    <button 
                      onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                      disabled={page >= totalPages - 1}
                      className="emrPaginationBtn"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : viewMode === 'add' ? (
            <div className="emrFormContainer">
              <div className="emrFormHeader">
                <div className="emrFormHeaderLeft">
                  <IoCreateOutline size={20} className="emrHeaderIcon" />
                  <h3>Create New Medical Record</h3>
                </div>
                <button className="emrFormClose" onClick={handleCancel}>×</button>
              </div>

              <div className="emrFormContent">
                {/* Pet Image Upload */}
                <div className="emrFormSection">
                  <div className="emrFormRow">
                    <div className="emrFormGroup emrFullWidth">
                      <label>Pet Photo</label>
                      <div className="emrPetImageUpload">
                        <div className="emrImagePreview">
                          {petImage ? (
                            <img src={petImage} alt="Pet" className="emrSquareImage" />
                          ) : (
                            <div className="emrImagePlaceholder">
                              <IoImageOutline size={48} />
                              <span>No image</span>
                            </div>
                          )}
                        </div>
                        <div className="emrImageUploadBtn">
                          <input
                            type="file"
                            id="petImageUpload"
                            accept="image/*"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleImageUpload(e.target.files[0]);
                              }
                            }}
                            className="emrFileInput"
                          />
                          <label htmlFor="petImageUpload" className="emrFileUploadBtn" style={{color: '#ffffff'}}>
                            <IoCloudUploadOutline size={16} /> Upload Photo
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="emrFormSection">
                  <div className="emrFormRow">
                    <div className="emrFormGroup emrFullWidth">
                      <button 
                        type="button"
                        className="emrSearchPetBtn"
                        onClick={() => setShowPetSearch(true)}
                      >
                        <IoSearchSharp size={14} /> Search Existing Pet
                      </button>
                    </div>
                  </div>

                  <div className="emrFormRow">
                    <div className="emrFormGroup">
                      <label>Pet Name <span className="emrRequired">*</span></label>
                      <input 
                        type="text"
                        value={petName}
                        onChange={(e) => setPetName(e.target.value)}
                        placeholder="Enter pet name"
                        className={`emrFormInput ${formErrors.petName ? 'emrError' : ''}`}
                      />
                      {formErrors.petName && <div className="emrErrorText">{formErrors.petName}</div>}
                    </div>

                    <div className="emrFormGroup">
                      <label>Species</label>
                      <div className="emrToggleGroupFull">
                        <button 
                          type="button"
                          className={`emrToggleBtnFull ${species === 'Dog' ? 'emrToggleActiveFull' : ''}`}
                          onClick={() => {
                            setSpecies('Dog');
                            setBreed('');
                          }}
                        >
                          <IoPawOutline size={14} /> Dog
                        </button>
                        <button 
                          type="button"
                          className={`emrToggleBtnFull ${species === 'Cat' ? 'emrToggleActiveFull' : ''}`}
                          onClick={() => {
                            setSpecies('Cat');
                            setBreed('');
                          }}
                        >
                          <IoPawOutline size={14} /> Cat
                        </button>
                      </div>
                    </div>

                    <div className="emrFormGroup">
                      <label>Breed</label>
                      <select 
                        value={breed}
                        onChange={(e) => setBreed(e.target.value)}
                        className="emrFormSelect"
                      >
                        <option value="">Select breed</option>
                        {breedOptions.map(b => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                      {breed === 'Others' && (
                        <input
                          type="text"
                          value={breedOther}
                          onChange={(e) => setBreedOther(e.target.value)}
                          placeholder="Please specify breed"
                          className="emrFormInput emrMarginTop"
                        />
                      )}
                    </div>
                  </div>

                  <div className="emrFormRow">
                    <div className="emrFormGroup">
                      <label>Gender</label>
                      <div className="emrToggleGroupFull">
                        <button 
                          type="button"
                          className={`emrToggleBtnFull emrGenderMale ${gender === 'Male' ? 'emrToggleActiveFull' : ''}`}
                          onClick={() => setGender('Male')}
                        >
                          <IoMaleFemaleOutline size={14} /> Male
                        </button>
                        <button 
                          type="button"
                          className={`emrToggleBtnFull emrGenderFemale ${gender === 'Female' ? 'emrToggleActiveFull' : ''}`}
                          onClick={() => setGender('Female')}
                        >
                          <IoMaleFemaleOutline size={14} /> Female
                        </button>
                      </div>
                    </div>

                    <div className="emrFormGroup">
                      <label>Date of Birth</label>
                      <input 
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => handleDateOfBirthChange(e.target.value)}
                        className="emrFormInput"
                        max={new Date().toISOString().split('T')[0]}
                      />
                    </div>

                    <div className="emrFormGroup">
                      <label>Age</label>
                      <input 
                        type="text"
                        value={age}
                        readOnly
                        className="emrFormInput emrReadOnly"
                        placeholder="Auto-calculated"
                      />
                    </div>
                  </div>

                  <div className="emrFormRow">
                    <div className="emrFormGroup">
                      <label>Weight</label>
                      <div className="emrWeightInputWrapper">
                        <input 
                          type="text"
                          value={weight}
                          onChange={(e) => setWeight(e.target.value.replace(/[^\d.]/g, ''))}
                          placeholder="0.0"
                          className="emrWeightInput"
                        />
                        <div className="emrWeightUnitSelect">
                          <button 
                            type="button"
                            className={`emrWeightUnitBtn ${weightUnit === 'kg' ? 'emrWeightUnitActive' : ''}`}
                            onClick={() => setWeightUnit('kg')}
                          >
                            kg
                          </button>
                          <button 
                            type="button"
                            className={`emrWeightUnitBtn ${weightUnit === 'lbs' ? 'emrWeightUnitActive' : ''}`}
                            onClick={() => setWeightUnit('lbs')}
                          >
                            lbs
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="emrFormGroup">
                      <label>Color/Markings</label>
                      <input 
                        type="text"
                        value={colorMarkings}
                        onChange={(e) => setColorMarkings(e.target.value)}
                        placeholder="e.g., Brown with white spots"
                        className="emrFormInput"
                      />
                    </div>
                  </div>

                  <div className="emrFormRow">
                    <div className="emrFormGroup">
                      <label>Neutered/Spayed</label>
                      <div className="emrToggleGroupFull">
                        <button 
                          type="button"
                          className={`emrToggleBtnFull emrToggleYes ${neutered === true ? 'emrToggleActiveFull' : ''}`}
                          onClick={() => setNeutered(true)}
                        >
                          <IoCheckmarkCircleOutline size={14} /> Yes
                        </button>
                        <button 
                          type="button"
                          className={`emrToggleBtnFull emrToggleNo ${neutered === false ? 'emrToggleActiveFull' : ''}`}
                          onClick={() => setNeutered(false)}
                        >
                          <IoCloseCircleOutline size={14} /> No
                        </button>
                      </div>
                    </div>

                    <div className="emrFormGroup">
                      <label>Deceased</label>
                      <div className="emrToggleGroupFull">
                        <button 
                          type="button"
                          className={`emrToggleBtnFull emrToggleYes ${deceased === true ? 'emrToggleActiveFull' : ''}`}
                          onClick={() => setDeceased(true)}
                        >
                          <IoAlertCircleOutline size={14} /> Yes
                        </button>
                        <button 
                          type="button"
                          className={`emrToggleBtnFull emrToggleNo ${deceased === false ? 'emrToggleActiveFull' : ''}`}
                          onClick={() => setDeceased(false)}
                        >
                          <IoCheckmarkCircleOutline size={14} /> No
                        </button>
                      </div>
                    </div>

                    <div className="emrFormGroup">
                      <label>Vaccinated</label>
                      <div className="emrVaccinatedWrapper">
                        <div className="emrToggleGroupFull">
                          <button 
                            type="button"
                            className={`emrToggleBtnFull emrToggleYes ${vaccinated === true ? 'emrToggleActiveFull' : ''}`}
                            onClick={() => setVaccinated(true)}
                          >
                            <IoCheckmarkCircleOutline size={14} /> Yes
                          </button>
                          <button 
                            type="button"
                            className={`emrToggleBtnFull emrToggleNo ${vaccinated === false ? 'emrToggleActiveFull' : ''}`}
                            onClick={() => setVaccinated(false)}
                          >
                            <IoCloseCircleOutline size={14} /> No
                          </button>
                        </div>
                        {vaccinated && vaccinationProof && (
                          <button 
                            type="button"
                            className="emrViewProofBtn"
                            onClick={() => {
                              setSelectedVaccinationProof(vaccinationProof);
                              setShowVaccinationProof(true);
                            }}
                          >
                            <IoEyeOutline size={12} /> View Proof
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="emrFormSection">
                  <h4>Owner Information</h4>
                  <div className="emrFormRow">
                    <div className="emrFormGroup">
                      <label>First Name <span className="emrRequired">*</span></label>
                      <input 
                        type="text"
                        value={ownerFirstName}
                        onChange={(e) => setOwnerFirstName(e.target.value)}
                        placeholder="First name"
                        className={`emrFormInput ${formErrors.ownerFirstName ? 'emrError' : ''}`}
                      />
                      {formErrors.ownerFirstName && <div className="emrErrorText">{formErrors.ownerFirstName}</div>}
                    </div>

                    <div className="emrFormGroup">
                      <label>Last Name <span className="emrRequired">*</span></label>
                      <input 
                        type="text"
                        value={ownerLastName}
                        onChange={(e) => setOwnerLastName(e.target.value)}
                        placeholder="Last name"
                        className={`emrFormInput ${formErrors.ownerLastName ? 'emrError' : ''}`}
                      />
                      {formErrors.ownerLastName && <div className="emrErrorText">{formErrors.ownerLastName}</div>}
                    </div>
                  </div>

                  <div className="emrFormRow">
                    <div className="emrFormGroup">
                      <label>Email <span className="emrRequired">*</span></label>
                      <input 
                        type="email"
                        value={ownerEmail}
                        onChange={(e) => setOwnerEmail(e.target.value)}
                        placeholder="owner@example.com"
                        className={`emrFormInput ${formErrors.ownerEmail ? 'emrError' : ''}`}
                      />
                      {formErrors.ownerEmail && <div className="emrErrorText">{formErrors.ownerEmail}</div>}
                    </div>

                    <div className="emrFormGroup">
                      <label>Contact Number <span className="emrRequired">*</span></label>
                      <input 
                        type="tel"
                        value={ownerContact}
                        onChange={(e) => setOwnerContact(e.target.value.replace(/[^\d]/g, '').slice(0, 11))}
                        placeholder="09123456789"
                        className={`emrFormInput ${formErrors.ownerContact ? 'emrError' : ''}`}
                      />
                      {formErrors.ownerContact && <div className="emrErrorText">{formErrors.ownerContact}</div>}
                    </div>
                  </div>
                </div>

                <div className="emrFormActions">
                  <button className="emrCancelBtn" onClick={handleCancel}>
                    Cancel
                  </button>
                  <button className="emrSubmitBtn" onClick={handleSaveRecord}>
                    Create Record
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="emrFormContainer">
              <div className="emrFormHeader">
                <div className="emrFormHeaderLeft">
                  <CiMedicalClipboard size={20} className="emrHeaderIcon" />
                  <h3>Medical Record</h3>
                </div>
                {!deceased && (
                  <div className="emrHeaderActions">
                    <label className="emrSwitch">
                      <input
                        type="checkbox"
                        checked={editModeEnabled}
                        onChange={(e) => setEditModeEnabled(e.target.checked)}
                      />
                      <span className="emrSlider"></span>
                      <span className="emrSwitchLabel">{editModeEnabled ? 'Edit Mode ON' : 'Edit Mode OFF'}</span>
                    </label>
                  </div>
                )}
                <button className="emrFormClose" onClick={handleCancel}>×</button>
              </div>

              <div className="emrTabs">
                <button 
                  className={`emrTabBtn ${activeTab === 'info' ? 'emrTabActive' : ''}`}
                  onClick={() => setActiveTab('info')}
                >
                  <IoDocumentTextOutline size={14} /> Pet & Owner Information
                </button>
                <button 
                  className={`emrTabBtn ${activeTab === 'visits' ? 'emrTabActive' : ''}`}
                  onClick={() => setActiveTab('visits')}
                >
                  <HiOutlineClipboardDocumentList size={14} /> Visit Records
                </button>
                <button 
                  className={`emrTabBtn ${activeTab === 'medicalHistory' ? 'emrTabActive' : ''}`}
                  onClick={() => setActiveTab('medicalHistory')}
                >
                  <IoMedicalOutline size={14} /> Medical History
                </button>
              </div>

              <div className="emrFormContent">
                {activeTab === 'info' && (
                  <>
                    <div className="emrFormSection">
                      <h4>Pet Information</h4>
                      <div className="emrFormRow">
                        <div className="emrFormGroup emrFullWidth">
                          <label>Pet Photo</label>
                          <div className="emrPetImageUpload">
                            <div className="emrImagePreview">
                              {petImage ? (
                                <img src={petImage} alt="Pet" className="emrSquareImage" />
                              ) : (
                                <div className="emrImagePlaceholder">
                                  <IoImageOutline size={48} />
                                  <span>No image</span>
                                </div>
                              )}
                            </div>
                            {editModeEnabled && (
                              <div className="emrImageUploadBtn">
                                <input
                                  type="file"
                                  id="petImageUploadEdit"
                                  accept="image/*"
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                      handleImageUpload(e.target.files[0]);
                                    }
                                  }}
                                  className="emrFileInput"
                                />
                                <label htmlFor="petImageUploadEdit" className="emrFileUploadBtn" style={{color: '#ffffff'}}>
                                  <IoCloudUploadOutline size={16}/> Change Photo
                                </label>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="emrFormRow">
                        <div className="emrFormGroup">
                          <label>Pet Name <span className="emrRequired">*</span></label>
                          <input 
                            type="text"
                            value={petName}
                            onChange={(e) => setPetName(e.target.value)}
                            disabled={!editModeEnabled}
                            className={`emrFormInput ${formErrors.petName ? 'emrError' : ''}`}
                          />
                          {formErrors.petName && <div className="emrErrorText">{formErrors.petName}</div>}
                        </div>

                        <div className="emrFormGroup">
                          <label>Species</label>
                          <div className="emrToggleGroupFull">
                            <button 
                              type="button"
                              className={`emrToggleBtnFull ${species === 'Dog' ? 'emrToggleActiveFull' : ''}`}
                              onClick={() => { if (editModeEnabled) { setSpecies('Dog'); setBreed(''); } }}
                              disabled={!editModeEnabled}
                            >
                              <IoPawOutline size={14} /> Dog
                            </button>
                            <button 
                              type="button"
                              className={`emrToggleBtnFull ${species === 'Cat' ? 'emrToggleActiveFull' : ''}`}
                              onClick={() => { if (editModeEnabled) { setSpecies('Cat'); setBreed(''); } }}
                              disabled={!editModeEnabled}
                            >
                              <IoPawOutline size={14} /> Cat
                            </button>
                          </div>
                        </div>

                        <div className="emrFormGroup">
                          <label>Breed</label>
                          <select 
                            value={breed}
                            onChange={(e) => setBreed(e.target.value)}
                            disabled={!editModeEnabled}
                            className="emrFormSelect"
                          >
                            <option value="">Select breed</option>
                            {breedOptions.map(b => (
                              <option key={b} value={b}>{b}</option>
                            ))}
                          </select>
                          {breed === 'Others' && (
                            <input
                              type="text"
                              value={breedOther}
                              onChange={(e) => setBreedOther(e.target.value)}
                              placeholder="Please specify breed"
                              className="emrFormInput emrMarginTop"
                              disabled={!editModeEnabled}
                            />
                          )}
                        </div>
                      </div>

                      <div className="emrFormRow">
                        <div className="emrFormGroup">
                          <label>Gender</label>
                          <div className="emrToggleGroupFull">
                            <button 
                              type="button"
                              className={`emrToggleBtnFull emrGenderMale ${gender === 'Male' ? 'emrToggleActiveFull' : ''}`}
                              onClick={() => { if (editModeEnabled) setGender('Male'); }}
                              disabled={!editModeEnabled}
                            >
                              <IoMaleFemaleOutline size={14} /> Male
                            </button>
                            <button 
                              type="button"
                              className={`emrToggleBtnFull emrGenderFemale ${gender === 'Female' ? 'emrToggleActiveFull' : ''}`}
                              onClick={() => { if (editModeEnabled) setGender('Female'); }}
                              disabled={!editModeEnabled}
                            >
                              <IoMaleFemaleOutline size={14} /> Female
                            </button>
                          </div>
                        </div>

                        <div className="emrFormGroup">
                          <label>Date of Birth</label>
                          <input 
                            type="date"
                            value={dateOfBirth}
                            onChange={(e) => handleDateOfBirthChange(e.target.value)}
                            className="emrFormInput"
                            max={new Date().toISOString().split('T')[0]}
                            disabled={!editModeEnabled}
                          />
                        </div>

                        <div className="emrFormGroup">
                          <label>Age</label>
                          <input 
                            type="text"
                            value={age}
                            readOnly
                            className="emrFormInput emrReadOnly"
                            placeholder="Auto-calculated"
                          />
                        </div>
                      </div>

                      <div className="emrFormRow">
                        <div className="emrFormGroup">
                          <label>Weight</label>
                          <div className="emrWeightInputWrapper">
                            <input 
                              type="text"
                              value={weight}
                              onChange={(e) => setWeight(e.target.value.replace(/[^\d.]/g, ''))}
                              placeholder="0.0"
                              className="emrWeightInput"
                              disabled={!editModeEnabled}
                            />
                            <div className="emrWeightUnitSelect">
                              <button 
                                type="button"
                                className={`emrWeightUnitBtn ${weightUnit === 'kg' ? 'emrWeightUnitActive' : ''}`}
                                onClick={() => { if (editModeEnabled) setWeightUnit('kg'); }}
                                disabled={!editModeEnabled}
                              >
                                kg
                              </button>
                              <button 
                                type="button"
                                className={`emrWeightUnitBtn ${weightUnit === 'lbs' ? 'emrWeightUnitActive' : ''}`}
                                onClick={() => { if (editModeEnabled) setWeightUnit('lbs'); }}
                                disabled={!editModeEnabled}
                              >
                                lbs
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="emrFormGroup">
                          <label>Color/Markings</label>
                          <input 
                            type="text"
                            value={colorMarkings}
                            onChange={(e) => setColorMarkings(e.target.value)}
                            placeholder="e.g., Brown with white spots"
                            className="emrFormInput"
                            disabled={!editModeEnabled}
                          />
                        </div>
                      </div>

                      <div className="emrFormRow">
                        <div className="emrFormGroup">
                          <label>Neutered/Spayed</label>
                          <div className="emrToggleGroupFull">
                            <button 
                              type="button"
                              className={`emrToggleBtnFull emrToggleYes ${neutered === true ? 'emrToggleActiveFull' : ''}`}
                              onClick={() => { if (editModeEnabled) setNeutered(true); }}
                              disabled={!editModeEnabled}
                            >
                              <IoCheckmarkCircleOutline size={14} /> Yes
                            </button>
                            <button 
                              type="button"
                              className={`emrToggleBtnFull emrToggleNo ${neutered === false ? 'emrToggleActiveFull' : ''}`}
                              onClick={() => { if (editModeEnabled) setNeutered(false); }}
                              disabled={!editModeEnabled}
                            >
                              <IoCloseCircleOutline size={14} /> No
                            </button>
                          </div>
                        </div>

                        <div className="emrFormGroup">
                          <label>Deceased</label>
                          <div className="emrToggleGroupFull">
                            <button 
                              type="button"
                              className={`emrToggleBtnFull emrToggleYes ${deceased === true ? 'emrToggleActiveFull' : ''}`}
                              onClick={() => { if (editModeEnabled) setDeceased(true); }}
                              disabled={!editModeEnabled}
                            >
                              <IoAlertCircleOutline size={14} /> Yes
                            </button>
                            <button 
                              type="button"
                              className={`emrToggleBtnFull emrToggleNo ${deceased === false ? 'emrToggleActiveFull' : ''}`}
                              onClick={() => { if (editModeEnabled) setDeceased(false); }}
                              disabled={!editModeEnabled}
                            >
                              <IoCheckmarkCircleOutline size={14} /> No
                            </button>
                          </div>
                        </div>

                        <div className="emrFormGroup">
                          <label>Vaccinated</label>
                          <div className="emrVaccinatedWrapper">
                            <div className="emrToggleGroupFull">
                              <button 
                                type="button"
                                className={`emrToggleBtnFull emrToggleYes ${vaccinated === true ? 'emrToggleActiveFull' : ''}`}
                                onClick={() => { if (editModeEnabled) setVaccinated(true); }}
                                disabled={!editModeEnabled}
                              >
                                <IoCheckmarkCircleOutline size={14} /> Yes
                              </button>
                              <button 
                                type="button"
                                className={`emrToggleBtnFull emrToggleNo ${vaccinated === false ? 'emrToggleActiveFull' : ''}`}
                                onClick={() => { if (editModeEnabled) setVaccinated(false); }}
                                disabled={!editModeEnabled}
                              >
                                <IoCloseCircleOutline size={14} /> No
                              </button>
                            </div>
                            {vaccinated && vaccinationProof && (
                              <button 
                                type="button"
                                className="emrViewProofBtn"
                                onClick={() => {
                                  setSelectedVaccinationProof(vaccinationProof);
                                  setShowVaccinationProof(true);
                                }}
                              >
                                <IoEyeOutline size={12} /> View Proof
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="emrFormSection">
                      <h4>Owner Information</h4>
                      <div className="emrFormRow">
                        <div className="emrFormGroup">
                          <label>First Name <span className="emrRequired">*</span></label>
                          <input 
                            type="text"
                            value={ownerFirstName}
                            onChange={(e) => setOwnerFirstName(e.target.value)}
                            disabled={!editModeEnabled}
                            className={`emrFormInput ${formErrors.ownerFirstName ? 'emrError' : ''}`}
                          />
                          {formErrors.ownerFirstName && <div className="emrErrorText">{formErrors.ownerFirstName}</div>}
                        </div>

                        <div className="emrFormGroup">
                          <label>Last Name <span className="emrRequired">*</span></label>
                          <input 
                            type="text"
                            value={ownerLastName}
                            onChange={(e) => setOwnerLastName(e.target.value)}
                            disabled={!editModeEnabled}
                            className={`emrFormInput ${formErrors.ownerLastName ? 'emrError' : ''}`}
                          />
                          {formErrors.ownerLastName && <div className="emrErrorText">{formErrors.ownerLastName}</div>}
                        </div>
                      </div>

                      <div className="emrFormRow">
                        <div className="emrFormGroup">
                          <label>Email <span className="emrRequired">*</span></label>
                          <input 
                            type="email"
                            value={ownerEmail}
                            onChange={(e) => setOwnerEmail(e.target.value)}
                            disabled={!editModeEnabled}
                            className={`emrFormInput ${formErrors.ownerEmail ? 'emrError' : ''}`}
                          />
                          {formErrors.ownerEmail && <div className="emrErrorText">{formErrors.ownerEmail}</div>}
                        </div>

                        <div className="emrFormGroup">
                          <label>Contact Number <span className="emrRequired">*</span></label>
                          <input 
                            type="tel"
                            value={ownerContact}
                            onChange={(e) => setOwnerContact(e.target.value.replace(/[^\d]/g, '').slice(0, 11))}
                            disabled={!editModeEnabled}
                            className={`emrFormInput ${formErrors.ownerContact ? 'emrError' : ''}`}
                          />
                          {formErrors.ownerContact && <div className="emrErrorText">{formErrors.ownerContact}</div>}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'visits' && (
                  <div className="emrVisitHistorySection">
                    <div className="emrSectionHeader">
                      <h4>
                        <HiOutlineClipboardDocumentList size={18} />
                        Visit Records
                      </h4>
                      <div className="emrVisitFilters">
                        <div className="emrSearchInputWrapper emrSmallSearch">
                          <IoSearchSharp size={14} className="emrSearchIconSmall" />
                          <input
                            type="text"
                            placeholder="Search visits..."
                            value={visitSearchQuery}
                            onChange={(e) => setVisitSearchQuery(e.target.value)}
                            className="emrSearchInputSmall"
                          />
                        </div>
                        <input
                          type="date"
                          value={visitDateFilter}
                          onChange={(e) => setVisitDateFilter(e.target.value)}
                          className="emrFilterInputSmall"
                          placeholder="Filter by date"
                        />
                        <select 
                          value={visitDoctorFilter} 
                          onChange={(e) => setVisitDoctorFilter(e.target.value)}
                          className="emrFilterSelectSmall"
                        >
                          <option value="">All Doctors</option>
                          {VETERINARIANS.map(doc => (
                            <option key={doc} value={doc}>{doc}</option>
                          ))}
                        </select>
                        <button className="emrClearFilterBtn" onClick={clearVisitFilters}>
                          <IoRefreshOutline size={12} /> Clear
                        </button>
                      </div>
                    </div>
                    
                    <div className="emrVisitHistoryContainer">
                      {filteredVisits.length > 0 ? (
                        filteredVisits.map((visit, index) => (
                          <div key={visit.id}>
                            <div className="emrVisitCard" onClick={() => toggleVisitExpand(visit.id)} style={{ cursor: 'pointer' }}>
                              <div className="emrVisitHeader">
                                <div className="emrVisitDate">
                                  <IoTimeOutline size={14} />
                                  <span>{visit.date} at {visit.time}</span>
                                  {visit.appointmentId && (
                                    <span className="emrStatusActive" style={{ marginLeft: '8px', fontSize: '10px' }}>
                                      <IoCalendarOutline size={10} /> Appointment
                                    </span>
                                  )}
                                  {visit.selectedServices && visit.selectedServices.length > 0 && (
                                    <span className="emrStatusActive" style={{ marginLeft: '8px', fontSize: '10px', backgroundColor: '#e3f2fd', color: '#1565c0' }}>
                                      <IoListOutline size={10} /> {visit.selectedServices.length} Service(s)
                                    </span>
                                  )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  {/* Create Invoice Button */}
                                  <button 
                                    className="emrCreateInvoiceBtn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCreateInvoice(visit);
                                    }}
                                    title="Create Invoice"
                                  >
                                    <IoReceipt size={14} /> Create Invoice
                                  </button>
                                  
                                  {(visit.prescriptions && visit.prescriptions.length > 0 && 
                                    visit.prescriptions.some(p => p.medicationName && p.medicationName.trim() !== '')) && (
                                    <button 
                                      className="emrViewPrescriptionBtn"
                                      onClick={(e) => {
                                        e.stopPropagation(); 
                                        handleViewPrescription(visit);
                                      }}
                                      title="View Prescription"
                                    >
                                      <TbReportMedical size={14} /> Prescription
                                    </button>
                                  )}
                                  <div className="emrVisitNumber">Visit #{index + 1}</div>
                                  {expandedVisitId === visit.id ? (
                                    <IoChevronUpOutline size={18} />
                                  ) : (
                                    <IoChevronDownOutline size={18} />
                                  )}
                                </div>
                              </div>
                              <div className="emrVisitDetails">
                                <div><strong>Veterinarian:</strong> {visit.veterinarian}</div>
                                <div><strong>Reason:</strong> {visit.reason}</div>
                                {visit.selectedServices && visit.selectedServices.length > 0 && (
                                  <div className="emrFullWidth">
                                    <strong>Services Provided:</strong>
                                    <div className="emrServicesList">
                                      {visit.selectedServices.map((service, idx) => (
                                        <span key={service.id} className="emrServiceTag">
                                          {service.name}
                                          {idx < (visit.selectedServices?.length ?? 0) - 1 && ', '}
                                        </span>
                                      ))}
                                      <span className="emrServicesTotalPrice">
                                        (₱{visit.selectedServices.reduce((sum, s) => sum + s.price, 0).toLocaleString()})
                                      </span>
                                    </div>
                                  </div>
                                )}
                                {visit.vaccinationDetails && (
                                  <div className="emrFullWidth">
                                    <strong>Vaccination Details:</strong>
                                    <div className="emrVaccinationSummary">
                                      <span>💉 {visit.vaccinationDetails.vaccineName}</span>
                                      <span>📅 {visit.vaccinationDetails.dateAdministered}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            {expandedVisitId === visit.id && (
                              <div className="emrVisitCard emrExpandedDetails" style={{ marginTop: '-18px', borderTopLeftRadius: 5, borderTopRightRadius: 5, zIndex: 1, backgroundColor: '#f9f9f9' }}>
                                <div className="emrVisitDetails">
                                  <div><strong>Weight:</strong> {visit.weight} {visit.weightUnit}</div>
                                  {visit.clinicalExam && (
                                    <>
                                      <div><strong>Length:</strong> {visit.clinicalExam.length} {visit.clinicalExam.lengthUnit}</div>
                                      <div><strong>Temperature:</strong> {visit.clinicalExam.temperature}°{visit.clinicalExam.tempUnit}</div>
                                      <div><strong>Heart Rate:</strong> {visit.clinicalExam.heartRate}/min</div>
                                      <div><strong>Breathing Rate:</strong> {visit.clinicalExam.breathingRate}/min</div>
                                      {visit.clinicalExam.additionalFindings && (
                                        <div className="emrFullWidth"><strong>Additional Findings:</strong> {visit.clinicalExam.additionalFindings}</div>
                                      )}
                                    </>
                                  )}
                                  
                                  {/* Display all services in expanded view with more details */}
                                  {visit.selectedServices && visit.selectedServices.length > 0 && (
                                    <div className="emrFullWidth">
                                      <strong>Additional Services:</strong>
                                      <div className="emrServicesDetailedList">
                                        <table className="emrServicesTable">
                                          <thead>
                                            <tr>
                                              <th>Service</th>
                                              <th>Description</th>
                                              <th>Price</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {visit.selectedServices.map(service => (
                                              <tr key={service.id}>
                                                <td>{service.name}</td>
                                                <td className="emrServiceDescCell">{service.description || '—'}</td>
                                                <td className="emrServicePriceCell">₱{service.price.toLocaleString()}</td>
                                              </tr>
                                            ))}
                                            <tr className="emrServicesTotalRow">
                                              <td colSpan={2}><strong>Total</strong></td>
                                              <td className="emrServicePriceCell">
                                                <strong>₱{visit.selectedServices.reduce((sum, s) => sum + s.price, 0).toLocaleString()}</strong>
                                              </td>
                                            </tr>
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Vaccination Details */}
                                  {visit.vaccinationDetails && (
                                    <div className="emrFullWidth">
                                      <strong>Vaccination Details:</strong>
                                      <div className="emrVaccinationDetailsExpanded">
                                        <div><strong>Vaccine Name:</strong> {visit.vaccinationDetails.vaccineName}</div>
                                        <div><strong>Dose/Volume:</strong> {visit.vaccinationDetails.doseVolume || 'N/A'}</div>
                                        <div><strong>Injection Site:</strong> {visit.vaccinationDetails.injectionSite || 'N/A'}</div>
                                        <div><strong>Manufacturer:</strong> {visit.vaccinationDetails.manufacturer || 'N/A'}</div>
                                        <div><strong>Date Administered:</strong> {visit.vaccinationDetails.dateAdministered}</div>
                                        <div><strong>Next Due Date:</strong> {visit.vaccinationDetails.nextDueDate || 'N/A'}</div>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {visit.prescriptions && visit.prescriptions.length > 0 && (
                                    <div className="emrFullWidth">
                                      <strong>Prescriptions:</strong>
                                      {visit.prescriptions.map((pres, idx) => (
                                        <div key={pres.id} className="emrPrescriptionItem">
                                          • {pres.medicationName || 'Medication'} - {pres.dosage}, {pres.frequency} for {pres.duration}
                                          {pres.instructions && <div className="emrPrescriptionInstructions">Instructions: {pres.instructions}</div>}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {visit.labResults && visit.labResults.length > 0 && (
                                    <div className="emrFullWidth">
                                      <strong>Lab Results:</strong> {visit.labResults.length} test(s) performed
                                    </div>
                                  )}
                                  <div className="emrFullWidth">
                                    <strong>Remarks:</strong>
                                    <div 
                                      className="emrRichTextDisplayContent"
                                      dangerouslySetInnerHTML={{ __html: visit.doctorRemarks || 'No remarks' }}
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="emrNoVisits">
                          <IoMedicalOutline size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                          <p>No visits recorded yet</p>
                          <p style={{ fontSize: '11px', marginTop: '8px', color: '#999' }}>
                            Click the "Add New Visit" button to record a visit
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <button className="emrFloatingBtn" onClick={() => setShowAddVisit(true)}>
                      <IoAddCircleOutline size={18} /> Add New Visit
                    </button>
                  </div>
                )}

{activeTab === 'medicalHistory' && (
  <div className="emrMedicalHistoryContainer">
    {/* Filter/Search Section */}
    <div className="emrMedicalHistoryFilters">
      <div className="emrSearchInputWrapper emrSmallSearch">
        <IoSearchSharp size={14} className="emrSearchIconSmall" />
        <input
          type="text"
          placeholder="Search medical records..."
          value={medicalHistorySearch}
          onChange={(e) => setMedicalHistorySearch(e.target.value)}
          className="emrSearchInputSmall"
        />
      </div>
      <div className="emrFilterGroup">
        <button 
          className={`emrFilterChip ${medicalHistoryFilter === 'all' ? 'emrFilterChipActive' : ''}`}
          onClick={() => setMedicalHistoryFilter('all')}
        >
          All
        </button>
        <button 
          className={`emrFilterChip ${medicalHistoryFilter === 'lab' ? 'emrFilterChipActive' : ''}`}
          onClick={() => setMedicalHistoryFilter('lab')}
        >
          <ImLab size={12} /> Lab Results
        </button>
        <button 
          className={`emrFilterChip ${medicalHistoryFilter === 'prescription' ? 'emrFilterChipActive' : ''}`}
          onClick={() => setMedicalHistoryFilter('prescription')}
        >
          <TbReportMedical size={12} /> Prescriptions
        </button>
        <button 
          className={`emrFilterChip ${medicalHistoryFilter === 'vaccination' ? 'emrFilterChipActive' : ''}`}
          onClick={() => setMedicalHistoryFilter('vaccination')}
        >
          <IoMedicalOutline size={12} /> Vaccinations
        </button>
      </div>
    </div>

    <div className="emrMedicalHistoryContent">
      {/* Lab Results Section - Only show when filter is 'all' or 'lab' */}
      {(medicalHistoryFilter === 'all' || medicalHistoryFilter === 'lab') && (
        <div className="emrHistorySection">
          <div className="emrHistorySectionHeader">
            <ImLab size={18} />
            <h4>Laboratory Results</h4>
            <span className="emrHistoryCount">{filteredLabResults.length} records</span>
          </div>
          <div className="emrHistoryItems">
            {filteredLabResults.length > 0 ? (
              filteredLabResults.map((lab, idx) => (
                <div key={lab.id} className="emrHistoryCard">
                  <div className="emrHistoryCardHeader">
                    <div className="emrHistoryCardTitle">
                      <strong>{lab.testType}</strong>
                      <span className="emrHistoryDate">{lab.visitDate}</span>
                    </div>
                    <div className="emrHistoryCardActions">
                      {lab.fileData && (
                        <button 
                          className="emrViewFileBtn"
                          onClick={() => {
                            const win = window.open();
                            if (win) {
                              win.document.write(`<img src="${lab.fileData}" style="max-width: 100%;" />`);
                            }
                          }}
                        >
                          <IoEyeOutline size={12} /> View File
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="emrHistoryCardBody">
                    <div className="emrHistoryDetail">
                      <span className="emrHistoryLabel">Veterinarian:</span>
                      <span>{lab.veterinarian}</span>
                    </div>
                    {lab.interpretation && (
                      <div className="emrHistoryDetail">
                        <span className="emrHistoryLabel">Interpretation:</span>
                        <span>{lab.interpretation}</span>
                      </div>
                    )}
                    {lab.fileName && (
                      <div className="emrHistoryDetail">
                        <span className="emrHistoryLabel">File:</span>
                        <span>{lab.fileName}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="emrHistoryEmpty">
                <ImLab size={32} />
                <p>No laboratory results recorded yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Prescriptions Section - Grouped by Visit - Only show when filter is 'all' or 'prescription' */}
      {(medicalHistoryFilter === 'all' || medicalHistoryFilter === 'prescription') && (
        <div className="emrHistorySection">
          <div className="emrHistorySectionHeader">
            <TbReportMedical size={18} />
            <h4>Prescriptions</h4>
            <span className="emrHistoryCount">{filteredPrescriptionsVisits.length} visits</span>
          </div>
          <div className="emrHistoryItems">
            {filteredPrescriptionsVisits.length > 0 ? (
              filteredPrescriptionsVisits.map((visit, idx) => (
                <div key={visit.id} className="emrHistoryCard">
                  <div className="emrHistoryCardHeader">
                    <div className="emrHistoryCardTitle">
                      <strong>Visit #{idx + 1}</strong>
                      <span className="emrHistoryDate">{visit.date}</span>
                    </div>
                    <div className="emrHistoryCardActions">
                      <button 
                        className="emrViewPrescriptionBtn"
                        onClick={() => handleViewPrescription(visit)}
                      >
                        <FaFilePdf size={12} /> View All Prescriptions
                      </button>
                    </div>
                  </div>
                  <div className="emrHistoryCardBody">
                    <div className="emrHistoryDetail">
                      <span className="emrHistoryLabel">Veterinarian:</span>
                      <span>{visit.veterinarian}</span>
                    </div>
                    <div className="emrHistoryDetail">
                      <span className="emrHistoryLabel">Medications:</span>
                      <div className="emrPrescriptionsList">
                        {(visit.prescriptions || [])
                          .filter(p => p.medicationName && p.medicationName.trim() !== '')
                          .map((pres) => (
                            <div key={pres.id} className="emrPrescriptionItemCompact">
                              <strong>{pres.medicationName}</strong>
                              {pres.dosage && <span> - {pres.dosage}</span>}
                              {pres.frequency && <span> - {pres.frequency}</span>}
                              {pres.duration && <span> - {pres.duration}</span>}
                              {pres.instructions && (
                                <div className="emrPrescriptionInstructionsCompact">
                                  📝 {pres.instructions}
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="emrHistoryEmpty">
                <TbReportMedical size={32} />
                <p>No prescriptions recorded yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Vaccinations Section - Only show when filter is 'all' or 'vaccination' */}
      {(medicalHistoryFilter === 'all' || medicalHistoryFilter === 'vaccination') && (
        <div className="emrHistorySection">
          <div className="emrHistorySectionHeader">
            <IoMedicalOutline size={18} />
            <h4>Vaccination History</h4>
            <span className="emrHistoryCount">{filteredVaccinations.length} records</span>
          </div>
          <div className="emrHistoryItems">
            {filteredVaccinations.length > 0 ? (
              filteredVaccinations.map((visit, idx) => (
                <div key={visit.id} className="emrHistoryCard">
                  <div className="emrHistoryCardHeader">
                    <div className="emrHistoryCardTitle">
                      <strong>{visit.vaccinationDetails!.vaccineName}</strong>
                      <span className="emrHistoryDate">{visit.date}</span>
                    </div>
                  </div>
                  <div className="emrHistoryCardBody">
                    <div className="emrHistoryDetail">
                      <span className="emrHistoryLabel">Veterinarian:</span>
                      <span>{visit.veterinarian}</span>
                    </div>
                    <div className="emrHistoryDetail">
                      <span className="emrHistoryLabel">Dose/Volume:</span>
                      <span>{visit.vaccinationDetails!.doseVolume || 'N/A'}</span>
                    </div>
                    <div className="emrHistoryDetail">
                      <span className="emrHistoryLabel">Injection Site:</span>
                      <span>{visit.vaccinationDetails!.injectionSite || 'N/A'}</span>
                    </div>
                    <div className="emrHistoryDetail">
                      <span className="emrHistoryLabel">Manufacturer:</span>
                      <span>{visit.vaccinationDetails!.manufacturer || 'N/A'}</span>
                    </div>
                    <div className="emrHistoryDetail">
                      <span className="emrHistoryLabel">Date Administered:</span>
                      <span>{visit.vaccinationDetails!.dateAdministered}</span>
                    </div>
                    {visit.vaccinationDetails!.nextDueDate && (
                      <div className="emrHistoryDetail">
                        <span className="emrHistoryLabel">Next Due Date:</span>
                        <span>{visit.vaccinationDetails!.nextDueDate}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="emrHistoryEmpty">
                <IoMedicalOutline size={32} />
                <p>No vaccination records yet</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  </div>
)}
              </div>

              <div className="emrFormActions">
                <button className="emrReturnBtn" onClick={handleGeneratePDF}>
                  <FaFilePdf size={14} /> Generate PDF Medical Record
                </button>
                <div style={{ flex: 1 }} />
                <button className="emrCancelBtn" onClick={handleCancel}>
                  Cancel
                </button>
                <button className="emrSubmitBtn" onClick={handleSaveRecord}>
                  Save Changes
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pet Search Modal */}
      {showPetSearch && (
        <div className="emrModalOverlay" onClick={() => setShowPetSearch(false)}>
          <div className="emrSearchModal" onClick={e => e.stopPropagation()}>
            <div className="emrModalHeader">
              <h4>Search Existing Pet</h4>
              <button className="emrModalClose" onClick={() => setShowPetSearch(false)}>×</button>
            </div>
            <div className="emrSearchModalContent">
              <div className="emrSearchInputWrapper">
                <input
                  type="text"
                  placeholder="Search by pet name, owner name, or username..."
                  value={petSearchQuery}
                  onChange={(e) => handlePetSearchChange(e.target.value)}
                  className="emrSearchInput"
                />
                <IoSearchSharp size={18} className="emrSearchIcon" />
              </div>

              <div className="emrSearchResults">
                {searchResults.length > 0 ? (
                  searchResults.map(result => (
                    <div key={result.id} className={`emrSearchResultItem ${result.hasExistingRecord ? 'emrHasRecord' : ''} ${result.deceased ? 'emrDeceasedResult' : ''}`} onClick={() => selectPet(result)}>
                      <div className="emrSearchResultIcon">
                        {result.image ? (
                          <img src={result.image} alt={result.petName} className="emrSearchResultImage" />
                        ) : (
                          <IoPawOutline size={20} />
                        )}
                      </div>
                      <div className="emrSearchResultInfo">
                        <div className="emrSearchResultName">
                          {result.petName}
                          {result.hasExistingRecord && <span className="emrExistingBadge">Has Record</span>}
                          {result.deceased && <span className="emrDeceasedBadgeSmall">Deceased</span>}
                        </div>
                        <div className="emrSearchResultDetails">
                          Owner: {result.ownerName} {result.ownerUsername && `(@${result.ownerUsername})`}
                        </div>
                        <div className="emrSearchResultDetails">
                          {result.species} • {result.breed} • {result.gender}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="emrSearchNoResults">
                    <p>No pets found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Visit Modal with Appointment Selection */}
      {showAddVisit && !deceased && (
        <div className="emrModalOverlay" onClick={() => setShowAddVisit(false)}>
          <div className={`emrAddVisitModalSplit ${(showPrescriptionPanel || showLabPanel || showServicesPanel) ? 'withPanel' : ''}`} onClick={e => e.stopPropagation()}>
            {/* Left Panel - Main Form */}
            <div className="emrAddVisitLeftPanel">
              <div className="emrModalHeader">
                <h4 style={{color: '#3d67ee'}}>Add New Visit</h4>
                <button className="emrModalClose" onClick={() => setShowAddVisit(false)}>×</button>
              </div>
              <div className="emrAddVisitContent">
                {/* Visit Type Selection */}
                <div className="emrFormSection">
                  <h4>Visit Type</h4>
                  <div className="emrFormRow">
                    <div className="emrFormGroup emrFullWidth">
                      <div className="emrToggleGroupFull">
                        <button 
                          type="button"
                          className={`emrToggleBtnFull ${visitType === 'walkin' ? 'emrToggleActiveFull' : ''}`}
                          onClick={() => {
                            setVisitType('walkin');
                            setSelectedAppointment(null);
                          }}
                        >
                          <IoTimeSharp size={14} /> Walk-in
                        </button>
                        <button 
                          type="button"
                          className={`emrToggleBtnFull ${visitType === 'appointment' ? 'emrToggleActiveFull' : ''}`}
                          onClick={() => {
                            setVisitType('appointment');
                            if (appointmentRecords.length === 0 && patientId) {
                              fetchAppointmentsForPet(patientId);
                            }
                          }}
                        >
                          <IoCalendarOutline size={14} /> Appointment
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Appointment Selection - Only show when Appointment is selected */}
                {visitType === 'appointment' && (
                  <div className="emrFormSection">
                    <h4>Select Appointment</h4>
                    <div className="emrFormRow">
                      <div className="emrFormGroup emrFullWidth">
                        {appointmentRecords.filter(app => app.status === 'scheduled').length > 0 ? (
                          <div className="emrAppointmentList">
                            {appointmentRecords.filter(app => app.status === 'scheduled').map(app => (
                              <div 
                                key={app.id}
                                className={`emrAppointmentItem ${selectedAppointment?.id === app.id ? 'emrAppointmentSelected' : ''}`}
                                onClick={() => {
                                  setSelectedAppointment(app);
                                  setNewVisit({
                                    ...newVisit,
                                    veterinarian: app.veterinarian,
                                    reason: app.reason
                                  });
                                }}
                              >
                                <div className="emrAppointmentInfo">
                                  <div className="emrAppointmentDate">
                                    <IoCalendarOutline size={14} />
                                    <strong>{app.date}</strong> at <strong>{app.time}</strong>
                                  </div>
                                  <div className="emrAppointmentDetails">
                                    <span>{app.veterinarian}</span>
                                    <span>•</span>
                                    <span>{app.reason}</span>
                                  </div>
                                  {app.services && app.services.length > 0 && (
                                    <div className="emrAppointmentServices">
                                      <small>Included Services: {app.services.map(s => s.name).join(', ')}</small>
                                    </div>
                                  )}
                                </div>
                                {selectedAppointment?.id === app.id && (
                                  <div className="emrAppointmentCheck">
                                    <IoCheckmarkCircleOutline size={20} color="#2e9e0c" />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="emrNoAppointments">
                            <p>No upcoming appointments found</p>
                            <button 
                              type="button"
                              className="emrBlackBtn"
                              onClick={() => setVisitType('walkin')}
                              style={{ marginTop: '8px' }}
                            >
                              Switch to Walk-in
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Basic Information */}
                <div className="emrFormSection">
                  <h4>Visit Details</h4>
                  <div className="emrFormRow">
                    <div className="emrFormGroup">
                      <label>Veterinarian</label>
                      <select
                        value={newVisit.veterinarian}
                        onChange={(e) => setNewVisit({...newVisit, veterinarian: e.target.value})}
                        className="emrFormSelect"
                        disabled={visitType === 'appointment' && selectedAppointment !== null}
                      >
                        {VETERINARIANS.map(doc => (
                          <option key={doc} value={doc}>{doc}</option>
                        ))}
                      </select>
                    </div>
                    <div className="emrFormGroup">
                      <label>Reason</label>
                      <select
                        value={newVisit.reason}
                        onChange={(e) => setNewVisit({...newVisit, reason: e.target.value})}
                        className="emrFormSelect"
                        disabled={visitType === 'appointment' && selectedAppointment !== null}
                      >
                        {REASONS.map(reason => (
                          <option key={reason} value={reason}>{reason}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  {/* Display selected services summary - No pricing */}
                  {selectedServices.length > 0 && (
                    <div className="emrSelectedServicesDisplay" style={{ marginTop: '12px', padding: '10px', backgroundColor: '#e8f5e9', borderRadius: '8px', borderLeft: '3px solid #2e9e0c' }}>
                      <div>
                        <strong style={{ fontSize: '12px', color: '#2e7d32' }}>Additional Services Selected:</strong>
                        <div style={{ marginTop: '4px' }}>
                          {selectedServices.map((service, idx) => (
                            <span key={service.id} style={{ fontSize: '11px', color: '#555', marginRight: '12px', display: 'inline-block' }}>
                              • {service.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Additional Services Section */}
                <div className="emrFormSection">
                  <div className="emrFormRow">
                    <div className="emrFormGroup emrFullWidth">
                      <button 
                        type="button"
                        className="emrCreatePrescriptionBtn"
                        onClick={() => {
                          // Close other panels, toggle services panel
                          setShowPrescriptionPanel(false);
                          setShowLabPanel(false);
                          setShowServicesPanel(!showServicesPanel);
                        }}
                        style={{ background: 'linear-gradient(135deg, #3d67ee, #0738D9)' }}
                      >
                        <IoListOutline size={16} /> 
                        {showServicesPanel ? 'Hide Additional Services' : 'Add Additional Services'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Vaccination Details Section - Shows when Vaccination is selected as reason or service */}
                {isVaccinationSelected() && (
                  <div className="emrFormSection">
                    <div className="emrSectionHeaderWithBtn">
                      <h4>
                        <IoMedicalOutline size={16} /> Vaccination Details
                      </h4>
                      <button
                        type="button"
                        className="emrToggleBtn"
                        onClick={() => setShowVaccinationDetails(!showVaccinationDetails)}
                      >
                        {showVaccinationDetails ? 'Hide Details' : 'Add Vaccination Details'}
                      </button>
                    </div>
                    
                    {showVaccinationDetails && (
                      <div className="emrVaccinationDetailsContainer" style={{ marginTop: '12px' }}>
                        <div className="emrFormRow">
                          <div className="emrFormGroup">
                            <label>Vaccine Name <span className="emrRequired">*</span></label>
                            <select
                              value={vaccinationDetails.vaccineName}
                              onChange={(e) => setVaccinationDetails({...vaccinationDetails, vaccineName: e.target.value})}
                              className="emrFormSelect"
                            >
                              <option value="">Select vaccine</option>
                              <option value="Anti-Rabies">Anti-Rabies</option>
                              <option value="5-in-1 (DHPPi)">5-in-1 (DHPPi)</option>
                              <option value="6-in-1 (DHPPiL)">6-in-1 (DHPPiL)</option>
                              <option value="Bordetella (Kennel Cough)">Bordetella (Kennel Cough)</option>
                              <option value="Leptospirosis">Leptospirosis</option>
                              <option value="Canine Influenza">Canine Influenza</option>
                              <option value="Feline Leukemia (FeLV)">Feline Leukemia (FeLV)</option>
                              <option value="Feline Calicivirus">Feline Calicivirus</option>
                              <option value="Feline Panleukopenia">Feline Panleukopenia</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                          <div className="emrFormGroup">
                            <label>Dose / Volume</label>
                            <input
                              type="text"
                              value={vaccinationDetails.doseVolume}
                              onChange={(e) => setVaccinationDetails({...vaccinationDetails, doseVolume: e.target.value})}
                              placeholder="e.g., 1 mL"
                              className="emrFormInput"
                            />
                          </div>
                        </div>
                        
                        <div className="emrFormRow">
                          <div className="emrFormGroup">
                            <label>Injection Site</label>
                            <select
                              value={vaccinationDetails.injectionSite}
                              onChange={(e) => setVaccinationDetails({...vaccinationDetails, injectionSite: e.target.value})}
                              className="emrFormSelect"
                            >
                              <option value="">Select injection site</option>
                              <option value="Left hind leg">Left hind leg</option>
                              <option value="Right hind leg">Right hind leg</option>
                              <option value="Left front leg">Left front leg</option>
                              <option value="Right front leg">Right front leg</option>
                              <option value="Scruff (neck)">Scruff (neck)</option>
                              <option value="Subcutaneous (SC)">Subcutaneous (SC)</option>
                              <option value="Intramuscular (IM)">Intramuscular (IM)</option>
                            </select>
                          </div>
                          <div className="emrFormGroup">
                            <label>Manufacturer / Brand</label>
                            <input
                              type="text"
                              value={vaccinationDetails.manufacturer}
                              onChange={(e) => setVaccinationDetails({...vaccinationDetails, manufacturer: e.target.value})}
                              placeholder="e.g., Merck, Zoetis, Boehringer"
                              className="emrFormInput"
                            />
                          </div>
                        </div>
                        
                        <div className="emrFormRow">
                          <div className="emrFormGroup">
                            <label>Date Administered</label>
                            <input
                              type="date"
                              value={vaccinationDetails.dateAdministered}
                              onChange={(e) => setVaccinationDetails({...vaccinationDetails, dateAdministered: e.target.value})}
                              className="emrFormInput"
                              max={new Date().toISOString().split('T')[0]}
                            />
                          </div>
                          <div className="emrFormGroup">
                            <label>Next Due Date (if applicable)</label>
                            <input
                              type="date"
                              value={vaccinationDetails.nextDueDate}
                              onChange={(e) => setVaccinationDetails({...vaccinationDetails, nextDueDate: e.target.value})}
                              className="emrFormInput"
                              min={vaccinationDetails.dateAdministered}
                            />
                          </div>
                        </div>
                        
                      </div>
                    )}
                  </div>
                )}

                {/* Clinical Exam Section */}
                <div className="emrFormSection">
                  <h4>Clinical Examination</h4>
                  <div className="emrFormRow" style={{ justifyContent: 'space-between', gap: '12px' }}>
                    {/* Weight Section */}
                    <div className="emrFormGroup" style={{ flex: 1 }}>
                      <label>Weight</label>
                      <div className="emrWeightInputWrapper">
                        <input
                          type="text"
                          value={newVisit.sameAsLastWeight && getLastWeight() 
                            ? getLastWeight()?.value || '' 
                            : newVisit.weight || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || /^\d*\.?\d*$/.test(value)) {
                              setNewVisit({...newVisit, weight: parseFloat(value) || 0, sameAsLastWeight: false});
                            }
                          }}
                          placeholder="0.0"
                          className="emrWeightInput"
                          disabled={newVisit.sameAsLastWeight}
                        />
                        <div className="emrWeightUnitSelect">
                          <button
                            type="button"
                            className={`emrWeightUnitBtn ${newVisit.weightUnit === 'kg' ? 'emrWeightUnitActive' : ''}`}
                            onClick={() => setNewVisit({...newVisit, weightUnit: 'kg', sameAsLastWeight: false})}
                          >
                            kg
                          </button>
                          <button
                            type="button"
                            className={`emrWeightUnitBtn ${newVisit.weightUnit === 'lbs' ? 'emrWeightUnitActive' : ''}`}
                            onClick={() => setNewVisit({...newVisit, weightUnit: 'lbs', sameAsLastWeight: false})}
                          >
                            lbs
                          </button>
                        </div>
                      </div>
                      {getLastWeight() && (
                        <label className="emrCheckboxLabel" style={{ marginTop: '8px', marginLeft: '4px' }}>
                          <input
                            type="checkbox"
                            checked={newVisit.sameAsLastWeight}
                            onChange={(e) => setNewVisit({...newVisit, sameAsLastWeight: e.target.checked})}
                            style={{marginRight: '10px'}}
                          />
                          Same as last appointment ({getLastWeight()?.value} {getLastWeight()?.unit})
                        </label>
                      )}
                    </div>

                    {/* Length Section */}
                    <div className="emrFormGroup" style={{ flex: 1 }}>
                      <label>Length</label>
                      <div className="emrWeightInputWrapper">
                        <input
                          type="text"
                          value={newVisit.clinicalExam?.length || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || /^\d*\.?\d*$/.test(value)) {
                              setNewVisit({
                                ...newVisit, 
                                clinicalExam: { ...newVisit.clinicalExam!, length: parseFloat(value) || 0 }
                              });
                            }
                          }}
                          placeholder="0.0"
                          className="emrWeightInput"
                        />
                        <div className="emrWeightUnitSelect">
                          <button
                            type="button"
                            className={`emrWeightUnitBtn ${newVisit.clinicalExam?.lengthUnit === 'cm' ? 'emrWeightUnitActive' : ''}`}
                            onClick={() => setNewVisit({
                              ...newVisit,
                              clinicalExam: { ...newVisit.clinicalExam!, lengthUnit: 'cm' }
                            })}
                          >
                            cm
                          </button>
                          <button
                            type="button"
                            className={`emrWeightUnitBtn ${newVisit.clinicalExam?.lengthUnit === 'inches' ? 'emrWeightUnitActive' : ''}`}
                            onClick={() => setNewVisit({
                              ...newVisit,
                              clinicalExam: { ...newVisit.clinicalExam!, lengthUnit: 'inches' }
                            })}
                          >
                            inches
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Temperature Section */}
                    <div className="emrFormGroup" style={{ flex: 1 }}>
                      <label>Temperature</label>
                      <div className="emrWeightInputWrapper">
                        <input
                          type="text"
                          value={newVisit.clinicalExam?.temperature || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || /^\d*\.?\d*$/.test(value)) {
                              setNewVisit({
                                ...newVisit,
                                clinicalExam: { ...newVisit.clinicalExam!, temperature: parseFloat(value) || 0 }
                              });
                            }
                          }}
                          placeholder="0.0"
                          className="emrWeightInput"
                        />
                        <div className="emrWeightUnitSelect">
                          <button
                            type="button"
                            className={`emrWeightUnitBtn ${newVisit.clinicalExam?.tempUnit === 'C' ? 'emrWeightUnitActive' : ''}`}
                            onClick={() => setNewVisit({
                              ...newVisit,
                              clinicalExam: { ...newVisit.clinicalExam!, tempUnit: 'C' }
                            })}
                          >
                            °C
                          </button>
                          <button
                            type="button"
                            className={`emrWeightUnitBtn ${newVisit.clinicalExam?.tempUnit === 'F' ? 'emrWeightUnitActive' : ''}`}
                            onClick={() => setNewVisit({
                              ...newVisit,
                              clinicalExam: { ...newVisit.clinicalExam!, tempUnit: 'F' }
                            })}
                          >
                            °F
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="emrFormRow">
                    <div className="emrFormGroup">
                      <label>Heart Rate (per minute)</label>
                      <input
                        type="text"
                        value={newVisit.clinicalExam?.heartRate || ''}
                        onChange={(e) => setNewVisit({
                          ...newVisit,
                          clinicalExam: { ...newVisit.clinicalExam!, heartRate: e.target.value }
                        })}
                        placeholder="e.g., 80-120 or 100"
                        className="emrFormInput"
                      />
                      <small className="emrHelperText">Format: 80-120 (range) or 100 (single value)</small>
                    </div>

                    <div className="emrFormGroup">
                      <label>Breathing Rate (per minute)</label>
                      <input
                        type="text"
                        value={newVisit.clinicalExam?.breathingRate || ''}
                        onChange={(e) => setNewVisit({
                          ...newVisit,
                          clinicalExam: { ...newVisit.clinicalExam!, breathingRate: e.target.value }
                        })}
                        placeholder="e.g., 15-30 or 20"
                        className="emrFormInput"
                      />
                      <small className="emrHelperText">Format: 15-30 (range) or 20 (single value)</small>
                    </div>
                  </div>

                </div>

                {/* Neutered/Spayed Option */}
                {!neutered && (
                  <div className="emrFormRow">
                    <div className="emrFormGroup">
                      <label>Neutered/Spayed</label>
                      <div className="emrToggleGroupFull">
                        <button 
                          type="button"
                          className={`emrToggleBtnFull emrToggleYes ${newVisit.neutered ? 'emrToggleActiveFull' : ''}`}
                          onClick={() => setNewVisit({...newVisit, neutered: true})}
                        >
                          <IoCheckmarkCircleOutline size={14} /> Yes
                        </button>
                        <button 
                          type="button"
                          className={`emrToggleBtnFull emrToggleNo ${!newVisit.neutered ? 'emrToggleActiveFull' : ''}`}
                          onClick={() => setNewVisit({...newVisit, neutered: false})}
                        >
                          <IoCloseCircleOutline size={14} /> No
                        </button>
                      </div>
                      <small className="emrHelperText">This will update the pet's permanent record</small>
                    </div>
                  </div>
                )}
                
                {/* Vaccinated Option */}
                {!vaccinated && (
                  <div className="emrFormRow">
                    <div className="emrFormGroup">
                      <label>Vaccinated</label>
                      <div className="emrToggleGroupFull">
                        <button 
                          type="button"
                          className={`emrToggleBtnFull emrToggleYes ${newVisit.vaccinated ? 'emrToggleActiveFull' : ''}`}
                          onClick={() => setNewVisit({...newVisit, vaccinated: true})}
                        >
                          <IoCheckmarkCircleOutline size={14} /> Yes
                        </button>
                        <button 
                          type="button"
                          className={`emrToggleBtnFull emrToggleNo ${!newVisit.vaccinated ? 'emrToggleActiveFull' : ''}`}
                          onClick={() => setNewVisit({...newVisit, vaccinated: false})}
                        >
                          <IoCloseCircleOutline size={14} /> No
                        </button>
                      </div>
                      <small className="emrHelperText">This will update the pet's permanent record</small>
                    </div>
                  </div>
                )}

                {/* Deceased Option - Removed as requested */}
                
                {/* Doctor's Remarks */}
                <div className="emrFormRow" style={{ marginTop: '30px' }}>
                  <div className="emrFormGroup">
                    <RichTextEditor
                      value={newVisit.doctorRemarks}
                      onChange={(value) => setNewVisit({...newVisit, doctorRemarks: value})}
                      placeholder="Enter clinical notes... Use the toolbar to format text (Bold, Italic, Bullet points, Colors)"
                      rows={6}
                      label="Doctor's Remarks"
                    />
                  </div>
                </div>
                
                {isLaboratorySelected() && (
                  <div className="emrFormRow">
                    <div className="emrFormGroup emrFullWidth">
                      <button 
                        type="button"
                        className="emrCreateLabBtn"
                        onClick={() => {
                          // Close other panels, toggle lab panel
                          if (showServicesPanel) setShowServicesPanel(false);
                          if (showPrescriptionPanel) setShowPrescriptionPanel(false);
                          setShowLabPanel(!showLabPanel);
                        }}
                      >
                        <ImLab size={16} /> 
                        {showLabPanel ? 'Hide Laboratory Results' : 'Add Laboratory Results'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="emrFormRow">
                  <div className="emrFormGroup emrFullWidth">
                    <button 
                      type="button"
                      className="emrCreatePrescriptionBtn"
                      onClick={() => {
                        setShowServicesPanel(false);
                        setShowLabPanel(false);
                        setShowPrescriptionPanel(!showPrescriptionPanel);
                      }}
                    >
                      <TbReportMedical size={16} /> 
                      {showPrescriptionPanel ? 'Hide Prescription' : 'Create a Prescription'}
                    </button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="emrFormActions">
                  <button className="emrCancelBtn" onClick={() => setShowAddVisit(false)}>Cancel</button>
                  <button className="emrSubmitBtn" onClick={addNewVisit}>+ Add Visit</button>
                </div>
              </div>
            </div>

            {/* Right Panel - Dynamic Content */}
            {(showPrescriptionPanel || showLabPanel || showServicesPanel) && (
              <div className="emrAddVisitRightPanel">
                {/* Services Panel */}
                {showServicesPanel && (
                  <div className="emrRightPanelContent">
                    <div className="emrRightPanelHeader">
                      <h4>Additional Services</h4>
                      <button 
                        className="emrClosePanelBtn" 
                        onClick={() => setShowServicesPanel(false)}
                      >
                        <IoCloseOutline size={20} />
                      </button>
                    </div>
                    <div className="emrRightPanelBody">
                      <div className="emrServicesContainer">
                        <p style={{ fontSize: '12px', color: '#666', marginBottom: '16px' }}>
                          Select additional services to include in this visit:
                        </p>
                        {AVAILABLE_SERVICES.map(service => (
                          <div 
                            key={service.id}
                            className={`emrServiceItem ${selectedServices.find(s => s.id === service.id) ? 'emrServiceSelected' : ''}`}
                            onClick={() => toggleService(service)}
                          >
                            <div className="emrServiceInfo">
                              <div className="emrServiceName">{service.name}</div>
                              <div className="emrServiceDescription">{service.description}</div>
                            </div>
                            {selectedServices.find(s => s.id === service.id) && (
                              <IoCheckmarkCircleOutline size={20} color="#2e9e0c" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Prescription Panel */}
                {showPrescriptionPanel && (
                  <div className="emrRightPanelContent">
                    <div className="emrRightPanelHeader">
                      <h4>Prescription</h4>
                      <button 
                        className="emrClosePanelBtn" 
                        onClick={() => setShowPrescriptionPanel(false)}
                      >
                        <IoCloseOutline size={20} />
                      </button>
                    </div>
                    <div className="emrRightPanelBody">
                      <table className="emrPrescriptionTable">
                        <thead>
                          <tr>
                            <th>Medication Name</th>
                            <th>Dosage</th>
                            <th>Frequency</th>
                            <th>Duration</th>
                            <th style={{ width: '40px' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {(newVisit.prescriptions || []).map((pres) => (
                            <tr key={pres.id}>
                              <td>
                                <input
                                  type="text"
                                  value={pres.medicationName}
                                  onChange={(e) => updatePrescription(pres.id, 'medicationName', e.target.value)}
                                  placeholder="Medication name"
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  value={pres.dosage}
                                  onChange={(e) => updatePrescription(pres.id, 'dosage', e.target.value)}
                                  placeholder="e.g., 250mg"
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  value={pres.frequency}
                                  onChange={(e) => updatePrescription(pres.id, 'frequency', e.target.value)}
                                  placeholder="e.g., Twice daily"
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  value={pres.duration}
                                  onChange={(e) => updatePrescription(pres.id, 'duration', e.target.value)}
                                  placeholder="e.g., 7 days"
                                />
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="emrRemoveRowBtn"
                                  onClick={() => removePrescription(pres.id)}
                                >
                                  <IoTrashBinOutline size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                          {(newVisit.prescriptions || []).length === 0 && (
                            <tr>
                              <td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: '#999', fontSize: '14px' }}>
                                No medications added yet
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                      
                      <div className="emrInstructionsField">
                        <label>Instructions</label>
                        <textarea
                          value={newVisit.prescriptions?.[0]?.instructions || ''}
                          onChange={(e) => {
                            const instructions = e.target.value;
                            setNewVisit({
                              ...newVisit,
                              prescriptions: newVisit.prescriptions?.map(pres => ({ ...pres, instructions }))
                            });
                          }}
                          rows={4}
                          placeholder="Enter instructions for these medications..."
                          className="emrInstructionsTextarea"
                        />
                        <small className="emrHelperText">These instructions will apply to all medications in this prescription</small>
                      </div>
                      
                      <button
                        type="button"
                        className="emrAddMedicationBtn"
                        onClick={() => setShowMedicationModal(true)}
                      >
                        <IoAddCircleOutline size={16} /> Add Medication
                      </button>
                    </div>
                  </div>
                )}

                {/* Laboratory Panel */}
                {showLabPanel && (
                  <div className="emrRightPanelContent">
                    <div className="emrRightPanelHeader">
                      <h4>Laboratory Results</h4>
                      <button 
                        className="emrClosePanelBtn" 
                        onClick={() => setShowLabPanel(false)}
                      >
                        <IoCloseOutline size={20} />
                      </button>
                    </div>
                    <div className="emrRightPanelBody">
                      <div className="emrLabResultsContainer">
                        {(newVisit.labResults || []).map((lab, index) => (
                          <div key={lab.id} className="emrLabResultCard">
                            <div className="emrLabResultHeader">
                              <strong>Test #{index + 1}</strong>
                              <button
                                type="button"
                                className="emrRemoveLabBtn"
                                onClick={() => removeLabResult(lab.id)}
                              >
                                <IoTrashBinOutline size={14} /> Remove
                              </button>
                            </div>
                            <div className="emrFormRow">
                              <div className="emrFormGroup">
                                <label>Test Type</label>
                                <select
                                  value={lab.testType}
                                  onChange={(e) => updateLabResult(lab.id, 'testType', e.target.value)}
                                  className="emrFormSelect"
                                >
                                  {LAB_TEST_TYPES.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <div className="emrFormRow">
                              <div className="emrFormGroup">
                                <label>Upload Result File/Image</label>
                                <div className="emrFileUploadWrapper">
                                  <input
                                    type="file"
                                    id={`lab-file-${lab.id}`}
                                    accept="image/*,.pdf,.doc,.docx"
                                    onChange={(e) => {
                                      if (e.target.files && e.target.files[0]) {
                                        handleFileUpload(lab.id, e.target.files[0]);
                                      }
                                    }}
                                    className="emrFileInput"
                                  />
                                  <label htmlFor={`lab-file-${lab.id}`} className="emrFileUploadBtn" style={{color: '#ffffff'}}>
                                    <IoCloudUploadOutline size={16} /> Upload File
                                  </label>
                                  {lab.fileName && (
                                    <span className="emrFileName">{lab.fileName}</span>
                                  )}
                                  {lab.fileData && (
                                    <button
                                      type="button"
                                      className="emrViewFileBtn"
                                      onClick={() => {
                                        const win = window.open();
                                        if (win) {
                                          win.document.write(`<img src="${lab.fileData}" style="max-width: 100%;" />`);
                                        }
                                      }}
                                    >
                                      <IoEyeOutline size={12} /> View
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="emrFormRow">
                              <div className="emrFormGroup">
                                <label>Interpretation</label>
                                <textarea
                                  value={lab.interpretation}
                                  onChange={(e) => updateLabResult(lab.id, 'interpretation', e.target.value)}
                                  rows={3}
                                  placeholder="Enter interpretation of results..."
                                  className="emrTextarea"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                        <button
                          type="button"
                          className="emrAddLabBtn"
                          onClick={addLabResult}
                        >
                          <IoAddCircleOutline size={16} /> Add Lab Result
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Medication Selection Modal */}
      {showMedicationModal && (
        <div className="emrModalOverlay" onClick={() => setShowMedicationModal(false)}>
          <div className="emrSearchModal" onClick={e => e.stopPropagation()}>
            <div className="emrModalHeader">
              <h4>Select Medication</h4>
              <button className="emrModalClose" onClick={() => setShowMedicationModal(false)}>×</button>
            </div>
            <div className="emrSearchModalContent">
              <div className="emrSearchInputWrapper">
                <input
                  type="text"
                  placeholder="Search by medication name, dosage, or frequency..."
                  value={medicationSearchQuery}
                  onChange={(e) => filterMedications(e.target.value)}
                  className="emrSearchInput"
                />
                <IoSearchSharp size={18} className="emrSearchIcon" />
              </div>

              <div className="emrSearchResults" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {filteredMedications.length > 0 ? (
                  filteredMedications.map(med => (
                    <div 
                      key={med.id} 
                      className={`emrSearchResultItem ${med.id === 'other' ? 'emrOtherMedicationOption' : ''}`}
                      onClick={() => addPrescriptionFromTemplate(med)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="emrSearchResultIcon" style={med.id === 'other' ? { backgroundColor: '#e8f5e9', color: '#2e7d32' } : {}}>
                        {med.id === 'other' ? <IoAddCircleOutline size={20} /> : <IoMedkitOutline size={20} />}
                      </div>
                      <div className="emrSearchResultInfo">
                        <div className="emrSearchResultName" style={med.id === 'other' ? { color: '#2e7d32', fontWeight: 600 } : {}}>
                          {med.id === 'other' ? 'Other (Add Custom Medication)' : `${med.name} - ${med.dosage}`}
                        </div>
                        {med.id !== 'other' && (
                          <div className="emrSearchResultDetails">
                            {med.frequency} • Duration: {med.duration}
                          </div>
                        )}
                        {med.id === 'other' && (
                          <div className="emrSearchResultDetails" style={{ color: '#666', fontStyle: 'italic' }}>
                            If the medication you want to prescribe is not in the list, select this option to add a custom medication with your own specifications.
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="emrSearchNoResults">
                    <p>No medications found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vaccination Proof Modal */}
      {showVaccinationProof && (
        <div className="emrModalOverlay" onClick={() => setShowVaccinationProof(false)}>
          <div className="emrProofModal" onClick={e => e.stopPropagation()}>
            <div className="emrModalHeader">
              <h4>Vaccination Proof</h4>
              <button className="emrModalClose" onClick={() => setShowVaccinationProof(false)}>×</button>
            </div>
            <div className="emrProofContent">
              <div className="emrProofPlaceholder">
                <IoDocumentTextOutline size={48} />
                <p>Vaccination Certificate</p>
                <a href={selectedVaccinationProof} target="_blank" rel="noopener noreferrer" className="emrProofLink">
                  View Document
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {modalVisible && (
        <div className="emrModalOverlay">
          <div className="emrAlertModal">
            <div className="emrAlertIcon">
              {modalConfig.type === 'success' && <IoCheckmarkCircleOutline size={45} color="#2e9e0c" />}
              {modalConfig.type === 'error' && <IoCloseCircleOutline size={45} color="#d93025" />}
              {modalConfig.type !== 'success' && modalConfig.type !== 'error' && <IoAlertCircleOutline size={45} color="#3d67ee" />}
            </div>
            <h4 className="emrAlertTitle">{modalConfig.title}</h4>
            <div className="emrAlertMessage">
              {typeof modalConfig.message === 'string' ? modalConfig.message : modalConfig.message}
            </div>
            <div className="emrAlertActions">
              {modalConfig.showCancel && (
                <button onClick={() => setModalVisible(false)} className="emrAlertBtn emrCancelAlertBtn">
                  Cancel
                </button>
              )}
              <button 
                onClick={() => {
                  setModalVisible(false);
                  if (modalConfig.onConfirm) modalConfig.onConfirm();
                }}
                className={`emrAlertBtn emrConfirmAlertBtn ${modalConfig.type === 'error' ? 'emrErrorBtn' : ''}`}
              >
                {modalConfig.type === 'confirm' ? 'Confirm' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalEMR;
