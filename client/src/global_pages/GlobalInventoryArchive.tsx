import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../reusable_components/NavBar';
import Notifications from '../reusable_components/Notifications';
import { IoIosArchive } from "react-icons/io";
import './GlobalInventoryStyles2.css';
import { 
  IoSearchSharp,
  IoFilterSharp,
  IoCheckmarkCircleOutline,
  IoCloseCircleOutline,
  IoAlertCircleOutline,
  IoArrowBackOutline,
  IoArchiveOutline,
  IoRefreshOutline,
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

interface ArchivedProduct {
  id: number;
  code: string;
  item: string;
  category: string;
  basePrice: number;
  sellingPrice: number;
  expirationDate: string;
  archivedDate: string;
  archivedBy: string;
  originalStockCount: number;
  originalStockStatus: string;
  criticalStockLevel: number;
}

interface ModalConfig {
  type: 'info' | 'success' | 'error' | 'confirm';
  title: string;
  message: React.ReactNode;
  onConfirm?: () => void;
  onCancel?: () => void;
  showCancel: boolean;
}

type SortOption = 'dateNewest' | 'dateOldest' | 'productAZ' | 'productZA' | 'priceHigh' | 'priceLow';

const SORT_OPTIONS = [
  { value: 'dateNewest', label: 'Newest First' },
  { value: 'dateOldest', label: 'Oldest First' },
  { value: 'productAZ', label: 'Product A-Z' },
  { value: 'productZA', label: 'Product Z-A' },
  { value: 'priceHigh', label: 'Price High to Low' },
  { value: 'priceLow', label: 'Price Low to High' }
];

const ROWS_PER_PAGE_OPTIONS = [5, 8, 10, 15, 20, 25, 50];
const CATEGORIES = ['Pet Supplies', 'Deworming', 'Vitamins', 'Food', 'Accessories', 'Medication'];
const API_URL = 'http://localhost:5000';
const BRANCH_ID_BY_NAME: Record<string, number> = {
  Taguig: 1,
  'Las Pinas': 2,
};

const GlobalInventoryArchive: React.FC = () => {
  const navigate = useNavigate();
  
  // State
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [archivedProducts, setArchivedProducts] = useState<ArchivedProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  
  // UI State
  const [searchVisible, setSearchVisible] = useState<boolean>(false);
  const [filterVisible, setFilterVisible] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchHovered, setSearchHovered] = useState<boolean>(false);
  const [filterHovered, setFilterHovered] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<string>('');
  const [sortOption, setSortOption] = useState<SortOption>('dateNewest');
  const [showSettingsDropdown, setShowSettingsDropdown] = useState<boolean>(false);
  
  // Filter States
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  
  // Pagination
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const itemsPerPage = rowsPerPage;

  const [selectedBranch, setSelectedBranch] = useState<string>('All');

  // Modal States
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [modalConfig, setModalConfig] = useState<ModalConfig>({
    type: 'info',
    title: '',
    message: '',
    showCancel: false
  });
  const [productToRestore, setProductToRestore] = useState<ArchivedProduct | null>(null);

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

  // Fetch archived products
  const fetchArchivedProducts = async (): Promise<void> => {
    setLoading(true);
    try {
      const branchId = BRANCH_ID_BY_NAME[selectedBranch];
      const endpoint = branchId
        ? `${API_URL}/api/inventory/items?archived=true&branch_id=${branchId}`
        : `${API_URL}/api/inventory/items?archived=true`;
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`Failed to fetch archived products (${response.status})`);
      }

      const data = await response.json();
      const items = Array.isArray(data?.items) ? data.items : [];
      const normalized: ArchivedProduct[] = items.map((item: any) => ({
        id: item.id || item.pk || item.inventory_item_id,
        code: item.code || '',
        item: item.item || '',
        category: item.category || '',
        basePrice: Number(item.basePrice || 0),
        sellingPrice: Number(item.sellingPrice || 0),
        expirationDate: item.expirationDate || 'N/A',
        archivedDate: item.archivedDate || '',
        archivedBy: item.archivedBy ? String(item.archivedBy) : 'Unknown',
        originalStockCount: Number(item.stockCount || 0),
        originalStockStatus: item.stockStatus || 'Average Stock',
        criticalStockLevel: Number(item.criticalStockLevel || 10),
      }));
      setArchivedProducts(normalized);
    } catch (error) {
      console.error(error);
      showAlert('error', 'Error', 'Failed to fetch archived products.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchivedProducts();
  }, [selectedBranch]);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showSettingsDropdown && !target.closest('.invSettingsDropdownContainer')) {
        setShowSettingsDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSettingsDropdown]);

  // Clear filters
  const clearFilters = () => {
    setCategoryFilter('all');
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

  // Restore product
  const handleRestoreProduct = (product: ArchivedProduct) => {
    setProductToRestore(product);
    showAlert('confirm', 'Restore Product', 
      `Are you sure you want to restore "${product.item}" back to the active inventory?`,
      async () => {
        try {
          const actorId = currentUser?.id || currentUser?.pk;
          const response = await fetch(`${API_URL}/api/inventory/items/${product.id}/restore`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              processedBy: actorId,
              userId: actorId,
            }),
          });

          const result = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(result.error || 'Failed to restore archived product.');
          }

          await fetchArchivedProducts();
          showAlert('success', 'Restored', `"${product.item}" has been restored to active inventory.`);
          setProductToRestore(null);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to restore archived product.';
          showAlert('error', 'Error', message);
        }
      },
      () => {
        setProductToRestore(null);
      },
      true
    );
  };

  // Sort products
  const sortProducts = (productsToSort: ArchivedProduct[]): ArchivedProduct[] => {
    const sorted = [...productsToSort];
    
    switch (sortOption) {
      case 'dateNewest':
        return sorted.sort((a, b) => new Date(b.archivedDate).getTime() - new Date(a.archivedDate).getTime());
      case 'dateOldest':
        return sorted.sort((a, b) => new Date(a.archivedDate).getTime() - new Date(b.archivedDate).getTime());
      case 'productAZ':
        return sorted.sort((a, b) => a.item.localeCompare(b.item));
      case 'productZA':
        return sorted.sort((a, b) => b.item.localeCompare(a.item));
      case 'priceHigh':
        return sorted.sort((a, b) => b.sellingPrice - a.sellingPrice);
      case 'priceLow':
        return sorted.sort((a, b) => a.sellingPrice - b.sellingPrice);
      default:
        return sorted;
    }
  };

  // Filter Logic
  const filteredProducts = archivedProducts.filter(product => {
    const matchesSearch = searchQuery === '' || 
      product.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.item.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const sortedProducts = sortProducts(filteredProducts);
  const paginatedProducts = sortedProducts.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
  const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);

  // Format date
  const formatDate = (dateString: string): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <div className="invContainer">
      <Navbar currentUser={currentUser} onLogout={handleLogoutPress} />
      
      <div className="invBodyContainer">
        <div className="invTopContainer">
          <div className="invSubTopContainer" style={{paddingLeft: '30px'}}>
            <div className="invSubTopLeft">
              <IoIosArchive size={23} className="invBlueIcon" />
              <span className="invBlueText">Inventory Archive</span>
            </div>
            
            <div className="invBranchSelector2">
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
                    <option value="all">All Categories</option>
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
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
                <button className="invReturnBtn" onClick={clearFilters}>
                  <IoArrowBackOutline /> Clear Filters
                </button>
              )}
              <div className="invArchiveCount">
                Total Archived: {archivedProducts.length} items
              </div>
            </div>
          </div>

          {/* Archived Products Table */}
          {loading ? (
            <div className="invLoadingContainer">
              <div className="invSpinner"></div>
            </div>
          ) : (
            <div className="invTableWrapper">
              <table className="invDataTable">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Item</th>
                    <th>Category</th>
                    <th>Base Price</th>
                    <th>Selling Price</th>
                    <th>Expiration</th>
                    <th>Archived Date</th>
                    <th>Archived By</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProducts.length > 0 ? (
                    paginatedProducts.map(product => (
                      <tr key={product.id} className="invArchivedRow">
                        <td>{product.code}</td>
                        <td>{product.item}</td>
                        <td>{product.category}</td>
                        <td>₱{product.basePrice.toLocaleString()}</td>
                        <td>₱{product.sellingPrice.toLocaleString()}</td>
                        <td className="invExpirationDate">
                          {product.expirationDate}
                         </td>
                        <td>{formatDate(product.archivedDate)}</td>
                        <td>{product.archivedBy}</td>
                        <td className="invActionsCell">
                          <button 
                            className="invRestoreBtn"
                            onClick={() => handleRestoreProduct(product)}
                            title="Restore product"
                          >
                            <IoRefreshOutline size={18} /> Restore
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="invNoData">
                        No archived products found
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

export default GlobalInventoryArchive;
