import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../reusable_components/NavBar';
import Notifications from '../reusable_components/Notifications';
import { CiReceipt } from "react-icons/ci";
import { FaFileInvoice } from "react-icons/fa";

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
  paymentMethod: 'cash' | 'card' | 'gcash' | 'bank';
  paymentStatus: 'paid' | 'pending' | 'partial';
  status: 'completed' | 'cancelled' | 'refunded';
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
}

interface ProductItem {
  id: string;
  name: string;
  sku: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  category: 'food' | 'medicine' | 'accessory' | 'supplement' | 'other';
  stock?: number;
}

interface AppointmentInvoice {
  id: string;
  date: string;
  time: string;
  veterinarian: string;
  petName: string;
  ownerName: string;
  services: string[];
  amount: number;
}

interface WalkInRecord {
  id: string;
  date: string;
  time: string;
  petName: string;
  petSpecies: string;
  petBreed: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  reason: string;
  status: 'completed' | 'ongoing' | 'waiting';
  veterinarian: string;
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
  message: string | React.ReactNode;
  onConfirm?: () => void;
  showCancel: boolean;
}

interface Product {
  id: string;
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

type ViewMode = 'list' | 'create' | 'details';
type InvoiceType = 'appointment' | 'walkin';
type PaymentMethod = 'cash' | 'card' | 'gcash' | 'bank';
type PaymentStatus = 'paid' | 'pending' | 'partial';
type DiscountType = 'none' | 'senior' | 'pwd' | 'promo' | 'custom';
type CustomDiscountType = 'percentage' | 'fixed';

const API_URL = 'http://localhost:3000';
const TAX_RATE = 0.12;

// Discount rates
const DISCOUNT_RATES = {
  senior: 0.20,
  pwd: 0.20,
  promo: 0.10
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
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>(MOCK_INVOICES);
  const [products] = useState<Product[]>(MOCK_PRODUCTS);
  const [services] = useState<Service[]>(MOCK_SERVICES);
  const [loading, setLoading] = useState<boolean>(false);
  
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
  const [walkinRecords] = useState<WalkInRecord[]>(MOCK_WALKIN_RECORDS);
  const [walkinSearchQuery, setWalkinSearchQuery] = useState<string>('');
  
  // Appointment State
  const [appointmentSearchQuery, setAppointmentSearchQuery] = useState<string>('');
  const [appointmentResults] = useState<AppointmentInvoice[]>(MOCK_APPOINTMENTS);
  
  // Pagination
  const [page, setPage] = useState<number>(0);
  const itemsPerPage = 8;
  
  // Create Invoice State
  const [invoiceType, setInvoiceType] = useState<InvoiceType>('walkin');
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentInvoice | null>(null);
  
  // Service Selection State
  const [showServiceModal, setShowServiceModal] = useState<boolean>(false);
  const [serviceSearchQuery, setServiceSearchQuery] = useState<string>('');
  const [selectedServices, setSelectedServices] = useState<InvoiceItem[]>([]);
  const [serviceCategoryFilter, setServiceCategoryFilter] = useState<string>('all');
  const [tempSelectedServices, setTempSelectedServices] = useState<Map<string, { service: Service; quantity: number }>>(new Map());
  
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
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('paid');
  const [notes, setNotes] = useState<string>('');
  
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
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  
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
  
  const selectWalkinRecord = (record: WalkInRecord) => {
    setCustomerName(record.ownerName);
    setCustomerEmail(record.ownerEmail);
    setCustomerPhone(record.ownerPhone);
    setPetName(record.petName);
    setNotes(`Reason: ${record.reason} | Veterinarian: ${record.veterinarian}`);
    setShowWalkinModal(false);
    setWalkinSearchQuery('');
    showAlert('success', 'Record Loaded', `Loaded walk-in record for ${record.petName} (${record.ownerName})`);
  };
  
  const selectAppointmentRecord = (appointment: AppointmentInvoice) => {
    setSelectedAppointment(appointment);
    setCustomerName(appointment.ownerName);
    setPetName(appointment.petName);
    setShowAppointmentModal(false);
    setAppointmentSearchQuery('');
    
    const newServices: InvoiceItem[] = appointment.services.map((service, idx) => {
      const foundService = MOCK_SERVICES.find(s => 
        s.name.toLowerCase().includes(service.toLowerCase()) || 
        service.toLowerCase().includes(s.name.toLowerCase())
      );
      return {
        id: Date.now().toString() + idx,
        name: foundService?.name || service,
        description: foundService?.description || `${service} service`,
        quantity: 1,
        unitPrice: foundService?.price || 500,
        total: foundService?.price || 500,
        category: foundService?.category || 'Consultation'
      };
    });
    setSelectedServices(newServices);
  };
  
  const openServiceModal = () => {
    const tempMap = new Map();
    selectedServices.forEach(service => {
      const foundService = MOCK_SERVICES.find(s => s.name === service.name);
      if (foundService) {
        tempMap.set(foundService.id, { service: foundService, quantity: service.quantity });
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
    newTemp.delete(serviceId);
    setTempSelectedServices(newTemp);
  };
  
  const confirmServices = () => {
    const newServices: InvoiceItem[] = [];
    tempSelectedServices.forEach(({ service, quantity }) => {
      newServices.push({
        id: Date.now().toString() + Math.random(),
        name: service.name,
        description: service.description,
        quantity: quantity,
        unitPrice: service.price,
        total: service.price * quantity,
        category: service.category,
        serviceId: service.id
      });
    });
    setSelectedServices(newServices);
    setShowServiceModal(false);
    if (newServices.length > 0) {
      showAlert('success', 'Services Added', `${newServices.length} service(s) have been added to the invoice.`);
    }
  };
  
  const openProductModal = () => {
    const tempMap = new Map();
    selectedProducts.forEach(product => {
      const foundProduct = MOCK_PRODUCTS.find(p => p.id === product.id);
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
      newProducts.push({
        id: product.id,
        name: product.name,
        sku: product.sku,
        description: product.description,
        quantity: quantity,
        unitPrice: product.price,
        total: product.price * quantity,
        category: product.category.toLowerCase() as ProductItem['category'],
        stock: product.stock
      });
    });
    setSelectedProducts(newProducts);
    setShowProductModal(false);
    if (newProducts.length > 0) {
      showAlert('success', 'Products Added', `${newProducts.length} product(s) have been added to the invoice.`);
    }
  };
  
  const updateServiceQuantity = (id: string, quantity: number) => {
    if (quantity < 1) return;
    setSelectedServices(selectedServices.map(s => 
      s.id === id ? { ...s, quantity, total: s.unitPrice * quantity } : s
    ));
  };
  
  const removeService = (id: string) => {
    setSelectedServices(selectedServices.filter(s => s.id !== id));
  };
  
  const updateServicePrice = (id: string, newPrice: number) => {
    if (newPrice < 0) return;
    setSelectedServices(selectedServices.map(s => 
      s.id === id ? { ...s, unitPrice: newPrice, total: s.quantity * newPrice } : s
    ));
  };
  
  const updateProductQuantity = (id: string, quantity: number) => {
    if (quantity < 1) return;
    setSelectedProducts(selectedProducts.map(p => 
      p.id === id ? { ...p, quantity, total: p.unitPrice * quantity } : p
    ));
  };
  
  const removeProduct = (id: string) => {
    setSelectedProducts(selectedProducts.filter(p => p.id !== id));
  };
  
  const updateProductPrice = (id: string, newPrice: number) => {
    if (newPrice < 0) return;
    setSelectedProducts(selectedProducts.map(p => 
      p.id === id ? { ...p, unitPrice: newPrice, total: p.quantity * newPrice } : p
    ));
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
    setInvoiceType('walkin');
    setSelectedAppointment(null);
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
    setPaymentStatus('paid');
    setNotes('');
  };
  
  const handleInvoiceTypeChange = (type: InvoiceType) => {
    setInvoiceType(type);
    if (type === 'walkin') {
      setShowWalkinModal(true);
    } else {
      setShowAppointmentModal(true);
    }
  };
  
  const handleCreateInvoice = () => {
    if (!customerName || !petName || (selectedServices.length === 0 && selectedProducts.length === 0)) {
      showAlert('error', 'Missing Information', 'Please fill in customer name, pet name, and at least one service or product.');
      return;
    }
    
    const newInvoice: Invoice = {
      id: Date.now().toString(),
      invoiceNumber: `INV-${new Date().getFullYear()}-${(invoices.length + 1).toString().padStart(3, '0')}`,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      invoiceType: invoiceType,
      customerName,
      customerEmail,
      customerPhone,
      petName,
      items: selectedServices,
      products: selectedProducts,
      subtotal,
      tax,
      discount: discountAmount,
      discountType,
      discountValue: discountType === 'custom' ? customDiscountValue : undefined,
      discountIsPercentage: discountType === 'custom' ? (customDiscountType === 'percentage') : undefined,
      total,
      paymentMethod,
      paymentStatus,
      status: 'completed',
      notes
    };
    
    setInvoices([newInvoice, ...invoices]);
    resetForm();
    setShowCreateModal(false);
    showAlert('success', 'Invoice Created', `Invoice ${newInvoice.invoiceNumber} has been created successfully!`);
  };
  
  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowDrawer(true);
  };
  
  const handleCloseDrawer = () => {
    setShowDrawer(false);
    setSelectedInvoice(null);
  };
  
  const handlePrintInvoice = (invoice: Invoice) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
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
            <p>Payment Method: ${invoice.paymentMethod.toUpperCase()} | Status: ${invoice.paymentStatus}</p>
            <p>Thank you for choosing PawRang Veterinary Clinic! 🐾</p>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
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
    
    showAlert('confirm', 'Delete Invoices', `Are you sure you want to delete ${selectedInvoices.size} selected invoice(s)?`, () => {
      setInvoices(invoices.filter(inv => !selectedInvoices.has(inv.id)));
      setSelectedInvoices(new Set());
      showAlert('success', 'Success', 'Invoices deleted successfully!');
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
  }, []);
  
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
                    <option value="partial">Partial</option>
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
              <button className="billingBlackBtn" onClick={() => { resetForm(); setShowCreateModal(true); }}>
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
                            {invoice.paymentStatus}
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
                    <div className="billingToggleGroupFull">
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
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Full name"
                      className="billingFormInput"
                    />
                  </div>
                  <div className="billingFormGroup">
                    <label>Pet Name <span className="billingRequired">*</span></label>
                    <input 
                      type="text"
                      value={petName}
                      onChange={(e) => setPetName(e.target.value)}
                      placeholder="Pet name"
                      className="billingFormInput"
                    />
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
                        onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                        className="billingFormSelect"
                      >
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                        <option value="gcash">GCash</option>
                        <option value="bank">Bank Transfer</option>
                      </select>
                    </div>
                    <div className="billingFormGroup">
                      <label>Payment Status</label>
                      <select 
                        value={paymentStatus}
                        onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                        className="billingFormSelect"
                      >
                        <option value="paid">Paid</option>
                        <option value="pending">Pending</option>
                        <option value="partial">Partial</option>
                      </select>
                    </div>
                  </div>
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
              </div>
              
              <div className="billingFormActions">
                <button className="billingCancelBtn" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button className="billingSubmitBtn" onClick={handleCreateInvoice}>
                  Create Invoice
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
                    {selectedInvoice.paymentStatus}
                  </span>
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
                            <span className="billingDrawerDesc">{item.description}</span>
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
                            <span className="billingDrawerDesc">{product.sku}</span>
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
              </div>
              
              {selectedInvoice.notes && (
                <div className="billingDrawerNotes">
                  <label>Notes:</label>
                  <p>{selectedInvoice.notes}</p>
                </div>
              )}
            </div>
            
            <div className="billingDrawerActions">
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
                {filteredWalkinRecords.length > 0 ? (
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
                          {record.reason}
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
                {filteredAppointments.length > 0 ? (
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
                  {Object.keys(SERVICE_STRUCTURE).map(cat => (
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
                        
