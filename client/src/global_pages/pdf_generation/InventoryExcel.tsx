import ExcelJS from 'exceljs';
import PetShieldLogo from '../../assets/PetShieldLogo.jpg';


const imageUrlToArrayBuffer = async (url: string): Promise<ArrayBuffer> => {
  const response = await fetch(url);
  return await response.arrayBuffer();
};

export const downloadInventoryTemplate = async (): Promise<void> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Inventory Template');

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

  worksheet.columns = [
    { key: 'item', width: 40 },
    { key: 'category', width: 20 },
    { key: 'basePrice', width: 21.43 },
    { key: 'sellingPrice', width: 23.29 },
    { key: 'stockCount', width: 19 },
    { key: 'expirationDate', width: 23.29 },
  ];


  try {
    const arrayBuffer = await imageUrlToArrayBuffer(PetShieldLogo);
    
    const imageId = workbook.addImage({
      buffer: arrayBuffer,
      extension: 'jpeg',
    });

    worksheet.addImage(imageId, {
      tl: { col: 0.9, row: 0.5 },  
      ext: { width: 100, height: 100 }, 
      editAs: 'absolute'
    });
  } catch (error) {
    console.log('Logo not found, continuing without logo', error);
  }


  worksheet.mergeCells('A1:F1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = '     PETSHIELD VETERINARY CLINIC AND GROOMING CENTER';
  titleCell.font = { 
    bold: true, 
    size: 16, 
    color: { argb: 'FF1E3A5F' },
    name: 'Segoe UI'
  };
  titleCell.alignment = { 
    horizontal: 'center', 
    vertical: 'middle' 
  };
  worksheet.getRow(1).height = 45;

  // Row 2: Address
  worksheet.mergeCells('A2:F2');
  const addressCell = worksheet.getCell('A2');
  addressCell.value = '     99 General Espino St, cor. Bravo St, Central Signal, Taguig, 1630 Metro Manila';
  addressCell.font = { 
    size: 10, 
    color: { argb: 'FF2C5F8A' },
    name: 'Segoe UI'
  };
  addressCell.alignment = { 
    horizontal: 'center', 
    vertical: 'middle' 
  };
  worksheet.getRow(2).height = 25;

  // Row 3: Mobile Number
  worksheet.mergeCells('A3:F3');
  const mobileCell = worksheet.getCell('A3');
  mobileCell.value = '     Mobile No.: +63 905 457 0190';
  mobileCell.font = { 
    size: 10, 
    color: { argb: 'FF2C5F8A' },
    name: 'Segoe UI',
    bold: true
  };
  mobileCell.alignment = { 
    horizontal: 'center', 
    vertical: 'middle' 
  };
  worksheet.getRow(3).height = 25;

  // Row 6: Instructions
  worksheet.mergeCells('A6:F6');
  const instructionsCell = worksheet.getCell('A6');
  instructionsCell.value = '📋 Instructions: Fill in the fields below. Fields marked with * are required.';
  instructionsCell.font = { 
    italic: true, 
    size: 10,
    name: 'Segoe UI',
    color: { argb: 'FF555555' }
  };
  instructionsCell.alignment = { 
    horizontal: 'left', 
    vertical: 'middle' 
  };
  instructionsCell.fill = { 
    type: 'pattern', 
    pattern: 'solid', 
    fgColor: { argb: 'FFF9E6E6' } 
  };
  worksheet.getRow(6).height = 25;

  // Row 8: Empty spacer
  worksheet.getRow(8).height = 5;

// ========== DATA TABLE HEADER ==========
const headerRow = worksheet.getRow(9);
headerRow.height = 32;

// Define headers with their required status
const headers = [
  { text: 'ITEM NAME', required: true },
  { text: 'CATEGORY', required: true },
  { text: 'BASE PRICE (₱)', required: true },
  { text: 'SELLING PRICE (₱)', required: true },
  { text: 'STOCK COUNT', required: false },
  { text: 'EXPIRATION DATE', required: false }
];

// Set each cell individually with rich text for red asterisk
for (let col = 1; col <= 6; col++) {
  const cell = headerRow.getCell(col);
  const header = headers[col - 1];
  
  if (header.required) {
    // Create rich text with red asterisk
    cell.value = {
      richText: [
        { text: header.text, font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Segoe UI' } },
        { text: ' *', font: { bold: true, color: { argb: 'FFFF0000' }, size: 11, name: 'Segoe UI' } }
      ]
    };
  } else {
    cell.value = header.text;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Segoe UI' };
  }
  
  // Apply styling
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E3A5F' }
  };
  cell.alignment = {
    horizontal: 'center',
    vertical: 'middle'
  };
  cell.border = {
    top: { style: 'medium' },
    left: { style: 'thin' },
    bottom: { style: 'medium' },
    right: { style: 'thin' }
  };
}

  // ========== DATA VALIDATION ==========
  for (let i = 10; i <= 100; i++) {
    const validationCell = worksheet.getCell(`B${i}`);
    validationCell.dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: ['"Pet Supplies,Deworming,Vitamins,Food,Accessories,Medication"'],
      showErrorMessage: true,
      errorTitle: 'Invalid Category',
      error: 'Please select a valid category from the list.',
      showInputMessage: true,
      promptTitle: 'Category Selection',
      prompt: 'Select a category from the dropdown list'
    };
  }

  // Add validation for price columns (must be positive numbers)
  for (let i = 10; i <= 100; i++) {
    // Base Price validation (column C)
    const basePriceCell = worksheet.getCell(`C${i}`);
    basePriceCell.dataValidation = {
      type: 'decimal',
      operator: 'greaterThan',
      formulae: [0],
      allowBlank: false,
      showErrorMessage: true,
      errorTitle: 'Invalid Price',
      error: 'Base Price must be a positive number'
    };
    
    // Selling Price validation (column D)
    const sellingPriceCell = worksheet.getCell(`D${i}`);
    sellingPriceCell.dataValidation = {
      type: 'decimal',
      operator: 'greaterThan',
      formulae: [0],
      allowBlank: false,
      showErrorMessage: true,
      errorTitle: 'Invalid Price',
      error: 'Selling Price must be a positive number'
    };
    
    // Stock Count validation (column E) - whole number only
    const stockCountCell = worksheet.getCell(`E${i}`);
    stockCountCell.dataValidation = {
      type: 'whole',
      operator: 'greaterThanOrEqual',
      formulae: [0],
      allowBlank: true,
      showErrorMessage: true,
      errorTitle: 'Invalid Stock Count',
      error: 'Stock Count must be a whole number (0 or greater)'
    };
  }

  // ========== SAMPLE DATA ==========
  const sampleData = [
    ['Premium Dog Food Adult 5kg', 'Food', 850, 999, 45, '12/2025'],
    ['Gourmet Cat Food Fish Flavor 2kg', 'Food', 420, 549, 12, '03/2024'],
    ['Interactive Feather Cat Toy', 'Pet Supplies', 85, 149, 78, 'N/A'],
    ['Praziquantel Dewormer for Dogs (4 tabs)', 'Deworming', 180, 249, 34, '08/2024'],
    ['Multivitamin Paste for Dogs 100g', 'Vitamins', 320, 399, 8, '05/2024'],
    ['Orthopedic Dog Bed Medium Size', 'Accessories', 1250, 1599, 15, 'N/A'],
    ['Flea and Tick Treatment for Cats', 'Medication', 450, 599, 23, '11/2024']
  ];

  sampleData.forEach((row, index) => {
    const rowNum = 10 + index;
    const dataRow = worksheet.getRow(rowNum);
    dataRow.values = row;
    dataRow.height = 24;
    dataRow.alignment = { vertical: 'middle' };
    
    // Add borders and formatting to each cell
    dataRow.eachCell((cell, colNum) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      
      // Format price columns (col 3 and 4)
      if (colNum === 3 || colNum === 4) {
        cell.numFmt = '₱#,##0.00';
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      }
      
      // Format stock count (col 5)
      if (colNum === 5 && row[4] !== '') {
        cell.numFmt = '0';
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      }
      
      // Center align category column (col 2)
      if (colNum === 2) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
      
      // Format expiration date (col 6)
      if (colNum === 6) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    });
  });

  // ========== NOTES SECTION ==========
  const notesStartRow = 10 + sampleData.length + 1;
  
  // Notes header
  worksheet.mergeCells(`A${notesStartRow}:F${notesStartRow}`);
  const notesHeaderCell = worksheet.getCell(`A${notesStartRow}`);
  notesHeaderCell.value = '📌 IMPORTANT NOTES:';
  notesHeaderCell.font = { 
    bold: true, 
    size: 11,
    name: 'Segoe UI',
    color: { argb: 'FF1E3A5F' }
  };
  notesHeaderCell.fill = { 
    type: 'pattern', 
    pattern: 'solid', 
    fgColor: { argb: 'FFF0F0F0' } 
  };
  notesHeaderCell.border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };
  worksheet.getRow(notesStartRow).height = 25;

  // Note 1
  worksheet.mergeCells(`A${notesStartRow + 1}:F${notesStartRow + 1}`);
  const note1Cell = worksheet.getCell(`A${notesStartRow + 1}`);
  note1Cell.value = '• Categories must be one of: Pet Supplies, Deworming, Vitamins, Food, Accessories, Medication';
  note1Cell.font = { size: 10, name: 'Segoe UI' };
  note1Cell.border = {
    left: { style: 'thin' },
    right: { style: 'thin' }
  };
  
  // Note 2
  worksheet.mergeCells(`A${notesStartRow + 2}:F${notesStartRow + 2}`);
  const note2Cell = worksheet.getCell(`A${notesStartRow + 2}`);
  note2Cell.value = '• Expiration Date format: MM/YYYY (e.g., 12/2025) or "N/A" for products with no expiration';
  note2Cell.font = { size: 10, name: 'Segoe UI' };
  note2Cell.border = {
    left: { style: 'thin' },
    right: { style: 'thin' }
  };
  
  // Note 3
  worksheet.mergeCells(`A${notesStartRow + 3}:F${notesStartRow + 3}`);
  const note3Cell = worksheet.getCell(`A${notesStartRow + 3}`);
  note3Cell.value = '• Base Price and Selling Price must be in Philippine Peso (₱) - enter numbers only (e.g., 850, not ₱850)';
  note3Cell.font = { size: 10, name: 'Segoe UI' };
  note3Cell.border = {
    left: { style: 'thin' },
    right: { style: 'thin' }
  };
  
  // Note 4
  worksheet.mergeCells(`A${notesStartRow + 4}:F${notesStartRow + 4}`);
  const note4Cell = worksheet.getCell(`A${notesStartRow + 4}`);
  note4Cell.value = '• Stock Count should be a whole number (optional, defaults to 0 if left blank)';
  note4Cell.font = { size: 10, name: 'Segoe UI' };
  note4Cell.border = {
    left: { style: 'thin' },
    right: { style: 'thin' }
  };
  
  // Note 5
  worksheet.mergeCells(`A${notesStartRow + 5}:F${notesStartRow + 5}`);
  const note5Cell = worksheet.getCell(`A${notesStartRow + 5}`);
  note5Cell.value = '• Product Code is auto-generated by the system - do not include it in this template';
  note5Cell.font = { size: 10, name: 'Segoe UI', bold: true, color: { argb: 'FFD32F2F' } };
  note5Cell.border = {
    left: { style: 'thin' },
    right: { style: 'thin' }
  };
  
  // Note 6
  worksheet.mergeCells(`A${notesStartRow + 6}:F${notesStartRow + 6}`);
  const note6Cell = worksheet.getCell(`A${notesStartRow + 6}`);
  note6Cell.value = '• The peso sign (₱) is constant and automatically applied - do not enter the symbol';
  note6Cell.font = { size: 10, name: 'Segoe UI' };
  note6Cell.border = {
    left: { style: 'thin' },
    right: { style: 'thin' },
    bottom: { style: 'thin' }
  };
  worksheet.getRow(notesStartRow + 6).height = 20;

  // ========== FOOTER ==========
  const footerRow = notesStartRow + 7;
  worksheet.mergeCells(`A${footerRow}:F${footerRow}`);
  const footerCell = worksheet.getCell(`A${footerRow}`);
  footerCell.value = 'Generated by PetShield Veterinary Clinic Inventory System | Last updated: ' + new Date().toLocaleDateString();
  footerCell.font = { 
    size: 9, 
    italic: true, 
    color: { argb: 'FF888888' },
    name: 'Segoe UI'
  };
  footerCell.alignment = { horizontal: 'center' };
  footerCell.border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };
  footerCell.fill = { 
    type: 'pattern', 
    pattern: 'solid', 
    fgColor: { argb: 'FFFAFAFA' } 
  };
  worksheet.getRow(footerRow).height = 20;

  // ========== SAVE THE FILE ==========
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `PetShield_Inventory_Template_${new Date().toISOString().split('T')[0]}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};