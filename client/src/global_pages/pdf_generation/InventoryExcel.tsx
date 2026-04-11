import ExcelJS from 'exceljs';
import PetShieldLogo from '../../assets/PetShieldLogo.jpg';

const UNIT_OPTIONS = [
  'Capsule',
  'Tablet',
  'Bottle',
  'Piece',
  'Pack',
  'Box',
  'Vial',
  'Tube',
  'Sachet',
  'Can',
  'Bag',
  'mL',
  'L',
  'Gram',
  'Kg',
  'Others - specify manually',
];

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
    footer: 0.3,
  };

  worksheet.columns = [
    { key: 'item', width: 40 },
    { key: 'unit', width: 22 },
    { key: 'customUnit', width: 24 },
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
      editAs: 'absolute',
    });
  } catch (error) {
    console.log('Logo not found, continuing without logo', error);
  }

  worksheet.mergeCells('A1:H1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = '     PETSHIELD VETERINARY CLINIC AND GROOMING CENTER';
  titleCell.font = {
    bold: true,
    size: 16,
    color: { argb: 'FF1E3A5F' },
    name: 'Segoe UI',
  };
  titleCell.alignment = {
    horizontal: 'center',
    vertical: 'middle',
  };
  worksheet.getRow(1).height = 45;

  worksheet.mergeCells('A2:H2');
  const addressCell = worksheet.getCell('A2');
  addressCell.value = '     99 General Espino St, cor. Bravo St, Central Signal, Taguig, 1630 Metro Manila';
  addressCell.font = {
    size: 10,
    color: { argb: 'FF2C5F8A' },
    name: 'Segoe UI',
  };
  addressCell.alignment = {
    horizontal: 'center',
    vertical: 'middle',
  };
  worksheet.getRow(2).height = 25;

  worksheet.mergeCells('A3:H3');
  const mobileCell = worksheet.getCell('A3');
  mobileCell.value = '     Mobile No.: +63 905 457 0190';
  mobileCell.font = {
    size: 10,
    color: { argb: 'FF2C5F8A' },
    name: 'Segoe UI',
    bold: true,
  };
  mobileCell.alignment = {
    horizontal: 'center',
    vertical: 'middle',
  };
  worksheet.getRow(3).height = 25;

  worksheet.mergeCells('A6:H6');
  const instructionsCell = worksheet.getCell('A6');
  instructionsCell.value = 'Instructions: Fill in the fields below. Fields marked with * are required.';
  instructionsCell.font = {
    italic: true,
    size: 10,
    name: 'Segoe UI',
    color: { argb: 'FF555555' },
  };
  instructionsCell.alignment = {
    horizontal: 'left',
    vertical: 'middle',
  };
  instructionsCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF9E6E6' },
  };
  worksheet.getRow(6).height = 25;

  worksheet.getRow(8).height = 5;

  const headerRow = worksheet.getRow(9);
  headerRow.height = 32;

  const headers = [
    { text: 'ITEM NAME', required: true },
    { text: 'UNIT', required: true },
    { text: 'CUSTOM UNIT (IF OTHERS)', required: false },
    { text: 'CATEGORY', required: true },
    { text: 'BASE PRICE (PHP)', required: true },
    { text: 'SELLING PRICE (PHP)', required: true },
    { text: 'STOCK COUNT', required: false },
    { text: 'EXPIRATION DATE', required: false },
  ];

  for (let col = 1; col <= headers.length; col += 1) {
    const cell = headerRow.getCell(col);
    const header = headers[col - 1];

    if (header.required) {
      cell.value = {
        richText: [
          { text: header.text, font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Segoe UI' } },
          { text: ' *', font: { bold: true, color: { argb: 'FFFF0000' }, size: 11, name: 'Segoe UI' } },
        ],
      };
    } else {
      cell.value = header.text;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Segoe UI' };
    }

    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A5F' },
    };
    cell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };
    cell.border = {
      top: { style: 'medium' },
      left: { style: 'thin' },
      bottom: { style: 'medium' },
      right: { style: 'thin' },
    };
  }

  for (let i = 10; i <= 100; i += 1) {
    const unitCell = worksheet.getCell(`B${i}`);
    unitCell.dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: [`"${UNIT_OPTIONS.join(',')}"`],
      showErrorMessage: true,
      errorTitle: 'Invalid Unit',
      error: 'Please select a valid unit from the list. If not listed, choose Others - specify manually.',
      showInputMessage: true,
      promptTitle: 'Unit Selection',
      prompt: 'Select a common unit or choose Others - specify manually.',
    };

    const categoryCell = worksheet.getCell(`D${i}`);
    categoryCell.dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: ['"Pet Supplies,Deworming,Vitamins,Food,Accessories,Medication"'],
      showErrorMessage: true,
      errorTitle: 'Invalid Category',
      error: 'Please select a valid category from the list.',
      showInputMessage: true,
      promptTitle: 'Category Selection',
      prompt: 'Select a category from the dropdown list',
    };

    const basePriceCell = worksheet.getCell(`E${i}`);
    basePriceCell.dataValidation = {
      type: 'decimal',
      operator: 'greaterThan',
      formulae: [0],
      allowBlank: false,
      showErrorMessage: true,
      errorTitle: 'Invalid Price',
      error: 'Base Price must be a positive number',
    };

    const sellingPriceCell = worksheet.getCell(`F${i}`);
    sellingPriceCell.dataValidation = {
      type: 'decimal',
      operator: 'greaterThan',
      formulae: [0],
      allowBlank: false,
      showErrorMessage: true,
      errorTitle: 'Invalid Price',
      error: 'Selling Price must be a positive number',
    };

    const stockCountCell = worksheet.getCell(`G${i}`);
    stockCountCell.dataValidation = {
      type: 'whole',
      operator: 'greaterThanOrEqual',
      formulae: [0],
      allowBlank: true,
      showErrorMessage: true,
      errorTitle: 'Invalid Stock Count',
      error: 'Stock Count must be a whole number (0 or greater)',
    };
  }

  const sampleData = [
    ['Premium Dog Food Adult 5kg', 'Bag', '', 'Food', 850, 999, 45, '12/25/2025'],
    ['Gourmet Cat Food Fish Flavor 2kg', 'Bag', '', 'Food', 420, 549, 12, '03/15/2024'],
    ['Interactive Feather Cat Toy', 'Piece', '', 'Pet Supplies', 85, 149, 78, 'N/A'],
    ['Praziquantel Dewormer for Dogs (4 tabs)', 'Tablet', '', 'Deworming', 180, 249, 34, '08/10/2024'],
    ['Multivitamin Paste for Dogs 100g', 'Tube', '', 'Vitamins', 320, 399, 8, '05/20/2024'],
    ['Orthopedic Dog Bed Medium Size', 'Piece', '', 'Accessories', 1250, 1599, 15, 'N/A'],
    ['Flea and Tick Treatment for Cats', 'Vial', '', 'Medication', 450, 599, 23, '11/10/2024'],
  ];

  sampleData.forEach((row, index) => {
    const rowNum = 10 + index;
    const dataRow = worksheet.getRow(rowNum);
    dataRow.values = row;
    dataRow.height = 24;
    dataRow.alignment = { vertical: 'middle' };

    dataRow.eachCell((cell, colNum) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };

      if (colNum === 5 || colNum === 6) {
        cell.numFmt = '"PHP " #,##0.00';
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      }

      if (colNum === 7 && row[6] !== '') {
        cell.numFmt = '0';
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      }

      if (colNum === 2 || colNum === 4 || colNum === 8) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    });
  });

  const notesStartRow = 10 + sampleData.length + 1;

  worksheet.mergeCells(`A${notesStartRow}:H${notesStartRow}`);
  const notesHeaderCell = worksheet.getCell(`A${notesStartRow}`);
  notesHeaderCell.value = 'IMPORTANT NOTES:';
  notesHeaderCell.font = {
    bold: true,
    size: 11,
    name: 'Segoe UI',
    color: { argb: 'FF1E3A5F' },
  };
  notesHeaderCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF0F0F0' },
  };
  notesHeaderCell.border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
  };
  worksheet.getRow(notesStartRow).height = 25;

  const notes = [
    'Categories must be one of: Pet Supplies, Deworming, Vitamins, Food, Accessories, Medication',
    'Expiration Date format: MM/DD/YYYY (example: 12/25/2025) or "N/A" for products with no expiration',
    'Base Price and Selling Price must be in Philippine Peso. Enter numbers only, without symbols.',
    'Stock Count should be a whole number (optional, defaults to 0 if left blank)',
    'Product Code is auto-generated by the system. Do not include it in this template.',
    'For units not listed in the dropdown, choose "Others - specify manually" and fill in the Custom Unit column.',
    'If Unit is not "Others - specify manually", leave Custom Unit blank.',
  ];

  notes.forEach((note, index) => {
    const noteRowNumber = notesStartRow + 1 + index;
    worksheet.mergeCells(`A${noteRowNumber}:H${noteRowNumber}`);
    const noteCell = worksheet.getCell(`A${noteRowNumber}`);
    noteCell.value = `- ${note}`;
    noteCell.font = {
      size: 10,
      name: 'Segoe UI',
      bold: index === 4,
      color: index === 4 ? { argb: 'FFD32F2F' } : undefined,
    };
    noteCell.border = {
      left: { style: 'thin' },
      right: { style: 'thin' },
      bottom: index === notes.length - 1 ? { style: 'thin' } : undefined,
    };
  });

  const footerRow = notesStartRow + notes.length + 1;
  worksheet.mergeCells(`A${footerRow}:H${footerRow}`);
  const footerCell = worksheet.getCell(`A${footerRow}`);
  footerCell.value = `Generated by PetShield Veterinary Clinic Inventory System | Last updated: ${new Date().toLocaleDateString()}`;
  footerCell.font = {
    size: 9,
    italic: true,
    color: { argb: 'FF888888' },
    name: 'Segoe UI',
  };
  footerCell.alignment = { horizontal: 'center' };
  footerCell.border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
  };
  footerCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFAFAFA' },
  };
  worksheet.getRow(footerRow).height = 20;

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
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
