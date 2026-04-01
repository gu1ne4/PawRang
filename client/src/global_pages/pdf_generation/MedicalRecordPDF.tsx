// pdf_generation/MedicalRecordPDF.tsx
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

// Styles for PDF
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'Open Sans',
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 20,
    borderBottom: 2,
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
    marginBottom: 8,
  },
  infoItem: {
    width: '33.33%',
    marginBottom: 8,
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
  // Critical: This ensures each visit card stays together
  visitCard: {
    marginBottom: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    overflow: 'hidden',
    // Prevents the card from breaking across pages
    breakInside: 'avoid',
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  visitDate: {
    fontSize: 10,
    fontWeight: 600,
    color: '#3d67ee',
  },
  visitNumber: {
    fontSize: 9,
    color: '#999999',
  },
  visitBody: {
    padding: 10,
  },
  visitDetailRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  visitDetailLabel: {
    width: 100,
    fontSize: 9,
    fontWeight: 600,
    color: '#666666',
  },
  visitDetailValue: {
    flex: 1,
    fontSize: 9,
    color: '#333333',
  },
  prescriptionItem: {
    marginLeft: 12,
    marginBottom: 4,
    fontSize: 9,
    color: '#555555',
  },
  remarks: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    fontSize: 9,
    lineHeight: 1.4,
  },
  footer: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: 8,
    color: '#999999',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 10,
  },
  statusActive: {
    padding: '2 6',
    borderRadius: 4,
    fontSize: 8,
    fontWeight: 600,
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
    alignSelf: 'flex-start',
  },
  statusDeceased: {
    padding: '2 6',
    borderRadius: 4,
    fontSize: 8,
    fontWeight: 600,
    backgroundColor: '#ffebee',
    color: '#c62828',
    alignSelf: 'flex-start',
  },
});

// Interfaces
interface ClinicalExam {
  length: number;
  lengthUnit: 'cm' | 'inches';
  temperature: number;
  tempUnit: 'C' | 'F';
  heartRate: string;
  breathingRate: string;
  additionalFindings: string;
}

interface LabResult {
  testType: string;
  interpretation: string;
}

interface Prescription {
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

interface VisitHistory {
  id: string;
  date: string;
  time: string;
  veterinarian: string;
  reason: string;
  doctorRemarks: string;
  weight: number;
  weightUnit: 'kg' | 'lbs';
  clinicalExam?: ClinicalExam;
  labResults?: LabResult[];
  prescriptions?: Prescription[];
}

interface PetDetails {
  name: string;
  breed: string;
  species: 'Dog' | 'Cat';
  gender: 'Male' | 'Female';
  dateOfBirth: string;
  age: string;
  weight: number;
  weightUnit: 'kg' | 'lbs';
  colorMarkings: string;
  neutered: boolean;
  deceased: boolean;
  vaccinated: boolean;
}

interface MedicalRecordPDFProps {
  petDetails: PetDetails;
  ownerName: string;
  ownerEmail: string;
  ownerContact: string;
  patientId: string;
  visitHistory: VisitHistory[];
}

// Helper function to strip HTML tags
const stripHtml = (html: string): string => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&[a-z]+;/gi, '');
};

// Component for a single visit card with page break prevention
const VisitCardComponent: React.FC<{ visit: VisitHistory; index: number }> = ({ visit, index }) => (
  <View style={styles.visitCard}>
    <View style={styles.visitHeader}>
      <Text style={styles.visitDate}>
        {visit.date} at {visit.time}
      </Text>
      <Text style={styles.visitNumber}>
        Visit #{index + 1}
      </Text>
    </View>
    <View style={styles.visitBody}>
      <View style={styles.visitDetailRow}>
        <Text style={styles.visitDetailLabel}>Veterinarian:</Text>
        <Text style={styles.visitDetailValue}>{visit.veterinarian}</Text>
      </View>
      <View style={styles.visitDetailRow}>
        <Text style={styles.visitDetailLabel}>Reason:</Text>
        <Text style={styles.visitDetailValue}>{visit.reason}</Text>
      </View>
      <View style={styles.visitDetailRow}>
        <Text style={styles.visitDetailLabel}>Weight:</Text>
        <Text style={styles.visitDetailValue}>
          {visit.weight} {visit.weightUnit}
        </Text>
      </View>
      {visit.clinicalExam && (
        <>
          {visit.clinicalExam.length > 0 && (
            <View style={styles.visitDetailRow}>
              <Text style={styles.visitDetailLabel}>Length:</Text>
              <Text style={styles.visitDetailValue}>
                {visit.clinicalExam.length} {visit.clinicalExam.lengthUnit}
              </Text>
            </View>
          )}
          {visit.clinicalExam.temperature > 0 && (
            <View style={styles.visitDetailRow}>
              <Text style={styles.visitDetailLabel}>Temperature:</Text>
              <Text style={styles.visitDetailValue}>
                {visit.clinicalExam.temperature}°{visit.clinicalExam.tempUnit}
              </Text>
            </View>
          )}
          {visit.clinicalExam.heartRate && (
            <View style={styles.visitDetailRow}>
              <Text style={styles.visitDetailLabel}>Heart Rate:</Text>
              <Text style={styles.visitDetailValue}>
                {visit.clinicalExam.heartRate}/min
              </Text>
            </View>
          )}
          {visit.clinicalExam.breathingRate && (
            <View style={styles.visitDetailRow}>
              <Text style={styles.visitDetailLabel}>Breathing Rate:</Text>
              <Text style={styles.visitDetailValue}>
                {visit.clinicalExam.breathingRate}/min
              </Text>
            </View>
          )}
          {visit.clinicalExam.additionalFindings && (
            <View style={styles.visitDetailRow}>
              <Text style={styles.visitDetailLabel}>Additional Findings:</Text>
              <Text style={styles.visitDetailValue}>
                {visit.clinicalExam.additionalFindings}
              </Text>
            </View>
          )}
        </>
      )}
      {visit.prescriptions && visit.prescriptions.length > 0 && (
        <>
          <View style={styles.visitDetailRow}>
            <Text style={styles.visitDetailLabel}>Prescriptions:</Text>
            <Text style={styles.visitDetailValue}>
              {visit.prescriptions.length} medication(s)
            </Text>
          </View>
          {visit.prescriptions.map((pres, idx) => (
            <View key={idx} style={styles.prescriptionItem}>
              <Text>
                • {pres.medicationName || 'Medication'} - {pres.dosage}, {pres.frequency} for {pres.duration}
              </Text>
              {pres.instructions && (
                <Text style={{ fontSize: 8, color: '#666666', marginLeft: 12 }}>
                  Instructions: {pres.instructions}
                </Text>
              )}
            </View>
          ))}
        </>
      )}
      {visit.labResults && visit.labResults.length > 0 && (
        <View style={styles.visitDetailRow}>
          <Text style={styles.visitDetailLabel}>Lab Results:</Text>
          <Text style={styles.visitDetailValue}>
            {visit.labResults.length} test(s) performed
          </Text>
        </View>
      )}
      {visit.doctorRemarks && (
        <View style={styles.remarks}>
          <Text style={{ fontWeight: 600, marginBottom: 4 }}>Remarks:</Text>
          <Text>{stripHtml(visit.doctorRemarks)}</Text>
        </View>
      )}
    </View>
  </View>
);

const MedicalRecordPDF: React.FC<MedicalRecordPDFProps> = ({
  petDetails,
  ownerName,
  ownerEmail,
  ownerContact,
  patientId,
  visitHistory,
}) => {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Split visits into chunks to ensure each card stays together
  // We'll put a maximum of 2 visits per page to prevent overflow
  const VISITS_PER_PAGE = 2;
  const visitChunks = [];
  for (let i = 0; i < visitHistory.length; i += VISITS_PER_PAGE) {
    visitChunks.push(visitHistory.slice(i, i + VISITS_PER_PAGE));
  }

  // If no visits, create one empty chunk
  if (visitHistory.length === 0) {
    visitChunks.push([]);
  }

  return (
    <Document>
      {visitChunks.map((chunk, pageIndex) => (
        <Page key={pageIndex} size="A4" style={styles.page}>
          {/* Header - only on first page */}
          {pageIndex === 0 && (
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Text style={styles.title}>Medical Record</Text>
                <Text style={styles.subtitle}>Patient ID: {patientId}</Text>
              </View>
              <View style={styles.headerRight}>
                <Text style={styles.reportDate}>Generated: {currentDate}</Text>
              </View>
            </View>
          )}

          {/* Pet Information - only on first page */}
          {pageIndex === 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pet Information</Text>
              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Pet Name</Text>
                  <Text style={styles.infoValue}>{petDetails.name}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Species</Text>
                  <Text style={styles.infoValue}>{petDetails.species}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Breed</Text>
                  <Text style={styles.infoValue}>{petDetails.breed || 'N/A'}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Gender</Text>
                  <Text style={styles.infoValue}>{petDetails.gender}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Date of Birth</Text>
                  <Text style={styles.infoValue}>{petDetails.dateOfBirth || 'N/A'}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Age</Text>
                  <Text style={styles.infoValue}>{petDetails.age || 'N/A'}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Weight</Text>
                  <Text style={styles.infoValue}>
                    {petDetails.weight} {petDetails.weightUnit}
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Color/Markings</Text>
                  <Text style={styles.infoValue}>{petDetails.colorMarkings || 'N/A'}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Neutered/Spayed</Text>
                  <Text style={styles.infoValue}>{petDetails.neutered ? 'Yes' : 'No'}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Vaccinated</Text>
                  <Text style={styles.infoValue}>{petDetails.vaccinated ? 'Yes' : 'No'}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Status</Text>
                  <View style={petDetails.deceased ? styles.statusDeceased : styles.statusActive}>
                    <Text>{petDetails.deceased ? 'Deceased' : 'Active'}</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Owner Information - only on first page */}
          {pageIndex === 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Owner Information</Text>
              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Owner Name</Text>
                  <Text style={styles.infoValue}>{ownerName}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{ownerEmail}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Contact Number</Text>
                  <Text style={styles.infoValue}>{ownerContact}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Visit History Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Visit History ({visitHistory.length} visit{visitHistory.length !== 1 ? 's' : ''})
            </Text>
            {chunk.length > 0 ? (
              chunk.map((visit, idx) => (
                <VisitCardComponent 
                  key={visit.id} 
                  visit={visit} 
                  index={pageIndex * VISITS_PER_PAGE + idx}
                />
              ))
            ) : (
              <Text style={{ color: '#999999', textAlign: 'center', padding: 20 }}>
                No visit records available
              </Text>
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer} fixed>
            <Text>© {new Date().getFullYear()} PetShield Veterinary Clinic and Grooming Center</Text>
            <Text>Page {pageIndex + 1} of {visitChunks.length}</Text>
          </View>
        </Page>
      ))}
    </Document>
  );
};

export default MedicalRecordPDF;