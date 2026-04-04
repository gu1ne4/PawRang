export interface InventoryLog {
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

export const MOCK_LOGS: InventoryLog[] = [
  {
    id: 13,
    date: '2024-03-15',
    time: '09:30:15',
    productCode: 'DOG-FD-001',
    productName: 'Premium Dog Food Adult 5kg',
    type: 'IN',
    quantity: 50,
    referenceNumber: 'GRN-20240315-0001',
    reason: 'Stock Replenishment',
    supplierOrIssuedTo: 'Pet Supplies Co.',
    user: 'John Doe',
    notes: 'Initial stock order',
    unitCost: 850,
    totalCost: 42500
  },
  {
    id: 14,
    date: '2024-03-14',
    time: '14:45:22',
    productCode: 'DOG-FD-001',
    productName: 'Premium Dog Food Adult 5kg',
    type: 'OUT',
    quantity: 5,
    referenceNumber: 'TRX-20240314-0452',
    reason: 'Sale',
    supplierOrIssuedTo: 'Maria Santos',
    user: 'Jane Smith',
    notes: 'Customer purchase',
    unitCost: 999,
    totalCost: 4995
  },
  {
    id: 1,
    date: '2024-03-15',
    time: '09:30:15',
    productCode: 'DOG-FD-001',
    productName: 'Premium Dog Food Adult 5kg',
    type: 'IN',
    quantity: 50,
    referenceNumber: 'GRN-20240315-0001',
    reason: 'Stock Replenishment',
    supplierOrIssuedTo: 'Pet Supplies Co.',
    user: 'John Doe',
    notes: 'Initial stock order from Pet Supplies Co. This is a longer note to test the preview functionality.',
    unitCost: 850,
    totalCost: 42500
  },
  {
    id: 2,
    date: '2024-03-15',
    time: '09:30:15',
    productCode: 'CAT-FD-002',
    productName: 'Gourmet Cat Food Fish Flavor 2kg',
    type: 'IN',
    quantity: 30,
    referenceNumber: 'GRN-20240315-0001',
    reason: 'Stock Replenishment',
    supplierOrIssuedTo: 'Pet Supplies Co.',
    user: 'John Doe',
    notes: '',
    unitCost: 420,
    totalCost: 12600
  },
  {
    id: 3,
    date: '2024-03-14',
    time: '14:45:22',
    productCode: 'DOG-FD-001',
    productName: 'Premium Dog Food Adult 5kg',
    type: 'OUT',
    quantity: 5,
    referenceNumber: 'TRX-20240314-0452',
    reason: 'Sale',
    supplierOrIssuedTo: 'Maria Santos',
    user: 'Jane Smith',
    notes: 'Customer: Maria Santos, Senior citizen discount applied',
    unitCost: 999,
    totalCost: 4995
  },
  {
    id: 4,
    date: '2024-03-14',
    time: '14:45:22',
    productCode: 'SUP-TOY-023',
    productName: 'Interactive Feather Cat Toy',
    type: 'OUT',
    quantity: 3,
    referenceNumber: 'TRX-20240314-0452',
    reason: 'Sale',
    supplierOrIssuedTo: 'Maria Santos',
    user: 'Jane Smith',
    notes: '',
    unitCost: 149,
    totalCost: 447
  },
  {
    id: 5,
    date: '2024-03-13',
    time: '11:20:05',
    productCode: 'VIT-DG-089',
    productName: 'Multivitamin Paste for Dogs 100g',
    type: 'OUT',
    quantity: 2,
    referenceNumber: 'TRX-20240313-0891',
    reason: 'Damaged',
    supplierOrIssuedTo: 'N/A',
    user: 'Mike Johnson',
    notes: 'Packaging damaged during handling - returned to supplier',
    unitCost: 399,
    totalCost: 798
  },
  {
    id: 6,
    date: '2024-03-12',
    time: '16:10:33',
    productCode: 'CAT-FD-002',
    productName: 'Gourmet Cat Food Fish Flavor 2kg',
    type: 'OUT',
    quantity: 8,
    referenceNumber: 'TRX-20240312-0341',
    reason: 'Expired',
    supplierOrIssuedTo: 'N/A',
    user: 'Sarah Lee',
    notes: 'Batch expired on 03/01/2024 - disposed',
    unitCost: 549,
    totalCost: 4392
  },
  {
    id: 7,
    date: '2024-03-11',
    time: '08:15:00',
    productCode: 'DEW-PP-056',
    productName: 'Praziquantel Dewormer for Dogs (4 tabs)',
    type: 'IN',
    quantity: 20,
    referenceNumber: 'GRN-20240311-0002',
    reason: 'Stock Replenishment',
    supplierOrIssuedTo: 'MedSupply Inc.',
    user: 'John Doe',
    notes: 'New shipment from MedSupply',
    unitCost: 180,
    totalCost: 3600
  },
  {
    id: 8,
    date: '2024-03-10',
    time: '13:55:47',
    productCode: 'ACC-BED-112',
    productName: 'Orthopedic Dog Bed Medium Size',
    type: 'OUT',
    quantity: 1,
    referenceNumber: 'TRX-20240310-0762',
    reason: 'Sale',
    supplierOrIssuedTo: 'Robert Reyes',
    user: 'Jane Smith',
    notes: 'Customer requested gift wrapping',
    unitCost: 1599,
    totalCost: 1599
  },
  {
    id: 9,
    date: '2024-03-09',
    time: '10:30:00',
    productCode: 'SUP-TOY-023',
    productName: 'Interactive Feather Cat Toy',
    type: 'IN',
    quantity: 50,
    referenceNumber: 'GRN-20240309-0003',
    reason: 'Stock Replenishment',
    supplierOrIssuedTo: 'Toy World Inc.',
    user: 'John Doe',
    notes: 'Holiday season stock - 20% discount applied',
    unitCost: 85,
    totalCost: 4250
  },
  {
    id: 10,
    date: '2024-03-08',
    time: '15:20:18',
    productCode: 'MED-FL-067',
    productName: 'Flea and Tick Treatment for Cats',
    type: 'OUT',
    quantity: 4,
    referenceNumber: 'TRX-20240308-0543',
    reason: 'Sale',
    supplierOrIssuedTo: 'Anna Cruz',
    user: 'Mike Johnson',
    notes: '',
    unitCost: 599,
    totalCost: 2396
  },
  {
    id: 11,
    date: '2024-03-07',
    time: '09:45:30',
    productCode: 'DOG-FD-089',
    productName: 'Puppy Formula Dog Food 3kg',
    type: 'IN',
    quantity: 25,
    referenceNumber: 'GRN-20240307-0004',
    reason: 'Stock Replenishment',
    supplierOrIssuedTo: 'Pet Supplies Co.',
    user: 'Sarah Lee',
    notes: 'Urgent replenishment - express shipping',
    unitCost: 680,
    totalCost: 17000
  },
  {
    id: 12,
    date: '2024-03-06',
    time: '12:00:00',
    productCode: 'VIT-DG-089',
    productName: 'Multivitamin Paste for Dogs 100g',
    type: 'IN',
    quantity: 15,
    referenceNumber: 'GRN-20240306-0005',
    reason: 'Stock Replenishment',
    supplierOrIssuedTo: 'VitaPet Corp',
    user: 'John Doe',
    notes: '',
    unitCost: 320,
    totalCost: 4800
  },

];