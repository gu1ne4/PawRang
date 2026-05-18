export const PAYREX_MOCK_PAYMENT_METHOD = 'payrex_mock';

export const isPayrexMockPaymentMethod = (method?: string): boolean =>
  String(method || '').trim().toLowerCase() === PAYREX_MOCK_PAYMENT_METHOD;

export const generatePayrexMockReference = (): string => {
  const now = new Date();
  const dateCode = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const randomCode = Math.random().toString(16).slice(2, 10).toUpperCase().padEnd(8, '0');
  return `PRX-${dateCode}-${randomCode}`;
};

export const roundCurrency = (amount: number): number =>
  Math.round((Number(amount) + Number.EPSILON) * 100) / 100;

export const buildPayrexMockQrPayload = (
  reference: string,
  amount: number,
  invoiceNumber?: string,
): string =>
  JSON.stringify({
    provider: 'payrex_mock',
    mode: 'qrph_mock',
    currency: 'PHP',
    referenceNumber: reference,
    amount: roundCurrency(amount),
    invoiceNumber: invoiceNumber || undefined,
  });

const hashPayrexMockPayload = (value: string): number => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
};

export const buildPayrexMockQrCells = (payload: string, size = 17): boolean[] => {
  const seed = hashPayrexMockPayload(payload || 'payrex-mock');
  return Array.from({ length: size * size }, (_, index) => {
    const row = Math.floor(index / size);
    const col = index % size;
    const inTopLeft = row < 5 && col < 5;
    const inTopRight = row < 5 && col >= size - 5;
    const inBottomLeft = row >= size - 5 && col < 5;
    if (inTopLeft || inTopRight || inBottomLeft) {
      const localRow = row < 5 ? row : row - (size - 5);
      const localCol = col < 5 ? col : col - (size - 5);
      return (
        localRow === 0 ||
        localRow === 4 ||
        localCol === 0 ||
        localCol === 4 ||
        (localRow === 2 && localCol === 2)
      );
    }
    return ((seed + index * 31 + row * 17 + col * 13) % 7) < 3;
  });
};

export const parsePriceLabel = (price?: string): number => {
  if (!price) return 0;
  const perNightMatch = price.match(/([\d,.]+)\s*\/\s*night/i);
  const amountMatch = (perNightMatch ? perNightMatch[1] : price).replace(/,/g, '').match(/[\d.]+/);
  return amountMatch ? Number(amountMatch[0]) : 0;
};

export const formatCurrency = (amount: number): string => {
  const safeAmount = roundCurrency(amount);
  if (safeAmount <= 0) return 'To be confirmed';
  if (Number.isInteger(safeAmount)) return `₱${safeAmount.toLocaleString('en-PH')}`;
  return `₱${safeAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
