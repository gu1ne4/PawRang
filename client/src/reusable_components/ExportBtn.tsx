import React, { useState, useEffect } from 'react';
import { IoDownloadOutline, IoChevronDownOutline } from 'react-icons/io5';

interface ExportButtonProps {
  products?: any[];
  logs?: any[];
  type: 'inventory' | 'logs';
  buttonClassName?: string;
  iconClassName?: string;
}

const ExportButton: React.FC<ExportButtonProps> = ({ 
  products = [], 
  logs = [], 
  type,
  buttonClassName = '',
  iconClassName = ''
}) => {
  const [showExportDropdown, setShowExportDropdown] = useState<boolean>(false);
  
  // Sales Report Modal States
  const [showSalesReportModal, setShowSalesReportModal] = useState<boolean>(false);
  const [reportType, setReportType] = useState<'daily' | 'monthly'>('daily');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showExportDropdown && !target.closest('.invExportDropdownContainer')) {
        setShowExportDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportDropdown]);

  const handleExportInventoryMovement = async () => {
    let movementLogs = logs;
    
    if (type === 'inventory' && logs.length === 0) {
      const { MOCK_LOGS } = await import('../global_pages/GlobalInventoryLogs');
      movementLogs = MOCK_LOGS;
    }
    
    const { exportInventoryMovementExcel } = await import('../global_pages/pdf_generation/InventoryMovementExcel');
    await exportInventoryMovementExcel(movementLogs);
    setShowExportDropdown(false);
  };

  const handleExportInventoryStock = async () => {
    const { MOCK_PRODUCTS } = await import('../global_pages/GlobalInventory');
    const { exportInventoryData } = await import('../global_pages/pdf_generation/ExportInventoryExcel');
    await exportInventoryData(MOCK_PRODUCTS);
    setShowExportDropdown(false);
  };

  const handleSalesReportClick = () => {
    setShowExportDropdown(false);
    setShowSalesReportModal(true);
  };


const generateSalesReport = async () => {
  if (reportType === 'daily' && !selectedDate) {
    alert('Please select a date.');
    return;
  }
  if (reportType === 'monthly' && !selectedMonth) {
    alert('Please select a month.');
    return;
  }

  // Get sales data - use passed logs or import mock logs
  let allSales: any[] = [];
  
  if (type === 'logs' && logs.length > 0) {
    allSales = logs.filter(log => log.type === 'OUT' && log.reason === 'Sale');
  } else {
    // For inventory type, import mock logs
    const { MOCK_LOGS } = await import('../global_pages/GlobalInventoryLogs');
    allSales = MOCK_LOGS.filter(log => log.type === 'OUT' && log.reason === 'Sale');
  }

  if (allSales.length === 0) {
    alert('No sales records found at all! Make sure you have logs with type="OUT" and reason="Sale"');
    return;
  }

  // Filter sales data
  let salesData = [...allSales];
  
  if (reportType === 'daily') {
    salesData = salesData.filter(log => log.date === selectedDate);
  } else if (reportType === 'monthly') {
    salesData = salesData.filter(log => log.date.startsWith(selectedMonth));
  }

  if (salesData.length === 0) {
    alert(`No sales records found for the selected period.\n\nSelected: ${reportType === 'daily' ? selectedDate : selectedMonth}\nAvailable dates with sales: ${allSales.map(s => s.date).join(', ')}`);
    return;
  }

  // Format data for export
  const formattedSalesData = salesData.map(log => ({
    date: new Date(log.date).toLocaleDateString(),
    productCode: log.productCode,
    productName: log.productName,
    quantity: log.quantity,
    unitPrice: log.unitCost || 0,
    total: log.totalCost || 0,
  }));

  const { exportSalesReport } = await import('../global_pages/pdf_generation/InventorySalesReportExcel');
  const period = reportType === 'daily' ? selectedDate : selectedMonth;
  await exportSalesReport(formattedSalesData, reportType, period);
  
  setShowSalesReportModal(false);
  setSelectedDate('');
  setSelectedMonth('');
};

  const getExportOptions = () => {
    switch (type) {
      case 'inventory':
        return (
          <>
            <button className="invExportOption" onClick={handleExportInventoryMovement}>
              <IoDownloadOutline /> Inventory Movement
            </button>
            <button className="invExportOption" onClick={handleExportInventoryStock}>
              <IoDownloadOutline /> Inventory Stock
            </button>
            <button className="invExportOption" onClick={handleSalesReportClick}>
              <IoDownloadOutline /> Sales Report
            </button>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <div className="invExportDropdownContainer">
        <button 
          className={buttonClassName || "invExportBtn"}
          onClick={() => setShowExportDropdown(!showExportDropdown)}
        >
          <IoDownloadOutline className={iconClassName} /> Export <IoChevronDownOutline size={14} />
        </button>
        {showExportDropdown && (
          <div className="invExportDropdown">
            {getExportOptions()}
          </div>
        )}
      </div>

      {/* Sales Report Modal */}
      {showSalesReportModal && (
        <div className="invModalOverlay" onClick={() => setShowSalesReportModal(false)}>
          <div className="invSalesReportModal" onClick={e => e.stopPropagation()}>
            <div className="invModalHeader">
              <h2>Generate Sales Report</h2>
              <button className="invModalClose" onClick={() => setShowSalesReportModal(false)}>×</button>
            </div>
            
            <div className="invModalContent">
              <div className="invFormGroup">
                <label>Report Type</label>
                <select 
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as 'daily' | 'monthly')}
                  className="invFormSelect"
                >
                  <option value="daily">Daily</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              {reportType === 'daily' && (
                <div className="invFormGroup">
                  <label>Select Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="invFormInput"
                  />
                </div>
              )}

              {reportType === 'monthly' && (
                <div className="invFormGroup">
                  <label>Select Month</label>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="invFormInput"
                  />
                </div>
              )}
            </div>
            
            <div className="invModalFooter">
              <button className="invCancelBtn" onClick={() => setShowSalesReportModal(false)}>
                Cancel
              </button>
              <button className="invSubmitBtn" onClick={generateSalesReport}>
                Generate Report
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ExportButton;