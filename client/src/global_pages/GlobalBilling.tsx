import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../reusable_components/NavBar';
import Notifications from '../reusable_components/Notifications';
import { apiService } from '../apiService';
import { pdf } from '@react-pdf/renderer';
import { CiReceipt } from "react-icons/ci";
import { FaFileInvoice } from "react-icons/fa";
import InvoicePDF from './pdf_generation/InvoicePDF';

import './GlobalBillingStyles.css';

import { 
  IoSearchSharp,
  IoFilterSharp,
  IoAdd,
  IoTrashOutline,
  IoCheckmarkCircleOutline,
  IoCloseCircleOutline,
  IoAlertCircleOutline,
  IoEyeOutline,
  IoCloseOutline,
  IoRefreshOutline,
  IoCreateOutline,
  IoTrashBinOutline,
  IoCalendarOutline,
  IoTimeSharp,
  IoPrintOutline,
  IoPulseOutline,
  IoMedkitOutline,
  IoCutOutline,
  IoWaterOutline,
  IoHomeOutline,
  IoBedOutline,
  IoFlaskOutline,
  IoHeartOutline,
  IoShieldCheckmarkOutline,
  IoCartOutline,
  IoCheckmarkSharp,
  IoRemoveOutline,
  IoPersonOutline,
  IoPawOutline,
  IoCallOutline,
  IoMailOutline,
  IoDocumentTextOutline,
  IoChevronForward,
  IoFastFoodOutline,
  IoMedicalOutline,
  IoShirtOutline,
  IoFitnessOutline,
  IoRadioButtonOn,
  IoRadioButtonOff,
  IoCashOutline,
  IoListOutline} from 'react-icons/io5';

interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  time: string;
  invoiceType: 'appointment' | 'walkin';
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  petName: string;
  items: InvoiceItem[];
  products: ProductItem[];
  subtotal: number;
  tax: number;
  discount: number;
  discountType?: string;
  discountValue?: number;
  discountIsPercentage?: boolean;
  total: number;
  amountPaid?: number;
  remainingBalance?: number;
  paymentMethod: 'cash' | 'card' | 'gcash' | 'bank' | 'installment';
  paymentStatus: 'paid' | 'pending' | 'partial';
  status: 'completed' | 'cancelled' | 'refunded';
  sourceRecordType?: 'appointment' | 'walkin' | 'visit' | null;
  sourceRecordId?: string | number | null;
  notes?: string;
  paymentHistory?: InvoicePayment[];
}

interface InvoicePayment {
  id: string;
  amount: number;
  paymentMethod: 'cash' | 'card' | 'gcash' | 'bank';
  date: string;
  time: string;
  handledBy?: string;
  notes?: string;
}

interface InvoiceItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  category: string;
  serviceId?: string;
  isSourceLocked?: boolean;
}

interface BillingSourceService {
  id: string;
  serviceId?: string | number | null;
  serviceCode?: string;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  category: string;
  subcategory?: string;
}

interface ProductItem {
  id: string;
  inventoryItemId?: string | number;
  name: string;
  sku: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  category: 'food' | 'medicine' | 'accessory' | 'supplement' | 'other';
  stock?: number;
}

interface PrescriptionProductSuggestion {
  id: string;
  inventoryItemId?: string | number;
  name: string;
  sku: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  prescriptionMedicationName: string;
  dosage?: string;
  route?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
}

interface AppointmentInvoice {
  id: string;
  recordType?: 'appointment';
  date: string;
  time: string;
  veterinarian: string;
  petName: string;
  ownerName: string;
  ownerEmail?: string;
  ownerPhone?: string;
  services: string[];
  serviceItems?: BillingSourceService[];
  reason?: string;
  amount: number;
  branchId?: number;
  sourceRecordType?: 'appointment' | 'visit';
  sourceRecordId?: string;
  linkedVisitId?: string | null;
  isBilled?: boolean;
  billingInvoiceId?: string | null;
  billingInvoiceNumber?: string | null;
  prescriptionProductSuggestions?: PrescriptionProductSuggestion[];
}

interface WalkInRecord {
  id: string;
  recordType?: 'visit';
  date: string;
  time: string;
  petName: string;
  petSpecies: string;
  petBreed: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  reason: string;
  services?: string[];
  serviceItems?: BillingSourceService[];
  amount?: number;
  branchId?: number;
  status: 'completed' | 'ongoing' | 'waiting';
  veterinarian: string;
  sourceRecordType?: 'visit' | 'walkin';
  sourceRecordId?: string;
  isBilled?: boolean;
  billingInvoiceId?: string | null;
  billingInvoiceNumber?: string | null;
  reasonIsServiceFallback?: boolean;
  prescriptionProductSuggestions?: PrescriptionProductSuggestion[];
}

interface BillingNavigationState {
  billingAction?: {
    invoiceType: InvoiceType;
    sourceRecordType: 'appointment' | 'walkin' | 'visit';
    sourceRecordId: string | number;
    billingInvoiceId?: string | number | null;
  };
}

interface CurrentUser {
  id?: string | number;
  pk?: string | number;
  username: string;
  fullName?: string;
  role: string;
  userImage?: string;
}

interface ModalConfig {
  type: 'info' | 'success' | 'error' | 'confirm';
  title: string;
  message: string | React.ReactNode;
  onConfirm?: () => void;
  showCancel: boolean;
}

interface Product {
  id: string;
  inventoryItemId?: string | number;
  name: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  description: string;
  image?: string;
}

interface Service {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  price: number;
  description: string;
}

interface TempSelectedServiceEntry {
  service: Service;
  quantity: number;
  locked?: boolean;
}

type ViewMode = 'list' | 'create' | 'details';
type InvoiceType = 'appointment' | 'walkin';
type InvoiceTypeSelection = InvoiceType | '';
type PaymentMethod = 'cash' | 'card' | 'gcash' | 'bank' | 'installment';
type PaymentEntryMethod = 'cash' | 'card' | 'gcash' | 'bank';
type PaymentStatus = 'paid' | 'pending' | 'partial';
type DiscountType = 'none' | 'senior' | 'pwd' | 'promo' | 'custom';
type CustomDiscountType = 'percentage' | 'fixed';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:5000';
const TAX_RATE = 0.12;

const formatPaymentStatusLabel = (status: PaymentStatus | string): string => {
  switch (String(status || '').toLowerCase()) {
    case 'paid':
      return 'Paid';
    case 'partial':
      return 'Partial Paid';
    case 'pending':
      return 'Pending';
    default:
      return String(status || '');
  }
};

const formatPaymentMethodLabel = (value: string): string =>
  String(value || '')
    .split('_')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const normalizeProductCategory = (category?: string): ProductItem['category'] => {
  const normalized = String(category || '').trim().toLowerCase();
  if (normalized === 'food' || normalized === 'medicine' || normalized === 'accessory' || normalized === 'supplement') {
    return normalized;
  }
  return 'other';
};

interface BillingFormErrors {
  invoiceType?: string;
  sourceRecord?: string;
  customerName?: string;
  petName?: string;
  lineItems?: string;
}

// Discount rates
const DISCOUNT_RATES = {
  senior: 0.20,
  pwd: 0.20,
  promo: 0.10
};

const BILLING_SERVICE_LABEL_ALIASES: Record<string, string> = {
  'checkup': 'Consultation & Check-Up',
  'consultation': 'Consultation & Check-Up',
  'general consultation': 'Consultation & Check-Up',
  'consultation and check up': 'Consultation & Check-Up',
  'consultation and check-up': 'Consultation & Check-Up',
  'checkup or consultation': 'Consultation & Check-Up',
  'check-up or consultation': 'Consultation & Check-Up',
  'vaccination': 'Vaccinations',
  'vaccine': 'Vaccinations',
  'dental cleaning': 'Dental Prophylaxis',
  'cbc': 'Complete Blood Count',
  'fecalysis': 'Fecal Examination',
  'xray': 'X-Ray',
  'x ray': 'X-Ray',
  'radiology': 'X-Ray',
  'radiology x ray': 'X-Ray',
  'boarding': 'Pet Boarding',
};

const BILLING_GENERIC_SERVICE_PRICE_FALLBACKS: Record<string, number> = {
  'consultation': 500,
  'vaccination': 1200,
  'laboratory': 800,
  'lab test': 800,
  'laboratory test': 800,
  'laboratory tests': 800,
  'ray x': 1500,
  'xray': 1500,
  'radiology ray x': 1500,
  'ultrasound': 2000,
  'surgery': 3000,
  'cleaning dental': 800,
  'grooming': 500,
  'grooming pet': 500,
  'boarding': 1200,
  'boarding pet': 1200,
  'confinement': 2500,
};

const BILLING_GENERIC_SERVICE_METADATA_FALLBACKS: Record<string, { category: string; description: string }> = {
  'consultation': { category: 'Consultation', description: 'Standard veterinary consultation' },
  'vaccination': { category: 'Vaccinations', description: 'Annual vaccination' },
  'laboratory': { category: 'Diagnostics', description: 'Blood work and lab tests' },
  'lab test': { category: 'Diagnostics', description: 'Blood work and lab tests' },
  'laboratory test': { category: 'Diagnostics', description: 'Blood work and lab tests' },
  'laboratory tests': { category: 'Diagnostics', description: 'Blood work and lab tests' },
  'ray x': { category: 'Diagnostics', description: 'Radiology services' },
  'xray': { category: 'Diagnostics', description: 'Radiology services' },
  'radiology ray x': { category: 'Diagnostics', description: 'Radiology services' },
  'ultrasound': { category: 'Diagnostics', description: 'Ultrasound examination' },
  'surgery': { category: 'Surgery', description: 'Surgical procedure' },
  'cleaning dental': { category: 'Dental', description: 'Professional dental cleaning' },
  'grooming': { category: 'Grooming', description: 'Basic grooming services' },
  'grooming pet': { category: 'Grooming', description: 'Basic grooming services' },
  'boarding': { category: 'Boarding', description: 'Overnight stay, feeding, supervision' },
  'boarding pet': { category: 'Boarding', description: 'Overnight stay, feeding, supervision' },
  'confinement': { category: 'Confinement', description: 'Medical care, monitoring, IV fluids, medication' },
};

// Service Categories
const SERVICE_STRUCTURE = {
  'Consultation': {
    icon: 'pulse',
    subcategories: {
      'General Consultation': { price: 500, description: 'Standard veterinary consultation' },
      'Emergency Consultation': { price: 800, description: 'Emergency after-hours consultation' },
      'Follow-up Consultation': { price: 350, description: 'Follow-up checkup' },
      'Specialist Consultation': { price: 1200, description: 'Specialist veterinarian consultation' }
    }
  },
  'Vaccinations': {
    icon: 'shield',
    subcategories: {
      'Anti-Rabies': { price: 350, description: 'Anti-rabies vaccination' },
      '5-in-1 Vaccine': { price: 600, description: '5-in-1 combination vaccine' },
      '6-in-1 Vaccine': { price: 750, description: '6-in-1 combination vaccine' },
      'Bordetella': { price: 500, description: 'Kennel cough vaccine' },
      'Leptospirosis': { price: 450, description: 'Leptospirosis vaccine' },
      'Canine Influenza': { price: 550, description: 'Canine influenza vaccine' },
      'Feline Leukemia': { price: 600, description: 'FeLV vaccine for cats' },
      'Feline Distemper': { price: 500, description: 'Feline distemper vaccine' }
    }
  },
  'Preventive Care': {
    icon: 'heart',
    subcategories: {
      'Deworming': { price: 250, description: 'Internal parasite deworming' },
      'Flea & Tick Treatment': { price: 400, description: 'External parasite treatment' },
      'Heartworm Prevention': { price: 500, description: 'Heartworm preventive medication' },
      'Annual Health Check': { price: 800, description: 'Comprehensive annual health examination' },
      'Microchipping': { price: 1200, description: 'Pet identification microchip implantation' },
      'Nail Trim': { price: 150, description: 'Nail clipping and filing' },
      'Ear Cleaning': { price: 200, description: 'Ear cleaning and inspection' },
      'Anal Gland Expression': { price: 250, description: 'Anal gland cleaning' }
    }
  },
  'Diagnostics': {
    icon: 'flask',
    subcategories: {
      'Laboratory Tests': {
        isGroup: true,
        items: {
          'CBC': { price: 500, description: 'Complete Blood Count' },
          'Blood Chemistry': { price: 800, description: 'Blood chemistry panel' },
          'Urinalysis': { price: 300, description: 'Urine analysis' },
          'Fecalysis': { price: 250, description: 'Stool examination' },
          'Skin Scraping': { price: 350, description: 'Skin scraping for parasites' },
          'Vaginal Smear': { price: 400, description: 'Vaginal cytology' },
          'Progesterone Test': { price: 1500, description: 'Progesterone level testing' },
          'Antigen Test': { price: 800, description: 'Antigen detection test' },
          'Antibody Test': { price: 800, description: 'Antibody titer test' }
        }
      },
      'Imaging': {
        isGroup: true,
        items: {
          'X-Ray': { price: 800, description: 'Radiographic imaging (per view)' },
          'Ultrasound': { price: 1500, description: 'Ultrasound imaging' }
        }
      }
    }
  },
  'Surgery': {
    icon: 'cut',
    subcategories: {
      'Spay/Neuter': { price: 3000, description: 'Sterilization surgery' },
      'Mass Removal': { price: 4500, description: 'Tumor/mass excision' },
      'Foreign Body Removal': { price: 5000, description: 'Foreign object extraction' },
      'Wound Repair': { price: 2000, description: 'Laceration repair and suturing' },
      'Orthopedic Surgery': { price: 12000, description: 'Bone/joint surgery' },
      'Dental Extraction': { price: 1500, description: 'Tooth extraction' }
    }
  },
  'Dental Prophylaxis': {
    icon: 'heart',
    subcategories: {
      'Basic Dental Cleaning': { price: 1200, description: 'Teeth scaling and polishing' },
      'Comprehensive Dental': { price: 2500, description: 'Complete dental cleaning with anesthesia' },
      'Periodontal Treatment': { price: 3000, description: 'Gum disease treatment' }
    }
  },
  'Grooming': {
    icon: 'water',
    subcategories: {
      'Basic Grooming': { price: 400, description: 'Bath, brush, nail trim' },
      'Full Grooming': { price: 800, description: 'Complete grooming service' },
      'Lion Cut': { price: 1000, description: 'Full body shave for cats' },
      'De-shedding Treatment': { price: 600, description: 'Professional de-shedding' }
    }
  },
  'Boarding': {
    icon: 'bed',
    subcategories: {
      'Standard Boarding': { price: 350, description: 'Per night, includes basic care' },
      'Deluxe Boarding': { price: 600, description: 'Per night, with premium amenities' },
      'Day Care': { price: 250, description: 'Daytime care (8 hours)' }
    }
  },
  'Confinement': {
    icon: 'home',
    subcategories: {
      'Hospitalization (per day)': { price: 1000, description: '24-hour veterinary care' },
      'ICU Monitoring': { price: 2000, description: 'Intensive care unit monitoring' },
      'Fluid Therapy': { price: 500, description: 'IV fluid administration' }
    }
  }
};

// Flatten services
const MOCK_SERVICES: Service[] = (() => {
  const services: Service[] = [];
  let idCounter = 1;
  
  for (const [mainCategory, data] of Object.entries(SERVICE_STRUCTURE)) {
    const subcats = data.subcategories;
    for (const [subName, subData] of Object.entries(subcats)) {
      if (subData.isGroup) {
        const groupData = subData as { isGroup: boolean; items: Record<string, { price: number; description: string }> };
        for (const [itemName, itemData] of Object.entries(groupData.items)) {
          services.push({
            id: `svc_${idCounter++}`,
            name: itemName,
            category: mainCategory,
            subcategory: subName,
            price: itemData.price,
            description: itemData.description
          });
        }
      } else {
        services.push({
          id: `svc_${idCounter++}`,
          name: subName,
          category: mainCategory,
          subcategory: mainCategory,
          price: (subData as { price: number; description: string }).price,
          description: (subData as { price: number; description: string }).description
        });
      }
    }
  }
  return services;
})();

// Mock Walk-in Records
const MOCK_WALKIN_RECORDS: WalkInRecord[] = [
  {
    id: 'walk_001',
    date: '2024-04-09',
    time: '09:30 AM',
    petName: 'Buddy',
    petSpecies: 'Dog',
    petBreed: 'Golden Retriever',
    ownerName: 'James Wilson',
    ownerEmail: 'james.wilson@email.com',
    ownerPhone: '09123456789',
    reason: 'Annual vaccination and checkup',
    status: 'completed',
    veterinarian: 'Dr. Sarah Johnson'
  },
  {
    id: 'walk_002',
    date: '2024-04-09',
    time: '10:15 AM',
    petName: 'Whiskers',
    petSpecies: 'Cat',
    petBreed: 'Persian',
    ownerName: 'Maria Santos',
    ownerEmail: 'maria.santos@email.com',
    ownerPhone: '09234567890',
    reason: 'Skin irritation and hair loss',
    status: 'ongoing',
    veterinarian: 'Dr. Michael Chen'
  },
  {
    id: 'walk_003',
    date: '2024-04-09',
    time: '11:00 AM',
    petName: 'Rocky',
    petSpecies: 'Dog',
    petBreed: 'Beagle',
    ownerName: 'Robert Cruz',
    ownerEmail: 'robert.cruz@email.com',
    ownerPhone: '09345678901',
    reason: 'Boarding for 3 days',
    status: 'waiting',
    veterinarian: 'Dr. Emily Rodriguez'
  },
  {
    id: 'walk_004',
    date: '2024-04-08',
    time: '02:00 PM',
    petName: 'Luna',
    petSpecies: 'Cat',
    petBreed: 'Siamese',
    ownerName: 'Patricia Lee',
    ownerEmail: 'patricia.lee@email.com',
    ownerPhone: '09456789012',
    reason: 'Dental cleaning',
    status: 'completed',
    veterinarian: 'Dr. Sarah Johnson'
  },
  {
    id: 'walk_005',
    date: '2024-04-08',
    time: '03:30 PM',
    petName: 'Max',
    petSpecies: 'Dog',
    petBreed: 'German Shepherd',
    ownerName: 'Daniel Reyes',
    ownerEmail: 'daniel.reyes@email.com',
    ownerPhone: '09567890123',
    reason: 'Limping and possible fracture',
    status: 'completed',
    veterinarian: 'Dr. Michael Chen'
  }
];

// Mock appointments
const MOCK_APPOINTMENTS: AppointmentInvoice[] = [
  {
    id: 'app1',
    date: '2024-03-25',
    time: '10:00 AM',
    veterinarian: 'Dr. Sarah Johnson',
    petName: 'Max',
    ownerName: 'John Doe',
    services: ['Consultation', 'Vaccination'],
    amount: 1300
  },
  {
    id: 'app2',
    date: '2024-03-28',
    time: '2:30 PM',
    veterinarian: 'Dr. Michael Chen',
    petName: 'Luna',
    ownerName: 'Jane Smith',
    services: ['Consultation', 'Laboratory Test'],
    amount: 2000
  },
  {
    id: 'app3',
    date: '2024-04-02',
    time: '11:15 AM',
    veterinarian: 'Dr. Emily Rodriguez',
    petName: 'Charlie',
    ownerName: 'Robert Brown',
    services: ['Surgery', 'Medication'],
    amount: 5500
  }
];

// Mock products
const MOCK_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Premium Dog Food', sku: 'FD-001', category: 'Food', price: 1200, stock: 45, description: 'High-quality dry dog food, 5kg' },
  { id: 'p2', name: 'Cat Food - Salmon', sku: 'FD-002', category: 'Food', price: 850, stock: 32, description: 'Grain-free cat food, 2kg' },
  { id: 'p3', name: 'Antibiotic Spray', sku: 'MD-001', category: 'Medicine', price: 350, stock: 28, description: 'Topical antibiotic spray for wounds' },
  { id: 'p4', name: 'Flea & Tick Collar', sku: 'AC-001', category: 'Accessory', price: 450, stock: 56, description: 'Protects for up to 6 months' },
  { id: 'p5', name: 'Omega-3 Supplement', sku: 'SP-001', category: 'Supplement', price: 680, stock: 23, description: 'For healthy skin and coat' },
  { id: 'p6', name: 'Pet Shampoo', sku: 'AC-002', category: 'Accessory', price: 280, stock: 67, description: 'Hypoallergenic, gentle formula' },
  { id: 'p7', name: 'Dewormer Tablet', sku: 'MD-002', category: 'Medicine', price: 120, stock: 89, description: 'Broad-spectrum dewormer' },
  { id: 'p8', name: 'Vitamin Chews', sku: 'SP-002', category: 'Supplement', price: 420, stock: 34, description: 'Multivitamin for dogs' },
];

// Mock invoices
const MOCK_INVOICES: Invoice[] = [
  {
    id: 'inv1',
    invoiceNumber: 'INV-2024-001',
    date: '2024-03-20',
    time: '10:30 AM',
    invoiceType: 'appointment',
    customerName: 'John Doe',
    customerEmail: 'john.doe@email.com',
    customerPhone: '09123456789',
    petName: 'Max',
    items: [
      { id: 'i1', name: 'General Consultation', description: 'Standard veterinary consultation', quantity: 1, unitPrice: 500, total: 500, category: 'Consultation' },
      { id: 'i2', name: 'Anti-Rabies', description: 'Anti-rabies vaccination', quantity: 1, unitPrice: 350, total: 350, category: 'Vaccinations' }
    ],
    products: [
      { id: 'p1', name: 'Premium Dog Food', sku: 'FD-001', description: 'High-quality dry dog food, 5kg', quantity: 1, unitPrice: 1200, total: 1200, category: 'food' }
    ],
    subtotal: 2050,
    tax: 246,
    discount: 0,
    discountType: 'none',
    total: 2296,
    paymentMethod: 'cash',
    paymentStatus: 'paid',
    status: 'completed',
    notes: 'Regular checkup'
  },
  {
    id: 'inv2',
    invoiceNumber: 'INV-2024-002',
    date: '2024-03-22',
    time: '2:15 PM',
    invoiceType: 'walkin',
    customerName: 'Jane Smith',
    customerEmail: 'jane.smith@email.com',
    customerPhone: '09876543210',
    petName: 'Luna',
    items: [
      { id: 'i1', name: 'Emergency Consultation', description: 'Emergency after-hours consultation', quantity: 1, unitPrice: 800, total: 800, category: 'Consultation' },
      { id: 'i2', name: 'CBC', description: 'Complete Blood Count', quantity: 1, unitPrice: 500, total: 500, category: 'Diagnostics' }
    ],
    products: [
      { id: 'p3', name: 'Antibiotic Spray', sku: 'MD-001', description: 'Topical antibiotic spray for wounds', quantity: 1, unitPrice: 350, total: 350, category: 'medicine' }
    ],
    subtotal: 1650,
    tax: 198,
    discount: 100,
    discountType: 'promo',
    total: 1748,
    paymentMethod: 'card',
    paymentStatus: 'paid',
    status: 'completed',
    notes: 'Sick pet'
  }
];

const getCategoryIcon = (category: string): React.ReactNode => {
  const iconProps = { size: 18 };
  switch(category) {
    case 'Consultation': return <IoPulseOutline {...iconProps} />;
    case 'Vaccinations': return <IoShieldCheckmarkOutline {...iconProps} />;
    case 'Preventive Care': return <IoHeartOutline {...iconProps} />;
    case 'Diagnostics': return <IoFlaskOutline {...iconProps} />;
    case 'Surgery': return <IoCutOutline {...iconProps} />;
    case 'Dental Prophylaxis': return <IoHeartOutline {...iconProps} />;
    case 'Grooming': return <IoWaterOutline {...iconProps} />;
    case 'Boarding': return <IoBedOutline {...iconProps} />;
    case 'Confinement': return <IoHomeOutline {...iconProps} />;
    default: return <IoMedkitOutline {...iconProps} />;
  }
};

const getProductCategoryIcon = (category: string): React.ReactNode => {
  const iconProps = { size: 16 };
  switch(category.toLowerCase()) {
    case 'food': return <IoFastFoodOutline {...iconProps} />;
    case 'medicine': return <IoMedicalOutline {...iconProps} />;
    case 'accessory': return <IoShirtOutline {...iconProps} />;
    case 'supplement': return <IoFitnessOutline {...iconProps} />;
    default: return <IoCartOutline {...iconProps} />;
  }
};

const GlobalBilling: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const processedBillingActionRef = useRef<string>('');
  const catalogLoadPromiseRef = useRef<Promise<boolean> | null>(null);
  const sourceRecordsLoadPromiseRef = useRef<Promise<boolean> | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [catalogLoading, setCatalogLoading] = useState<boolean>(false);
  const [sourceRecordsLoading, setSourceRecordsLoading] = useState<boolean>(false);
  const [catalogLoaded, setCatalogLoaded] = useState<boolean>(false);
  const [sourceRecordsLoaded, setSourceRecordsLoaded] = useState<boolean>(false);
  const [savingInvoice, setSavingInvoice] = useState<boolean>(false);
  
  // UI State
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showDrawer, setShowDrawer] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchVisible, setSearchVisible] = useState<boolean>(false);
  const [filterVisible, setFilterVisible] = useState<boolean>(false);
  const [dateFilter, setDateFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [searchHovered, setSearchHovered] = useState<boolean>(false);
  const [filterHovered, setFilterHovered] = useState<boolean>(false);
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  
  // Modal States
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showWalkinModal, setShowWalkinModal] = useState<boolean>(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState<boolean>(false);
  
  // Walk-in State
  const [walkinRecords, setWalkinRecords] = useState<WalkInRecord[]>([]);
  const [walkinSearchQuery, setWalkinSearchQuery] = useState<string>('');
  
  // Appointment State
  const [appointmentSearchQuery, setAppointmentSearchQuery] = useState<string>('');
  const [appointmentResults, setAppointmentResults] = useState<AppointmentInvoice[]>([]);
  
  // Pagination
  const [page, setPage] = useState<number>(0);
  const itemsPerPage = 8;
  
  // Create Invoice State
  const [invoiceType, setInvoiceType] = useState<InvoiceTypeSelection>('');
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentInvoice | null>(null);
  const [selectedWalkin, setSelectedWalkin] = useState<WalkInRecord | null>(null);
  const [sourceContextLocked, setSourceContextLocked] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<BillingFormErrors>({});
  
  // Service Selection State
  const [showServiceModal, setShowServiceModal] = useState<boolean>(false);
  const [serviceSearchQuery, setServiceSearchQuery] = useState<string>('');
  const [selectedServices, setSelectedServices] = useState<InvoiceItem[]>([]);
  const [serviceCategoryFilter, setServiceCategoryFilter] = useState<string>('all');
  const [tempSelectedServices, setTempSelectedServices] = useState<Map<string, TempSelectedServiceEntry>>(new Map());
  
  // Product Selection State
  const [showProductModal, setShowProductModal] = useState<boolean>(false);
  const [productSearchQuery, setProductSearchQuery] = useState<string>('');
  const [selectedProducts, setSelectedProducts] = useState<ProductItem[]>([]);
  const [productCategoryFilter, setProductCategoryFilter] = useState<string>('all');
  const [tempSelectedProducts, setTempSelectedProducts] = useState<Map<string, { product: Product; quantity: number }>>(new Map());
  
  // Discount State
  const [discountType, setDiscountType] = useState<DiscountType>('none');
  const [customDiscountType, setCustomDiscountType] = useState<CustomDiscountType>('percentage');
  const [customDiscountValue, setCustomDiscountValue] = useState<number>(0);
  const [showCustomDiscountInput, setShowCustomDiscountInput] = useState<boolean>(false);
  
  // Form State
  const [customerName, setCustomerName] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [petName, setPetName] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [initialPaymentAmount, setInitialPaymentAmount] = useState<number>(0);
  const [initialPaymentMethod, setInitialPaymentMethod] = useState<PaymentEntryMethod>('cash');
  const [notes, setNotes] = useState<string>('');

  // Record Payment State
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [paymentAmountInput, setPaymentAmountInput] = useState<number>(0);
  const [paymentEntryMethod, setPaymentEntryMethod] = useState<PaymentEntryMethod>('cash');
  const [paymentEntryNotes, setPaymentEntryNotes] = useState<string>('');
  const [savingPayment, setSavingPayment] = useState<boolean>(false);
  const [paymentAmountError, setPaymentAmountError] = useState<string>('');
  
  // Alert Modal State
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [modalConfig, setModalConfig] = useState<ModalConfig>({
    type: 'info',
    title: '',
    message: '',
    showCancel: false
  });
  
  // Computed values
  const serviceSubtotal = selectedServices.reduce((sum, item) => sum + item.total, 0);
  const productSubtotal = selectedProducts.reduce((sum, item) => sum + item.total, 0);
  const subtotal = serviceSubtotal + productSubtotal;
  const tax = subtotal * TAX_RATE;
  
  const getDiscountAmount = (): number => {
    switch(discountType) {
      case 'senior':
        return subtotal * DISCOUNT_RATES.senior;
      case 'pwd':
        return subtotal * DISCOUNT_RATES.pwd;
      case 'promo':
        return subtotal * DISCOUNT_RATES.promo;
      case 'custom':
        if (customDiscountType === 'percentage') {
          return subtotal * (customDiscountValue / 100);
        } else {
          return Math.min(customDiscountValue, subtotal);
        }
      default:
        return 0;
    }
  };
  
  const discountAmount = getDiscountAmount();
  const total = subtotal + tax - discountAmount;
  const serviceCategories = Array.from(new Set(services.map(service => service.category))).sort();
  const clampedInitialPaymentAmount = paymentMethod === 'installment'
    ? Math.min(Math.max(initialPaymentAmount || 0, 0), Math.max(total, 0))
    : total;
  const amountPaidPreview = paymentMethod === 'installment' ? clampedInitialPaymentAmount : total;
  const remainingBalancePreview = Math.max(total - amountPaidPreview, 0);
  const derivedPaymentStatus: PaymentStatus =
    remainingBalancePreview <= 0
      ? 'paid'
      : amountPaidPreview > 0
        ? 'partial'
        : 'pending';
  const paymentRemainingBalance = Math.max(selectedInvoice?.remainingBalance || 0, 0);
  const isPaymentAmountInvalid = paymentRemainingBalance <= 0
    || paymentAmountInput <= 0
    || paymentAmountInput > paymentRemainingBalance;
  const isSourceRecordLocked = sourceContextLocked && Boolean(selectedAppointment || selectedWalkin);
  const selectedSourceSummary = invoiceType === 'appointment'
    ? (selectedAppointment
      ? `${selectedAppointment.petName} • ${selectedAppointment.ownerName} • ${selectedAppointment.date}${selectedAppointment.time ? ` at ${selectedAppointment.time}` : ''}`
      : '')
    : invoiceType === 'walkin'
      ? (selectedWalkin
        ? `${selectedWalkin.petName} • ${selectedWalkin.ownerName} • ${selectedWalkin.date}${selectedWalkin.time ? ` at ${selectedWalkin.time}` : ''}`
        : '')
      : '';
  const selectedPrescriptionProductSuggestions = invoiceType === 'appointment'
    ? (selectedAppointment?.prescriptionProductSuggestions || [])
    : invoiceType === 'walkin'
      ? (selectedWalkin?.prescriptionProductSuggestions || [])
      : [];

  const filteredServices = services.filter(service => {
    const matchesSearch = serviceSearchQuery === '' || 
      service.name.toLowerCase().includes(serviceSearchQuery.toLowerCase()) ||
      service.category.toLowerCase().includes(serviceSearchQuery.toLowerCase());
    const matchesCategory = serviceCategoryFilter === 'all' || service.category === serviceCategoryFilter;
    return matchesSearch && matchesCategory;
  });
  
  const filteredWalkinRecords = walkinRecords.filter(record => {
    const matchesSearch = walkinSearchQuery === '' || 
      record.petName.toLowerCase().includes(walkinSearchQuery.toLowerCase()) ||
      record.ownerName.toLowerCase().includes(walkinSearchQuery.toLowerCase()) ||
      record.id.toLowerCase().includes(walkinSearchQuery.toLowerCase());
    return matchesSearch;
  });
  
  const filteredAppointments = appointmentResults.filter(app => {
    const matchesSearch = appointmentSearchQuery === '' || 
      app.petName.toLowerCase().includes(appointmentSearchQuery.toLowerCase()) ||
      app.ownerName.toLowerCase().includes(appointmentSearchQuery.toLowerCase()) ||
      app.id.toLowerCase().includes(appointmentSearchQuery.toLowerCase());
    return matchesSearch;
  });
  
  const filteredProducts = products.filter(product => {
    const matchesSearch = productSearchQuery === '' || 
      product.name.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(productSearchQuery.toLowerCase());
    const matchesCategory = productCategoryFilter === 'all' || product.category.toLowerCase() === productCategoryFilter.toLowerCase();
    return matchesSearch && matchesCategory;
  });
  
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = searchQuery === '' || 
      inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.petName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDate = dateFilter === '' || inv.date === dateFilter;
    const matchesStatus = statusFilter === '' || inv.paymentStatus === statusFilter;
    const matchesType = typeFilter === '' || inv.invoiceType === typeFilter;
    return matchesSearch && matchesDate && matchesStatus && matchesType;
  });
  
  const paginatedInvoices = filteredInvoices.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / itemsPerPage));
  
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

  const getErrorMessage = (error: any, fallback: string): string => {
    return (
      error?.data?.error ||
      error?.response?.data?.error ||
      error?.message ||
      fallback
    );
  };

  const findExistingInvoiceBySource = (
    sourceRecordType?: string | null,
    sourceRecordId?: string | number | null
  ): Invoice | null => {
    if (!sourceRecordType || sourceRecordId === undefined || sourceRecordId === null || sourceRecordId === '') {
      return null;
    }

    return invoices.find(
      invoice =>
        invoice.sourceRecordType === sourceRecordType &&
        String(invoice.sourceRecordId ?? '') === String(sourceRecordId) &&
        invoice.status !== 'cancelled' &&
        invoice.status !== 'refunded'
    ) || null;
  };

  const normalizeBillingServiceLabel = (value?: string | null): string => {
    return String(value || '')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/check-up/g, 'checkup')
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token && token !== 'and' && token !== 'or')
      .sort()
      .join(' ');
  };

  const parseBillingServiceNames = (label?: string | null): string[] => {
    const rawLabel = String(label || '').trim();
    if (!rawLabel) {
      return [];
    }

    for (const groupPrefix of ['Pet Grooming', 'Laboratory Tests']) {
      if (rawLabel.toLowerCase().startsWith(groupPrefix.toLowerCase())) {
        const openParen = rawLabel.indexOf('(');
        const closeParen = rawLabel.lastIndexOf(')');
        if (openParen !== -1 && closeParen > openParen) {
          return rawLabel
            .slice(openParen + 1, closeParen)
            .split(',')
            .map(part => part.trim())
            .filter(Boolean);
        }
        return [groupPrefix];
      }
    }

    return [rawLabel];
  };

  const resolveBillingCatalogService = (rawName?: string | null): Service | null => {
    const normalizedRawName = normalizeBillingServiceLabel(rawName);
    if (!normalizedRawName) {
      return null;
    }

    const matchedDirect = services.find(
      service => normalizeBillingServiceLabel(service.name) === normalizedRawName
    );
    if (matchedDirect) {
      return matchedDirect;
    }

    const aliasTarget = BILLING_SERVICE_LABEL_ALIASES[String(rawName || '').trim().toLowerCase()];
    if (!aliasTarget) {
      return null;
    }

    return services.find(
      service => normalizeBillingServiceLabel(service.name) === normalizeBillingServiceLabel(aliasTarget)
    ) || null;
  };

  const buildInvoiceItemsFromWalkinFallback = (record: WalkInRecord): InvoiceItem[] => {
    const fallbackLabels = [
      ...(record.services || []),
    ]
      .flatMap(label => parseBillingServiceNames(label))
      .map(label => label.trim())
      .filter(Boolean);

    const seen = new Set<string>();
    const fallbackItems: InvoiceItem[] = [];

    fallbackLabels.forEach((label, index) => {
      const matchedService = resolveBillingCatalogService(label);
      if (!matchedService) {
        return;
      }

      const key = String(matchedService.id);
      if (seen.has(key)) {
        return;
      }
      seen.add(key);

      fallbackItems.push({
        id: `${matchedService.id}-fallback-${index}`,
        name: matchedService.name,
        description: matchedService.description,
        quantity: 1,
        unitPrice: matchedService.price,
        total: matchedService.price,
        category: matchedService.category,
        serviceId: matchedService.id,
      });
    });

    return fallbackItems;
  };

  const mapSourceServicesToInvoiceItems = (sourceServices: BillingSourceService[] = []): InvoiceItem[] => {
    return sourceServices.map((service, index) => {
      const matchedService = resolveBillingCatalogService(service.name);
      const quantity = service.quantity || 1;
      const sourceUnitPrice = Number(service.unitPrice || 0);
      const fallbackKey = normalizeBillingServiceLabel(service.name);
      const fallbackMetadata = BILLING_GENERIC_SERVICE_METADATA_FALLBACKS[fallbackKey];
      const fallbackUnitPrice = BILLING_GENERIC_SERVICE_PRICE_FALLBACKS[fallbackKey] || 0;
      const resolvedUnitPrice = sourceUnitPrice > 0
        ? sourceUnitPrice
        : Number(matchedService?.price || fallbackUnitPrice);

      return {
        id: `${service.serviceId ?? service.serviceCode ?? service.id}-${index}-${Date.now()}`,
        name: service.name,
        description: service.description || matchedService?.description || fallbackMetadata?.description || '',
        quantity,
        unitPrice: resolvedUnitPrice,
        total: resolvedUnitPrice * quantity,
        category: service.category && service.category !== 'Other'
          ? service.category
          : matchedService?.category || fallbackMetadata?.category || service.category,
        serviceId:
          service.serviceId !== undefined && service.serviceId !== null
            ? String(service.serviceId)
            : service.serviceCode || matchedService?.id || undefined,
      };
    });
  };
  
  const showAlert = (
    type: ModalConfig['type'], 
    title: string, 
    message: string | React.ReactNode, 
    onConfirm?: () => void, 
    showCancel: boolean = false
  ) => {
    setModalConfig({ type, title, message, onConfirm, showCancel });
    setModalVisible(true);
  };

  const clearFormErrors = (...fieldNames: (keyof BillingFormErrors)[]) => {
    if (fieldNames.length === 0) {
      setFormErrors({});
      return;
    }

    setFormErrors((prev) => {
      const next = { ...prev };
      fieldNames.forEach((fieldName) => {
        delete next[fieldName];
      });
      return next;
    });
  };

  const loadBillingData = async (): Promise<void> => {
    setLoading(true);
    try {
      const loadedInvoices = await apiService.getBillingInvoices();
      setInvoices(Array.isArray(loadedInvoices) ? loadedInvoices : []);
      setPage(0);
    } catch (error) {
      console.error('Billing data load error:', error);
      setInvoices([]);
      showAlert('error', 'Billing Load Failed', getErrorMessage(error, 'Unable to load billing data.'));
    } finally {
      setLoading(false);
    }
  };

  const loadBillingCatalog = async (): Promise<boolean> => {
    if (catalogLoaded) {
      return true;
    }

    if (catalogLoadPromiseRef.current) {
      return catalogLoadPromiseRef.current;
    }

    setCatalogLoading(true);
    catalogLoadPromiseRef.current = (async () => {
      try {
        const [loadedServices, loadedProducts] = await Promise.all([
          apiService.getBillingServices(),
          apiService.getBillingProducts(),
        ]);
        setServices(Array.isArray(loadedServices) ? loadedServices : []);
        setProducts(Array.isArray(loadedProducts) ? loadedProducts : []);
        setCatalogLoaded(true);
        return true;
      } catch (error) {
        console.error('Billing catalog load error:', error);
        showAlert('error', 'Billing Catalog Failed', getErrorMessage(error, 'Unable to load billing services and products.'));
        return false;
      } finally {
        setCatalogLoading(false);
        catalogLoadPromiseRef.current = null;
      }
    })();

    return catalogLoadPromiseRef.current;
  };

  const loadBillingSourceRecords = async (): Promise<boolean> => {
    if (sourceRecordsLoaded) {
      return true;
    }

    if (sourceRecordsLoadPromiseRef.current) {
      return sourceRecordsLoadPromiseRef.current;
    }

    setSourceRecordsLoading(true);
    sourceRecordsLoadPromiseRef.current = (async () => {
      try {
        const sourceRecords = await apiService.getBillingSourceRecords();
        setWalkinRecords(Array.isArray(sourceRecords?.walkins) ? sourceRecords.walkins : []);
        setAppointmentResults(Array.isArray(sourceRecords?.appointments) ? sourceRecords.appointments : []);
        setSourceRecordsLoaded(true);
        return true;
      } catch (error) {
        console.error('Billing source records load error:', error);
        setWalkinRecords([]);
        setAppointmentResults([]);
        showAlert('error', 'Billing Sources Failed', getErrorMessage(error, 'Unable to load completed appointments and visits.'));
        return false;
      } finally {
        setSourceRecordsLoading(false);
        sourceRecordsLoadPromiseRef.current = null;
      }
    })();

    return sourceRecordsLoadPromiseRef.current;
  };
  
  const handleLogoutPress = (): void => {
    showAlert('confirm', 'Log Out', 'Are you sure you want to log out?', async () => {
      try {
        await apiService.logout();
      } catch (error) {
        console.log("Logout audit failed:", error);
      }
      localStorage.removeItem('userSession');
      navigate('/login');
    }, true);
  };
  
  const selectWalkinRecord = (record: WalkInRecord, options?: { silent?: boolean; lockSourceContext?: boolean }) => {
    const mappedServices = (() => {
      const sourceItems = mapSourceServicesToInvoiceItems(record.serviceItems || []);
      if (sourceItems.length > 0) {
        return sourceItems.map(item => ({
          ...item,
          isSourceLocked: Boolean(options?.lockSourceContext),
        }));
      }
      return buildInvoiceItemsFromWalkinFallback(record).map(item => ({
        ...item,
        isSourceLocked: Boolean(options?.lockSourceContext),
      }));
    })();
    setSourceContextLocked(Boolean(options?.lockSourceContext));
    setSelectedWalkin(record);
    setSelectedAppointment(null);
    setInvoiceType('walkin');
    setCustomerName(record.ownerName);
    setCustomerEmail(record.ownerEmail);
    setCustomerPhone(record.ownerPhone);
    setPetName(record.petName);
    setSelectedServices(mappedServices);
    setSelectedProducts([]);
    setNotes('');
    clearFormErrors('invoiceType', 'sourceRecord', 'customerName', 'petName', 'lineItems');
    setShowWalkinModal(false);
    setWalkinSearchQuery('');
    if (!options?.silent) {
      showAlert('success', 'Record Loaded', `Loaded walk-in record for ${record.petName} (${record.ownerName})`);
    }
  };
  
  const selectAppointmentRecord = (appointment: AppointmentInvoice, options?: { silent?: boolean; lockSourceContext?: boolean }) => {
    setSourceContextLocked(Boolean(options?.lockSourceContext));
    setSelectedAppointment(appointment);
    setSelectedWalkin(null);
    setInvoiceType('appointment');
    setCustomerName(appointment.ownerName);
    setCustomerEmail(appointment.ownerEmail || '');
    setCustomerPhone(appointment.ownerPhone || '');
    setPetName(appointment.petName);
    setSelectedServices(
      mapSourceServicesToInvoiceItems(appointment.serviceItems || []).map(item => ({
        ...item,
        isSourceLocked: Boolean(options?.lockSourceContext),
      }))
    );
    setSelectedProducts([]);
    setNotes('');
    clearFormErrors('invoiceType', 'sourceRecord', 'customerName', 'petName', 'lineItems');
    setShowAppointmentModal(false);
    setAppointmentSearchQuery('');
    if (!options?.silent) {
      showAlert('success', 'Record Loaded', `Loaded appointment for ${appointment.petName} (${appointment.ownerName})`);
    }
  };
  
  const openServiceModal = async () => {
    const catalogReady = await loadBillingCatalog();
    if (!catalogReady) {
      return;
    }

    const tempMap = new Map();
    selectedServices.forEach(service => {
      const foundService = services.find(s => s.name === service.name);
      if (foundService) {
        tempMap.set(foundService.id, {
          service: foundService,
          quantity: service.quantity,
          locked: Boolean(service.isSourceLocked),
        });
      }
    });
    setTempSelectedServices(tempMap);
    setServiceSearchQuery('');
    setServiceCategoryFilter('all');
    setShowServiceModal(true);
  };
  
  const addTempService = (service: Service) => {
    const newTemp = new Map(tempSelectedServices);
    if (newTemp.has(service.id)) {
      const existing = newTemp.get(service.id)!;
      newTemp.set(service.id, { service, quantity: existing.quantity + 1 });
    } else {
      newTemp.set(service.id, { service, quantity: 1 });
    }
    setTempSelectedServices(newTemp);
  };
  
  const updateTempServiceQuantity = (serviceId: string, quantity: number) => {
    if (quantity < 1) {
      const newTemp = new Map(tempSelectedServices);
      if (newTemp.get(serviceId)?.locked) {
        return;
      }
      newTemp.delete(serviceId);
      setTempSelectedServices(newTemp);
      return;
    }
    const newTemp = new Map(tempSelectedServices);
    const existing = newTemp.get(serviceId);
    if (existing) {
      newTemp.set(serviceId, { ...existing, quantity });
      setTempSelectedServices(newTemp);
    }
  };
  
  const removeTempService = (serviceId: string) => {
    const newTemp = new Map(tempSelectedServices);
    if (newTemp.get(serviceId)?.locked) {
      showAlert('info', 'Source Locked', 'The source-linked service cannot be removed from this invoice.');
      return;
    }
    newTemp.delete(serviceId);
    setTempSelectedServices(newTemp);
  };
  
  const confirmServices = () => {
    const newServices: InvoiceItem[] = [];
    tempSelectedServices.forEach(({ service, quantity }) => {
      const existingService = selectedServices.find(existing =>
        String(existing.serviceId || '').toLowerCase() === String(service.id).toLowerCase() ||
        existing.name.toLowerCase() === service.name.toLowerCase()
      );
      const unitPrice = existingService?.unitPrice ?? service.price;

      newServices.push({
        id: existingService?.id || (Date.now().toString() + Math.random()),
        name: service.name,
        description: existingService?.description ?? service.description,
        quantity: quantity,
        unitPrice,
        total: unitPrice * quantity,
        category: service.category,
        serviceId: existingService?.serviceId ?? service.id,
        isSourceLocked: existingService?.isSourceLocked ?? false,
      });
    });
    setSelectedServices(newServices);
    if (newServices.length > 0) {
      clearFormErrors('lineItems');
    }
    setShowServiceModal(false);
    if (newServices.length > 0) {
      showAlert('success', 'Services Added', `${newServices.length} service(s) have been added to the invoice.`);
    }
  };
  
  const openProductModal = async () => {
    const catalogReady = await loadBillingCatalog();
    if (!catalogReady) {
      return;
    }

    const tempMap = new Map();
    selectedProducts.forEach(product => {
      const selectedProductId = String(product.inventoryItemId || product.id);
      const foundProduct = products.find(p => String(p.id) === selectedProductId);
      if (foundProduct) {
        tempMap.set(foundProduct.id, { product: foundProduct, quantity: product.quantity });
      }
    });
    setTempSelectedProducts(tempMap);
    setProductSearchQuery('');
    setProductCategoryFilter('all');
    setShowProductModal(true);
  };
  
  const addTempProduct = (product: Product) => {
    const newTemp = new Map(tempSelectedProducts);
    if (newTemp.has(product.id)) {
      const existing = newTemp.get(product.id)!;
      const newQuantity = Math.min(existing.quantity + 1, product.stock);
      newTemp.set(product.id, { product, quantity: newQuantity });
    } else {
      newTemp.set(product.id, { product, quantity: 1 });
    }
    setTempSelectedProducts(newTemp);
  };
  
  const updateTempProductQuantity = (productId: string, quantity: number) => {
    const newTemp = new Map(tempSelectedProducts);
    const existing = newTemp.get(productId);
    if (existing) {
      const product = existing.product;
      const maxQuantity = product.stock;
      const newQuantity = Math.min(Math.max(1, quantity), maxQuantity);
      newTemp.set(productId, { ...existing, quantity: newQuantity });
      setTempSelectedProducts(newTemp);
    }
  };
  
  const removeTempProduct = (productId: string) => {
    const newTemp = new Map(tempSelectedProducts);
    newTemp.delete(productId);
    setTempSelectedProducts(newTemp);
  };
  
  const confirmProducts = () => {
    const newProducts: ProductItem[] = [];
    tempSelectedProducts.forEach(({ product, quantity }) => {
      const existingProduct = selectedProducts.find(existing =>
        String(existing.inventoryItemId || existing.id) === String(product.id) ||
        existing.name.toLowerCase() === product.name.toLowerCase()
      );
      const unitPrice = existingProduct?.unitPrice ?? product.price;

      newProducts.push({
        id: String(existingProduct?.inventoryItemId || existingProduct?.id || product.id),
        inventoryItemId: existingProduct?.inventoryItemId || existingProduct?.id || product.id,
        name: product.name,
        sku: product.sku,
        description: existingProduct?.description ?? product.description,
        quantity: quantity,
        unitPrice,
        total: unitPrice * quantity,
        category: normalizeProductCategory(product.category),
        stock: product.stock
      });
    });
    setSelectedProducts(newProducts);
    if (newProducts.length > 0) {
      clearFormErrors('lineItems');
    }
    setShowProductModal(false);
    if (newProducts.length > 0) {
      showAlert('success', 'Products Added', `${newProducts.length} product(s) have been added to the invoice.`);
    }
  };
  
  const updateServiceQuantity = (id: string, quantity: number) => {
    if (quantity < 1) return;
    setSelectedServices(prev => prev.map(s => 
      s.id === id ? { ...s, quantity, total: s.unitPrice * quantity } : s
    ));
  };
  
  const removeService = (id: string) => {
    const targetService = selectedServices.find(service => service.id === id);
    if (targetService?.isSourceLocked) {
      showAlert('info', 'Source Locked', 'The source-linked service cannot be removed from this invoice.');
      return;
    }
    setSelectedServices(prev => prev.filter(s => s.id !== id));
  };
  
  const updateServicePrice = (id: string, newPrice: number) => {
    if (newPrice < 0) return;
    setSelectedServices(prev => prev.map(s => 
      s.id === id ? { ...s, unitPrice: newPrice, total: s.quantity * newPrice } : s
    ));
  };

  const updateProductQuantity = (id: string, quantity: number) => {
    if (quantity < 1) return;
    setSelectedProducts(prev => prev.map(p => 
      String(p.inventoryItemId || p.id) === id ? { ...p, quantity, total: p.unitPrice * quantity } : p
    ));
  };
  
  const removeProduct = (id: string) => {
    setSelectedProducts(prev => prev.filter(p => String(p.inventoryItemId || p.id) !== id));
  };
  
  const updateProductPrice = (id: string, newPrice: number) => {
    if (newPrice < 0) return;
    setSelectedProducts(prev => prev.map(p => 
      String(p.inventoryItemId || p.id) === id ? { ...p, unitPrice: newPrice, total: p.quantity * newPrice } : p
    ));
  };

  const isPrescriptionSuggestionSelected = (suggestion: PrescriptionProductSuggestion): boolean => {
    const suggestionId = String(suggestion.inventoryItemId || suggestion.id);
    return selectedProducts.some(product => String(product.inventoryItemId || product.id) === suggestionId);
  };

  const togglePrescriptionSuggestedProduct = (suggestion: PrescriptionProductSuggestion, shouldAdd: boolean): void => {
    const suggestionId = String(suggestion.inventoryItemId || suggestion.id);

    setSelectedProducts(prev => {
      const exists = prev.some(product => String(product.inventoryItemId || product.id) === suggestionId);
      if (shouldAdd) {
        if (exists) {
          return prev;
        }

        return [
          ...prev,
          {
            id: suggestionId,
            inventoryItemId: suggestion.inventoryItemId || suggestion.id,
            name: suggestion.name,
            sku: suggestion.sku,
            description: suggestion.description,
            quantity: 1,
            unitPrice: suggestion.price,
            total: suggestion.price,
            category: normalizeProductCategory(suggestion.category),
            stock: suggestion.stock,
          },
        ];
      }

      return prev.filter(product => String(product.inventoryItemId || product.id) !== suggestionId);
    });

    if (shouldAdd) {
      clearFormErrors('lineItems');
    }
  };

  const handleDiscountTypeChange = (type: DiscountType) => {
    setDiscountType(type);
    if (type === 'custom') {
      setShowCustomDiscountInput(true);
    } else {
      setShowCustomDiscountInput(false);
      setCustomDiscountValue(0);
    }
  };
  
  const resetForm = () => {
    setInvoiceType('');
    setSelectedAppointment(null);
    setSelectedWalkin(null);
    setSourceContextLocked(false);
    setCustomerName('');
    setCustomerEmail('');
    setCustomerPhone('');
    setPetName('');
    setSelectedServices([]);
    setSelectedProducts([]);
    setDiscountType('none');
    setCustomDiscountValue(0);
    setCustomDiscountType('percentage');
    setShowCustomDiscountInput(false);
    setPaymentMethod('cash');
    setInitialPaymentAmount(0);
    setInitialPaymentMethod('cash');
    setNotes('');
    clearFormErrors();
  };

  const openCreateInvoiceModal = () => {
    resetForm();
    setShowCreateModal(true);
    void loadBillingCatalog();
  };
  
  const handleInvoiceTypeChange = (type: InvoiceType) => {
    if (sourceContextLocked) {
      showAlert('info', 'Source Locked', 'Invoice type is locked because this billing form was opened from an appointment or patient record.');
      return;
    }
    setInvoiceType(type);
    if (type !== invoiceType) {
      setSelectedAppointment(null);
      setSelectedWalkin(null);
    }
    clearFormErrors('invoiceType', 'sourceRecord');
    if (type === 'walkin') {
      setShowWalkinModal(true);
    } else {
      setShowAppointmentModal(true);
    }
    void loadBillingSourceRecords();
  };
  
  const handleCreateInvoice = async () => {
    const nextErrors: BillingFormErrors = {};
    const trimmedCustomerName = customerName.trim();
    const trimmedPetName = petName.trim();
    const selectedSource = invoiceType === 'appointment'
      ? selectedAppointment
      : invoiceType === 'walkin'
        ? selectedWalkin
        : null;

    if (!invoiceType) {
      nextErrors.invoiceType = 'Select the invoice type.';
    }

    if (invoiceType === 'appointment' && !selectedAppointment) {
      nextErrors.sourceRecord = 'Select the completed appointment to bill.';
    }

    if (invoiceType === 'walkin' && !selectedWalkin) {
      nextErrors.sourceRecord = 'Select the completed walk-in visit to bill.';
    }

    if (!trimmedCustomerName) {
      nextErrors.customerName = 'Customer name is required.';
    }

    if (!trimmedPetName) {
      nextErrors.petName = 'Pet name is required.';
    }

    if (selectedServices.length === 0 && selectedProducts.length === 0) {
      nextErrors.lineItems = 'Add at least one service or product.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors);
      showAlert(
        'error',
        'Missing Information',
        (
            <div className="billingValidationSummary">
              <div>Please complete the required fields:</div>
            {Object.values(nextErrors).map((message, index) => (
              <div key={`${index}-${message}`}>- {message}</div>
            ))}
          </div>
        )
      );
      return;
    }

    setSavingInvoice(true);
    try {
      const selectedInvoiceType = invoiceType as InvoiceType;
      const sourceRecordType = selectedSource?.sourceRecordType;
      const sourceRecordId = selectedSource?.sourceRecordId;
      const branchId = selectedInvoiceType === 'appointment' ? selectedAppointment?.branchId : selectedWalkin?.branchId;

      const existingInvoice = findExistingInvoiceBySource(sourceRecordType, sourceRecordId);
      if (existingInvoice) {
        setSelectedInvoice(existingInvoice);
        setShowDrawer(true);
        setShowCreateModal(false);
        showAlert('info', 'Invoice Already Exists', `Invoice ${existingInvoice.invoiceNumber} already exists for this billing source.`);
        return;
      }

      const response = await apiService.createBillingInvoice({
        invoiceType: selectedInvoiceType,
        sourceRecordType: sourceRecordType || selectedInvoiceType,
        sourceRecordId: sourceRecordId || undefined,
        branchId: branchId || undefined,
        handledByUserId: currentUser?.id || currentUser?.pk || undefined,
        customerName: trimmedCustomerName,
        customerEmail,
        customerPhone,
        petName: trimmedPetName,
        items: selectedServices.map(service => ({
          name: service.name,
          description: service.description,
          quantity: service.quantity,
          unitPrice: service.unitPrice,
          category: service.category,
          serviceId: service.serviceId,
        })),
        products: selectedProducts.map(product => ({
          inventoryItemId: product.inventoryItemId || product.id,
          name: product.name,
          sku: product.sku,
          description: product.description,
          quantity: product.quantity,
          unitPrice: product.unitPrice,
          category: product.category,
        })),
        discountType,
        discountValue: discountType === 'custom' ? customDiscountValue : undefined,
        discountIsPercentage: discountType === 'custom' ? (customDiscountType === 'percentage') : undefined,
        paymentMethod,
        paymentStatus: derivedPaymentStatus,
        initialPaymentAmount: paymentMethod === 'installment' ? clampedInitialPaymentAmount : undefined,
        initialPaymentMethod: paymentMethod === 'installment' ? initialPaymentMethod : undefined,
        notes,
      });

      const createdInvoice = response?.invoice;
      if (createdInvoice) {
        setInvoices(prev => [createdInvoice, ...prev]);
      } else {
        await loadBillingData();
      }

      resetForm();
      setSourceRecordsLoaded(false);
      setWalkinRecords([]);
      setAppointmentResults([]);
      setShowCreateModal(false);
      showAlert(
        'success',
        'Invoice Created',
        createdInvoice?.invoiceNumber
          ? `Invoice ${createdInvoice.invoiceNumber} has been created successfully!`
          : 'Invoice has been created successfully!'
      );
    } catch (error: any) {
      console.error('Create billing invoice error:', error);
      const existingInvoice = error?.status === 409 ? error?.data?.invoice : null;
      if (existingInvoice) {
        setInvoices(prev => {
          const next = prev.filter(invoice => invoice.id !== existingInvoice.id);
          return [existingInvoice, ...next];
        });
        setSelectedInvoice(existingInvoice);
        setShowDrawer(true);
        setShowCreateModal(false);
        setSourceRecordsLoaded(false);
        setWalkinRecords([]);
        setAppointmentResults([]);
        showAlert('info', 'Invoice Already Exists', `Invoice ${existingInvoice.invoiceNumber} already exists for this billing source.`);
      } else {
        showAlert('error', 'Create Invoice Failed', getErrorMessage(error, 'Unable to create invoice.'));
      }
    } finally {
      setSavingInvoice(false);
    }
  };
  
  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowDrawer(true);
  };

  const clampPaymentAmountToRemaining = (value: number, remainingBalance: number) => {
    const numericValue = Number.isFinite(value) ? value : 0;
    const clampedValue = Math.min(Math.max(numericValue, 0), Math.max(remainingBalance, 0));
    return Math.round(clampedValue * 100) / 100;
  };

  const handlePaymentAmountChange = (rawValue: string) => {
    const remainingBalance = Math.max(selectedInvoice?.remainingBalance || 0, 0);
    const parsedAmount = Number.parseFloat(rawValue);

    if (!rawValue) {
      setPaymentAmountInput(0);
      setPaymentAmountError('Payment amount is required.');
      return;
    }

    if (!Number.isFinite(parsedAmount)) {
      setPaymentAmountInput(0);
      setPaymentAmountError('Please enter a valid payment amount.');
      return;
    }

    const clampedAmount = clampPaymentAmountToRemaining(parsedAmount, remainingBalance);
    setPaymentAmountInput(clampedAmount);

    if (parsedAmount > remainingBalance) {
      setPaymentAmountError('');
    } else if (parsedAmount <= 0) {
      setPaymentAmountError('Payment amount must be greater than ₱0.');
    } else {
      setPaymentAmountError('');
    }
  };

  const openRecordPaymentModal = (invoice: Invoice) => {
    const remainingBalance = Math.max(invoice.remainingBalance || 0, 0);
    setSelectedInvoice(invoice);
    setPaymentAmountInput(remainingBalance);
    setPaymentAmountError('');
    setPaymentEntryMethod('cash');
    setPaymentEntryNotes('');
    setShowPaymentModal(true);
  };

  const handleRecordPayment = async () => {
    if (!selectedInvoice) return;

    const remainingBalance = Math.max(selectedInvoice.remainingBalance || 0, 0);
    const safeAmount = Math.min(Math.max(paymentAmountInput || 0, 0), remainingBalance);

    if (safeAmount <= 0) {
      setPaymentAmountError('Payment amount must be greater than ₱0.');
      showAlert('error', 'Invalid Amount', 'Please enter a valid payment amount.');
      return;
    }

    if (paymentAmountInput > remainingBalance) {
      setPaymentAmountInput(remainingBalance);
      setPaymentAmountError(`Maximum payment is ₱${remainingBalance.toLocaleString()}.`);
      return;
    }

    setSavingPayment(true);
    try {
      const response = await apiService.recordBillingInvoicePayment(selectedInvoice.id, {
        amount: safeAmount,
        paymentMethod: paymentEntryMethod,
        handledByUserId: currentUser?.id || currentUser?.pk || undefined,
        notes: paymentEntryNotes,
      });

      const updatedInvoice = response?.invoice;
      if (!updatedInvoice) {
        throw new Error('Updated invoice was not returned by the server.');
      }

      setInvoices(prev => prev.map(invoice => invoice.id === updatedInvoice.id ? updatedInvoice : invoice));
      setSelectedInvoice(updatedInvoice);
      setShowPaymentModal(false);
      showAlert('success', 'Payment Recorded', 'The installment payment has been recorded successfully.');
    } catch (error) {
      console.error('Record billing payment error:', error);
      showAlert('error', 'Record Payment Failed', getErrorMessage(error, 'Unable to record payment.'));
    } finally {
      setSavingPayment(false);
    }
  };
  
  const handleCloseDrawer = () => {
    setShowDrawer(false);
    setSelectedInvoice(null);
  };
  
  const handlePrintInvoice = async (invoice: Invoice) => {
    try {
      const blob = await pdf(
        <InvoicePDF
          invoiceNumber={invoice.invoiceNumber}
          date={invoice.date}
          time={invoice.time}
          invoiceType={invoice.invoiceType}
          customerName={invoice.customerName}
          customerEmail={invoice.customerEmail}
          customerPhone={invoice.customerPhone}
          petName={invoice.petName}
          items={invoice.items}
          products={invoice.products}
          subtotal={invoice.subtotal}
          tax={invoice.tax}
          discount={invoice.discount}
          total={invoice.total}
          amountPaid={invoice.amountPaid}
          remainingBalance={invoice.remainingBalance}
          paymentMethod={invoice.paymentMethod}
          paymentStatus={invoice.paymentStatus}
          notes={invoice.notes}
          paymentHistory={invoice.paymentHistory}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 100);

      return;
    } catch (error) {
      console.error('Invoice PDF generation error:', error);
      showAlert('error', 'Print Failed', 'Failed to generate the invoice PDF. Please try again.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      return;
    }

      printWindow!.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invoice ${invoice.invoiceNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; background: #fff; }
            .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #3d67ee; }
            .header h1 { color: #3d67ee; margin-bottom: 8px; }
            .invoice-details { margin-bottom: 30px; padding: 20px; background: #f8faff; border-radius: 12px; }
            .row { display: flex; gap: 30px; margin-bottom: 15px; flex-wrap: wrap; }
            .col { flex: 1; }
            .col label { font-size: 11px; color: #666; display: block; margin-bottom: 4px; font-weight: 600; }
            .col .value { font-size: 14px; color: #333; font-weight: 500; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { text-align: left; padding: 12px; background: #f5f5f5; font-size: 12px; font-weight: 600; color: #666; }
            td { padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 12px; }
            .totals { text-align: right; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; }
            .grand-total { font-size: 18px; font-weight: bold; color: #3d67ee; margin-top: 15px; }
            .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 11px; color: #999; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🐾 PAWRANG VETERINARY CLINIC</h1>
            <p>123 Pet Street, Manila, Philippines | Tel: (02) 1234-5678</p>
          </div>
          <div class="invoice-details">
            <div class="row">
              <div class="col"><label>INVOICE NUMBER</label><div class="value">${invoice.invoiceNumber}</div></div>
              <div class="col"><label>DATE</label><div class="value">${invoice.date} at ${invoice.time}</div></div>
              <div class="col"><label>TYPE</label><div class="value">${invoice.invoiceType === 'appointment' ? 'Appointment' : 'Walk-in'}</div></div>
            </div>
            <div class="row">
              <div class="col"><label>CUSTOMER NAME</label><div class="value">${invoice.customerName}</div></div>
              <div class="col"><label>PET NAME</label><div class="value">${invoice.petName}</div></div>
            </div>
          </div>
          <h3 style="margin-bottom: 15px; color: #3d67ee;">Items</h3>
          <table>
            <thead>
              <tr><th>Item</th><th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr>
            </thead>
            <tbody>
              ${invoice.items.map(item => `<tr><td><strong>${item.name}</strong><br/><span style="font-size:10px;color:#999;">${item.category}</span></td><td>${item.quantity}</td><td>₱${item.unitPrice.toLocaleString()}</td><td>₱${item.total.toLocaleString()}</td></tr>`).join('')}
              ${invoice.products.map(product => `<tr><td><strong>${product.name}</strong><br/><span style="font-size:10px;color:#999;">${product.sku}</span></td><td>${product.quantity}</td><td>₱${product.unitPrice.toLocaleString()}</td><td>₱${product.total.toLocaleString()}</td></tr>`).join('')}
            </tbody>
          </table>
          <div class="totals">
            <div>Subtotal: ₱${invoice.subtotal.toLocaleString()}</div>
            <div>Tax (12%): ₱${invoice.tax.toLocaleString()}</div>
            <div>Discount: - ₱${invoice.discount.toLocaleString()}</div>
            <div class="grand-total">Total: ₱${invoice.total.toLocaleString()}</div>
          </div>
          <div class="footer">
            <p>Payment Method: ${formatPaymentMethodLabel(invoice.paymentMethod)} | Status: ${formatPaymentStatusLabel(invoice.paymentStatus)}</p>
            <p>Thank you for choosing PawRang Veterinary Clinic! 🐾</p>
          </div>
        </body>
        </html>
      `);
    printWindow!.document.close();
    printWindow!.print();
  };
  
  const toggleInvoiceSelection = (id: string) => {
    const newSelected = new Set(selectedInvoices);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedInvoices(newSelected);
  };
  
  const toggleAllInvoices = () => {
    if (selectedInvoices.size === paginatedInvoices.length) {
      setSelectedInvoices(new Set());
    } else {
      setSelectedInvoices(new Set(paginatedInvoices.map(inv => inv.id)));
    }
  };
  
  const handleDeleteSelected = () => {
    if (selectedInvoices.size === 0) {
      showAlert('error', 'No Selection', 'Please select invoices to delete.');
      return;
    }
    
    showAlert('confirm', 'Delete Invoices', `Are you sure you want to delete ${selectedInvoices.size} selected invoice(s)?`, async () => {
      try {
        await apiService.deleteBillingInvoices(Array.from(selectedInvoices));
        setInvoices(prev => prev.filter(inv => !selectedInvoices.has(inv.id)));
        setSelectedInvoices(new Set());
        setSourceRecordsLoaded(false);
        setWalkinRecords([]);
        setAppointmentResults([]);
        showAlert('success', 'Success', 'Invoices deleted successfully!');
      } catch (error) {
        console.error('Delete billing invoices error:', error);
        showAlert('error', 'Delete Failed', getErrorMessage(error, 'Unable to delete invoices.'));
      }
    }, true);
  };
  
  const clearFilters = () => {
    setDateFilter('');
    setStatusFilter('');
    setTypeFilter('');
    setSearchQuery('');
    setPage(0);
  };
  
  useEffect(() => {
    loadCurrentUser();
    loadBillingData();
  }, []);

  useEffect(() => {
    const billingAction = (location.state as BillingNavigationState | null)?.billingAction;
    if (!billingAction) {
      processedBillingActionRef.current = '';
      return;
    }

    if (loading) {
      return;
    }

    const actionKey = [
      billingAction.invoiceType,
      billingAction.sourceRecordType,
      billingAction.sourceRecordId,
      billingAction.billingInvoiceId || ''
    ].join(':');

    if (processedBillingActionRef.current === actionKey) {
      return;
    }

    const matchedInvoice =
      (billingAction.billingInvoiceId
        ? invoices.find(invoice => invoice.id === String(billingAction.billingInvoiceId))
        : null) ||
      findExistingInvoiceBySource(billingAction.sourceRecordType, billingAction.sourceRecordId);

    if (matchedInvoice) {
      processedBillingActionRef.current = actionKey;
      setSelectedInvoice(matchedInvoice);
      setShowDrawer(true);
      setShowCreateModal(false);
      navigate(location.pathname, { replace: true, state: null });
      return;
    }

    if (!catalogLoaded || !sourceRecordsLoaded) {
      void Promise.all([loadBillingCatalog(), loadBillingSourceRecords()]);
      return;
    }

    processedBillingActionRef.current = actionKey;

    resetForm();
    setShowDrawer(false);
    setShowCreateModal(true);

    const normalizedSourceId = String(billingAction.sourceRecordId);
    if (billingAction.invoiceType === 'appointment') {
      const matchedAppointment = appointmentResults.find(
        appointment =>
          appointment.sourceRecordType === billingAction.sourceRecordType &&
          String(appointment.sourceRecordId || '') === normalizedSourceId
      );

      if (matchedAppointment) {
        selectAppointmentRecord(matchedAppointment, { silent: true, lockSourceContext: true });
      } else {
        setShowCreateModal(false);
        showAlert('error', 'Billing Source Not Found', 'The appointment could not be loaded for billing.');
      }
    } else {
      const matchedWalkin = walkinRecords.find(
        record =>
          record.sourceRecordType === billingAction.sourceRecordType &&
          String(record.sourceRecordId || '') === normalizedSourceId
      );

      if (matchedWalkin) {
        selectWalkinRecord(matchedWalkin, { silent: true, lockSourceContext: true });
      } else {
        setShowCreateModal(false);
        showAlert('error', 'Billing Source Not Found', 'The visit record could not be loaded for billing.');
      }
    }

    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, loading, catalogLoaded, sourceRecordsLoaded, invoices, appointmentResults, walkinRecords, navigate]);
  
  const getStatusBadgeClass = (status: string) => {
    switch(status) {
      case 'paid': return 'billingStatusPaid';
      case 'pending': return 'billingStatusPending';
      case 'partial': return 'billingStatusPartial';
      default: return '';
    }
  };
  
  const getDiscountTypeLabel = (type?: string, value?: number, isPercentage?: boolean): string => {
    switch(type) {
      case 'senior': return 'Senior Citizen (20%)';
      case 'pwd': return 'PWD (20%)';
      case 'promo': return 'Promo (10%)';
      case 'custom':
        if (isPercentage) {
          return `Custom (${value}%)`;
        } else {
          return `Custom (₱${value?.toLocaleString()})`;
        }
      default: return 'None';
    }
  };
  
  return (
    <div className="billingContainer">
      <Navbar currentUser={currentUser} onLogout={handleLogoutPress} />
      
      <div className="billingBodyContainer">
        <div className="billingTopContainer">
          <div className="billingSubTopContainer">
            <div className="billingSubTopLeft">
              <CiReceipt size={20} className="billingBlueIcon" />
              <span className="billingBlueText">Billing & Invoices</span>
            </div>
          </div>
          <div className="billingSubTopContainer billingNotificationContainer">
            <Notifications 
              buttonClassName="billingIconButton"
              iconClassName="billingBlueIcon"
              onViewAll={() => console.log('View all notifications')}
              onNotificationClick={(notification) => {
                if (notification.link) navigate(notification.link);
              }}
            />
          </div>
        </div>
        
        <div className="billingTableContainer">
          <div className="billingTableToolbar">
            <div className="billingSearchFilterSection">
              <div className="billingToolbarItem">
                <button 
                  className="billingIconButton"
                  onMouseEnter={() => setSearchHovered(true)}
                  onMouseLeave={() => setSearchHovered(false)}
                  onClick={() => setSearchVisible(!searchVisible)}
                >
                  <IoSearchSharp size={20} className={searchVisible ? "billingIconActive" : "billingIconDefault"} />
                </button>
                {searchHovered && <div className="billingTooltip">Search</div>}
              </div>
              
              {searchVisible && (
                <input
                  type="text"
                  placeholder="Search by Invoice #, Customer, or Pet..."
                  value={searchQuery}
                  onChange={(e) => {setSearchQuery(e.target.value); setPage(0);}}
                  className="billingSearchInput"
                />
              )}
              
              <div className="billingToolbarItem">
                <button 
                  className="billingIconButton"
                  onMouseEnter={() => setFilterHovered(true)}
                  onMouseLeave={() => setFilterHovered(false)}
                  onClick={() => setFilterVisible(!filterVisible)}
                >
                  <IoFilterSharp size={20} className={filterVisible ? "billingIconActive" : "billingIconDefault"} />
                </button>
                {filterHovered && <div className="billingTooltip">Filter</div>}
              </div>
              
              {filterVisible && (
                <div className="billingFilterSection">
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => {setDateFilter(e.target.value); setPage(0);}}
                    className="billingFilterInput"
                  />
                  <select 
                    value={statusFilter} 
                    onChange={(e) => {setStatusFilter(e.target.value); setPage(0);}}
                    className="billingFilterSelect"
                  >
                    <option value="">All Status</option>
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                    <option value="partial">Partial Paid</option>
                  </select>
                  <select 
                    value={typeFilter} 
                    onChange={(e) => {setTypeFilter(e.target.value); setPage(0);}}
                    className="billingFilterSelect"
                  >
                    <option value="">All Types</option>
                    <option value="appointment">Appointment</option>
                    <option value="walkin">Walk-in</option>
                  </select>
                  <button className="billingClearFilterBtn" onClick={clearFilters}>
                    <IoRefreshOutline size={14} /> Clear
                  </button>
                </div>
              )}
            </div>
            
            <div className="billingActionSection">
              {selectedInvoices.size > 0 && (
                <button className="billingDeleteBtn" onClick={handleDeleteSelected}>
                  <IoTrashOutline size={14} /> Delete ({selectedInvoices.size})
                </button>
              )}
              <button className="billingBlackBtn" onClick={openCreateInvoiceModal}>
                <IoAdd size={14} /> New Invoice
              </button>
            </div>
          </div>
          
          {loading ? (
            <div className="billingLoadingContainer">
              <div className="billingSpinner"></div>
            </div>
          ) : (
            <div className="billingTableWrapper">
              <table className="billingDataTable">
                <thead>
                  <tr>
                    <th style={{ width: '32px' }}>
                      <input
                        type="checkbox"
                        checked={selectedInvoices.size === paginatedInvoices.length && paginatedInvoices.length > 0}
                        onChange={toggleAllInvoices}
                        className="billingCheckbox"
                      />
                    </th>
                    <th>Invoice #</th>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Customer</th>
                    <th>Pet</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th style={{ width: '80px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedInvoices.length > 0 ? (
                    paginatedInvoices.map(invoice => (
                      <tr key={invoice.id}>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={selectedInvoices.has(invoice.id)}
                            onChange={() => toggleInvoiceSelection(invoice.id)}
                            className="billingCheckbox"
                          />
                        </td>
                        <td className="billingInvoiceNumber">{invoice.invoiceNumber}</td>
                        <td>{invoice.date}</td>
                        <td>
                          <span className={`billingTypeBadge ${invoice.invoiceType === 'appointment' ? 'billingTypeAppointment' : 'billingTypeWalkin'}`}>
                            {invoice.invoiceType === 'appointment' ? 'Appointment' : 'Walk-in'}
                          </span>
                        </td>
                        <td>{invoice.customerName}</td>
                        <td>{invoice.petName}</td>
                        <td className="billingAmount">₱{invoice.total.toLocaleString()}</td>
                        <td>
                          <span className={`billingStatusBadge ${getStatusBadgeClass(invoice.paymentStatus)}`}>
                            {formatPaymentStatusLabel(invoice.paymentStatus)}
                          </span>
                        </td>
                        <td>
                          <div className="billingActionButtons">
                            <button className="billingActionBtn" onClick={() => handleViewInvoice(invoice)} title="View Invoice">
                              <IoEyeOutline size={14} />
                            </button>
                            <button className="billingActionBtn" onClick={() => handlePrintInvoice(invoice)} title="Print Invoice">
                              <IoPrintOutline size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="billingNoData">
                        No invoices found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              
              <div className="billingPagination">
                <button 
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="billingPaginationBtn"
                >
                  Previous
                </button>
                <span className="billingPaginationInfo">{page + 1} of {totalPages}</span>
                <button 
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  className="billingPaginationBtn"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Create Invoice Modal */}
      {showCreateModal && (
        <div className="billingModalOverlay" onClick={() => setShowCreateModal(false)}>
          <div className="billingCreateModal" onClick={e => e.stopPropagation()}>
            <div className="billingModalHeader">
              <h4><IoCreateOutline size={16} /> Create New Invoice</h4>
              <button className="billingModalClose" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <div className="billingCreateModalContent">
              {/* Invoice Type Selection */}
              <div className="billingFormSection">
                <h4>Invoice Type</h4>
                <div className="billingFormRow">
                  <div className="billingFormGroup billingFullWidth">
                    <div className={`billingToggleGroupFull ${formErrors.invoiceType ? 'billingToggleGroupError' : ''}`}>
                      <button 
                        type="button"
                        className={`billingToggleBtnFull ${invoiceType === 'walkin' ? 'billingToggleActiveFull' : ''}`}
                        onClick={() => handleInvoiceTypeChange('walkin')}
                      >
                        <IoTimeSharp size={14} /> Walk-in
                      </button>
                      <button 
                        type="button"
                        className={`billingToggleBtnFull ${invoiceType === 'appointment' ? 'billingToggleActiveFull' : ''}`}
                        onClick={() => handleInvoiceTypeChange('appointment')}
                      >
                        <IoCalendarOutline size={14} /> Appointment
                      </button>
                    </div>
                    {!selectedSourceSummary && !invoiceType && (
                      <div className="billingHelperText">
                        Choose whether this invoice comes from a completed walk-in visit or a completed appointment.
                      </div>
                    )}
                    {invoiceType && (
                      <div className={`billingHelperText ${formErrors.sourceRecord ? 'billingHelperTextError' : ''}`}>
                        {selectedSourceSummary
                          ? `Selected ${invoiceType === 'appointment' ? 'appointment' : 'walk-in'}: ${selectedSourceSummary}`
                          : `No ${invoiceType === 'appointment' ? 'appointment' : 'walk-in'} selected yet.`}
                      </div>
                    )}
                    {formErrors.invoiceType && <div className="billingErrorText">{formErrors.invoiceType}</div>}
                    {formErrors.sourceRecord && <div className="billingErrorText">{formErrors.sourceRecord}</div>}
                  </div>
                </div>
              </div>

              {/* Customer Information - No Pet Species, No Appointment Display */}
              <div className="billingFormSection">
                <h4>Customer Information</h4>
                <div className="billingFormRow">
                  <div className="billingFormGroup">
                    <label>Customer Name <span className="billingRequired">*</span></label>
                    <input 
                      type="text"
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        clearFormErrors('customerName');
                      }}
                      placeholder="Full name"
                      className={`billingFormInput ${formErrors.customerName ? 'billingFieldError' : ''}`}
                      readOnly={isSourceRecordLocked}
                    />
                    {formErrors.customerName && <div className="billingErrorText">{formErrors.customerName}</div>}
                  </div>
                  <div className="billingFormGroup">
                    <label>Pet Name <span className="billingRequired">*</span></label>
                    <input 
                      type="text"
                      value={petName}
                      onChange={(e) => {
                        setPetName(e.target.value);
                        clearFormErrors('petName');
                      }}
                      placeholder="Pet name"
                      className={`billingFormInput ${formErrors.petName ? 'billingFieldError' : ''}`}
                      readOnly={isSourceRecordLocked}
                    />
                    {formErrors.petName && <div className="billingErrorText">{formErrors.petName}</div>}
                  </div>
                </div>
                <div className="billingFormRow">
                  <div className="billingFormGroup">
                    <label>Email</label>
                    <input 
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="customer@example.com"
                      className="billingFormInput"
                      readOnly={isSourceRecordLocked}
                    />
                  </div>
                  <div className="billingFormGroup">
                    <label>Phone</label>
                    <input 
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Contact number"
                      className="billingFormInput"
                      readOnly={isSourceRecordLocked}
                    />
                  </div>
                </div>
              </div>
              
              {/* Services Section */}
              <div className="billingFormSection">
                <div className="billingSectionHeader">
                  <h4>Services</h4>
                  <button className="billingAddItemBtnSmall" onClick={openServiceModal}>
                    <IoAdd size={12} /> Add Service
                  </button>
                </div>
                <div className="billingItemsTable">
                  <table className="billingItemsDataTable">
                    <thead>
                      <tr>
                        <th>Service</th>
                        <th>Qty</th>
                        <th>Unit Price</th>
                        <th>Total</th>
                        <th style={{ width: '40px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedServices.map(service => (
                        <tr key={service.id}>
                          <td>
                            <strong>{service.name}</strong>
                            <div className="billingServiceCategory">{service.category}</div>
                          </td>
                          <td>
                            <input
                              type="number"
                              value={service.quantity}
                              onChange={(e) => updateServiceQuantity(service.id, parseInt(e.target.value) || 1)}
                              className="billingQtyInput"
                              min="1"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              value={service.unitPrice}
                              onChange={(e) => updateServicePrice(service.id, parseFloat(e.target.value) || 0)}
                              className="billingPriceInput"
                              min="0"
                              step="0.01"
                            />
                          </td>
                          <td className="billingItemTotal">₱{service.total.toLocaleString()}</td>
                          <td>
                            <button className="billingRemoveItemBtn" onClick={() => removeService(service.id)}>
                              <IoTrashBinOutline size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {selectedServices.length === 0 && (
                        <tr>
                          <td colSpan={5} className="billingNoItems">
                            No services added. Click "Add Service" to add veterinary services.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Products Section */}
              <div className="billingFormSection">
                <div className="billingSectionHeader">
                  <h4>Products</h4>
                  <button className="billingAddItemBtnSmall" onClick={openProductModal}>
                    <IoAdd size={12} /> Add Product
                  </button>
                </div>
                {selectedPrescriptionProductSuggestions.length > 0 && (
                  <div className="billingInventorySuggestionBox">
                    <div className="billingInventorySuggestionTitle">Prescribed Medicines Available in Inventory</div>
                    <div className="billingInventorySuggestionHint">
                      Check any prescribed medicine you want to dispense and bill as a product. Inventory is deducted once the invoice becomes fully paid.
                    </div>
                    <div className="billingInventorySuggestionList">
                      {selectedPrescriptionProductSuggestions.map((suggestion) => {
                        const suggestionId = String(suggestion.inventoryItemId || suggestion.id);
                        const prescriptionDetails = [
                          suggestion.dosage,
                          suggestion.route,
                          suggestion.frequency,
                          suggestion.duration,
                        ]
                          .filter(Boolean)
                          .join(' • ');

                        return (
                          <label
                            key={suggestionId}
                            className={`billingInventorySuggestionItem ${isPrescriptionSuggestionSelected(suggestion) ? 'selected' : ''}`}
                          >
                            <input
                              type="checkbox"
                              className="billingSuggestionCheckbox"
                              checked={isPrescriptionSuggestionSelected(suggestion)}
                              onChange={(e) => togglePrescriptionSuggestedProduct(suggestion, e.target.checked)}
                            />
                            <div className="billingInventorySuggestionContent">
                              <div className="billingInventorySuggestionNameRow">
                                <strong>{suggestion.name}</strong>
                                <span className="billingServiceCategory">In Inventory</span>
                              </div>
                              <div className="billingHelperText">
                                Prescription: {suggestion.prescriptionMedicationName}
                                {prescriptionDetails ? ` • ${prescriptionDetails}` : ''}
                              </div>
                              <div className="billingInventorySuggestionMeta">
                                <span>Stock: {suggestion.stock}</span>
                                <span>Price: ₱{suggestion.price.toLocaleString()}</span>
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="billingItemsTable">
                  <table className="billingItemsDataTable">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Qty</th>
                        <th>Unit Price</th>
                        <th>Total</th>
                        <th style={{ width: '40px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedProducts.map(product => (
                        <tr key={product.id}>
                          <td>
                            <strong>{product.name}</strong>
                            <div className="billingServiceCategory">{product.sku}</div>
                          </td>
                          <td>
                            <input
                              type="number"
                              value={product.quantity}
                              onChange={(e) => updateProductQuantity(product.id, parseInt(e.target.value) || 1)}
                              className="billingQtyInput"
                              min="1"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              value={product.unitPrice}
                              onChange={(e) => updateProductPrice(product.id, parseFloat(e.target.value) || 0)}
                              className="billingPriceInput"
                              min="0"
                              step="0.01"
                            />
                          </td>
                          <td className="billingItemTotal">₱{product.total.toLocaleString()}</td>
                          <td>
                            <button className="billingRemoveItemBtn" onClick={() => removeProduct(product.id)}>
                              <IoTrashBinOutline size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {selectedProducts.length === 0 && (
                        <tr>
                          <td colSpan={5} className="billingNoItems">
                            No products added
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {formErrors.lineItems && <div className="billingErrorText">{formErrors.lineItems}</div>}
              </div>
              
              {/* Payment Details with Enhanced Custom Discount */}
              <div className="billingFormSection">
                <h4>Payment Details</h4>
                  <div className="billingFormRow">
                    <div className="billingFormGroup">
                      <label>Discount Type</label>
                      <select 
                        value={discountType}
                        onChange={(e) => handleDiscountTypeChange(e.target.value as DiscountType)}
                        className="billingFormSelect"
                      >
                        <option value="none">None</option>
                        <option value="senior">Senior Citizen (20%)</option>
                        <option value="pwd">PWD (20%)</option>
                        <option value="promo">Promo (10%)</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>
                      {showCustomDiscountInput && (
                        <div className="billingFormGroup">
                          <label>Custom Discount</label>
                          <div className="billingInputGroup">
                            <input 
                              type="number"
                              value={customDiscountValue}
                              onChange={(e) => setCustomDiscountValue(parseFloat(e.target.value) || 0)}
                              placeholder={customDiscountType === 'percentage' ? 'Enter percentage %' : 'Enter amount ₱'}
                              className="billingFormInput billingInputGroupField"
                              min="0"
                              step={customDiscountType === 'percentage' ? '1' : '0.01'}
                            />
                            <button 
                              type="button"
                              className="billingInputGroupButton"
                              onClick={() => setCustomDiscountType(customDiscountType === 'percentage' ? 'fixed' : 'percentage')}
                            >
                              {customDiscountType === 'percentage' ? '%' : '₱'}
                            </button>
                          </div>
                          <div className="billingDiscountHint">
                            {customDiscountType === 'percentage' 
                              ? `Will discount ${customDiscountValue}% of subtotal (₱${(subtotal * customDiscountValue / 100).toLocaleString()})` 
                              : `Will discount ₱${customDiscountValue.toLocaleString()} from subtotal`}
                          </div>
                        </div>
                      )}
                    <div className="billingFormGroup">
                      <label>Payment Method</label>
                      <select 
                        value={paymentMethod}
                        onChange={(e) => {
                          const nextMethod = e.target.value as PaymentMethod;
                          setPaymentMethod(nextMethod);
                          if (nextMethod !== 'installment') {
                            setInitialPaymentAmount(0);
                            setInitialPaymentMethod('cash');
                          }
                        }}
                        className="billingFormSelect"
                      >
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                        <option value="gcash">GCash</option>
                        <option value="bank">Bank Transfer</option>
                        <option value="installment">Installment</option>
                      </select>
                      {paymentMethod === 'installment' && (
                        <div className="billingDiscountHint">
                          Installment invoices start as pending until the full balance is settled.
                        </div>
                      )}
                    </div>
                  </div>
                {paymentMethod === 'installment' && (
                  <div className="billingFormRow">
                    <div className="billingFormGroup">
                      <label>Initial Payment</label>
                      <input
                        type="number"
                        value={initialPaymentAmount}
                        onChange={(e) => setInitialPaymentAmount(parseFloat(e.target.value) || 0)}
                        className="billingFormInput"
                        min="0"
                        max={Math.max(total, 0)}
                        step="0.01"
                        placeholder="Enter initial payment amount"
                      />
                      <div className="billingDiscountHint">
                        Leave this as `0` if no payment is collected yet.
                      </div>
                    </div>
                    <div className="billingFormGroup">
                      <label>Initial Payment Method</label>
                      <select
                        value={initialPaymentMethod}
                        onChange={(e) => setInitialPaymentMethod(e.target.value as PaymentEntryMethod)}
                        className="billingFormSelect"
                      >
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                        <option value="gcash">GCash</option>
                        <option value="bank">Bank Transfer</option>
                      </select>
                    </div>
                  </div>
                )}
                <div className="billingFormRow">
                  <div className="billingFormGroup">
                    <label>Notes</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      placeholder="Additional notes..."
                      className="billingTextarea"
                    />
                  </div>
                </div>
              </div>
              
              {/* Totals */}
              <div className="billingTotals">
                <div className="billingTotalsRow">
                  <span>Subtotal:</span>
                  <span>₱{subtotal.toLocaleString()}</span>
                </div>
                <div className="billingTotalsRow">
                  <span>Tax (12%):</span>
                  <span>₱{tax.toLocaleString()}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="billingTotalsRow billingDiscount">
                    <span>Discount ({getDiscountTypeLabel(discountType, customDiscountValue, customDiscountType === 'percentage')}):</span>
                    <span>- ₱{discountAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="billingTotalsRow billingTotalGrand">
                  <span>Total:</span>
                  <span>₱{total.toLocaleString()}</span>
                </div>
                {(paymentMethod === 'installment' || amountPaidPreview > 0) && (
                  <div className="billingTotalsRow">
                    <span>Amount Paid:</span>
                    <span>₱{amountPaidPreview.toLocaleString()}</span>
                  </div>
                )}
                {paymentMethod === 'installment' && (
                  <div className="billingTotalsRow">
                    <span>Remaining Balance:</span>
                    <span>₱{remainingBalancePreview.toLocaleString()}</span>
                  </div>
                )}
              </div>
              
              <div className="billingFormActions">
                <button className="billingCancelBtn" onClick={() => setShowCreateModal(false)} disabled={savingInvoice}>
                  Cancel
                </button>
                <button className="billingSubmitBtn" onClick={handleCreateInvoice} disabled={savingInvoice}>
                  {savingInvoice ? 'Creating Invoice...' : 'Create Invoice'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Invoice Details Drawer */}
      {showDrawer && selectedInvoice && (
        <>
          <div className="billingDrawerOverlay" onClick={handleCloseDrawer}></div>
          <div className="billingDrawer">
            <div className="billingDrawerHeader">
              <div className="billingDrawerHeaderLeft">
                <FaFileInvoice size={20} className="billingHeaderIcon" />
                <h3>Invoice Details</h3>
              </div>
              <button className="billingDrawerClose" onClick={handleCloseDrawer}>
                <IoCloseOutline size={24} />
              </button>
            </div>
            
            <div className="billingDrawerContent">
              <div className="billingDrawerInfoGrid">
                <div className="billingDrawerInfoItem">
                  <label>Invoice Number</label>
                  <span className="billingInvoiceNumber">{selectedInvoice.invoiceNumber}</span>
                </div>
                <div className="billingDrawerInfoItem">
                  <label>Date</label>
                  <span>{selectedInvoice.date}</span>
                </div>
                <div className="billingDrawerInfoItem">
                  <label>Type</label>
                  <span>{selectedInvoice.invoiceType === 'appointment' ? 'Appointment' : 'Walk-in'}</span>
                </div>
                <div className="billingDrawerInfoItem">
                  <label>Customer</label>
                  <span>{selectedInvoice.customerName}</span>
                </div>
                <div className="billingDrawerInfoItem">
                  <label>Pet</label>
                  <span>{selectedInvoice.petName}</span>
                </div>
                <div className="billingDrawerInfoItem">
                  <label>Status</label>
                  <span className={`billingStatusBadge ${getStatusBadgeClass(selectedInvoice.paymentStatus)}`}>
                    {formatPaymentStatusLabel(selectedInvoice.paymentStatus)}
                  </span>
                </div>
                <div className="billingDrawerInfoItem">
                  <label>Payment Method</label>
                  <span>{formatPaymentMethodLabel(selectedInvoice.paymentMethod)}</span>
                </div>
                <div className="billingDrawerInfoItem">
                  <label>Amount Paid</label>
                  <span>₱{(selectedInvoice.amountPaid || 0).toLocaleString()}</span>
                </div>
                <div className="billingDrawerInfoItem">
                  <label>Remaining Balance</label>
                  <span>₱{(selectedInvoice.remainingBalance || 0).toLocaleString()}</span>
                </div>
              </div>
              
              <div className="billingDrawerSection">
                <h4>Items</h4>
                <div className="billingDrawerTable">
                  <table className="billingDrawerDataTable">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.items.map(item => (
                        <tr key={item.id}>
                          <td>
                            <strong>{item.name}</strong><br/>
                            <div className="billingDrawerCategory">{item.category}</div>
                          </td>
                          <td>{item.quantity}</td>
                          <td>₱{item.unitPrice.toLocaleString()}</td>
                          <td>₱{item.total.toLocaleString()}</td>
                        </tr>
                      ))}
                      {selectedInvoice.products.map(product => (
                        <tr key={product.id}>
                          <td>
                            <strong>{product.name}</strong><br/>
                            {product.sku && (
                              <div className="billingDrawerCategory">{product.sku}</div>
                            )}
                          </td>
                          <td>{product.quantity}</td>
                          <td>₱{product.unitPrice.toLocaleString()}</td>
                          <td>₱{product.total.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="billingDrawerTotals">
                <div className="billingDrawerTotalsRow">
                  <span>Subtotal:</span>
                  <span>₱{selectedInvoice.subtotal.toLocaleString()}</span>
                </div>
                <div className="billingDrawerTotalsRow">
                  <span>Tax (12%):</span>
                  <span>₱{selectedInvoice.tax.toLocaleString()}</span>
                </div>
                {selectedInvoice.discount > 0 && (
                  <div className="billingDrawerTotalsRow">
                    <span>Discount ({getDiscountTypeLabel(selectedInvoice.discountType, selectedInvoice.discountValue, selectedInvoice.discountIsPercentage)}):</span>
                    <span>- ₱{selectedInvoice.discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="billingDrawerTotalsRow billingDrawerTotalGrand">
                  <span>Total:</span>
                  <span>₱{selectedInvoice.total.toLocaleString()}</span>
                </div>
                <div className="billingDrawerTotalsRow">
                  <span>Amount Paid:</span>
                  <span>₱{(selectedInvoice.amountPaid || 0).toLocaleString()}</span>
                </div>
                <div className="billingDrawerTotalsRow">
                  <span>Remaining Balance:</span>
                  <span>₱{(selectedInvoice.remainingBalance || 0).toLocaleString()}</span>
                </div>
              </div>

              <div className="billingDrawerSection">
                <div className="billingSectionHeader">
                  <h4>Payment History</h4>
                  {selectedInvoice.paymentMethod === 'installment' && (selectedInvoice.remainingBalance || 0) > 0 && (
                    <button className="billingAddItemBtnSmall" onClick={() => openRecordPaymentModal(selectedInvoice)}>
                      <IoAdd size={12} /> Record Payment
                    </button>
                  )}
                </div>
                {selectedInvoice.paymentHistory && selectedInvoice.paymentHistory.length > 0 ? (
                  <div className="billingDrawerTable">
                    <table className="billingDrawerDataTable">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Time</th>
                          <th>Handled By</th>
                          <th>Method</th>
                          <th>Amount</th>
                          <th>Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedInvoice.paymentHistory.map(payment => (
                          <tr key={payment.id}>
                            <td>{payment.date}</td>
                            <td>{payment.time}</td>
                            <td>{payment.handledBy || 'Not recorded'}</td>
                            <td>{formatPaymentMethodLabel(payment.paymentMethod)}</td>
                            <td>₱{payment.amount.toLocaleString()}</td>
                            <td>{payment.notes || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="billingPaymentEmptyState">
                    No payments recorded yet.
                  </div>
                )}
              </div>
              
              {selectedInvoice.notes && (
                <div className="billingDrawerNotes">
                  <label>Notes:</label>
                  <p>{selectedInvoice.notes}</p>
                </div>
              )}
            </div>
            
            <div className="billingDrawerActions">
              {selectedInvoice.paymentMethod === 'installment' && (selectedInvoice.remainingBalance || 0) > 0 && (
                <button className="billingDrawerRecordBtn" onClick={() => openRecordPaymentModal(selectedInvoice)}>
                  <IoCashOutline size={16} /> Record Payment
                </button>
              )}
              <button className="billingDrawerPrintBtn" onClick={() => handlePrintInvoice(selectedInvoice)}>
                <IoPrintOutline size={16} /> Print Invoice
              </button>
              <button className="billingDrawerCloseBtn" onClick={handleCloseDrawer}>
                Close
              </button>
            </div>
          </div>
        </>
      )}

      {showPaymentModal && selectedInvoice && (
        <div className="billingModalOverlay" onClick={() => setShowPaymentModal(false)}>
          <div className="billingAlertModal billingPaymentModal" onClick={e => e.stopPropagation()}>
            <div className="billingModalHeader">
              <h4><IoCashOutline size={16} /> Record Payment</h4>
              <button className="billingModalClose" onClick={() => setShowPaymentModal(false)}>×</button>
            </div>
            <div className="billingPaymentModalContent">
              <div className="billingFormGroup">
                <label>Remaining Balance</label>
                <div className="billingReadonlyField">
                  ₱{(selectedInvoice.remainingBalance || 0).toLocaleString()}
                </div>
              </div>
              <div className="billingFormGroup">
                <label>Payment Amount</label>
                <input
                  type="number"
                  value={paymentAmountInput}
                  onChange={(e) => handlePaymentAmountChange(e.target.value)}
                  onBlur={() => setPaymentAmountInput(
                    clampPaymentAmountToRemaining(paymentAmountInput, paymentRemainingBalance)
                  )}
                  className={`billingFormInput ${paymentAmountError ? 'billingFieldError' : ''}`}
                  min="0.01"
                  max={paymentRemainingBalance}
                  step="0.01"
                  inputMode="decimal"
                />
                {paymentAmountError ? (
                  <div className="billingErrorText">{paymentAmountError}</div>
                ) : (
                  <div className="billingHelperText">
                    Maximum allowed: ₱{paymentRemainingBalance.toLocaleString()}
                  </div>
                )}
              </div>
              <div className="billingFormGroup">
                <label>Payment Method</label>
                <select
                  value={paymentEntryMethod}
                  onChange={(e) => setPaymentEntryMethod(e.target.value as PaymentEntryMethod)}
                  className="billingFormSelect"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="gcash">GCash</option>
                  <option value="bank">Bank Transfer</option>
                </select>
              </div>
              <div className="billingFormGroup">
                <label>Notes</label>
                <textarea
                  value={paymentEntryNotes}
                  onChange={(e) => setPaymentEntryNotes(e.target.value)}
                  rows={2}
                  placeholder="Optional payment note"
                  className="billingTextarea"
                />
              </div>
            </div>
            <div className="billingFormActions billingPaymentModalActions">
              <button className="billingCancelBtn" onClick={() => setShowPaymentModal(false)} disabled={savingPayment}>
                Cancel
              </button>
              <button className="billingSubmitBtn" onClick={handleRecordPayment} disabled={savingPayment || isPaymentAmountInvalid}>
                {savingPayment ? 'Saving Payment...' : 'Save Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Walk-in Modal - Matches Appointment Modal Style */}
      {showWalkinModal && (
        <div className="billingModalOverlay" onClick={() => setShowWalkinModal(false)}>
          <div className="billingSearchModal" onClick={e => e.stopPropagation()}>
            <div className="billingModalHeader">
              <h4><IoTimeSharp size={16} /> Recent Walk-in Records</h4>
              <button className="billingModalClose" onClick={() => setShowWalkinModal(false)}>×</button>
            </div>
            <div className="billingSearchModalContent">
              <div className="billingSearchInputWrapper">
                <input
                  type="text"
                  placeholder="Search by pet name, owner name..."
                  value={walkinSearchQuery}
                  onChange={(e) => setWalkinSearchQuery(e.target.value)}
                  className="billingSearchInput"
                />
                <IoSearchSharp size={18} className="billingSearchIcon" />
              </div>
              
              <div className="billingSearchResults">
                {sourceRecordsLoading ? (
                  <div className="billingSearchNoResults">
                    <div className="billingSpinner"></div>
                    <p>Loading completed walk-in records...</p>
                  </div>
                ) : filteredWalkinRecords.length > 0 ? (
                  filteredWalkinRecords.map(record => (
                    <div key={record.id} className="billingSearchResultItem" onClick={() => selectWalkinRecord(record)}>
                      <div className="billingSearchResultIcon">
                        <IoTimeSharp size={20} />
                      </div>
                      <div className="billingSearchResultInfo">
                        <div className="billingSearchResultName">
                          {record.petName} - {record.ownerName}
                          <span className={`billingWalkinStatusBadge ${record.status}`}>
                            {record.status}
                          </span>
                        </div>
                        <div className="billingSearchResultDetails">
                          {record.date} at {record.time} | {record.veterinarian}
                        </div>
                        <div className="billingSearchResultDetails">
                          {(record.services && record.services.length > 0)
                            ? record.services.join(', ')
                            : (record.reason || 'No service specified')}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="billingSearchNoResults">
                    <p>No walk-in records found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Appointment Modal */}
      {showAppointmentModal && (
        <div className="billingModalOverlay" onClick={() => setShowAppointmentModal(false)}>
          <div className="billingSearchModal" onClick={e => e.stopPropagation()}>
            <div className="billingModalHeader">
              <h4><IoCalendarOutline size={16} /> Select Appointment</h4>
              <button className="billingModalClose" onClick={() => setShowAppointmentModal(false)}>×</button>
            </div>
            <div className="billingSearchModalContent">
              <div className="billingSearchInputWrapper">
                <input
                  type="text"
                  placeholder="Search by pet name, owner name..."
                  value={appointmentSearchQuery}
                  onChange={(e) => setAppointmentSearchQuery(e.target.value)}
                  className="billingSearchInput"
                />
                <IoSearchSharp size={18} className="billingSearchIcon" />
              </div>
              
              <div className="billingSearchResults">
                {sourceRecordsLoading ? (
                  <div className="billingSearchNoResults">
                    <div className="billingSpinner"></div>
                    <p>Loading completed appointments...</p>
                  </div>
                ) : filteredAppointments.length > 0 ? (
                  filteredAppointments.map(app => (
                    <div key={app.id} className="billingSearchResultItem" onClick={() => selectAppointmentRecord(app)}>
                      <div className="billingSearchResultIcon">
                        <IoCalendarOutline size={20} />
                      </div>
                      <div className="billingSearchResultInfo">
                        <div className="billingSearchResultName">
                          {app.petName} - {app.ownerName}
                        </div>
                        <div className="billingSearchResultDetails">
                          {app.date} at {app.time} | {app.veterinarian}
                        </div>
                        <div className="billingSearchResultDetails">
                          Services: {app.services.join(', ')}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="billingSearchNoResults">
                    <p>No appointments found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Service Selection Modal with Sidebar */}
      {showServiceModal && (
        <div className="billingModalOverlay" onClick={() => setShowServiceModal(false)}>
          <div className="billingDualPanelModal" onClick={e => e.stopPropagation()}>
            <div className="billingModalHeader">
              <h4><IoMedkitOutline size={16} /> Add Services</h4>
              <button className="billingModalClose" onClick={() => setShowServiceModal(false)}>×</button>
            </div>
            
            <div className="billingDualPanelContent">
              {/* Left Panel - Available Services */}
              <div className="billingDualPanelLeft">
                <div className="billingSearchInputWrapper">
                  <input
                    type="text"
                    placeholder="Search services by name or category..."
                    value={serviceSearchQuery}
                    onChange={(e) => setServiceSearchQuery(e.target.value)}
                    className="billingSearchInput"
                  />
                  <IoSearchSharp size={18} className="billingSearchIcon" />
                </div>
                
                <div className="billingServiceFilters">
                  <button 
                    className={`billingServiceFilterBtn ${serviceCategoryFilter === 'all' ? 'active' : ''}`} 
                    onClick={() => setServiceCategoryFilter('all')}
                  >
                    All Services
                  </button>
                  {serviceCategories.map(cat => (
                    <button 
                      key={cat}
                      className={`billingServiceFilterBtn ${serviceCategoryFilter === cat ? 'active' : ''}`} 
                      onClick={() => setServiceCategoryFilter(cat)}
                    >
                      {getCategoryIcon(cat)}
                      {cat}
                    </button>
                  ))}
                </div>
                
                <div className="billingServiceGrid">
                  {filteredServices.length > 0 ? (
                    filteredServices.map(service => {
                      const isSelected = tempSelectedServices.has(service.id);
                      return (
                        <div key={service.id} className={`billingServiceCard ${isSelected ? 'selected' : ''}`}>
                          <div className="billingServiceCardInfo">
                            <div className="billingServiceCardHeader">
                              {getCategoryIcon(service.category)}
                              <span className="billingServiceCardCategory">{service.category}</span>
                            </div>
                            <div className="billingServiceCardName">{service.name}</div>
                            <div className="billingServiceCardDesc">{service.description}</div>
                            <div className="billingServiceCardPrice">₱{service.price.toLocaleString()}</div>
                          </div>
                          <button 
                            className="billingServiceCardAddBtn"
                            onClick={() => addTempService(service)}
                          >
                            <IoAdd size={16} /> Add
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="billingSearchNoResults">
                      <p>No services found</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Right Panel - Selected Services Summary */}
              <div className="billingDualPanelRight">
                <div className="billingSummaryHeader">
                  <IoListOutline size={18} />
                  <h4>Selected Services</h4>
                  <span className="billingSummaryCount">{tempSelectedServices.size}</span>
                </div>
                
                <div className="billingSummaryItems">
                  {tempSelectedServices.size > 0 ? (
                    Array.from(tempSelectedServices.entries()).map(([id, { service, quantity }]) => (
                      <div key={id} className="billingSummaryItem">
                        <div className="billingSummaryItemInfo">
                          <span className="billingSummaryItemName">{service.name}</span>
                          <div className="billingSummaryItemQtySelector">
                            <button 
                              className="billingQtyBtnSmall"
                              onClick={() => updateTempServiceQuantity(id, quantity - 1)}
                            >
                              <IoRemoveOutline size={10} />
                            </button>
                            <span className="billingQtyValueSmall">{quantity}</span>
                            <button 
                              className="billingQtyBtnSmall"
                              onClick={() => updateTempServiceQuantity(id, quantity + 1)}
                            >
                              <IoAdd size={10} />
                            </button>
                          </div>
                        </div>
                        <div className="billingSummaryItemRight">
                          <span className="billingSummaryItemPrice">₱{(service.price * quantity).toLocaleString()}</span>
                          <button className="billingRemoveSelectedBtn" onClick={() => removeTempService(id)}>
                            <IoTrashBinOutline size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="billingSummaryEmpty">
                      <p>No services selected</p>
                      <p className="billingSummaryEmptyHint">Click "Add" on services to add them here</p>
                    </div>
                  )}
                </div>
                
                <div className="billingModalFooter">
                  <button className="billingCancelBtn" onClick={() => setShowServiceModal(false)}>
                    Cancel
                  </button>
                  <button className="billingSubmitBtn" onClick={confirmServices}>
                    Add {tempSelectedServices.size} Service(s) to Invoice
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Product Selection Modal with Sidebar and Category Icons */}
      {showProductModal && (
        <div className="billingModalOverlay" onClick={() => setShowProductModal(false)}>
          <div className="billingDualPanelModal" onClick={e => e.stopPropagation()}>
            <div className="billingModalHeader">
              <h4><IoCartOutline size={16} /> Add Products</h4>
              <button className="billingModalClose" onClick={() => setShowProductModal(false)}>×</button>
            </div>
            
            <div className="billingDualPanelContent">
              {/* Left Panel - Available Products */}
              <div className="billingDualPanelLeft">
                <div className="billingSearchInputWrapper">
                  <input
                    type="text"
                    placeholder="Search products by name or SKU..."
                    value={productSearchQuery}
                    onChange={(e) => setProductSearchQuery(e.target.value)}
                    className="billingSearchInput"
                  />
                  <IoSearchSharp size={18} className="billingSearchIcon" />
                </div>
                
                <div className="billingServiceFilters">
                  <button 
                    className={`billingServiceFilterBtn ${productCategoryFilter === 'all' ? 'active' : ''}`} 
                    onClick={() => setProductCategoryFilter('all')}
                  >
                    All Products
                  </button>
                  <button 
                    className={`billingServiceFilterBtn ${productCategoryFilter === 'food' ? 'active' : ''}`} 
                    onClick={() => setProductCategoryFilter('food')}
                  >
                    {getProductCategoryIcon('food')} Food
                  </button>
                  <button 
                    className={`billingServiceFilterBtn ${productCategoryFilter === 'medicine' ? 'active' : ''}`} 
                    onClick={() => setProductCategoryFilter('medicine')}
                  >
                    {getProductCategoryIcon('medicine')} Medicine
                  </button>
                  <button 
                    className={`billingServiceFilterBtn ${productCategoryFilter === 'accessory' ? 'active' : ''}`} 
                    onClick={() => setProductCategoryFilter('accessory')}
                  >
                    {getProductCategoryIcon('accessory')} Accessory
                  </button>
                  <button 
                    className={`billingServiceFilterBtn ${productCategoryFilter === 'supplement' ? 'active' : ''}`} 
                    onClick={() => setProductCategoryFilter('supplement')}
                  >
                    {getProductCategoryIcon('supplement')} Supplement
                  </button>
                </div>
                
                <div className="billingServiceGrid">
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map(product => {
                      const isSelected = tempSelectedProducts.has(product.id);
                      const isOutOfStock = product.stock === 0;
                      return (
                        <div key={product.id} className={`billingServiceCard ${isSelected ? 'selected' : ''} ${isOutOfStock ? 'out-of-stock' : ''}`}>
                          <div className="billingServiceCardInfo">
                            <div className="billingServiceCardHeader">
                              {getProductCategoryIcon(product.category)}
                              <span className="billingServiceCardCategory">{product.category}</span>
                            </div>
                            <div className="billingServiceCardName">{product.name}</div>
                            <div className="billingServiceCardDesc">{product.description}</div>
                            <div className="billingServiceCardPrice">₱{product.price.toLocaleString()}</div>
                            <div className="billingProductCardStock">Stock: {product.stock} left</div>
                          </div>
                          <button 
                            className="billingServiceCardAddBtn"
                            onClick={() => addTempProduct(product)}
                            disabled={isOutOfStock}
                          >
                            <IoAdd size={16} /> Add
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="billingSearchNoResults">
                      <p>No products found</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Right Panel - Selected Products Summary */}
              <div className="billingDualPanelRight">
                <div className="billingSummaryHeader">
                  <IoListOutline size={18} />
                  <h4>Selected Products</h4>
                  <span className="billingSummaryCount">{tempSelectedProducts.size}</span>
                </div>
                
                <div className="billingSummaryItems">
                  {tempSelectedProducts.size > 0 ? (
                    Array.from(tempSelectedProducts.entries()).map(([id, { product, quantity }]) => (
                      <div key={id} className="billingSummaryItem">
                        <div className="billingSummaryItemInfo">
                          <div className="billingSummaryItemNameWithIcon">
                            {getProductCategoryIcon(product.category)}
                            <span className="billingSummaryItemName">{product.name}</span>
                          </div>
                          <div className="billingSummaryItemQtySelector">
                            <button 
                              className="billingQtyBtnSmall"
                              onClick={() => updateTempProductQuantity(id, quantity - 1)}
                              disabled={quantity <= 1}
                            >
                              <IoRemoveOutline size={10} />
                            </button>
                            <span className="billingQtyValueSmall">{quantity}</span>
                            <button 
                              className="billingQtyBtnSmall"
                              onClick={() => updateTempProductQuantity(id, quantity + 1)}
                              disabled={quantity >= product.stock}
                            >
                              <IoAdd size={10} />
                            </button>
                          </div>
                        </div>
                        <div className="billingSummaryItemRight">
                          <span className="billingSummaryItemPrice">₱{(product.price * quantity).toLocaleString()}</span>
                          <button className="billingRemoveSelectedBtn" onClick={() => removeTempProduct(id)}>
                            <IoTrashBinOutline size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="billingSummaryEmpty">
                      <p>No products selected</p>
                      <p className="billingSummaryEmptyHint">Click "Add" on products to add them here</p>
                    </div>
                  )}
                </div>
                
                <div className="billingModalFooter">
                  <button className="billingCancelBtn" onClick={() => setShowProductModal(false)}>
                    Cancel
                  </button>
                  <button className="billingSubmitBtn" onClick={confirmProducts}>
                    Add {tempSelectedProducts.size} Product(s) to Invoice
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Alert Modal */}
      {modalVisible && (
        <div className="billingModalOverlay">
          <div className="billingAlertModal">
            <div className="billingAlertIcon">
              {modalConfig.type === 'success' && <IoCheckmarkCircleOutline size={45} color="#2e9e0c" />}
              {modalConfig.type === 'error' && <IoCloseCircleOutline size={45} color="#d93025" />}
              {modalConfig.type !== 'success' && modalConfig.type !== 'error' && <IoAlertCircleOutline size={45} color="#3d67ee" />}
            </div>
            <h4 className="billingAlertTitle">{modalConfig.title}</h4>
            <div className="billingAlertMessage">
              {typeof modalConfig.message === 'string' ? modalConfig.message : modalConfig.message}
            </div>
            <div className="billingAlertActions">
              {modalConfig.showCancel && (
                <button onClick={() => setModalVisible(false)} className="billingAlertBtn billingCancelAlertBtn">
                  Cancel
                </button>
              )}
              <button 
                onClick={() => {
                  setModalVisible(false);
                  if (modalConfig.onConfirm) modalConfig.onConfirm();
                }}
                className={`billingAlertBtn billingConfirmAlertBtn ${modalConfig.type === 'error' ? 'billingErrorBtn' : ''}`}
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

export default GlobalBilling;
                        
