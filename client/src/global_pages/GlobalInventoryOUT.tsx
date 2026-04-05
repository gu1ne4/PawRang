import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../reusable_components/NavBar';
import Notifications from '../reusable_components/Notifications';
import ImportButton from '../reusable_components/ImportBtn';
import ExportButton  from '../reusable_components/ExportBtn';
import { downloadInventoryTemplate } from './pdf_generation/InventoryExcel';
import './GlobalInventoryStyles2.css';
import { 
  IoArrowBackOutline,
  IoSearchSharp,
  IoFilterSharp,
  IoCheckmarkCircleOutline,
  IoCloseCircleOutline,
  IoAlertCircleOutline,
  IoDownloadOutline,
  IoCloudUploadOutline,
  IoArrowUpOutline,
  IoDocumentTextOutline,
  IoCloseOutline
} from 'react-icons/io5';
import { RiListSettingsLine } from "react-icons/ri";

interface CurrentUser {
  id?: string | number;
  pk?: string | number;
  username: string;
  fullName?: string;
  role: string;
  userImage?: string;
}

interface Product {
  id?: number;
  pk?: number;
  branchId?: number;
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
  criticalStockLevel?: number;
}


interface ModalConfig {
  type: 'info' | 'success' | 'error' | 'confirm';
  title: string;
  message: React.ReactNode;
  onConfirm?: () => void;
  showCancel: boolean;
}

interface BulkItem {
  productId: number;
  branchId?: number;
  productCode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  availableStock: number;
}

type SortOption = 'stockLowToHigh' | 'stockHighToLow' | 'expirationEarliest' | 'expirationLatest' | 'alphabeticalAZ' | 'alphabeticalZA';

const SORT_OPTIONS = [
  { value: 'stockLowToHigh', label: 'Lowest to Highest Stock' },
  { value: 'stockHighToLow', label: 'Highest to Lowest Stock' },
  { value: 'expirationEarliest', label: 'Expiring Soon First' },
  { value: 'expirationLatest', label: 'Expiring Last First' },
  { value: 'alphabeticalAZ', label: 'Alphabetical A-Z' },
  { value: 'alphabeticalZA', label: 'Alphabetical Z-A' }
];

const ROWS_PER_PAGE_OPTIONS = [5, 8, 10, 15, 20, 25, 50];
const API_URL = 'http://localhost:5000';
const BRANCH_ID_BY_NAME: Record<string, number> = {
  Taguig: 1,
  'Las Pinas': 2,
};

const GlobalInventoryOUT: React.FC = () => {
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
  const [activeFilter, setActiveFilter] = useState<string>('');
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rowsPerPage, setRowsPerPage] = useState<number>(8);
  const [showExportDropdown, setShowExportDropdown] = useState<boolean>(false);
  const [sortOption, setSortOption] = useState<SortOption>('stockLowToHigh');
  const [showSettingsDropdown, setShowSettingsDropdown] = useState<boolean>(false);
  
  // Checkbox selection state
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState<boolean>(false);
  
  // Quantity modifications for each product
  const [quantityMods, setQuantityMods] = useState<Record<number, number>>({});
  
  // Transaction modal state
  const [showTransactionModal, setShowTransactionModal] = useState<boolean>(false);
  const [transactionItems, setTransactionItems] = useState<BulkItem[]>([]);
  const [transactionReferenceNumber, setTransactionReferenceNumber] = useState<string>('');
  const [transactionIssuedTo, setTransactionIssuedTo] = useState<string>('');
  const [transactionReason, setTransactionReason] = useState<string>('Sale');
  const [transactionOtherReason, setTransactionOtherReason] = useState<string>('');
  const [transactionNotes, setTransactionNotes] = useState<string>('');

const [modalSearchQuery, setModalSearchQuery] = useState<string>('');

  // Validation errors for modal
  const [issuedToError, setIssuedToError] = useState<string>('');
  const [otherReasonError, setOtherReasonError] = useState<string>('');

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

  const [selectedBranch, setSelectedBranch] = useState<string>('All');

  // Helper Functions
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

  const generateReferenceNumber = (): string => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `SOT-${year}${month}${day}-${hours}${minutes}${seconds}-${random}`;
  };

  // Check if date is expired
  const isExpired = (expirationDate?: string, expirationNA?: boolean): boolean => {
    if (expirationNA || !expirationDate || expirationDate === 'N/A') return false;
    
    const [month, year] = expirationDate.split('/');
    const expDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const today = new Date();
    
    return expDate < today;
  };

  // Check if date is expiring within a month (and not expired)
  const isExpiringSoon = (expirationDate?: string, expirationNA?: boolean): boolean => {
    if (expirationNA || !expirationDate || expirationDate === 'N/A') return false;
    if (isExpired(expirationDate, expirationNA)) return false;
    
    const [month, year] = expirationDate.split('/');
    const expDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const today = new Date();
    const oneMonthFromNow = new Date();
    oneMonthFromNow.setMonth(today.getMonth() + 1);
    
    return expDate <= oneMonthFromNow;
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
    }, true);
  };

  // Handle checkbox selection
  const handleSelectProduct = (productId: number) => {
    const product = products.find(p => (p.id || p.pk || 0) === productId);
    if (product && product.stockCount === 0) return;
    
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
    
    const enabledProducts = products.filter(p => p.stockCount > 0);
    const allEnabledSelected = enabledProducts.length > 0 && 
      enabledProducts.every(p => newSelected.has(p.id || p.pk || 0));
    setSelectAll(allEnabledSelected);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedProducts(new Set());
      setSelectAll(false);
    } else {
      const enabledIds = products
        .filter(p => p.stockCount > 0)
        .map(p => p.id || p.pk || 0);
      setSelectedProducts(new Set(enabledIds));
      setSelectAll(true);
    }
  };

  // Open transaction modal
  const openTransactionModal = () => {
    if (selectedProducts.size === 0) {
      showAlert('error', 'No Selection', 'Please select at least one product for transaction.');
      return;
    }
    
    const items: BulkItem[] = Array.from(selectedProducts).map(id => {
      const product = products.find(p => (p.id || p.pk || 0) === id);
      const currentQty = quantityMods[id] || 0;
      return {
        productId: id,
        branchId: product?.branchId,
        productCode: product?.code || '',
        productName: product?.item || '',
        quantity: currentQty,
        unitPrice: product?.sellingPrice || 0,
        availableStock: product?.stockCount || 0
      };
    });

    const branchIds = Array.from(new Set(items.map(item => item.branchId).filter((value): value is number => typeof value === 'number')));
    if (branchIds.length > 1) {
      showAlert('error', 'Multiple Branches Selected', 'Please select products from only one branch when recording stock out.');
      return;
    }
    
    setTransactionItems(items);
    setTransactionReferenceNumber(generateReferenceNumber());
    setTransactionIssuedTo('Customer');
    setTransactionReason('Sale');
    setTransactionOtherReason('');
    setTransactionNotes('');
    setIssuedToError('');
    setOtherReasonError('');
    setShowTransactionModal(true);
  };

  // Handle quick subtract for transaction modal
  const handleModalQuickSubtract = (index: number, amount: number) => {
    const newItems = [...transactionItems];
    const item = newItems[index];
    const newQuantity = item.quantity + amount;
    if (newQuantity <= item.availableStock && newQuantity >= 0) {
      item.quantity = newQuantity;
      setTransactionItems(newItems);
    } else if (newQuantity > item.availableStock) {
      showAlert('error', 'Insufficient Stock', `Only ${item.availableStock} units available.`);
    }
  };

  // Handle quantity change in modal
  const handleModalQuantityChange = (index: number, value: number) => {
    const newItems = [...transactionItems];
    const newQty = Math.min(Math.max(0, value), newItems[index].availableStock);
    newItems[index].quantity = newQty;
    setTransactionItems(newItems);
  };

  const handleIssuedToChange = (value: string) => {
    setTransactionIssuedTo(value);
    if (transactionReason === 'Sale') {
      if (!value.trim()) {
        setIssuedToError('Customer name is required');
      } else if (value.length > 50) {
        setIssuedToError('Maximum 50 characters');
      } else {
        setIssuedToError('');
      }
    }
  };

  const handleOtherReasonChange = (value: string) => {
    setTransactionOtherReason(value);
    if (value.length > 50) {
      setOtherReasonError('Maximum 50 characters');
    } else if (!value.trim()) {
      setOtherReasonError('Please specify the reason');
    } else {
      setOtherReasonError('');
    }
  };

  const handleNotesChange = (value: string) => {
    if (value.length <= 200) {
      setTransactionNotes(value);
    }
  };

  const saveTransaction = async () => {
    let hasError = false;
    
    if (transactionReason === 'Others') {
      if (!transactionOtherReason.trim()) {
        setOtherReasonError('Please specify the reason');
        hasError = true;
      } else if (transactionOtherReason.length > 50) {
        setOtherReasonError('Maximum 50 characters');
        hasError = true;
      }
    }
    
    // Validate issued to for Sale reason
    if (transactionReason === 'Sale') {
      if (!transactionIssuedTo.trim()) {
        setIssuedToError('Customer name is required');
        hasError = true;
      } else if (transactionIssuedTo.length > 50) {
        setIssuedToError('Maximum 50 characters');
        hasError = true;
      }
    }
    
    if (hasError) return;
    
    if (transactionItems.length === 0) {
      showAlert('error', 'No Items', 'No items to process.');
      return;
    }
    
    // Check if any item has quantity 0
    const zeroQuantityItems = transactionItems.filter(item => item.quantity <= 0);
    if (zeroQuantityItems.length > 0) {
      showAlert('error', 'Invalid Quantity', 
        `Please enter quantities for: ${zeroQuantityItems.map(i => i.productName).join(', ')}`);
      return;
    }
    
    // Check stock availability for all items
    for (const item of transactionItems) {
      const product = products.find(p => (p.id || p.pk || 0) === item.productId);
      if (!product || item.quantity > product.stockCount) {
        showAlert('error', 'Insufficient Stock', 
          `${item.productName}: Only ${product?.stockCount || 0} units available. Cannot remove ${item.quantity} units.`);
        return;
      }
    }
    
    try {
      const selectedBranchId = BRANCH_ID_BY_NAME[selectedBranch];
      const itemBranchId = transactionItems[0]?.branchId;
      const branchId = selectedBranchId ?? itemBranchId ?? 1;

      const response = await fetch(`${API_URL}/api/inventory/stock-out`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch_id: branchId,
          referenceNumber: transactionReferenceNumber,
          issuedTo: transactionIssuedTo.trim(),
          reason: transactionReason === 'Others' ? transactionOtherReason.trim() : transactionReason,
          notes: transactionNotes.trim(),
          processedBy: currentUser?.id || currentUser?.pk,
          items: transactionItems.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || 'Failed to record stock out.');
      }

      await fetchProducts();
      const processedIds = transactionItems.map(item => item.productId);
      setQuantityMods(prev => {
        const newMods = { ...prev };
        processedIds.forEach(id => delete newMods[id]);
        return newMods;
      });
      setSelectedProducts(new Set());
      setSelectAll(false);
      setShowTransactionModal(false);
      setModalSearchQuery('');
      setTransactionItems([]);
      setIssuedToError('');
      setOtherReasonError('');

      const savedReferenceNumber = result?.transaction?.reference_number || transactionReferenceNumber;

      showAlert(
        'success',
        'Transaction Complete',
        `Successfully processed ${transactionItems.length} item(s). Reference: ${savedReferenceNumber}`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to record stock out.';
      showAlert('error', 'Error', message);
    }
  };

  // Determine stock status
  const determineStockStatus = (count: number, criticalLevel: number): 'High Stock' | 'Average Stock' | 'Low Stock' | 'Critical Stock' => {
    if (count <= criticalLevel) return 'Critical Stock';
    if (count <= criticalLevel + 10) return 'Low Stock';
    if (count >= 50) return 'High Stock';
    return 'Average Stock';
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
      }, true);
  };

  const downloadTemplate = () => {
    const headers = ['Code', 'Item', 'Category', 'Base Price', 'Selling Price', 'Stock Count', 'Critical Stock Level', 'Expiration Date'];
    const sampleData = [
      ['DOG-FD-001', 'Premium Dog Food Adult 5kg', 'Food', '850', '999', '45', '10', '12/2025'],
      ['CAT-FD-002', 'Gourmet Cat Food Fish Flavor 2kg', 'Food', '420', '549', '12', '10', '03/2024'],
      ['SUP-TOY-023', 'Interactive Feather Cat Toy', 'Pet Supplies', '85', '149', '78', '10', 'N/A']
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
          
          const [aMonth, aYear] = aDate.split('/');
          const [bMonth, bYear] = bDate.split('/');
          const aTime = new Date(parseInt(aYear), parseInt(aMonth) - 1).getTime();
          const bTime = new Date(parseInt(bYear), parseInt(bMonth) - 1).getTime();
          return aTime - bTime;
        });
      case 'expirationLatest':
        return sorted.sort((a, b) => {
          const aDate = a.expirationNA || a.expirationDate === 'N/A' ? null : a.expirationDate;
          const bDate = b.expirationNA || b.expirationDate === 'N/A' ? null : b.expirationDate;
          
          if (!aDate && !bDate) return 0;
          if (!aDate) return 1;
          if (!bDate) return -1;
          
          const [aMonth, aYear] = aDate.split('/');
          const [bMonth, bYear] = bDate.split('/');
          const aTime = new Date(parseInt(aYear), parseInt(aMonth) - 1).getTime();
          const bTime = new Date(parseInt(bYear), parseInt(bMonth) - 1).getTime();
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

  // Check if issued to field should be disabled
  const isIssuedToDisabled = ['Damaged', 'Expired'].includes(transactionReason);
  
  // Get placeholder for issued to field
  const getIssuedToPlaceholder = () => {
    if (transactionReason === 'Sale') return "Customer Name, Staff, Company, etc. ";
    if (['Expired', 'Damaged'].includes(transactionReason)) return "Not Applicable";
    if (transactionReason === 'Others') return "Optional";
    return "Optional (Max 50 chars)";
  };

  return (
    <div className="invContainer">
      <Navbar currentUser={currentUser} onLogout={handleLogoutPress} />
      
      <div className="invBodyContainer">
        <div className="invTopContainer">
          <div className="invSubTopContainer" style={{paddingLeft: '30px'}}>
            <div className="invSubTopLeft">
              <IoArrowUpOutline size={23} className="invBlueIcon" />
              <span className="invBlueText">Inventory OUT</span>
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
                    <option value="Pet Supplies">Pet Supplies</option>
                    <option value="Deworming">Deworming</option>
                    <option value="Vitamins">Vitamins</option>
                    <option value="Food">Food</option>
                    <option value="Accessories">Accessories</option>
                    <option value="Medication">Medication</option>
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
              {/* Record Transaction Button moved here */}
              <button 
                className="invRecordTransactionBtn"
                onClick={openTransactionModal}
                disabled={selectedProducts.size === 0}
              >
                <IoDocumentTextOutline /> Record Transaction ({selectedProducts.size} item{selectedProducts.size !== 1 ? 's' : ''} selected)
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
                        checked={selectAll && paginatedProducts.some(p => p.stockCount > 0)}
                        onChange={handleSelectAll}
                        className="invCheckbox"
                        disabled={paginatedProducts.every(p => p.stockCount === 0)}
                      />
                    </th>
                    <th style={{ width: '150px' }}>Code</th>
                    <th>Item</th>
                    <th>Category</th>
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
                      const hasZeroStock = product.stockCount === 0;

                      return (
                        <tr 
                          key={productId} 
                          className={`
                            ${isExpiredProduct ? 'invExpiredRow' : ''} 
                            ${isExpiringProduct ? 'invExpiringRow' : ''}
                            ${isSelected ? 'invSelectedRow' : ''}
                            ${hasZeroStock ? 'invZeroStockRow' : ''}
                          `}
                        >
                          <td>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectProduct(productId)}
                              className="invCheckbox"
                              disabled={hasZeroStock}
                            />
                          </td>
                          <td>{product.code}</td>
                          <td>{product.item} {hasZeroStock && <span className="invOutOfStockTag">Out of Stock</span>}</td>
                          <td>{product.category}</td>
                          <td>₱{product.sellingPrice.toLocaleString()}</td>
                          <td className={product.stockCount <= (product.criticalStockLevel || 10) ? 'invCriticalStockCell' : ''}>
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
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="invNoData">
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
        </div>
      </div>
{/* Transaction Modal */}
{showTransactionModal && (
  <div className="invModalOverlay" onClick={() => setShowTransactionModal(false)}>
    <div className="invBulkModal" onClick={e => e.stopPropagation()}>
      <div className="invModalHeader">
        <h2>Record Transaction</h2>
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
            <label>Reason <span className="invRequired">*</span></label>
            <select
              value={transactionReason}
              onChange={(e) => {
                const newReason = e.target.value;
                setTransactionReason(newReason);
                if (newReason === 'Sale') {
                  setTransactionIssuedTo('Customer');
                  setIssuedToError('');
                } else if (['Damaged', 'Expired'].includes(newReason)) {
                  setTransactionIssuedTo('');
                  setIssuedToError('');
                }
              }}
              className="invFormSelect"
            >
              <option value="Sale">Sale</option>
              <option value="Damaged">Damaged</option>
              <option value="Expired">Expired</option>
              <option value="Others">Others</option>
            </select>
          </div>
          <div className="invFormGroup">
            <label>Issued To {transactionReason === 'Sale' && <span className="invRequired">*</span>}</label>
            <div className="invInputWrapper">
              <input
                type="text"
                value={transactionIssuedTo}
                onChange={(e) => handleIssuedToChange(e.target.value)}
                placeholder={getIssuedToPlaceholder()}
                maxLength={50}
                className={`invInputWithCounter ${issuedToError ? 'invError' : ''}`}
                disabled={isIssuedToDisabled}
              />
              {!isIssuedToDisabled && (
                <span className={`invCharCounterInside ${
                  transactionIssuedTo.length >= 45 ? 'invCharCounterInsideNearLimit' : ''
                } ${transactionIssuedTo.length === 50 ? 'invCharCounterInsideAtLimit' : ''}`}>
                  {transactionIssuedTo.length}/50
                </span>
              )}
            </div>
            {issuedToError && !isIssuedToDisabled && (
              <div className="invErrorText">{issuedToError}</div>
            )}
          </div>
        </div>

        {transactionReason === 'Others' && (
          <div className="invFormRow">
            <div className="invFormGroup">
              <label>Specify Reason <span className="invRequired">*</span></label>
              <div className="invInputWrapper">
                <input
                  type="text"
                  value={transactionOtherReason}
                  onChange={(e) => handleOtherReasonChange(e.target.value)}
                  placeholder="Please specify the reason... "
                  maxLength={50}
                  className={`invInputWithCounter ${otherReasonError ? 'invError' : ''}`}
                />
                <span className={`invCharCounterInside ${
                  transactionOtherReason.length >= 45 ? 'invCharCounterInsideNearLimit' : ''
                } ${transactionOtherReason.length === 50 ? 'invCharCounterInsideAtLimit' : ''}`}>
                  {transactionOtherReason.length}/50
                </span>
              </div>
              {otherReasonError && <div className="invErrorText">{otherReasonError}</div>}
            </div>
          </div>
        )}

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
            {transactionItems.filter(item => item.quantity <= 0).length > 0 && (
              <span className="invMissingWarning">
                ⚠️ {transactionItems.filter(item => item.quantity <= 0).length} item(s) missing quantity
              </span>
            )}
          </div>
        </div>

        <div className="invBulkItemsSection">
          <label>Items to Remove (Enter quantities below)</label>
          <div className="invBulkItemsTable">
            <table className="invBulkItemsTableInner">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}></th>
                  <th>Product Code</th>
                  <th>Product Name</th>
                  <th>Unit Price</th>
                  <th>Available Stock</th>
                  <th>Quantity to Remove</th>
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
                    const isOutOfStock = item.availableStock === 0;
                    
                    return (
                      <tr key={index} className={hasMissingQuantity && !isOutOfStock ? 'invMissingRow' : ''}>
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
                        <td>{item.productName} {isOutOfStock && <span className="invOutOfStockTag">Out of Stock</span>}</td>
                        <td>₱{item.unitPrice.toLocaleString()}</td>
                        <td className={item.availableStock <= 10 ? 'invCriticalStockCell' : ''}>
                          {item.availableStock}
                        </td>
                        <td>
                          <div className="invModalQuantityControls">
                            <input
                              type="number"
                              className={`invBulkQtyInput ${hasMissingQuantity && !isOutOfStock ? 'invMissingInput' : ''}`}
                              value={item.quantity || ''}
                              onChange={(e) => handleModalQuantityChange(originalIndex, parseInt(e.target.value) || 0)}
                              min="0"
                              max={item.availableStock}
                              placeholder="0"
                              disabled={isOutOfStock}
                            />
                            <button 
                              className="invQtyBtn invQtyBtnSmall invQtyAddBtn"
                              onClick={() => handleModalQuickSubtract(originalIndex, 5)}
                              disabled={isOutOfStock}
                            >
                              +5
                            </button>
                            <button 
                              className="invQtyBtn invQtyBtnSmall invQtyAddBtn"
                              onClick={() => handleModalQuickSubtract(originalIndex, 10)}
                              disabled={isOutOfStock}
                            >
                              +10
                            </button>
                          </div>
                         </td>
                        <td>₱{(item.quantity * item.unitPrice).toLocaleString()}</td>
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
                    ₱{transactionItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0).toLocaleString()}
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
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Optional notes for this transaction... "
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
        }}>
          Cancel
        </button>
        <button className="invSubmitBtn" onClick={saveTransaction}>
          Process Transaction
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
                    <li><strong>Code</strong> - Product code (required)</li>
                    <li><strong>Item</strong> - Product name (required)</li>
                    <li><strong>Category</strong> - Category (required)</li>
                    <li><strong>Base Price</strong> - Base price (required)</li>
                    <li><strong>Selling Price</strong> - Selling price (required)</li>
                    <li><strong>Stock Count</strong> - Current stock (optional)</li>
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
                  onClick={() => setModalVisible(false)}
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

export default GlobalInventoryOUT;
