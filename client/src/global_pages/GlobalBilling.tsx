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
  IoPrintOutline} from 'react-icons/io5';

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
  petSpecies: string;
  items: InvoiceItem[];
  products: ProductItem[];
  subtotal: number;
  tax: number;
  discount: number;
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
  category: 'consultation' | 'vaccination' | 'laboratory' | 'medication' | 'surgery' | 'grooming' | 'other';
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

type ViewMode = 'list' | 'create' | 'details';
type InvoiceType = 'appointment' | 'walkin';
type PaymentMethod = 'cash' | 'card' | 'gcash' | 'bank';
type PaymentStatus = 'paid' | 'pending' | 'partial';

const API_URL = 'http://localhost:3000';
const TAX_RATE = 0.12;

const SERVICE_CATEGORIES = [
  'Consultation', 'Vaccination', 'Laboratory', 'Medication', 'Surgery', 'Grooming', 'Other'
];

const PRODUCT_CATEGORIES = [
  'Food', 'Medicine', 'Accessory', 'Supplement', 'Other'
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
    petSpecies: 'Dog',
    items: [
      { id: 'i1', name: 'Consultation', description: 'Standard veterinary consultation', quantity: 1, unitPrice: 500, total: 500, category: 'consultation' },
      { id: 'i2', name: 'Vaccination', description: 'Annual vaccination', quantity: 1, unitPrice: 800, total: 800, category: 'vaccination' }
    ],
    products: [
      { id: 'p1', name: 'Premium Dog Food', sku: 'FD-001', description: 'High-quality dry dog food, 5kg', quantity: 1, unitPrice: 1200, total: 1200, category: 'food' }
    ],
    subtotal: 2500,
    tax: 300,
    discount: 0,
    total: 2800,
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
    petSpecies: 'Cat',
    items: [
      { id: 'i1', name: 'Consultation', description: 'Standard veterinary consultation', quantity: 1, unitPrice: 500, total: 500, category: 'consultation' },
      { id: 'i2', name: 'Laboratory Test', description: 'Complete Blood Count', quantity: 1, unitPrice: 1500, total: 1500, category: 'laboratory' }
    ],
    products: [
      { id: 'p3', name: 'Antibiotic Spray', sku: 'MD-001', description: 'Topical antibiotic spray for wounds', quantity: 1, unitPrice: 350, total: 350, category: 'medicine' }
    ],
    subtotal: 2350,
    tax: 282,
    discount: 100,
    total: 2532,
    paymentMethod: 'card',
    paymentStatus: 'paid',
    status: 'completed',
    notes: 'Sick pet'
  },
  {
    id: 'inv3',
    invoiceNumber: 'INV-2024-003',
    date: '2024-03-25',
    time: '11:00 AM',
    invoiceType: 'walkin',
    customerName: 'Maria Garcia',
    customerEmail: 'maria.garcia@email.com',
    customerPhone: '09234567890',
    petName: 'Bella',
    petSpecies: 'Cat',
    items: [
      { id: 'i1', name: 'Grooming', description: 'Full grooming service', quantity: 1, unitPrice: 600, total: 600, category: 'grooming' }
    ],
    products: [
      { id: 'p6', name: 'Pet Shampoo', sku: 'AC-002', description: 'Hypoallergenic, gentle formula', quantity: 1, unitPrice: 280, total: 280, category: 'accessory' },
      { id: 'p4', name: 'Flea & Tick Collar', sku: 'AC-001', description: 'Protects for up to 6 months', quantity: 1, unitPrice: 450, total: 450, category: 'accessory' }
    ],
    subtotal: 1330,
    tax: 159.6,
    discount: 0,
    total: 1489.6,
    paymentMethod: 'gcash',
    paymentStatus: 'paid',
    status: 'completed',
    notes: 'First time customer'
  }
];

const GlobalBilling: React.FC = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>(MOCK_INVOICES);
  const [products] = useState<Product[]>(MOCK_PRODUCTS);
  const [loading, setLoading] = useState<boolean>(false);
  
  // UI State
  const [viewMode, setViewMode] = useState<ViewMode>('list');
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
  
  // Pagination
  const [page, setPage] = useState<number>(0);
  const itemsPerPage = 8;
  
  // Create Invoice State
  const [invoiceType, setInvoiceType] = useState<InvoiceType>('walkin');
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentInvoice | null>(null);
  const [showAppointmentSearch, setShowAppointmentSearch] = useState<boolean>(false);
  const [appointmentSearchQuery, setAppointmentSearchQuery] = useState<string>('');
  const [appointmentResults, setAppointmentResults] = useState<AppointmentInvoice[]>(MOCK_APPOINTMENTS);
  
  // Product Selection State
  const [showProductModal, setShowProductModal] = useState<boolean>(false);
  const [productSearchQuery, setProductSearchQuery] = useState<string>('');
  const [selectedProducts, setSelectedProducts] = useState<ProductItem[]>([]);
  const [productCategoryFilter, setProductCategoryFilter] = useState<string>('all');
  
  // Form State
  const [customerName, setCustomerName] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [petName, setPetName] = useState<string>('');
  const [petSpecies, setPetSpecies] = useState<string>('');
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('paid');
  const [notes, setNotes] = useState<string>('');
  const [showServiceModal, setShowServiceModal] = useState<boolean>(false);
  const [newServiceName, setNewServiceName] = useState<string>('');
  const [newServicePrice, setNewServicePrice] = useState<string>('');
  const [newServiceCategory, setNewServiceCategory] = useState<string>(SERVICE_CATEGORIES[0]);
  const [newServiceDescription, setNewServiceDescription] = useState<string>('');
  
  // Alert Modal State
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [modalConfig, setModalConfig] = useState<ModalConfig>({
    type: 'info',
    title: '',
    message: '',
    showCancel: false
  });
  
  // Computed values
  const serviceSubtotal = invoiceItems.reduce((sum, item) => sum + item.total, 0);
  const productSubtotal = selectedProducts.reduce((sum, item) => sum + item.total, 0);
  const subtotal = serviceSubtotal + productSubtotal;
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax - discount;
  
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
    message: string | JSX.Element, 
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
  
  const filterAppointments = (query: string) => {
    setAppointmentSearchQuery(query);
    if (!query.trim()) {
      setAppointmentResults(MOCK_APPOINTMENTS);
      return;
    }
    const filtered = MOCK_APPOINTMENTS.filter(app => 
      app.petName.toLowerCase().includes(query.toLowerCase()) ||
      app.ownerName.toLowerCase().includes(query.toLowerCase()) ||
      app.id.toLowerCase().includes(query.toLowerCase())
    );
    setAppointmentResults(filtered);
  };
  
  const selectAppointment = (appointment: AppointmentInvoice) => {
    setSelectedAppointment(appointment);
    setCustomerName(appointment.ownerName);
    setPetName(appointment.petName);
    setShowAppointmentSearch(false);
    setAppointmentSearchQuery('');
    
    const newItems: InvoiceItem[] = appointment.services.map((service, idx) => ({
      id: Date.now().toString() + idx,
      name: service,
      description: `${service} service`,
      quantity: 1,
      unitPrice: service === 'Consultation' ? 500 : service === 'Vaccination' ? 800 : service === 'Laboratory Test' ? 1500 : service === 'Surgery' ? 5000 : 500,
      total: service === 'Consultation' ? 500 : service === 'Vaccination' ? 800 : service === 'Laboratory Test' ? 1500 : service === 'Surgery' ? 5000 : 500,
      category: service.toLowerCase().includes('consultation') ? 'consultation' : 
                service.toLowerCase().includes('vaccination') ? 'vaccination' :
                service.toLowerCase().includes('laboratory') ? 'laboratory' :
                service.toLowerCase().includes('surgery') ? 'surgery' : 'other'
    }));
    setInvoiceItems(newItems);
  };
  
  const addProductToInvoice = (product: Product) => {
    const existingProduct = selectedProducts.find(p => p.id === product.id);
    if (existingProduct) {
      setSelectedProducts(selectedProducts.map(p => 
        p.id === product.id 
          ? { ...p, quantity: p.quantity + 1, total: (p.quantity + 1) * p.unitPrice }
          : p
      ));
    } else {
      setSelectedProducts([...selectedProducts, {
        id: product.id,
        name: product.name,
        sku: product.sku,
        description: product.description,
        quantity: 1,
        unitPrice: product.price,
        total: product.price,
        category: product.category.toLowerCase() as ProductItem['category']
      }]);
    }
    setShowProductModal(false);
    setProductSearchQuery('');
    showAlert('success', 'Product Added', `${product.name} has been added to the invoice.`);
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
  
  const addInvoiceItem = () => {
    if (!newServiceName || !newServicePrice) {
      showAlert('error', 'Missing Information', 'Please enter service name and price.');
      return;
    }
    
    const price = parseFloat(newServicePrice);
    if (isNaN(price) || price <= 0) {
      showAlert('error', 'Invalid Price', 'Please enter a valid price.');
      return;
    }
    
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      name: newServiceName,
      description: newServiceDescription || `${newServiceName} service`,
      quantity: 1,
      unitPrice: price,
      total: price,
      category: newServiceCategory.toLowerCase() as InvoiceItem['category']
    };
    
    setInvoiceItems([...invoiceItems, newItem]);
    setNewServiceName('');
    setNewServicePrice('');
    setNewServiceDescription('');
    setShowServiceModal(false);
  };
  
  const removeInvoiceItem = (id: string) => {
    setInvoiceItems(invoiceItems.filter(item => item.id !== id));
  };
  
  const updateInvoiceItemQuantity = (id: string, quantity: number) => {
    if (quantity < 1) return;
    setInvoiceItems(invoiceItems.map(item => 
      item.id === id ? { ...item, quantity, total: item.unitPrice * quantity } : item
    ));
  };
  
  const resetForm = () => {
    setInvoiceType('walkin');
    setSelectedAppointment(null);
    setCustomerName('');
    setCustomerEmail('');
    setCustomerPhone('');
    setPetName('');
    setPetSpecies('');
    setInvoiceItems([]);
    setSelectedProducts([]);
    setDiscount(0);
    setPaymentMethod('cash');
    setPaymentStatus('paid');
    setNotes('');
  };
  
  const handleCreateInvoice = () => {
    if (!customerName || !petName || (invoiceItems.length === 0 && selectedProducts.length === 0)) {
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
      petSpecies,
      items: invoiceItems,
      products: selectedProducts,
      subtotal,
      tax,
      discount,
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
              <div class="col"><label>PET SPECIES</label><div class="value">${invoice.petSpecies || 'N/A'}</div></div>
            </div>
          </div>
          <h3 style="margin-bottom: 15px; color: #3d67ee;">Items</h3>
          <table>
            <thead><tr><th>Item</th><th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
            <tbody>
              ${invoice.items.map(item => `<tr><td><strong>${item.name}</strong></td><td>${item.description}</td><td>${item.quantity}</td><td>₱${item.unitPrice.toLocaleString()}</td><td>₱${item.total.toLocaleString()}</td></tr>`).join('')}
              ${invoice.products.map(product => `<tr><td><strong>${product.name}</strong></td><td>${product.description}</td><td>${product.quantity}</td><td>₱${product.unitPrice.toLocaleString()}</td><td>₱${product.total.toLocaleString()}</td></tr>`).join('')}
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
                        <td>
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
                        onClick={() => {
                          setInvoiceType('walkin');
                          setSelectedAppointment(null);
                        }}
                      >
                        <IoTimeSharp size={14} /> Walk-in
                      </button>
                      <button 
                        type="button"
                        className={`billingToggleBtnFull ${invoiceType === 'appointment' ? 'billingToggleActiveFull' : ''}`}
                        onClick={() => setInvoiceType('appointment')}
                      >
                        <IoCalendarOutline size={14} /> Appointment
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Appointment Selection */}
              {invoiceType === 'appointment' && (
                <div className="billingFormSection">
                  <div className="billingFormRow">
                    <div className="billingFormGroup billingFullWidth">
                      <button 
                        type="button"
                        className="billingSearchAppointmentBtn"
                        onClick={() => setShowAppointmentSearch(true)}
                      >
                        <IoSearchSharp size={14} /> Search Appointment
                      </button>
                    </div>
                  </div>
                  {selectedAppointment && (
                    <div className="billingSelectedAppointment">
                      <div className="billingSelectedAppointmentInfo">
                        <strong>{selectedAppointment.petName}</strong> - {selectedAppointment.ownerName}
                        <div className="billingAppointmentDetails">
                          {selectedAppointment.date} at {selectedAppointment.time} | {selectedAppointment.veterinarian}
                        </div>
                      </div>
                      <button className="billingClearBtn" onClick={() => setSelectedAppointment(null)}>
                        <IoCloseOutline size={16} /> Change
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              {/* Customer Information */}
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
                <div className="billingFormRow">
                  <div className="billingFormGroup">
                    <label>Pet Species</label>
                    <input 
                      type="text"
                      value={petSpecies}
                      onChange={(e) => setPetSpecies(e.target.value)}
                      placeholder="e.g., Dog, Cat"
                      className="billingFormInput"
                    />
                  </div>
                </div>
              </div>
              
              {/* Services Section */}
              <div className="billingFormSection">
                <div className="billingSectionHeader">
                  <h4>Services</h4>
                  <button className="billingAddItemBtnSmall" onClick={() => setShowServiceModal(true)}>
                    <IoAdd size={12} /> Add Service
                  </button>
                </div>
                <div className="billingItemsTable">
                  <table className="billingItemsDataTable">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Unit Price</th>
                        <th>Total</th>
                        <th style={{ width: '40px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceItems.map(item => (
                        <tr key={item.id}>
                          <td><strong>{item.name}</strong></td>
                          <td>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateInvoiceItemQuantity(item.id, parseInt(e.target.value) || 1)}
                              className="billingQtyInput"
                              min="1"
                            />
                          </td>
                          <td>₱{item.unitPrice.toLocaleString()}</td>
                          <td className="billingItemTotal">₱{item.total.toLocaleString()}</td>
                          <td>
                            <button className="billingRemoveItemBtn" onClick={() => removeInvoiceItem(item.id)}>
                              <IoTrashBinOutline size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {invoiceItems.length === 0 && (
                        <tr>
                          <td colSpan={5} className="billingNoItems">
                            No services added
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
                  <button className="billingAddItemBtnSmall" onClick={() => setShowProductModal(true)}>
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
                          <td><strong>{product.name}</strong></td>
                          <td>
                            <input
                              type="number"
                              value={product.quantity}
                              onChange={(e) => updateProductQuantity(product.id, parseInt(e.target.value) || 1)}
                              className="billingQtyInput"
                              min="1"
                            />
                          </td>
                          <td>₱{product.unitPrice.toLocaleString()}</td>
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
              
              {/* Payment Details */}
              <div className="billingFormSection">
                <h4>Payment Details</h4>
                <div className="billingFormRow">
                  <div className="billingFormGroup">
                    <label>Discount</label>
                    <input 
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="billingFormInput"
                      min="0"
                    />
                  </div>
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
                <div className="billingTotalsRow">
                  <span>Discount:</span>
                  <span>- ₱{discount.toLocaleString()}</span>
                </div>
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
                          <td><strong>{item.name}</strong><br/><span className="billingDrawerDesc">{item.description}</span></td>
                          <td>{item.quantity}</td>
                          <td>₱{item.unitPrice.toLocaleString()}</td>
                          <td>₱{item.total.toLocaleString()}</td>
                        </tr>
                      ))}
                      {selectedInvoice.products.map(product => (
                        <tr key={product.id}>
                          <td><strong>{product.name}</strong><br/><span className="billingDrawerDesc">{product.sku}</span></td>
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
                <div className="billingDrawerTotalsRow">
                  <span>Discount:</span>
                  <span>- ₱{selectedInvoice.discount.toLocaleString()}</span>
                </div>
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
      
      {/* Appointment Search Modal */}
      {showAppointmentSearch && (
        <div className="billingModalOverlay" onClick={() => setShowAppointmentSearch(false)}>
          <div className="billingSearchModal" onClick={e => e.stopPropagation()}>
            <div className="billingModalHeader">
              <h4>Select Appointment</h4>
              <button className="billingModalClose" onClick={() => setShowAppointmentSearch(false)}>×</button>
            </div>
            <div className="billingSearchModalContent">
              <div className="billingSearchInputWrapper">
                <input
                  type="text"
                  placeholder="Search by pet name, owner name..."
                  value={appointmentSearchQuery}
                  onChange={(e) => filterAppointments(e.target.value)}
                  className="billingSearchInput"
                />
                <IoSearchSharp size={18} className="billingSearchIcon" />
              </div>
              
              <div className="billingSearchResults">
                {appointmentResults.length > 0 ? (
                  appointmentResults.map(app => (
                    <div key={app.id} className="billingSearchResultItem" onClick={() => selectAppointment(app)}>
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
      
      {/* Product Selection Modal */}
      {showProductModal && (
        <div className="billingModalOverlay" onClick={() => setShowProductModal(false)}>
          <div className="billingProductModal" onClick={e => e.stopPropagation()}>
            <div className="billingModalHeader">
              <h4>Add Products</h4>
              <button className="billingModalClose" onClick={() => setShowProductModal(false)}>×</button>
            </div>
            <div className="billingProductModalContent">
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
              
              <div className="billingProductFilters">
                <button className={`billingProductFilterBtn ${productCategoryFilter === 'all' ? 'active' : ''}`} onClick={() => setProductCategoryFilter('all')}>All</button>
                <button className={`billingProductFilterBtn ${productCategoryFilter === 'food' ? 'active' : ''}`} onClick={() => setProductCategoryFilter('food')}>Food</button>
                <button className={`billingProductFilterBtn ${productCategoryFilter === 'medicine' ? 'active' : ''}`} onClick={() => setProductCategoryFilter('medicine')}>Medicine</button>
                <button className={`billingProductFilterBtn ${productCategoryFilter === 'accessory' ? 'active' : ''}`} onClick={() => setProductCategoryFilter('accessory')}>Accessory</button>
                <button className={`billingProductFilterBtn ${productCategoryFilter === 'supplement' ? 'active' : ''}`} onClick={() => setProductCategoryFilter('supplement')}>Supplement</button>
              </div>
              
              <div className="billingProductGrid">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map(product => (
                    <div key={product.id} className="billingProductCard">
                      <div className="billingProductCardInfo">
                        <div className="billingProductCardName">{product.name}</div>
                        <div className="billingProductCardSku">SKU: {product.sku}</div>
                        <div className="billingProductCardPrice">₱{product.price.toLocaleString()}</div>
                        <div className="billingProductCardStock">Stock: {product.stock} left</div>
                      </div>
                      <button 
                        className="billingProductCardAddBtn"
                        onClick={() => addProductToInvoice(product)}
                        disabled={product.stock === 0}
                      >
                        <IoAdd size={16} /> Add
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="billingSearchNoResults">
                    <p>No products found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Add Service Modal */}
      {showServiceModal && (
        <div className="billingModalOverlay" onClick={() => setShowServiceModal(false)}>
          <div className="billingServiceModal" onClick={e => e.stopPropagation()}>
            <div className="billingModalHeader">
              <h4>Add Service</h4>
              <button className="billingModalClose" onClick={() => setShowServiceModal(false)}>×</button>
            </div>
            <div className="billingServiceModalContent">
              <div className="billingFormRow">
                <div className="billingFormGroup billingFullWidth">
                  <label>Service Name <span className="billingRequired">*</span></label>
                  <input
                    type="text"
                    value={newServiceName}
                    onChange={(e) => setNewServiceName(e.target.value)}
                    placeholder="e.g., Consultation, Vaccination"
                    className="billingFormInput"
                  />
                </div>
              </div>
              <div className="billingFormRow">
                <div className="billingFormGroup">
                  <label>Category</label>
                  <select
                    value={newServiceCategory}
                    onChange={(e) => setNewServiceCategory(e.target.value)}
                    className="billingFormSelect"
                  >
                    {SERVICE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="billingFormGroup">
                  <label>Price <span className="billingRequired">*</span></label>
                  <input
                    type="number"
                    value={newServicePrice}
                    onChange={(e) => setNewServicePrice(e.target.value)}
                    placeholder="0.00"
                    className="billingFormInput"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              <div className="billingFormRow">
                <div className="billingFormGroup billingFullWidth">
                  <label>Description</label>
                  <textarea
                    value={newServiceDescription}
                    onChange={(e) => setNewServiceDescription(e.target.value)}
                    rows={3}
                    placeholder="Service description..."
                    className="billingTextarea"
                  />
                </div>
              </div>
              <div className="billingFormActions">
                <button className="billingCancelBtn" onClick={() => setShowServiceModal(false)}>Cancel</button>
                <button className="billingSubmitBtn" onClick={addInvoiceItem}>Add Service</button>
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