import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../reusable_components/NavBar';
import Notifications from '../reusable_components/Notifications';
import ImportButton from '../reusable_components/ImportBtn';
import ExportButton  from '../reusable_components/ExportBtn';
import './GlobalInventoryStyles2.css';
import { parsePetShieldInventoryTemplate } from './inventoryImport';
import { 
  IoSearchSharp,
  IoFilterSharp,
  IoCheckmarkCircleOutline,
  IoCloseCircleOutline,
  IoAlertCircleOutline,
  IoArrowBackOutline,
  IoDownloadOutline,
  IoCloudUploadOutline,
  IoDocumentTextOutline,

} from 'react-icons/io5';
import { MdOutlineStickyNote2 } from "react-icons/md";
import { RiListSettingsLine } from "react-icons/ri";
import { downloadInventoryTemplate } from './pdf_generation/InventoryExcel';

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
  branchName?: string;
  code: string;
  item: string;
  unit?: string;
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

interface InventoryLog {
  id: number;
  branchId?: number;
  branchName?: string;
  date: string;
  time: string;
  productCode: string;
  productName: string;
  unit?: string;
  type: 'IN' | 'OUT';
  quantity: number;
  referenceNumber: string;
  reason: string;
  supplierOrIssuedTo: string;
  user: string;
  notes: string;
  unitCost?: number;
  totalCost?: number;
}

interface ModalConfig {
  type: 'info' | 'success' | 'error' | 'confirm';
  title: string;
  message: React.ReactNode;
  onConfirm?: () => void;
  onCancel?: () => void;
  showCancel: boolean;
}

type SortOption = 'dateNewest' | 'dateOldest' | 'productAZ' | 'productZA' | 'quantityHigh' | 'quantityLow';

const SORT_OPTIONS = [
  { value: 'dateNewest', label: 'Newest First' },
  { value: 'dateOldest', label: 'Oldest First' },
  { value: 'productAZ', label: 'Product A-Z' },
  { value: 'productZA', label: 'Product Z-A' },
  { value: 'quantityHigh', label: 'Highest Quantity' },
  { value: 'quantityLow', label: 'Lowest Quantity' }
];


const ROWS_PER_PAGE_OPTIONS = [5, 8, 10, 15, 20, 25, 50];
const API_URL = 'http://localhost:5000';
const BRANCH_ID_BY_NAME: Record<string, number> = {
  Taguig: 1,
  'Las Pinas': 2,
};
const BRANCH_NAME_BY_ID: Record<number, string> = {
  1: 'Taguig',
  2: 'Las Pinas',
};


const GlobalInventoryLogs: React.FC = () => {
  const navigate = useNavigate();
  
  // State
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
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
  const [showExportDropdown, setShowExportDropdown] = useState<boolean>(false);
  const [sortOption, setSortOption] = useState<SortOption>('dateNewest');
  const [showSettingsDropdown, setShowSettingsDropdown] = useState<boolean>(false);
  const [selectedNote, setSelectedNote] = useState<{ title: string; content: string } | null>(null);
   const [products, setProducts] = useState<Product[]>([]);
  
  // Filter States
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Pagination
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const itemsPerPage = rowsPerPage;

  const [selectedBranch, setSelectedBranch] = useState<string>('All');

  const getBranchLabel = (branchId?: number, branchName?: string): string => {
    if (branchName?.trim()) return branchName;
    if (typeof branchId === 'number' && BRANCH_NAME_BY_ID[branchId]) {
      return BRANCH_NAME_BY_ID[branchId];
    }
    if (selectedBranch !== 'All') return selectedBranch;
    return 'Unknown';
  };

  const getLogBranchLabel = (log: InventoryLog): string => {
    if (log.branchName?.trim() || typeof log.branchId === 'number') {
      return getBranchLabel(log.branchId, log.branchName);
    }
    const matchedProduct = products.find(product => product.code === log.productCode);
    return getBranchLabel(matchedProduct?.branchId, matchedProduct?.branchName);
  };

  // Modal States
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [isImportProcessing, setIsImportProcessing] = useState<boolean>(false);
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

  const buildDuplicateImportMessage = (
    duplicateRows: {
      row: { item: string; stockCount: number };
      currentStock: number;
      mergedStock: number;
    }[],
  ): React.ReactNode => (
    <div style={{ textAlign: 'left' }}>
      <p style={{ marginBottom: '12px' }}>
        Some imported products already exist. If you continue, the imported stock will be added to the
        current stock for those matching items.
      </p>
      <div style={{ maxHeight: '220px', overflowY: 'auto', marginBottom: '12px' }}>
        {duplicateRows.map(({ row, currentStock, mergedStock }, index) => (
          <div key={`${row.item}-${index}`} style={{ marginBottom: '10px' }}>
            <strong>{row.item}</strong>
            <div>Current stock: {currentStock}</div>
            <div>Imported stock: {row.stockCount}</div>
            <div>Total after import: {mergedStock}</div>
          </div>
        ))}
      </div>
      <p>Do you want to continue with the import?</p>
    </div>
  );
  
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

  // Fetch logs
  const fetchLogs = async (): Promise<void> => {
    setLoading(true);
    try {
      const branchId = BRANCH_ID_BY_NAME[selectedBranch];
      const endpoint = branchId
        ? `${API_URL}/api/inventory/logs?branch_id=${branchId}`
        : `${API_URL}/api/inventory/logs`;
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`Failed to fetch inventory logs (${response.status})`);
      }

      const data = await response.json();
      const items = Array.isArray(data?.logs) ? data.logs : [];
      setLogs(items);
    } catch (error) {
      console.error(error);
      showAlert('error', 'Error', 'Failed to fetch inventory logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedBranch]);

  useEffect(() => {
    loadCurrentUser();
  }, []);

    const fetchProducts = async (): Promise<void> => {
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
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedBranch]);

  const handleImport = async (file: File): Promise<boolean> => {
    const branchId = BRANCH_ID_BY_NAME[selectedBranch];
    if (!branchId || selectedBranch === 'All') {
      showAlert('error', 'Select Branch', 'Please select a specific branch before importing inventory.');
      return false;
    }

    try {
      const importedRows = await parsePetShieldInventoryTemplate(file);

      const normalizeKey = (item: string, category: string, unit: string, basePrice: number, expirationDate?: string, expirationNA?: boolean) =>
        [
          item.trim().toLowerCase().replace(/\s+/g, ' '),
          category.trim(),
          unit.trim().toLowerCase(),
          basePrice.toFixed(2),
          expirationNA ? 'na' : (expirationDate || '').trim(),
        ].join('|');

      const currentProducts = [...products];

      const duplicateRows = importedRows
        .map((row) => {
          const matchingProduct = currentProducts.find((product) =>
            normalizeKey(product.item, product.category, product.unit || 'Piece', product.basePrice, product.expirationDate, product.expirationNA) ===
            normalizeKey(row.item, row.category, row.unit, row.basePrice, row.expirationDate, row.expirationNA)
          );

          if (!matchingProduct) return null;
          return {
            row,
            matchingProduct,
            currentStock: matchingProduct.stockCount || 0,
            mergedStock: (matchingProduct.stockCount || 0) + row.stockCount,
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

      const processImport = async (): Promise<boolean> => {
        let createdCount = 0;
        let updatedCount = 0;
        const rowErrors: string[] = [];

        setIsImportProcessing(true);
        try {
          for (const row of importedRows) {
            let matchingProduct = currentProducts.find((product) =>
              normalizeKey(product.item, product.category, product.unit || 'Piece', product.basePrice, product.expirationDate, product.expirationNA) ===
              normalizeKey(row.item, row.category, row.unit, row.basePrice, row.expirationDate, row.expirationNA)
            );

            if (!matchingProduct) {
              const createResponse = await fetch(`${API_URL}/api/inventory/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  branch_id: branchId,
                  code: '',
                  item: row.item,
                  unit: row.unit,
                  category: row.category,
                  basePrice: row.basePrice,
                  sellingPrice: row.sellingPrice,
                  stockCount: 0,
                  expirationDate: row.expirationNA ? '' : row.expirationDate,
                  expirationNA: row.expirationNA,
                  criticalStockLevel: 10,
                  userId: currentUser?.id || currentUser?.pk,
                }),
              });
              const createResult = await createResponse.json().catch(() => ({}));

              if (!createResponse.ok) {
                rowErrors.push(`Row ${row.sourceRow}: ${createResult.error || 'Failed to create product'}`);
                continue;
              }

              matchingProduct = {
                id: createResult.item?.id,
                pk: createResult.item?.pk,
                branchId: createResult.item?.branchId,
                code: createResult.item?.code || '',
                item: createResult.item?.item || row.item,
                unit: createResult.item?.unit || row.unit,
                category: createResult.item?.category || row.category,
                basePrice: Number(createResult.item?.basePrice || row.basePrice),
                sellingPrice: Number(createResult.item?.sellingPrice || row.sellingPrice),
                stockCount: Number(createResult.item?.stockCount || 0),
                stockStatus: createResult.item?.stockStatus || 'Average Stock',
                expirationDate: createResult.item?.expirationDate || (row.expirationNA ? 'N/A' : row.expirationDate),
                expirationNA: Boolean(createResult.item?.expirationNA ?? row.expirationNA),
                criticalStockLevel: Number(createResult.item?.criticalStockLevel || 10),
              };
              currentProducts.push(matchingProduct);
              createdCount += 1;
            }

            if (row.stockCount > 0) {
              const stockInResponse = await fetch(`${API_URL}/api/inventory/stock-in`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  branch_id: branchId,
                  supplier: 'Inventory Template Import',
                  reason: 'Imported Inventory Template',
                  notes: `Imported from template file: ${file.name}`,
                  processedBy: currentUser?.id || currentUser?.pk,
                  items: [
                    {
                      productId: matchingProduct.id || matchingProduct.pk,
                      quantity: row.stockCount,
                      unitCost: row.basePrice,
                    },
                  ],
                }),
              });
              const stockInResult = await stockInResponse.json().catch(() => ({}));

              if (!stockInResponse.ok) {
                rowErrors.push(`Row ${row.sourceRow}: ${stockInResult.error || 'Failed to record imported stock'}`);
                continue;
              }

              matchingProduct.stockCount = (matchingProduct.stockCount || 0) + row.stockCount;
              updatedCount += 1;
            }
          }

          await Promise.all([fetchProducts(), fetchLogs()]);

          if (rowErrors.length > 0) {
            showAlert(
              'error',
              'Import Completed With Issues',
              `Created: ${createdCount}, Updated: ${updatedCount}\n\n${rowErrors.join('\n')}`
            );
            return true;
          }

          showAlert(
            'success',
            'Import Successful',
            `Inventory import completed. Created: ${createdCount}, Updated: ${updatedCount}`
          );
          return true;
        } finally {
          setIsImportProcessing(false);
        }
      };

      if (duplicateRows.length > 0) {
        setTimeout(() => {
          showAlert(
            'confirm',
            'Merge Existing Products',
            buildDuplicateImportMessage(duplicateRows),
            () => {
              void processImport();
            },
            undefined,
            true
          );
        }, 0);
        return true;
      }

      return await processImport();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to import inventory data.';
      showAlert('error', 'Import Failed', message);
      return false;
    }
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
    setTypeFilter('all');
    setProductFilter('all');
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
    setActiveFilter('');
    setPage(0);
  };


  // Clear filters function
  const clearFilters = () => {
    setTypeFilter('all');
    setProductFilter('all');
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
    setActiveFilter('');
    setPage(0);
    setFilterVisible(false);
  };

  // Logout Handler
  const handleLogoutPress = (): void => {
    showAlert('confirm', 'Log Out', 'Are you sure you want to log out?', async () => {
      localStorage.removeItem('userSession');
      navigate('/login');
    }, undefined, true);
  };

  // Get unique products for filter
  const uniqueProducts = Array.from(new Set(logs.map(log => log.productName)));

  // Format date and time for display
  const formatDateTime = (date: string, time: string): string => {
    const formattedDate = new Date(date).toLocaleDateString();
    // Format time from HH:MM:SS to HH:MM AM/PM
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${formattedDate} ${hour12}:${minutes} ${ampm}`;
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
    
    showAlert('confirm', 'Import Logs', 
      `Are you sure you want to import data from "${selectedFile.name}"?`, 
      () => {
        setTimeout(() => {
          showAlert('success', 'Import Successful', 'Logs have been imported successfully!');
          setShowImportModal(false);
          setSelectedFile(null);
          fetchLogs();
        }, 1500);
      }, undefined, true);
  };

  const downloadTemplate = () => {
    const headers = ['Date (YYYY-MM-DD)', 'Time (HH:MM:SS)', 'Product Code', 'Product Name', 'Type (IN/OUT)', 'Quantity', 'Reference #', 'Reason', 'Supplier/Issued To', 'User', 'Notes'];
    const sampleData = [
      ['2024-03-15', '09:30:15', 'DOG-FD-001', 'Premium Dog Food Adult 5kg', 'IN', '50', 'GRN-20240315-0001', 'Stock Replenishment', 'Pet Supplies Co.', 'John Doe', 'Initial stock order'],
      ['2024-03-14', '14:45:22', 'DOG-FD-001', 'Premium Dog Food Adult 5kg', 'OUT', '5', 'TRX-20240314-0452', 'Sale', 'Maria Santos', 'Jane Smith', 'Customer purchase']
    ];
    
    const csvContent = [headers, ...sampleData].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'logs_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Sort logs
  const sortLogs = (logsToSort: InventoryLog[]): InventoryLog[] => {
    const sorted = [...logsToSort];
    
    switch (sortOption) {
      case 'dateNewest':
        return sorted.sort((a, b) => {
          const dateTimeA = new Date(`${a.date}T${a.time}`).getTime();
          const dateTimeB = new Date(`${b.date}T${b.time}`).getTime();
          return dateTimeB - dateTimeA;
        });
      case 'dateOldest':
        return sorted.sort((a, b) => {
          const dateTimeA = new Date(`${a.date}T${a.time}`).getTime();
          const dateTimeB = new Date(`${b.date}T${b.time}`).getTime();
          return dateTimeA - dateTimeB;
        });
      case 'productAZ':
        return sorted.sort((a, b) => a.productName.localeCompare(b.productName));
      case 'productZA':
        return sorted.sort((a, b) => b.productName.localeCompare(a.productName));
      case 'quantityHigh':
        return sorted.sort((a, b) => b.quantity - a.quantity);
      case 'quantityLow':
        return sorted.sort((a, b) => a.quantity - b.quantity);
      default:
        return sorted;
    }
  };

  // Filter Logic
  const filteredLogs = logs.filter(log => {
    const matchesSearch = searchQuery === '' || 
      log.productCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = typeFilter === 'all' || log.type === typeFilter;
    const matchesProduct = productFilter === 'all' || log.productName === productFilter;
    
    const matchesDate =
    (!startDate || new Date(log.date) >= new Date(startDate)) &&
    (!endDate || new Date(log.date) <= new Date(endDate));

    return matchesSearch && matchesType && matchesProduct && matchesDate;
  });

  const sortedLogs = useMemo(() => {
    return sortLogs(filteredLogs);
  }, [filteredLogs, sortOption]);

  const paginatedLogs = sortedLogs.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
  const totalPages = Math.ceil(sortedLogs.length / itemsPerPage);

  // Open note preview modal
  const openNotePreview = (title: string, content: string) => {
    if (!content || content.trim() === '') {
      showAlert('info', 'No Notes', 'No notes available for this entry.');
      return;
    }
    setSelectedNote({ title, content });
  };

  return (
    <div className="invContainer">
      <Navbar currentUser={currentUser} onLogout={handleLogoutPress} />
      
      <div className="invBodyContainer">
        <div className="invTopContainer">
          <div className="invSubTopContainer" style={{paddingLeft: '30px'}}>
            <div className="invSubTopLeft">
              <IoDocumentTextOutline size={23} className="invBlueIcon" />
              <span className="invBlueText">Inventory Logs</span>
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
                accept=".xlsx"
              />
              <ExportButton 
                logs={logs} 
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
                  placeholder="Search by code, product, reference, or user..."
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
                    value={typeFilter} 
                    onChange={(e) => {setTypeFilter(e.target.value); setPage(0); setActiveFilter('');}}
                    className="invFilterSelect"
                  >
                    <option value="all">All Types</option>
                    <option value="IN">IN</option>
                    <option value="OUT">OUT</option>
                  </select>

                  <select 
                    value={productFilter} 
                    onChange={(e) => {setProductFilter(e.target.value); setPage(0); setActiveFilter('');}}
                    className="invFilterSelect"
                  >
                    <option value="all">All Products</option>
                    {uniqueProducts.map(product => (
                      <option key={product} value={product}>{product}</option>
                    ))}
                  </select>

                  <div className="invDateRangeFilter">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => {setStartDate(e.target.value); setPage(0);}}
                      placeholder="Start Date"
                      className="invDateInput"
                    />
                    <span>to</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => {setEndDate(e.target.value); setPage(0);}}
                      placeholder="End Date"
                      className="invDateInput"
                    />
                  </div>

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
                        onChange={(e) => {
                        setRowsPerPage(parseInt(e.target.value));
                        setPage(0); 
                      }}
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
            </div>
          </div>

          {/* Logs Table */}
          {loading ? (
            <div className="invLoadingContainer">
              <div className="invSpinner"></div>
            </div>
          ) : (
            <div className="invTableWrapper">
              <table className="invDataTable">
                <thead>
                  <tr>
                    <th style={{ width: '180px' }}>Date & Time</th>
                    <th>Branch</th>
                    <th>Product</th>
                    <th>Unit</th>
                    <th>Type</th>
                    <th>Qty</th>
                    <th>Reference</th>
                    <th>Reason</th>
                    <th>Supplier/Issued To</th>
                    <th>User</th>
                    <th style={{ width: '60px' }}>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLogs.length > 0 ? (
                    paginatedLogs.map(log => (
                      <tr key={log.id} className={log.type === 'IN' ? 'invInRow' : 'invOutRow'}>
                        <td>{formatDateTime(log.date, log.time)}</td>
                        <td>{getLogBranchLabel(log)}</td>
                        <td>
                          <div className="invProductCell">
                            <div className="invProductCode">{log.productCode}</div>
                            <div className="invProductName">{log.productName}</div>
                          </div>
                        </td>
                        <td>{log.unit || 'Piece'}</td>
                        <td>
                          <span className={`invTypeBadge ${log.type === 'IN' ? 'invTypeIn' : 'invTypeOut'}`}>
                            {log.type}
                          </span>
                        </td>
                        <td>{log.quantity}</td>
                        <td>
                          <div className="invRefCell">{log.referenceNumber}</div>
                        </td>
                        <td>
                          <div className="invReasonCell">{log.reason}</div>
                        </td>
                        <td>
                          <div className="invSupplierCell">{log.supplierOrIssuedTo}</div>
                        </td>
                        <td>{log.user}</td>
                        <td className="invNotesCell">
                          <button 
                            className="invNotePreviewBtn"
                            onClick={() => openNotePreview(`Notes for ${log.productName}`, log.notes)}
                            title="View notes"
                          >
                            <MdOutlineStickyNote2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={11} className="invNoData">
                        No logs found
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
                  Showing {page * itemsPerPage + 1} to {Math.min((page + 1) * itemsPerPage, sortedLogs.length)} of {sortedLogs.length} items
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

      {/* Note Preview Modal */}
      {selectedNote && (
        <div className="invModalOverlay" onClick={() => setSelectedNote(null)}>
          <div className="invNotePreviewModal" onClick={e => e.stopPropagation()}>
            <div className="invModalHeader">
              <h2>{selectedNote.title}</h2>
              <button className="invModalClose" onClick={() => setSelectedNote(null)}>×</button>
            </div>
            <div className="invNotePreviewContent">
              <p>{selectedNote.content || 'No notes available.'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="invModalOverlay" onClick={() => setShowImportModal(false)}>
          <div className="invImportModal" onClick={e => e.stopPropagation()}>
            <div className="invModalHeader">
              <h2>Import Logs</h2>
              <button className="invModalClose" onClick={() => setShowImportModal(false)}>×</button>
            </div>
            
            <div className="invModalContent">
              <div className="invImportNote">
                <IoAlertCircleOutline size={20} color="#ff9800" />
                <div>
                  <p>Please make sure your file follows the required template format. The template includes the following columns:</p>
                  <ul>
                    <li><strong>Date (YYYY-MM-DD)</strong> - Date of transaction (required)</li>
                    <li><strong>Time (HH:MM:SS)</strong> - Time of transaction (required)</li>
                    <li><strong>Product Code</strong> - Product code (required)</li>
                    <li><strong>Product Name</strong> - Product name (required)</li>
                    <li><strong>Type (IN/OUT)</strong> - Transaction type (required)</li>
                    <li><strong>Quantity</strong> - Quantity (required)</li>
                    <li><strong>Reference #</strong> - Reference number (required)</li>
                    <li><strong>Reason</strong> - Reason for transaction (required)</li>
                    <li><strong>Supplier/Issued To</strong> - Supplier or customer name (required)</li>
                    <li><strong>User</strong> - User who processed (required)</li>
                    <li><strong>Notes</strong> - Optional notes (optional)</li>
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

      {isImportProcessing && (
        <div className="invModalOverlay">
          <div className="invAlertModal" style={{ textAlign: 'center' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                border: '4px solid #d7e3f4',
                borderTopColor: '#1e3a5f',
                borderRadius: '50%',
                margin: '0 auto 18px',
                animation: 'spin 0.9s linear infinite',
              }}
            />
            <h3 className="invAlertTitle">Importing Inventory</h3>
            <div className="invAlertMessage">Please wait while your inventory items are being updated.</div>
            <style>
              {`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}
            </style>
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

export default GlobalInventoryLogs;
