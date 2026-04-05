import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../reusable_components/NavBar';
import Notifications from '../reusable_components/Notifications';
import ImportButton from '../reusable_components/ImportBtn';
import ExportButton  from '../reusable_components/ExportBtn';
import { downloadInventoryTemplate } from './pdf_generation/InventoryExcel';

import './GlobalInventoryStyles2.css';
import { 
  IoSearchSharp,
  IoFilterSharp,
  IoAdd,
  IoCheckmarkCircleOutline,
  IoCloseCircleOutline,
  IoAlertCircleOutline,
  IoArrowBackOutline,
  IoDownloadOutline,
  IoCloudUploadOutline,
  IoArrowDownOutline,
  IoRemoveCircleOutline,
  IoAddCircleOutline,
  IoCloseOutline
} from 'react-icons/io5';
import { RiListSettingsLine } from "react-icons/ri";

interface CurrentUser {
  id?: number;
  pk?: number;
  username: string;
  fullName?: string;
  role: string;
  userImage?: string;
}

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
}

interface InventoryTransaction {
  id: number;
  productCode: string;
  productName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  dateReceived: string;
  supplier: string;
  receivedBy: string;
  referenceNumber: string;
  notes?: string;
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
  item?: string;
  basePrice?: string;
  sellingPrice?: string;
  expirationDate?: string;
  category?: string;
  criticalStockLevel?: string;
}

interface BulkItem {
  productId: number;
  productCode: string;
  productName: string;
  quantity: number;
  unitCost: number;
  availableStock: number;
}

type SortOption = 'stockLowToHigh' | 'stockHighToLow' | 'expirationEarliest' | 'expirationLatest' | 'alphabeticalAZ' | 'alphabeticalZA';
type ViewMode = 'list' | 'add' | 'edit';
type Category = 'Pet Supplies' | 'Deworming' | 'Vitamins' | 'Food' | 'Accessories' | 'Medication';

const SORT_OPTIONS = [
  { value: 'stockLowToHigh', label: 'Lowest to Highest Stock' },
  { value: 'stockHighToLow', label: 'Highest to Lowest Stock' },
  { value: 'expirationEarliest', label: 'Expiring Soon First' },
  { value: 'expirationLatest', label: 'Expiring Last First' },
  { value: 'alphabeticalAZ', label: 'Alphabetical A-Z' },
  { value: 'alphabeticalZA', label: 'Alphabetical Z-A' }
];

const CATEGORIES: Category[] = ['Pet Supplies', 'Deworming', 'Vitamins', 'Food', 'Accessories', 'Medication'];
const ROWS_PER_PAGE_OPTIONS = [5, 8, 10, 15, 20, 25, 50];
const API_URL = 'http://localhost:5000';
const BRANCH_ID_BY_NAME: Record<string, number> = {
  Taguig: 1,
  'Las Pinas': 2,
};

const MOCK_PRODUCTS: Product[] = [
  {
    id: 1,
    code: 'PRD-123456-001',
    item: 'Premium Dog Food Adult 5kg',
    category: 'Food',
    basePrice: 850.00,
    sellingPrice: 999.00,
    stockCount: 45,
    stockStatus: 'Average Stock',
    expirationDate: '12/25/2025',
    expirationNA: false,
    dateAdded: '01/15/2024',
    criticalStockLevel: 10
  },
  {
    id: 2,
    code: 'PRD-123457-002',
    item: 'Gourmet Cat Food Fish Flavor 2kg',
    category: 'Food',
    basePrice: 420.00,
    sellingPrice: 549.00,
    stockCount: 12,
    stockStatus: 'Low Stock',
    expirationDate: '03/15/2024',
    expirationNA: false,
    dateAdded: '02/03/2024',
    criticalStockLevel: 10
  },
  {
    id: 3,
    code: 'PRD-123458-003',
    item: 'Interactive Feather Cat Toy',
    category: 'Pet Supplies',
    basePrice: 85.00,
    sellingPrice: 149.00,
    stockCount: 78,
    stockStatus: 'High Stock',
    expirationDate: 'N/A',
    expirationNA: true,
    dateAdded: '01/20/2024',
    criticalStockLevel: 10
  },
  {
    id: 4,
    code: 'PRD-123459-004',
    item: 'Praziquantel Dewormer for Dogs (4 tabs)',
    category: 'Deworming',
    basePrice: 180.00,
    sellingPrice: 249.00,
    stockCount: 34,
    stockStatus: 'Average Stock',
    expirationDate: '08/15/2024',
    expirationNA: false,
    dateAdded: '02/10/2024',
    criticalStockLevel: 10
  },
  {
    id: 5,
    code: 'PRD-123460-005',
    item: 'Multivitamin Paste for Dogs 100g',
    category: 'Vitamins',
    basePrice: 320.00,
    sellingPrice: 399.00,
    stockCount: 8,
    stockStatus: 'Critical Stock',
    expirationDate: '05/20/2024',
    expirationNA: false,
    dateAdded: '01/28/2024',
    criticalStockLevel: 10
  },
  {
    id: 6,
    code: 'PRD-123461-006',
    item: 'Orthopedic Dog Bed Medium Size',
    category: 'Accessories',
    basePrice: 1250.00,
    sellingPrice: 1599.00,
    stockCount: 15,
    stockStatus: 'Low Stock',
    expirationDate: 'N/A',
    expirationNA: true,
    dateAdded: '02/05/2024',
    criticalStockLevel: 10
  },
  {
    id: 7,
    code: 'PRD-123462-007',
    item: 'Flea and Tick Treatment for Cats',
    category: 'Medication',
    basePrice: 450.00,
    sellingPrice: 599.00,
    stockCount: 23,
    stockStatus: 'Average Stock',
    expirationDate: '11/10/2024',
    expirationNA: false,
    dateAdded: '01/12/2024',
    criticalStockLevel: 10
  },
  {
    id: 8,
    code: 'PRD-123463-008',
    item: 'Puppy Formula Dog Food 3kg',
    category: 'Food',
    basePrice: 680.00,
    sellingPrice: 799.00,
    stockCount: 52,
    stockStatus: 'High Stock',
    expirationDate: '09/05/2024',
    expirationNA: false,
    dateAdded: '02/18/2024',
    criticalStockLevel: 10
  },
  {
    id: 9,
    code: 'PRD-123464-009',
    item: 'Professional Dog Grooming Kit',
    category: 'Pet Supplies',
    basePrice: 1250.00,
    sellingPrice: 1499.00,
    stockCount: 9,
    stockStatus: 'Critical Stock',
    expirationDate: 'N/A',
    expirationNA: true,
    dateAdded: '01/30/2024',
    criticalStockLevel: 10
  },
  {
    id: 10,
    code: 'PRD-123465-010',
    item: 'Broad Spectrum Dewormer for Cats',
    category: 'Deworming',
    basePrice: 210.00,
    sellingPrice: 289.00,
    stockCount: 41,
    stockStatus: 'Average Stock',
    expirationDate: '04/12/2024',
    expirationNA: false,
    dateAdded: '02/08/2024',
    criticalStockLevel: 10
  },
  {
    id: 11,
    code: 'PRD-123466-011',
    item: 'Fish Oil Supplement for Pets 250ml',
    category: 'Vitamins',
    basePrice: 550.00,
    sellingPrice: 699.00,
    stockCount: 18,
    stockStatus: 'Low Stock',
    expirationDate: '06/30/2024',
    expirationNA: false,
    dateAdded: '01/22/2024',
    criticalStockLevel: 10
  },
  {
    id: 12,
    code: 'PRD-123467-012',
    item: 'Adjustable Pet Carrier Bag',
    category: 'Accessories',
    basePrice: 890.00,
    sellingPrice: 1099.00,
    stockCount: 27,
    stockStatus: 'Average Stock',
    expirationDate: 'N/A',
    expirationNA: true,
    dateAdded: '02/12/2024',
    criticalStockLevel: 10
  }
];

const GlobalInventoryIN: React.FC = () => {
  const navigate = useNavigate();
  
  // State
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  
  // UI State
  const [searchVisible, setSearchVisible] = useState<boolean>(false);
  const [filterVisible, setFilterVisible] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [modalSearchQuery, setModalSearchQuery] = useState<string>('');
  const [searchHovered, setSearchHovered] = useState<boolean>(false);
  const [filterHovered, setFilterHovered] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [activeFilter, setActiveFilter] = useState<string>('');
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showExportDropdown, setShowExportDropdown] = useState<boolean>(false);
  const [sortOption, setSortOption] = useState<SortOption>('stockLowToHigh');
  const [showSettingsDropdown, setShowSettingsDropdown] = useState<boolean>(false);
  
  // Checkbox selection state for products
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState<boolean>(false);
  
  
  // Transaction modal state
  const [showTransactionModal, setShowTransactionModal] = useState<boolean>(false);
  const [transactionItems, setTransactionItems] = useState<BulkItem[]>([]);
  const [transactionReferenceNumber, setTransactionReferenceNumber] = useState<string>('');
  const [transactionSupplier, setTransactionSupplier] = useState<string>('');
  const [transactionNotes, setTransactionNotes] = useState<string>('');

  // Filter States
  const [categoryFilter, setCategoryFilter] = useState<string>("defaultCategory");
  const [stockStatusFilter, setStockStatusFilter] = useState<string>("defaultStatus");

  // Pagination
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(8);
  const itemsPerPage = rowsPerPage;

  const [selectedBranch, setSelectedBranch] = useState<string>('All');

  // Form States for Product
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formItem, setFormItem] = useState<string>('');
  const [formCategory, setFormCategory] = useState<Category | ''>('');
  const [formBasePrice, setFormBasePrice] = useState<string>('');
  const [formSellingPrice, setFormSellingPrice] = useState<string>('');
  const [formExpirationDate, setFormExpirationDate] = useState<string>('');
  const [formExpirationNA, setFormExpirationNA] = useState<boolean>(false);
  const [formCriticalStockLevel, setFormCriticalStockLevel] = useState<string>('10');
  const [formUseCriticalStock, setFormUseCriticalStock] = useState<boolean>(false);

  // Add these with your other state variables
  const [supplierError, setSupplierError] = useState<string>('');
  const [quantityErrors, setQuantityErrors] = useState<Record<number, string>>({});
  const [missingQuantityCount, setMissingQuantityCount] = useState<number>(0);

  // Character counts
  const [charCounts, setCharCounts] = useState({
    item: 0
  });

  // Form Errors
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Modal States
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [modalConfig, setModalConfig] = useState<ModalConfig>({
    type: 'info',
    title: '',
    message: '',
    showCancel: false
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
      }
    } catch (error) {
      console.log('Error loading user session', error);
    }
  };

  // Generate random reference number
  const generateReferenceNumber = (): string => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `GRN-${year}${month}${day}-${hours}${minutes}${seconds}-${random}`;
  };

  // Check if date is expired
  const isExpired = (expirationDate?: string, expirationNA?: boolean): boolean => {
    if (expirationNA || !expirationDate || expirationDate === 'N/A') return false;
    
    const [month, day, year] = expirationDate.split('/');
    const expDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return expDate < today;
  };

  // Check if date is expiring within a month
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

  // Format date for display
  const formatExpirationDate = (dateString?: string): string => {
    if (!dateString || dateString === 'N/A') return 'N/A';
    const [month, day, year] = dateString.split('/');
    return `${month}/${day}/${year}`;
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

  // Fetch products
  const fetchProducts = async (): Promise<void> => {
    setLoading(true);
    try {
      const branchId = BRANCH_ID_BY_NAME[selectedBranch];
      const endpoint = branchId
        ? `${API_URL}/api/inventory/items?branch_id=${branchId}`
        : `${API_URL}/api/inventory/items`;
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`Failed to fetch inventory data (${response.status})`);
      }

      const data = await response.json();
      const items = Array.isArray(data?.items) ? data.items : [];
      setProducts(items);
    } catch (error) {
      console.error(error);
      showAlert('error', 'Error', 'Failed to fetch inventory data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedBranch]);

  useEffect(() => {
    loadCurrentUser();
  }, []);


useEffect(() => {
  const count = transactionItems.filter(item => item.quantity <= 0).length;
  setMissingQuantityCount(count);
}, [transactionItems]);

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

  // Clear all filters
  const handleReturnToList = () => {
    setCategoryFilter("defaultCategory");
    setStockStatusFilter("defaultStatus");
    setSearchQuery("");
    setActiveFilter("");
    setPage(0);
    setSelectedProducts(new Set());
    setSelectAll(false);
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
    setSelectAll(false);
  };

  // Logout Handler
  const handleLogoutPress = (): void => {
    showAlert('confirm', 'Log Out', 'Are you sure you want to log out?', async () => {
      localStorage.removeItem('userSession');
      navigate('/login');
    }, undefined, true);
  };

  // Handle checkbox selection
  const handleSelectProduct = (productId: number) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
    
    const enabledProducts = products.filter(p => p.stockCount >= 0);
    const allEnabledSelected = enabledProducts.length > 0 && 
      enabledProducts.every(p => newSelected.has(p.id || p.pk || 0));
    setSelectAll(allEnabledSelected);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedProducts(new Set());
      setSelectAll(false);
    } else {
      const allIds = products.map(p => p.id || p.pk || 0);
      setSelectedProducts(new Set(allIds));
      setSelectAll(true);
    }
  };

  // Open transaction modal
  const openReceiveStockModal = () => {
    if (selectedProducts.size === 0) {
      showAlert('error', 'No Selection', 'Please select at least one product to receive stock.');
      return;
    }
    
    const items: BulkItem[] = Array.from(selectedProducts).map(id => {
      const product = products.find(p => (p.id || p.pk || 0) === id);
      return {
        productId: id,
        productCode: product?.code || '',
        productName: product?.item || '',
        quantity: 0,
        unitCost: product?.basePrice || 0,
        availableStock: product?.stockCount || 0
      };
    });
    
    setTransactionItems(items);
    setTransactionReferenceNumber(generateReferenceNumber());
    setTransactionSupplier('');
    setTransactionNotes('');
    setShowTransactionModal(true);
  };

  // Handle quick add for transaction modal
  const handleModalQuickAdd = (index: number, amount: number) => {
    const newItems = [...transactionItems];
    const item = newItems[index];
    const newQuantity = item.quantity + amount;
    if (newQuantity <= 999999 && newQuantity >= 0) {
      item.quantity = newQuantity;
      setTransactionItems(newItems);
    }
  };

  // Handle quantity change in modal
  const handleModalQuantityChange = (index: number, value: number) => {
    const newItems = [...transactionItems];
    const newQty = Math.min(Math.max(0, value), 999999);
    newItems[index].quantity = newQty;
    setTransactionItems(newItems);
  };

const saveTransaction = async () => {
  let hasError = false;
  
  // Validate supplier
  if (!transactionSupplier.trim()) {
    setSupplierError('Supplier name is required');
    hasError = true;
  } else if (transactionSupplier.length > 50) {
    setSupplierError('Supplier name must not exceed 50 characters');
    hasError = true;
  } else {
    setSupplierError('');
  }
  
  if (transactionItems.length === 0) {
    showAlert('error', 'No Items', 'No items to process.');
    return;
  }
  
  // Validate quantities for each item
  const newQuantityErrors: Record<number, string> = {};
  let hasQuantityError = false;
  
  transactionItems.forEach((item, index) => {
    if (item.quantity <= 0) {
      newQuantityErrors[index] = 'Quantity is required';
      hasQuantityError = true;
    } else if (item.quantity > 999999) {
      newQuantityErrors[index] = 'Quantity cannot exceed 999,999';
      hasQuantityError = true;
    }
  });
  
  setQuantityErrors(newQuantityErrors);
  
  if (hasQuantityError) {
    hasError = true;
  }
  
  if (hasError) {
    // Scroll to the first error
    const firstError = document.querySelector('.invErrorText');
    if (firstError) {
      firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }
  
  try {
    const branchId = BRANCH_ID_BY_NAME[selectedBranch] ?? 1;
    const response = await fetch(`${API_URL}/api/inventory/stock-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        branch_id: branchId,
        referenceNumber: transactionReferenceNumber,
        supplier: transactionSupplier.trim(),
        notes: transactionNotes.trim(),
        processedBy: currentUser?.id || currentUser?.pk,
        items: transactionItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitCost: item.unitCost,
        })),
      }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.error || 'Failed to record stock receipt.');
    }

    await fetchProducts();
    setTransactions([]);
    setSelectedProducts(new Set());
    setSelectAll(false);
    setShowTransactionModal(false);
    setModalSearchQuery('');
    setSupplierError('');
    setQuantityErrors({});
    setTransactionItems([]);

    const savedReferenceNumber = result?.transaction?.reference_number || transactionReferenceNumber;

    showAlert(
      'success',
      'Stock Received',
      `Successfully received ${transactionItems.length} item(s). Reference: ${savedReferenceNumber}`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to record stock receipt.'
    showAlert('error', 'Error', message)
  }
};
  // Determine stock status
  const determineStockStatus = (count: number, criticalLevel: number): 'High Stock' | 'Average Stock' | 'Low Stock' | 'Critical Stock' => {
    if (count <= criticalLevel) return 'Critical Stock';
    if (count <= criticalLevel + 10) return 'Low Stock';
    if (count >= 50) return 'High Stock';
    return 'Average Stock';
  };

  // Format price input
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

  // Reset product form
  const resetProductForm = (): void => {
    setFormItem('');
    setFormCategory('');
    setFormBasePrice('');
    setFormSellingPrice('');
    setFormExpirationDate('');
    setFormExpirationNA(false);
    setFormCriticalStockLevel('10');
    setFormUseCriticalStock(false);
    setEditingId(null);
    setCharCounts({ item: 0 });
    setFormErrors({});
  };

  // Cancel Handler for product form
  const handleCancel = (): void => {
    let hasUnsavedChanges = false;
    
    if (viewMode === 'add') {
      hasUnsavedChanges = !!(formItem || formBasePrice || formSellingPrice || formExpirationDate || formCategory);
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
        resetProductForm();
      }, undefined, true);
    } else {
      setViewMode('list');
      resetProductForm();
    }
  };


  // Validation functions for product
  const validateField = (field: string, value: string): string => {
    switch(field) {
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
          const parts = value.split('/');
          if (parts.length !== 3) return 'Invalid date format';
          const month = parseInt(parts[0]);
          const day = parseInt(parts[1]);
          const year = parseInt(parts[2]);
          if (isNaN(month) || isNaN(day) || isNaN(year)) return 'Invalid date';
          if (month < 1 || month > 12) return 'Month must be between 01 and 12';
          if (day < 1 || day > 31) return 'Day must be between 01 and 31';
          if (year < 2024 || year > 2100) return 'Year must be between 2024 and 2100';
          
          // Check if date is valid (e.g., not Feb 30)
          const testDate = new Date(year, month - 1, day);
          if (testDate.getMonth() !== month - 1 || testDate.getDate() !== day) {
            return 'Invalid date (e.g., February 30 is not valid)';
          }
        }
        return '';
        
      case 'criticalStockLevel':
        const level = parseInt(value);
        if (isNaN(level) || level < 1) return 'Critical stock level must be at least 1';
        if (level > 999999) return 'Critical stock level cannot exceed 999,999';
        return '';
        
      default:
        return '';
    }
  };

  const validateProductForm = (): boolean => {
    const errors: FormErrors = {};
    
    errors.item = validateField('item', formItem);
    errors.category = validateField('category', formCategory as string);
    errors.basePrice = validateField('basePrice', formBasePrice);
    errors.sellingPrice = validateField('sellingPrice', formSellingPrice);
    if (!formExpirationNA) {
      errors.expirationDate = validateField('expirationDate', formExpirationDate);
    }
    if (formUseCriticalStock) {
      errors.criticalStockLevel = validateField('criticalStockLevel', formCriticalStockLevel);
    }
    
    setFormErrors(errors);
    
    return !Object.values(errors).some(error => error);
  };

  // Save Product
  const handleSaveProduct = async (): Promise<void> => {
    if (!validateProductForm()) {
      return;
    }

    const existingProduct = viewMode === 'edit' ? products.find(p => p.id === editingId || p.pk === editingId) : null;
    const criticalLevel = formUseCriticalStock ? parseInt(formCriticalStockLevel) : 10;
    const stockCount = existingProduct?.stockCount || 0;
    const branchId = BRANCH_ID_BY_NAME[selectedBranch] ?? 1;
    
    const productData = {
      branch_id: branchId,
      code: viewMode === 'add' ? '' : (existingProduct?.code || ''),
      item: formItem,
      category: formCategory as Category,
      basePrice: parseFloat(formBasePrice),
      sellingPrice: parseFloat(formSellingPrice),
      stockCount: stockCount,
      expirationDate: formExpirationNA ? '' : formExpirationDate,
      expirationNA: formExpirationNA,
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

            await fetchProducts();
            setViewMode('list');
            resetProductForm();
            showAlert('success', 'Product Added', `Product "${formItem}" has been added successfully and is ready for stock-in recording.`);
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

            await fetchProducts();
            setViewMode('list');
            resetProductForm();
            showAlert('success', 'Success', 'Product updated successfully!');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to save product information.';
          showAlert('error', 'Error', message);
        }
      }, undefined, true);
  };

  const handleCriticalStockChange = (delta: number) => {
    const currentValue = parseInt(formCriticalStockLevel) || 10;
    const newValue = Math.max(1, currentValue + delta);
    setFormCriticalStockLevel(Math.min(newValue, 999999).toString());
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
      `Are you sure you want to import data from "${selectedFile.name}"?`, 
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
    const headers = ['Item', 'Category', 'Base Price', 'Selling Price', 'Critical Stock Level', 'Expiration Date (MM/DD/YYYY)'];
    const sampleData = [
      ['Premium Dog Food Adult 5kg', 'Food', '850', '999', '10', '12/25/2025'],
      ['Gourmet Cat Food Fish Flavor 2kg', 'Food', '420', '549', '10', '03/15/2024'],
      ['Interactive Feather Cat Toy', 'Pet Supplies', '85', '149', '10', 'N/A']
    ];
    
    const csvContent = [headers, ...sampleData].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventory_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Sort products
  const sortProducts = (productsToSort: Product[]): Product[] => {
    const sorted = [...productsToSort];
    
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
          
          const aDate = a.expirationNA || a.expirationDate === 'N/A' ? null : a.expirationDate;
          const bDate = b.expirationNA || b.expirationDate === 'N/A' ? null : b.expirationDate;
          
          if (!aDate && !bDate) return 0;
          if (!aDate) return 1;
          if (!bDate) return -1;
          
          const [aMonth, aDay, aYear] = aDate.split('/');
          const [bMonth, bDay, bYear] = bDate.split('/');
          const aTime = new Date(parseInt(aYear), parseInt(aMonth) - 1, parseInt(aDay)).getTime();
          const bTime = new Date(parseInt(bYear), parseInt(bMonth) - 1, parseInt(bDay)).getTime();
          return aTime - bTime;
        });
      case 'expirationLatest':
        return sorted.sort((a, b) => {
          const aDate = a.expirationNA || a.expirationDate === 'N/A' ? null : a.expirationDate;
          const bDate = b.expirationNA || b.expirationDate === 'N/A' ? null : b.expirationDate;
          
          if (!aDate && !bDate) return 0;
          if (!aDate) return 1;
          if (!bDate) return -1;
          
          const [aMonth, aDay, aYear] = aDate.split('/');
          const [bMonth, bDay, bYear] = bDate.split('/');
          const aTime = new Date(parseInt(aYear), parseInt(aMonth) - 1, parseInt(aDay)).getTime();
          const bTime = new Date(parseInt(bYear), parseInt(bMonth) - 1, parseInt(bDay)).getTime();
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

  // Filter Logic
  const filteredProducts = products.filter(product => {
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

  return (
    <div className="invContainer">
      <Navbar currentUser={currentUser} onLogout={handleLogoutPress} />
      
      <div className="invBodyContainer">
        <div className="invTopContainer">
          <div className="invSubTopContainer" style={{paddingLeft: '30px'}}>
            <div className="invSubTopLeft">
              <IoArrowDownOutline size={23} className="invBlueIcon" />
              <span className="invBlueText">Inventory IN</span>
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
              onViewAll={() => {}}
              onNotificationClick={() => {}}
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="invTableContainerOUT">
          {viewMode === 'list' ? (
            <>
              {/* Table Toolbar */}
              <div className="invTableToolbar">
                <div className="invSearchFilterSection">
                  {/* Search */}
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

                  {/* Filter */}
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
                            onChange={(e) => setRowsPerPage(parseInt(e.target.value))}
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
                  {activeFilter && (
                    <button className="invReturnBtn" onClick={handleReturnToList}>
                      <IoArrowBackOutline /> Return to Full List
                    </button>
                  )}
                  {/* Receive Stock Button */}
                  <button 
                    className="invRecordTransactionBtn"
                    onClick={openReceiveStockModal}
                    disabled={selectedProducts.size === 0}
                  >
                    <IoAdd /> Receive Stock ({selectedProducts.size} item{selectedProducts.size !== 1 ? 's' : ''} selected)
                  </button>
                  
                  {/* Add Product Button */}
                  <button className="invBlackBtn" onClick={() => { resetProductForm(); setViewMode('add'); }}>
                    <IoAdd /> Add Product
                  </button>
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
                            checked={selectAll && paginatedProducts.length > 0}
                            onChange={handleSelectAll}
                            className="invCheckbox"
                          />
                        </th>
                        <th style={{ width: '150px' }}>Code</th>
                        <th>Item</th>
                        <th>Category</th>
                        <th>Base Price</th>
                        <th>Selling Price</th>
                        <th>Current Stock</th>
                        <th>Expiration</th>
                        <th>Status</th>
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
                          const isSelected = selectedProducts.has(productId);

                          return (
                            <tr 
                              key={productId} 
                              className={`
                                ${isExpiredProduct ? 'invExpiredRow' : ''} 
                                ${isExpiringProduct ? 'invExpiringRow' : ''}
                                ${isSelected ? 'invSelectedRow' : ''}
                              `}
                            >
                              <td>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleSelectProduct(productId)}
                                  className="invCheckbox"
                                />
                              </td>
                              <td>{product.code}</td>
                              <td>{product.item}</td>
                              <td>{product.category}</td>
                              <td>₱{product.basePrice.toLocaleString()}</td>
                              <td>₱{product.sellingPrice.toLocaleString()}</td>
                              <td className={product.stockCount <= (product.criticalStockLevel || 10) ? 'invCriticalStockCell' : ''}>
                                {product.stockCount}
                               </td>
                              <td>
                                <span className={`invExpirationDate ${
                                  isExpiredProduct ? 'invExpired' : 
                                  isExpiringProduct ? 'invExpiring' : ''
                                }`}>
                                  {formatExpirationDate(product.expirationDate)}
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
                             </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={9} className="invNoData">
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
            /* Add/Edit Product Form - New Layout */
            <div className="invFormContainer">
              <div className="invFormHeader">
                <h2>{viewMode === 'add' ? 'Add New Product' : 'Edit Product'}</h2>
                <button className="invFormClose" onClick={handleCancel}>×</button>
              </div>

              <div className="invFormContent">
                {/* Row 1: Item Name | Category */}
                <div className="invFormRow">
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
                </div>

                {/* Row 2: Base Price | Selling Price */}
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

                {/* Row 3: Critical Stock Level | Expiration Date */}
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
                          setFormErrors({...formErrors, criticalStockLevel: validateField('criticalStockLevel', value)});
                        }}
                        disabled={!formUseCriticalStock}
                        placeholder="10"
                        className={`invStockInput ${!formUseCriticalStock ? 'invDisabled' : ''} ${formErrors.criticalStockLevel ? 'invError' : ''}`}
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
                              setFormErrors({...formErrors, criticalStockLevel: ''});
                            }
                          }}
                        />
                        Enable custom critical stock level (Default Level: 10)
                      </label>
                    </div>
                    {formErrors.criticalStockLevel && <div className="invErrorText">{formErrors.criticalStockLevel}</div>}
                  </div>

                  <div className="invFormGroup">
                    <label>Expiration Date <span className="invRequired">*</span></label>
                    <input 
                      type="date"
                      value={formExpirationDate ? (() => {
                        // Convert MM/DD/YYYY to YYYY-MM-DD for date input
                        const parts = formExpirationDate.split('/');
                        if (parts.length === 3) {
                          return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
                        }
                        return '';
                      })() : ''}
                      onChange={(e) => {
                        const date = e.target.value;
                        if (date) {
                          const [year, month, day] = date.split('-');
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
{/* Receive Stock Modal */}
{showTransactionModal && (
  <div className="invModalOverlay" onClick={() => setShowTransactionModal(false)}>
    <div className="invBulkModal" onClick={e => e.stopPropagation()}>
      <div className="invModalHeader">
        <h2>Receive Stock</h2>
        <button className="invModalClose" onClick={() => setShowTransactionModal(false)}>×</button>
      </div>
      
      <div className="invModalContent">
        <div className="invFormRow">
          <div className="invFormGroup">
            <label>Reference Number</label>
            <input
              type="text"
              value={transactionReferenceNumber}
              disabled
              className="invFormInput invDisabledInput"
            />
          </div>
        </div>

        <div className="invFormRow">
          <div className="invFormGroup">
            <label>Supplier / Received From <span className="invRequired">*</span></label>
            <div className="invInputWrapper">
              <input
                type="text"
                value={transactionSupplier}
                onChange={(e) => {
                  setTransactionSupplier(e.target.value);
                  if (supplierError) setSupplierError('');
                }}
                placeholder="Enter supplier name (Max 50 chars)"
                maxLength={50}
                className={`invInputWithCounter ${supplierError ? 'invError' : ''}`}
              />
              <span className={`invCharCounterInside ${
                transactionSupplier.length >= 45 ? 'invCharCounterInsideNearLimit' : ''
              } ${transactionSupplier.length === 50 ? 'invCharCounterInsideAtLimit' : ''}`}>
                {transactionSupplier.length}/50
              </span>
            </div>
            {supplierError && <div className="invErrorText">{supplierError}</div>}
          </div>
        </div>

        {/* Search Bar */}
        <div className="invModalSearchBar">
          <div className="invSearchInputWrapper">
            <IoSearchSharp size={18} className="invSearchIcon" />
            <input
              type="text"
              placeholder="Search by product code or name..."
              value={modalSearchQuery}
              onChange={(e) => setModalSearchQuery(e.target.value)}
              className="invModalSearchInput"
            />
            {modalSearchQuery && (
              <button 
                className="invClearSearchBtn"
                onClick={() => setModalSearchQuery('')}
              >
                <IoCloseOutline size={16} />
              </button>
            )}
          </div>
          <div className="invMissingAlert">
            {missingQuantityCount > 0 && (
              <span className="invMissingWarning">
                ⚠️ {missingQuantityCount} item(s) missing quantity
              </span>
            )}
          </div>
        </div>

        <div className="invBulkItemsSection">
          <label>Items to Receive (Enter quantities below)</label>
          <div className="invBulkItemsTable">
            <table className="invBulkItemsTableInner">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}></th>
                  <th>Product Code</th>
                  <th>Product Name</th>
                  <th>Unit Cost</th>
                  <th>Current Stock</th>
                  <th>Quantity to Receive</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {transactionItems
                  .filter(item => 
                    modalSearchQuery === '' || 
                    item.productCode.toLowerCase().includes(modalSearchQuery.toLowerCase()) ||
                    item.productName.toLowerCase().includes(modalSearchQuery.toLowerCase())
                  )
                  .map((item, index) => {
                    const originalIndex = transactionItems.findIndex(i => i.productId === item.productId);
                    const hasMissingQuantity = item.quantity <= 0;
                    
                    return (
                      <tr key={index} className={hasMissingQuantity ? 'invMissingRow' : ''}>
                        <td className="invRemoveCell">
                          <button 
                            className="invRemoveRowBtn"
                            onClick={() => {
                              const newItems = [...transactionItems];
                              newItems.splice(originalIndex, 1);
                              setTransactionItems(newItems);
                            }}
                            title="Remove item"
                          >
                            <IoCloseOutline size={18} />
                          </button>
                        </td>
                        <td>{item.productCode}</td>
                        <td>{item.productName}</td>
                        <td>₱{item.unitCost.toLocaleString()}</td>
                        <td>{item.availableStock}</td>
                        <td>
                          <div className="invModalQuantityControls">
                            <input
                              type="number"
                              className={`invBulkQtyInput ${hasMissingQuantity ? 'invMissingInput' : ''}`}
                              value={item.quantity || ''}
                              onChange={(e) => {
                                handleModalQuantityChange(originalIndex, parseInt(e.target.value) || 0);
                                // Clear error when user starts typing
                                if (quantityErrors[originalIndex]) {
                                  setQuantityErrors(prev => ({ ...prev, [originalIndex]: '' }));
                                }
                              }}
                              min="0"
                              max="999999"
                              placeholder="0"
                            />
                            <button 
                              className="invQtyBtn invQtyBtnSmall invQtyAddBtn"
                              onClick={() => {
                                handleModalQuickAdd(originalIndex, 5);
                                if (quantityErrors[originalIndex]) {
                                  setQuantityErrors(prev => ({ ...prev, [originalIndex]: '' }));
                                }
                              }}
                            >
                              +5
                            </button>
                            <button 
                              className="invQtyBtn invQtyBtnSmall invQtyAddBtn"
                              onClick={() => {
                                handleModalQuickAdd(originalIndex, 10);
                                if (quantityErrors[originalIndex]) {
                                  setQuantityErrors(prev => ({ ...prev, [originalIndex]: '' }));
                                }
                              }}
                            >
                              +10
                            </button>
                          </div>
                          {quantityErrors[originalIndex] && (
                            <div className="invErrorText invQuantityError">{quantityErrors[originalIndex]}</div>
                          )}
                        </td>
                        <td>₱{(item.quantity * item.unitCost).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                {transactionItems.filter(item => 
                  modalSearchQuery === '' || 
                  item.productCode.toLowerCase().includes(modalSearchQuery.toLowerCase()) ||
                  item.productName.toLowerCase().includes(modalSearchQuery.toLowerCase())
                ).length === 0 && (
                  <tr>
                    <td colSpan={7} className="invNoSearchResults">
                      No products found matching "{modalSearchQuery}"
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={6} className="invBulkTotalLabel">Total:</td>
                  <td className="invBulkTotalValue">
                    ₱{transactionItems.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0).toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="invFormGroup">
          <label>Notes</label>
          <div className="invTextareaWrapper">
            <textarea
              value={transactionNotes}
              onChange={(e) => setTransactionNotes(e.target.value)}
              placeholder="Optional notes for this transaction..."
              className="invTextareaWithCounter"
              rows={3}
              maxLength={200}
            />
            <span className={`invTextareaCounterInside ${
              transactionNotes.length >= 180 ? 'invCharCounterInsideNearLimit' : ''
            } ${transactionNotes.length === 200 ? 'invCharCounterInsideAtLimit' : ''}`}>
              {transactionNotes.length}/200
            </span>
          </div>
        </div>
      </div>
      
      <div className="invModalFooter">
        <button className="invCancelBtn" onClick={() => {
          setShowTransactionModal(false);
          setModalSearchQuery('');
          setSupplierError('');
          setQuantityErrors({});
        }}>
          Cancel
        </button>
        <button className="invSubmitBtn" onClick={saveTransaction}>
          Process Receipt
        </button>
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
                    <li><strong>Critical Stock Level</strong> - Low stock threshold (optional)</li>
                    <li><strong>Expiration Date</strong> - MM/DD/YYYY or "N/A" (optional)</li>
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

export default GlobalInventoryIN;
