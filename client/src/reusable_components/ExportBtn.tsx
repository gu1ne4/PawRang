import React, { useEffect, useState } from 'react';
import { IoChevronDownOutline, IoDownloadOutline } from 'react-icons/io5';
import { recordAuditLog } from '../auditLog';

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
    if (logs.length === 0) {
      alert('No inventory movement logs available to export yet.');
      setShowExportDropdown(false);
      return;
    }

    const { exportInventoryMovementExcel } = await import('../global_pages/pdf_generation/InventoryMovementExcel');
    await exportInventoryMovementExcel(logs);
    void recordAuditLog({
      module: 'Inventory',
      event: 'Inventory Exported',
      target: 'Inventory Movement Report',
      targetType: 'inventory_export',
      summary: `Exported inventory movement report with ${logs.length} row(s).`,
      status: 'Success',
      metadata: {
        export_type: 'inventory_movement',
        row_count: logs.length,
      },
    });
    setShowExportDropdown(false);
  };

  const handleExportInventoryStock = async () => {
    if (products.length === 0) {
      alert('No inventory stock data available to export yet.');
      setShowExportDropdown(false);
      return;
    }

    const { exportInventoryData } = await import('../global_pages/pdf_generation/ExportInventoryExcel');
    await exportInventoryData(products);
    void recordAuditLog({
      module: 'Inventory',
      event: 'Inventory Exported',
      target: 'Inventory Stock Report',
      targetType: 'inventory_export',
      summary: `Exported inventory stock report with ${products.length} item(s).`,
      status: 'Success',
      metadata: {
        export_type: 'inventory_stock',
        row_count: products.length,
      },
    });
    setShowExportDropdown(false);
  };

  const getExportOptions = () => {
    if (type !== 'inventory') return null;

    return (
      <>
        <button className="invExportOption" onClick={handleExportInventoryMovement}>
          <IoDownloadOutline /> Inventory Movement
        </button>
        <button className="invExportOption" onClick={handleExportInventoryStock}>
          <IoDownloadOutline /> Inventory Stock
        </button>
      </>
    );
  };

  return (
    <div className="invExportDropdownContainer">
      <button
        className={buttonClassName || 'invExportBtn'}
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
  );
};

export default ExportButton;
