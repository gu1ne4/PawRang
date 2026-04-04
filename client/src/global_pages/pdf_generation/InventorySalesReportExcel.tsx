import ExcelJS from 'exceljs';
import PetShieldLogo from '../../assets/PetShieldLogo.jpg';

interface SalesData {
  date: string;
  productCode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

const imageUrlToArrayBuffer = async (url: string): Promise<ArrayBuffer> => {
  const response = await fetch(url);
  return await response.arrayBuffer();
};

export const exportSalesReport = async (
  salesData: SalesData[], 
  reportType: 'daily' | 'monthly',
  period: string
): Promise<void> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sales Report');

  // Set page setup
  worksheet.pageSetup.paperSize = 9;
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
  worksheet.getColumn(1).width = 15;  // Date
  worksheet.getColumn(2).width = 18;  // Product Code
  worksheet.getColumn(3).width = 40;  // Product Name
  worksheet.getColumn(4).width = 12;  // Quantity
  worksheet.getColumn(5).width = 18;  // Unit Price
  worksheet.getColumn(6).width = 18;  // Total

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

  // HEADER
  worksheet.mergeCells('B1:F1');
  const titleCell = worksheet.getCell('B1');
  titleCell.value = 'PETSHIELD VETERINARY CLINIC AND GROOMING CENTER';
  titleCell.font = { bold: true, size: 16, color: { argb: 'FF1E3A5F' }, name: 'Segoe UI' };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 35;

  worksheet.mergeCells('B2:F2');
  const addressCell = worksheet.getCell('B2');
  addressCell.value = '99 General Espino St, cor. Bravo St, Central Signal, Taguig, 1630 Metro Manila';
  addressCell.font = { size: 10, color: { argb: 'FF2C5F8A' }, name: 'Segoe UI' };
  addressCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(2).height = 22;

  worksheet.mergeCells('B3:F3');
  const mobileCell = worksheet.getCell('B3');
  mobileCell.value = 'Mobile No.: +63 905 457 0190';
  mobileCell.font = { size: 10, color: { argb: 'FF2C5F8A' }, name: 'Segoe UI', bold: true };
  mobileCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(3).height = 22;

  worksheet.getRow(4).height = 10;

  worksheet.mergeCells('B5:F5');
  const exportTitleCell = worksheet.getCell('B5');
  const periodText = reportType === 'daily' 
    ? `SALES REPORT FOR ${new Date(period).toLocaleDateString()}`
    : `SALES REPORT FOR ${new Date(period).toLocaleString('default', { month: 'long', year: 'numeric' })}`;
  exportTitleCell.value = periodText;
  exportTitleCell.font = { bold: true, size: 14, color: { argb: 'FF1E3A5F' }, name: 'Segoe UI' };
  exportTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  exportTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F0FE' } };
  worksheet.getRow(5).height = 30;

  worksheet.mergeCells('A6:F6');
  const exportDateCell = worksheet.getCell('A6');
  exportDateCell.value = `Export Date: ${new Date().toLocaleDateString()} | Export Time: ${new Date().toLocaleTimeString()}`;
  exportDateCell.font = { italic: true, size: 10, color: { argb: 'FF888888' }, name: 'Segoe UI' };
  exportDateCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(6).height = 20;

  worksheet.getRow(7).height = 5;

  // TABLE HEADER
  const headerRow = worksheet.getRow(8);
  headerRow.height = 32;

  const headers = [
    'DATE', 'PRODUCT CODE', 'PRODUCT NAME', 'QTY', 'UNIT PRICE', 'TOTAL'
  ];

  headers.forEach((header, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Segoe UI' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'medium' },
      left: { style: 'thin' },
      bottom: { style: 'medium' },
      right: { style: 'thin' }
    };
  });

  // POPULATE DATA
  salesData.forEach((sale, index) => {
    const rowNum = 9 + index;
    const dataRow = worksheet.getRow(rowNum);
    dataRow.height = 24;
    
    dataRow.values = [
      sale.date,
      sale.productCode,
      sale.productName,
      sale.quantity,
      sale.unitPrice,
      sale.total
    ];
    
    for (let col = 1; col <= 6; col++) {
      const cell = dataRow.getCell(col);
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      
      if (col === 4) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '0';
      }
      if (col === 5 || col === 6) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '₱#,##0.00';
      }
    }
  });

  // FOOTER - Total Income
  const totalSales = salesData.reduce((sum, s) => sum + s.total, 0);
  const totalQuantity = salesData.reduce((sum, s) => sum + s.quantity, 0);
  
  const footerRow = 9 + salesData.length + 1;
  
  // Add a blank row before total
  const blankRow = worksheet.getRow(footerRow - 1);
  blankRow.height = 5;
  
  // Total Income row
  const totalRow = worksheet.getRow(footerRow);
  totalRow.height = 28;
  
  // Merge cells for total income label
  worksheet.mergeCells(`A${footerRow}:E${footerRow}`);
  const totalLabelCell = worksheet.getCell(`A${footerRow}`);
  totalLabelCell.value = 'TOTAL INCOME:';
  totalLabelCell.font = { bold: true, size: 12, color: { argb: 'FF1E3A5F' }, name: 'Segoe UI' };
  totalLabelCell.alignment = { horizontal: 'right', vertical: 'middle' };
  totalLabelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F0FE' } };
  totalLabelCell.border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'medium' },
    right: { style: 'thin' }
  };
  
  const totalValueCell = worksheet.getCell(`F${footerRow}`);
  totalValueCell.value = totalSales;
  totalValueCell.font = { bold: true, size: 12, color: { argb: 'FF2E9E0C' }, name: 'Segoe UI' };
  totalValueCell.alignment = { horizontal: 'right', vertical: 'middle' };
  totalValueCell.numFmt = '₱#,##0.00';
  totalValueCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F0FE' } };
  totalValueCell.border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'medium' },
    right: { style: 'thin' }
  };

  // Summary footer row
  const summaryRow = footerRow + 1;
  worksheet.mergeCells(`A${summaryRow}:F${summaryRow}`);
  const footerCell = worksheet.getCell(`A${summaryRow}`);
  footerCell.value = `Total Quantity Sold: ${totalQuantity} | Number of Transactions: ${salesData.length} | Generated by PetShield Veterinary Clinic Inventory System`;
  footerCell.font = { size: 9, italic: true, color: { argb: 'FF888888' }, name: 'Segoe UI' };
  footerCell.alignment = { horizontal: 'center' };
  footerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFAFA' } };
  worksheet.getRow(summaryRow).height = 20;

  // SAVE
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `PetShield_Sales_Report_${period}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};