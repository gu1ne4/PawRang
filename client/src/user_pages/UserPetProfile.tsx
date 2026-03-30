import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_URL from '../API';
import profileHeader from '../assets/ProfileHeader.png';
import petsPeeking from '../assets/PetsPeeking.png';
import ClientNavBar from '../reusable_components/ClientNavBar';
import {
  IoPaw, IoMedical, IoDocumentText, IoEyeOutline,
  IoCloudUploadOutline, IoTrashOutline, IoClose, IoCameraOutline,
  IoHappy, IoInformationCircleOutline, IoMedicalOutline, IoFolderOutline,
  IoCheckmarkCircle, IoAdd, IoPencil,
  IoAlertCircleOutline, IoCheckmarkCircleOutline, IoCloseCircleOutline,
} from 'react-icons/io5';
import './UserStyles.css';

// ─── Types ────────────────────────────────────────────────────────────────────

interface User {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  fullname?: string;
  fullName?: string;
  userImage?: string;
  userimage?: string;
}

interface Pet {
  pet_id: number;
  owner_id: string;
  pet_name: string;
  pet_species: string;
  pet_breed: string;
  pet_gender: string;
  pet_size: string;
  birthday: string | null;
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
  username: string;     
  userImage?: string;
  userimage?: string;
  weight_kg: string;
  pet_photo_url: string | null;
  vaccination_urls: string[] | null;
  created_at: string;
}

interface AlertConfig {
  type: 'info' | 'success' | 'error' | 'confirm';
  title: string;
  message: string | React.ReactNode;
  onConfirm: (() => void) | null;
  showCancel: boolean;
  confirmText: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_ALERT: AlertConfig = {
  type: 'info', title: '', message: '',
  onConfirm: null, showCancel: false, confirmText: 'OK',
};

const DOG_BREEDS = [
  'Unknown', 'Golden Retriever', 'French Bulldog', 'German Shepherd',
  'Labrador Retriever', 'Siberian Husky', 'Poodle', 'Beagle',
  'Rottweiler', 'Yorkshire Terrier', 'Dachshund', 'Boxer', 'Other',
];

const CAT_BREEDS = [
  'Unknown', 'Persian', 'Siamese', 'Maine Coon', 'Ragdoll', 'Bengal',
  'Sphynx', 'British Shorthair', 'Scottish Fold', 'Abyssinian', 'Other',
];

const DEFAULT_PET_IMG =
  'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400';

// ─── Pure helpers ─────────────────────────────────────────────────────────────

const formatDate = (s: string) =>
  new Date(s).toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
  });

const formatDateInput = (text: string) => {
  const c = text.replace(/\D/g, '');
  if (c.length <= 4) return c;
  if (c.length <= 6) return `${c.slice(0, 4)}-${c.slice(4)}`;
  return `${c.slice(0, 4)}-${c.slice(4, 6)}-${c.slice(6, 8)}`;
};

const pickFile = (
  accept: string,
  onResult: (base64: string, mime: string, name: string) => void,
) => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = accept;
  input.onchange = e => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string;
      onResult(dataUrl.split(',')[1], file.type, file.name);
    };
    reader.readAsDataURL(file);
  };
  input.click();
};

const getToken = () => localStorage.getItem('access_token') ?? '';

// ─── Component ────────────────────────────────────────────────────────────────

const UserPetProfile: React.FC = () => {
  const navigate = useNavigate();

  const leftRef  = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  // ── Session — read once, no redirect ─────────────────────────────────────
  const [currentUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem('userSession');
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  });

// Load user session
  useEffect(() => {
    const loadUser = async () => {
      try {
        const session = localStorage.getItem('userSession');
        if (session) {
          setCurrentUser(JSON.parse(session));
        } else {
          setCurrentUser(null);
          
          // 👇 TEMPORARILY DISABLED THE REDIRECT HERE 👇
          // navigate('/'); 
          
        }
      } catch (error) {
        console.error("Failed to load user session", error);
      }
    };
    loadUser();
  }, [navigate]);
  // ── Pet list ──────────────────────────────────────────────────────────────
  const [pets, setPets]               = useState<Pet[]>([]);
  const [loadingPets, setLoadingPets] = useState(false);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  // ── Only profile and records tabs (appointments tab removed) ──────────────
  const [activeTab, setActiveTab]     = useState<'profile' | 'records'>('profile');

  // ── Add modal ─────────────────────────────────────────────────────────────
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    petName:       '',
    petType:       'Dog' as 'Dog' | 'Cat',
    breed:         '',
    breedSize:     'Medium' as 'Small' | 'Medium' | 'Large',
    birthday:      '',
    age:           '',
    ageUnknown:    false,
    weight:        '',
    weightUnknown: false,
    gender:        'Male' as 'Male' | 'Female',
  });
  const [addImage, setAddImage] =
    useState<{ preview: string; base64: string; mime: string } | null>(null);
  const [addVaccFiles, setAddVaccFiles] =
    useState<{ id: string; name: string; base64: string; mime: string }[]>([]);
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});

  // ── Edit modal ────────────────────────────────────────────────────────────
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editPet, setEditPet]             = useState<Partial<Pet>>({});
  const [editImage, setEditImage] =
    useState<{ preview: string; base64: string | null; mime: string } | null>(null);

  // ── Shared UI ─────────────────────────────────────────────────────────────
  const [isSaving,     setIsSaving]     = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig,  setAlertConfig]  = useState<AlertConfig>(DEFAULT_ALERT);

  // ─────────────────────────────────────────────────────────────────────────
  // Alert
  // ─────────────────────────────────────────────────────────────────────────

  const showAlert = useCallback((
    type: AlertConfig['type'],
    title: string,
    message: string | React.ReactNode,
    onConfirm: (() => void) | null = null,
    showCancel = false,
    confirmText = 'OK',
  ) => {
    setAlertConfig({ type, title, message, onConfirm, showCancel, confirmText });
    setAlertVisible(true);
  }, []);

  const closeAlert = () => setAlertVisible(false);

  // ─────────────────────────────────────────────────────────────────────────
  // API helpers
  // ─────────────────────────────────────────────────────────────────────────

  const fetchPets = useCallback(async (userId: string): Promise<Pet[]> => {
    setLoadingPets(true);
    try {
      const res = await axios.get(`${API_URL}/pets/user/${userId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const list: Pet[] = res.data.pets ?? [];
      setPets(list);
      return list;
    } catch (err) {
      console.error('fetchPets error:', err);
      return [];
    } finally {
      setLoadingPets(false);
    }
  }, []);

  const uploadFile = useCallback(async (
    base64: string, fileName: string, mime: string,
  ): Promise<string> => {
    const res = await axios.post(
      `${API_URL}/upload-pet-photo`,
      { file: base64, file_name: fileName, mime_type: mime },
      { headers: { Authorization: `Bearer ${getToken()}` } },
    );
    return res.data.photoUrl as string;
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Effects
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (currentUser?.id) fetchPets(currentUser.id);
  }, [currentUser?.id, fetchPets]);

  // ─────────────────────────────────────────────────────────────────────────
  // Add pet
  // ─────────────────────────────────────────────────────────────────────────

  const validateAddForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (addForm.petName.trim().length < 2)
      errors.petName = 'Name must be at least 2 characters';
    if (!addForm.breed)
      errors.breed = 'Please select a breed';
    if (!addForm.ageUnknown && !addForm.birthday && !addForm.age)
      errors.birthdayAge = 'Provide birthday or age';
    if (addForm.age && !addForm.ageUnknown) {
      const n = parseFloat(addForm.age);
      if (isNaN(n) || n < 0 || n > 30) errors.age = 'Age must be 0–30';
    }
    if (!addForm.weight && !addForm.weightUnknown)
      errors.weight = 'Provide weight or check unknown';
    setAddErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddPet = async () => {
    if (!validateAddForm()) return;
    if (!currentUser?.id) {
      showAlert('error', 'Not logged in', 'Could not find your user session.');
      return;
    }

    setIsSaving(true);
    try {
      let photoUrl: string | undefined;
      if (addImage) {
        photoUrl = await uploadFile(addImage.base64, `pet_${Date.now()}.jpg`, addImage.mime);
      }

      const vaccUrls: string[] = [];
      for (const v of addVaccFiles) {
        try {
          vaccUrls.push(await uploadFile(v.base64, v.name, v.mime));
        } catch (err) {
          console.warn('Skipped vacc file upload:', err);
        }
      }

      await axios.post(
        `${API_URL}/pets`,
        {
          owner_id:         currentUser.id,
          pet_name:         addForm.petName,
          pet_type:         addForm.petType,
          breed:            addForm.breed,
          pet_size:         addForm.breedSize,
          gender:           addForm.gender,
          birthday:         addForm.birthday || undefined,
          age:              addForm.ageUnknown    ? undefined : addForm.age    || undefined,
          weight_kg:        addForm.weightUnknown ? undefined : addForm.weight || undefined,
          pet_photo_url:    photoUrl,
          vaccination_urls: vaccUrls.length ? vaccUrls : undefined,
        },
        { headers: { Authorization: `Bearer ${getToken()}` } },
      );

      await fetchPets(currentUser.id);
      setAddModalOpen(false);
      resetAddForm();
      showAlert('success', 'Pet Added!', `${addForm.petName} has been added to your profile.`);
    } catch (err: any) {
      console.error('handleAddPet error:', err);
      showAlert('error', 'Error', err.response?.data?.error ?? 'Failed to add pet. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const resetAddForm = () => {
    setAddForm({
      petName: '', petType: 'Dog', breed: '', breedSize: 'Medium',
      birthday: '', age: '', ageUnknown: false,
      weight: '', weightUnknown: false, gender: 'Male',
    });
    setAddImage(null);
    setAddVaccFiles([]);
    setAddErrors({});
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Edit pet
  // ─────────────────────────────────────────────────────────────────────────

  const openEditModal = (pet: Pet) => {
    setEditPet({ ...pet });
    setEditImage({ preview: pet.pet_photo_url ?? DEFAULT_PET_IMG, base64: null, mime: 'image/jpeg' });
    setEditModalOpen(true);
  };

  const handleSavePet = async () => {
    if (!editPet.pet_id || !currentUser?.id) return;
    setIsSaving(true);
    try {
      let photoUrl = editPet.pet_photo_url;
      if (editImage?.base64) {
        photoUrl = await uploadFile(
          editImage.base64,
          `pet_${editPet.pet_id}_${Date.now()}.jpg`,
          editImage.mime,
        );
      }

      await axios.patch(
        `${API_URL}/pets/${editPet.pet_id}`,
        {
          pet_name:      editPet.pet_name,
          pet_species:   editPet.pet_species,
          pet_breed:     editPet.pet_breed,
          pet_gender:    editPet.pet_gender,
          pet_size:      editPet.pet_size,
          birthday:      editPet.birthday  ?? undefined,
          age:           editPet.age       ?? undefined,
          weight_kg:     editPet.weight_kg ?? undefined,
          pet_photo_url: photoUrl          ?? undefined,
        },
        { headers: { Authorization: `Bearer ${getToken()}` } },
      );

      const freshPets = await fetchPets(currentUser.id);
      const updated   = freshPets.find(p => p.pet_id === editPet.pet_id);
      if (updated) setSelectedPet(updated);

      setEditModalOpen(false);
      showAlert('success', 'Saved!', 'Pet profile updated successfully.');
    } catch (err: any) {
      console.error('handleSavePet error:', err);
      showAlert('error', 'Error', err.response?.data?.error ?? 'Failed to save changes.');
    } finally {
      setIsSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Delete pet
  // ─────────────────────────────────────────────────────────────────────────

  const handleDeletePet = (pet: Pet) => {
    showAlert(
      'confirm', 'Delete Pet',
      `Are you sure you want to delete ${pet.pet_name}'s profile? This cannot be undone.`,
      async () => {
        try {
          await axios.delete(`${API_URL}/pets/${pet.pet_id}`, {
            headers: { Authorization: `Bearer ${getToken()}` },
          });
          if (currentUser?.id) await fetchPets(currentUser.id);
          if (selectedPet?.pet_id === pet.pet_id) setSelectedPet(null);
          showAlert('success', 'Deleted', `${pet.pet_name}'s profile has been removed.`);
        } catch (err: any) {
          showAlert('error', 'Error', err.response?.data?.error ?? 'Failed to delete pet.');
        }
      },
      true, 'Delete',
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="user-container">

      {/* ── Alert Modal ── */}
      {alertVisible && (
        <div className="modal-overlay" onClick={closeAlert}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            {alertConfig.type === 'success'
              ? <IoCheckmarkCircleOutline size={55} color="#2e9e0c" />
              : alertConfig.type === 'error'
                ? <IoCloseCircleOutline size={55} color="#d93025" />
                : <IoAlertCircleOutline size={55} color="#3d67ee" />}
            <h3 className="modal-title">{alertConfig.title}</h3>
            {typeof alertConfig.message === 'string'
              ? <p className="modal-message">{alertConfig.message}</p>
              : <div className="modal-message">{alertConfig.message}</div>}
            <div className="modal-actions">
              {alertConfig.showCancel && (
                <button className="modal-btn modal-btn-cancel" onClick={closeAlert}>Cancel</button>
              )}
              <button
                className={`modal-btn modal-btn-confirm ${alertConfig.type === 'error' ? 'error-btn' : ''}`}
                onClick={() => { closeAlert(); alertConfig.onConfirm?.(); }}
              >
                {alertConfig.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      <ClientNavBar
        currentUser={currentUser}
        onLogout={() =>
          showAlert(
            'confirm', 'Log Out', 'Are you sure you want to log out?',
            () => {
              localStorage.removeItem('userSession');
              localStorage.removeItem('access_token');
              navigate('/login');
            },
            true, 'Log Out',
          )
        }
        onViewProfile={() => navigate('/user/home')}
        onMyPets={() => navigate('/user/pet-profile')}
        showAlert={showAlert}
      />

      <div className="pets-main-content">

        {/* ════════ LEFT SIDEBAR ════════ */}
        <div className="pets-sidebar" ref={leftRef}>
          <div className="sidebar-header">
            <img src={profileHeader} alt="Header" className="sidebar-header-image" />
            <div className="sidebar-header-text">
              <h2>Pet Profiles</h2>
              <p>View your pet's profile and medical records!</p>
            </div>
            <img src={petsPeeking} alt="Pets" className="sidebar-pets-image" />
          </div>

          <div className="pets-list-header">
            <h3>Your Pets</h3>
            <button className="add-pet-btn" onClick={() => setAddModalOpen(true)}>
              <IoAdd size={20} color="#fff" /><span>Add New Pet</span>
            </button>
          </div>

          <div className="pets-list">
            {loadingPets ? (
              <p style={{ color: '#999', textAlign: 'center', padding: 20 }}>Loading pets…</p>
            ) : pets.length === 0 ? (
              <p style={{ color: '#999', textAlign: 'center', padding: 20 }}>
                No pets yet. Add your first pet!
              </p>
            ) : (
              pets.map(pet => (
                <div
                  key={pet.pet_id}
                  className={`pet-list-item ${selectedPet?.pet_id === pet.pet_id ? 'selected' : ''}`}
                  onClick={() => { setSelectedPet(pet); setActiveTab('profile'); }}
                >
                  <img
                    src={pet.pet_photo_url ?? DEFAULT_PET_IMG}
                    alt={pet.pet_name}
                    className="pet-list-image"
                  />
                  <div style={{ flex: 1 }}>
                    <div className="pet-list-name">{pet.pet_name}</div>
                    <div className="pet-list-username">@{pet.pet_name.toLowerCase()}</div>
                    <div className="pet-list-stats">
                      <span className="stat-badge"><IoPaw size={12} /> {pet.pet_species}</span>
                      <span className="stat-badge">{pet.pet_breed}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ════════ RIGHT DETAILS ════════ */}
        <div className="pets-details" ref={rightRef}>
          {!selectedPet ? (
            <div className="no-pet-selected">
              <IoPaw size={80} color="#e0e0e0" />
              <p>Select a pet from the left<br />to view their profile</p>
            </div>
          ) : (
            <>
              {/* Profile header */}
              <div className="pet-profile-header">
                <img src={profileHeader} alt="Header" className="profile-header-bg" />
                <div className="profile-header-overlay">
                  <div className="profile-picture-wrapper">
                    <img
                      src={selectedPet.pet_photo_url ?? DEFAULT_PET_IMG}
                      alt={selectedPet.pet_name}
                      className="profile-picture"
                    />
                  </div>
                  <div className="profile-header-info">
                    <h1>{selectedPet.pet_name}</h1>
                    <div className="profile-header-meta">
                      <span>@{selectedPet.pet_name.toLowerCase()}</span>
                      <span>•</span>
                      <span>{selectedPet.pet_breed}</span>
                    </div>
                    <p>Added {formatDate(selectedPet.created_at)}</p>
                  </div>
                </div>
                <button className="edit-profile-btn" onClick={() => openEditModal(selectedPet)}>
                  <IoPencil size={15} color="#ffffff" />
                </button>
              </div>

              {/* Tabs — profile and records only */}
              <div className="profile-tabs">
                {(['profile', 'records'] as const).map(tab => (
                  <button
                    key={tab}
                    className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab === 'records' ? 'Records (VET EMR)' : 'Profile'}
                  </button>
                ))}
              </div>

              {/* ── Profile tab ── */}
              {activeTab === 'profile' && (
                <div className="profile-tab-content">
                  <div className="info-section">
                    <div className="section-header">
                      <IoInformationCircleOutline size={25} color="#3d67ee" />
                      <h3>Pet Information</h3>
                    </div>
                    <div className="info-grid">
                      {([
                        ['Name',     selectedPet.pet_name],
                        ['Species',  selectedPet.pet_species],
                        ['Breed',    selectedPet.pet_breed],
                        ['Size',     selectedPet.pet_size],
                        ['Birthday', selectedPet.birthday ? formatDate(selectedPet.birthday) : 'Unknown'],
                        ['Age',      selectedPet.age      ? `${selectedPet.age} years`        : 'Unknown'],
                        ['Weight',   selectedPet.weight_kg ? `${selectedPet.weight_kg} kg`    : 'Unknown'],
                        ['Gender',   selectedPet.pet_gender],
                      ] as [string, string][]).map(([label, value]) => (
                        <div key={label} className="info-row">
                          <span className="info-label">{label}:</span>
                          <span className="info-value">{value}</span>
                        </div>
                      ))}
                    </div>

                    {/* Vaccination records */}
                    <div className="vaccinations-section" style={{ marginTop: 25 }}>
                      <div className="section-header">
                        <IoMedicalOutline size={22} color="#3d67ee" />
                        <h4>Vaccination Records</h4>
                      </div>
                      {selectedPet.vaccination_urls?.length ? (
                        <div className="vaccinations-list">
                          {selectedPet.vaccination_urls.map((url, i) => (
                            <div key={i} className="vaccination-card">
                              <div className="vaccination-title">
                                <IoMedical size={20} color="#3d67ee" />
                                <span>Vaccination {i + 1}</span>
                              </div>
                              <button
                                className="view-doc-btn"
                                onClick={() => window.open(url, '_blank')}
                              >
                                <IoEyeOutline size={18} /><span>View Document</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ color: '#999', fontSize: 14, fontStyle: 'italic' }}>
                          No vaccination records uploaded.
                        </p>
                      )}
                    </div>

                    {/* Delete */}
                    <div style={{ marginTop: 30, paddingTop: 20, borderTop: '1px solid #ffcccc' }}>
                      <button
                        onClick={() => handleDeletePet(selectedPet)}
                        style={{
                          background: '#ffeeee', border: '1px solid #ee3d5a',
                          borderRadius: 8, padding: '10px 20px', color: '#ee3d5a',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                        }}
                      >
                        <IoTrashOutline size={18} /> Remove Pet Profile
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Records tab ── */}
              {activeTab === 'records' && (
                <div className="records-tab-content">
                  <div className="section-header">
                    <IoFolderOutline size={22} color="#3d67ee" />
                    <h3>Electronic Medical Records</h3>
                  </div>
                  <p className="records-note">
                    These records are added by PetShield veterinarians and are view-only.
                  </p>
                  <div style={{ color: '#999', textAlign: 'center', padding: 40 }}>
                    <IoDocumentText size={50} color="#ccc" />
                    <p style={{ marginTop: 10 }}>
                      Medical records will appear here once added by your vet.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════
          ADD PET MODAL
      ════════════════════════════════════════════ */}
      {addModalOpen && (
        <div className="modal-overlay" onClick={() => { setAddModalOpen(false); resetAddForm(); }}>
          <div className="modal-content wide" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add a New Pet! 🐕</h2>
              <button className="modal-close-btn" onClick={() => { setAddModalOpen(false); resetAddForm(); }}>
                <IoClose size={24} color="#666" />
              </button>
            </div>

            <div className="modal-body">

              {/* Photo */}
              <label className="form-label">Pet Picture</label>
              <button
                className="image-upload-btn"
                onClick={() =>
                  pickFile('image/*', (base64, mime) =>
                    setAddImage({ preview: `data:${mime};base64,${base64}`, base64, mime })
                  )
                }
              >
                {addImage
                  ? <img src={addImage.preview} alt="Pet" className="upload-preview-img" />
                  : (
                    <div className="upload-placeholder">
                      <IoCameraOutline size={40} color="#3d67ee" />
                      <p>Upload Pet Photo</p>
                    </div>
                  )}
              </button>

              {/* Name */}
              <label className="form-label">Pet Name</label>
              <div className="input-with-counter">
                <input
                  type="text"
                  className={`form-input ${addErrors.petName ? 'error' : ''}`}
                  placeholder="Enter pet name"
                  value={addForm.petName}
                  maxLength={50}
                  onChange={e => setAddForm(f => ({ ...f, petName: e.target.value }))}
                />
                <span className="char-counter">{addForm.petName.length}/50</span>
              </div>
              {addErrors.petName && <span className="error-message">{addErrors.petName}</span>}

              {/* Type */}
              <label className="form-label">Pet Type</label>
              <div className="type-selector">
                {(['Dog', 'Cat'] as const).map(type => (
                  <button
                    key={type}
                    className={`type-btn ${addForm.petType === type ? 'selected' : ''}`}
                    onClick={() => setAddForm(f => ({ ...f, petType: type, breed: '' }))}
                  >
                    {type === 'Dog' ? <IoPaw size={18} /> : <IoHappy size={18} />}
                    <span>{type}</span>
                  </button>
                ))}
              </div>

              {/* Breed */}
              <label className="form-label">Breed</label>
              <select
                className={`form-select ${addErrors.breed ? 'error' : ''}`}
                value={addForm.breed}
                onChange={e => setAddForm(f => ({ ...f, breed: e.target.value }))}
              >
                <option value="">Select breed</option>
                {(addForm.petType === 'Dog' ? DOG_BREEDS : CAT_BREEDS).map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
              {addErrors.breed && <span className="error-message">{addErrors.breed}</span>}

              {/* Breed Size */}
              <label className="form-label">Breed Size</label>
              <div className="size-selector">
                {(['Small', 'Medium', 'Large'] as const).map(s => (
                  <button
                    key={s}
                    className={`size-btn ${addForm.breedSize === s ? 'selected' : ''}`}
                    onClick={() => setAddForm(f => ({ ...f, breedSize: s }))}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Birthday */}
              <label className="form-label">Pet Birthday</label>
              <div className="input-with-checkbox">
                <input
                  type="text"
                  className="form-input"
                  placeholder="YYYY-MM-DD"
                  value={addForm.ageUnknown ? '' : addForm.birthday}
                  disabled={addForm.ageUnknown}
                  onChange={e =>
                    setAddForm(f => ({ ...f, birthday: formatDateInput(e.target.value) }))
                  }
                />
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={addForm.ageUnknown}
                    onChange={() =>
                      setAddForm(f => ({ ...f, ageUnknown: !f.ageUnknown, birthday: '', age: '' }))
                    }
                  />
                  <span>Unknown</span>
                </label>
              </div>

              {/* Age */}
              <label className="form-label">Age (years)</label>
              <div className="input-with-checkbox">
                <input
                  type="text"
                  className={`form-input ${addErrors.age ? 'error' : ''}`}
                  placeholder="e.g. 3"
                  value={addForm.ageUnknown ? '' : addForm.age}
                  disabled={addForm.ageUnknown}
                  maxLength={2}
                  onChange={e =>
                    setAddForm(f => ({ ...f, age: e.target.value.replace(/\D/g, '') }))
                  }
                />
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={addForm.ageUnknown}
                    onChange={() =>
                      setAddForm(f => ({ ...f, ageUnknown: !f.ageUnknown, age: '' }))
                    }
                  />
                  <span>Unknown</span>
                </label>
              </div>
              {addErrors.age && <span className="error-message">{addErrors.age}</span>}

              {/* Weight */}
              <label className="form-label">Weight (kg)</label>
              <div className="input-with-checkbox">
                <input
                  type="text"
                  className={`form-input ${addErrors.weight ? 'error' : ''}`}
                  placeholder="e.g. 5.5"
                  value={addForm.weightUnknown ? '' : addForm.weight}
                  disabled={addForm.weightUnknown}
                  onChange={e =>
                    setAddForm(f => ({ ...f, weight: e.target.value.replace(/[^0-9.]/g, '') }))
                  }
                />
                <span className="unit-label">kg</span>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={addForm.weightUnknown}
                    onChange={() =>
                      setAddForm(f => ({ ...f, weightUnknown: !f.weightUnknown, weight: '' }))
                    }
                  />
                  <span>Unknown</span>
                </label>
              </div>
              {addErrors.weight && <span className="error-message">{addErrors.weight}</span>}

              {/* Gender */}
              <label className="form-label">Gender</label>
              <select
                className="form-select"
                value={addForm.gender}
                onChange={e =>
                  setAddForm(f => ({ ...f, gender: e.target.value as 'Male' | 'Female' }))
                }
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>

              {/* Vaccination upload */}
              <label className="form-label">Vaccination Records</label>
              <button
                className="upload-area-btn"
                onClick={() =>
                  pickFile('.pdf,image/*', (base64, mime, name) =>
                    setAddVaccFiles(prev => [
                      ...prev,
                      { id: Date.now().toString(), name, base64, mime },
                    ])
                  )
                }
              >
                <IoCloudUploadOutline size={30} color="#3d67ee" />
                <span>Upload Vaccination Proof</span>
              </button>

              {addVaccFiles.length > 0 && (
                <div className="uploaded-files">
                  {addVaccFiles.map(v => (
                    <div key={v.id} className="uploaded-file-item">
                      <div className="file-info">
                        <IoDocumentText size={20} color="#3d67ee" />
                        <span className="file-name">{v.name}</span>
                      </div>
                      <div className="file-actions">
                        <IoCheckmarkCircle size={20} color="#4CAF50" />
                        <button
                          className="delete-file-btn"
                          onClick={() =>
                            setAddVaccFiles(prev => prev.filter(x => x.id !== v.id))
                          }
                        >
                          <IoTrashOutline size={18} color="#ff4444" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {addErrors.birthdayAge && (
                <div className="error-message text-center">{addErrors.birthdayAge}</div>
              )}

              <button className="submit-btn" onClick={handleAddPet} disabled={isSaving}>
                {isSaving ? 'Adding Pet…' : 'Add Pet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          EDIT PET MODAL
      ════════════════════════════════════════════ */}
      {editModalOpen && (
        <div className="modal-overlay" onClick={() => setEditModalOpen(false)}>
          <div className="modal-content wide" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Pet Information 🐈</h2>
              <button className="modal-close-btn" onClick={() => setEditModalOpen(false)}>
                <IoClose size={24} color="#666" />
              </button>
            </div>

            <div className="modal-body">

              <label className="form-label">Pet Picture</label>
              <button
                className="image-upload-btn"
                onClick={() =>
                  pickFile('image/*', (base64, mime) =>
                    setEditImage({ preview: `data:${mime};base64,${base64}`, base64, mime })
                  )
                }
              >
                {editImage?.preview
                  ? <img src={editImage.preview} alt="Pet" className="upload-preview-img" />
                  : (
                    <div className="upload-placeholder">
                      <IoCameraOutline size={40} color="#3d67ee" />
                      <p>Upload Pet Photo</p>
                    </div>
                  )}
              </button>

              <label className="form-label">Pet Name</label>
              <input
                type="text" className="form-input" maxLength={50}
                value={editPet.pet_name ?? ''}
                onChange={e => setEditPet(p => ({ ...p, pet_name: e.target.value }))}
              />

              <label className="form-label">Breed</label>
              <input
                type="text" className="form-input"
                value={editPet.pet_breed ?? ''}
                onChange={e => setEditPet(p => ({ ...p, pet_breed: e.target.value }))}
              />

              <label className="form-label">Breed Size</label>
              <div className="size-selector">
                {(['Small', 'Medium', 'Large'] as const).map(s => (
                  <button
                    key={s}
                    className={`size-btn ${editPet.pet_size === s ? 'selected' : ''}`}
                    onClick={() => setEditPet(p => ({ ...p, pet_size: s }))}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <label className="form-label">Birthday</label>
              <input
                type="text" className="form-input" placeholder="YYYY-MM-DD"
                value={editPet.birthday ?? ''}
                onChange={e =>
                  setEditPet(p => ({ ...p, birthday: formatDateInput(e.target.value) }))
                }
              />

              <label className="form-label">Age (years)</label>
              <input
                type="text" className="form-input" placeholder="e.g. 3" maxLength={2}
                value={editPet.age ?? ''}
                onChange={e =>
                  setEditPet(p => ({ ...p, age: e.target.value.replace(/\D/g, '') }))
                }
              />

              <label className="form-label">Weight (kg)</label>
              <div className="input-with-unit">
                <input
                  type="text" className="form-input" placeholder="e.g. 5.5"
                  value={editPet.weight_kg ?? ''}
                  onChange={e =>
                    setEditPet(p => ({ ...p, weight_kg: e.target.value.replace(/[^0-9.]/g, '') }))
                  }
                />
                <span className="unit-label">kg</span>
              </div>

              <label className="form-label">Gender</label>
              <select
                className="form-select"
                value={editPet.pet_gender ?? 'Male'}
                onChange={e => setEditPet(p => ({ ...p, pet_gender: e.target.value }))}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>

              <div className="modal-actions-row">
                <button className="btn-secondary" onClick={() => setEditModalOpen(false)}>
                  Cancel
                </button>
                <button className="btn-primary" onClick={handleSavePet} disabled={isSaving}>
                  {isSaving ? 'Saving…' : 'Save Changes'}
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