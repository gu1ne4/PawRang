// pdf_generation/PrescriptionPDF.tsx
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Register fonts
Font.register({
  family: 'Open Sans',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-regular.ttf', fontWeight: 400 },
    { src: 'https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-600.ttf', fontWeight: 600 },
    { src: 'https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-700.ttf', fontWeight: 700 },
  ],
});

// Styles for Prescription PDF
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Open Sans',
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 30,
    textAlign: 'center',
  },
  clinicName: {
    fontSize: 18,
    fontWeight: 700,
    color: '#3d67ee',
    marginBottom: 4,
  },
  clinicAddress: {
    fontSize: 10,
    color: '#666666',
    marginBottom: 2,
  },
  clinicContact: {
    fontSize: 10,
    color: '#666666',
  },
  divider: {
    marginVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc',
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    textAlign: 'center',
    marginBottom: 20,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 8,
  },
  infoLabel: {
    width: 120,
    fontSize: 11,
    fontWeight: 600,
    color: '#333333',
  },
  infoValue: {
    flex: 1,
    fontSize: 11,
    color: '#555555',
  },
  prescriptionSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  prescriptionHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    padding: 8,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#3d67ee',
  },
  prescriptionHeaderCell: {
    flex: 1,
    fontSize: 9,
    fontWeight: 700,
    color: '#3d67ee',
    paddingRight: 6,
  },
  prescriptionRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    alignItems: 'flex-start',
  },
  prescriptionCell: {
    flex: 1,
    fontSize: 9,
    color: '#333333',
    lineHeight: 12,
  },
  prescriptionCellBlock: {
    paddingRight: 6,
  },
  prescriptionMedicationCell: {
    flex: 1.4,
    paddingRight: 8,
  },
  prescriptionCard: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
  },
  prescriptionCardHeader: {
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#dbe4ff',
  },
  prescriptionMedicationName: {
    fontSize: 11,
    fontWeight: 700,
    color: '#333333',
  },
  prescriptionDetailsRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  prescriptionDetailCell: {
    flex: 1,
  },
  prescriptionDetailCellWide: {
    flex: 2,
  },
  prescriptionFieldLabel: {
    fontSize: 8,
    fontWeight: 700,
    color: '#3d67ee',
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  prescriptionFieldValue: {
    fontSize: 10,
    color: '#333333',
    lineHeight: 1.5,
  },
  prescriptionInstructionBlock: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e8e8e8',
  },
  prescriptionEmptyState: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#fafafa',
  },
  instructionsBox: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  instructionsTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: '#3d67ee',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 10,
    color: '#555555',
    lineHeight: 1.5,
  },
  instructionItem: {
    fontSize: 10,
    color: '#555555',
    lineHeight: 1.5,
    marginBottom: 4,
  },
  refillSection: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  refillLabel: {
    width: 80,
    fontSize: 10,
    fontWeight: 600,
    color: '#333333',
  },
  refillLine: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#999999',
    marginLeft: 10,
    height: 20,
  },
  signatureSection: {
    marginTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBox: {
    width: '45%',
  },
  signatureLabel: {
    fontSize: 10,
    fontWeight: 600,
    color: '#333333',
    marginBottom: 8,
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
    width: '100%',
    marginTop: 30,
  },
  signatureText: {
    fontSize: 9,
    color: '#666666',
    marginTop: 4,
  },
  dateBox: {
    width: '45%',
  },
  dateLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
    width: '100%',
    marginTop: 30,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#999999',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 10,
  },
});

interface Prescription {
  medicationName: string;
  dosage: string;
  route?: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

interface PrescriptionPDFProps {
  petName: string;
  ownerName: string;
  visitDate: string;
  veterinarian: string;
  prescriptions: Prescription[];
  instructionsText?: string;
}

const stripHtml = (value: string): string =>
  String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const displayValue = (value?: string): string => {
  const normalized = String(value || '').trim();
  return normalized || '-';
};

const PrescriptionPDF: React.FC<PrescriptionPDFProps> = ({
  petName,
  ownerName,
  visitDate,
  veterinarian,
  prescriptions,
  instructionsText,
}) => {
  const clinicName = "PetShield Veterinary Clinic and Grooming Center";
  const clinicAddress = "123 PawRang Street, Veterinary District";
  const clinicContact = "Tel: (02) 1234-5678 | Email: clinic@petshield.com";

  const validPrescriptions = prescriptions.filter(p => p.medicationName && p.medicationName.trim() !== '');
  const sharedInstructions = String(instructionsText || '').trim();

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.clinicName}>{clinicName}</Text>
          <Text style={styles.clinicAddress}>{clinicAddress}</Text>
          <Text style={styles.clinicContact}>{clinicContact}</Text>
        </View>

        <View style={styles.divider} />

        {/* Title */}
        <Text style={styles.title}>Prescription</Text>

        {/* Patient Information */}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Patient Name:</Text>
          <Text style={styles.infoValue}>{petName}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Owner Name:</Text>
          <Text style={styles.infoValue}>{ownerName}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Date:</Text>
          <Text style={styles.infoValue}>{visitDate}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Veterinarian:</Text>
          <Text style={styles.infoValue}>{veterinarian}</Text>
        </View>

        {/* Prescription Details */}
        <View style={styles.prescriptionSection}>
          {validPrescriptions.length > 0 ? (
            <>
              <View style={styles.prescriptionHeader}>
                <Text style={[styles.prescriptionHeaderCell, { flex: 1.55 }]}>Medication</Text>
                <Text style={[styles.prescriptionHeaderCell, { flex: 1.0 }]}>Dose</Text>
                <Text style={[styles.prescriptionHeaderCell, { flex: 1.0 }]}>Route</Text>
                <Text style={[styles.prescriptionHeaderCell, { flex: 1.25 }]}>Frequency</Text>
                <Text style={[styles.prescriptionHeaderCell, { flex: 1.0, paddingRight: 0 }]}>Duration</Text>
              </View>
              {validPrescriptions.map((pres, index) => (
                <View key={`${pres.medicationName || 'medication'}-${index}`} style={styles.prescriptionRow}>
                  <View style={[styles.prescriptionCellBlock, { flex: 1.55 }]}>
                    <Text style={styles.prescriptionCell}>{displayValue(pres.medicationName)}</Text>
                  </View>
                  <View style={[styles.prescriptionCellBlock, { flex: 1.0 }]}>
                    <Text style={styles.prescriptionCell}>{displayValue(pres.dosage)}</Text>
                  </View>
                  <View style={[styles.prescriptionCellBlock, { flex: 1.0 }]}>
                    <Text style={styles.prescriptionCell}>{displayValue(pres.route)}</Text>
                  </View>
                  <View style={[styles.prescriptionCellBlock, { flex: 1.25 }]}>
                    <Text style={styles.prescriptionCell}>{displayValue(pres.frequency)}</Text>
                  </View>
                  <View style={{ flex: 1.0 }}>
                    <Text style={styles.prescriptionCell}>{displayValue(pres.duration)}</Text>
                  </View>
                </View>
              ))}
            </>
          ) : (
            <View style={styles.prescriptionEmptyState}>
              <Text style={[styles.prescriptionFieldValue, { textAlign: 'center' }]}>
                No medications prescribed
              </Text>
            </View>
          )}
        </View>

        {/* Instructions */}
        {sharedInstructions && (
          <View style={styles.instructionsBox}>
            <Text style={styles.instructionsTitle}>Instructions:</Text>
            <Text style={styles.instructionsText}>{sharedInstructions}</Text>
          </View>
        )}

        {/* Refill Section */}
        <View style={styles.refillSection}>
          <Text style={styles.refillLabel}>Refill:</Text>
          <View style={styles.refillLine} />
          <Text style={{ marginLeft: 10, fontSize: 10, color: '#666666' }}>times</Text>
        </View>

        {/* Signature and Date */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Signature:</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureText}>Veterinarian's Signature</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>© {new Date().getFullYear()} {clinicName} - Prescription System</Text>
        </View>

      </Page>
    </Document>
  );
};

export default PrescriptionPDF;
