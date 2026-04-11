import ExcelJS from 'exceljs';

export interface InventoryImportRow {
  item: string;
  unit: string;
  category: string;
  basePrice: number;
  sellingPrice: number;
  stockCount: number;
  expirationDate: string;
  expirationNA: boolean;
  sourceRow: number;
}

const EXPECTED_SHEET_NAME = 'Inventory Template';
const EXPECTED_HEADERS = [
  'ITEM NAME',
  'UNIT',
  'CUSTOM UNIT',
  'CATEGORY',
  'BASE PRICE',
  'SELLING PRICE',
  'STOCK COUNT',
  'EXPIRATION DATE',
];

const VALID_CATEGORIES = new Set([
  'Pet Supplies',
  'Deworming',
  'Vitamins',
  'Food',
  'Accessories',
  'Medication',
]);

const COMMON_UNITS = new Set([
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
]);

const getCellText = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim();
  }

  if (value instanceof Date) {
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    const year = value.getFullYear();
    return `${month}/${day}/${year}`;
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.richText)) {
      return record.richText.map((part) => String((part as { text?: string }).text || '')).join('').trim();
    }
    if (typeof record.text === 'string') {
      return record.text.trim();
    }
    if (record.result !== undefined) {
      return getCellText(record.result);
    }
  }

  return '';
};

const normalizeHeader = (value: string): string =>
  value
    .replace(/\(.*?\)/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

const parseNumber = (raw: string, fieldLabel: string, rowNumber: number): number => {
  const normalized = raw.replace(/[,\s]/g, '');
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Row ${rowNumber}: ${fieldLabel} must be a valid number`);
  }
  return parsed;
};

const normalizeItemName = (item: string): string =>
  item
    .trim()
    .split(/\s+/)
    .map((word) =>
      word
        .split('-')
        .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : ''))
        .join('-')
    )
    .join(' ');

const normalizeUnitName = (unit: string): string =>
  unit
    .trim()
    .split(/\s+/)
    .map((word) => {
      const lowerWord = word.toLowerCase();
      if (lowerWord === 'ml') return 'mL';
      if (lowerWord === 'l') return 'L';
      if (lowerWord === 'kg') return 'Kg';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');

const resolveUnit = (unitRaw: string, customUnitRaw: string, rowNumber: number): string => {
  const unitCell = unitRaw.trim();
  const customUnit = normalizeUnitName(customUnitRaw);

  if (!unitCell) {
    throw new Error(`Row ${rowNumber}: Unit is required`);
  }

  if (unitCell === 'Others - specify manually') {
    if (!customUnit) {
      throw new Error(`Row ${rowNumber}: Custom Unit is required when Unit is set to Others - specify manually`);
    }
    if (customUnit.length > 30) {
      throw new Error(`Row ${rowNumber}: Custom Unit must be 30 characters or less`);
    }
    return customUnit;
  }

  const normalizedUnit = normalizeUnitName(unitCell);
  if (!COMMON_UNITS.has(normalizedUnit)) {
    throw new Error(`Row ${rowNumber}: Unit must use the official PetShield dropdown values`);
  }

  return normalizedUnit;
};

const normalizeExpiration = (raw: string, rowNumber: number): { expirationDate: string; expirationNA: boolean } => {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.toUpperCase() === 'N/A') {
    return { expirationDate: '', expirationNA: true };
  }

  if (/^\d{2}\/\d{4}$/.test(trimmed)) {
    const [month, year] = trimmed.split('/');
    return { expirationDate: `${month}/01/${year}`, expirationNA: false };
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    return { expirationDate: trimmed, expirationNA: false };
  }

  throw new Error(`Row ${rowNumber}: Expiration Date must be MM/YYYY, MM/DD/YYYY, or N/A`);
};

export const parsePetShieldInventoryTemplate = async (file: File): Promise<InventoryImportRow[]> => {
  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    throw new Error('Only the official PetShield .xlsx inventory template can be imported');
  }

  const workbook = new ExcelJS.Workbook();
  const buffer = await file.arrayBuffer();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.getWorksheet(EXPECTED_SHEET_NAME) || workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('Invalid file: worksheet not found');
  }

  if (worksheet.name !== EXPECTED_SHEET_NAME) {
    throw new Error('Invalid file: please use the official PetShield inventory template');
  }

  const titleText = getCellText(worksheet.getCell('A1').value);
  if (!titleText.toUpperCase().includes('PETSHIELD VETERINARY CLINIC')) {
    throw new Error('Invalid file: this is not the official PetShield inventory template');
  }

  const actualHeaders = ['A9', 'B9', 'C9', 'D9', 'E9', 'F9', 'G9', 'H9'].map((cellRef) =>
    normalizeHeader(getCellText(worksheet.getCell(cellRef).value))
  );

  const expectedHeaders = EXPECTED_HEADERS.map(normalizeHeader);
  const headersMatch = expectedHeaders.every((header, index) => actualHeaders[index] === header);
  if (!headersMatch) {
    throw new Error('Invalid file: template columns do not match the official PetShield inventory template');
  }

  const rows: InventoryImportRow[] = [];
  const errors: string[] = [];

  for (let rowNumber = 10; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const itemCell = getCellText(row.getCell(1).value);
    const unitCell = getCellText(row.getCell(2).value);
    const customUnitCell = getCellText(row.getCell(3).value);
    const categoryCell = getCellText(row.getCell(4).value);
    const basePriceCell = getCellText(row.getCell(5).value);
    const sellingPriceCell = getCellText(row.getCell(6).value);
    const stockCountCell = getCellText(row.getCell(7).value);
    const expirationCell = getCellText(row.getCell(8).value);

    const firstCellUpper = itemCell.toUpperCase();
    if (firstCellUpper.includes('IMPORTANT NOTES') || firstCellUpper.startsWith('GENERATED BY PETSHIELD')) {
      break;
    }

    const isBlankRow = [itemCell, unitCell, customUnitCell, categoryCell, basePriceCell, sellingPriceCell, stockCountCell, expirationCell]
      .every((value) => !value);
    if (isBlankRow) {
      continue;
    }

    try {
      if (!itemCell || !unitCell || !categoryCell || !basePriceCell || !sellingPriceCell) {
        throw new Error(`Row ${rowNumber}: Item Name, Unit, Category, Base Price, and Selling Price are required`);
      }

      if (!VALID_CATEGORIES.has(categoryCell)) {
        throw new Error(`Row ${rowNumber}: Category must match the official PetShield template options`);
      }

      const unit = resolveUnit(unitCell, customUnitCell, rowNumber);

      const basePrice = parseNumber(basePriceCell, 'Base Price', rowNumber);
      const sellingPrice = parseNumber(sellingPriceCell, 'Selling Price', rowNumber);
      const stockCount = stockCountCell ? parseNumber(stockCountCell, 'Stock Count', rowNumber) : 0;

      if (!Number.isInteger(stockCount) || stockCount < 0) {
        throw new Error(`Row ${rowNumber}: Stock Count must be a whole number of 0 or greater`);
      }
      if (basePrice <= 0 || sellingPrice <= 0) {
        throw new Error(`Row ${rowNumber}: Base Price and Selling Price must be greater than 0`);
      }

      const { expirationDate, expirationNA } = normalizeExpiration(expirationCell, rowNumber);

      rows.push({
        item: normalizeItemName(itemCell),
        unit,
        category: categoryCell,
        basePrice,
        sellingPrice,
        stockCount,
        expirationDate,
        expirationNA,
        sourceRow: rowNumber,
      });
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `Row ${rowNumber}: Invalid row`);
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }

  if (rows.length === 0) {
    throw new Error('No inventory rows were found in the uploaded PetShield template');
  }

  return rows;
};
