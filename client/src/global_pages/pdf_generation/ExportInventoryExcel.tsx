import ExcelJS from 'exceljs';
import PetShieldLogo from '../../assets/PetShieldLogo.jpg';

interface Product {
  code: string;
  item: string;
  category: string;
  basePrice: number;
  sellingPrice: number;
  stockCount: number;
  expirationDate?: string;
  expirationNA?: boolean;
}

const imageUrlToArrayBuffer = async (url: string): Promise<ArrayBuffer> => {
  const response = await fetch(url);
  return await response.arrayBuffer();
};

export const exportInventoryData = async (products: Product[]): Promise<void> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Inventory Export');

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
  worksheet.getColumn(1).width = 12;   // Column A - Logo space
  worksheet.getColumn(2).width = 40;  // Column B - Item Name
  worksheet.getColumn(3).width = 20;  // Column C - Category
  worksheet.getColumn(4).width = 18;  // Column D - Base Price
  worksheet.getColumn(5).width = 18;  // Column E - Selling Price
  worksheet.getColumn(6).width = 15;  // Column F - Stock Count
  worksheet.getColumn(7).width = 22;  // Column G - Expiration Date

  // Add logo
  try {
    const arrayBuffer = await imageUrlToArrayBuffer(PetShieldLogo);
    const imageId = workbook.addImage({
      buffer: arrayBuffer,
      extension: 'jpeg',
    });
    worksheet.addImage(imageId, {
    tl: { col: 1, row: 0.5 }, 
    ext: { width: 100, height: 100 },
    editAs: 'absolute'
    });
  } catch (error) {
    console.log('Logo not found', error);
  }

  // ========== HEADER SECTION ==========
  // Row 1: Company Name
  worksheet.mergeCells('B1:G1');
  const titleCell = worksheet.getCell('B1');
  titleCell.value = 'PETSHIELD VETERINARY CLINIC AND GROOMING CENTER';
  titleCell.font = { bold: true, size: 16, color: { argb: 'FF1E3A5F' }, name: 'Segoe UI' };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle', indent: 1 };
  worksheet.getRow(1).height = 45;

  // Row 2: Address
  worksheet.mergeCells('B2:G2');
  const addressCell = worksheet.getCell('B2');
  addressCell.value = '99 General Espino St, cor. Bravo St, Central Signal, Taguig, 1630 Metro Manila';
  addressCell.font = { size: 10, color: { argb: 'FF2C5F8A' }, name: 'Segoe UI' };
  addressCell.alignment = { horizontal: 'center', vertical: 'middle', indent: 1 };
  worksheet.getRow(2).height = 25;

  // Row 3: Mobile Number
  worksheet.mergeCells('B3:G3');
  const mobileCell = worksheet.getCell('B3');
  mobileCell.value = 'Mobile No.: +63 905 457 0190';
  mobileCell.font = { size: 10, color: { argb: 'FF2C5F8A' }, name: 'Segoe UI', bold: true };
  mobileCell.alignment = { horizontal: 'center', vertical: 'middle', indent: 1 };
  worksheet.getRow(3).height = 25;

  // Row 4: Empty spacer
  worksheet.getRow(4).height = 10;

  // Row 5: Export Title
  worksheet.mergeCells('B5:G5');
  const exportTitleCell = worksheet.getCell('B5');
  exportTitleCell.value = 'INVENTORY EXPORT REPORT';
  exportTitleCell.font = { bold: true, size: 14, color: { argb: 'FF1E3A5F' }, name: 'Segoe UI' };
  exportTitleCell.alignment = { horizontal: 'center', vertical: 'middle', indent: 1 };
  exportTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F0FE' } };
  worksheet.getRow(5).height = 30;

  // Row 6: Export Date
  worksheet.mergeCells('A6:G6');
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
    { text: 'ITEM NAME', required: true },
    { text: 'CATEGORY', required: true },
    { text: 'BASE PRICE (₱)', required: true },
    { text: 'SELLING PRICE (₱)', required: true },
    { text: 'STOCK COUNT', required: false },
    { text: 'EXPIRATION DATE', required: false }
  ];

  for (let col = 1; col <= 6; col++) {
    const cell = headerRow.getCell(col + 1); // +1 because column A is for spacing
    const header = headers[col - 1];
    
    if (header.required) {
      cell.value = {
        richText: [
          { text: header.text, font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Segoe UI' } },
          { text: '*', font: { bold: true, color: { argb: 'FFFF0000' }, size: 11, name: 'Segoe UI' } }
        ]
      };
    } else {
      cell.value = header.text;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Segoe UI' };
    }
    
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'medium' },
      left: { style: 'thin' },
      bottom: { style: 'medium' },
      right: { style: 'thin' }
    };
  }

  // ========== POPULATE DATA ==========
  products.forEach((product, index) => {
    const rowNum = 9 + index;
    const dataRow = worksheet.getRow(rowNum);
    dataRow.height = 24;
    
    // Format expiration date
    let expirationDate = product.expirationDate || 'N/A';
    if (product.expirationNA) {
      expirationDate = 'N/A';
    }
    
    dataRow.values = [
      '', // Empty for column A (spacing)
      product.item,
      product.category,
      product.basePrice,
      product.sellingPrice,
      product.stockCount,
      expirationDate
    ];
    
    dataRow.alignment = { vertical: 'middle' };
    
    // Add borders and formatting
    for (let col = 2; col <= 7; col++) {
      const cell = dataRow.getCell(col);
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      
      // Format price columns (col 4 and 5)
      if (col === 4 || col === 5) {
        cell.numFmt = '₱#,##0.00';
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      }
      
      // Format stock count (col 6)
      if (col === 6) {
        cell.numFmt = '0';
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      }
      
      // Center align category (col 3)
      if (col === 3) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
      
      // Center align expiration date (col 7)
      if (col === 7) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    }
  });

  // ========== FOOTER ==========
  const footerRow = 9 + products.length + 1;
  worksheet.mergeCells(`A${footerRow}:G${footerRow}`);
  const footerCell = worksheet.getCell(`A${footerRow}`);
  footerCell.value = `Total Products: ${products.length} | Generated by PetShield Veterinary Clinic Inventory System`;
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
  a.download = `PetShield_Inventory_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};