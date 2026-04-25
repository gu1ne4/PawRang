import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

Font.register({
  family: 'Open Sans',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-regular.ttf', fontWeight: 400 },
    { src: 'https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-600.ttf', fontWeight: 600 },
    { src: 'https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-700.ttf', fontWeight: 700 },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'Open Sans',
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#3d67ee',
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: '#3d67ee',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: '#666666',
  },
  reportDate: {
    fontSize: 9,
    color: '#999999',
  },
  section: {
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: '#3d67ee',
    marginBottom: 10,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  infoItem: {
    width: '33.33%',
    marginBottom: 8,
    paddingRight: 10,
  },
  infoLabel: {
    fontSize: 9,
    fontWeight: 600,
    color: '#666666',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 10,
    color: '#333333',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#3d67ee',
  },
  tableHeaderCell: {
    fontSize: 9,
    fontWeight: 700,
    color: '#3d67ee',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tableCell: {
    fontSize: 9,
    color: '#333333',
    lineHeight: 1.4,
  },
  itemNameCell: {
    width: '28%',
    paddingRight: 8,
  },
  itemNameWideCell: {
    width: '56%',
    paddingRight: 8,
  },
  itemCategory: {
    fontSize: 8,
    color: '#7a7a7a',
    marginTop: 2,
  },
  itemDescriptionCell: {
    width: '28%',
    paddingRight: 8,
  },
  paymentDateCell: {
    width: '22%',
    paddingRight: 8,
  },
  paymentMethodCell: {
    width: '20%',
    paddingRight: 8,
  },
  paymentHandledByCell: {
    width: '22%',
    paddingRight: 8,
  },
  paymentAmountCell: {
    width: '14%',
    paddingRight: 8,
    textAlign: 'right',
  },
  paymentNotesCell: {
    width: '22%',
  },
  qtyCell: {
    width: '12%',
    paddingRight: 8,
    textAlign: 'center',
  },
  priceCell: {
    width: '16%',
    paddingRight: 8,
    textAlign: 'right',
  },
  totalCell: {
    width: '16%',
    textAlign: 'right',
  },
  totalsSection: {
    marginTop: 4,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    width: 220,
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  totalLabel: {
    fontSize: 10,
    color: '#555555',
  },
  totalValue: {
    fontSize: 10,
    color: '#333333',
    textAlign: 'right',
  },
  grandTotalRow: {
    flexDirection: 'row',
    width: 220,
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#d8d8d8',
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: '#3d67ee',
  },
  grandTotalValue: {
    fontSize: 12,
    fontWeight: 700,
    color: '#3d67ee',
    textAlign: 'right',
  },
  statusPaid: {
    fontSize: 8,
    fontWeight: 700,
    color: '#2e7d32',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  statusPending: {
    fontSize: 8,
    fontWeight: 700,
    color: '#b26a00',
    backgroundColor: '#fff7e6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  statusPartial: {
    fontSize: 8,
    fontWeight: 700,
    color: '#1565c0',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  emptyState: {
    fontSize: 10,
    color: '#777777',
    textAlign: 'center',
    paddingVertical: 12,
  },
  notesText: {
    fontSize: 10,
    color: '#333333',
    lineHeight: 1.5,
  },
  footer: {
    marginTop: 18,
    textAlign: 'center',
    fontSize: 8,
    color: '#999999',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 10,
  },
});

interface InvoiceLineItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  total: number;
  category?: string;
  sku?: string;
}

interface InvoicePayment {
  id: string;
  amount: number;
  paymentMethod: 'cash' | 'card' | 'gcash' | 'bank';
  date: string;
  time: string;
  handledBy?: string;
  notes?: string;
}

interface InvoicePDFData {
  invoiceNumber: string;
  date: string;
  time: string;
  invoiceType: 'appointment' | 'walkin';
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  petName: string;
  items: InvoiceLineItem[];
  products: InvoiceLineItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  amountPaid?: number;
  remainingBalance?: number;
  paymentMethod: 'cash' | 'card' | 'gcash' | 'bank' | 'installment';
  paymentStatus: 'paid' | 'pending' | 'partial';
  notes?: string;
  paymentHistory?: InvoicePayment[];
}

const formatCurrency = (value: number): string =>
  `PHP ${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatPaymentMethod = (value: string): string =>
  value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const formatPaymentStatus = (value: 'paid' | 'pending' | 'partial'): string => {
  switch (value) {
    case 'partial':
      return 'Partial Paid';
    case 'paid':
      return 'Paid';
    default:
      return 'Pending';
  }
};

const formatInvoiceType = (value: 'appointment' | 'walkin'): string =>
  value === 'appointment' ? 'Appointment' : 'Guest Appointment';

const getPaymentStatusStyle = (status: 'paid' | 'pending' | 'partial') => {
  switch (status) {
    case 'paid':
      return styles.statusPaid;
    case 'partial':
      return styles.statusPartial;
    default:
      return styles.statusPending;
  }
};

const InvoicePDF = ({
  invoiceNumber,
  date,
  time,
  invoiceType,
  customerName,
  customerEmail,
  customerPhone,
  petName,
  items,
  products,
  subtotal,
  tax,
  discount,
  total,
  amountPaid = 0,
  remainingBalance = 0,
  paymentMethod,
  paymentStatus,
  notes,
  paymentHistory = [],
}: InvoicePDFData) => {
  const lineItems = [
    ...items.map((item) => ({ ...item, lineType: 'Service' })),
    ...products.map((product) => ({ ...product, lineType: 'Product' })),
  ];

  return (
    <Document title={`Invoice ${invoiceNumber}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Invoice</Text>
            <Text style={styles.subtitle}>Invoice No: {invoiceNumber}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.reportDate}>Generated: {date}</Text>
            <Text style={styles.reportDate}>{time}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Invoice Information</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Customer Name</Text>
              <Text style={styles.infoValue}>{customerName || 'Not provided'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Pet Name</Text>
              <Text style={styles.infoValue}>{petName || 'Not provided'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Invoice Type</Text>
              <Text style={styles.infoValue}>{formatInvoiceType(invoiceType)}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{customerEmail || 'Not provided'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Contact Number</Text>
              <Text style={styles.infoValue}>{customerPhone || 'Not provided'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Payment Method</Text>
              <Text style={styles.infoValue}>{formatPaymentMethod(paymentMethod)}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Payment Status</Text>
              <Text style={getPaymentStatusStyle(paymentStatus)}>
                {formatPaymentStatus(paymentStatus)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Invoice Items</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.itemNameWideCell]}>Item</Text>
            <Text style={[styles.tableHeaderCell, styles.qtyCell]}>Qty</Text>
            <Text style={[styles.tableHeaderCell, styles.priceCell]}>Unit Price</Text>
            <Text style={[styles.tableHeaderCell, styles.totalCell]}>Total</Text>
          </View>

          {lineItems.length > 0 ? (
            lineItems.map((item) => (
              <View key={`${item.lineType}-${item.id}`} style={styles.tableRow} wrap={false}>
                <View style={styles.itemNameWideCell}>
                  <Text style={styles.tableCell}>{item.name}</Text>
                  <Text style={styles.itemCategory}>{item.category || item.lineType}</Text>
                </View>
                <Text style={[styles.tableCell, styles.qtyCell]}>{String(item.quantity)}</Text>
                <Text style={[styles.tableCell, styles.priceCell]}>{formatCurrency(item.unitPrice)}</Text>
                <Text style={[styles.tableCell, styles.totalCell]}>{formatCurrency(item.total)}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyState}>No services or products were added to this invoice.</Text>
          )}

          <View style={styles.totalsSection}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{formatCurrency(subtotal)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax (12%)</Text>
              <Text style={styles.totalValue}>{formatCurrency(tax)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Discount</Text>
              <Text style={styles.totalValue}>- {formatCurrency(discount)}</Text>
            </View>
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Grand Total</Text>
              <Text style={styles.grandTotalValue}>{formatCurrency(total)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Amount Paid</Text>
              <Text style={styles.totalValue}>{formatCurrency(amountPaid)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Remaining Balance</Text>
              <Text style={styles.totalValue}>{formatCurrency(remainingBalance)}</Text>
            </View>
          </View>
        </View>

        {(notes || paymentHistory.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Information</Text>
            {notes ? (
              <View style={{ marginBottom: paymentHistory.length > 0 ? 10 : 0 }}>
                <Text style={styles.infoLabel}>Clinic Notes</Text>
                <Text style={styles.notesText}>{notes}</Text>
              </View>
            ) : null}

            {paymentHistory.length > 0 ? (
              <View>
                <Text style={[styles.infoLabel, { marginBottom: 6 }]}>Payment History</Text>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderCell, styles.paymentDateCell]}>Date / Time</Text>
                  <Text style={[styles.tableHeaderCell, styles.paymentMethodCell]}>Method</Text>
                  <Text style={[styles.tableHeaderCell, styles.paymentHandledByCell]}>Handled By</Text>
                  <Text style={[styles.tableHeaderCell, styles.paymentAmountCell]}>Amount</Text>
                  <Text style={[styles.tableHeaderCell, styles.paymentNotesCell]}>Notes</Text>
                </View>
                {paymentHistory.map((payment) => (
                  <View key={payment.id} style={styles.tableRow} wrap={false}>
                    <View style={styles.paymentDateCell}>
                      <Text style={styles.tableCell}>{payment.date}</Text>
                      <Text style={styles.itemCategory}>{payment.time}</Text>
                    </View>
                    <View style={styles.paymentMethodCell}>
                      <Text style={styles.tableCell}>{formatPaymentMethod(payment.paymentMethod)}</Text>
                    </View>
                    <View style={styles.paymentHandledByCell}>
                      <Text style={styles.tableCell}>{payment.handledBy || 'Not recorded'}</Text>
                    </View>
                    <Text style={[styles.tableCell, styles.paymentAmountCell]}>{formatCurrency(payment.amount)}</Text>
                    <Text style={[styles.tableCell, styles.paymentNotesCell]}>{payment.notes || 'Recorded payment'}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        )}

        <Text style={styles.footer}>
          PawRang Veterinary Clinic and Grooming Center • System-generated invoice document
        </Text>
      </Page>
    </Document>
  );
};

export default InvoicePDF;
