import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import profileHeader from '../assets/ProfileHeader.png';
import petsPeeking from '../assets/PetsPeeking.png';
import ClientNavBar from '../reusable_components/ClientNavBar';
import { 
  IoPaw, 
  IoMedical, 
  IoCalendar, 
  IoDocumentText,
  IoEyeOutline,
  IoCloudUploadOutline,
  IoTrashOutline,
  IoPersonOutline,
  IoLogOutOutline,
  IoChevronDown,
  IoChevronUp,
  IoClose,
  IoCameraOutline,
  IoHappy,
  IoInformationCircleOutline,
  IoMedicalOutline,
  IoFolderOutline,
  IoCheckmarkCircle,
  IoAdd,
  IoPencil,
  IoAlertCircleOutline,
  IoCheckmarkCircleOutline,
  IoCloseCircleOutline
} from 'react-icons/io5';
import './UserStyles.css';

// Types (keep all your existing interfaces)
interface Vaccination {
  id: string;
  name: string;
  fileName: string | null;
  date: string;
  proofImage: string | null;
  proofType: string | null;
}

interface MedicalRecord {
  id: string;
  date: string;
  type: string;
  description: string;
  fileName: string;
  vet: string;
  notes: string;
  document: string;
  documentType: string;
}

interface Appointment {
  id: string;
  date: string;
  time: string;
  type: string;
  vet: string;
  status: 'upcoming' | 'completed';
}

interface Pet {
  id: string;
  name: string;
  type: 'Dog' | 'Cat';
  breed: string;
  breedSize: 'Small' | 'Medium' | 'Large';
  birthday: string;
  age: string;
  ageUnknown: boolean;
  weight: string;
  weightUnknown: boolean;
  gender: 'Male' | 'Female';
  image: string | null;
  dateJoined: string;
  medicalRecords: MedicalRecord[];
  appointments: Appointment[];
  vaccinations: Vaccination[];
}

interface User {
  fullname?: string;
  fullName?: string;
  username?: string;
  userImage?: string;
  userimage?: string;
}

interface AlertConfig {
  type: 'info' | 'success' | 'error' | 'confirm';
  title: string;
  message: string | React.ReactNode;
  onConfirm: (() => void) | null;
  showCancel: boolean;
  confirmText: string;
}

const UserPetProfile: React.FC = () => {
  const navigate = useNavigate();
  
  // Add refs for scrollable containers
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  
  // State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [customAlertVisible, setCustomAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    type: 'info',
    title: '',
    message: '',
    onConfirm: null,
    showCancel: false,
    confirmText: 'OK'
  });
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'records' | 'appointments'>('profile');
  
  // Validation states
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [ageUnknown, setAgeUnknown] = useState(false);
  const [birthdayUnknown, setBirthdayUnknown] = useState(false);
  const [weightUnknown, setWeightUnknown] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [ageCharCount, setAgeCharCount] = useState(0);

  // Form states
  const [newPet, setNewPet] = useState<Omit<Pet, 'id' | 'medicalRecords' | 'appointments'>>({
    name: '',
    type: 'Dog',
    breed: '',
    breedSize: 'Medium',
    birthday: '',
    age: '',
    ageUnknown: false,
    weight: '',
    weightUnknown: false,
    gender: 'Male',
    image: null,
    dateJoined: new Date().toISOString().split('T')[0],
    vaccinations: []
  });

  const [editPet, setEditPet] = useState<Pet | null>(null);

  // Breed data (keep your existing breed arrays)
  const dogBreeds: string[] = [
    'Unknown',
    'Golden Retriever',
    'French Bulldog',
    'German Shepherd',
    'Labrador Retriever',
    'Siberian Husky',
    'Poodle',
    'Beagle',
    'Rottweiler',
    'Yorkshire Terrier',
    'Dachshund',
    'Boxer',
    'Other'
  ];

  const catBreeds: string[] = [
    'Unknown',
    'Persian',
    'Siamese',
    'Maine Coon',
    'Ragdoll',
    'Bengal',
    'Sphynx',
    'British Shorthair',
    'Scottish Fold',
    'Abyssinian',
    'Other'
  ];

  // Mock pets data (keep your existing mock data)
  const [pets, setPets] = useState<Pet[]>([
    // ... (keep your existing mock data)
    {
      id: '1',
      name: 'Max',
      type: 'Dog',
      breed: 'Golden Retriever',
      breedSize: 'Large',
      birthday: '2021-03-15',
      age: '3',
      ageUnknown: false,
      weight: '30',
      weightUnknown: false,
      gender: 'Male',
      image: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=400',
      dateJoined: '2024-01-15',
      medicalRecords: [
        { id: 'r1', date: '2024-02-15', type: 'Vaccination', description: 'Rabies Vaccine', fileName: 'rabies_certificate.pdf', vet: 'Dr. Smith', notes: 'Annual vaccination', document: 'file://document.pdf', documentType: 'application/pdf' },
        { id: 'r2', date: '2024-01-10', type: 'Check-up', description: 'General Health Check', fileName: 'checkup_report.pdf', vet: 'Dr. Johnson', notes: 'Healthy, no issues', document: 'file://checkup.pdf', documentType: 'application/pdf' },
        { id: 'r3', date: '2023-12-05', type: 'Treatment', description: 'Ear Infection', fileName: 'treatment_record.pdf', vet: 'Dr. Smith', notes: 'Prescribed antibiotics', document: 'file://treatment.pdf', documentType: 'application/pdf' },
      ],
      appointments: [
        { id: 'a1', date: '2024-03-20', time: '10:30 AM', type: 'Vaccination', vet: 'Dr. Smith', status: 'upcoming' },
        { id: 'a2', date: '2024-02-15', time: '2:00 PM', type: 'Check-up', vet: 'Dr. Johnson', status: 'completed' },
        { id: 'a3', date: '2024-01-10', time: '11:15 AM', type: 'Deworming', vet: 'Dr. Smith', status: 'completed' },
      ],
      vaccinations: [
        { id: 'v1', name: 'Rabies', fileName: 'rabies_vaccine.jpg', date: '2024-02-15', proofImage: 'file://rabies.jpg', proofType: 'image/jpeg' },
        { id: 'v2', name: 'DHPP', fileName: 'dhpp_vaccine.pdf', date: '2024-02-20', proofImage: 'file://dhpp.pdf', proofType: 'application/pdf' },
      ]
    },
    {
      id: '2',
      name: 'Luna',
      type: 'Cat',
      breed: 'Persian',
      breedSize: 'Small',
      birthday: '2022-06-22',
      age: '2',
      ageUnknown: false,
      weight: '4',
      weightUnknown: false,
      gender: 'Female',
      image: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=400',
      dateJoined: '2024-01-20',
      medicalRecords: [
        { id: 'r4', date: '2024-02-01', type: 'Vaccination', description: 'FVRCP Vaccine', fileName: 'fvrcp_record.pdf', vet: 'Dr. Wilson', notes: 'First dose', document: 'file://fvrcp.pdf', documentType: 'application/pdf' },
        { id: 'r5', date: '2023-12-20', type: 'Check-up', description: 'Annual Check-up', fileName: 'annual_checkup.pdf', vet: 'Dr. Wilson', notes: 'Healthy weight', document: 'file://annual.pdf', documentType: 'application/pdf' },
      ],
      appointments: [
        { id: 'a4', date: '2024-03-25', time: '9:00 AM', type: 'Vaccination', vet: 'Dr. Wilson', status: 'upcoming' },
        { id: 'a5', date: '2024-02-01', time: '10:00 AM', type: 'Vaccination', vet: 'Dr. Wilson', status: 'completed' },
      ],
      vaccinations: [
        { id: 'v3', name: 'FVRCP', fileName: 'fvrcp_vaccine.jpg', date: '2024-02-01', proofImage: 'file://fvrcp_vac.jpg', proofType: 'image/jpeg' },
      ]
    },
    {
      id: '3',
      name: 'Charlie',
      type: 'Dog',
      breed: 'French Bulldog',
      breedSize: 'Small',
      birthday: '2023-08-10',
      age: '1',
      ageUnknown: false,
      weight: '12',
      weightUnknown: false,
      gender: 'Male',
      image: 'https://images.unsplash.com/photo-1583512603805-3cc6b41f3edb?w=400',
      dateJoined: '2024-02-01',
      medicalRecords: [
        { id: 'r6', date: '2024-02-20', type: 'Vaccination', description: 'DHPP Vaccine', fileName: 'dhpp_puppy.pdf', vet: 'Dr. Smith', notes: 'Puppy series', document: 'file://dhpp_puppy.pdf', documentType: 'application/pdf' },
      ],
      appointments: [
        { id: 'a6', date: '2024-03-28', time: '11:30 AM', type: 'Check-up', vet: 'Dr. Johnson', status: 'upcoming' },
      ],
      vaccinations: [
        { id: 'v4', name: 'DHPP', fileName: 'dhpp_vaccine.pdf', date: '2024-02-20', proofImage: 'file://dhpp_vac.pdf', proofType: 'application/pdf' },
      ]
    }
  ]);

  // Load user session
  // useEffect(() => {
  //   const loadUser = async () => {
  //     try {
  //       const session = localStorage.getItem('userSession');
  //       if (session) {
  //         setCurrentUser(JSON.parse(session));
  //       } else {
  //         setCurrentUser(null);
  //         navigate('/');
  //       }
  //     } catch (error) {
  //       console.error("Failed to load user session", error);
  //     }
  //   };
  //   loadUser();
  // }, [navigate]);

  // Helper functions
  const showAlert = (
    type: AlertConfig['type'],
    title: string,
    message: string | React.ReactNode,
    onConfirm: (() => void) | null = null,
    showCancel = false,
    confirmText = 'OK'
  ) => {
    setAlertConfig({ type, title, message, onConfirm, showCancel, confirmText });
    setCustomAlertVisible(true);
  };

  const handleProtectedAction = (action: () => void) => {
    if (currentUser) {
      action();
    } else {
      showAlert(
        'info',
        'Authentication Required',
        'You need to log in or sign up to access this feature.',
        () => navigate('/login'),
        true,
        'Go to Login'
      );
    }
  };

  const handleLogout = async () => {
    setDropdownVisible(false);
    showAlert('confirm', 'Log Out', 'Are you sure you want to log out?', async () => {
      localStorage.removeItem('userSession');
      setCurrentUser(null);
      navigate('/login');
    }, true, 'Log Out');
  };

  const handleViewProfile = () => {
    setDropdownVisible(false);
    navigate('/profile');
  };

  const handleMyPets = () => {
    setDropdownVisible(false);
  };

  const formatDateInput = (text: string): string => {
    let cleaned = text.replace(/\D/g, '');
    if (cleaned.length <= 4) {
      return cleaned;
    } else if (cleaned.length <= 6) {
      return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
    } else {
      return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`;
    }
  };

  const validateForm = (petData: any, isEdit = false): Record<string, string> => {
    const errors: Record<string, string> = {};
    
    // Name validation
    if (!petData.name || petData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    } else if (petData.name.trim().length > 50) {
      errors.name = 'Name must not exceed 50 characters';
    }
    
    // Breed validation
    if (!petData.breed) {
      errors.breed = 'Please select a breed';
    }
    
    // Birthday or Age validation
    if (!petData.birthday && !petData.age && !petData.ageUnknown) {
      errors.birthdayAge = 'Please provide either birthday or age';
    }
    
    if (petData.birthday) {
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      if (!datePattern.test(petData.birthday)) {
        errors.birthday = 'Please use format YYYY-MM-DD';
      } else {
        const date = new Date(petData.birthday);
        if (isNaN(date.getTime())) {
          errors.birthday = 'Invalid date';
        }
      }
    }
    
    // Age validation with more specific rules
    if (petData.age && !petData.ageUnknown) {
      const ageNum = parseFloat(petData.age);
      if (isNaN(ageNum)) {
        errors.age = 'Age must be a number';
      } else if (ageNum < 0) {
        errors.age = 'Age cannot be negative';
      } else if (ageNum > 30) {
        errors.age = 'Age must be 30 years or less';
      } else if (petData.age.includes('.')) {
        errors.age = 'Age must be a whole number';
      }
    }
    
    // Weight validation
    if (petData.weight && !petData.weightUnknown) {
      const weightNum = parseFloat(petData.weight);
      if (isNaN(weightNum)) {
        errors.weight = 'Weight must be a number';
      } else if (weightNum < 0.1) {
        errors.weight = 'Weight must be at least 0.1 kg';
      } else if (weightNum > 100) {
        errors.weight = 'Weight must not exceed 100 kg';
      }
    } else if (!petData.weight && !petData.weightUnknown) {
      errors.weight = 'Please provide weight or check unknown';
    }
    
    // Required fields validation (only if not unknown)
    if (!petData.name) {
      errors.name = 'Pet name is required';
    }
    
    if (!petData.breed) {
      errors.breed = 'Breed is required';
    }
    
    if (!petData.gender) {
      errors.gender = 'Gender is required';
    }
    
    return errors;
  };

  const addNewPet = () => {
    const errors = validateForm(newPet);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    const pet: Pet = {
      id: Date.now().toString(),
      ...newPet,
      dateJoined: new Date().toISOString().split('T')[0],
      medicalRecords: [],
      appointments: [],
      vaccinations: newPet.vaccinations || []
    };
    setPets([...pets, pet]);
    setModalVisible(false);
    setValidationErrors({});
    setNewPet({
      name: '',
      type: 'Dog',
      breed: '',
      breedSize: 'Medium',
      birthday: '',
      age: '',
      ageUnknown: false,
      weight: '',
      weightUnknown: false,
      gender: 'Male',
      image: null,
      dateJoined: new Date().toISOString().split('T')[0],
      vaccinations: []
    });
    setCharCount(0);
    setAgeCharCount(0);
    setAgeUnknown(false);
    setBirthdayUnknown(false);
    setWeightUnknown(false);
  };

  const openEditModal = (pet: Pet) => {
    setEditPet({ ...pet });
    setAgeUnknown(pet.ageUnknown || false);
    setBirthdayUnknown(!pet.birthday);
    setWeightUnknown(pet.weightUnknown || false);
    setCharCount(pet.name.length);
    setAgeCharCount(pet.age.length);
    setEditModalVisible(true);
  };

  const savePetChanges = () => {
    if (!editPet) return;
    
    const errors = validateForm(editPet, true);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    const updatedPets = pets.map(pet => 
      pet.id === editPet.id ? editPet : pet
    );
    setPets(updatedPets);
    setSelectedPet(editPet);
    setEditModalVisible(false);
    setValidationErrors({});
    setEditPet(null);
  };

  const pickImage = (setter: React.Dispatch<React.SetStateAction<any>>, field: string, isEdit = false) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setter((prev: any) => ({ ...prev, [field]: reader.result }));
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const viewDocument = async (documentUri: string, documentType: string) => {
    try {
      // Check if it's a data URL (base64) or a file URL
      if (documentUri.startsWith('data:')) {
        // For data URLs, create a blob and open it
        const response = await fetch(documentUri);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
      } else if (documentUri.startsWith('file://')) {
        // For file:// URLs, we need to handle differently
        // You might want to show a message that local files can't be opened directly
        showAlert('info', 'Local File', 'This file is stored locally and cannot be opened directly. Please upload the file again if you need to view it.');
      } else {
        // For regular URLs
        window.open(documentUri, '_blank');
      }
    } catch (error) {
      console.error('Error viewing document:', error);
      showAlert('error', 'Error', 'Could not open the file. Please try again.');
    }
  };

  const removeVaccination = (pet: Pet, vaccinationId: string, isFromProfile = true) => {
    if (isFromProfile) {
      const updatedVaccinations = pet.vaccinations.filter(v => v.id !== vaccinationId);
      const updatedPet = { ...pet, vaccinations: updatedVaccinations };
      setSelectedPet(updatedPet);
      
      const updatedPets = pets.map(p => 
        p.id === pet.id ? updatedPet : p
      );
      setPets(updatedPets);
    } else {
      const updatedVaccinations = newPet.vaccinations.filter(v => v.id !== vaccinationId);
      setNewPet({ ...newPet, vaccinations: updatedVaccinations });
    }
  };

  const pickDocumentForNewPet = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,image/*';
    input.multiple = false;
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const newVaccination: Vaccination = {
            id: Date.now().toString(),
            name: file.name || `Vaccination ${(newPet.vaccinations?.length || 0) + 1}`,
            fileName: file.name,
            date: new Date().toISOString().split('T')[0],
            proofImage: reader.result as string,
            proofType: file.type || 'application/octet-stream'
          };
          setNewPet({
            ...newPet,
            vaccinations: [...(newPet.vaccinations || []), newVaccination]
          });
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const pickVaccinationForPet = (pet: Pet, setter: React.Dispatch<React.SetStateAction<Pet | null>>, item: Vaccination) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,image/*';
    input.multiple = false;
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const newDoc = {
            ...item,
            fileName: file.name,
            proofImage: reader.result as string,
            proofType: file.type || 'application/octet-stream'
          };
          
          const updatedArray = pet.vaccinations.map(doc => 
            doc.id === item.id ? newDoc : doc
          );
          
          const updatedPet = { ...pet, vaccinations: updatedArray };
          setter(updatedPet);
          
          const updatedPets = pets.map(p => 
            p.id === pet.id ? updatedPet : p
          );
          setPets(updatedPets);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const formatDate = (dateString: string): string => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const displayName = currentUser ? (currentUser.fullname || currentUser.fullName || currentUser.username || "User") : "";

  // Component sub-components
  const PetListItem: React.FC<{ pet: Pet; isSelected: boolean; onPress: () => void }> = ({ pet, isSelected, onPress }) => (
    <div 
      className={`pet-list-item ${isSelected ? 'selected' : ''}`}
      onClick={onPress}
    >
      <img 
        src={pet.image || 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400'} 
        alt={pet.name}
        className="pet-list-image"
      />
      <div style={{ flex: 1 }}>
        <div className="pet-list-name">{pet.name}</div>
        <div className="pet-list-username">@{pet.name.toLowerCase()}</div>
        <div className="pet-list-stats">
          <span className="stat-badge">
            <IoMedical size={12} /> {pet.medicalRecords.length} records
          </span>
          <span className="stat-badge">
            <IoCalendar size={12} /> {pet.appointments.length} appts
          </span>
        </div>
      </div>
    </div>
  );

  const MedicalRecordCard: React.FC<{ record: MedicalRecord }> = ({ record }) => (
    <div className="medical-record-card">
      <div className="record-header">
        <div className="record-title">
          <IoDocumentText size={20} />
          <span>{record.type}</span>
        </div>
        <span className="record-date">{record.date}</span>
      </div>
      
      <div className="record-name">{record.fileName || record.description}</div>
      
      {record.vet && (
        <div className="record-vet">{record.vet}</div>
      )}
      
      {record.notes && (
        <div className="record-notes">📝 {record.notes}</div>
      )}
      
      {record.document && (
        <button 
          className="view-doc-btn"
          onClick={() => viewDocument(record.document, record.documentType)}
        >
          <IoEyeOutline size={18} />
          <span>View Document</span>
        </button>
      )}
    </div>
  );

  const AppointmentCard: React.FC<{ appointment: Appointment }> = ({ appointment }) => (
    <button className={`appointment-card ${appointment.status}`}>
      <div className="appointment-header">
        <div className="appointment-title">
          <IoCalendar size={20} />
          <span>{appointment.type}</span>
        </div>
        <div className={`status-badge ${appointment.status}`}>
          {appointment.status}
        </div>
      </div>
      <div className="appointment-datetime">
        {appointment.date} • {appointment.time}
      </div>
      <div className="appointment-vet">{appointment.vet}</div>
      
      <button className="view-details-btn">
        <IoEyeOutline size={18} />
        <span>View Details</span>
      </button>
    </button>
  );

  return (
    <div className="user-container">
      {/* Custom Alert Modal */}
      {customAlertVisible && (
        <div className="modal-overlay" onClick={() => setCustomAlertVisible(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            {alertConfig.type === 'success' ? (
              <IoCheckmarkCircleOutline size={55} color="#2e9e0c" />
            ) : alertConfig.type === 'error' ? (
              <IoCloseCircleOutline size={55} color="#d93025" />
            ) : (
              <IoAlertCircleOutline size={55} color="#3d67ee" />
            )}
            
            <h3 className="modal-title">{alertConfig.title}</h3>
            
            {typeof alertConfig.message === 'string' ? (
              <p className="modal-message">{alertConfig.message}</p>
            ) : (
              <div className="modal-message">{alertConfig.message}</div>
            )}
            
            <div className="modal-actions">
              {alertConfig.showCancel && (
                <button 
                  className="modal-btn modal-btn-cancel"
                  onClick={() => setCustomAlertVisible(false)}
                >
                  Cancel
                </button>
              )}
              
              <button 
                className={`modal-btn modal-btn-confirm ${alertConfig.type === 'error' ? 'error-btn' : ''}`}
                onClick={() => {
                  setCustomAlertVisible(false);
                  if (alertConfig.onConfirm) alertConfig.onConfirm();
                }}
              >
                {alertConfig.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      <ClientNavBar 
        currentUser={currentUser}
        onLogout={handleLogout}
        onViewProfile={handleViewProfile}
        onMyPets={handleMyPets}
        showAlert={showAlert}
      />


      {/* Main Content - Now with scrollable containers */}
      <div className="pets-main-content">
        {/* Left Sidebar - Scrollable */}
        <div className="pets-sidebar" ref={leftPanelRef}>
          <div className="sidebar-header">
            <img 
              src={profileHeader}
              alt="Profile Header"
              className="sidebar-header-image"
            />
            
            <div className="sidebar-header-text">
              <h2>Pet Profiles</h2>
              <p>View your pet's profile, medical records, and appointments!</p>
            </div>

            <img 
              src={petsPeeking}
              alt="Pets Peeking"
              className="sidebar-pets-image"
            />
          </div>
          
          <div className="pets-list-header">
            <h3>Your Pets</h3>
            <button 
              className="add-pet-btn"
              onClick={() => setModalVisible(true)}
            >
              <IoAdd size={20} color="#fff" />
              <span>Add New Pet</span>
            </button>
          </div>

          <div className="pets-list">
            {pets.map(pet => (
              <PetListItem 
                key={pet.id} 
                pet={pet} 
                isSelected={selectedPet?.id === pet.id}
                onPress={() => setSelectedPet(pet)}
              />
            ))}
          </div>
        </div>

        {/* Right Content - Pet Details - Scrollable */}
        <div className="pets-details" ref={rightPanelRef}>
          {selectedPet ? (
            <>
              <div className="pet-profile-header">
                <img 
                  src={profileHeader}
                  alt="Profile Header"
                  className="profile-header-bg"
                />
                
                <div className="profile-header-overlay">
                  <div className="profile-picture-wrapper">
                    <div className="profile-picture-border">
                      <img 
                        src={selectedPet.image || 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400'} 
                        alt={selectedPet.name}
                        className="profile-picture"
                      />
                    </div>
                  </div>
                  
                  <div className="profile-header-info">
                    <h1>{selectedPet.name}</h1>
                    <div className="profile-header-meta">
                      <span>@{selectedPet.name.toLowerCase()}</span>
                      <span>•</span>
                      <span>{selectedPet.breed}</span>
                    </div>
                    <p>Joined {formatDate(selectedPet.dateJoined)}</p>
                  </div>
                </div>

                <button
                  className="edit-profile-btn"
                  onClick={() => openEditModal(selectedPet)}
                >
                  <IoPencil size={15} color="#ffffff" />
                </button>
              </div>

              {/* Tab Navigation */}
              <div className="profile-tabs">
                <button 
                  className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
                  onClick={() => setActiveTab('profile')}
                >
                  Profile
                </button>
                <button 
                  className={`tab-btn ${activeTab === 'records' ? 'active' : ''}`}
                  onClick={() => setActiveTab('records')}
                >
                  Records (VET EMR)
                </button>
                <button 
                  className={`tab-btn ${activeTab === 'appointments' ? 'active' : ''}`}
                  onClick={() => setActiveTab('appointments')}
                >
                  Appointments
                </button>
              </div>

              {/* Tab Content */}
              {activeTab === 'profile' && (
                <div className="profile-tab-content">
                  <div className="info-section">
                    <div className="section-header">
                      <IoInformationCircleOutline size={25} color="#3d67ee" />
                      <h3>Pet Information</h3>
                    </div>

                    <div className="info-grid">
                      <div className="info-row">
                        <span className="info-label">Name:</span>
                        <span className="info-value">{selectedPet.name}</span>
                      </div>
                      
                      <div className="info-row">
                        <span className="info-label">Type:</span>
                        <span className="info-value">{selectedPet.type}</span>
                      </div>
                      
                      <div className="info-row">
                        <span className="info-label">Breed:</span>
                        <span className="info-value">{selectedPet.breed}</span>
                      </div>
                      
                      <div className="info-row">
                        <span className="info-label">Breed Size:</span>
                        <span className="info-value">{selectedPet.breedSize}</span>
                      </div>
                      
                      <div className="info-row">
                        <span className="info-label">Pet Birthday:</span>
                        <span className="info-value">
                          {selectedPet.birthday ? formatDate(selectedPet.birthday) : 'Unknown'}
                        </span>
                      </div>
                      
                      <div className="info-row">
                        <span className="info-label">Age:</span>
                        <span className="info-value">
                          {selectedPet.ageUnknown ? 'Unknown' : `${selectedPet.age} years`}
                        </span>
                      </div>
                      
                      <div className="info-row">
                        <span className="info-label">Weight:</span>
                        <span className="info-value">
                          {selectedPet.weightUnknown ? 'Unknown' : `${selectedPet.weight} kg`}
                        </span>
                      </div>
                      
                      <div className="info-row">
                        <span className="info-label">Gender:</span>
                        <span className="info-value">{selectedPet.gender}</span>
                      </div>
                    </div>

                    {/* Vaccination Records */}
                    <div className="vaccinations-section">
                      <div className="section-header with-action">
                        <div>
                          <IoMedicalOutline size={22} color="#3d67ee" />
                          <h4>Vaccination Records</h4>
                        </div>
                        <button
                          className="add-vaccine-btn"
                          onClick={() => {
                            const newVac: Vaccination = {
                              id: Date.now().toString(),
                              name: 'New Vaccine',
                              fileName: null,
                              date: new Date().toISOString().split('T')[0],
                              proofImage: null,
                              proofType: null
                            };
                            const updatedPet = {
                              ...selectedPet,
                              vaccinations: [...selectedPet.vaccinations, newVac]
                            };
                            const updatedPets = pets.map(p => 
                              p.id === selectedPet.id ? updatedPet : p
                            );
                            setPets(updatedPets);
                            setSelectedPet(updatedPet);
                          }}
                        >
                          + Add
                        </button>
                      </div>
                      
                      <div className="vaccinations-list">
                        {selectedPet.vaccinations?.map((vac) => (
                          <div key={vac.id} className="vaccination-card">
                            <div className="vaccination-header">
                              <div className="vaccination-title">
                                <IoMedical size={20} color="#3d67ee" />
                                <span>Vaccination</span>
                              </div>
                              <div className="vaccination-actions">
                                <span className="vaccination-date">{vac.date}</span>
                                <button
                                  className="delete-vaccine-btn"
                                  onClick={() => removeVaccination(selectedPet, vac.id, true)}
                                >
                                  <IoTrashOutline size={18} color="#ff4444" />
                                </button>
                              </div>
                            </div>
                            
                            <div className="vaccination-name">
                              {vac.fileName || vac.name}
                            </div>
                            
                            {vac.proofImage ? (
                              <button 
                                className="view-doc-btn"
                                onClick={() => viewDocument(vac.proofImage!, vac.proofType!)}
                              >
                                <IoEyeOutline size={18} />
                                <span>View Document</span>
                              </button>
                            ) : (
                              <button 
                                className="upload-doc-btn"
                                onClick={() => pickVaccinationForPet(selectedPet, setSelectedPet, vac)}
                              >
                                <IoCloudUploadOutline size={18} />
                                <span>Upload Document</span>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'records' && (
                <div className="records-tab-content">
                  <div className="section-header">
                    <IoFolderOutline size={22} color="#3d67ee" />
                    <h3>Electronic Medical Records</h3>
                    <span className="record-count">{selectedPet.medicalRecords.length} records</span>
                  </div>
                  <p className="records-note">
                    These records are from PetShield veterinarians and are view-only
                  </p>
                  {selectedPet.medicalRecords.map(record => (
                    <MedicalRecordCard key={record.id} record={record} />
                  ))}
                </div>
              )}

              {activeTab === 'appointments' && (
                <div className="appointments-tab-content">
                  <div className="section-header">
                    <h3>Appointments</h3>
                    <span className="appointment-count">{selectedPet.appointments.length} total</span>
                  </div>
                  {selectedPet.appointments.map(appointment => (
                    <AppointmentCard key={appointment.id} appointment={appointment} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="no-pet-selected">
              <IoPaw size={80} color="#e0e0e0" />
              <p>
                Select a pet from the left<br />to view their profile
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add Pet Modal */}
      {modalVisible && (
        <div className="modal-overlay" onClick={() => {
          setModalVisible(false);
          setValidationErrors({});
        }}>
          <div className="modal-content wide" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add a New Pet! 🐕</h2>
              <button className="modal-close-btn" onClick={() => {
                setModalVisible(false);
                setValidationErrors({});
              }}>
                <IoClose size={24} color="#666" />
              </button>
            </div>

            <div className="modal-body">
              {/* Pet Picture Upload */}
              <label className="form-label">Pet Picture</label>
              <button 
                className="image-upload-btn"
                onClick={() => pickImage(setNewPet, 'image', false)}
              >
                {newPet.image ? (
                  <img src={newPet.image} alt="Pet" className="upload-preview-img" />
                ) : (
                  <div className="upload-placeholder">
                    <IoCameraOutline size={40} color="#3d67ee" />
                    <p>Upload Pet Photo</p>
                  </div>
                )}
              </button>

              {/* Name Field */}
              <label className="form-label">Pet Name</label>
              <div className="input-with-counter">
                <input
                  type="text"
                  className={`form-input ${validationErrors.name ? 'error' : ''}`}
                  placeholder="Enter pet name (2-50 characters)"
                  value={newPet.name}
                  maxLength={50}
                  onChange={(e) => {
                    setNewPet({...newPet, name: e.target.value});
                    setCharCount(e.target.value.length);
                    if (validationErrors.name) {
                      setValidationErrors({...validationErrors, name: ''});
                    }
                  }}
                />
                <span className="char-counter">{charCount}/50</span>
              </div>
              {validationErrors.name && (
                <span className="error-message">{validationErrors.name}</span>
              )}

              {/* Type Selection */}
              <label className="form-label">Pet Type</label>
              <div className="type-selector">
                <button 
                  className={`type-btn ${newPet.type === 'Dog' ? 'selected' : ''}`}
                  onClick={() => {
                    setNewPet({...newPet, type: 'Dog', breed: ''});
                    if (validationErrors.breed) {
                      setValidationErrors({...validationErrors, breed: ''});
                    }
                  }}
                >
                  <IoPaw size={18} />
                  <span>Dog</span>
                </button>
                <button 
                  className={`type-btn ${newPet.type === 'Cat' ? 'selected' : ''}`}
                  onClick={() => {
                    setNewPet({...newPet, type: 'Cat', breed: ''});
                    if (validationErrors.breed) {
                      setValidationErrors({...validationErrors, breed: ''});
                    }
                  }}
                >
                  <IoHappy size={18} />
                  <span>Cat</span>
                </button>
              </div>

              {/* Breed Dropdown */}
              <label className="form-label">Breed</label>
              <select
                className={`form-select ${validationErrors.breed ? 'error' : ''}`}
                value={newPet.breed}
                onChange={(e) => {
                  setNewPet({...newPet, breed: e.target.value});
                  if (validationErrors.breed) {
                    setValidationErrors({...validationErrors, breed: ''});
                  }
                }}
              >
                <option value="">Select breed</option>
                {(newPet.type === 'Dog' ? dogBreeds : catBreeds).map(breed => (
                  <option key={breed} value={breed}>{breed}</option>
                ))}
              </select>
              {validationErrors.breed && (
                <span className="error-message">{validationErrors.breed}</span>
              )}

              {/* Breed Size Selection */}
              <label className="form-label">Breed Size</label>
              <div className="size-selector">
                {(['Small', 'Medium', 'Large'] as const).map(size => (
                  <button 
                    key={size}
                    className={`size-btn ${newPet.breedSize === size ? 'selected' : ''}`}
                    onClick={() => setNewPet({...newPet, breedSize: size})}
                  >
                    {size}
                  </button>
                ))}
              </div>

              {/* Birthday */}
              <label className="form-label">Pet Birthday</label>
              <div className="input-with-checkbox">
                <input
                  type="text"
                  className={`form-input ${validationErrors.birthday ? 'error' : ''}`}
                  placeholder="YYYY-MM-DD"
                  value={birthdayUnknown ? '' : newPet.birthday}
                  disabled={birthdayUnknown}
                  onChange={(e) => {
                    const formatted = formatDateInput(e.target.value);
                    setNewPet({...newPet, birthday: formatted});
                    if (validationErrors.birthday) {
                      setValidationErrors({...validationErrors, birthday: ''});
                    }
                  }}
                />
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={birthdayUnknown}
                    onChange={() => {
                      setBirthdayUnknown(!birthdayUnknown);
                      if (!birthdayUnknown) {
                        setNewPet({...newPet, birthday: ''});
                      }
                    }}
                  />
                  <span>Unknown</span>
                </label>
              </div>
              {validationErrors.birthday && (
                <span className="error-message">{validationErrors.birthday}</span>
              )}

              {/* Age */}
              <label className="form-label">Age (years)</label>
              <div className="input-with-checkbox">
                <div className="input-with-counter" style={{ flex: 1 }}>
                  <input
                    type="text"
                    className={`form-input ${validationErrors.age ? 'error' : ''}`}
                    placeholder="Enter age (whole numbers only)"
                    value={ageUnknown ? '' : newPet.age}
                    disabled={ageUnknown}
                    maxLength={2}
                    onChange={(e) => {
                      const numericValue = e.target.value.replace(/[^0-9]/g, '');
                      setNewPet({...newPet, age: numericValue});
                      setAgeCharCount(numericValue.length);
                      if (validationErrors.age) {
                        setValidationErrors({...validationErrors, age: ''});
                      }
                    }}
                  />
                  <span className="char-counter">{ageCharCount}/2</span>
                </div>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={ageUnknown}
                    onChange={() => {
                      setAgeUnknown(!ageUnknown);
                      setNewPet({...newPet, age: '', ageUnknown: !ageUnknown});
                      setAgeCharCount(0);
                    }}
                  />
                  <span>Unknown</span>
                </label>
              </div>
              {validationErrors.age && (
                <span className="error-message">{validationErrors.age}</span>
              )}

              {/* Weight */}
              <label className="form-label">Weight (kg)</label>
              <div className="input-with-checkbox">
                <input
                  type="text"
                  className={`form-input ${validationErrors.weight ? 'error' : ''}`}
                  placeholder="Enter weight (max 100 kg)"
                  value={weightUnknown ? '' : newPet.weight}
                  disabled={weightUnknown}
                  onChange={(e) => {
                    const numericValue = e.target.value.replace(/[^0-9.]/g, '');
                    if (parseFloat(numericValue) <= 100 || numericValue === '') {
                      setNewPet({...newPet, weight: numericValue});
                    }
                    if (validationErrors.weight) {
                      setValidationErrors({...validationErrors, weight: ''});
                    }
                  }}
                />
                <span className="unit-label">kg</span>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={weightUnknown}
                    onChange={() => {
                      setWeightUnknown(!weightUnknown);
                      setNewPet({...newPet, weight: '', weightUnknown: !weightUnknown});
                    }}
                  />
                  <span>Unknown</span>
                </label>
              </div>
              {validationErrors.weight && (
                <span className="error-message">{validationErrors.weight}</span>
              )}

              {/* Gender */}
              <label className="form-label">Gender</label>
              <select
                className="form-select"
                value={newPet.gender}
                onChange={(e) => setNewPet({...newPet, gender: e.target.value as 'Male' | 'Female'})}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>

              {/* Vaccination Upload */}
              <div className="vaccination-upload-section">
                <label className="form-label">Vaccination Records</label>
                <button 
                  className="upload-area-btn"
                  onClick={pickDocumentForNewPet}
                >
                  <IoCloudUploadOutline size={30} color="#3d67ee" />
                  <span>Upload Vaccination Proof</span>
                </button>
                
                {newPet.vaccinations?.length > 0 && (
                  <div className="uploaded-files">
                    {newPet.vaccinations.map((vac) => (
                      <div key={vac.id} className="uploaded-file-item">
                        <div className="file-info">
                          <IoDocumentText size={20} color="#3d67ee" />
                          <span className="file-name">{vac.fileName || vac.name}</span>
                        </div>
                        <div className="file-actions">
                          <IoCheckmarkCircle size={20} color="#4CAF50" />
                          <button
                            className="delete-file-btn"
                            onClick={() => removeVaccination(newPet as any, vac.id, false)}
                          >
                            <IoTrashOutline size={18} color="#ff4444" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {validationErrors.birthdayAge && (
                <div className="error-message text-center">
                  {validationErrors.birthdayAge}
                </div>
              )}

              <button 
                className="submit-btn"
                onClick={addNewPet}
              >
                Add Pet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Pet Modal */}
      {editModalVisible && editPet && (
        <div className="modal-overlay" onClick={() => {
          setEditModalVisible(false);
          setValidationErrors({});
        }}>
          <div className="modal-content wide" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Pet Information 🐈</h2>
              <button className="modal-close-btn" onClick={() => {
                setEditModalVisible(false);
                setValidationErrors({});
              }}>
                <IoClose size={24} color="#666" />
              </button>
            </div>

            <div className="modal-body">
              {/* Pet Picture Upload */}
              <label className="form-label">Pet Picture</label>
              <button 
                className="image-upload-btn"
                onClick={() => pickImage(setEditPet, 'image', true)}
              >
                {editPet.image ? (
                  <img src={editPet.image} alt="Pet" className="upload-preview-img" />
                ) : (
                  <div className="upload-placeholder">
                    <IoCameraOutline size={40} color="#3d67ee" />
                    <p>Upload Pet Photo</p>
                  </div>
                )}
              </button>

              <label className="form-label">Pet Name</label>
              <div className="input-with-counter">
                <input
                  type="text"
                  className={`form-input ${validationErrors.name ? 'error' : ''}`}
                  value={editPet.name}
                  maxLength={50}
                  onChange={(e) => {
                    setEditPet({...editPet, name: e.target.value});
                    setCharCount(e.target.value.length);
                    if (validationErrors.name) {
                      setValidationErrors({...validationErrors, name: ''});
                    }
                  }}
                />
                <span className="char-counter">{editPet.name?.length || 0}/50</span>
              </div>
              {validationErrors.name && (
                <span className="error-message">{validationErrors.name}</span>
              )}

              <label className="form-label">Pet Type</label>
              <div className="type-selector">
                <button 
                  className={`type-btn ${editPet.type === 'Dog' ? 'selected' : ''}`}
                  onClick={() => setEditPet({...editPet, type: 'Dog', breed: ''})}
                >
                  Dog
                </button>
                <button 
                  className={`type-btn ${editPet.type === 'Cat' ? 'selected' : ''}`}
                  onClick={() => setEditPet({...editPet, type: 'Cat', breed: ''})}
                >
                  Cat
                </button>
              </div>

              <label className="form-label">Breed</label>
              <select
                className={`form-select ${validationErrors.breed ? 'error' : ''}`}
                value={editPet.breed}
                onChange={(e) => {
                  setEditPet({...editPet, breed: e.target.value});
                  if (validationErrors.breed) {
                    setValidationErrors({...validationErrors, breed: ''});
                  }
                }}
              >
                <option value="">Select breed</option>
                {(editPet.type === 'Dog' ? dogBreeds : catBreeds).map(breed => (
                  <option key={breed} value={breed}>{breed}</option>
                ))}
              </select>
              {validationErrors.breed && (
                <span className="error-message">{validationErrors.breed}</span>
              )}

              <label className="form-label">Breed Size</label>
              <div className="size-selector">
                {(['Small', 'Medium', 'Large'] as const).map(size => (
                  <button 
                    key={size}
                    className={`size-btn ${editPet.breedSize === size ? 'selected' : ''}`}
                    onClick={() => setEditPet({...editPet, breedSize: size})}
                  >
                    {size}
                  </button>
                ))}
              </div>

              <label className="form-label">Pet Birthday</label>
              <input
                type="text"
                className={`form-input ${validationErrors.birthday ? 'error' : ''}`}
                value={editPet.birthday}
                placeholder="YYYY-MM-DD"
                onChange={(e) => {
                  const formatted = formatDateInput(e.target.value);
                  setEditPet({...editPet, birthday: formatted});
                  if (validationErrors.birthday) {
                    setValidationErrors({...validationErrors, birthday: ''});
                  }
                }}
              />
              {validationErrors.birthday && (
                <span className="error-message">{validationErrors.birthday}</span>
              )}

              <label className="form-label">Age (years)</label>
              <div className="input-with-counter">
                <input
                  type="text"
                  className={`form-input ${validationErrors.age ? 'error' : ''}`}
                  value={editPet.age}
                  placeholder="Enter age (whole numbers only)"
                  maxLength={2}
                  onChange={(e) => {
                    const numericValue = e.target.value.replace(/[^0-9]/g, '');
                    setEditPet({...editPet, age: numericValue});
                    setAgeCharCount(numericValue.length);
                    if (validationErrors.age) {
                      setValidationErrors({...validationErrors, age: ''});
                    }
                  }}
                />
                <span className="char-counter">{ageCharCount}/2</span>
              </div>
              {validationErrors.age && (
                <span className="error-message">{validationErrors.age}</span>
              )}

              <label className="form-label">Weight (kg)</label>
              <div className="input-with-unit">
                <input
                  type="text"
                  className={`form-input ${validationErrors.weight ? 'error' : ''}`}
                  value={editPet.weight}
                  placeholder="Enter weight (max 100 kg)"
                  onChange={(e) => {
                    const numericValue = e.target.value.replace(/[^0-9.]/g, '');
                    if (parseFloat(numericValue) <= 100 || numericValue === '') {
                      setEditPet({...editPet, weight: numericValue});
                    }
                    if (validationErrors.weight) {
                      setValidationErrors({...validationErrors, weight: ''});
                    }
                  }}
                />
                <span className="unit-label">kg</span>
              </div>
              {validationErrors.weight && (
                <span className="error-message">{validationErrors.weight}</span>
              )}

              <label className="form-label">Gender</label>
              <select
                className="form-select"
                value={editPet.gender}
                onChange={(e) => setEditPet({...editPet, gender: e.target.value as 'Male' | 'Female'})}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>

              <div className="modal-actions-row">
                <button 
                  className="btn-secondary"
                  onClick={() => {
                    setEditModalVisible(false);
                    setValidationErrors({});
                  }}
                >
                  Cancel
                </button>
                
                <button 
                  className="btn-primary"
                  onClick={savePetChanges}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserPetProfile;