import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../reusable_components/NavBar';
import Notifications from '../reusable_components/Notifications';
import { HiOutlineClipboardDocumentList } from "react-icons/hi2";
import './GlobalEMR.css';
import { 
  IoSearchSharp,
  IoFilterSharp,
  IoAdd,
  IoPencilSharp,
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
  IoAttachOutline,
  IoCloudUploadOutline,
  IoTrashBinOutline,
  IoImageOutline,
  IoMedkitOutline,
  IoCalendarOutline,
  IoTimeSharp
} from 'react-icons/io5';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

interface LabResult {
  id: string;
  testType: string;
  fileName: string;
  fileUrl: string;
  fileData?: string; // Base64 data for preview
  interpretation: string;
}

interface Prescription {
  id: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  prescribedDate: string;
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
  pregnant?: boolean;
  pregnancyMonths?: number;
  pregnancyDays?: number;
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
  pregnant?: boolean;
  pregnancyMonths?: number;
  pregnancyDays?: number;
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
  message: string | JSX.Element;
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
  pregnant?: boolean;
  pregnancyMonths?: number;
  pregnancyDays?: number;
  vaccinationProof?: string;
  image?: string;
  hasExistingRecord?: boolean;
  existingRecordId?: number;
  deceased?: boolean;
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
  'Routine Checkup', 'Vaccination', 'Sick Visit', 'Injury', 
  'Surgery', 'Dental Care', 'Grooming', 'Follow-up', 'Emergency', 'Laboratory', 'Others'
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

// Mock data for pet search with existing records and images
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
    pregnant: false,
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
    pregnant: false,
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
    pregnant: false,
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
      pregnant: false,
      doctorRemarks: '',
      doctorAssigned: 'Dr. Michael Chen',
      reasonForVisit: 'Vaccination'
    }
  }
];

const GlobalEMR: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  
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
  const [activeTab, setActiveTab] = useState<'info' | 'visits'>('info');
  const [petImage, setPetImage] = useState<string>('');
  const [petImageFile, setPetImageFile] = useState<File | null>(null);
  const [lastWeight, setLastWeight] = useState<{ value: number; unit: 'kg' | 'lbs' } | null>(null);
  
  // Pregnancy state
  const [pregnancyMonths, setPregnancyMonths] = useState<number>(0);
  const [pregnancyDays, setPregnancyDays] = useState<number>(0);
  const [pregnancyUnit, setPregnancyUnit] = useState<'months' | 'days'>('months');
  
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
    pregnant: false,
    pregnancyMonths: 0,
    pregnancyDays: 0,
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
    prescriptions: []
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

  const addPrescription = () => {
    const newPrescription: Prescription = {
      id: Date.now().toString(),
      medicationName: '',
      dosage: '',
      frequency: '',
      duration: '',
      instructions: '',
      prescribedDate: new Date().toISOString().split('T')[0]
    };
    setNewVisit({
      ...newVisit,
      prescriptions: [...(newVisit.prescriptions || []), newPrescription]
    });
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

  const generatePatientPDF = (record: MedicalRecord) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    let yPos = 20;

    doc.setFillColor(61, 103, 238);
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('Medical Record', margin, 22);
    
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, 32);
    
    doc.setTextColor(0, 0, 0);
    yPos = 45;

    doc.setFillColor(245, 247, 250);
    doc.rect(margin - 2, yPos - 4, pageWidth - (margin * 2) + 4, 12, 'F');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(61, 103, 238);
    doc.text(`Patient ID: ${record.patientId}`, margin, yPos);
    yPos += 10;
    
    if (record.deceased) {
      doc.setFillColor(198, 40, 40);
      doc.rect(pageWidth - margin - 35, yPos - 6, 35, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text('DECEASED', pageWidth - margin - 30, yPos - 1);
      doc.setTextColor(0, 0, 0);
    }
    yPos += 8;

    // Pet Information Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(61, 103, 238);
    doc.text('🐾 Pet Information', margin, yPos);
    yPos += 4;
    
    doc.setDrawColor(61, 103, 238);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    
    const petDetails = record.petDetails;
    const petInfo = [
      ['Pet Name', record.petName],
      ['Species', petDetails?.species || 'N/A'],
      ['Breed', petDetails?.breed || 'N/A'],
      ['Gender', petDetails?.gender || 'N/A'],
      ['Date of Birth', petDetails?.dateOfBirth || 'N/A'],
      ['Age', petDetails?.age || 'N/A'],
      ['Weight', petDetails?.weight ? `${petDetails.weight} ${petDetails.weightUnit}` : 'N/A'],
      ['Color/Markings', petDetails?.colorMarkings || 'N/A'],
      ['Neutered/Spayed', petDetails?.neutered ? 'Yes' : 'No'],
      ['Vaccinated', petDetails?.vaccinated ? 'Yes' : 'No'],
      ...(petDetails?.gender === 'Female' && petDetails?.pregnant !== undefined ? [['Pregnant', petDetails.pregnant ? `Yes${petDetails.pregnancyMonths ? ` (${petDetails.pregnancyMonths} months${petDetails.pregnancyDays ? `, ${petDetails.pregnancyDays} days` : ''})` : ''}` : 'No']] : [])
    ];

    autoTable(doc, {
      startY: yPos,
      margin: { left: margin, right: margin },
      body: petInfo,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 3, lineColor: [221, 221, 221], lineWidth: 0.1 },
      columnStyles: { 0: { fontStyle: 'bold', textColor: [100, 100, 100], cellWidth: 45 }, 1: { cellWidth: 'auto' } },
      didDrawCell: (data) => {
        if (data.row.index % 2 === 0 && data.section === 'body') {
          doc.setFillColor(250, 250, 250);
          doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
        }
      }
    });

    yPos = (doc as any).lastAutoTable.finalY + 8;

    // Owner Information Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(61, 103, 238);
    doc.text('👤 Owner Information', margin, yPos);
    yPos += 4;
    
    doc.setDrawColor(61, 103, 238);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;

    const ownerInfo = [
      ['Owner Name', record.ownerName],
      ['Email', record.ownerEmail],
      ['Contact Number', record.ownerContact]
    ];

    autoTable(doc, {
      startY: yPos,
      margin: { left: margin, right: margin },
      body: ownerInfo,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 3, lineColor: [221, 221, 221], lineWidth: 0.1 },
      columnStyles: { 0: { fontStyle: 'bold', textColor: [100, 100, 100], cellWidth: 45 }, 1: { cellWidth: 'auto' } },
      didDrawCell: (data) => {
        if (data.row.index % 2 === 0 && data.section === 'body') {
          doc.setFillColor(250, 250, 250);
          doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
        }
      }
    });

    yPos = (doc as any).lastAutoTable.finalY + 8;

    // Visit Records Section
    if (record.visitHistory && record.visitHistory.length > 0) {
      for (const visit of record.visitHistory) {
        if (yPos > 240) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(61, 103, 238);
        doc.text(`Visit: ${visit.date} at ${visit.time}`, margin, yPos);
        yPos += 6;
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        
        const visitInfo = [
          ['Veterinarian', visit.veterinarian],
          ['Reason', visit.reason],
          ['Weight', `${visit.weight} ${visit.weightUnit}`],
          ...(visit.clinicalExam ? [
            ['Length', `${visit.clinicalExam.length} ${visit.clinicalExam.lengthUnit}`],
            ['Temperature', `${visit.clinicalExam.temperature}°${visit.clinicalExam.tempUnit}`],
            ['Heart Rate', `${visit.clinicalExam.heartRate}/minute`],
            ['Breathing Rate', `${visit.clinicalExam.breathingRate}/minute`],
            ['Additional Findings', visit.clinicalExam.additionalFindings || 'N/A']
          ] : []),
          ...(visit.pregnant !== undefined ? [['Pregnant', visit.pregnant ? `Yes${visit.pregnancyMonths ? ` (${visit.pregnancyMonths} months${visit.pregnancyDays ? `, ${visit.pregnancyDays} days` : ''})` : ''}` : 'No']] : []),
          ...(visit.prescriptions && visit.prescriptions.length > 0 ? [['Prescriptions', `${visit.prescriptions.length} medication(s) prescribed`]] : []),
          ...(visit.labResults && visit.labResults.length > 0 ? [['Lab Results', `${visit.labResults.length} test(s) performed`]] : []),
          ['Remarks', visit.doctorRemarks || 'N/A']
        ];

        autoTable(doc, {
          startY: yPos,
          margin: { left: margin, right: margin },
          body: visitInfo,
          theme: 'plain',
          styles: { fontSize: 9, cellPadding: 3, lineColor: [221, 221, 221], lineWidth: 0.1 },
          columnStyles: { 0: { fontStyle: 'bold', textColor: [100, 100, 100], cellWidth: 35 }, 1: { cellWidth: 'auto' } }
        });

        yPos = (doc as any).lastAutoTable.finalY + 8;
      }
    }

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Generated by ${record.veterinarian || 'Veterinary System'}`, margin, doc.internal.pageSize.getHeight() - 10);
    }

    const pdfDataUrl = doc.output('dataurlstring');
    window.open(pdfDataUrl, '_blank');
  };

  const generatePrescriptionPDF = (visit: VisitHistory, petName: string, ownerName: string, recordId: string) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let yPos = 20;

  // Header with blue background
  doc.setFillColor(61, 103, 238);
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Prescription', margin, 22);
  
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin, 32);
  doc.text(`Prescription ID: ${visit.id}`, margin, 38);
  
  doc.setTextColor(0, 0, 0);
  yPos = 50;

  // Pet and Owner Information
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(61, 103, 238);
  doc.text('Patient Information', margin, yPos);
  yPos += 6;
  
  doc.setDrawColor(61, 103, 238);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 6;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  
  doc.text(`Pet Name: ${petName}`, margin, yPos);
  yPos += 5;
  doc.text(`Owner: ${ownerName}`, margin, yPos);
  yPos += 5;
  doc.text(`Visit Date: ${visit.date} at ${visit.time}`, margin, yPos);
  yPos += 5;
  doc.text(`Veterinarian: ${visit.veterinarian}`, margin, yPos);
  yPos += 10;

  // Prescription Section
  if (visit.prescriptions && visit.prescriptions.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(61, 103, 238);
    doc.text('Prescribed Medications', margin, yPos);
    yPos += 6;
    
    doc.setDrawColor(61, 103, 238);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    
    let presIndex = 1;
    for (const pres of visit.prescriptions) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFont('helvetica', 'bold');
      doc.text(`${presIndex}. ${pres.medicationName}`, margin, yPos);
      yPos += 5;
      
      doc.setFont('helvetica', 'normal');
      doc.text(`   Dosage: ${pres.dosage}`, margin, yPos);
      yPos += 4;
      doc.text(`   Frequency: ${pres.frequency}`, margin, yPos);
      yPos += 4;
      doc.text(`   Duration: ${pres.duration}`, margin, yPos);
      yPos += 4;
      
      if (pres.instructions) {
        doc.setFont('helvetica', 'italic');
        doc.text(`   Instructions: ${pres.instructions}`, margin, yPos);
        yPos += 5;
        doc.setFont('helvetica', 'normal');
      }
      
      doc.text(`   Prescribed Date: ${pres.prescribedDate || visit.date}`, margin, yPos);
      yPos += 8;
      presIndex++;
    }
  } else {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text('No prescriptions recorded for this visit.', margin, yPos);
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated by ${visit.veterinarian} - Veterinary System`, margin, doc.internal.pageSize.getHeight() - 10);
    doc.text(`Record ID: ${recordId}`, pageWidth - margin - 30, doc.internal.pageSize.getHeight() - 10);
  }

  const pdfDataUrl = doc.output('dataurlstring');
  window.open(pdfDataUrl, '_blank');
};

  const showAlert = (
    type: ModalConfig['type'], 
    title: string, 
    message: string | JSX.Element, 
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

  const addNewVisit = () => {
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
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      veterinarian: newVisit.veterinarian,
      reason: newVisit.reason,
      doctorRemarks: newVisit.doctorRemarks,
      weight: finalWeight,
      weightUnit: finalWeightUnit,
      sameAsLastWeight: newVisit.sameAsLastWeight,
      neutered: newVisit.neutered,
      vaccinated: newVisit.vaccinated,
      deceased: newVisit.deceased,
      pregnant: newVisit.pregnant,
      pregnancyMonths: newVisit.pregnancyMonths,
      pregnancyDays: newVisit.pregnancyDays,
      clinicalExam: newVisit.clinicalExam,
      labResults: newVisit.labResults,
      prescriptions: newVisit.prescriptions
    };
    setVisitHistory([...visitHistory, newVisitEntry]);
    
    if (newVisit.neutered && !neutered) setNeutered(true);
    if (newVisit.vaccinated && !vaccinated) setVaccinated(true);
    if (newVisit.deceased && !deceased) setDeceased(true);
    if (newVisit.pregnant !== undefined && newVisit.pregnant !== (pregnancyMonths > 0 || pregnancyDays > 0)) {
      setPregnancyMonths(newVisit.pregnancyMonths || 0);
      setPregnancyDays(newVisit.pregnancyDays || 0);
    }
    
    setShowAddVisit(false);
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
      pregnant: false,
      pregnancyMonths: 0,
      pregnancyDays: 0,
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
      prescriptions: []
    });
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
    setPregnancyMonths(pet.pregnancyMonths || 0);
    setPregnancyDays(pet.pregnancyDays || 0);
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
        setPregnancyMonths(record.petDetails.pregnancyMonths || 0);
        setPregnancyDays(record.petDetails.pregnancyDays || 0);
        setVaccinationProof(record.petDetails.vaccinationProof || '');
        setPetImage(record.petDetails.image || '');
        
        if (record.visitHistory && record.visitHistory.length > 0) {
          const lastVisit = record.visitHistory[record.visitHistory.length - 1];
          setLastWeight({ value: lastVisit.weight, unit: lastVisit.weightUnit });
        }
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
    setPregnancyMonths(0);
    setPregnancyDays(0);
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
  };

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
        pregnant: gender === 'Female' ? (pregnancyMonths > 0 || pregnancyDays > 0) : undefined,
        pregnancyMonths: gender === 'Female' ? pregnancyMonths : undefined,
        pregnancyDays: gender === 'Female' ? pregnancyDays : undefined,
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

  const breedOptions = species === 'Dog' ? DOG_BREEDS : CAT_BREEDS;

  const handleViewRecord = (record: MedicalRecord) => {
    generatePatientPDF(record);
  };

  const getLastWeight = () => {
    if (visitHistory.length > 0) {
      const lastVisit = visitHistory[visitHistory.length - 1];
      return { value: lastVisit.weight, unit: lastVisit.weightUnit };
    }
    return null;
  };

  const isPregnant = pregnancyMonths > 0 || pregnancyDays > 0;

  return (
    <div className="emrContainer">
      {showModeOverlay && viewMode !== 'list' && (
        <div className="emrToast">
          <div className="emrToastContent">
            <div className="emrToastIcon">
              {viewMode === 'add' ? <IoCreateOutline size={18} /> : <IoPencilSharp size={18} />}
            </div>
            <span className="emrToastMessage">
              {viewMode === 'add' ? 'Creating a Medical Record' : 'Editing a Medical Record'}
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
              <IoMedicalOutline size={20} className="emrBlueIcon" />
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
                                    <IoPencilSharp size={14} />
                                  </button>
                                  <button 
                                    className="emrActionBtn" 
                                    onClick={() => handleViewRecord(record)}
                                    title="View & Download PDF"
                                  >
                                    <IoEyeOutline size={14} />
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

                    {gender === 'Female' && (
                      <div className="emrFormGroup">
                        <label>Pregnant</label>
                        <div className="emrToggleGroupFull">
                          <button 
                            type="button"
                            className={`emrToggleBtnFull emrToggleYes ${isPregnant ? 'emrToggleActiveFull' : ''}`}
                            onClick={() => {
                              if (!isPregnant) {
                                setPregnancyMonths(1);
                              } else {
                                setPregnancyMonths(0);
                                setPregnancyDays(0);
                              }
                            }}
                          >
                            <IoCheckmarkCircleOutline size={14} /> Yes
                          </button>
                          <button 
                            type="button"
                            className={`emrToggleBtnFull emrToggleNo ${!isPregnant ? 'emrToggleActiveFull' : ''}`}
                            onClick={() => {
                              setPregnancyMonths(0);
                              setPregnancyDays(0);
                            }}
                          >
                            <IoCloseCircleOutline size={14} /> No
                          </button>
                        </div>
                        {isPregnant && (
                          <div className="emrPregnancyDetails">
                            <input
                              type="number"
                              min="0"
                              max="12"
                              value={pregnancyMonths}
                              onChange={(e) => setPregnancyMonths(parseInt(e.target.value) || 0)}
                              placeholder="Months"
                              className="emrFormInput emrMarginTop"
                              style={{ width: '48%', marginRight: '4%' }}
                            />
                            <input
                              type="number"
                              min="0"
                              max="30"
                              value={pregnancyDays}
                              onChange={(e) => setPregnancyDays(parseInt(e.target.value) || 0)}
                              placeholder="Days"
                              className="emrFormInput emrMarginTop"
                              style={{ width: '48%' }}
                            />
                          </div>
                        )}
                      </div>
                    )}

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
                  <IoPencilSharp size={20} className="emrHeaderIcon" />
                  <h3>Edit Medical Record</h3>
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
              </div>

              <div className="emrFormContent">
                {activeTab === 'info' && (
                  <>
                    <div className="emrFormSection">
                      <h4>Pet Information</h4>
                      {/* Pet Image Display */}
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

                        {gender === 'Female' && (
                          <div className="emrFormGroup">
                            <label>Pregnant</label>
                            <div className="emrToggleGroupFull">
                              <button 
                                type="button"
                                className={`emrToggleBtnFull emrToggleYes ${isPregnant ? 'emrToggleActiveFull' : ''}`}
                                onClick={() => {
                                  if (editModeEnabled) {
                                    if (!isPregnant) {
                                      setPregnancyMonths(1);
                                    } else {
                                      setPregnancyMonths(0);
                                      setPregnancyDays(0);
                                    }
                                  }
                                }}
                                disabled={!editModeEnabled}
                              >
                                <IoCheckmarkCircleOutline size={14} /> Yes
                              </button>
                              <button 
                                type="button"
                                className={`emrToggleBtnFull emrToggleNo ${!isPregnant ? 'emrToggleActiveFull' : ''}`}
                                onClick={() => {
                                  if (editModeEnabled) {
                                    setPregnancyMonths(0);
                                    setPregnancyDays(0);
                                  }
                                }}
                                disabled={!editModeEnabled}
                              >
                                <IoCloseCircleOutline size={14} /> No
                              </button>
                            </div>
                            {isPregnant && editModeEnabled && (
                              <div className="emrPregnancyDetails">
                                <input
                                  type="number"
                                  min="0"
                                  max="12"
                                  value={pregnancyMonths}
                                  onChange={(e) => setPregnancyMonths(parseInt(e.target.value) || 0)}
                                  placeholder="Months"
                                  className="emrFormInput emrMarginTop"
                                  style={{ width: '48%', marginRight: '4%' }}
                                  disabled={!editModeEnabled}
                                />
                                <input
                                  type="number"
                                  min="0"
                                  max="30"
                                  value={pregnancyDays}
                                  onChange={(e) => setPregnancyDays(parseInt(e.target.value) || 0)}
                                  placeholder="Days"
                                  className="emrFormInput emrMarginTop"
                                  style={{ width: '48%' }}
                                  disabled={!editModeEnabled}
                                />
                              </div>
                            )}
                          </div>
                        )}

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
                          <div key={visit.id} className="emrVisitCard">
                            <div className="emrVisitHeader">
                              <div className="emrVisitDate">
                                <IoTimeOutline size={14} />
                                <span>{visit.date} at {visit.time}</span>
                              </div>
                              <div className="emrVisitNumber">Visit #{visitHistory.length - index}</div>
                            </div>
                            <div className="emrVisitDetails">
                              <div><strong>Veterinarian:</strong> {visit.veterinarian}</div>
                              <div><strong>Reason:</strong> {visit.reason}</div>
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
                              {visit.pregnant !== undefined && (
                                <div><strong>Pregnant:</strong> {visit.pregnant ? `Yes${visit.pregnancyMonths ? ` (${visit.pregnancyMonths} months${visit.pregnancyDays ? `, ${visit.pregnancyDays} days` : ''})` : ''}` : 'No'}</div>
                              )}
                              
                              {/* Prescriptions Section with View PDF Button */}
                              {visit.prescriptions && visit.prescriptions.length > 0 && (
                                <div className="emrFullWidth">
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <strong>Prescriptions:</strong>
                                    <button 
                                      className="emrViewFileBtn"
                                      onClick={() => generatePrescriptionPDF(visit, petName, `${ownerFirstName} ${ownerLastName}`, patientId)}
                                      style={{ padding: '4px 12px' }}
                                    >
                                      <IoDocumentTextOutline size={12} /> View Prescription PDF
                                    </button>
                                  </div>
                                  {visit.prescriptions.map((pres, idx) => (
                                    <div key={pres.id} className="emrPrescriptionItem">
                                      • {pres.medicationName} - {pres.dosage}, {pres.frequency} for {pres.duration}
                                      {pres.instructions && <div className="emrPrescriptionInstructions">{pres.instructions}</div>}
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              {visit.labResults && visit.labResults.length > 0 && (
                                <div className="emrFullWidth">
                                  <strong>Lab Results:</strong> {visit.labResults.length} test(s) performed
                                </div>
                              )}
                              <div className="emrFullWidth"><strong>Remarks:</strong> {visit.doctorRemarks}</div>
                            </div>
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
              </div>

              <div className="emrFormActions">
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

      {/* Add Visit Modal */}
      {showAddVisit && !deceased && (
        <div className="emrModalOverlay" onClick={() => setShowAddVisit(false)}>
          <div className="emrAddVisitModal emrLargeModal" onClick={e => e.stopPropagation()}>
            <div className="emrModalHeader">
              <h4>Add New Visit</h4>
              <button className="emrModalClose" onClick={() => setShowAddVisit(false)}>×</button>
            </div>
            <div className="emrAddVisitContent">
              {/* Basic Information */}
              <div className="emrFormRow">
                <div className="emrFormGroup">
                  <label>Veterinarian</label>
                  <select
                    value={newVisit.veterinarian}
                    onChange={(e) => setNewVisit({...newVisit, veterinarian: e.target.value})}
                    className="emrFormSelect"
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
                  >
                    {REASONS.map(reason => (
                      <option key={reason} value={reason}>{reason}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Weight Section */}
              <div className="emrFormRow">
                <div className="emrFormGroup">
                  <label>Weight</label>
                  <div className="emrWeightInputWrapper">
                    <input
                      type="text"
                      value={newVisit.sameAsLastWeight && getLastWeight() 
                        ? getLastWeight()?.value || '' 
                        : newVisit.weight || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow numbers and decimal point
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
                    <label className="emrCheckboxLabel" style={{ marginTop: '8px' }}>
                      <input
                        type="checkbox"
                        checked={newVisit.sameAsLastWeight}
                        onChange={(e) => setNewVisit({...newVisit, sameAsLastWeight: e.target.checked})}
                      />
                      Same as last appointment ({getLastWeight()?.value} {getLastWeight()?.unit})
                    </label>
                  )}
                </div>
              </div>

              {/* Clinical Exam Section */}
              <div className="emrFormSection">
                <h4>Clinical Examination</h4>
                <div className="emrFormRow">
                  <div className="emrFormGroup">
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
                  <div className="emrFormGroup">
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

                <div className="emrFormRow">
                  <div className="emrFormGroup">
                    <label>Additional Findings</label>
                    <textarea
                      value={newVisit.clinicalExam?.additionalFindings || ''}
                      onChange={(e) => setNewVisit({
                        ...newVisit,
                        clinicalExam: { ...newVisit.clinicalExam!, additionalFindings: e.target.value }
                      })}
                      rows={3}
                      placeholder="Enter any additional clinical findings..."
                      className="emrTextarea"
                    />
                  </div>
                </div>
              </div>

              {/* Pregnant Option */}
              <div className="emrFormRow">
                <div className="emrFormGroup">
                  <label>Pregnant</label>
                  <div className="emrToggleGroupFull">
                    <button 
                      type="button"
                      className={`emrToggleBtnFull emrToggleYes ${newVisit.pregnant ? 'emrToggleActiveFull' : ''}`}
                      onClick={() => setNewVisit({...newVisit, pregnant: true})}
                    >
                      <IoCheckmarkCircleOutline size={14} /> Yes
                    </button>
                    <button 
                      type="button"
                      className={`emrToggleBtnFull emrToggleNo ${!newVisit.pregnant ? 'emrToggleActiveFull' : ''}`}
                      onClick={() => setNewVisit({...newVisit, pregnant: false, pregnancyMonths: 0, pregnancyDays: 0})}
                    >
                      <IoCloseCircleOutline size={14} /> No
                    </button>
                  </div>
                  {newVisit.pregnant && (
                    <div className="emrPregnancyInputWrapper">
                      <div className="emrPregnancyTabs">
                        <button 
                          type="button"
                          className={`emrPregnancyTab ${pregnancyUnit === 'months' ? 'emrPregnancyTabActive' : ''}`}
                          onClick={() => setPregnancyUnit('months')}
                        >
                          Months
                        </button>
                        <button 
                          type="button"
                          className={`emrPregnancyTab ${pregnancyUnit === 'days' ? 'emrPregnancyTabActive' : ''}`}
                          onClick={() => setPregnancyUnit('days')}
                        >
                          Days
                        </button>
                      </div>
                      <div className="emrFormRow">
                        <div className="emrFormGroup">
                          <label>Pregnancy {pregnancyUnit === 'months' ? 'Months' : 'Days'}</label>
                          <div className="emrWeightInputWrapper">
                            <input
                              type="number"
                              min="0"
                              max={pregnancyUnit === 'months' ? "12" : "30"}
                              step="1"
                              value={pregnancyUnit === 'months' ? newVisit.pregnancyMonths : newVisit.pregnancyDays}
                              onChange={(e) => {
                                const value = parseInt(e.target.value) || 0;
                                if (pregnancyUnit === 'months') {
                                  setNewVisit({...newVisit, pregnancyMonths: value});
                                } else {
                                  setNewVisit({...newVisit, pregnancyDays: value});
                                }
                              }}
                              placeholder={pregnancyUnit === 'months' ? "Enter months" : "Enter days"}
                              className="emrWeightInput"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
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
              
              {/* Deceased Option */}
              {!deceased && (
                <div className="emrFormRow">
                  <div className="emrFormGroup">
                    <label>Deceased</label>
                    <div className="emrToggleGroupFull">
                      <button 
                        type="button"
                        className={`emrToggleBtnFull emrToggleYes ${newVisit.deceased ? 'emrToggleActiveFull' : ''}`}
                        onClick={() => setNewVisit({...newVisit, deceased: true})}
                      >
                        <IoAlertCircleOutline size={14} /> Yes
                      </button>
                      <button 
                        type="button"
                        className={`emrToggleBtnFull emrToggleNo ${!newVisit.deceased ? 'emrToggleActiveFull' : ''}`}
                        onClick={() => setNewVisit({...newVisit, deceased: false})}
                      >
                        <IoCheckmarkCircleOutline size={14} /> No
                      </button>
                    </div>
                    <small className="emrHelperText">This will mark the pet as deceased</small>
                  </div>
                </div>
              )}

              {/* Prescription Section */}
              <div className="emrFormSection">
                <h4>Prescriptions</h4>
                <div className="emrPrescriptionsContainer">
                  {(newVisit.prescriptions || []).map((pres, index) => (
                    <div key={pres.id} className="emrPrescriptionCard">
                      <div className="emrPrescriptionHeader">
                        <strong>Medication #{index + 1}</strong>
                        <button
                          type="button"
                          className="emrRemovePrescriptionBtn"
                          onClick={() => removePrescription(pres.id)}
                        >
                          <IoTrashBinOutline size={14} /> Remove
                        </button>
                      </div>
                      <div className="emrFormRow">
                        <div className="emrFormGroup">
                          <label>Medication Name</label>
                          <input
                            type="text"
                            value={pres.medicationName}
                            onChange={(e) => updatePrescription(pres.id, 'medicationName', e.target.value)}
                            placeholder="e.g., Amoxicillin"
                            className="emrFormInput"
                          />
                        </div>
                        <div className="emrFormGroup">
                          <label>Dosage</label>
                          <input
                            type="text"
                            value={pres.dosage}
                            onChange={(e) => updatePrescription(pres.id, 'dosage', e.target.value)}
                            placeholder="e.g., 250mg"
                            className="emrFormInput"
                          />
                        </div>
                      </div>
                      <div className="emrFormRow">
                        <div className="emrFormGroup">
                          <label>Frequency</label>
                          <input
                            type="text"
                            value={pres.frequency}
                            onChange={(e) => updatePrescription(pres.id, 'frequency', e.target.value)}
                            placeholder="e.g., Twice daily"
                            className="emrFormInput"
                          />
                        </div>
                        <div className="emrFormGroup">
                          <label>Duration</label>
                          <input
                            type="text"
                            value={pres.duration}
                            onChange={(e) => updatePrescription(pres.id, 'duration', e.target.value)}
                            placeholder="e.g., 7 days"
                            className="emrFormInput"
                          />
                        </div>
                      </div>
                      <div className="emrFormRow">
                        <div className="emrFormGroup">
                          <label>Instructions</label>
                          <textarea
                            value={pres.instructions}
                            onChange={(e) => updatePrescription(pres.id, 'instructions', e.target.value)}
                            rows={2}
                            placeholder="Additional instructions (e.g., take with food)"
                            className="emrTextarea"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="emrAddPrescriptionBtn"
                    onClick={addPrescription}
                  >
                    <IoAddCircleOutline size={16} /> Add Prescription
                  </button>
                </div>
              </div>

              {/* Laboratory Section */}
              {newVisit.reason === 'Laboratory' && (
                <div className="emrFormSection">
                  <h4>Laboratory Results</h4>
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
              )}
              
              {/* Doctor's Remarks */}
              <div className="emrFormRow">
                <div className="emrFormGroup">
                  <label>Doctor's Remarks</label>
                  <textarea
                    value={newVisit.doctorRemarks}
                    onChange={(e) => setNewVisit({...newVisit, doctorRemarks: e.target.value})}
                    rows={4}
                    placeholder="Enter clinical notes..."
                    className="emrTextarea"
                  />
                </div>
              </div>

              <div className="emrFormActions">
                <button className="emrCancelBtn" onClick={() => setShowAddVisit(false)}>Cancel</button>
                <button className="emrSubmitBtn" onClick={addNewVisit}>+ Add Visit</button>
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