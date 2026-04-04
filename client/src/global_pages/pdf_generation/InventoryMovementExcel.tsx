import ExcelJS from 'exceljs';
import PetShieldLogo from '../../assets/PetShieldLogo.jpg';

interface InventoryLog {
  id: number;
  date: string;
  time: string;
  productCode: string;
  productName: string;
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

const imageUrlToArrayBuffer = async (url: string): Promise<ArrayBuffer> => {
  const response = await fetch(url);
  return await response.arrayBuffer();
};

export const exportInventoryMovementExcel = async (logs: InventoryLog[]): Promise<void> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Inventory Movement');

  // Set page setup
  worksheet.pageSetup.paperSize = 9; // A4
  worksheet.pageSetup.orientation = 'landscape';
  worksheet.pageSetup.margins = {
    left: 0.5,
    right: 0.5,
    top: 0.5,
    bottom: 0.5,
    header: 0.3,
    footer: 0.3
  };

  // Set column widths
  worksheet.getColumn(1).width = 18;  // Date & Time
  worksheet.getColumn(2).width = 18;  // Product Code
  worksheet.getColumn(3).width = 35;  // Product Name
  worksheet.getColumn(4).width = 10;  // Type
  worksheet.getColumn(5).width = 12;  // Qty
  worksheet.getColumn(6).width = 22;  // Reference #
  worksheet.getColumn(7).width = 20;  // Reason
  worksheet.getColumn(8).width = 25;  // Supplier/Issued To
  worksheet.getColumn(9).width = 18;  // User
  worksheet.getColumn(10).width = 30; // Notes

  // Add logo
  try {
    const arrayBuffer = await imageUrlToArrayBuffer(PetShieldLogo);
    const imageId = workbook.addImage({
      buffer: arrayBuffer,
      extension: 'jpeg',
    });
    worksheet.addImage(imageId, {
      tl: { col: 0.5, row: 0.5 },
      ext: { width: 80, height: 80 },
      editAs: 'absolute'
    });
  } catch (error) {
    console.log('Logo not found', error);
  }

  // ========== HEADER SECTION ==========
  // Row 1: Company Name
  worksheet.mergeCells('B1:J1');
  const titleCell = worksheet.getCell('B1');
  titleCell.value = 'PETSHIELD VETERINARY CLINIC AND GROOMING CENTER';
  titleCell.font = { bold: true, size: 16, color: { argb: 'FF1E3A5F' }, name: 'Segoe UI' };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 35;

  // Row 2: Address
  worksheet.mergeCells('B2:J2');
  const addressCell = worksheet.getCell('B2');
  addressCell.value = '99 General Espino St, cor. Bravo St, Central Signal, Taguig, 1630 Metro Manila';
  addressCell.font = { size: 10, color: { argb: 'FF2C5F8A' }, name: 'Segoe UI' };
  addressCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(2).height = 22;

  // Row 3: Mobile Number
  worksheet.mergeCells('B3:J3');
  const mobileCell = worksheet.getCell('B3');
  mobileCell.value = 'Mobile No.: +63 905 457 0190';
  mobileCell.font = { size: 10, color: { argb: 'FF2C5F8A' }, name: 'Segoe UI', bold: true };
  mobileCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(3).height = 22;

  // Row 4: Empty spacer
  worksheet.getRow(4).height = 10;

  // Row 5: Export Title
  worksheet.mergeCells('B5:J5');
  const exportTitleCell = worksheet.getCell('B5');
  exportTitleCell.value = 'INVENTORY MOVEMENT REPORT';
  exportTitleCell.font = { bold: true, size: 14, color: { argb: 'FF1E3A5F' }, name: 'Segoe UI' };
  exportTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  exportTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F0FE' } };
  worksheet.getRow(5).height = 30;

  // Row 6: Export Date
  worksheet.mergeCells('A6:J6');
  const exportDateCell = worksheet.getCell('A6');
  exportDateCell.value = `Export Date: ${new Date().toLocaleDateString()} | Export Time: ${new Date().toLocaleTimeString()}`;
  exportDateCell.font = { italic: true, size: 10, color: { argb: 'FF888888' }, name: 'Segoe UI' };
  exportDateCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(6).height = 20;

  // Row 7: Empty spacer
  worksheet.getRow(7).height = 5;

  // ========== DATA TABLE HEADER ==========
  const headerRow = worksheet.getRow(8);
  headerRow.height = 32;

  const headers = [
    'DATE & TIME',
    'PRODUCT CODE',
    'PRODUCT NAME',
    'TYPE',
    'QTY',
    'REFERENCE #',
    'REASON',
    'SUPPLIER/ISSUED TO',
    'USER',
    'NOTES'
  ];

  headers.forEach((header, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Segoe UI' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'medium' },
      left: { style: 'thin' },
      bottom: { style: 'medium' },
      right: { style: 'thin' }
    };
  });

  // ========== POPULATE DATA ==========
  logs.forEach((log, index) => {
    const rowNum = 9 + index;
    const dataRow = worksheet.getRow(rowNum);
    dataRow.height = 24;
    
    // Format date and time
    const formatDateTime = (date: string, time: string): string => {
      const formattedDate = new Date(date).toLocaleDateString();
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${formattedDate} ${hour12}:${minutes} ${ampm}`;
    };
    
    dataRow.values = [
      formatDateTime(log.date, log.time),
      log.productCode,
      log.productName,
      log.type,
      log.quantity,
      log.referenceNumber,
      log.reason,
      log.supplierOrIssuedTo,
      log.user,
      log.notes || ''
    ];
    
    dataRow.alignment = { vertical: 'middle' };
    
    // Add borders and formatting
    for (let col = 1; col <= 10; col++) {
      const cell = dataRow.getCell(col);
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      
      // Center align Type column
      if (col === 4) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        // Color code IN/OUT
        if (log.type === 'IN') {
          cell.font = { color: { argb: 'FF2E9E0C' }, bold: true };
        } else {
          cell.font = { color: { argb: 'FFDC3545' }, bold: true };
        }
      }
      
      // Right align Quantity
      if (col === 5) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '0';
      }
      
      // Center align Reference # and Reason
      if (col === 6 || col === 7) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    }
  });

  // ========== FOOTER ==========
  const footerRow = 9 + logs.length + 1;
  worksheet.mergeCells(`A${footerRow}:J${footerRow}`);
  const footerCell = worksheet.getCell(`A${footerRow}`);
  
  const totalIn = logs.filter(log => log.type === 'IN').reduce((sum, log) => sum + log.quantity, 0);
  const totalOut = logs.filter(log => log.type === 'OUT').reduce((sum, log) => sum + log.quantity, 0);
  
  footerCell.value = `Total Transactions: ${logs.length} | Total IN: ${totalIn} | Total OUT: ${totalOut} | Generated by PetShield Veterinary Clinic Inventory System`;
  footerCell.font = { size: 9, italic: true, color: { argb: 'FF888888' }, name: 'Segoe UI' };
  footerCell.alignment = { horizontal: 'center' };
  footerCell.border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };
  footerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFAFA' } };
  worksheet.getRow(footerRow).height = 20;

  // ========== SAVE THE FILE ==========
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `PetShield_Inventory_Movement_${new Date().toISOString().split('T')[0]}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};