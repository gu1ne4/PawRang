export interface InventoryBatch {
  id?: string | number;
  batchNumber: string;
  quantityOnHand: number;
  expirationDate?: string;
  expirationNA?: boolean;
  status?: string;
  expirationStatus?: string;
  supplier?: string;
  receivedDate?: string;
}

const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toStringValue = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

export const normalizeInventoryBatch = (raw: any): InventoryBatch => {
  const expirationDate = toStringValue(
    raw?.expirationDate ??
    raw?.expiration_date ??
    raw?.expiryDate ??
    raw?.expiry_date ??
    raw?.expiresAt ??
    raw?.expires_at
  );
  const expirationNA = Boolean(
    raw?.expirationNA ??
    raw?.expiration_na ??
    raw?.noExpiration ??
    raw?.no_expiration ??
    expirationDate.toUpperCase() === 'N/A'
  );

  return {
    id:
      raw?.id ??
      raw?.pk ??
      raw?.inventoryBatchId ??
      raw?.inventory_batch_id ??
      raw?.batchId ??
      raw?.batch_id,
    batchNumber: toStringValue(
      raw?.batchNumber ??
      raw?.batch_number ??
      raw?.lotNumber ??
      raw?.lot_number ??
      raw?.number ??
      raw?.code
    ),
    quantityOnHand: toNumber(
      raw?.quantityOnHand ??
      raw?.quantity_on_hand ??
      raw?.availableStock ??
      raw?.available_stock ??
      raw?.stockCount ??
      raw?.stock_count ??
      raw?.quantity ??
      raw?.qty
    ),
    expirationDate,
    expirationNA,
    status: toStringValue(raw?.status ?? raw?.batchStatus ?? raw?.batch_status ?? raw?.inventoryStatus ?? raw?.inventory_status),
    expirationStatus: toStringValue(raw?.expirationStatus ?? raw?.expiration_status),
    supplier: toStringValue(raw?.supplier ?? raw?.receivedFrom ?? raw?.received_from),
    receivedDate: toStringValue(raw?.receivedDate ?? raw?.received_date ?? raw?.dateReceived ?? raw?.date_received),
  };
};

export const getProductBatches = (product: any): InventoryBatch[] => {
  const batchSources = [
    product?.activeBatches,
    product?.active_batches,
    product?.batches,
    product?.inventoryBatches,
    product?.inventory_batches,
  ];
  const rawBatches = batchSources.find(source => Array.isArray(source) && source.length > 0) ?? [];

  if (!Array.isArray(rawBatches)) return [];

  return rawBatches
    .map(normalizeInventoryBatch)
    .filter(batch => batch.id !== undefined || batch.batchNumber || batch.quantityOnHand > 0);
};

export const parseInventoryExpirationDate = (value?: string): Date | null => {
  const trimmed = toStringValue(value);
  if (!trimmed || trimmed.toUpperCase() === 'N/A') return null;

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
  }

  const fullMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (fullMatch) {
    return new Date(Number(fullMatch[3]), Number(fullMatch[1]) - 1, Number(fullMatch[2]));
  }

  const monthMatch = trimmed.match(/^(\d{1,2})\/(\d{4})$/);
  if (monthMatch) {
    return new Date(Number(monthMatch[2]), Number(monthMatch[1]), 0);
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const isBatchExpired = (batch: InventoryBatch): boolean => {
  if (batch.expirationNA) return false;
  const expiration = parseInventoryExpirationDate(batch.expirationDate);
  if (!expiration) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return expiration <= today;
};

export const getDaysUntilBatchExpiration = (batch: InventoryBatch): number | null => {
  if (batch.expirationNA) return null;
  const expiration = parseInventoryExpirationDate(batch.expirationDate);
  if (!expiration) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((expiration.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

export const isBatchExpiringSoon = (batch: InventoryBatch): boolean => {
  if (batch.expirationNA || isBatchExpired(batch)) return false;
  const daysUntilExpiration = getDaysUntilBatchExpiration(batch);
  return daysUntilExpiration !== null && daysUntilExpiration <= 90;
};

export const getBatchExpirationStatus = (batch: InventoryBatch): string => {
  if (batch.status === 'For Disposal') return 'For Disposal';
  if (batch.expirationNA || !batch.expirationDate || batch.expirationDate.toUpperCase() === 'N/A') {
    return 'No expiration';
  }
  if (isBatchExpired(batch)) return 'Expired';
  const daysUntilExpiration = getDaysUntilBatchExpiration(batch);
  if (daysUntilExpiration !== null && daysUntilExpiration <= 30) return 'Expiring in 1 month';
  if (daysUntilExpiration !== null && daysUntilExpiration <= 60) return 'Expiring in 2 months';
  if (daysUntilExpiration !== null && daysUntilExpiration <= 90) return 'Expiring in 3 months';
  return batch.expirationStatus || batch.status || 'Active';
};

export const getBatchDisplayNumber = (batch: InventoryBatch): string =>
  batch.batchNumber || (batch.id !== undefined ? `Batch ${batch.id}` : 'Unnamed batch');

export const getBatchSelectValue = (batch: InventoryBatch): string => {
  if (batch.id !== undefined) return `id:${batch.id}`;
  return `number:${batch.batchNumber}`;
};

export const findBatchBySelectValue = (batches: InventoryBatch[], value?: string): InventoryBatch | undefined => {
  if (!value) return undefined;
  return batches.find(batch => getBatchSelectValue(batch) === value);
};

export const getBatchSummary = (product: any): { count: number; totalStock: number } => {
  const batches = getProductBatches(product);
  return {
    count: batches.length,
    totalStock: batches.reduce((sum, batch) => sum + batch.quantityOnHand, 0),
  };
};
