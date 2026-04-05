import React from 'react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../reusable_components/NavBar';
import './GlobalInventoryStyles.css';
import Notifications from '../reusable_components/Notifications';
import { CiBoxes } from "react-icons/ci";
import { downloadInventoryTemplate } from './pdf_generation/InventoryExcel';
import ImportButton from '../reusable_components/ImportBtn';
import ExportButton  from '../reusable_components/ExportBtn';
import { RiListSettingsLine } from "react-icons/ri";

import { 
  IoSearchSharp,
  IoFilterSharp,
  IoPencilSharp,
  IoCheckmarkCircleOutline,
  IoCloseCircleOutline,
  IoAlertCircleOutline,
  IoCashOutline,
  IoCartOutline,
  IoWarningOutline,
  IoRemoveCircleOutline,
  IoAddCircleOutline,
  IoCalendarOutline,
  IoArrowBackOutline,
  IoDownloadOutline,
  IoCloudUploadOutline,
  IoArchiveOutline
} from 'react-icons/io5';

interface Product {
  id?: number;
  pk?: number;
  code: string;
  item: string;
  category: string;
  basePrice: number;
  sellingPrice: number;
  stockCount: number;
  stockStatus: 'High Stock' | 'Average Stock' | 'Low Stock' | 'Critical Stock';
  expirationDate?: string;
  expirationNA?: boolean;
  dateAdded?: string;
  maxQuantity?: number;
  useMaxQuantity?: boolean;
  criticalStockLevel?: number;
  isArchived?: boolean;
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
  code?: string;
  item?: string;
  basePrice?: string;
  sellingPrice?: string;
  expirationDate?: string;
  category?: string;
}

type ViewMode = 'list' | 'add' | 'edit';
type Category = 'Pet Supplies' | 'Deworming' | 'Vitamins' | 'Food' | 'Accessories' | 'Medication';
type SortOption = 'stockLowToHigh' | 'stockHighToLow' | 'expirationEarliest' | 'expirationLatest' | 'alphabeticalAZ' | 'alphabeticalZA';

const SORT_OPTIONS = [
  { value: 'stockLowToHigh', label: 'Lowest to Highest Stock' },
  { value: 'stockHighToLow', label: 'Highest to Lowest Stock' },
  { value: 'expirationEarliest', label: 'Expiring Soon First' },
  { value: 'expirationLatest', label: 'Expiring Last First' },
  { value: 'alphabeticalAZ', label: 'Alphabetical A-Z' },
  { value: 'alphabeticalZA', label: 'Alphabetical Z-A' }
];

const API_URL = 'http://localhost:5000';
const CATEGORIES: Category[] = ['Pet Supplies', 'Deworming', 'Vitamins', 'Food', 'Accessories', 'Medication'];
const ROWS_PER_PAGE_OPTIONS = [5, 8, 10, 15, 20, 25, 50];
const BRANCH_ID_BY_NAME: Record<string, number> = {
  All: 1,
  Taguig: 1,
  'Las Pinas': 2,
};

const MOCK_PRODUCTS: Product[] = [
  {
    id: 1,
    code: 'DOG-FD-001',
    item: 'Premium Dog Food Adult 5kg',
    category: 'Food',
    basePrice: 850.00,
    sellingPrice: 999.00,
    stockCount: 45,
    stockStatus: 'Average Stock',
    expirationDate: '12/2025',
    expirationNA: false,
    dateAdded: '01/15/2024',
    criticalStockLevel: 10,
    isArchived: false
  },
  {
    id: 2,
    code: 'CAT-FD-002',
    item: 'Gourmet Cat Food Fish Flavor 2kg',
    category: 'Food',
    basePrice: 420.00,
    sellingPrice: 549.00,
    stockCount: 0,
    stockStatus: 'Low Stock',
    expirationDate: '03/2024',
    expirationNA: false,
    dateAdded: '02/03/2024',
    criticalStockLevel: 10,
    isArchived: false
  },
  {
    id: 3,
    code: 'SUP-TOY-023',
    item: 'Interactive Feather Cat Toy',
    category: 'Pet Supplies',
    basePrice: 85.00,
    sellingPrice: 149.00,
    stockCount: 78,
    stockStatus: 'High Stock',
    expirationDate: 'N/A',
    expirationNA: true,
    dateAdded: '01/20/2024',
    criticalStockLevel: 10,
    isArchived: false
  },
  {
    id: 4,
    code: 'DEW-PP-056',
    item: 'Praziquantel Dewormer for Dogs (4 tabs)',
    category: 'Deworming',
    basePrice: 180.00,
    sellingPrice: 249.00,
    stockCount: 34,
    stockStatus: 'Average Stock',
    expirationDate: '08/2024',
    expirationNA: false,
    dateAdded: '02/10/2024',
    criticalStockLevel: 10,
    isArchived: false
  },
  {
    id: 5,
    code: 'VIT-DG-089',
    item: 'Multivitamin Paste for Dogs 100g',
    category: 'Vitamins',
    basePrice: 320.00,
    sellingPrice: 399.00,
    stockCount: 8,
    stockStatus: 'Critical Stock',
    expirationDate: '05/2024',
    expirationNA: false,
    dateAdded: '01/28/2024',
    criticalStockLevel: 10,
    isArchived: false
  },
  {
    id: 6,
    code: 'ACC-BED-112',
    item: 'Orthopedic Dog Bed Medium Size',
    category: 'Accessories',
    basePrice: 1250.00,
    sellingPrice: 1599.00,
    stockCount: 15,
    stockStatus: 'Low Stock',
    expirationDate: 'N/A',
    expirationNA: true,
    dateAdded: '02/05/2024',
    criticalStockLevel: 10,
    isArchived: false
  },
  {
    id: 7,
    code: 'MED-FL-067',
    item: 'Flea and Tick Treatment for Cats',
    category: 'Medication',
    basePrice: 450.00,
    sellingPrice: 599.00,
    stockCount: 23,
    stockStatus: 'Average Stock',
    expirationDate: '11/2024',
    expirationNA: false,
    dateAdded: '01/12/2024',
    criticalStockLevel: 10,
    isArchived: false
  },
  {
    id: 8,
    code: 'DOG-FD-089',
    item: 'Puppy Formula Dog Food 3kg',
    category: 'Food',
    basePrice: 680.00,
    sellingPrice: 799.00,
    stockCount: 52,
    stockStatus: 'High Stock',
    expirationDate: '09/2024',
    expirationNA: false,
    dateAdded: '02/18/2024',
    criticalStockLevel: 10,
    isArchived: false
  },
  {
    id: 9,
    code: 'SUP-GRM-034',
    item: 'Professional Dog Grooming Kit',
    category: 'Pet Supplies',
    basePrice: 1250.00,
    sellingPrice: 1499.00,
    stockCount: 9,
    stockStatus: 'Critical Stock',
    expirationDate: 'N/A',
    expirationNA: true,
    dateAdded: '01/30/2024',
    criticalStockLevel: 10,
    isArchived: false
  },
  {
    id: 10,
    code: 'DEW-CT-078',
    item: 'Broad Spectrum Dewormer for Cats',
    category: 'Deworming',
    basePrice: 210.00,
    sellingPrice: 289.00,
    stockCount: 41,
    stockStatus: 'Average Stock',
    expirationDate: '04/2024',
    expirationNA: false,
    dateAdded: '02/08/2024',
    criticalStockLevel: 10,
    isArchived: false
  },
  {
    id: 11,
    code: 'VIT-FS-045',
    item: 'Fish Oil Supplement for Pets 250ml',
    category: 'Vitamins',
    basePrice: 550.00,
    sellingPrice: 699.00,
    stockCount: 18,
    stockStatus: 'Low Stock',
    expirationDate: '06/2024',
    expirationNA: false,
    dateAdded: '01/22/2024',
    criticalStockLevel: 10,
    isArchived: false
  },
  {
    id: 12,
    code: 'ACC-CRG-156',
    item: 'Adjustable Pet Carrier Bag',
    category: 'Accessories',
    basePrice: 890.00,
    sellingPrice: 1099.00,
    stockCount: 27,
    stockStatus: 'Average Stock',
    expirationDate: 'N/A',
    expirationNA: true,
    dateAdded: '02/12/2024',
    criticalStockLevel: 10,
    isArchived: false
  },
  {
    id: 13,
    code: 'MED-AB-092',
    item: 'Antibiotic Ointment for Pets 50g',
    category: 'Medication',
    basePrice: 280.00,
    sellingPrice: 349.00,
    stockCount: 63,
    stockStatus: 'High Stock',
    expirationDate: '07/2024',
    expirationNA: false,
    dateAdded: '01/18/2024',
    criticalStockLevel: 10,
    isArchived: false
  },
  {
    id: 14,
    code: 'DOG-FD-234',
    item: 'Grain-Free Dog Food 2kg',
    category: 'Food',
    basePrice: 720.00,
    sellingPrice: 899.00,
    stockCount: 5,
    stockStatus: 'Critical Stock',
    expirationDate: '02/2024',
    expirationNA: false,
    dateAdded: '02/20/2024',
    criticalStockLevel: 10,
    isArchived: false
  },
  {
    id: 15,
    code: 'SUP-LTR-067',
    item: 'Self-Cleaning Litter Box',
    category: 'Pet Supplies',
    basePrice: 2150.00,
    sellingPrice: 2499.00,
    stockCount: 11,
    stockStatus: 'Low Stock',
    expirationDate: 'N/A',
    expirationNA: true,
    dateAdded: '01/25/2024',
    criticalStockLevel: 10,
    isArchived: false
  }
];

const GlobalInventory: React.FC = () => {
  const navigate = useNavigate();
  // State
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  
  // UI State
  const [searchVisible, setSearchVisible] = useState<boolean>(false);
  const [filterVisible, setFilterVisible] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchHovered, setSearchHovered] = useState<boolean>(false);
  const [filterHovered, setFilterHovered] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [showLowStockSidebar, setShowLowStockSidebar] = useState<boolean>(false);
  const [showExpiringSidebar, setShowExpiringSidebar] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<string>('');
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rowsPerPage, setRowsPerPage] = useState<number>(8);
  const [showExportDropdown, setShowExportDropdown] = useState<boolean>(false);
  const [sortOption, setSortOption] = useState<SortOption>('expirationEarliest');
  const [showSettingsDropdown, setShowSettingsDropdown] = useState<boolean>(false);

  // Modal States
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [modalConfig, setModalConfig] = useState<ModalConfig>({
    type: 'info',
    title: '',
    message: '',
    showCancel: false
  });

  // Filter States
  const [categoryFilter, setCategoryFilter] = useState<string>("defaultCategory");
  const [stockStatusFilter, setStockStatusFilter] = useState<string>("defaultStatus");

  // Pagination
  const [page, setPage] = useState<number>(0);
  const itemsPerPage = rowsPerPage;

  // Form States
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formCode, setFormCode] = useState<string>('');
  const [formItem, setFormItem] = useState<string>('');
  const [formCategory, setFormCategory] = useState<Category | ''>('');
  const [formBasePrice, setFormBasePrice] = useState<string>('');
  const [formSellingPrice, setFormSellingPrice] = useState<string>('');
  const [formExpirationDate, setFormExpirationDate] = useState<string>('');
  const [formExpirationNA, setFormExpirationNA] = useState<boolean>(false);
  const [formUseMaxQuantity, setFormUseMaxQuantity] = useState<boolean>(false);
  const [formMaxQuantity, setFormMaxQuantity] = useState<string>('');
  const [formCriticalStockLevel, setFormCriticalStockLevel] = useState<string>('10');
  const [formUseCriticalStock, setFormUseCriticalStock] = useState<boolean>(false);

  const [selectedBranch, setSelectedBranch] = useState<string>('All');
  const [userRole, setUserRole] = useState<string>('');

  const [formStockCount, setFormStockCount] = useState<string>('');

  const handleStockChange = (delta: number) => {
    if (formUseMaxQuantity) return;
    const currentValue = parseInt(formStockCount) || 0;
    const newValue = Math.max(0, currentValue + delta);
    setFormStockCount(Math.min(newValue, 999999).toString());
  };

  const handleCriticalStockChange = (delta: number) => {
    const currentValue = parseInt(formCriticalStockLevel) || 10;
    const newValue = Math.max(1, currentValue + delta);
    setFormCriticalStockLevel(Math.min(newValue, 999999).toString());
  };
  
  // Character counts
  const [charCounts, setCharCounts] = useState({
    code: 0,
    item: 0
  });

  // Form Errors
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Analytics
  const [analytics, setAnalytics] = useState({
    totalProducts: 0,
    lowStockCount: 0,
    criticalStockCount: 0,
    expiringCount: 0,
    expiredCount: 0,
    totalValue: 0,
    totalRevenue: 0
  });

  // Helper Functions
  const showAlert = (
    type: ModalConfig['type'], 
    title: string, 
    message: React.ReactNode, 
    onConfirm?: () => void, 
    onCancel?: () => void,
    showCancel: boolean = false
  ) => {
    setModalConfig({ type, title, message, onConfirm, onCancel, showCancel });
    setModalVisible(true);
  };
  
  const loadCurrentUser = async (): Promise<void> => {
    try {
      const session = localStorage.getItem('userSession');
      if (session) {
        const user = JSON.parse(session);
        setCurrentUser(user);
        setUserRole(user.role || '');
      }
    } catch (error) {
      console.log('Error loading user session', error);
    }
  };

  // Fetch products from the Flask inventory API.
  const fetchProducts = async (): Promise<void> => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/inventory/items`);
      if (!response.ok) {
        throw new Error(`Failed to fetch inventory data (${response.status})`);
      }

      const data = await response.json();
      const items = Array.isArray(data?.items) ? data.items : [];
      setProducts(items);
      calculateAnalytics(items);
    } catch (error) {
      console.error(error);
      showAlert('error', 'Error', 'Failed to fetch inventory data.');
    } finally {
      setLoading(false);
    }
  };

  const isExpired = (expirationDate?: string, expirationNA?: boolean): boolean => {
    if (expirationNA || !expirationDate || expirationDate === 'N/A') return false;
    
    const [month, day, year] = expirationDate.split('/');
    const expDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return expDate < today;
  };

  const isExpiringSoon = (expirationDate?: string, expirationNA?: boolean): boolean => {
    if (expirationNA || !expirationDate || expirationDate === 'N/A') return false;
    if (isExpired(expirationDate, expirationNA)) return false;
    
    const [month, day, year] = expirationDate.split('/');
    const expDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const oneMonthFromNow = new Date();
    oneMonthFromNow.setMonth(today.getMonth() + 1);
    
    return expDate <= oneMonthFromNow;
  };

  // Calculate analytics
  const calculateAnalytics = (productList: Product[]) => {
    const activeProducts = productList.filter(p => !p.isArchived);
    const totalProducts = activeProducts.length;
    const lowStockCount = activeProducts.filter(p => p.stockStatus === 'Low Stock' || p.stockStatus === 'Critical Stock').length;
    const criticalStockCount = activeProducts.filter(p => p.stockStatus === 'Critical Stock').length;
    const expiredCount = activeProducts.filter(p => isExpired(p.expirationDate, p.expirationNA)).length;
    const expiringCount = activeProducts.filter(p => isExpiringSoon(p.expirationDate, p.expirationNA)).length;
    const totalValue = activeProducts.reduce((sum, p) => sum + (p.basePrice * p.stockCount), 0);
    const totalRevenue = activeProducts.reduce((sum, p) => sum + (p.sellingPrice * p.stockCount), 0);
    
    setAnalytics({ 
      totalProducts, 
      lowStockCount, 
      criticalStockCount,
      expiringCount,
      expiredCount,
      totalValue, 
      totalRevenue 
    });
  };

  useEffect(() => {
    fetchProducts();
    loadCurrentUser();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showExportDropdown && !target.closest('.invExportDropdownContainer')) {
        setShowExportDropdown(false);
      }
      if (showSettingsDropdown && !target.closest('.invSettingsDropdownContainer')) {
        setShowSettingsDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportDropdown, showSettingsDropdown]);

  const determineStockStatus = (count: number, criticalLevel?: number): 'High Stock' | 'Average Stock' | 'Low Stock' | 'Critical Stock' => {
    const critical = Math.max(1, criticalLevel || 10);
    
    if (count === 0) return 'Critical Stock';
    if (count <= critical) return 'Critical Stock';
    if (count <= critical + 10) return 'Low Stock';
    if (count >= 50) return 'High Stock';
    return 'Average Stock';
  };

  const formatPriceInput = (value: string): string => {
    let cleaned = value.replace(/[^\d.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }
    if (parts.length === 2) {
      cleaned = parts[0] + '.' + parts[1].slice(0, 2);
    }
    const numValue = parseFloat(cleaned);
    if (!isNaN(numValue) && numValue > 999999) {
      cleaned = '999999';
    }
    return cleaned;
  };

  const resetForm = (): void => {
    setFormCode('');
    setFormItem('');
    setFormStockCount('');
    setFormCategory('');
    setFormBasePrice('');
    setFormSellingPrice('');
    setFormExpirationDate('');
    setFormExpirationNA(false);
    setFormUseMaxQuantity(false);
    setFormMaxQuantity('');
    setFormCriticalStockLevel('10');
    setFormUseCriticalStock(false);
    setEditingId(null);
    setCharCounts({ code: 0, item: 0 });
    setFormErrors({});
  };

  // Clear all filters and return to full list
  const handleReturnToList = () => {
    setCategoryFilter("defaultCategory");
    setStockStatusFilter("defaultStatus");
    setSearchQuery("");
    setActiveFilter("");
    setPage(0);
    setSelectedProducts(new Set());
  };

  // Clear filters function
  const clearFilters = () => {
    setCategoryFilter("defaultCategory");
    setStockStatusFilter("defaultStatus");
    setSearchQuery("");
    setActiveFilter("");
    setPage(0);
    setFilterVisible(false);
    setSelectedProducts(new Set());
  };

  // Filter by specific product
  const filterByProduct = (productCode: string) => {
    setSearchQuery(productCode);
    setActiveFilter('product');
    setCategoryFilter("defaultCategory");
    setStockStatusFilter("defaultStatus");
    setPage(0);
  };

  // Logout Handler
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
    }, undefined, true);
  };

  // Cancel Handler
  const handleCancel = (): void => {
    let hasUnsavedChanges = false;
    
    if (viewMode === 'add') {
      hasUnsavedChanges = !!(formCode || formItem || formBasePrice || formSellingPrice || formExpirationDate || formCategory);
    } else if (viewMode === 'edit') {
      const original = products.find(p => p.id === editingId || p.pk === editingId);
      if (original) {
        if (formItem !== original.item ||
            formCategory !== original.category ||
            parseFloat(formBasePrice) !== original.basePrice ||
            parseFloat(formSellingPrice) !== original.sellingPrice ||
            formExpirationDate !== (original.expirationDate || '') ||
            formExpirationNA !== (original.expirationNA || false)) {
          hasUnsavedChanges = true;
        }
      }
    }

    if (hasUnsavedChanges) {
      showAlert('confirm', 'Unsaved Changes', 'You have unsaved changes. Are you sure you want to discard them?', () => {
        setViewMode('list');
        resetForm();
      }, undefined, true);
    } else {
      setViewMode('list');
      resetForm();
    }
  };

  // Open Edit Form
  const openEditForm = (product: Product): void => {
    setEditingId(product.id || product.pk || null);
    setFormCode(product.code);
    setFormItem(product.item);
    setFormCategory(product.category as Category);
    setFormBasePrice(product.basePrice.toString());
    setFormSellingPrice(product.sellingPrice.toString());
    setFormExpirationDate(product.expirationDate || '');
    setFormExpirationNA(product.expirationNA || false);
    setFormUseMaxQuantity(product.useMaxQuantity || false);
    setFormMaxQuantity(product.maxQuantity?.toString() || '');
    setFormCriticalStockLevel(product.criticalStockLevel?.toString() || '10');
    setFormUseCriticalStock(!!product.criticalStockLevel && product.criticalStockLevel !== 10);
    
    setCharCounts({
      code: product.code.length,
      item: product.item.length
    });
    setFormErrors({});
    setViewMode('edit');
  };

  // Validation functions
  const validateField = (field: string, value: string): string => {
    switch(field) {
      case 'code':
        if (!value.trim()) return 'Product code is required';
        if (value.length < 3) return 'Product code must be at least 3 characters';
        if (value.length > 20) return 'Product code must not exceed 20 characters';
        const isDuplicate = products.some(p => 
          p.code.toLowerCase() === value.toLowerCase() && 
          (viewMode === 'edit' ? (p.id !== editingId && p.pk !== editingId) : true)
        );
        if (isDuplicate) return 'Product code already exists';
        return '';
        
      case 'item':
        if (!value.trim()) return 'Item name is required';
        if (value.length < 3) return 'Item name must be at least 3 characters';
        if (value.length > 50) return 'Item name must not exceed 50 characters';
        return '';
        
      case 'category':
        if (!value) return 'Category is required';
        return '';
        
      case 'basePrice':
        if (!value) return 'Base price is required';
        const basePriceNum = parseFloat(value);
        if (isNaN(basePriceNum) || basePriceNum <= 0) return 'Base price must be a positive number';
        if (basePriceNum > 999999) return 'Base price cannot exceed ₱999,999';
        return '';
        
      case 'sellingPrice':
        if (!value) return 'Selling price is required';
        const sellingPriceNum = parseFloat(value);
        if (isNaN(sellingPriceNum) || sellingPriceNum <= 0) return 'Selling price must be a positive number';
        if (sellingPriceNum > 999999) return 'Selling price cannot exceed ₱999,999';
        if (parseFloat(formBasePrice) && sellingPriceNum < parseFloat(formBasePrice)) {
          return 'Selling price cannot be less than base price';
        }
        return '';
        
      case 'expirationDate':
        if (!formExpirationNA && !value) {
          return 'Expiration date is required (or check "Not Applicable")';
        }
        if (!formExpirationNA && value) {
          const dateRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/;
          if (!dateRegex.test(value)) return 'Invalid date format. Use MM/DD/YYYY';
          
          const [month, day, year] = value.split('/').map(Number);
          const date = new Date(year, month - 1, day);
          
          if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
            return 'Invalid date (e.g., February 30 is not valid)';
          }
          
          if (year < 2024 || year > 2100) return 'Year must be between 2024 and 2100';
        }
        return '';

      default:
        return '';
    }
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    
    if (viewMode === 'add') {
      errors.code = validateField('code', formCode);
    }
    errors.item = validateField('item', formItem);
    errors.category = validateField('category', formCategory as string);
    errors.basePrice = validateField('basePrice', formBasePrice);
    errors.sellingPrice = validateField('sellingPrice', formSellingPrice);
    if (!formExpirationNA) {
      errors.expirationDate = validateField('expirationDate', formExpirationDate);
    }
    
    setFormErrors(errors);
    
    return !Object.values(errors).some(error => error);
  };

  // Save Product
  const handleSaveProduct = async (): Promise<void> => {
    if (!validateForm()) {
      return;
    }

    const existingProduct = viewMode === 'edit' ? products.find(p => p.id === editingId || p.pk === editingId) : null;
    const criticalLevel = formUseCriticalStock ? parseInt(formCriticalStockLevel) : 10;
    const stockCount = viewMode === 'add' ? (parseInt(formStockCount) || 0) : (existingProduct?.stockCount || 0);
    const branchId = BRANCH_ID_BY_NAME[selectedBranch] ?? 1;
    
    const productData = {
      branch_id: branchId,
      code: viewMode === 'add' ? formCode.trim() : (existingProduct?.code || formCode).trim(),
      item: formItem,
      category: formCategory as Category,
      basePrice: parseFloat(formBasePrice),
      sellingPrice: parseFloat(formSellingPrice),
      stockCount: stockCount,
      expirationDate: formExpirationNA ? '' : formExpirationDate,
      expirationNA: formExpirationNA,
      useMaxQuantity: formUseMaxQuantity,
      maxQuantity: formUseMaxQuantity ? parseInt(formMaxQuantity) : undefined,
      criticalStockLevel: criticalLevel,
      userId: currentUser?.id || currentUser?.pk,
    };

    showAlert('confirm', viewMode === 'add' ? 'Add Product' : 'Save Changes', 
      `Are you sure you want to ${viewMode === 'add' ? 'add this product' : 'save changes to this product'}?`, 
      async () => {
        try {
          if (viewMode === 'add') {
            const response = await fetch(`${API_URL}/api/inventory/items`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(productData),
            });

            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
              throw new Error(result.error || 'Failed to create inventory item.');
            }
          } else {
            const response = await fetch(`${API_URL}/api/inventory/items/${editingId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(productData),
            });

            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
              throw new Error(result.error || 'Failed to update inventory item.');
            }
          }

          await fetchProducts();
          setViewMode('list');
          showAlert('success', 'Success', 
            viewMode === 'add' ? 'Product added successfully!' : 'Product updated successfully!', 
            () => {
              resetForm();
            });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to save product information.';
          showAlert('error', 'Error', message);
        }
      }, undefined, true);
  };

  // Archive selected products
  const handleArchiveSelected = (): void => {
    if (selectedProducts.size === 0) {
      showAlert('error', 'No Selection', 'Please select products to archive.');
      return;
    }

    showAlert('confirm', 'Archive Products', 
      `Are you sure you want to archive ${selectedProducts.size} selected product(s)?`, 
      async () => {
        try {
          const productIds = Array.from(selectedProducts);
          const actorId = currentUser?.id || currentUser?.pk;

          for (const productId of productIds) {
            const response = await fetch(`${API_URL}/api/inventory/items/${productId}/archive`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                processedBy: actorId,
                userId: actorId,
              }),
            });

            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
              throw new Error(result.error || `Failed to archive item ${productId}.`);
            }
          }

          await fetchProducts();
          setSelectedProducts(new Set());

          showAlert('success', 'Success', 'Products archived successfully!');
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to archive products.';
          showAlert('error', 'Error', message);
        }
      }, undefined, true);
  };

  // Toggle product selection
  const toggleProductSelection = (id: number) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedProducts(newSelected);
  };

  // Toggle all products
  const toggleAllProducts = () => {
    if (selectedProducts.size === paginatedProducts.length) {
      setSelectedProducts(new Set());
    } else {
      const allIds = paginatedProducts.map(p => p.id || p.pk || 0).filter(id => id !== 0);
      setSelectedProducts(new Set(allIds));
    }
  };

  // Handle rows per page change
  const handleRowsPerPageChange = (newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage);
    setPage(0);
  };

  // Sort products
  const sortProducts = (productsToSort: Product[]): Product[] => {
    const sorted = [...productsToSort];
    const getExpirationTime = (product: Product) => {
      if (product.expirationNA || !product.expirationDate || product.expirationDate === 'N/A') {
        return null;
      }

      const parts = product.expirationDate.split('/');
      if (parts.length === 3) {
        const [month, day, year] = parts;
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).getTime();
      }
      if (parts.length === 2) {
        const [month, year] = parts;
        return new Date(parseInt(year), parseInt(month) - 1, 1).getTime();
      }
      return null;
    };
    
    switch (sortOption) {
      case 'stockLowToHigh':
        return sorted.sort((a, b) => a.stockCount - b.stockCount);
      case 'stockHighToLow':
        return sorted.sort((a, b) => b.stockCount - a.stockCount);
      case 'expirationEarliest':
        return sorted.sort((a, b) => {
          const aExpired = isExpired(a.expirationDate, a.expirationNA);
          const bExpired = isExpired(b.expirationDate, b.expirationNA);
          if (aExpired && !bExpired) return -1;
          if (!aExpired && bExpired) return 1;
          
          const aTime = getExpirationTime(a);
          const bTime = getExpirationTime(b);
          
          if (aTime === null && bTime === null) return 0;
          if (aTime === null) return 1;
          if (bTime === null) return -1;
          return aTime - bTime;
        });
      case 'expirationLatest':
        return sorted.sort((a, b) => {
          const aTime = getExpirationTime(a);
          const bTime = getExpirationTime(b);
          
          if (aTime === null && bTime === null) return 0;
          if (aTime === null) return 1;
          if (bTime === null) return -1;
          return bTime - aTime;
        });
      case 'alphabeticalAZ':
        return sorted.sort((a, b) => a.item.localeCompare(b.item));
      case 'alphabeticalZA':
        return sorted.sort((a, b) => b.item.localeCompare(a.item));
      default:
        return sorted;
    }
  };

    const handleImport = async (file: File) => {
    console.log('Importing file:', file.name);

    showAlert('info', 'Processing', `Importing ${file.name}...`);
  
    setTimeout(() => {
      showAlert('success', 'Import Successful', 'Inventory data has been imported successfully!');
      fetchProducts(); 
    }, 1500);
  };

  const handleDownloadTemplate = () => {
    downloadInventoryTemplate();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleImportSubmit = () => {
    if (!selectedFile) {
      showAlert('error', 'No File', 'Please select a file to import.');
      return;
    }
    
    showAlert('confirm', 'Import Inventory', 
      `Are you sure you want to import data from "${selectedFile.name}"? This may update existing products.`, 
      () => {
        setTimeout(() => {
          showAlert('success', 'Import Successful', 'Inventory data has been imported successfully!');
          setShowImportModal(false);
          setSelectedFile(null);
          fetchProducts();
        }, 1500);
      }, undefined, true);
  };

  const downloadTemplate = () => {
    downloadInventoryTemplate().catch(error => {
      console.error('Error generating template:', error);
      showAlert('error', 'Error', 'Failed to generate Excel template. Please try again.');
    });
  };

  // Filter Logic
  const filteredProducts = products.filter(product => {
    if (product.isArchived) return false;
    
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      product.code.toLowerCase().includes(searchLower) ||
      product.item.toLowerCase().includes(searchLower) ||
      product.category.toLowerCase().includes(searchLower);

    const matchesCategory = categoryFilter !== "defaultCategory" ? product.category === categoryFilter : true;
    const matchesStatus = stockStatusFilter !== "defaultStatus" ? product.stockStatus === stockStatusFilter : true;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const sortedProducts = sortProducts(filteredProducts);
  const paginatedProducts = sortedProducts.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
  const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);

  // Low stock products
  const lowStockProducts = products
    .filter(p => !p.isArchived && (p.stockStatus === 'Low Stock' || p.stockStatus === 'Critical Stock'))
    .sort((a, b) => {
      if (a.stockCount <= (a.criticalStockLevel || 10) && b.stockCount > (b.criticalStockLevel || 10)) return -1;
      if (a.stockCount > (a.criticalStockLevel || 10) && b.stockCount <= (b.criticalStockLevel || 10)) return 1;
      return a.stockCount - b.stockCount;
    });

  // Expiration products
  const expirationProducts = products
    .filter(p => !p.isArchived && !p.expirationNA && p.expirationDate && p.expirationDate !== 'N/A')
    .filter(p => isExpired(p.expirationDate, p.expirationNA) || isExpiringSoon(p.expirationDate, p.expirationNA))
    .sort((a, b) => {
      const aExpired = isExpired(a.expirationDate, a.expirationNA);
      const bExpired = isExpired(b.expirationDate, b.expirationNA);
      
      if (aExpired && !bExpired) return -1;
      if (!aExpired && bExpired) return 1;
      
      if (!a.expirationDate || a.expirationDate === 'N/A') return 1;
      if (!b.expirationDate || b.expirationDate === 'N/A') return -1;
      
      const [aMonth, aYear] = a.expirationDate.split('/');
      const [bMonth, bYear] = b.expirationDate.split('/');
      const aDate = new Date(parseInt(aYear), parseInt(aMonth) - 1);
      const bDate = new Date(parseInt(bYear), parseInt(bMonth) - 1);
      
      return aDate.getTime() - bDate.getTime();
    });

  return (
    <div className="invContainer">
      <Navbar currentUser={currentUser} onLogout={handleLogoutPress} />
      
      <div className="invBodyContainer">
        <div className="invTopContainer">
          <div className="invSubTopContainer" style={{paddingLeft: '30px'}}>
            <div className="invSubTopLeft">
              <CiBoxes  size={23} className="invBlueIcon" />
              <span className="invBlueText">Item Catalog</span>
            </div>
            
            <div className="invBranchSelector">
              <span className="invBranchLabel">Branch:</span>
              <select 
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="invBranchSelect"
              >
                <option value="All">All Branches</option>
                <option value="Taguig">Taguig</option>
                <option value="Las Pinas">Las Piñas</option>
              </select>
            </div>

              <ImportButton 
                onImport={handleImport}
                onDownloadTemplate={handleDownloadTemplate}
                buttonClassName="invImportBtn"
              />
              <ExportButton 
                products={products}
                type="inventory"
                buttonClassName="invExportBtn"
              />
          </div>
          <div className="invSubTopContainer invNotificationContainer" style={{padding: 13}}>
            <Notifications 
              buttonClassName="invIconButton"
              iconClassName="invBlueIcon"
              onViewAll={() => {
                console.log('View all notifications');
              }}
              onNotificationClick={(notification) => {
                if (notification.link) {
                  navigate(notification.link);
                }
              }}
            />
          </div>
        </div>

        {/* Analytics Cards */}
        <div className="invAnalyticsContainer">
          <div className="invAnalyticsCard">
            <div className="invAnalyticsIcon invBlueBg">
              <IoCartOutline size={24} color="white" />
            </div>
            <div className="invAnalyticsContent">
              <span className="invAnalyticsLabel">Total Products</span>
              <span className="invAnalyticsValue">{analytics.totalProducts}</span>
            </div>
          </div>

          <div className="invAnalyticsCard invClickable" onClick={() => setShowLowStockSidebar(true)}>
            <div className="invAnalyticsIcon invRedBg">
              <IoWarningOutline size={24} color="white" />
            </div>
            <div className="invAnalyticsContent">
              <span className="invAnalyticsLabel">Low Stock Items</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="invAnalyticsValue">{analytics.lowStockCount}</span>
                {analytics.criticalStockCount > 0 && (
                  <span className="invCriticalBadge">⚠️ {analytics.criticalStockCount} critical</span>
                )}
              </div>
            </div>
            <span className="invViewDetails">Click to view →</span>
          </div>

          <div className="invAnalyticsCard invClickable" onClick={() => setShowExpiringSidebar(true)}>
            <div className="invAnalyticsIcon invOrangeBg">
              <IoCalendarOutline size={24} color="white" />
            </div>
            <div className="invAnalyticsContent">
              <span className="invAnalyticsLabel">Expiration Alert</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="invAnalyticsValue">{analytics.expiringCount + analytics.expiredCount}</span>
                {analytics.expiredCount > 0 && (
                  <span className="invExpiredBadge">⚠️ {analytics.expiredCount} expired</span>
                )}
              </div>
            </div>
            <span className="invViewDetails">Click to view →</span>
          </div>

          <div className="invAnalyticsCard">
            <div className="invAnalyticsIcon invGreenBg">
              <IoCashOutline size={24} color="white" />
            </div>
            <div className="invAnalyticsContent">
              <span className="invAnalyticsLabel">Inventory Value</span>
              <span className="invAnalyticsValue">₱{analytics.totalValue.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="invTableContainer">
          {viewMode === 'list' ? (
            <>
              {/* Table Toolbar */}
              <div className="invTableToolbar">
                <div className="invSearchFilterSection">
                  <div className="invToolbarItem">
                    <button 
                      className="invIconButton"
                      onMouseEnter={() => setSearchHovered(true)}
                      onMouseLeave={() => setSearchHovered(false)}
                      onClick={() => setSearchVisible(!searchVisible)}
                    >
                      <IoSearchSharp size={25} className={searchVisible ? "invIconActive" : "invIconDefault"} />
                    </button>
                    {searchHovered && <div className="invTooltip">Search</div>}
                  </div>

                  {searchVisible && (
                    <input
                      type="text"
                      placeholder="Search by code, item, or category..."
                      value={searchQuery}
                      onChange={(e) => {setSearchQuery(e.target.value); setPage(0); setActiveFilter('');}}
                      className="invSearchInput"
                      maxLength={60}
                    />
                  )}

                  <div className="invToolbarItem">
                    <button 
                      className="invIconButton"
                      onMouseEnter={() => setFilterHovered(true)}
                      onMouseLeave={() => setFilterHovered(false)}
                      onClick={() => setFilterVisible(!filterVisible)}
                    >
                      <IoFilterSharp size={25} className={filterVisible ? "invIconActive" : "invIconDefault"} />
                    </button>
                    {filterHovered && <div className="invTooltip">Filter</div>}
                  </div>
                  
                  {filterVisible && (
                    <div className="invFilterSection">
                      <select 
                        value={categoryFilter} 
                        onChange={(e) => {setCategoryFilter(e.target.value); setPage(0); setActiveFilter('');}}
                        className="invFilterSelect"
                      >
                        <option value="defaultCategory">All Categories</option>
                        {CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>

                      <select 
                        value={stockStatusFilter} 
                        onChange={(e) => {setStockStatusFilter(e.target.value); setPage(0); setActiveFilter('');}}
                        className="invFilterSelect"
                      >
                        <option value="defaultStatus">All Stock Status</option>
                        <option value="High Stock">High Stock</option>
                        <option value="Average Stock">Average Stock</option>
                        <option value="Low Stock">Low Stock</option>
                        <option value="Critical Stock">Critical Stock</option>
                      </select>

                      <button className="invClearFilterBtn" onClick={clearFilters}>
                        <IoCloseCircleOutline size={14} /> Clear
                      </button>
                    </div>
                  )}

                  {/* Settings Dropdown (Sort + Rows per page combined) */}
                  <div className="invSettingsDropdownContainer">
                    <div className="invToolbarItem">
                      <button 
                        className="invIconButton"
                        onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
                      >
                        <RiListSettingsLine size={23} className={showSettingsDropdown ? "invIconActive" : "invIconDefault"} />
                      </button>
                    </div>

                    {showSettingsDropdown && (
                      <div className="invSettingsDropdown">
                        <div className="invSettingsSection">
                          <label>Sort By</label>
                          <select 
                            value={sortOption}
                            onChange={(e) => setSortOption(e.target.value as SortOption)}
                            className="invSettingsSelect"
                          >
                            {SORT_OPTIONS.map(option => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="invSettingsDivider" />
                        <div className="invSettingsSection">
                          <label>Rows Per Page</label>
                          <select 
                            value={rowsPerPage}
                            onChange={(e) => handleRowsPerPageChange(parseInt(e.target.value))}
                            className="invSettingsSelect"
                          >
                            {ROWS_PER_PAGE_OPTIONS.map(option => (
                              <option key={option} value={option}>{option} per page</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="invActionSection">
                  {selectedProducts.size > 0 && (
                    <button className="invArchiveBtn" onClick={handleArchiveSelected}>
                      <IoArchiveOutline /> Archive Selected ({selectedProducts.size})
                    </button>
                  )}
                  {activeFilter && (
                    <button className="invReturnBtn" onClick={handleReturnToList}>
                      <IoArrowBackOutline /> Return to Full List
                    </button>
                  )}
                
                </div>
              </div>

              {/* Products Table */}
              {loading ? (
                <div className="invLoadingContainer">
                  <div className="invSpinner"></div>
                </div>
              ) : (
                <div className="invTableWrapper">
                  <table className="invDataTable">
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}>
                          <input
                            type="checkbox"
                            checked={selectedProducts.size === paginatedProducts.length && paginatedProducts.length > 0}
                            onChange={toggleAllProducts}
                            className="invCheckbox"
                          />
                        </th>
                        <th>Code</th>
                        <th>Item</th>
                        <th>Category</th>
                        <th>Base Price</th>
                        <th>Selling Price</th>
                        <th>Stock</th>
                        <th>Expiration</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedProducts.length > 0 ? (
                        paginatedProducts.map(product => {
                          const productId = product.id || product.pk || 0;
                          const stockStatusClass = 
                            product.stockStatus === 'High Stock' ? 'invStockHigh' :
                            product.stockStatus === 'Average Stock' ? 'invStockAvg' :
                            product.stockStatus === 'Low Stock' ? 'invStockLow' : 
                            'invStockCritical';
                          
                          const isExpiredProduct = isExpired(product.expirationDate, product.expirationNA);
                          const isExpiringProduct = isExpiringSoon(product.expirationDate, product.expirationNA);
                          const isOutOfStock = product.stockCount === 0;

                          return (
                            <tr 
                              key={productId} 
                              className={`
                                ${isExpiredProduct ? 'invExpiredRow' : ''} 
                                ${isExpiringProduct ? 'invExpiringRow' : ''}
                                ${isOutOfStock ? 'invZeroStockRow' : ''}
                              `}
                            >
                              <td>
                                <input
                                  type="checkbox"
                                  checked={selectedProducts.has(productId)}
                                  onChange={() => toggleProductSelection(productId)}
                                  className="invCheckbox"
                                />
                              </td>
                              <td>{product.code}</td>
                              <td>
                                {product.item}
                                {isOutOfStock && <span className="invOutOfStockTag">OUT OF STOCK</span>}
                              </td>
                              <td>{product.category}</td>
                              <td>₱{product.basePrice.toLocaleString()}</td>
                              <td>₱{product.sellingPrice.toLocaleString()}</td>
                              <td className={isOutOfStock ? 'invCriticalStockCell' : ''}>
                                {product.stockCount}
                              </td>
                              <td>
                                <span className={`invExpirationDate ${
                                  isExpiredProduct ? 'invExpired' : 
                                  isExpiringProduct ? 'invExpiring' : ''
                                }`}>
                                  {product.expirationDate || 'N/A'}
                                  {isExpiredProduct && <span className="invExpiredIndicator">!</span>}
                                  {isExpiringProduct && !isExpiredProduct && (
                                    <span className="invExpiringIndicator">!</span>
                                  )}
                                </span>
                              </td>
                              <td>
                                <span className={`invStockBadge ${stockStatusClass}`}>
                                  {product.stockStatus}
                                  {product.stockStatus === 'Critical Stock' && (
                                    <span className="invCriticalIndicator">!</span>
                                  )}
                                </span>
                              </td>
                              <td>
                                <button 
                                  className="invIconButton"
                                  onClick={() => openEditForm(product)}
                                >
                                  <IoPencilSharp size={15} className="invBlueIcon" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={10} className="invNoData">
                            No products found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {/* Pagination */}
                  <div className="invPagination">
                    <button 
                      onClick={() => setPage(Math.max(0, page - 1))}
                      disabled={page === 0}
                      className="invPaginationBtn"
                    >
                      Previous
                    </button>
                    <span className="invPaginationInfo">
                      Showing {page * itemsPerPage + 1} to {Math.min((page + 1) * itemsPerPage, sortedProducts.length)} of {sortedProducts.length} items
                    </span>
                    <button 
                      onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                      disabled={page >= totalPages - 1}
                      className="invPaginationBtn"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Add/Edit Product Form */
            <div className="invFormContainer">
              <div className="invFormHeader">
                <h2>{viewMode === 'add' ? 'Add New Product' : 'Edit Product'}</h2>
                <button className="invFormClose" onClick={handleCancel}>×</button>
              </div>

              <div className="invFormContent">
                <div className="invFormRow">
                  <div className="invFormGroup">
                    <label>Product Code {viewMode === 'add' && <span className="invRequired">*</span>}</label>
                    <input 
                      type="text"
                      value={formCode}
                      onChange={(e) => {
                        setFormCode(e.target.value);
                        setCharCounts({...charCounts, code: e.target.value.length});
                        setFormErrors({...formErrors, code: validateField('code', e.target.value)});
                      }}
                      disabled={viewMode === 'edit'}
                      maxLength={20}
                      placeholder="Enter product code"
                      className={`invFormInput ${formErrors.code ? 'invError' : ''} ${viewMode === 'edit' ? 'invDisabled' : ''}`}
                    />
                    {viewMode === 'add' && (
                      <>
                        <div className="invCharCount">{charCounts.code}/20</div>
                        {formErrors.code && <div className="invErrorText">{formErrors.code}</div>}
                      </>
                    )}
                  </div>

                  <div className="invFormGroup">
                    <label>Item Name <span className="invRequired">*</span></label>
                    <input 
                      type="text"
                      value={formItem}
                      onChange={(e) => {
                        setFormItem(e.target.value);
                        setCharCounts({...charCounts, item: e.target.value.length});
                        setFormErrors({...formErrors, item: validateField('item', e.target.value)});
                      }}
                      maxLength={50}
                      placeholder="Enter item name"
                      className={`invFormInput ${formErrors.item ? 'invError' : ''}`}
                    />
                    <div className="invCharCount">{charCounts.item}/50</div>
                    {formErrors.item && <div className="invErrorText">{formErrors.item}</div>}
                  </div>
                </div>

                <div className="invFormRow">
                  <div className="invFormGroup">
                    <label>Category <span className="invRequired">*</span></label>
                    <select 
                      value={formCategory}
                      onChange={(e) => {
                        setFormCategory(e.target.value as Category);
                        setFormErrors({...formErrors, category: validateField('category', e.target.value)});
                      }}
                      className={`invFormSelect ${formErrors.category ? 'invError' : ''}`}
                    >
                      <option value="">Select a category</option>
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    {formErrors.category && <div className="invErrorText">{formErrors.category}</div>}
                  </div>

                  <div className="invFormGroup">
                    <label>Expiration Date <span className="invRequired">*</span></label>
                    <input 
                      type="date"
                      value={formExpirationDate ? (() => {
                        const [month, day, year] = formExpirationDate.split('/');
                        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                      })() : ''}
                      onChange={(e) => {
                        const date = e.target.value;
                        if (date) {
                          const [year, month, day] = date.split('-');
                          // Store as MM/DD/YYYY
                          const formattedDate = `${month}/${day}/${year}`;
                          setFormExpirationDate(formattedDate);
                          setFormErrors({...formErrors, expirationDate: validateField('expirationDate', formattedDate)});
                        } else {
                          setFormExpirationDate('');
                          setFormErrors({...formErrors, expirationDate: validateField('expirationDate', '')});
                        }
                      }}
                      disabled={formExpirationNA}
                      className={`invFormInput ${formErrors.expirationDate ? 'invError' : ''} ${formExpirationNA ? 'invDisabled' : ''}`}
                    />
                    <div className="invCheckboxGroup">
                      <label className="invCheckboxLabel">
                        <input
                          type="checkbox"
                          checked={formExpirationNA}
                          onChange={(e) => {
                            setFormExpirationNA(e.target.checked);
                            if (e.target.checked) {
                              setFormExpirationDate('');
                              setFormErrors({...formErrors, expirationDate: ''});
                            }
                          }}
                        />
                        Not Applicable (No Expiration)
                      </label>
                    </div>
                    {formErrors.expirationDate && <div className="invErrorText">{formErrors.expirationDate}</div>}
                  </div>
                </div>

                <div className="invFormRow">
                  <div className="invFormGroup">
                    <label>Base Price (₱) <span className="invRequired">*</span></label>
                    <div className="invPriceInputWrapper">
                      <span className="invPesoSign">₱</span>
                      <input 
                        type="text"
                        value={formBasePrice}
                        onChange={(e) => {
                          const formatted = formatPriceInput(e.target.value);
                          setFormBasePrice(formatted);
                          setFormErrors({...formErrors, basePrice: validateField('basePrice', formatted)});
                        }}
                        placeholder="0.00"
                        className={`invPriceInput ${formErrors.basePrice ? 'invError' : ''}`}
                        maxLength={9}
                      />
                    </div>
                    {formErrors.basePrice && <div className="invErrorText">{formErrors.basePrice}</div>}
                  </div>

                  <div className="invFormGroup">
                    <label>Selling Price (₱) <span className="invRequired">*</span></label>
                    <div className="invPriceInputWrapper">
                      <span className="invPesoSign">₱</span>
                      <input 
                        type="text"
                        value={formSellingPrice}
                        onChange={(e) => {
                          const formatted = formatPriceInput(e.target.value);
                          setFormSellingPrice(formatted);
                          setFormErrors({...formErrors, sellingPrice: validateField('sellingPrice', formatted)});
                        }}
                        placeholder="0.00"
                        className={`invPriceInput ${formErrors.sellingPrice ? 'invError' : ''}`}
                        maxLength={9}
                      />
                    </div>
                    {formErrors.sellingPrice && <div className="invErrorText">{formErrors.sellingPrice}</div>}
                  </div>
                </div>

                {/* Critical Stock Level Field */}
                <div className="invFormRow">
                  <div className="invFormGroup">
                    <label>Critical Stock Level</label>
                    <div className="invStockControl">
                      <button 
                        type="button"
                        className="invStockBtn"
                        onClick={() => handleCriticalStockChange(-1)}
                        disabled={!formUseCriticalStock}
                      >
                        <IoRemoveCircleOutline />
                      </button>
                      <input 
                        type="text"
                        value={formCriticalStockLevel}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^\d]/g, '').slice(0, 6);
                          setFormCriticalStockLevel(value);
                        }}
                        disabled={!formUseCriticalStock}
                        placeholder="10"
                        className={`invStockInput ${!formUseCriticalStock ? 'invDisabled' : ''}`}
                        maxLength={6}
                      />
                      <button 
                        type="button"
                        className="invStockBtn"
                        onClick={() => handleCriticalStockChange(1)}
                        disabled={!formUseCriticalStock}
                      >
                        <IoAddCircleOutline />
                      </button>
                    </div>
                    <div className="invCheckboxGroup">
                      <label className="invCheckboxLabel">
                        <input
                          type="checkbox"
                          checked={formUseCriticalStock}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setFormUseCriticalStock(checked);
                            if (!checked) {
                              setFormCriticalStockLevel('10');
                            }
                          }}
                        />
                        Enable custom critical stock level (Default Level: 10)
                      </label>
                    </div>
                  </div>
                </div>

                {viewMode === 'add' && (
                  <div className="invFormRow">
                    <div className="invFormGroup">
                      <label>Initial Stock Quantity</label>
                      <div className="invStockControl">
                        <button 
                          type="button"
                          className="invStockBtn"
                          onClick={() => handleStockChange(-1)}
                          disabled={formUseMaxQuantity}
                        >
                          <IoRemoveCircleOutline />
                        </button>
                        <input 
                          type="text"
                          value={formStockCount}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^\d]/g, '').slice(0, 6);
                            setFormStockCount(value);
                          }}
                          disabled={formUseMaxQuantity}
                          placeholder="0"
                          maxLength={6}
                          className={`invStockInput ${formUseMaxQuantity ? 'invDisabled' : ''}`}
                        />
                        <button 
                          type="button"
                          className="invStockBtn"
                          onClick={() => handleStockChange(1)}
                          disabled={formUseMaxQuantity}
                        >
                          <IoAddCircleOutline />
                        </button>
                      </div>
                      <div className="invCheckboxGroup">
                        <label className="invCheckboxLabel">
                          <input
                            type="checkbox"
                            checked={formUseMaxQuantity}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setFormUseMaxQuantity(checked);
                              if (checked) {
                                setFormStockCount('999999');
                              } else {
                                setFormStockCount('');
                              }
                            }}
                          />
                          Set as maximum quantity (999,999)
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                <div className="invFormActions">
                  <button className="invCancelBtn" onClick={handleCancel}>
                    Cancel
                  </button>
                  <button className="invSubmitBtn" onClick={handleSaveProduct}>
                    {viewMode === 'add' ? 'Add Product' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Low Stock Sidebar */}
      {showLowStockSidebar && (
        <div className="invSidebarOverlay" onClick={() => setShowLowStockSidebar(false)}>
          <div className="invSidebar" onClick={e => e.stopPropagation()}>
            <div className="invSidebarHeader">
              <div className="invSidebarTitle">
                <IoWarningOutline size={24} color="#ff0000" />
                <h2>Low Stock Items ({lowStockProducts.length})</h2>
              </div>
              <button className="invSidebarClose" onClick={() => setShowLowStockSidebar(false)}>×</button>
            </div>
            
            <div className="invSidebarContent">
              {lowStockProducts.length > 0 ? (
                lowStockProducts.map(product => (
                  <div 
                    key={product.id || product.pk} 
                    className={`invSidebarItem ${product.stockCount <= (product.criticalStockLevel || 10) ? 'invCriticalItem' : ''}`}
                    onClick={() => {
                      setShowLowStockSidebar(false);
                      filterByProduct(product.code);
                    }}
                  >
                    <div className="invSidebarItemInfo">
                      <span className="invSidebarItemName">
                        {product.item}
                        {product.stockCount <= (product.criticalStockLevel || 10) && (
                          <span className="invCriticalTag">CRITICAL</span>
                        )}
                      </span>
                      <span className="invSidebarItemCode">{product.code}</span>
                    </div>
                    <div className="invSidebarItemStock">
                      <span className={`invSidebarStockCount ${product.stockCount <= (product.criticalStockLevel || 10) ? 'invCriticalCount' : ''}`}>
                        {product.stockCount}
                      </span>
                      <span className="invSidebarStockLabel">units left</span>
                    </div>
                    <div className="invSidebarItemArrow">→</div>
                  </div>
                ))
              ) : (
                <div className="invSidebarEmpty">
                  <p>No low stock items</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Expiration Sidebar */}
      {showExpiringSidebar && (
        <div className="invSidebarOverlay" onClick={() => setShowExpiringSidebar(false)}>
          <div className="invSidebar" onClick={e => e.stopPropagation()}>
            <div className="invSidebarHeader">
              <div className="invSidebarTitle">
                <IoCalendarOutline size={24} color="#f57c00" />
                <h2>Expiration Alert ({expirationProducts.length})</h2>
              </div>
              <button className="invSidebarClose" onClick={() => setShowExpiringSidebar(false)}>×</button>
            </div>
            
            <div className="invSidebarContent">
              {expirationProducts.length > 0 ? (
                expirationProducts.map(product => {
                  const isExpiredProduct = isExpired(product.expirationDate, product.expirationNA);
                  
                  return (
                    <div 
                      key={product.id || product.pk} 
                      className={`invSidebarItem ${isExpiredProduct ? 'invExpiredSidebarItem' : 'invExpiringSidebarItem'}`}
                      onClick={() => {
                        setShowExpiringSidebar(false);
                        filterByProduct(product.code);
                      }}
                    >
                      <div className="invSidebarItemInfo">
                        <span className="invSidebarItemName">
                          {product.item}
                          {isExpiredProduct && (
                            <span className="invExpiredTag">EXPIRED</span>
                          )}
                        </span>
                        <span className="invSidebarItemCode">{product.code}</span>
                      </div>
                      <div className="invSidebarItemStock">
                        <span className={`invSidebarStockCount ${isExpiredProduct ? 'invExpiredCount' : 'invExpiringCount'}`}>
                          {product.expirationDate}
                        </span>
                        <span className="invSidebarStockLabel">
                          {isExpiredProduct ? 'expired' : 'expires'}
                        </span>
                      </div>
                      <div className="invSidebarItemArrow">→</div>
                    </div>
                  );
                })
              ) : (
                <div className="invSidebarEmpty">
                  <p>No items expiring soon</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="invModalOverlay" onClick={() => setShowImportModal(false)}>
          <div className="invImportModal" onClick={e => e.stopPropagation()}>
            <div className="invModalHeader">
              <h2>Import Inventory</h2>
              <button className="invModalClose" onClick={() => setShowImportModal(false)}>×</button>
            </div>
            
            <div className="invModalContent">
              <div className="invImportNote">
                <IoAlertCircleOutline size={20} color="#ff9800" />
                <div>
                  <p>Please make sure your file follows the required template format. The template includes the following columns:</p>
                  <ul>
                    <li><strong>Item</strong> - Product name (required)</li>
                    <li><strong>Category</strong> - Category (required)</li>
                    <li><strong>Base Price</strong> - Base price (required)</li>
                    <li><strong>Selling Price</strong> - Selling price (required)</li>
                    <li><strong>Stock Count</strong> - Initial stock (optional)</li>
                    <li><strong>Critical Stock Level</strong> - Low stock threshold (optional)</li>
                    <li><strong>Expiration Date</strong> - MM/YYYY or "N/A" (optional)</li>
                  </ul>
                </div>
              </div>
              
              <div className="invFileUploadArea">
                <input
                  type="file"
                  id="fileUpload"
                  accept=".csv, .xlsx, .xls"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                <label htmlFor="fileUpload" className="invFileUploadLabel">
                  <IoCloudUploadOutline size={32} />
                  <span>{selectedFile ? selectedFile.name : 'Click to select file'}</span>
                  <span className="invFileHint">Supported formats: .csv, .xlsx, .xls</span>
                </label>
              </div>
            </div>

            <div className="invImportActions">
              <div className="invTemplateNote">
                <span>Don't have the template?</span>
                <button className="invTemplateLink" onClick={downloadTemplate}>
                  <IoDownloadOutline /> 
                  Click here to download it
                </button>
              </div>
            </div>
            
            <div className="invModalFooter">
              <button className="invCancelBtn" onClick={() => setShowImportModal(false)}>
                Cancel
              </button>
              <button className="invSubmitBtn" onClick={handleImportSubmit}>
                Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unified Alert Modal */}
      {modalVisible && (
        <div className="invModalOverlay">
          <div className="invAlertModal">
            <div className="invAlertIcon">
              {modalConfig.type === 'success' && <IoCheckmarkCircleOutline size={55} color="#2e9e0c" />}
              {modalConfig.type === 'error' && <IoCloseCircleOutline size={55} color="#d93025" />}
              {modalConfig.type !== 'success' && modalConfig.type !== 'error' && <IoAlertCircleOutline size={55} color="#3d67ee" />}
            </div>
            
            <h3 className="invAlertTitle">{modalConfig.title}</h3>
            
            <div className="invAlertMessage">
              {typeof modalConfig.message === 'string' ? modalConfig.message : modalConfig.message}
            </div>
            
            <div className="invAlertActions">
              {modalConfig.showCancel && (
                <button 
                  onClick={() => {
                    setModalVisible(false);
                    if (modalConfig.onCancel) modalConfig.onCancel();
                  }}
                  className="invAlertBtn invCancelAlertBtn"
                >
                  Cancel
                </button>
              )}
              
              <button 
                onClick={() => {
                  setModalVisible(false);
                  if (modalConfig.onConfirm) modalConfig.onConfirm();
                }}
                className={`invAlertBtn invConfirmAlertBtn ${modalConfig.type === 'error' ? 'invErrorBtn' : ''}`}
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

export { MOCK_PRODUCTS };

export default GlobalInventory;
