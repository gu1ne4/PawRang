import React, { useState, useEffect } from 'react';
import { useBeforeUnload, useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../reusable_components/NavBar';
import Notifications from '../reusable_components/Notifications';
import { HiOutlineClipboardDocumentList } from "react-icons/hi2";
import { ImLab } from "react-icons/im";
import { CiMedicalClipboard } from "react-icons/ci";
import { FaEye } from "react-icons/fa";
import { TbReportMedical } from "react-icons/tb";
import RichTextEditor from '../reusable_components/RichTextEditor';
import { FaFilePdf } from "react-icons/fa6";
import { apiService } from '../apiService';
import { recordAuditLog } from '../auditLog';

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

const BILLING_NAVIGATION_DELAY_MS = 450;

interface MedicalRecord {
  id?: number;
  pk?: number;
  petId?: number;
  ownerId?: string;
  patientId: string;
  petName: string;
  ownerName: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerEmail: string;
  ownerContact: string;
  lastVisit: string;
  lastVisitRaw?: string;
  veterinarian: string;
  reason: string;
  deceased?: boolean;
  detailsLoaded?: boolean;
  visitHistory?: VisitHistory[];
  petDetails?: PetDetails;
}

interface GlobalEMRProps {
  autoOpenAddMode?: boolean;
  layoutMode?: 'admin' | 'doctor';
  doctorMode?: boolean;
}

interface LabResult {
  id: string;
  testType: string;
  fileName: string;
  fileUrl: string;
  fileData?: string;
  interpretation: string;
  visibleToOwner?: boolean;
  visibleToOwnerAt?: string;
  visibleToOwnerBy?: string;
}

interface Prescription {
  id: string;
  medicationName: string;
  dosage: string;
  route?: string;
  frequency: string;
  duration: string;
  prescribedDate: string;
  instructions?: string;
}

interface MedicalInformation {
  id?: string | number;
  record_type?: string;
  target_id?: string | number | null;
  appointment_id?: string | number | null;
  walkin_id?: string | number | null;
  on_medication?: boolean | null;
  medication_details?: string;
  flea_tick_prevention?: boolean | null;
  is_vaccinated?: boolean | null;
  is_pregnant?: boolean | null;
  additional_notes?: string;
  has_allergies?: boolean | null;
  allergy_details?: string;
  has_skin_condition?: boolean | null;
  skin_condition_details?: string;
  been_groomed_before?: boolean | null;
  reported_symptoms?: string[];
  owner_symptom_notes?: string;
  symptom_duration?: string;
  eating_status?: string;
  drinking_status?: string;
  worsening_status?: string;
  ai_symptom_summary?: string;
  created_at?: string;
  updated_at?: string;
}

interface DoctorAiSummary {
  summary: string;
  important_flags: string[];
  follow_up_questions: string[];
  missing_information: string[];
  model?: string;
}

const AI_BUSY_FALLBACK_MESSAGE = 'Server is busy. Please try again later.';

const getAiFallbackMessage = (error: any, defaultMessage: string) => {
  const message = String(error?.message || '');
  const status = Number(error?.status || error?.response?.status || 0);
  const lowered = message.toLowerCase();

  if (
    status === 429 ||
    status === 503 ||
    lowered.includes('busy') ||
    lowered.includes('overload') ||
    lowered.includes('rate limit') ||
    lowered.includes('resource_exhausted') ||
    lowered.includes('unavailable') ||
    lowered.includes('quota') ||
    lowered.includes('high demand')
  ) {
    return AI_BUSY_FALLBACK_MESSAGE;
  }

  return message || defaultMessage;
};

interface VisitHistory {
  id: string;
  sourceType?: 'manual' | 'appointment' | 'walkin';
  sourceId?: string | null;
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
  billingSourceType?: 'visit';
  billingSourceId?: string;
  hasBillingInvoice?: boolean;
  billingInvoiceId?: string | null;
  billingInvoiceNumber?: string | null;
  vaccinationDetails?: VaccinationDetails;
  medicalInformation?: MedicalInformation | null;
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
  onCancel?: () => void;
  showCancel: boolean;
}

interface FormErrors {
  patientId?: string;
  petName?: string;
  breed?: string;
  ownerFirstName?: string;
  ownerLastName?: string;
  ownerEmail?: string;
  ownerContact?: string;
  veterinarian?: string;
  reason?: string;
}

interface VisitFormErrors {
  visitType?: string;
  appointment?: string;
  primaryService?: string;
  veterinarian?: string;
  weight?: string;
  length?: string;
  temperature?: string;
  heartRate?: string;
  breathingRate?: string;
}

interface VisitFieldInputs {
  weight: string;
  length: string;
  temperature: string;
  heartRate: string;
  breathingRate: string;
}

interface SearchResult {
  id: number;
  petId?: number;
  petName: string;
  ownerName: string;
  ownerFirstName?: string;
  ownerLastName?: string;
  ownerUsername?: string;
  species: string;
  breed: string;
  ownerEmail: string;
  ownerContact: string;
  gender: string;
  dateOfBirth: string;
  weightKg?: string;
  colorMarkings: string;
  neutered: boolean;
  vaccinated: boolean;
  vaccinationProof?: string;
  image?: string;
  hasExistingRecord?: boolean;
  existingRecordId?: number;
  deceased?: boolean;
}

interface VeterinarianAccount {
  id: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  email?: string;
  role?: string;
}

interface MedicationTemplate {
  id: string;
  name: string;
  dosage: string;
  route?: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface AppointmentRecord {
  id: string;
  date: string;
  dateRaw?: string;
  time: string;
  veterinarian: string;
  reason: string;
  services: ServiceItem[];
  status: 'scheduled' | 'completed' | 'cancelled';
  medicalInformation?: MedicalInformation | null;
}

type AppointmentDateFilter = 'today' | 'future';

interface VaccinationDetails {
  id?: string;
  vaccineName: string;
  doseVolume: string;
  injectionSite: string;
  manufacturer: string;
  dateAdministered: string;
  nextDueDate: string;
  visibleToOwner?: boolean;
  visibleToOwnerAt?: string;
  visibleToOwnerBy?: string;
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

const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:5000';
const PH_PHONE_TOTAL_DIGITS = 12;
const DEFAULT_VETERINARIAN = 'Dr. Sarah Johnson';
const PRESCRIPTION_FREQUENCY_OPTIONS = [
  'Once daily',
  'Twice daily',
  'Every 12 hours',
  'Every 8 hours',
  'Every 6 hours',
  'Every 24 hours',
  'Once weekly',
  'Monthly',
  'As needed',
];
const PRESCRIPTION_DURATION_OPTIONS = [
  'Single dose',
  '3 days',
  '5 days',
  '7 days',
  '10 days',
  '14 days',
  '21 days',
  '28 days',
  'Monthly',
  'As needed',
  'Until finished',
];
const PRESCRIPTION_ROUTE_OPTIONS = [
  'By mouth',
  'Topical',
  'Eye',
  'Ear',
  'Subcutaneous injection',
  'Intramuscular injection',
  'Intravenous injection',
  'As directed',
];
const CUSTOM_PRESCRIPTION_OPTION = '__custom__';

const normalizePhilippinePhoneDigits = (value: string): string => {
  let digits = String(value || '').replace(/\D/g, '');

  if (!digits) return '';

  if (digits.startsWith('0')) {
    digits = `63${digits.slice(1)}`;
  } else if (digits.startsWith('9')) {
    digits = `63${digits}`;
  } else if (digits.startsWith('639')) {
    digits = digits;
  }

  if (digits.startsWith('63')) {
    return digits.slice(0, PH_PHONE_TOTAL_DIGITS);
  }

  return digits.slice(0, 10);
};

const formatPhoneNumber = (value: string): string => {
  const digits = normalizePhilippinePhoneDigits(value);

  if (!digits) return '';

  const localDigits = digits.startsWith('63') ? digits.slice(2) : digits;
  const parts = [
    localDigits.slice(0, 3),
    localDigits.slice(3, 6),
    localDigits.slice(6, 10),
  ].filter(Boolean);

  return `+63 ${parts.join(' ')}`.trim();
};

const toStoredPhoneNumber = (value: string): string => {
  const digits = normalizePhilippinePhoneDigits(value);
  return digits ? `+${digits}` : '';
};

const formatVeterinarianName = (value: string): string => {
  const cleaned = String(value || '').replace(/^\s*dr\.?\s*/i, '').trim();
  return cleaned ? `Dr. ${cleaned}` : '';
};

const getVeterinarianNameFromAccount = (account: VeterinarianAccount): string => {
  const combined = `${account.first_name || ''} ${account.last_name || ''}`.trim();
  const baseName = combined || account.username || account.email || '';
  return formatVeterinarianName(baseName);
};

const getPrescriptionPresetValue = (value: string, options: string[]): string => (
  options.includes(value) ? value : CUSTOM_PRESCRIPTION_OPTION
);

const formatPrescriptionDisplayParts = (prescription: Prescription): string[] => {
  const parts = [
    prescription.dosage,
    prescription.route,
    prescription.frequency ? `Freq: ${prescription.frequency}` : '',
    prescription.duration ? `Duration: ${prescription.duration}` : '',
  ];

  return parts.filter((part): part is string => !!part && part.trim() !== '');
};

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
const VETERINARIANS = [
  DEFAULT_VETERINARIAN,
  'Dr. Michael Chen',
  'Dr. Emily Rodriguez',
  'Dr. James Wilson'
];

const normalizeVisitHistoryForSnapshot = (history: VisitHistory[]) =>
  history.map((visit) => ({
    id: visit.id,
    date: visit.date,
    time: visit.time,
    veterinarian: visit.veterinarian,
    reason: visit.reason,
    doctorRemarks: visit.doctorRemarks,
    weight: visit.weight,
    weightUnit: visit.weightUnit,
    sameAsLastWeight: !!visit.sameAsLastWeight,
    neutered: visit.neutered ?? null,
    vaccinated: visit.vaccinated ?? null,
    deceased: visit.deceased ?? null,
    clinicalExam: visit.clinicalExam
      ? {
          length: visit.clinicalExam.length,
          lengthUnit: visit.clinicalExam.lengthUnit,
          temperature: visit.clinicalExam.temperature,
          tempUnit: visit.clinicalExam.tempUnit,
          heartRate: visit.clinicalExam.heartRate,
          breathingRate: visit.clinicalExam.breathingRate,
          additionalFindings: visit.clinicalExam.additionalFindings,
        }
      : null,
    labResults: (visit.labResults || []).map((lab) => ({
      id: lab.id,
      testType: lab.testType,
      fileName: lab.fileName,
      fileUrl: lab.fileUrl,
      fileData: lab.fileData || '',
      interpretation: lab.interpretation,
      visibleToOwner: !!lab.visibleToOwner,
      visibleToOwnerAt: lab.visibleToOwnerAt || '',
      visibleToOwnerBy: lab.visibleToOwnerBy || '',
    })),
    prescriptions: (visit.prescriptions || []).map((prescription) => ({
      id: prescription.id,
      medicationName: prescription.medicationName,
      dosage: prescription.dosage,
      route: prescription.route || '',
      frequency: prescription.frequency,
      duration: prescription.duration,
      prescribedDate: prescription.prescribedDate,
      instructions: prescription.instructions || '',
    })),
    selectedServices: (visit.selectedServices || []).map((service) => ({
      id: service.id,
      name: service.name,
      price: service.price,
      description: service.description || '',
    })),
    appointmentId: visit.appointmentId || '',
    medicalInformation: visit.medicalInformation
      ? {
          id: visit.medicalInformation.id,
          record_type: visit.medicalInformation.record_type || '',
          target_id: visit.medicalInformation.target_id ?? null,
          appointment_id: visit.medicalInformation.appointment_id ?? null,
          walkin_id: visit.medicalInformation.walkin_id ?? null,
          on_medication: visit.medicalInformation.on_medication ?? null,
          medication_details: visit.medicalInformation.medication_details || '',
          flea_tick_prevention: visit.medicalInformation.flea_tick_prevention ?? null,
          is_vaccinated: visit.medicalInformation.is_vaccinated ?? null,
          is_pregnant: visit.medicalInformation.is_pregnant ?? null,
          additional_notes: visit.medicalInformation.additional_notes || '',
          has_allergies: visit.medicalInformation.has_allergies ?? null,
          allergy_details: visit.medicalInformation.allergy_details || '',
          has_skin_condition: visit.medicalInformation.has_skin_condition ?? null,
          skin_condition_details: visit.medicalInformation.skin_condition_details || '',
          been_groomed_before: visit.medicalInformation.been_groomed_before ?? null,
          reported_symptoms: Array.isArray(visit.medicalInformation.reported_symptoms)
            ? visit.medicalInformation.reported_symptoms
            : [],
          owner_symptom_notes: visit.medicalInformation.owner_symptom_notes || '',
          symptom_duration: visit.medicalInformation.symptom_duration || '',
          eating_status: visit.medicalInformation.eating_status || '',
          drinking_status: visit.medicalInformation.drinking_status || '',
          worsening_status: visit.medicalInformation.worsening_status || '',
          ai_symptom_summary: visit.medicalInformation.ai_symptom_summary || '',
          created_at: visit.medicalInformation.created_at || '',
          updated_at: visit.medicalInformation.updated_at || '',
        }
      : null,
    vaccinationDetails: visit.vaccinationDetails
      ? {
          id: visit.vaccinationDetails.id || '',
          vaccineName: visit.vaccinationDetails.vaccineName,
          doseVolume: visit.vaccinationDetails.doseVolume,
          injectionSite: visit.vaccinationDetails.injectionSite,
          manufacturer: visit.vaccinationDetails.manufacturer,
          dateAdministered: visit.vaccinationDetails.dateAdministered,
          nextDueDate: visit.vaccinationDetails.nextDueDate,
          visibleToOwner: !!visit.vaccinationDetails.visibleToOwner,
          visibleToOwnerAt: visit.vaccinationDetails.visibleToOwnerAt || '',
          visibleToOwnerBy: visit.vaccinationDetails.visibleToOwnerBy || '',
        }
      : null,
  }));

const AVAILABLE_SERVICES: ServiceItem[] = [
  { id: 's1', name: 'Consultation', price: 500, description: 'Standard veterinary consultation' },
  { id: 's2', name: 'Vaccination', price: 1200, description: 'Annual vaccination' },
  { id: 's3', name: 'Laboratory Test', price: 800, description: 'Blood work and lab tests' },
  { id: 's4', name: 'X-Ray', price: 1500, description: 'Radiology services' },
  { id: 's5', name: 'Ultrasound', price: 2000, description: 'Ultrasound examination' },
  { id: 's6', name: 'Surgery', price: 3000, description: 'Surgical procedure' },
  { id: 's7', name: 'Dental Cleaning', price: 800, description: 'Professional dental cleaning' },
  { id: 's8', name: 'Grooming', price: 500, description: 'Basic grooming services' },
];

const normalizeServiceName = (value: string): string =>
  (value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const getServiceCategoryKey = (serviceName?: string): string => {
  const normalized = normalizeServiceName(serviceName || '');

  if (!normalized) return '';
  if (normalized.includes('consult') || normalized.includes('checkup')) return 'consultation';
  if (normalized.includes('vaccin') || normalized.includes('anti rabies') || normalized.includes('rabies')) return 'vaccination';
  if (normalized.includes('laboratory') || normalized === 'laboratory' || normalized.includes('lab test') || normalized.includes('blood work')) return 'laboratory-test';
  if (normalized.includes('x ray') || normalized.includes('xray') || normalized.includes('radiology')) return 'x-ray';
  if (normalized.includes('ultrasound')) return 'ultrasound';
  if (normalized.includes('surgery') || normalized.includes('surgical')) return 'surgery';
  if (normalized.includes('dental')) return 'dental-cleaning';
  if (normalized.includes('groom')) return 'grooming';

  return normalized;
};

const areServicesEquivalent = (firstServiceName?: string, secondServiceName?: string): boolean => {
  const firstCategory = getServiceCategoryKey(firstServiceName);
  const secondCategory = getServiceCategoryKey(secondServiceName);

  return !!firstCategory && !!secondCategory && firstCategory === secondCategory;
};

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

const APPOINTMENT_DATE_FILTER_OPTIONS: Array<{ value: AppointmentDateFilter; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: 'future', label: 'Future' },
];

const EMPTY_VISIT_FIELD_INPUTS: VisitFieldInputs = {
  weight: '',
  length: '',
  temperature: '',
  heartRate: '',
  breathingRate: '',
};

const getCurrentDateInTimeZone = (timeZone: string): string => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === 'year')?.value || '';
  const month = parts.find((part) => part.type === 'month')?.value || '';
  const day = parts.find((part) => part.type === 'day')?.value || '';

  return year && month && day ? `${year}-${month}-${day}` : '';
};

const normalizeAppointmentDateValue = (dateRaw?: string, displayDate?: string): string => {
  const normalizedRawDate = (dateRaw || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalizedRawDate)) {
    return normalizedRawDate;
  }

  const normalizedDisplayDate = (displayDate || '').trim();
  const match = normalizedDisplayDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) {
    return '';
  }

  const [, month, day, year] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

const getAppointmentEmptyStateMessage = (filter: AppointmentDateFilter): string => {
  switch (filter) {
    case 'future':
      return 'No future scheduled appointments found.';
    case 'today':
    default:
      return 'No scheduled appointments found for today.';
  }
};

const hasMedicalInformationContent = (medicalInformation?: MedicalInformation | null): boolean => {
  if (!medicalInformation) return false;

  const reportedSymptoms = Array.isArray(medicalInformation.reported_symptoms)
    ? medicalInformation.reported_symptoms
    : [];

  return [
    medicalInformation.on_medication,
    medicalInformation.flea_tick_prevention,
    medicalInformation.is_vaccinated,
    medicalInformation.is_pregnant,
    medicalInformation.has_allergies,
    medicalInformation.has_skin_condition,
    medicalInformation.been_groomed_before,
  ].some((value) => value !== null && value !== undefined)
    || Boolean(
      medicalInformation.medication_details?.trim()
      || medicalInformation.additional_notes?.trim()
      || medicalInformation.allergy_details?.trim()
      || medicalInformation.skin_condition_details?.trim()
      || medicalInformation.owner_symptom_notes?.trim()
      || medicalInformation.symptom_duration?.trim()
      || medicalInformation.eating_status?.trim()
      || medicalInformation.drinking_status?.trim()
      || medicalInformation.worsening_status?.trim()
      || medicalInformation.ai_symptom_summary?.trim()
      || reportedSymptoms.length > 0
    );
};

const formatMedicalInformationAnswer = (value?: boolean | null): string => {
  if (value === null || value === undefined) {
    return 'Not recorded';
  }

  return value ? 'Yes' : 'No';
};

const RATE_RANGE_INPUT_PATTERN = /^\d{0,3}(?:-\d{0,3})?$/;
const RATE_RANGE_COMPLETE_PATTERN = /^(\d{2,3})-(\d{2,3})$/;

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


const GlobalEMR: React.FC<GlobalEMRProps> = ({ autoOpenAddMode = false, layoutMode = 'admin', doctorMode = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { autoOpenAddMode?: boolean } | null;
  const isDoctorLayout = layoutMode === 'doctor';

  // State
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isSavingRecord, setIsSavingRecord] = useState<boolean>(false);
  const [openingRecordId, setOpeningRecordId] = useState<number | null>(null);
  const [billingNavigationVisitId, setBillingNavigationVisitId] = useState<string | null>(null);

  // Medication Modal States
  const [showMedicationModal, setShowMedicationModal] = useState<boolean>(false);
  const [medicationSearchQuery, setMedicationSearchQuery] = useState<string>('');
  const [filteredMedications, setFilteredMedications] = useState<MedicationTemplate[]>(MEDICATION_TEMPLATES);

  const [showLabPanel, setShowLabPanel] = useState<boolean>(false);
  
  // Appointment/Walk-in States
  const [visitType, setVisitType] = useState<'' | 'appointment' | 'walkin'>('');
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentRecord | null>(null);
  const [selectedPrimaryServiceId, setSelectedPrimaryServiceId] = useState<string>('');
  const [appointmentRecords, setAppointmentRecords] = useState<AppointmentRecord[]>([]);
  const [appointmentDateFilter, setAppointmentDateFilter] = useState<AppointmentDateFilter>('today');
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
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [allSearchResults, setAllSearchResults] = useState<SearchResult[]>([]);
  const [veterinarianOptions, setVeterinarianOptions] = useState<string[]>(VETERINARIANS);
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
  const [prescriptionRemarks, setPrescriptionRemarks] = useState<string>('');
  const [expandedVisitId, setExpandedVisitId] = useState<string | null>(null);
  
  const [newVisit, setNewVisit] = useState<VisitHistory>({
    id: '',
    date: '',
    time: '',
    veterinarian: '',
    reason: '',
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
  const [ownerShareActionKey, setOwnerShareActionKey] = useState<string>('');

  // Filter States
  const [dateFilter, setDateFilter] = useState<string>('');
  const [doctorFilter, setDoctorFilter] = useState<string>('');

  // Pagination
  const [page, setPage] = useState<number>(0);
  const itemsPerPage = 10;

  // Form States
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);
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
  const [doctorAssigned, setDoctorAssigned] = useState<string>(DEFAULT_VETERINARIAN);
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
    id: '',
    vaccineName: '',
    doseVolume: '',
    injectionSite: '',
    manufacturer: '',
    dateAdministered: new Date().toISOString().split('T')[0],
    nextDueDate: '',
    visibleToOwner: false,
    visibleToOwnerAt: '',
    visibleToOwnerBy: '',
  });
    
  // Form Errors
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [visitFormErrors, setVisitFormErrors] = useState<VisitFormErrors>({});
  const [visitFieldInputs, setVisitFieldInputs] = useState<VisitFieldInputs>({ ...EMPTY_VISIT_FIELD_INPUTS });
  const [formBaselineSnapshot, setFormBaselineSnapshot] = useState<string>('');
  const [doctorAiSummary, setDoctorAiSummary] = useState<DoctorAiSummary | null>(null);
  const [doctorAiLoading, setDoctorAiLoading] = useState<boolean>(false);
  const [doctorAiError, setDoctorAiError] = useState<string>('');
  const [doctorAiCollapsed, setDoctorAiCollapsed] = useState<boolean>(false);
  const canEditPetProfileFields = editModeEnabled && !deceased;
  const canEditDeceasedStatus = editModeEnabled;
  const selectedPrimaryService =
    AVAILABLE_SERVICES.find((service) => service.id === selectedPrimaryServiceId) || null;

  // Helper functions
  const buildPatientDisplayId = (petId: number | string): string => {
    const normalized = Number(petId);
    if (Number.isNaN(normalized)) return `PET-${petId}`;
    return `PET-${normalized.toString().padStart(3, '0')}`;
  };

  const serializeFormSnapshot = (data: {
    selectedPetId: number | null;
    patientId: string;
    petName: string;
    species: Species;
    breed: string;
    breedOther: string;
    gender: Gender;
    dateOfBirth: string;
    age: string;
    weight: string;
    weightUnit: 'kg' | 'lbs';
    colorMarkings: string;
    neutered: boolean;
    deceased: boolean;
    vaccinated: boolean;
    vaccinationProof: string;
    petImage: string;
    ownerFirstName: string;
    ownerLastName: string;
    ownerEmail: string;
    ownerContact: string;
    doctorAssigned: string;
    reasonForVisit: string;
    reasonOther: string;
    visitHistory: VisitHistory[];
  }): string =>
    JSON.stringify({
      ...data,
      visitHistory: normalizeVisitHistoryForSnapshot(data.visitHistory),
    });

  const buildEmptyFormSnapshot = (): string =>
    serializeFormSnapshot({
      selectedPetId: null,
      patientId: '',
      petName: '',
      species: 'Dog',
      breed: '',
      breedOther: '',
      gender: 'Male',
      dateOfBirth: '',
      age: '',
      weight: '',
      weightUnit: 'kg',
      colorMarkings: '',
      neutered: false,
      deceased: false,
      vaccinated: false,
      vaccinationProof: '',
      petImage: '',
      ownerFirstName: '',
      ownerLastName: '',
      ownerEmail: '',
      ownerContact: '',
      doctorAssigned: veterinarianOptions[0] || DEFAULT_VETERINARIAN,
      reasonForVisit: REASONS[0],
      reasonOther: '',
      visitHistory: [],
    });

  const buildCurrentFormSnapshot = (): string =>
    serializeFormSnapshot({
      selectedPetId,
      patientId,
      petName,
      species,
      breed,
      breedOther,
      gender,
      dateOfBirth,
      age,
      weight,
      weightUnit,
      colorMarkings,
      neutered,
      deceased,
      vaccinated,
      vaccinationProof,
      petImage,
      ownerFirstName,
      ownerLastName,
      ownerEmail,
      ownerContact,
      doctorAssigned,
      reasonForVisit,
      reasonOther,
      visitHistory,
    });

  const buildFormSnapshotWithVisitHistory = (nextVisitHistory: VisitHistory[]): string =>
    serializeFormSnapshot({
      selectedPetId,
      patientId,
      petName,
      species,
      breed,
      breedOther,
      gender,
      dateOfBirth,
      age,
      weight,
      weightUnit,
      colorMarkings,
      neutered,
      deceased,
      vaccinated,
      vaccinationProof,
      petImage,
      ownerFirstName,
      ownerLastName,
      ownerEmail,
      ownerContact,
      doctorAssigned,
      reasonForVisit,
      reasonOther,
      visitHistory: nextVisitHistory,
    });

  const buildRecordFormSnapshot = (record: MedicalRecord): string =>
    serializeFormSnapshot({
      selectedPetId: record.petId || null,
      patientId: record.patientId || buildPatientDisplayId(record.petId || record.id || ''),
      petName: record.petName || '',
      species: record.petDetails?.species || 'Dog',
      breed: record.petDetails?.breed || '',
      breedOther: '',
      gender: record.petDetails?.gender || 'Male',
      dateOfBirth: record.petDetails?.dateOfBirth || '',
      age: record.petDetails?.age || '',
      weight: record.petDetails?.weight?.toString() || '',
      weightUnit: record.petDetails?.weightUnit || 'kg',
      colorMarkings: record.petDetails?.colorMarkings || '',
      neutered: record.petDetails?.neutered || false,
      deceased: record.deceased || record.petDetails?.deceased || false,
      vaccinated: record.petDetails?.vaccinated || false,
      vaccinationProof: record.petDetails?.vaccinationProof || '',
      petImage: record.petDetails?.image || '',
      ownerFirstName: record.ownerFirstName || '',
      ownerLastName: record.ownerLastName || '',
      ownerEmail: record.ownerEmail || '',
      ownerContact: formatPhoneNumber(record.ownerContact || ''),
      doctorAssigned: formatVeterinarianName(record.veterinarian) || DEFAULT_VETERINARIAN,
      reasonForVisit: record.reason || REASONS[0],
      reasonOther: '',
      visitHistory: record.visitHistory || [],
    });

  const hasUnsavedChanges = viewMode !== 'list' && buildCurrentFormSnapshot() !== formBaselineSnapshot;

  const confirmLeaveCurrentView = (
    onProceed: () => void,
    message: React.ReactNode = 'You have unsaved changes. Are you sure you want to leave without saving?'
  ) => {
    if (!hasUnsavedChanges) {
      onProceed();
      return;
    }

    showAlert('confirm', 'Unsaved Changes', message, onProceed, true);
  };

  const handleProtectedNavigation = (path: string, navigateFn: () => void) => {
    if (path === location.pathname) {
      navigateFn();
      return;
    }

    confirmLeaveCurrentView(
      navigateFn,
      'You have unsaved changes. Are you sure you want to leave this page without saving?'
    );
  };

  useBeforeUnload((event) => {
    if (!hasUnsavedChanges) return;
    event.preventDefault();
    event.returnValue = '';
  });

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
      (med.route || '').toLowerCase().includes(query.toLowerCase()) ||
      med.frequency.toLowerCase().includes(query.toLowerCase()) ||
      med.duration.toLowerCase().includes(query.toLowerCase())
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
    return selectedServices.some((service) => getServiceCategoryKey(service.name) === 'vaccination');
  };

  const normalizePrescriptionForForm = (prescription: Prescription): Prescription => ({
    ...prescription,
    frequency: prescription.frequency || '',
    duration: prescription.duration || '',
    route: prescription.route || '',
    instructions: prescription.instructions || '',
  });

  const getSharedPrescriptionInstructions = (prescriptions: Prescription[] = []): string => {
    const instructionItems = prescriptions
      .filter((prescription) => (prescription.medicationName || '').trim() !== '')
      .map((prescription) => ({
        medicationName: prescription.medicationName || 'Medication',
        instructions: stripHtmlForPDF(prescription.instructions || '').trim(),
      }))
      .filter((item) => item.instructions !== '');

    if (instructionItems.length === 0) {
      return '';
    }

    const uniqueInstructions = Array.from(new Set(instructionItems.map((item) => item.instructions)));
    if (uniqueInstructions.length === 1) {
      return uniqueInstructions[0];
    }

    return instructionItems
      .map((item) => `${item.medicationName}: ${item.instructions}`)
      .join('\n\n');
  };

  const applySharedPrescriptionInstructions = (
    prescriptions: Prescription[] = [],
    sharedInstructions: string
  ): Prescription[] => {
    const normalizedInstructions = sharedInstructions.trim();
    let sharedInstructionsAssigned = false;

    return prescriptions.map((prescription) => {
      if (!(prescription.medicationName || '').trim()) {
        return {
          ...prescription,
          instructions: '',
        };
      }

      if (!normalizedInstructions || sharedInstructionsAssigned) {
        return {
          ...prescription,
          instructions: '',
        };
      }

      sharedInstructionsAssigned = true;
      return {
        ...prescription,
        instructions: normalizedInstructions,
      };
    });
  };

  const normalizeVisitForDisplay = (visit: VisitHistory): VisitHistory => ({
    ...visit,
    veterinarian: formatVeterinarianName(visit.veterinarian) || visit.veterinarian,
    prescriptions: (visit.prescriptions || []).map(normalizePrescriptionForForm),
  });

  const normalizeRecordForDisplay = (record: MedicalRecord): MedicalRecord => ({
    ...record,
    veterinarian: formatVeterinarianName(record.veterinarian) || record.veterinarian,
    petDetails: record.petDetails
      ? {
          ...record.petDetails,
          doctorAssigned: formatVeterinarianName(record.petDetails.doctorAssigned) || record.petDetails.doctorAssigned,
        }
      : record.petDetails,
    visitHistory: (record.visitHistory || []).map(normalizeVisitForDisplay),
  });

  const fetchVeterinarians = async (): Promise<void> => {
    try {
      const response = await apiService.getDoctors();
      const doctors = Array.isArray(response) ? response : [];
      const names = Array.from(
        new Set(
          doctors
            .map((doctor: VeterinarianAccount) => getVeterinarianNameFromAccount(doctor))
            .filter(Boolean)
        )
      );

      if (names.length > 0) {
        setVeterinarianOptions(names);
        setDoctorAssigned((prev) => {
          const normalized = formatVeterinarianName(prev);
          if (!normalized || normalized === DEFAULT_VETERINARIAN || !names.includes(normalized)) {
            return names[0];
          }
          return normalized;
        });
        setNewVisit((prev) => {
          const normalized = formatVeterinarianName(prev.veterinarian);
          if (!normalized) {
            return prev;
          }
          if (normalized === prev.veterinarian) {
            return prev;
          }
          return { ...prev, veterinarian: normalized };
        });
        if (
          viewMode === 'add' &&
          !selectedPetId &&
          !patientId &&
          !petName &&
          !ownerFirstName &&
          !ownerLastName &&
          visitHistory.length === 0
        ) {
          setFormBaselineSnapshot(
            serializeFormSnapshot({
              selectedPetId: null,
              patientId: '',
              petName: '',
              species: 'Dog',
              breed: '',
              breedOther: '',
              gender: 'Male',
              dateOfBirth: '',
              age: '',
              weight: '',
              weightUnit: 'kg',
              colorMarkings: '',
              neutered: false,
              deceased: false,
              vaccinated: false,
              vaccinationProof: '',
              petImage: '',
              ownerFirstName: '',
              ownerLastName: '',
              ownerEmail: '',
              ownerContact: '',
              doctorAssigned: names[0],
              reasonForVisit: REASONS[0],
              reasonOther: '',
              visitHistory: [],
            })
          );
        }
        return;
      }

      setVeterinarianOptions(VETERINARIANS);
    } catch (error) {
      console.error('Error fetching veterinarians:', error);
      setVeterinarianOptions(VETERINARIANS);
    }
  };

  const fetchAppointmentsForPet = async (petId: number): Promise<void> => {
    try {
      const response = await apiService.getEmrPetAppointments(petId);
      setAppointmentRecords(
        (response?.appointments || []).map((appointment: AppointmentRecord) => ({
          ...appointment,
          veterinarian: formatVeterinarianName(appointment.veterinarian) || appointment.veterinarian,
        }))
      );
    } catch (error) {
      console.error('Error fetching appointments for pet:', error);
      setAppointmentRecords([]);
    }
  };

  const clearVisitFieldError = (field: keyof VisitFormErrors): void => {
    setVisitFormErrors((prev) => {
      if (!prev[field]) {
        return prev;
      }

      const nextErrors = { ...prev };
      delete nextErrors[field];
      return nextErrors;
    });
  };

  const openAddVisitModal = (): void => {
    setAppointmentDateFilter('today');
    setVisitFormErrors({});
    setVisitType('');
    setSelectedAppointment(null);
    setSelectedPrimaryServiceId('');
    setSelectedServices([]);
    setNewVisit((prev) => ({
      ...prev,
      veterinarian: '',
      reason: ''
    }));
    setVisitFieldInputs({
      weight: newVisit.weight > 0 ? newVisit.weight.toString() : '',
      length: (newVisit.clinicalExam?.length || 0) > 0 ? newVisit.clinicalExam?.length.toString() || '' : '',
      temperature: (newVisit.clinicalExam?.temperature || 0) > 0 ? newVisit.clinicalExam?.temperature.toString() || '' : '',
      heartRate: newVisit.clinicalExam?.heartRate || '',
      breathingRate: newVisit.clinicalExam?.breathingRate || '',
    });
    setPrescriptionRemarks((current) => current || getSharedPrescriptionInstructions(newVisit.prescriptions || []));
    setShowAddVisit(true);
  };

  const getLockedPrimaryServiceNames = (): string[] => {
    if (visitType === 'appointment') {
      return (selectedAppointment?.services || []).map((service) => service.name).filter(Boolean);
    }

    return visitType === 'walkin' && selectedPrimaryService ? [selectedPrimaryService.name] : [];
  };

  const isServiceSelectedInVisit = (service: ServiceItem): boolean =>
    selectedServices.some((selectedService) => areServicesEquivalent(selectedService.name, service.name));

  const isServiceLockedInVisit = (service: ServiceItem): boolean =>
    getLockedPrimaryServiceNames().some((lockedServiceName) => areServicesEquivalent(lockedServiceName, service.name));

  const handleWalkInPrimaryServiceChange = (serviceId: string): void => {
    const previousPrimaryService = AVAILABLE_SERVICES.find((service) => service.id === selectedPrimaryServiceId) || null;
    const nextPrimaryService = AVAILABLE_SERVICES.find((service) => service.id === serviceId) || null;

    setSelectedPrimaryServiceId(serviceId);
    clearVisitFieldError('primaryService');

    setSelectedServices((prev) => {
      const withoutPreviousPrimary = previousPrimaryService
        ? prev.filter((service) => !areServicesEquivalent(service.name, previousPrimaryService.name))
        : prev;

      if (!nextPrimaryService) {
        return withoutPreviousPrimary;
      }

      if (withoutPreviousPrimary.some((service) => areServicesEquivalent(service.name, nextPrimaryService.name))) {
        return withoutPreviousPrimary;
      }

      return [nextPrimaryService, ...withoutPreviousPrimary];
    });
  };

  const toggleService = (service: ServiceItem) => {
    if (isServiceLockedInVisit(service)) {
      return;
    }

    setSelectedServices(prev => {
      const exists = prev.some((selectedService) => areServicesEquivalent(selectedService.name, service.name));
      if (exists) {
        return prev.filter((selectedService) => !areServicesEquivalent(selectedService.name, service.name));
      } else {
        return [...prev, service];
      }
    });
  };

  const isLaboratorySelected = () => {
    return selectedServices.some((service) => getServiceCategoryKey(service.name) === 'laboratory-test');
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
        route: '',
        frequency: '',
        duration: '',
        prescribedDate: new Date().toISOString().split('T')[0],
        instructions: ''
      };
      setNewVisit({
        ...newVisit,
        prescriptions: [...(newVisit.prescriptions || []), normalizePrescriptionForForm(newPrescription)]
      });
    } else {
      const newPrescription: Prescription = {
        id: Date.now().toString(),
        medicationName: medication.name,
        dosage: medication.dosage,
        route: medication.route || '',
        frequency: medication.frequency,
        duration: medication.duration,
        prescribedDate: new Date().toISOString().split('T')[0],
        instructions: ''
      };
      setNewVisit({
        ...newVisit,
        prescriptions: [...(newVisit.prescriptions || []), normalizePrescriptionForForm(newPrescription)]
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
    showCancel: boolean = false,
    onCancel?: () => void
  ) => {
    setModalConfig({ type, title, message, onConfirm, onCancel, showCancel });
    setModalVisible(true);
  };

  const buildValidationSummary = (messages: string[]): React.ReactNode => (
    <div style={{ display: 'grid', gap: '6px', textAlign: 'left' }}>
      <div>Please complete the required fields:</div>
      {Array.from(new Set(messages.filter(Boolean))).map((message, index) => (
        <div key={`${index}-${message}`}>- {message}</div>
      ))}
    </div>
  );

  const showValidationAlert = (title: string, messages: string[]): void => {
    const filteredMessages = Array.from(new Set(messages.filter(Boolean)));
    if (filteredMessages.length === 0) return;
    showAlert('error', title, buildValidationSummary(filteredMessages));
  };

  const getApiErrorMessage = (error: any, fallback: string): string => {
    if (typeof error?.response?.data?.error === 'string' && error.response.data.error.trim()) {
      return error.response.data.error;
    }
    if (typeof error?.data?.error === 'string' && error.data.error.trim()) {
      return error.data.error;
    }
    if (typeof error?.message === 'string' && error.message.trim()) {
      return error.message;
    }
    return fallback;
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

  const getOwnerShareActorName = (): string => {
    const candidate = [
      currentUser?.fullName,
      currentUser?.username,
    ].find((value): value is string => typeof value === 'string' && value.trim() !== '');

    return candidate || 'Clinic staff';
  };

  const updateLabResultOwnerVisibilityInState = (
    labResultId: string,
    visibility: { visibleToOwner: boolean; visibleToOwnerAt: string; visibleToOwnerBy: string },
    shouldRefreshBaseline: boolean
  ) => {
    const nextVisitHistory = visitHistory.map((visit) => ({
      ...visit,
      labResults: (visit.labResults || []).map((lab) =>
        lab.id === labResultId
          ? { ...lab, ...visibility }
          : lab
      ),
    }));

    setVisitHistory(nextVisitHistory);
    if (shouldRefreshBaseline) {
      setFormBaselineSnapshot(buildFormSnapshotWithVisitHistory(nextVisitHistory));
    }
  };

  const updateVaccinationOwnerVisibilityInState = (
    vaccinationId: string,
    visibility: { visibleToOwner: boolean; visibleToOwnerAt: string; visibleToOwnerBy: string },
    shouldRefreshBaseline: boolean
  ) => {
    const nextVisitHistory = visitHistory.map((visit) =>
      visit.vaccinationDetails?.id === vaccinationId
        ? {
            ...visit,
            vaccinationDetails: {
              ...visit.vaccinationDetails,
              ...visibility,
            },
          }
        : visit
    );

    setVisitHistory(nextVisitHistory);
    if (shouldRefreshBaseline) {
      setFormBaselineSnapshot(buildFormSnapshotWithVisitHistory(nextVisitHistory));
    }
  };

  const handleSetLabResultOwnerVisibility = async (labResult: LabResult, visibleToOwner: boolean): Promise<void> => {
    if (!labResult.id) {
      showAlert('error', 'Share Unavailable', 'Only saved lab results can be shared to the owner portal.');
      return;
    }

    const actionKey = `lab-${labResult.id}`;
    const hadUnsavedChangesBeforeShare = hasUnsavedChanges;
    setOwnerShareActionKey(actionKey);

    try {
      const response = await apiService.updateEmrLabResultOwnerVisibility(labResult.id, {
        visibleToOwner,
        visibleToOwnerBy: getOwnerShareActorName(),
      });
      const updatedLabResult = response?.labResult || {};
      updateLabResultOwnerVisibilityInState(labResult.id, {
        visibleToOwner: !!updatedLabResult.visibleToOwner,
        visibleToOwnerAt: updatedLabResult.visibleToOwnerAt || '',
        visibleToOwnerBy: updatedLabResult.visibleToOwnerBy || '',
      }, !hadUnsavedChangesBeforeShare);
    } catch (error) {
      console.error('Failed to update lab result visibility:', error);
      showAlert('error', 'Share Failed', 'We could not update the owner portal visibility for this lab result.');
    } finally {
      setOwnerShareActionKey('');
    }
  };

  const handleSetVaccinationOwnerVisibility = async (
    vaccination: VaccinationDetails | null | undefined,
    vaccineName: string
  ): Promise<void> => {
    if (!vaccination?.id) {
      showAlert('error', 'Share Unavailable', 'Only saved vaccination records can be shared to the owner portal.');
      return;
    }

    const actionKey = `vaccination-${vaccination.id}`;
    const hadUnsavedChangesBeforeShare = hasUnsavedChanges;
    setOwnerShareActionKey(actionKey);

    try {
      const response = await apiService.updateEmrVaccinationOwnerVisibility(vaccination.id, {
        visibleToOwner: !vaccination.visibleToOwner,
        visibleToOwnerBy: getOwnerShareActorName(),
      });
      const updatedVaccination = response?.vaccination || {};
      updateVaccinationOwnerVisibilityInState(vaccination.id, {
        visibleToOwner: !!updatedVaccination.visibleToOwner,
        visibleToOwnerAt: updatedVaccination.visibleToOwnerAt || '',
        visibleToOwnerBy: updatedVaccination.visibleToOwnerBy || '',
      }, !hadUnsavedChangesBeforeShare);
    } catch (error) {
      console.error('Failed to update vaccination visibility:', error);
      showAlert('error', 'Share Failed', `We could not update the owner portal visibility for ${vaccineName || 'this vaccination record'}.`);
    } finally {
      setOwnerShareActionKey('');
    }
  };

  const fetchRecords = async (): Promise<void> => {
    setLoading(true);
    try {
      const response = await apiService.getEmrRecords();
      setRecords((response?.records || []).map((record: MedicalRecord) => normalizeRecordForDisplay(record)));
    } catch (error) {
      console.error(error);
      showAlert('error', 'Error', 'Failed to fetch medical records.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSearchPets = async (): Promise<void> => {
    try {
      const response = await apiService.getEmrSearchPets();
      const pets: SearchResult[] = response?.pets || [];
      setAllSearchResults(pets);
      setSearchResults(pets);
    } catch (error) {
      console.error('Error fetching EMR pet search data:', error);
      setAllSearchResults([]);
      setSearchResults([]);
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

      void recordAuditLog({
        module: 'EMR',
        event: 'Medical Record PDF Generated',
        target: `${petName || 'Pet'} Medical Record`,
        targetType: 'medical_record',
        targetId: editingId,
        summary: `Medical record PDF was generated for ${petName || 'this pet'}.`,
        status: 'Success',
        metadata: {
          petId: selectedPetId,
          visitCount: visitHistory.length,
        },
      });
      
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
      const sharedPrescriptionInstructions = getSharedPrescriptionInstructions(validPrescriptions);

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
        instructionsText: sharedPrescriptionInstructions,
      };


      const blob = await pdf(<PrescriptionPDF {...pdfData} />).toBlob();
      

      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      URL.revokeObjectURL(url);

      void recordAuditLog({
        module: 'EMR',
        event: 'Prescription PDF Generated',
        target: `${petName || 'Pet'} Prescription`,
        targetType: 'medical_record_visit',
        targetId: visit.id,
        summary: `Prescription PDF was generated for ${petName || 'this pet'} with ${validPrescriptions.length} prescription(s).`,
        status: 'Success',
        metadata: {
          medicalRecordId: editingId,
          petId: selectedPetId,
          prescriptionCount: validPrescriptions.length,
        },
      });
      
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
      setSearchResults(allSearchResults);
      return;
    }
    const filtered = allSearchResults.filter(result =>
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

  const handleEditModeToggle = (shouldEnable: boolean): void => {
    if (!shouldEnable) {
      setEditModeEnabled(false);
      return;
    }

    showAlert(
      'confirm',
      'Enable Edit Mode',
      'Turn on edit mode for this patient record?',
      () => setEditModeEnabled(true),
      true
    );
  };

  const addNewVisit = () => {
    const errors: VisitFormErrors = {};
    const trimmedWeight = visitFieldInputs.weight.trim();
    const trimmedLength = visitFieldInputs.length.trim();
    const trimmedTemperature = visitFieldInputs.temperature.trim();
    const trimmedHeartRate = visitFieldInputs.heartRate.trim();
    const trimmedBreathingRate = visitFieldInputs.breathingRate.trim();

    if (!visitType) {
      errors.visitType = 'Select whether this visit is an appointment or a walk-in.';
    }

    if (visitType === 'appointment' && !selectedAppointment) {
      errors.appointment = 'Select a scheduled appointment from the current filter.';
    }

    if (visitType === 'walkin' && !selectedPrimaryServiceId) {
      errors.primaryService = 'Select a primary service for this walk-in visit.';
    }

    if (visitType === 'walkin' && !newVisit.veterinarian.trim()) {
      errors.veterinarian = 'Select a doctor for this walk-in visit.';
    }

    if (!newVisit.sameAsLastWeight && trimmedWeight !== '') {
      const parsedWeight = Number(trimmedWeight);
      if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) {
        errors.weight = 'Enter a valid positive weight.';
      }
    }

    if (trimmedLength !== '') {
      const parsedLength = Number(trimmedLength);
      if (!Number.isFinite(parsedLength) || parsedLength <= 0) {
        errors.length = 'Enter a valid positive length.';
      }
    }

    if (trimmedTemperature !== '') {
      const parsedTemperature = Number(trimmedTemperature);
      if (!Number.isFinite(parsedTemperature) || parsedTemperature <= 0) {
        errors.temperature = 'Enter a valid positive temperature.';
      }
    }

    const heartRateMatch = trimmedHeartRate.match(RATE_RANGE_COMPLETE_PATTERN);
    if (trimmedHeartRate !== '') {
      if (!heartRateMatch) {
        errors.heartRate = 'Enter a bpm range like 80-120.';
      } else if (Number(heartRateMatch[1]) > Number(heartRateMatch[2])) {
        errors.heartRate = 'Enter the lower bpm first, then the higher bpm.';
      }
    }

    const breathingRateMatch = trimmedBreathingRate.match(RATE_RANGE_COMPLETE_PATTERN);
    if (trimmedBreathingRate !== '') {
      if (!breathingRateMatch) {
        errors.breathingRate = 'Enter a breaths/min range like 15-30.';
      } else if (Number(breathingRateMatch[1]) > Number(breathingRateMatch[2])) {
        errors.breathingRate = 'Enter the lower breaths/min first, then the higher value.';
      }
    }

    if (Object.keys(errors).length > 0) {
      setVisitFormErrors(errors);
      showValidationAlert('Missing Visit Information', Object.values(errors).filter((message): message is string => Boolean(message)));
      return;
    }

    setVisitFormErrors({});

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
          : parseFloat(trimmedWeight) || 0;
        const finalWeightUnit = newVisit.sameAsLastWeight && lastWeightValue 
          ? lastWeightValue.unit 
          : newVisit.weightUnit;
        const finalClinicalExam = {
          ...newVisit.clinicalExam!,
          length: parseFloat(trimmedLength) || 0,
          temperature: parseFloat(trimmedTemperature) || 0,
          heartRate: trimmedHeartRate,
          breathingRate: trimmedBreathingRate,
        };
        const finalPrescriptions = applySharedPrescriptionInstructions(newVisit.prescriptions || [], prescriptionRemarks);
        
        const newVisitEntry: VisitHistory = {
          id: Date.now().toString(),
          sourceType: visitType === 'appointment' && selectedAppointment ? 'appointment' : 'manual',
          sourceId: selectedAppointment?.id || null,
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
            ? (selectedAppointment.reason || 'Not specified')
            : (newVisit.reason.trim() || 'Not specified'),
          doctorRemarks: newVisit.doctorRemarks,
          weight: finalWeight,
          weightUnit: finalWeightUnit,
          sameAsLastWeight: newVisit.sameAsLastWeight,
          neutered: newVisit.neutered,
          vaccinated: newVisit.vaccinated,
          deceased: newVisit.deceased,
          clinicalExam: finalClinicalExam,
          labResults: newVisit.labResults,
          prescriptions: finalPrescriptions,
          selectedServices: selectedServices,
          appointmentId: selectedAppointment?.id,
          billingSourceId: '',
          hasBillingInvoice: false,
          billingInvoiceId: null,
          billingInvoiceNumber: null,
          medicalInformation: visitType === 'appointment' && selectedAppointment
            ? selectedAppointment.medicalInformation || null
            : null,
          vaccinationDetails: isVaccinationSelected() && showVaccinationDetails ? vaccinationDetails : undefined
        };
        setVisitHistory([...visitHistory, newVisitEntry]);
        setWeight(finalWeight ? finalWeight.toString() : '');
        setWeightUnit(finalWeightUnit);
        
        if (newVisit.neutered && !neutered) setNeutered(true);
        if (newVisit.vaccinated && !vaccinated) setVaccinated(true);
        if (newVisit.deceased && !deceased) setDeceased(true);
        
        setShowAddVisit(false);
        setShowPrescriptionPanel(false);
        setShowLabPanel(false);
        setShowServicesPanel(false);
        setSelectedServices([]);
        setSelectedAppointment(null);
        setSelectedPrimaryServiceId('');
        setVisitType('');
        setAppointmentDateFilter('today');
        setShowVaccinationDetails(false);
        setVisitFormErrors({});
        setVisitFieldInputs({ ...EMPTY_VISIT_FIELD_INPUTS });
        setPrescriptionRemarks('');
        setVaccinationDetails({
          id: '',
          vaccineName: '',
          doseVolume: '',
          injectionSite: '',
          manufacturer: '',
          dateAdministered: new Date().toISOString().split('T')[0],
          nextDueDate: '',
          visibleToOwner: false,
          visibleToOwnerAt: '',
          visibleToOwnerBy: '',
        });
        setNewVisit({
          id: '',
          date: '',
          time: '',
          veterinarian: '',
          reason: '',
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
        showAlert('success', 'Visit Added', 'Visit record has been added to this medical record. Save the medical record to keep it.');
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
          void loadRecordForEdit(pet.existingRecordId || 0);
          setShowPetSearch(false);
          setPetSearchQuery('');
          setSearchResults(allSearchResults);
        },
        true
      );
      return;
    }

    const resolvedPetId = pet.petId || pet.id;

    setSelectedPetId(resolvedPetId);
    setPetName(pet.petName);
    setSpecies(pet.species as Species);
    setBreed(pet.breed);
    setGender(pet.gender as Gender);
    setDateOfBirth(pet.dateOfBirth);
    setAge(calculateAge(pet.dateOfBirth));
    setWeight(pet.weightKg || '');
    setWeightUnit('kg');
    setColorMarkings(pet.colorMarkings);
    setNeutered(pet.neutered);
    setVaccinated(pet.vaccinated);
    setVaccinationProof(pet.vaccinationProof || '');
    setDeceased(pet.deceased || false);
    setPetImage(pet.image || '');
    setOwnerFirstName(pet.ownerFirstName || pet.ownerName.split(' ')[0] || '');
    setOwnerLastName(pet.ownerLastName || pet.ownerName.split(' ').slice(1).join(' ') || '');
    setOwnerEmail(pet.ownerEmail);
    setOwnerContact(formatPhoneNumber(pet.ownerContact));
    setPatientId(buildPatientDisplayId(resolvedPetId));
    setShowPetSearch(false);
    setPetSearchQuery('');
    setSearchResults(allSearchResults);
    if (resolvedPetId) {
      void fetchAppointmentsForPet(resolvedPetId);
    }
  };

  const applyRecordToForm = (record: MedicalRecord) => {
    setDoctorAiSummary(null);
    setDoctorAiError('');
    setDoctorAiCollapsed(false);
    setPrescriptionRemarks('');
    setSelectedPrimaryServiceId('');
    setSelectedServices([]);
    setSelectedAppointment(null);
    setVisitType('');
    setVisitFormErrors({});
    setVisitFieldInputs({ ...EMPTY_VISIT_FIELD_INPUTS });
    setNewVisit({
      id: '',
      date: '',
      time: '',
      veterinarian: '',
      reason: '',
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
    setEditingId(record.id || record.pk || null);
    setSelectedPetId(record.petId || null);
    setPatientId(record.patientId);
    setPetName(record.petName);
    setOwnerFirstName(record.ownerFirstName);
    setOwnerLastName(record.ownerLastName);
    setOwnerEmail(record.ownerEmail);
    setOwnerContact(formatPhoneNumber(record.ownerContact));
    setDoctorAssigned(formatVeterinarianName(record.veterinarian) || veterinarianOptions[0] || DEFAULT_VETERINARIAN);
    setReasonForVisit(record.reason || REASONS[0]);
    setReasonOther('');
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
    }

    if (record.visitHistory && record.visitHistory.length > 0) {
      const lastVisit = record.visitHistory[record.visitHistory.length - 1];
      setLastWeight({ value: lastVisit.weight, unit: lastVisit.weightUnit });
    } else {
      setLastWeight(null);
    }

    if (record.petId) {
      void fetchAppointmentsForPet(record.petId);
    } else {
      setAppointmentRecords([]);
    }

    setFormBaselineSnapshot(buildRecordFormSnapshot(record));
    setViewMode('edit');
    setEditModeEnabled(false);
    setShowModeOverlay(true);
    setActiveTab('info');
  };

  const loadRecordForEdit = async (recordId: number) => {
    setOpeningRecordId(recordId);
    try {
      const localRecord = records.find(r => (r.id || r.pk) === recordId);
      if (localRecord?.detailsLoaded) {
        applyRecordToForm(localRecord);
        return;
      }

      const response = await apiService.getEmrRecord(recordId);
      if (response?.record) {
        applyRecordToForm(normalizeRecordForDisplay(response.record));
      }
    } catch (error) {
      console.error('Error loading EMR record for edit:', error);
      showAlert('error', 'Error', 'Failed to load the selected medical record.');
    } finally {
      setOpeningRecordId(null);
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
    fetchSearchPets();
    fetchVeterinarians();
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (visitType !== 'appointment' || !selectedAppointment) {
      return;
    }

    const todayDate = getCurrentDateInTimeZone('Asia/Manila');
    const selectedStillVisible = appointmentRecords.some((appointment) => {
      if (appointment.id !== selectedAppointment.id || appointment.status !== 'scheduled') {
        return false;
      }

      const appointmentDate = normalizeAppointmentDateValue(appointment.dateRaw, appointment.date);
      if (!appointmentDate || !todayDate) {
        return false;
      }

      if (appointmentDateFilter === 'today') {
        return appointmentDate === todayDate;
      }

      return appointmentDate > todayDate;
    });

    if (!selectedStillVisible) {
      setSelectedAppointment(null);
      setSelectedPrimaryServiceId('');
      setSelectedServices([]);
      setNewVisit((prev) => ({
        ...prev,
        veterinarian: '',
        reason: ''
      }));
    }
  }, [appointmentDateFilter, appointmentRecords, selectedAppointment, visitType]);


  const resetForm = (): void => {
    setSelectedPetId(null);
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
    setDoctorAssigned(veterinarianOptions[0] || DEFAULT_VETERINARIAN);
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
    setSelectedPrimaryServiceId('');
    setSelectedServices([]);
    setSelectedAppointment(null);
    setAppointmentRecords([]);
    setAppointmentDateFilter('today');
    setVisitType('');
    setVisitFormErrors({});
    setVisitFieldInputs({ ...EMPTY_VISIT_FIELD_INPUTS });
    setNewVisit({
      id: '',
      date: '',
      time: '',
      veterinarian: '',
      reason: '',
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
    setPrescriptionRemarks('');
    setShowVaccinationDetails(false);
    setVaccinationDetails({
      id: '',
      vaccineName: '',
      doseVolume: '',
      injectionSite: '',
      manufacturer: '',
      dateAdministered: new Date().toISOString().split('T')[0],
      nextDueDate: '',
      visibleToOwner: false,
      visibleToOwnerAt: '',
      visibleToOwnerBy: '',
    });
    setFormBaselineSnapshot(buildEmptyFormSnapshot());
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
    confirmLeaveCurrentView(() => {
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
    }, 'You have unsaved changes. Are you sure you want to leave this page and log out?');
  };

  const handleCreateInvoice = (visit: VisitHistory) => {
    const billingSourceType = visit.billingSourceType || 'visit';
    const billingSourceId = visit.billingSourceId || visit.id;
    const invoiceType = visit.sourceType === 'appointment' ? 'appointment' : 'walkin';

    if (!billingSourceId || Number.isNaN(Number(billingSourceId))) {
      showAlert('info', 'Save Record First', 'Save this medical record first so the visit can be linked to billing.');
      return;
    }

    setBillingNavigationVisitId(visit.id);
    window.setTimeout(() => {
      navigate('/billing', {
        state: {
          billingAction: {
            invoiceType,
            sourceRecordType: billingSourceType,
            sourceRecordId: billingSourceId,
            billingInvoiceId: visit.billingInvoiceId || null,
          }
        }
      });
    }, BILLING_NAVIGATION_DELAY_MS);
  };

  const handleCancel = (): void => {
    confirmLeaveCurrentView(
      () => {
        setViewMode('list');
        resetForm();
      },
      'You have unsaved changes. Are you sure you want to discard them?'
    );
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    const finalBreed = breed === 'Others' ? breedOther.trim() : breed.trim();
    
    if (!petName.trim()) errors.petName = 'Pet name is required';
    if (!finalBreed) errors.breed = 'Breed is required';
    if (!ownerFirstName.trim()) errors.ownerFirstName = 'Owner first name is required';
    if (!ownerLastName.trim()) errors.ownerLastName = 'Owner last name is required';
    if (!ownerEmail.trim()) errors.ownerEmail = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(ownerEmail)) errors.ownerEmail = 'Email is invalid';
    const ownerContactDigits = normalizePhilippinePhoneDigits(ownerContact);
    if (!ownerContact.trim()) errors.ownerContact = 'Contact number is required';
    else if (!ownerContactDigits.startsWith('63')) errors.ownerContact = 'Please enter a valid PH number starting with 63';
    else if (ownerContactDigits.length !== PH_PHONE_TOTAL_DIGITS) errors.ownerContact = 'Please enter a valid 12-digit number (including 63)';
    if (!doctorAssigned) errors.veterinarian = 'Veterinarian is required';
    if (!reasonForVisit) errors.reason = 'Reason for visit is required';
    
    setFormErrors(errors);
    const validationMessages = Object.values(errors).filter((error): error is string => Boolean(error));
    if (validationMessages.length > 0) {
      showValidationAlert('Missing Record Information', validationMessages);
      return false;
    }
    return true;
  };

  const handleSaveRecord = async (): Promise<void> => {
    if (isSavingRecord) return;
    if (!validateForm()) return;
    if (!selectedPetId) {
      showAlert('error', 'Pet Profile Required', 'Please search and select an existing pet profile before saving a medical record.');
      return;
    }
    if (viewMode === 'edit' && !editingId) {
      showAlert('error', 'Record Not Found', 'We could not determine which medical record to update.');
      return;
    }

    const finalBreed = breed === 'Others' ? breedOther : breed;

    const recordData = {
      petId: selectedPetId,
      patientId: patientId || buildPatientDisplayId(selectedPetId),
      petName,
      ownerName: `${ownerFirstName} ${ownerLastName}`,
      ownerFirstName,
      ownerLastName,
      ownerEmail,
      ownerContact: toStoredPhoneNumber(ownerContact),
      lastVisit: new Date().toISOString().split('T')[0],
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
        setIsSavingRecord(true);
        try {
          if (viewMode === 'add') {
            await apiService.createEmrRecord(recordData);
          } else {
            await apiService.updateEmrRecord(editingId || 0, recordData);
          }
          await Promise.all([fetchRecords(), fetchSearchPets()]);
          setViewMode('list');
          setShowModeOverlay(false);
          setSelectedRecords(new Set());
          showAlert('success', 'Success', 
            viewMode === 'add' ? 'Medical record created successfully!' : 'Record updated successfully!', 
            () => resetForm()
          );
        } catch (error: any) {
          console.error('Failed to save medical record:', error);
          showAlert('error', 'Error', getApiErrorMessage(error, 'Failed to save medical record.'));
        } finally {
          setIsSavingRecord(false);
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
          await Promise.all(
            Array.from(selectedRecords).map(recordId => apiService.deleteEmrRecord(recordId))
          );
          await Promise.all([fetchRecords(), fetchSearchPets()]);
          setSelectedRecords(new Set());
          
          showAlert('success', 'Success', 'Records deleted successfully!');
        } catch (error) {
          console.error('Failed to delete medical records:', error);
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

  const availableVeterinarians = Array.from(
    new Set([
      ...veterinarianOptions,
      formatVeterinarianName(doctorAssigned),
      formatVeterinarianName(newVisit.veterinarian),
      ...records.map(record => formatVeterinarianName(record.veterinarian)).filter(Boolean),
      ...visitHistory.map(visit => formatVeterinarianName(visit.veterinarian)).filter(Boolean)
    ].filter(Boolean) as string[])
  );

  const filteredRecords = records.filter(record => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      record.patientId?.toLowerCase().includes(searchLower) ||
      record.petName.toLowerCase().includes(searchLower) ||
      record.ownerName.toLowerCase().includes(searchLower);

    const matchesDate = dateFilter ? (record.lastVisitRaw || '') === dateFilter : true;
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

  const todayAppointmentDate = getCurrentDateInTimeZone('Asia/Manila');
  const filteredAppointmentRecords = appointmentRecords.filter((appointment) => {
    if (appointment.status !== 'scheduled') {
      return false;
    }

    const appointmentDate = normalizeAppointmentDateValue(appointment.dateRaw, appointment.date);
    if (!appointmentDate || !todayAppointmentDate) {
      return false;
    }

    if (appointmentDateFilter === 'today') {
      return appointmentDate === todayAppointmentDate;
    }

    return appointmentDate > todayAppointmentDate;
  });
  const selectedAppointmentMedicalInformation =
    visitType === 'appointment' ? selectedAppointment?.medicalInformation || null : null;
  const selectedAppointmentServiceLabel =
    visitType === 'appointment' && selectedAppointment
      ? ((selectedAppointment.services || []).map((service) => service.name).filter(Boolean).join(', ') || 'Not specified')
      : '';
  const selectedVisitReasonValue =
    visitType === 'appointment'
      ? (selectedAppointment ? (newVisit.reason || selectedAppointment.reason || 'Not specified') : '')
      : visitType === 'walkin'
        ? newVisit.reason
        : '';

  const renderMedicalInformationBlock = (
    medicalInformation?: MedicalInformation | null,
    title: string = 'Medical Information'
  ) => {
    if (!hasMedicalInformationContent(medicalInformation)) {
      return null;
    }

    const summaryItems = [
      { key: 'medications72h', label: 'Medications in Past 72 Hours', value: formatMedicalInformationAnswer(medicalInformation?.on_medication) },
      { key: 'fleaTick', label: 'Flea/Tick Prevention', value: formatMedicalInformationAnswer(medicalInformation?.flea_tick_prevention) },
      { key: 'vaccinations', label: 'Up-to-Date Vaccinations', value: formatMedicalInformationAnswer(medicalInformation?.is_vaccinated) },
      { key: 'pregnant', label: 'Pregnant', value: formatMedicalInformationAnswer(medicalInformation?.is_pregnant) },
    ];

    const optionalItems = [
      medicalInformation?.medication_details?.trim()
        ? { key: 'medicationDetails', label: 'Medication Details', value: medicalInformation.medication_details.trim() }
        : null,
      medicalInformation?.has_allergies !== null && medicalInformation?.has_allergies !== undefined
        ? { key: 'allergies', label: 'Allergies', value: formatMedicalInformationAnswer(medicalInformation.has_allergies) }
        : null,
      medicalInformation?.allergy_details?.trim()
        ? { key: 'allergyDetails', label: 'Allergy Details', value: medicalInformation.allergy_details.trim() }
        : null,
      medicalInformation?.has_skin_condition !== null && medicalInformation?.has_skin_condition !== undefined
        ? { key: 'skinCondition', label: 'Skin Condition', value: formatMedicalInformationAnswer(medicalInformation.has_skin_condition) }
        : null,
      medicalInformation?.skin_condition_details?.trim()
        ? { key: 'skinConditionDetails', label: 'Skin Condition Details', value: medicalInformation.skin_condition_details.trim() }
        : null,
      medicalInformation?.been_groomed_before !== null && medicalInformation?.been_groomed_before !== undefined
        ? { key: 'groomedBefore', label: 'Been Groomed Before', value: formatMedicalInformationAnswer(medicalInformation.been_groomed_before) }
        : null,
      medicalInformation?.additional_notes?.trim()
        ? { key: 'additionalNotes', label: 'Additional Notes', value: medicalInformation.additional_notes.trim() }
        : null,
      Array.isArray(medicalInformation?.reported_symptoms) && medicalInformation.reported_symptoms.length > 0
        ? { key: 'reportedSymptoms', label: 'Owner-Reported Symptoms', value: medicalInformation.reported_symptoms.join(', ') }
        : null,
      medicalInformation?.symptom_duration?.trim()
        ? { key: 'symptomDuration', label: 'Symptom Duration', value: medicalInformation.symptom_duration.trim() }
        : null,
      medicalInformation?.worsening_status?.trim()
        ? { key: 'worseningStatus', label: 'Condition Getting Worse', value: medicalInformation.worsening_status.trim() }
        : null,
      medicalInformation?.eating_status?.trim()
        ? { key: 'eatingStatus', label: 'Eating Status', value: medicalInformation.eating_status.trim() }
        : null,
      medicalInformation?.drinking_status?.trim()
        ? { key: 'drinkingStatus', label: 'Drinking Status', value: medicalInformation.drinking_status.trim() }
        : null,
      medicalInformation?.owner_symptom_notes?.trim()
        ? { key: 'ownerSymptomNotes', label: 'Owner Symptom Notes', value: medicalInformation.owner_symptom_notes.trim() }
        : null,
    ].filter((item): item is { key: string; label: string; value: string } => item !== null);

    return (
      <div className="emrMedicalInfoBlock">
        <div className="emrMedicalInfoTitle">{title}</div>
        <div className="emrMedicalInfoGrid">
          {summaryItems.map((item) => (
            <div key={item.key} className="emrMedicalInfoItem">
              <span className="emrMedicalInfoLabel">{item.label}</span>
              <span
                className={`emrMedicalInfoValue ${item.value === 'Yes' ? 'isYes' : item.value === 'No' ? 'isNo' : 'isNeutral'}`}
              >
                {item.value}
              </span>
            </div>
          ))}
          {optionalItems.map((item) => (
            <div key={item.key} className="emrMedicalInfoItem emrMedicalInfoItemFull">
              <span className="emrMedicalInfoLabel">{item.label}</span>
              <span className="emrMedicalInfoValue isNeutral">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

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

  const formatMedicalInformationForAi = (medicalInformation?: MedicalInformation | null) => {
    if (!medicalInformation) return null;

    return {
      medications_in_past_72_hours: formatMedicalInformationAnswer(medicalInformation.on_medication),
      medication_details: medicalInformation.medication_details || '',
      flea_tick_prevention: formatMedicalInformationAnswer(medicalInformation.flea_tick_prevention),
      up_to_date_vaccinations: formatMedicalInformationAnswer(medicalInformation.is_vaccinated),
      pregnant: formatMedicalInformationAnswer(medicalInformation.is_pregnant),
      has_allergies: formatMedicalInformationAnswer(medicalInformation.has_allergies),
      allergy_details: medicalInformation.allergy_details || '',
      has_skin_condition: formatMedicalInformationAnswer(medicalInformation.has_skin_condition),
      skin_condition_details: medicalInformation.skin_condition_details || '',
      been_groomed_before: formatMedicalInformationAnswer(medicalInformation.been_groomed_before),
      additional_notes: medicalInformation.additional_notes || '',
      reported_symptoms: Array.isArray(medicalInformation.reported_symptoms) ? medicalInformation.reported_symptoms : [],
      owner_symptom_notes: medicalInformation.owner_symptom_notes || '',
      symptom_duration: medicalInformation.symptom_duration || '',
      eating_status: medicalInformation.eating_status || '',
      drinking_status: medicalInformation.drinking_status || '',
      worsening_status: medicalInformation.worsening_status || '',
    };
  };

  const buildDoctorAiPayload = () => ({
    recordId: editingId,
    petId: selectedPetId,
    pet: {
      name: petName,
      species,
      breed,
      gender,
      age,
      weight: weight ? `${weight} ${weightUnit}` : '',
      neutered,
      vaccinated,
    },
    owner: {
      name: `${ownerFirstName} ${ownerLastName}`.trim(),
      contact: ownerContact,
      email: ownerEmail,
    },
    current_record: {
      reason_for_visit: reasonForVisit,
      assigned_doctor: doctorAssigned,
    },
    visit_history: visitHistory.map((visit) => ({
      date: visit.date,
      time: visit.time,
      veterinarian: visit.veterinarian,
      reason: visit.reason,
      weight: `${visit.weight} ${visit.weightUnit}`,
      neutered: visit.neutered,
      vaccinated: visit.vaccinated,
      deceased: visit.deceased,
      clinical_exam: visit.clinicalExam || null,
      services: (visit.selectedServices || []).map((service) => service.name).filter(Boolean),
      lab_results: (visit.labResults || []).map((lab) => ({
        test_type: lab.testType,
        interpretation: lab.interpretation,
      })),
      prescriptions: (visit.prescriptions || []).map((prescription) => ({
        medication_name: prescription.medicationName,
        dosage: prescription.dosage,
        route: prescription.route || '',
        frequency: prescription.frequency,
        duration: prescription.duration,
        instructions: prescription.instructions || '',
      })),
      medical_information: formatMedicalInformationForAi(visit.medicalInformation),
      doctor_remarks: visit.doctorRemarks?.replace(/<[^>]*>/g, ' ') || '',
    })),
  });

  const handleGenerateDoctorAiBrief = async () => {
    setDoctorAiLoading(true);
    setDoctorAiError('');

    try {
      const response = await apiService.generateDoctorEmrBrief(buildDoctorAiPayload());
      setDoctorAiSummary(response.summary || null);
      setDoctorAiCollapsed(false);
    } catch (error: any) {
      setDoctorAiSummary(null);
      setDoctorAiError(getAiFallbackMessage(error, 'Unable to generate the EMR prep brief right now.'));
    } finally {
      setDoctorAiLoading(false);
    }
  };

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
      {billingNavigationVisitId !== null && (
        <div className="emrBillingNavigationOverlay" aria-live="polite" aria-busy="true">
          <div className="emrBillingNavigationPanel">
            <span className="emrActionSpinner" aria-hidden="true" />
            <span>Opening Billing...</span>
          </div>
        </div>
      )}
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
      
      <Navbar
        currentUser={currentUser}
        onLogout={handleLogoutPress}
        onNavigateAttempt={handleProtectedNavigation}
      />
      
      <div className="emrBodyContainer">
        <div className="emrTopContainer">
          <div className="emrSubTopContainer">
            <div className="emrSubTopLeft">
              <CiMedicalClipboard size={20} className="emrBlueIcon" />
              <span className="emrBlueText">{isDoctorLayout ? 'Doctor Medical Records' : 'Medical Records'}</span>
            </div>
          </div>
          <div className="emrSubTopContainer emrNotificationContainer">
            <Notifications 
              buttonClassName="emrIconButton"
              iconClassName="emrBlueIcon"
              onViewAll={() => console.log('View all notifications')}
              onNotificationClick={(notification) => {
                const notificationLink = notification.link;
                if (notificationLink) {
                  handleProtectedNavigation(notificationLink, () => navigate(notificationLink));
                }
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
                        {veterinarianOptions.map(doc => (
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
                  {!doctorMode && selectedRecords.size > 0 && (
                    <button className="emrDeleteBtn" onClick={handleDeleteSelected}>
                      <IoTrashOutline size={14} /> Delete ({selectedRecords.size})
                    </button>
                  )}
                  {activeFilter && (
                    <button className="emrReturnBtn" onClick={handleReturnToList}>
                      <IoArrowBackOutline size={14} /> Return
                    </button>
                  )}
                  {!doctorMode && (
                    <button className="emrBlackBtn" onClick={() => { resetForm(); setViewMode('add'); setShowModeOverlay(true); }}>
                      <IoAdd size={14} /> New Record
                    </button>
                  )}
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
                          {!doctorMode && (
                            <input
                              type="checkbox"
                              checked={selectedRecords.size === paginatedRecords.length && paginatedRecords.length > 0}
                              onChange={toggleAllRecords}
                              className="emrCheckbox"
                            />
                          )}
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
                          const isOpeningRecord = openingRecordId === recordId;
                          return (
                            <tr key={recordId} className={isDeceased ? 'emrDeceasedRow' : ''}>
                              <td>
                                {!doctorMode && (
                                  <input
                                    type="checkbox"
                                    checked={selectedRecords.has(recordId)}
                                    onChange={() => toggleRecordSelection(recordId)}
                                    className="emrCheckbox"
                                  />
                                )}
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
                                    onClick={() => { void loadRecordForEdit(recordId); }}
                                    disabled={openingRecordId !== null}
                                    title={isDeceased ? "Open deceased record" : "Open record"}
                                  >
                                    {isOpeningRecord ? (
                                      <span className="emrActionSpinner" aria-label="Opening record" />
                                    ) : (
                                      <FaEye size={14} />
                                    )}
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
          ) : viewMode === 'add' && !doctorMode ? (
            <div className="emrFormContainer">
              <div className="emrFormHeader">
                <div className="emrFormHeaderLeft">
                  <IoCreateOutline size={20} className="emrHeaderIcon" />
                  <h3>Create New Medical Record</h3>
                </div>
                <button className="emrFormClose" onClick={handleCancel} disabled={isSavingRecord}>×</button>
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
                            setBreedOther('');
                            setFormErrors((prev) => ({ ...prev, breed: undefined }));
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
                            setBreedOther('');
                            setFormErrors((prev) => ({ ...prev, breed: undefined }));
                          }}
                        >
                          <IoPawOutline size={14} /> Cat
                        </button>
                      </div>
                    </div>

                    <div className="emrFormGroup">
                      <label>Breed <span className="emrRequired">*</span></label>
                      <select 
                        value={breed}
                        onChange={(e) => {
                          setBreed(e.target.value);
                          setFormErrors((prev) => ({ ...prev, breed: undefined }));
                        }}
                        className={`emrFormSelect ${formErrors.breed ? 'emrError' : ''}`}
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
                          onChange={(e) => {
                            setBreedOther(e.target.value);
                            setFormErrors((prev) => ({ ...prev, breed: undefined }));
                          }}
                          placeholder="Please specify breed"
                          className={`emrFormInput emrMarginTop ${formErrors.breed ? 'emrError' : ''}`}
                        />
                      )}
                      {formErrors.breed && <div className="emrErrorText">{formErrors.breed}</div>}
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
                        onChange={(e) => setOwnerContact(formatPhoneNumber(e.target.value))}
                        placeholder="+63 XXX XXX XXXX"
                        className={`emrFormInput ${formErrors.ownerContact ? 'emrError' : ''}`}
                      />
                      {formErrors.ownerContact && <div className="emrErrorText">{formErrors.ownerContact}</div>}
                    </div>
                  </div>
                </div>

                <div className="emrFormActions">
                  <button className="emrCancelBtn" onClick={handleCancel} disabled={isSavingRecord}>
                    Cancel
                  </button>
                  <button className="emrSubmitBtn" onClick={handleSaveRecord} disabled={isSavingRecord}>
                    {isSavingRecord && <span className="emrBtnSpinner" aria-hidden="true"></span>}
                    {isSavingRecord ? 'Creating Record...' : 'Create Record'}
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
                {activeTab === 'info' && (
                  <div className="emrHeaderActions">
                    <label className="emrSwitch">
                      <input
                        type="checkbox"
                        checked={editModeEnabled}
                        onChange={(e) => handleEditModeToggle(e.target.checked)}
                      />
                      <span className="emrSlider"></span>
                      <span className="emrSwitchLabel">{editModeEnabled ? 'Edit Mode ON' : 'Edit Mode OFF'}</span>
                    </label>
                  </div>
                )}
                <button className="emrFormClose" onClick={handleCancel} disabled={isSavingRecord}>×</button>
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

              {viewMode === 'edit' && (
                <div className="emrDoctorAiPanel">
                  <div className="emrDoctorAiHeader">
                    <div>
                      <div className="emrDoctorAiEyebrow">{doctorMode ? 'Doctor AI Support' : 'Admin EMR AI Support'}</div>
                      <h4>Clinical Prep Brief</h4>
                      <p>
                        Summarizes EMR history and owner symptom intake for faster review by clinic staff and veterinarians. It does not diagnose or prescribe.
                      </p>
                    </div>
                    <div className="emrDoctorAiActions">
                      {(doctorAiSummary || doctorAiError) && (
                        <button
                          type="button"
                          className="emrDoctorAiSecondaryBtn"
                          onClick={() => setDoctorAiCollapsed(prev => !prev)}
                        >
                          {doctorAiCollapsed ? 'Expand' : 'Collapse'}
                        </button>
                      )}
                      <button
                        type="button"
                        className="emrDoctorAiPrimaryBtn"
                        onClick={handleGenerateDoctorAiBrief}
                        disabled={doctorAiLoading || visitHistory.length === 0}
                      >
                        {doctorAiLoading ? 'Generating...' : doctorAiSummary ? 'Regenerate Brief' : 'Generate Brief'}
                      </button>
                    </div>
                  </div>

                  {visitHistory.length === 0 && (
                    <div className="emrDoctorAiHint">
                      Add or load at least one visit record before generating an EMR prep brief.
                    </div>
                  )}

                  {doctorAiError && (
                    <div className="emrDoctorAiError">{doctorAiError}</div>
                  )}

                  {doctorAiSummary && !doctorAiCollapsed && (
                    <div className="emrDoctorAiBody">
                      <div className="emrDoctorAiSummary">
                        <span>Case Overview</span>
                        <p>{doctorAiSummary.summary}</p>
                      </div>
                      <div className="emrDoctorAiGrid">
                        <div className="emrDoctorAiColumn emrDoctorAiColumnCritical">
                          <h5>Clinical Considerations</h5>
                          <ul>
                            {(doctorAiSummary.important_flags || []).length > 0
                              ? doctorAiSummary.important_flags.map((item, index) => <li key={`flag-${index}`}>{item}</li>)
                              : <li>No major considerations were identified from the provided EMR data.</li>}
                          </ul>
                        </div>
                        <div className="emrDoctorAiColumn">
                          <h5>Owner Questions</h5>
                          <ul>
                            {(doctorAiSummary.follow_up_questions || []).length > 0
                              ? doctorAiSummary.follow_up_questions.map((item, index) => <li key={`question-${index}`}>{item}</li>)
                              : <li>No follow-up questions were suggested.</li>}
                          </ul>
                        </div>
                        <div className="emrDoctorAiColumn">
                          <h5>Missing Context</h5>
                          <ul>
                            {(doctorAiSummary.missing_information || []).length > 0
                              ? doctorAiSummary.missing_information.map((item, index) => <li key={`missing-${index}`}>{item}</li>)
                              : <li>No major missing context was identified.</li>}
                          </ul>
                        </div>
                      </div>
                      {doctorAiSummary.model && (
                        <div className="emrDoctorAiFooter">
                          Generated by {doctorAiSummary.model}. Vet review remains required.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

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
                            {canEditPetProfileFields && (
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
                            disabled={!canEditPetProfileFields}
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
                              onClick={() => { if (canEditPetProfileFields) { setSpecies('Dog'); setBreed(''); setBreedOther(''); setFormErrors((prev) => ({ ...prev, breed: undefined })); } }}
                              disabled={!canEditPetProfileFields}
                            >
                              <IoPawOutline size={14} /> Dog
                            </button>
                            <button 
                              type="button"
                              className={`emrToggleBtnFull ${species === 'Cat' ? 'emrToggleActiveFull' : ''}`}
                              onClick={() => { if (canEditPetProfileFields) { setSpecies('Cat'); setBreed(''); setBreedOther(''); setFormErrors((prev) => ({ ...prev, breed: undefined })); } }}
                              disabled={!canEditPetProfileFields}
                            >
                              <IoPawOutline size={14} /> Cat
                            </button>
                          </div>
                        </div>

                        <div className="emrFormGroup">
                          <label>Breed <span className="emrRequired">*</span></label>
                          <select 
                            value={breed}
                            onChange={(e) => {
                              setBreed(e.target.value);
                              setFormErrors((prev) => ({ ...prev, breed: undefined }));
                            }}
                            disabled={!canEditPetProfileFields}
                            className={`emrFormSelect ${formErrors.breed ? 'emrError' : ''}`}
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
                              onChange={(e) => {
                                setBreedOther(e.target.value);
                                setFormErrors((prev) => ({ ...prev, breed: undefined }));
                              }}
                              placeholder="Please specify breed"
                              className={`emrFormInput emrMarginTop ${formErrors.breed ? 'emrError' : ''}`}
                              disabled={!canEditPetProfileFields}
                            />
                          )}
                          {formErrors.breed && <div className="emrErrorText">{formErrors.breed}</div>}
                        </div>
                      </div>

                      <div className="emrFormRow">
                        <div className="emrFormGroup">
                          <label>Gender</label>
                          <div className="emrToggleGroupFull">
                            <button 
                              type="button"
                              className={`emrToggleBtnFull emrGenderMale ${gender === 'Male' ? 'emrToggleActiveFull' : ''}`}
                              onClick={() => { if (canEditPetProfileFields) setGender('Male'); }}
                              disabled={!canEditPetProfileFields}
                            >
                              <IoMaleFemaleOutline size={14} /> Male
                            </button>
                            <button 
                              type="button"
                              className={`emrToggleBtnFull emrGenderFemale ${gender === 'Female' ? 'emrToggleActiveFull' : ''}`}
                              onClick={() => { if (canEditPetProfileFields) setGender('Female'); }}
                              disabled={!canEditPetProfileFields}
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
                            disabled={!canEditPetProfileFields}
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
                              disabled={!canEditPetProfileFields}
                            />
                            <div className="emrWeightUnitSelect">
                              <button 
                                type="button"
                                className={`emrWeightUnitBtn ${weightUnit === 'kg' ? 'emrWeightUnitActive' : ''}`}
                                onClick={() => { if (canEditPetProfileFields) setWeightUnit('kg'); }}
                                disabled={!canEditPetProfileFields}
                              >
                                kg
                              </button>
                              <button 
                                type="button"
                                className={`emrWeightUnitBtn ${weightUnit === 'lbs' ? 'emrWeightUnitActive' : ''}`}
                                onClick={() => { if (canEditPetProfileFields) setWeightUnit('lbs'); }}
                                disabled={!canEditPetProfileFields}
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
                            disabled={!canEditPetProfileFields}
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
                              onClick={() => { if (canEditPetProfileFields) setNeutered(true); }}
                              disabled={!canEditPetProfileFields}
                            >
                              <IoCheckmarkCircleOutline size={14} /> Yes
                            </button>
                            <button 
                              type="button"
                              className={`emrToggleBtnFull emrToggleNo ${neutered === false ? 'emrToggleActiveFull' : ''}`}
                              onClick={() => { if (canEditPetProfileFields) setNeutered(false); }}
                              disabled={!canEditPetProfileFields}
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
                              onClick={() => { if (canEditDeceasedStatus) setDeceased(true); }}
                              disabled={!canEditDeceasedStatus}
                            >
                              <IoAlertCircleOutline size={14} /> Yes
                            </button>
                            <button 
                              type="button"
                              className={`emrToggleBtnFull emrToggleNo ${deceased === false ? 'emrToggleActiveFull' : ''}`}
                              onClick={() => { if (canEditDeceasedStatus) setDeceased(false); }}
                              disabled={!canEditDeceasedStatus}
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
                                onClick={() => { if (canEditPetProfileFields) setVaccinated(true); }}
                                disabled={!canEditPetProfileFields}
                              >
                                <IoCheckmarkCircleOutline size={14} /> Yes
                              </button>
                              <button 
                                type="button"
                                className={`emrToggleBtnFull emrToggleNo ${vaccinated === false ? 'emrToggleActiveFull' : ''}`}
                                onClick={() => { if (canEditPetProfileFields) setVaccinated(false); }}
                                disabled={!canEditPetProfileFields}
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
                            disabled
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
                            disabled
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
                            disabled
                            className={`emrFormInput ${formErrors.ownerEmail ? 'emrError' : ''}`}
                          />
                          {formErrors.ownerEmail && <div className="emrErrorText">{formErrors.ownerEmail}</div>}
                        </div>

                        <div className="emrFormGroup">
                          <label>Contact Number <span className="emrRequired">*</span></label>
                          <input 
                            type="tel"
                            value={ownerContact}
                            onChange={(e) => setOwnerContact(formatPhoneNumber(e.target.value))}
                            disabled
                            placeholder="+63 XXX XXX XXXX"
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
                          {availableVeterinarians.map(doc => (
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
                        filteredVisits.map((visit, index) => {
                          const visitServices = visit.selectedServices ?? [];
                          const visitPrescriptionRemarks = getSharedPrescriptionInstructions(visit.prescriptions || []);
                          const isOpeningBilling = billingNavigationVisitId === visit.id;

                          return (
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
                                  {visitServices.length > 0 && (
                                    <span className="emrStatusActive" style={{ marginLeft: '8px', fontSize: '10px', backgroundColor: '#e3f2fd', color: '#1565c0' }}>
                                      <IoListOutline size={10} /> {visitServices.length} Service(s)
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
                                    disabled={billingNavigationVisitId !== null}
                                    title={visit.hasBillingInvoice ? 'View Invoice' : 'Proceed to Billing'}
                                  >
                                    {isOpeningBilling ? (
                                      <>
                                        <span className="emrBtnSpinner" aria-hidden="true"></span>
                                        Opening Billing...
                                      </>
                                    ) : (
                                      <>
                                        <IoReceipt size={14} /> {visit.hasBillingInvoice ? 'View Invoice' : 'Proceed to Billing'}
                                      </>
                                    )}
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
                                <div><strong>Reason / Chief Complaint:</strong> {visit.reason}</div>
                                {visitServices.length > 0 && (
                                  <div className="emrFullWidth">
                                    <strong>Services Provided:</strong>
                                    <div className="emrServicesList">
                                      {visitServices.map((service, idx) => (
                                        <span key={service.id} className="emrServiceTag">
                                          {service.name}
                                          {idx < visitServices.length - 1 && ', '}
                                        </span>
                                      ))}
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
                                  {visit.medicalInformation && (
                                    <div className="emrFullWidth">
                                      {renderMedicalInformationBlock(visit.medicalInformation, 'Medical Information')}
                                    </div>
                                  )}
                                  
                                  {/* Display all services in expanded view with more details */}
                                  {visitServices.length > 0 && (
                                    <div className="emrFullWidth">
                                      <strong>Services:</strong>
                                      <div className="emrServicesDetailedList">
                                        <table className="emrServicesTable">
                                          <thead>
                                            <tr>
                                              <th>Service</th>
                                              <th>Description</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {visitServices.map(service => (
                                              <tr key={service.id}>
                                                <td>{service.name}</td>
                                                <td className="emrServiceDescCell">{service.description || '—'}</td>
                                              </tr>
                                            ))}
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
                                      {visit.prescriptions.map((pres) => (
                                        <div key={pres.id} className="emrPrescriptionItem">
                                          <span>&bull; <strong>{pres.medicationName || 'Medication'}</strong></span>
                                          {formatPrescriptionDisplayParts(pres).length > 0 && (
                                            <span> - {formatPrescriptionDisplayParts(pres).join(' | ')}</span>
                                          )}
                                        </div>
                                      ))}
                                      {visitPrescriptionRemarks && (
                                        <div className="emrPrescriptionInstructions" style={{ whiteSpace: 'pre-wrap' }}>
                                          Instructions: {visitPrescriptionRemarks}
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {false && ((visit.prescriptions?.length || 0) > 0) && (
                                    <div className="emrFullWidth">
                                      <strong>Prescriptions:</strong>
                                      {visit.prescriptions?.map((pres, idx) => (
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
                        )})
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
                    
                    <button className="emrFloatingBtn" onClick={openAddVisitModal}>
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
              filteredLabResults.map((lab) => {
                const isSharedToOwner = !!lab.visibleToOwner;
                const shareActionKey = `lab-${lab.id}`;

                return (
                <div key={lab.id} className="emrHistoryCard">
                  <div className="emrHistoryCardHeader">
                    <div className="emrHistoryCardTitle">
                      <strong>{lab.testType}</strong>
                      <span className="emrHistoryDate">{lab.visitDate}</span>
                    </div>
                    <div className="emrHistoryCardActions">
                      <span className={`emrOwnerShareBadge ${isSharedToOwner ? 'isShared' : 'isPrivate'}`}>
                        {isSharedToOwner ? 'Visible to owner' : 'Private to clinic'}
                      </span>
                      <button
                        className={`emrOwnerShareBtn ${isSharedToOwner ? 'isShared' : ''}`}
                        onClick={() => { void handleSetLabResultOwnerVisibility(lab, !isSharedToOwner); }}
                        disabled={ownerShareActionKey === shareActionKey}
                      >
                        {ownerShareActionKey === shareActionKey
                          ? 'Saving...'
                          : isSharedToOwner
                            ? 'Hide from Owner'
                            : 'Share to Owner'}
                      </button>
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
                    {isSharedToOwner && (
                      <div className="emrHistoryDetail">
                        <span className="emrHistoryLabel">Owner Portal:</span>
                        <span>
                          Shared
                          {lab.visibleToOwnerAt ? ` on ${new Date(lab.visibleToOwnerAt).toLocaleString()}` : ''}
                          {lab.visibleToOwnerBy ? ` by ${lab.visibleToOwnerBy}` : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )})
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
              filteredPrescriptionsVisits.map((visit, idx) => {
                const visitPrescriptionRemarks = getSharedPrescriptionInstructions(visit.prescriptions || []);

                return (
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
                              {formatPrescriptionDisplayParts(pres).length > 0 && (
                                <span> - {formatPrescriptionDisplayParts(pres).join(' | ')}</span>
                              )}
                            </div>
                          ))}
                        {visitPrescriptionRemarks && (
                          <div className="emrPrescriptionInstructionsCompact" style={{ whiteSpace: 'pre-wrap' }}>
                            Instructions: {visitPrescriptionRemarks}
                          </div>
                        )}
                        {false && (visit.prescriptions || [])
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
              )})
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
              filteredVaccinations.map((visit) => {
                const vaccination = visit.vaccinationDetails!;
                const isSharedToOwner = !!vaccination.visibleToOwner;
                const shareActionKey = `vaccination-${vaccination.id || visit.id}`;

                return (
                <div key={visit.id} className="emrHistoryCard">
                  <div className="emrHistoryCardHeader">
                    <div className="emrHistoryCardTitle">
                      <strong>{vaccination.vaccineName}</strong>
                      <span className="emrHistoryDate">{visit.date}</span>
                    </div>
                    <div className="emrHistoryCardActions">
                      <span className={`emrOwnerShareBadge ${isSharedToOwner ? 'isShared' : 'isPrivate'}`}>
                        {isSharedToOwner ? 'Visible to owner' : 'Private to clinic'}
                      </span>
                      <button
                        className={`emrOwnerShareBtn ${isSharedToOwner ? 'isShared' : ''}`}
                        onClick={() => { void handleSetVaccinationOwnerVisibility(vaccination, vaccination.vaccineName); }}
                        disabled={ownerShareActionKey === shareActionKey}
                      >
                        {ownerShareActionKey === shareActionKey
                          ? 'Saving...'
                          : isSharedToOwner
                            ? 'Hide from Owner'
                            : 'Share to Owner'}
                      </button>
                    </div>
                  </div>
                  <div className="emrHistoryCardBody">
                    <div className="emrHistoryDetail">
                      <span className="emrHistoryLabel">Veterinarian:</span>
                      <span>{visit.veterinarian}</span>
                    </div>
                    <div className="emrHistoryDetail">
                      <span className="emrHistoryLabel">Dose/Volume:</span>
                      <span>{vaccination.doseVolume || 'N/A'}</span>
                    </div>
                    <div className="emrHistoryDetail">
                      <span className="emrHistoryLabel">Injection Site:</span>
                      <span>{vaccination.injectionSite || 'N/A'}</span>
                    </div>
                    <div className="emrHistoryDetail">
                      <span className="emrHistoryLabel">Manufacturer:</span>
                      <span>{vaccination.manufacturer || 'N/A'}</span>
                    </div>
                    <div className="emrHistoryDetail">
                      <span className="emrHistoryLabel">Date Administered:</span>
                      <span>{vaccination.dateAdministered}</span>
                    </div>
                    {vaccination.nextDueDate && (
                      <div className="emrHistoryDetail">
                        <span className="emrHistoryLabel">Next Due Date:</span>
                        <span>{vaccination.nextDueDate}</span>
                      </div>
                    )}
                    {isSharedToOwner && (
                      <div className="emrHistoryDetail">
                        <span className="emrHistoryLabel">Owner Portal:</span>
                        <span>
                          Shared
                          {vaccination.visibleToOwnerAt ? ` on ${new Date(vaccination.visibleToOwnerAt).toLocaleString()}` : ''}
                          {vaccination.visibleToOwnerBy ? ` by ${vaccination.visibleToOwnerBy}` : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )})
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
                <button className="emrCancelBtn" onClick={handleCancel} disabled={isSavingRecord}>
                  Cancel
                </button>
                <button className="emrSubmitBtn" onClick={handleSaveRecord} disabled={isSavingRecord}>
                  {isSavingRecord && <span className="emrBtnSpinner" aria-hidden="true"></span>}
                  {isSavingRecord ? 'Saving Changes...' : 'Save Changes'}
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
                            setSelectedPrimaryServiceId('');
                            setSelectedServices([]);
                            setNewVisit((prev) => ({
                              ...prev,
                              veterinarian: '',
                              reason: ''
                            }));
                            clearVisitFieldError('visitType');
                            clearVisitFieldError('appointment');
                            clearVisitFieldError('primaryService');
                            clearVisitFieldError('veterinarian');
                          }}
                        >
                          <IoTimeSharp size={14} /> Walk-in
                        </button>
                        <button 
                          type="button"
                          className={`emrToggleBtnFull ${visitType === 'appointment' ? 'emrToggleActiveFull' : ''}`}
                          onClick={() => {
                            setVisitType('appointment');
                            setSelectedPrimaryServiceId('');
                            setSelectedServices([]);
                            setNewVisit((prev) => ({
                              ...prev,
                              veterinarian: '',
                              reason: ''
                            }));
                            clearVisitFieldError('visitType');
                            clearVisitFieldError('appointment');
                            clearVisitFieldError('primaryService');
                            clearVisitFieldError('veterinarian');
                            if (appointmentRecords.length === 0 && selectedPetId) {
                              void fetchAppointmentsForPet(selectedPetId);
                            }
                          }}
                        >
                          <IoCalendarOutline size={14} /> Appointment
                        </button>
                      </div>
                      {visitFormErrors.visitType && <div className="emrErrorText">{visitFormErrors.visitType}</div>}
                    </div>
                  </div>
                </div>

                {/* Appointment Selection - Only show when Appointment is selected */}
                {visitType === 'appointment' && (
                  <div className="emrFormSection">
                    <h4>Select Appointment</h4>
                    <div className="emrAppointmentFilterBar">
                      {APPOINTMENT_DATE_FILTER_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          className={`emrAppointmentFilterBtn ${appointmentDateFilter === option.value ? 'emrAppointmentFilterBtnActive' : ''}`}
                          onClick={() => {
                            setAppointmentDateFilter(option.value);
                            clearVisitFieldError('appointment');
                          }}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                    <div className="emrFormRow">
                      <div className="emrFormGroup emrFullWidth">
                        {filteredAppointmentRecords.length > 0 ? (
                          <div className="emrAppointmentList">
                            {filteredAppointmentRecords.map(app => (
                              <div 
                                key={app.id}
                                className={`emrAppointmentItem ${selectedAppointment?.id === app.id ? 'emrAppointmentSelected' : ''}`}
                                onClick={() => {
                                  setSelectedAppointment(app);
                                  setSelectedPrimaryServiceId('');
                                  setSelectedServices(
                                    (app.services || []).map((service) => ({
                                      id: service.id,
                                      name: service.name,
                                      price: typeof service.price === 'number' ? service.price : 0,
                                      description: service.description || ''
                                    }))
                                  );
                                  clearVisitFieldError('appointment');
                                  clearVisitFieldError('primaryService');
                                  clearVisitFieldError('veterinarian');
                                  setNewVisit((prev) => ({
                                    ...prev,
                                    veterinarian: app.veterinarian,
                                    reason: app.reason || 'Not specified'
                                  }));
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
                                    <span>{app.reason || 'No stated reason'}</span>
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
                            <p>{getAppointmentEmptyStateMessage(appointmentDateFilter)}</p>
                          </div>
                        )}
                        {visitFormErrors.appointment && <div className="emrErrorText">{visitFormErrors.appointment}</div>}
                      </div>
                    </div>
                  </div>
                )}

                {visitType === 'appointment' && (
                  <div className="emrFormSection">
                    {selectedAppointment && hasMedicalInformationContent(selectedAppointmentMedicalInformation) ? (
                      renderMedicalInformationBlock(selectedAppointmentMedicalInformation, 'Medical Information From Appointment')
                    ) : (
                      <div className="emrMedicalInfoEmptyState">
                        {selectedAppointment
                          ? 'This appointment has no saved medical information yet.'
                          : 'Select an appointment to load its medical information into this visit.'}
                      </div>
                    )}
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
                        onChange={(e) => {
                          clearVisitFieldError('veterinarian');
                          setNewVisit({...newVisit, veterinarian: e.target.value});
                        }}
                        className={`emrFormSelect ${visitFormErrors.veterinarian ? 'emrError' : ''}`}
                        disabled={visitType !== 'walkin'}
                      >
                        <option value="">
                          {visitType === 'walkin'
                            ? 'Select a doctor'
                            : visitType === 'appointment'
                              ? 'Loaded from selected appointment'
                              : 'Select visit type first'}
                        </option>
                        {veterinarianOptions.map(doc => (
                          <option key={doc} value={doc}>{doc}</option>
                        ))}
                      </select>
                      {visitType === 'walkin' && visitFormErrors.veterinarian && (
                        <div className="emrErrorText">{visitFormErrors.veterinarian}</div>
                      )}
                    </div>
                    <div className="emrFormGroup">
                      <label>Primary Service</label>
                      {visitType === 'appointment' ? (
                        <input
                          type="text"
                          value={selectedAppointmentServiceLabel}
                          className="emrFormInput"
                          disabled
                          placeholder="Loaded from selected appointment"
                        />
                      ) : visitType === 'walkin' ? (
                        <>
                          <select
                            value={selectedPrimaryServiceId}
                            onChange={(e) => handleWalkInPrimaryServiceChange(e.target.value)}
                            className={`emrFormSelect ${visitFormErrors.primaryService ? 'emrError' : ''}`}
                          >
                            <option value="">Select primary service</option>
                            {AVAILABLE_SERVICES.map((service) => (
                              <option key={service.id} value={service.id}>{service.name}</option>
                            ))}
                          </select>
                          {visitFormErrors.primaryService && <div className="emrErrorText">{visitFormErrors.primaryService}</div>}
                        </>
                      ) : (
                        <input
                          type="text"
                          value=""
                          className="emrFormInput"
                          disabled
                          placeholder="Select visit type first"
                        />
                      )}
                    </div>
                  </div>
                  <div className="emrFormRow">
                    <div className="emrFormGroup emrFullWidth">
                      <label>Reason / Chief Complaint</label>
                      <input
                        type="text"
                        value={selectedVisitReasonValue}
                        onChange={(e) => setNewVisit({ ...newVisit, reason: e.target.value })}
                        className="emrFormInput"
                        disabled={visitType !== 'walkin'}
                        placeholder={
                          visitType === 'appointment'
                            ? 'Loaded from selected appointment'
                            : visitType === 'walkin'
                              ? 'e.g., vomiting for 2 days, annual booster, wound recheck'
                              : 'Select visit type first'
                        }
                      />
                    </div>
                  </div>
                  
                  {/* Display selected services summary - No pricing */}
                  {selectedServices.length > 0 && (
                    <div className="emrSelectedServicesDisplay" style={{ marginTop: '12px', padding: '10px', backgroundColor: '#e8f5e9', borderRadius: '8px', borderLeft: '3px solid #2e9e0c' }}>
                      <div>
                        <strong style={{ fontSize: '12px', color: '#2e7d32' }}>Services Selected:</strong>
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
                            : visitFieldInputs.weight}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || /^\d*\.?\d*$/.test(value)) {
                              clearVisitFieldError('weight');
                              setVisitFieldInputs((prev) => ({ ...prev, weight: value }));
                              setNewVisit({...newVisit, weight: parseFloat(value) || 0, sameAsLastWeight: false});
                            }
                          }}
                          placeholder="0.0"
                          className={`emrWeightInput ${visitFormErrors.weight ? 'emrError' : ''}`}
                          disabled={newVisit.sameAsLastWeight}
                          inputMode="decimal"
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
                            onChange={(e) => {
                              clearVisitFieldError('weight');
                              setNewVisit({...newVisit, sameAsLastWeight: e.target.checked});
                            }}
                            style={{marginRight: '10px'}}
                          />
                          Same as last appointment ({getLastWeight()?.value} {getLastWeight()?.unit})
                        </label>
                      )}
                      {visitFormErrors.weight && <div className="emrErrorText">{visitFormErrors.weight}</div>}
                    </div>

                    {/* Length Section */}
                    <div className="emrFormGroup" style={{ flex: 1 }}>
                      <label>Length</label>
                      <div className="emrWeightInputWrapper">
                        <input
                          type="text"
                          value={visitFieldInputs.length}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || /^\d*\.?\d*$/.test(value)) {
                              clearVisitFieldError('length');
                              setVisitFieldInputs((prev) => ({ ...prev, length: value }));
                              setNewVisit({
                                ...newVisit, 
                                clinicalExam: { ...newVisit.clinicalExam!, length: parseFloat(value) || 0 }
                              });
                            }
                          }}
                          placeholder="0.0"
                          className={`emrWeightInput ${visitFormErrors.length ? 'emrError' : ''}`}
                          inputMode="decimal"
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
                      {visitFormErrors.length && <div className="emrErrorText">{visitFormErrors.length}</div>}
                    </div>

                    {/* Temperature Section */}
                    <div className="emrFormGroup" style={{ flex: 1 }}>
                      <label>Temperature</label>
                      <div className="emrWeightInputWrapper">
                        <input
                          type="text"
                          value={visitFieldInputs.temperature}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || /^\d*\.?\d*$/.test(value)) {
                              clearVisitFieldError('temperature');
                              setVisitFieldInputs((prev) => ({ ...prev, temperature: value }));
                              setNewVisit({
                                ...newVisit,
                                clinicalExam: { ...newVisit.clinicalExam!, temperature: parseFloat(value) || 0 }
                              });
                            }
                          }}
                          placeholder="0.0"
                          className={`emrWeightInput ${visitFormErrors.temperature ? 'emrError' : ''}`}
                          inputMode="decimal"
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
                      {visitFormErrors.temperature && <div className="emrErrorText">{visitFormErrors.temperature}</div>}
                    </div>
                  </div>

                  <div className="emrFormRow">
                    <div className="emrFormGroup">
                      <label>Heart Rate (per minute)</label>
                      <input
                        type="text"
                        value={visitFieldInputs.heartRate}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || RATE_RANGE_INPUT_PATTERN.test(value)) {
                            clearVisitFieldError('heartRate');
                            setVisitFieldInputs((prev) => ({ ...prev, heartRate: value }));
                            setNewVisit({
                              ...newVisit,
                              clinicalExam: { ...newVisit.clinicalExam!, heartRate: value }
                            });
                          }
                        }}
                        placeholder="e.g., 80-120"
                        className={`emrFormInput ${visitFormErrors.heartRate ? 'emrError' : ''}`}
                        inputMode="text"
                      />
                      <small className="emrHelperText">Use a simple range like 80-120.</small>
                      {visitFormErrors.heartRate && <div className="emrErrorText">{visitFormErrors.heartRate}</div>}
                    </div>

                    <div className="emrFormGroup">
                      <label>Breathing Rate (per minute)</label>
                      <input
                        type="text"
                        value={visitFieldInputs.breathingRate}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || RATE_RANGE_INPUT_PATTERN.test(value)) {
                            clearVisitFieldError('breathingRate');
                            setVisitFieldInputs((prev) => ({ ...prev, breathingRate: value }));
                            setNewVisit({
                              ...newVisit,
                              clinicalExam: { ...newVisit.clinicalExam!, breathingRate: value }
                            });
                          }
                        }}
                        placeholder="e.g., 15-30"
                        className={`emrFormInput ${visitFormErrors.breathingRate ? 'emrError' : ''}`}
                        inputMode="text"
                      />
                      <small className="emrHelperText">Use a simple range like 15-30.</small>
                      {visitFormErrors.breathingRate && <div className="emrErrorText">{visitFormErrors.breathingRate}</div>}
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
                        {AVAILABLE_SERVICES.map(service => {
                          const serviceSelected = isServiceSelectedInVisit(service);
                          const serviceLocked = isServiceLockedInVisit(service);

                          return (
                            <div 
                              key={service.id}
                              className={`emrServiceItem ${serviceSelected ? 'emrServiceSelected' : ''} ${serviceLocked ? 'emrServiceLocked' : ''}`}
                              onClick={() => toggleService(service)}
                              aria-disabled={serviceLocked}
                            >
                              <div className="emrServiceInfo">
                                <div className="emrServiceName">
                                  {service.name}
                                  {serviceLocked && <span className="emrServiceLockBadge">Primary</span>}
                                </div>
                                <div className="emrServiceDescription">
                                  {serviceLocked
                                    ? 'Already included as the primary booked service for this visit.'
                                    : service.description}
                                </div>
                              </div>
                              {serviceSelected && (
                                <IoCheckmarkCircleOutline size={20} color="#2e9e0c" />
                              )}
                            </div>
                          );
                        })}
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
                            <th>Dose</th>
                            <th>Frequency</th>
                            <th>Duration</th>
                            <th style={{ width: '40px' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {(newVisit.prescriptions || []).map((pres) => {
                            const selectedFrequency = getPrescriptionPresetValue(pres.frequency, PRESCRIPTION_FREQUENCY_OPTIONS);
                            const selectedDuration = getPrescriptionPresetValue(pres.duration, PRESCRIPTION_DURATION_OPTIONS);

                            return (
                              <React.Fragment key={pres.id}>
                                <tr>
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
                                      placeholder="e.g., 1 tablet, 5 mL, or 5 mg/kg"
                                    />
                                  </td>
                                  <td>
                                    <div className="emrPrescriptionFieldGroup">
                                      <select
                                        value={selectedFrequency}
                                        onChange={(e) => updatePrescription(pres.id, 'frequency', e.target.value === CUSTOM_PRESCRIPTION_OPTION ? '' : e.target.value)}
                                        className="emrPrescriptionSelect"
                                      >
                                        {PRESCRIPTION_FREQUENCY_OPTIONS.map((option) => (
                                          <option key={option} value={option}>{option}</option>
                                        ))}
                                        <option value={CUSTOM_PRESCRIPTION_OPTION}>Custom</option>
                                      </select>
                                      {selectedFrequency === CUSTOM_PRESCRIPTION_OPTION && (
                                        <input
                                          type="text"
                                          value={pres.frequency}
                                          onChange={(e) => updatePrescription(pres.id, 'frequency', e.target.value)}
                                          placeholder="Custom frequency"
                                        />
                                      )}
                                    </div>
                                  </td>
                                  <td>
                                    <div className="emrPrescriptionFieldGroup">
                                      <select
                                        value={selectedDuration}
                                        onChange={(e) => updatePrescription(pres.id, 'duration', e.target.value === CUSTOM_PRESCRIPTION_OPTION ? '' : e.target.value)}
                                        className="emrPrescriptionSelect"
                                      >
                                        {PRESCRIPTION_DURATION_OPTIONS.map((option) => (
                                          <option key={option} value={option}>{option}</option>
                                        ))}
                                        <option value={CUSTOM_PRESCRIPTION_OPTION}>Custom</option>
                                      </select>
                                      {selectedDuration === CUSTOM_PRESCRIPTION_OPTION && (
                                        <input
                                          type="text"
                                          value={pres.duration}
                                          onChange={(e) => updatePrescription(pres.id, 'duration', e.target.value)}
                                          placeholder="Custom duration"
                                        />
                                      )}
                                    </div>
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
                                <tr className="emrPrescriptionDetailRow">
                                  <td colSpan={5}>
                                    <div className="emrPrescriptionDetailsGrid">
                                      <div className="emrPrescriptionDetailField">
                                        <label className="emrPrescriptionInstructionLabel">Route</label>
                                        <div className="emrPrescriptionFieldGroup">
                                          <select
                                            value={getPrescriptionPresetValue(pres.route || '', PRESCRIPTION_ROUTE_OPTIONS)}
                                            onChange={(e) => updatePrescription(pres.id, 'route', e.target.value === CUSTOM_PRESCRIPTION_OPTION ? '' : e.target.value)}
                                            className="emrPrescriptionSelect"
                                          >
                                            {PRESCRIPTION_ROUTE_OPTIONS.map((option) => (
                                              <option key={option} value={option}>{option}</option>
                                            ))}
                                            <option value={CUSTOM_PRESCRIPTION_OPTION}>Custom</option>
                                          </select>
                                          {getPrescriptionPresetValue(pres.route || '', PRESCRIPTION_ROUTE_OPTIONS) === CUSTOM_PRESCRIPTION_OPTION && (
                                            <input
                                              type="text"
                                              value={pres.route || ''}
                                              onChange={(e) => updatePrescription(pres.id, 'route', e.target.value)}
                                              placeholder="Custom route"
                                            />
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              </React.Fragment>
                            );
                          })}
                          {(newVisit.prescriptions || []).length === 0 && (
                            <tr>
                              <td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: '#999', fontSize: '14px' }}>
                                No medications added yet
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>

                      <div className="emrPrescriptionSharedInstructionBox">
                        <label className="emrPrescriptionInstructionLabel">Instructions</label>
                        <textarea
                          value={prescriptionRemarks}
                          onChange={(e) => setPrescriptionRemarks(e.target.value)}
                          rows={4}
                          placeholder="e.g., Give with food. Finish all medication. Monitor for vomiting or diarrhea."
                          className="emrPrescriptionInstructionTextarea"
                        />
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
                <button
                  onClick={() => {
                    setModalVisible(false);
                    if (modalConfig.onCancel) modalConfig.onCancel();
                  }}
                  className="emrAlertBtn emrCancelAlertBtn"
                >
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
