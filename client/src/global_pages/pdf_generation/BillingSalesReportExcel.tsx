import ExcelJS from 'exceljs';
import PetShieldLogo from '../../assets/PetShieldLogo.jpg';

export interface BillingSalesReportRow {
  invoiceNumber: string;
  date: string;
  branch: string;
  invoiceType: string;
  customerName: string;
  petName: string;
  itemType: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  invoiceTotal: number;
  amountPaid: number;
  remainingBalance: number;
  paymentStatus: string;
  paymentMethod: string;
}

interface BillingSalesReportOptions {
  startDate: string;
  endDate: string;
  rangeLabel: string;
  branchLabel: string;
  invoiceTypeLabel: string;
  paymentMethodLabel: string;
  paymentStatusLabel: string;
  sections: Record<'summary' | 'itemized' | 'payments', boolean>;
  sectionLabels: string[];
  exportedBy: string;
}

const imageUrlToArrayBuffer = async (url: string): Promise<ArrayBuffer> => {
  const response = await fetch(url);
  return response.arrayBuffer();
};

const moneyFormat = '₱#,##0.00';
const titleFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFE8F0FE' } };
const headerFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF1E3A5F' } };
const thinBorder = {
  top: { style: 'thin' as const },
  left: { style: 'thin' as const },
  bottom: { style: 'thin' as const },
  right: { style: 'thin' as const }
};

const uniqueInvoiceRows = (rows: BillingSalesReportRow[]) => {
  const invoices = new Map<string, BillingSalesReportRow>();
  rows.forEach(row => invoices.set(row.invoiceNumber, row));
  return Array.from(invoices.values());
};

const styleSectionTitle = (worksheet: ExcelJS.Worksheet, rowNumber: number, title: string) => {
  worksheet.mergeCells(rowNumber, 1, rowNumber, 16);
  const cell = worksheet.getCell(rowNumber, 1);
  cell.value = title;
  cell.font = { bold: true, size: 12, color: { argb: 'FF1E3A5F' }, name: 'Segoe UI' };
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
  cell.fill = titleFill;
  worksheet.getRow(rowNumber).height = 26;
};

const styleHeaderRow = (row: ExcelJS.Row, columns: number) => {
  row.height = 30;
  for (let col = 1; col <= columns; col += 1) {
    const cell = row.getCell(col);
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10, name: 'Segoe UI' };
    cell.fill = headerFill;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'medium' },
      left: { style: 'thin' },
      bottom: { style: 'medium' },
      right: { style: 'thin' }
    };
  }
};

const styleDataRow = (row: ExcelJS.Row, columns: number) => {
  row.height = 24;
  for (let col = 1; col <= columns; col += 1) {
    const cell = row.getCell(col);
    cell.border = thinBorder;
    cell.alignment = { vertical: 'middle' };
  }
};

export const exportBillingSalesReportExcel = async (
  rows: BillingSalesReportRow[],
  options: BillingSalesReportOptions
): Promise<void> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sales Report');
  const invoiceRows = uniqueInvoiceRows(rows);

  worksheet.pageSetup.paperSize = 9;
  worksheet.pageSetup.orientation = 'landscape';
  worksheet.pageSetup.margins = {
    left: 0.4,
    right: 0.4,
    top: 0.5,
    bottom: 0.5,
    header: 0.3,
    footer: 0.3
  };

  [
    16, 13, 18, 14, 24, 16, 12, 30,
    8, 14, 14, 15, 14, 14, 13, 14
  ].forEach((width, index) => {
    worksheet.getColumn(index + 1).width = width;
  });

  try {
    const arrayBuffer = await imageUrlToArrayBuffer(PetShieldLogo);
    const imageId = workbook.addImage({ buffer: arrayBuffer, extension: 'jpeg' });
    worksheet.addImage(imageId, {
      tl: { col: 0.4, row: 0.4 },
      ext: { width: 80, height: 80 },
      editAs: 'absolute'
    });
  } catch (error) {
    console.log('Logo not found', error);
  }

  worksheet.mergeCells('B1:P1');
  const titleCell = worksheet.getCell('B1');
  titleCell.value = 'PETSHIELD VETERINARY CLINIC AND GROOMING CENTER';
  titleCell.font = { bold: true, size: 16, color: { argb: 'FF1E3A5F' }, name: 'Segoe UI' };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 35;

  worksheet.mergeCells('B2:P2');
  const addressCell = worksheet.getCell('B2');
  addressCell.value = '99 General Espino St, cor. Bravo St, Central Signal, Taguig, 1630 Metro Manila';
  addressCell.font = { size: 10, color: { argb: 'FF2C5F8A' }, name: 'Segoe UI' };
  addressCell.alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells('B3:P3');
  const mobileCell = worksheet.getCell('B3');
  mobileCell.value = 'Mobile No.: +63 905 457 0190';
  mobileCell.font = { size: 10, color: { argb: 'FF2C5F8A' }, name: 'Segoe UI', bold: true };
  mobileCell.alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells('A5:P5');
  const reportTitleCell = worksheet.getCell('A5');
  reportTitleCell.value = `BILLING SALES REPORT - ${options.rangeLabel.toUpperCase()}`;
  reportTitleCell.font = { bold: true, size: 14, color: { argb: 'FF1E3A5F' }, name: 'Segoe UI' };
  reportTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  reportTitleCell.fill = titleFill;
  worksheet.getRow(5).height = 30;

  worksheet.mergeCells('A6:P6');
  const exportDateCell = worksheet.getCell('A6');
  exportDateCell.value = `Export Date: ${new Date().toLocaleDateString()} | Export Time: ${new Date().toLocaleTimeString()} | Exported By: ${options.exportedBy}`;
  exportDateCell.font = { italic: true, size: 10, color: { argb: 'FF888888' }, name: 'Segoe UI' };
  exportDateCell.alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells('A7:P7');
  const filtersCell = worksheet.getCell('A7');
  filtersCell.value = `Branch: ${options.branchLabel} | Invoice Type: ${options.invoiceTypeLabel} | Payment Method: ${options.paymentMethodLabel} | Status: ${options.paymentStatusLabel} | Sections: ${options.sectionLabels.join(', ')}`;
  filtersCell.font = { italic: true, size: 9, color: { argb: 'FF64748B' }, name: 'Segoe UI' };
  filtersCell.alignment = { horizontal: 'center', vertical: 'middle' };

  let currentRow = 9;

  const totalSales = invoiceRows.reduce((sum, row) => sum + row.invoiceTotal, 0);
  const totalCollected = invoiceRows.reduce((sum, row) => sum + row.amountPaid, 0);
  const totalReceivables = invoiceRows.reduce((sum, row) => sum + row.remainingBalance, 0);
  const totalServiceSales = rows.filter(row => row.itemType === 'Service').reduce((sum, row) => sum + row.lineTotal, 0);
  const totalProductSales = rows.filter(row => row.itemType === 'Product').reduce((sum, row) => sum + row.lineTotal, 0);
  const totalQuantity = rows.reduce((sum, row) => sum + row.quantity, 0);

  if (options.sections.summary) {
    styleSectionTitle(worksheet, currentRow, 'SALES SUMMARY');
    currentRow += 1;

    const summaryHeader = worksheet.getRow(currentRow);
    summaryHeader.values = ['METRIC', 'VALUE'];
    styleHeaderRow(summaryHeader, 2);
    currentRow += 1;

    const summaryRows: Array<[string, number | string, boolean]> = [
      ['Gross Invoice Sales', totalSales, true],
      ['Collected Payments', totalCollected, true],
      ['Remaining Receivables', totalReceivables, true],
      ['Service Sales', totalServiceSales, true],
      ['Product Sales', totalProductSales, true],
      ['Total Quantity Sold', totalQuantity, false],
      ['Invoice Count', invoiceRows.length, false],
      ['Paid / Partial / Pending', `${invoiceRows.filter(row => row.paymentStatus === 'Paid').length} / ${invoiceRows.filter(row => row.paymentStatus === 'Partial Paid').length} / ${invoiceRows.filter(row => row.paymentStatus === 'Pending').length}`, false]
    ];

    summaryRows.forEach(([label, value, isMoney]) => {
      worksheet.mergeCells(currentRow, 2, currentRow, 16);
      const row = worksheet.getRow(currentRow);
      row.getCell(1).value = label;
      row.getCell(2).value = value;
      styleDataRow(row, 16);
      row.getCell(1).font = { bold: true, color: { argb: 'FF1E3A5F' }, name: 'Segoe UI' };
      row.getCell(2).font = { bold: true, color: { argb: isMoney ? 'FF2E9E0C' : 'FF1E3A5F' }, name: 'Segoe UI' };
      row.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' };
      if (isMoney) row.getCell(2).numFmt = moneyFormat;
      currentRow += 1;
    });

    currentRow += 1;
  }

  if (options.sections.payments) {
    styleSectionTitle(worksheet, currentRow, 'PAYMENT BREAKDOWN');
    currentRow += 1;

    const paymentHeader = worksheet.getRow(currentRow);
    paymentHeader.values = ['PAYMENT METHOD', 'INVOICES', 'COLLECTED', 'RECEIVABLES'];
    styleHeaderRow(paymentHeader, 4);
    currentRow += 1;

    ['Cash', 'Gcash', 'Installment'].forEach((method) => {
      const matched = invoiceRows.filter(row => row.paymentMethod.toLowerCase() === method.toLowerCase());
      const row = worksheet.getRow(currentRow);
      row.values = [
        method === 'Gcash' ? 'GCash' : method,
        matched.length,
        matched.reduce((sum, invoice) => sum + invoice.amountPaid, 0),
        matched.reduce((sum, invoice) => sum + invoice.remainingBalance, 0)
      ];
      styleDataRow(row, 4);
      row.getCell(2).numFmt = '0';
      row.getCell(3).numFmt = moneyFormat;
      row.getCell(4).numFmt = moneyFormat;
      row.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(3).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' };
      currentRow += 1;
    });

    currentRow += 1;
  }

  if (options.sections.itemized) {
    styleSectionTitle(worksheet, currentRow, 'ITEMIZED SALES');
    currentRow += 1;

    const headerRow = worksheet.getRow(currentRow);
    headerRow.values = [
      'INVOICE #', 'DATE', 'BRANCH', 'INVOICE TYPE', 'CUSTOMER', 'PET', 'TYPE', 'ITEM',
      'QTY', 'UNIT PRICE', 'LINE TOTAL', 'INVOICE TOTAL', 'AMOUNT PAID', 'BALANCE', 'STATUS', 'METHOD'
    ];
    styleHeaderRow(headerRow, 16);
    currentRow += 1;

    rows.forEach((sale) => {
      const row = worksheet.getRow(currentRow);
      row.values = [
        sale.invoiceNumber,
        sale.date,
        sale.branch,
        sale.invoiceType,
        sale.customerName,
        sale.petName,
        sale.itemType,
        sale.itemName,
        sale.quantity,
        sale.unitPrice,
        sale.lineTotal,
        sale.invoiceTotal,
        sale.amountPaid,
        sale.remainingBalance,
        sale.paymentStatus,
        sale.paymentMethod
      ];
      styleDataRow(row, 16);
      row.getCell(9).numFmt = '0';
      [10, 11, 12, 13, 14].forEach((col) => {
        row.getCell(col).numFmt = moneyFormat;
        row.getCell(col).alignment = { horizontal: 'right', vertical: 'middle' };
      });
      currentRow += 1;
    });

    currentRow += 1;
    worksheet.mergeCells(currentRow, 1, currentRow, 15);
    const totalLabelCell = worksheet.getCell(currentRow, 1);
    totalLabelCell.value = 'TOTAL SALES:';
    totalLabelCell.font = { bold: true, size: 12, color: { argb: 'FF1E3A5F' }, name: 'Segoe UI' };
    totalLabelCell.alignment = { horizontal: 'right', vertical: 'middle' };
    totalLabelCell.fill = titleFill;
    totalLabelCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'medium' },
      right: { style: 'thin' }
    };

    const totalValueCell = worksheet.getCell(currentRow, 16);
    totalValueCell.value = totalSales;
    totalValueCell.font = { bold: true, size: 12, color: { argb: 'FF2E9E0C' }, name: 'Segoe UI' };
    totalValueCell.alignment = { horizontal: 'right', vertical: 'middle' };
    totalValueCell.numFmt = moneyFormat;
    totalValueCell.fill = titleFill;
    totalValueCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'medium' },
      right: { style: 'thin' }
    };
    currentRow += 1;
  }

  worksheet.mergeCells(currentRow, 1, currentRow, 16);
  const footerCell = worksheet.getCell(currentRow, 1);
  footerCell.value = `Generated by PetShield Veterinary Clinic Billing System | Invoices: ${invoiceRows.length} | Itemized Rows: ${rows.length}`;
  footerCell.font = { size: 9, italic: true, color: { argb: 'FF888888' }, name: 'Segoe UI' };
  footerCell.alignment = { horizontal: 'center' };
  footerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFAFA' } };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `PetShield_Billing_Sales_Report_${options.startDate}_to_${options.endDate}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};
