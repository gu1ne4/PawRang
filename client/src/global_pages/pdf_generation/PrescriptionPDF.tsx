// pdf_generation/PrescriptionPDF.tsx
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Line } from '@react-pdf/renderer';

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
    fontSize: 10,
    fontWeight: 700,
    color: '#3d67ee',
  },
  prescriptionRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  prescriptionCell: {
    flex: 1,
    fontSize: 10,
    color: '#333333',
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
  doctorRemarks?: string;
}

const PrescriptionPDF: React.FC<PrescriptionPDFProps> = ({
  petName,
  ownerName,
  visitDate,
  veterinarian,
  prescriptions,
  doctorRemarks,
}) => {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });


  const clinicName = "PetShield Veterinary Clinic and Grooming Center";
  const clinicAddress = "123 PawRang Street, Veterinary District";
  const clinicContact = "Tel: (02) 1234-5678 | Email: clinic@petshield.com";

  const validPrescriptions = prescriptions.filter(p => p.medicationName && p.medicationName.trim() !== '');

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

        {/* Prescription Table */}
        <View style={styles.prescriptionSection}>
          <View style={styles.prescriptionHeader}>
            <Text style={[styles.prescriptionHeaderCell, { flex: 2 }]}>Medication</Text>
            <Text style={[styles.prescriptionHeaderCell, { flex: 1 }]}>Dosage</Text>
            <Text style={[styles.prescriptionHeaderCell, { flex: 1 }]}>Frequency</Text>
            <Text style={[styles.prescriptionHeaderCell, { flex: 1 }]}>Duration</Text>
          </View>
          
          {validPrescriptions.length > 0 ? (
            validPrescriptions.map((pres, index) => (
              <View key={index} style={styles.prescriptionRow}>
                <Text style={[styles.prescriptionCell, { flex: 2 }]}>{pres.medicationName}</Text>
                <Text style={[styles.prescriptionCell, { flex: 1 }]}>{pres.dosage || '—'}</Text>
                <Text style={[styles.prescriptionCell, { flex: 1 }]}>{pres.frequency || '—'}</Text>
                <Text style={[styles.prescriptionCell, { flex: 1 }]}>{pres.duration || '—'}</Text>
              </View>
            ))
          ) : (
            <View style={styles.prescriptionRow}>
              <Text style={[styles.prescriptionCell, { flex: 4, textAlign: 'center' }]}>
                No medications prescribed
              </Text>
            </View>
          )}
        </View>

        {/* Instructions */}
        {validPrescriptions.some(p => p.instructions) && (
          <View style={styles.instructionsBox}>
            <Text style={styles.instructionsTitle}>Instructions:</Text>
            <Text style={styles.instructionsText}>
              {validPrescriptions.find(p => p.instructions)?.instructions || 'Take as directed by veterinarian'}
            </Text>
          </View>
        )}

        {/* Doctor's Remarks */}
        {doctorRemarks && (
          <View style={styles.instructionsBox}>
            <Text style={styles.instructionsTitle}>Doctor's Remarks:</Text>
            <Text style={styles.instructionsText}>{doctorRemarks}</Text>
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
