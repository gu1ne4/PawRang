import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiService } from '../apiService';
import profileHeader from '../assets/ProfileHeader.png';
import petsPeeking from '../assets/PetsPeeking.png';
import ClientNavBar from '../reusable_components/ClientNavBar';
import { formatPetAge } from '../utils/formatPetAge';
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
  weight_kg: string;
  pet_photo_url: string | null;
  is_vaccinated?: boolean | null;
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

type PetModalLayer = 'pet' | 'add' | 'edit';

type VaccinationUploadContext =
  | { source: 'add-form' }
  | { source: 'existing-pet'; pet: Pet };

interface PetProfileLocationState {
  returnToBooking?: boolean;
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

const isMobileViewport = () =>
  typeof window !== 'undefined' && window.innerWidth <= 768;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

const formatDate = (s: string) =>
  new Date(s).toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
  });

const parseBirthdayDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const calculateAgeYearsFromBirthday = (value?: string | null) => {
  const birthday = parseBirthdayDate(value);
  if (!birthday) return '';

  const today = new Date();
  let years = today.getFullYear() - birthday.getFullYear();
  const beforeBirthday =
    today.getMonth() < birthday.getMonth() ||
    (today.getMonth() === birthday.getMonth() && today.getDate() < birthday.getDate());

  if (beforeBirthday) years -= 1;
  return String(Math.max(years, 0));
};

const getAgeDisplayValue = (birthday?: string | null, rawAge?: string | null, isUnknown = false) => {
  if (isUnknown) return 'Unknown';
  if (birthday) return formatPetAge(calculateAgeYearsFromBirthday(birthday), birthday);
  if (rawAge) return formatPetAge(rawAge, null);
  return '';
};

const getVaccinationDisplay = (value?: boolean | null, urls?: string[] | null) => {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  return (urls?.length ?? 0) > 0 ? 'Yes' : 'Not specified';
};

const isPetMarkedVaccinated = (pet?: Partial<Pet> | null) =>
  Boolean(pet?.is_vaccinated || ((pet?.vaccination_urls?.length ?? 0) > 0));

const VACCINATION_ACKNOWLEDGEMENT =
  'I understand that adding a vaccination record means this pet should be treated as vaccinated.';

const getPetApiErrorMessage = (error: any, fallback: string) => {
  const rawMessage = String(
    error?.response?.data?.error ??
    error?.data?.error ??
    error?.message ??
    ''
  ).trim();
  const normalizedMessage = rawMessage.toLowerCase();

  if (!rawMessage) return fallback;
  if (normalizedMessage === 'method not allowed' || error?.status === 405) {
    return 'This pet profile action is not available right now. Please refresh the page and try again.';
  }
  if (normalizedMessage.includes('failed to fetch')) {
    return 'We could not reach the pet profile service. Please check the connection and try again.';
  }

  return rawMessage;
};

const getUploadedFileName = (url: string, fallback: string) => {
  try {
    const rawName = new URL(url).pathname.split('/').pop() || fallback;
    return decodeURIComponent(rawName).replace(/\+/g, ' ');
  } catch {
    const rawName = url.split('/').pop() || fallback;
    return decodeURIComponent(rawName).replace(/\+/g, ' ');
  }
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

// ─── Component ────────────────────────────────────────────────────────────────

const UserPetProfile: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

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

  // ── Pet list ──────────────────────────────────────────────────────────────
  const [pets, setPets]               = useState<Pet[]>([]);
  const [loadingPets, setLoadingPets] = useState(false);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  // ── Only profile and records tabs (appointments tab removed) ──────────────
  const [activeTab, setActiveTab]     = useState<'profile' | 'records'>('profile');
  const [isMobileView, setIsMobileView] = useState(isMobileViewport);
  const [mobilePetModalOpen, setMobilePetModalOpen] = useState(false);
  const [alertRestoreModal, setAlertRestoreModal] = useState<PetModalLayer | null>(null);

  // ── Add modal ─────────────────────────────────────────────────────────────
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    petName:       '',
    petType:       'Dog' as 'Dog' | 'Cat',
    breed:         '',
    customBreed:   '',
    breedSize:     'Medium' as 'Small' | 'Medium' | 'Large',
    birthday:      '',
    age:           '',
    ageUnknown:    false,
    weight:        '',
    weightUnknown: false,
    gender:        'Male' as 'Male' | 'Female',
    isVaccinated:  null as boolean | null,
  });
  const [addImage, setAddImage] =
    useState<{ preview: string; base64: string; mime: string } | null>(null);
  const [addVaccFiles, setAddVaccFiles] =
    useState<{ id: string; name: string; base64: string; mime: string }[]>([]);
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});
  const [vaccinationActionPetId, setVaccinationActionPetId] = useState<number | null>(null);
  const [vaccinationConfirmContext, setVaccinationConfirmContext] = useState<VaccinationUploadContext | null>(null);
  const [vaccinationConfirmChecked, setVaccinationConfirmChecked] = useState(false);

  // ── Edit modal ────────────────────────────────────────────────────────────
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editPet, setEditPet]             = useState<Partial<Pet>>({});
  const [editImage, setEditImage] =
    useState<{ preview: string; base64: string | null; mime: string } | null>(null);
  const [editParentModal, setEditParentModal] = useState<PetModalLayer | null>(null);

  // ── Shared UI ─────────────────────────────────────────────────────────────
  const [isSaving,     setIsSaving]     = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig,  setAlertConfig]  = useState<AlertConfig>(DEFAULT_ALERT);

  // ─────────────────────────────────────────────────────────────────────────
  // Alert
  // ─────────────────────────────────────────────────────────────────────────

  const setPetModalVisible = useCallback((modal: PetModalLayer, visible: boolean) => {
    if (modal === 'pet') setMobilePetModalOpen(visible);
    if (modal === 'add') setAddModalOpen(visible);
    if (modal === 'edit') setEditModalOpen(visible);
  }, []);

  const restorePetModal = useCallback((modal: PetModalLayer | null) => {
    if (!modal) return;
    if (modal === 'pet' && selectedPet && isMobileView) setMobilePetModalOpen(true);
    if (modal === 'add') setAddModalOpen(true);
    if (modal === 'edit' && editPet.pet_id) setEditModalOpen(true);
  }, [editPet.pet_id, isMobileView, selectedPet]);

  const getActivePetModal = useCallback((): PetModalLayer | null => {
    if (editModalOpen) return 'edit';
    if (addModalOpen) return 'add';
    if (mobilePetModalOpen) return 'pet';
    return null;
  }, [addModalOpen, editModalOpen, mobilePetModalOpen]);

  const showAlert = useCallback((
    type: AlertConfig['type'],
    title: string,
    message: string | React.ReactNode,
    onConfirm: (() => void) | null = null,
    showCancel = false,
    confirmText = 'OK',
    options?: {
      hideModal?: PetModalLayer | null;
      restoreModal?: PetModalLayer | null;
    },
  ) => {
    const modalToHide = options?.hideModal === undefined
      ? getActivePetModal()
      : options.hideModal;
    const modalToRestore = options?.restoreModal === undefined
      ? modalToHide
      : options.restoreModal;

    if (modalToHide) setPetModalVisible(modalToHide, false);
    setAlertRestoreModal(modalToRestore ?? null);
    setAlertConfig({ type, title, message, onConfirm, showCancel, confirmText });
    setAlertVisible(true);
  }, [getActivePetModal, setPetModalVisible]);

  const closeAlert = useCallback((restoreParent = true) => {
    setAlertVisible(false);
    const modalToRestore = alertRestoreModal;
    setAlertRestoreModal(null);
    if (restoreParent) restorePetModal(modalToRestore);
  }, [alertRestoreModal, restorePetModal]);

  // ─────────────────────────────────────────────────────────────────────────
  // API helpers
  // ─────────────────────────────────────────────────────────────────────────

  const fetchPets = useCallback(async (userId: string): Promise<Pet[]> => {
    setLoadingPets(true);
    try {
      const res = await apiService.getUserPets(userId);
      const list: Pet[] = res.pets ?? [];
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
    const res = await apiService.uploadPetPhoto(base64, fileName, mime);
    return res.photoUrl as string;
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Effects
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (currentUser?.id) fetchPets(currentUser.id);
  }, [currentUser?.id, fetchPets]);

  useEffect(() => {
    const handleResize = () => setIsMobileView(isMobileViewport());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isMobileView) setMobilePetModalOpen(false);
  }, [isMobileView]);

  useEffect(() => {
    if (!isMobileView) {
      setEditParentModal(null);
      setAlertRestoreModal(null);
    }
  }, [isMobileView]);

  // ─────────────────────────────────────────────────────────────────────────
  // Add pet
  // ─────────────────────────────────────────────────────────────────────────

  const handleAddBirthdayChange = (birthday: string) => {
    setAddForm(f => ({
      ...f,
      birthday,
      age: calculateAgeYearsFromBirthday(birthday),
    }));
  };

  const getResolvedBreed = () => (
    addForm.breed === 'Other' ? addForm.customBreed.trim() : addForm.breed
  );

  const handleAddBirthdayUnknownToggle = () => {
    setAddForm(f => ({
      ...f,
      ageUnknown: !f.ageUnknown,
      birthday: '',
      age: '',
    }));
  };

  const handleEditBirthdayChange = (birthday: string) => {
    setEditPet(p => ({
      ...p,
      birthday,
      age: calculateAgeYearsFromBirthday(birthday),
    }));
  };

  const validateAddForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (addForm.petName.trim().length < 2)
      errors.petName = 'Name must be at least 2 characters';
    if (!addForm.breed)
      errors.breed = 'Please select a breed';
    if (addForm.breed === 'Other' && addForm.customBreed.trim().length < 2)
      errors.customBreed = 'Please enter the breed name';
    if (!addForm.ageUnknown && !addForm.birthday)
      errors.birthday = 'Please select the pet birthday or mark it as unknown';
    if (addForm.birthday) {
      const birthday = parseBirthdayDate(addForm.birthday);
      if (!birthday) {
        errors.birthday = 'Please enter a valid birthday';
      } else if (birthday > new Date()) {
        errors.birthday = 'Birthday cannot be in the future';
      }
    }
    if (!addForm.weight && !addForm.weightUnknown)
      errors.weight = 'Provide weight or check unknown';
    if (addForm.isVaccinated === null)
      errors.isVaccinated = 'Please choose whether your pet is vaccinated';
    if (addForm.isVaccinated === false && addVaccFiles.length > 0)
      errors.isVaccinated = 'Adding a vaccination record means the pet should be marked as vaccinated';
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

      const addRes = await apiService.addPet({
        owner_id:         currentUser.id,
        pet_name:         addForm.petName,
        pet_type:         addForm.petType,
        breed:            getResolvedBreed(),
        pet_size:         addForm.breedSize,
        gender:           addForm.gender,
        birthday:         addForm.birthday || undefined,
        age:              addForm.ageUnknown ? undefined : calculateAgeYearsFromBirthday(addForm.birthday) || undefined,
        weight_kg:        addForm.weightUnknown ? undefined : addForm.weight || undefined,
        pet_photo_url:    photoUrl,
        is_vaccinated:    addForm.isVaccinated ?? false,
        vaccination_urls: vaccUrls.length ? vaccUrls : undefined,
      });

      const refreshedPets = await fetchPets(currentUser.id);
      const locationState = location.state as PetProfileLocationState | null;
      const createdPetId = Number(addRes?.pet_id ?? addRes?.id ?? addRes?.pet?.pet_id ?? 0);
      const createdPet = refreshedPets.find(pet => pet.pet_id === createdPetId)
        ?? refreshedPets[refreshedPets.length - 1];

      setAddModalOpen(false);
      resetAddForm();

      if (locationState?.returnToBooking && createdPet) {
        navigate('/user/book-appointment', {
          state: {
            returnFromPetCreate: true,
            newPetId: createdPet.pet_id,
          },
        });
        return;
      }

      showAlert('success', 'Pet Added!', `${addForm.petName} has been added to your profile.`);
    } catch (err: any) {
      console.error('handleAddPet error:', err);
      showAlert(
        'error',
        'Unable to Add Pet',
        getPetApiErrorMessage(err, 'Failed to add pet. Please try again.')
      );
    } finally {
      setIsSaving(false);
    }
  };

  const resetAddForm = () => {
    setAddForm({
      petName: '', petType: 'Dog', breed: '', customBreed: '', breedSize: 'Medium',
      birthday: '', age: '', ageUnknown: false,
      weight: '', weightUnknown: false, gender: 'Male', isVaccinated: null,
    });
    setAddImage(null);
    setAddVaccFiles([]);
    setAddErrors({});
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Edit pet
  // ─────────────────────────────────────────────────────────────────────────

  const openEditModal = (pet: Pet) => {
    setEditPet({
      ...pet,
      age: pet.birthday ? calculateAgeYearsFromBirthday(pet.birthday) : pet.age,
      is_vaccinated: pet.is_vaccinated ?? ((pet.vaccination_urls?.length ?? 0) > 0),
    });
    setEditImage({ preview: pet.pet_photo_url ?? DEFAULT_PET_IMG, base64: null, mime: 'image/jpeg' });
    if (mobilePetModalOpen && isMobileView) {
      setMobilePetModalOpen(false);
      setEditParentModal('pet');
    } else {
      setEditParentModal(null);
    }
    setEditModalOpen(true);
  };

  const closeEditModal = (restoreParent = true) => {
    setEditModalOpen(false);

    if (restoreParent && editParentModal === 'pet' && selectedPet && isMobileView) {
      setMobilePetModalOpen(true);
    }

    setEditParentModal(null);
  };

  const handleSavePet = async () => {
    if (!editPet.pet_id || !currentUser?.id) return;
    if (editPet.is_vaccinated === false && (editPet.vaccination_urls?.length ?? 0) > 0) {
      showAlert(
        'error',
        'Vaccination Status Mismatch',
        'This pet already has vaccination records. Remove those records first or keep the pet marked as vaccinated.',
      );
      return;
    }
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

      await apiService.updatePet(editPet.pet_id, {
        pet_name:      editPet.pet_name,
        pet_species:   editPet.pet_species,
        pet_breed:     editPet.pet_breed,
        pet_gender:    editPet.pet_gender,
        pet_size:      editPet.pet_size,
        birthday:      editPet.birthday  ?? undefined,
        age:           editPet.birthday ? calculateAgeYearsFromBirthday(editPet.birthday) : editPet.age ?? undefined,
        weight_kg:     editPet.weight_kg ?? undefined,
        is_vaccinated: editPet.is_vaccinated ?? undefined,
        pet_photo_url: photoUrl          ?? undefined,
      });

      const freshPets = await fetchPets(currentUser.id);
      const updated   = freshPets.find(p => p.pet_id === editPet.pet_id);
      if (updated) setSelectedPet(updated);

      const restoreModal = editParentModal === 'pet' ? 'pet' : null;
      setEditModalOpen(false);
      setEditParentModal(null);
      showAlert(
        'success',
        'Saved!',
        'Pet profile updated successfully.',
        null,
        false,
        'OK',
        { restoreModal },
      );
    } catch (err: any) {
      console.error('handleSavePet error:', err);
      showAlert(
        'error',
        'Unable to Save Pet',
        getPetApiErrorMessage(err, 'Failed to save changes.')
      );
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
          await apiService.deletePet(pet.pet_id);
          if (currentUser?.id) await fetchPets(currentUser.id);
          if (selectedPet?.pet_id === pet.pet_id) {
            setSelectedPet(null);
            setMobilePetModalOpen(false);
          }
          showAlert(
            'success',
            'Deleted',
            `${pet.pet_name}'s profile has been removed.`,
            null,
            false,
            'OK',
            { restoreModal: null },
          );
        } catch (err: any) {
          showAlert(
            'error',
            'Unable to Delete Pet',
            getPetApiErrorMessage(err, 'Failed to delete pet.'),
            null,
            false,
            'OK',
            { restoreModal: 'pet' },
          );
        }
      },
      true, 'Delete',
    );
  };

  const syncSelectedPet = useCallback((freshPets: Pet[], petId: number) => {
    const updatedPet = freshPets.find(candidate => candidate.pet_id === petId) ?? null;
    if (selectedPet?.pet_id === petId) {
      setSelectedPet(updatedPet);
    }
    return updatedPet;
  }, [selectedPet?.pet_id]);

  const closeVaccinationConfirm = () => {
    setVaccinationConfirmContext(null);
    setVaccinationConfirmChecked(false);
  };

  const launchVaccinationUploadForAddForm = () => {
    pickFile('.pdf,image/*', (base64, mime, name) => {
      setAddVaccFiles(prev => [
        ...prev,
        { id: Date.now().toString(), name, base64, mime },
      ]);
      setAddForm(prev => ({ ...prev, isVaccinated: true }));
      setAddErrors(prev => ({ ...prev, isVaccinated: undefined }));
    });
  };

  const launchVaccinationUploadForPet = (pet: Pet) => {
    pickFile('.pdf,image/*', async (base64, mime, name) => {
      setVaccinationActionPetId(pet.pet_id);
      try {
        const uploadedUrl = await uploadFile(base64, name, mime);
        const updatedVaccinationUrls = [...(pet.vaccination_urls ?? []), uploadedUrl];

        await apiService.updatePet(pet.pet_id, {
          vaccination_urls: updatedVaccinationUrls,
          is_vaccinated: true,
        });

        const freshPets = await fetchPets(currentUser!.id);
        syncSelectedPet(freshPets, pet.pet_id);

        showAlert(
          'success',
          'Vaccination Added',
          `${name} has been added to ${pet.pet_name}'s vaccination records.`,
        );
      } catch (err: any) {
        console.error('handleAddVaccinationRecord error:', err);
        showAlert(
          'error',
          'Unable to Add Vaccination',
          getPetApiErrorMessage(err, 'Failed to upload the vaccination record.'),
        );
      } finally {
        setVaccinationActionPetId(null);
      }
    });
  };

  const handleConfirmVaccinationUpload = () => {
    if (!vaccinationConfirmChecked || !vaccinationConfirmContext) return;

    const context = vaccinationConfirmContext;
    closeVaccinationConfirm();

    if (context.source === 'add-form') {
      launchVaccinationUploadForAddForm();
      return;
    }

    launchVaccinationUploadForPet(context.pet);
  };

  const handleAddVaccinationRecord = (pet: Pet) => {
    if (!currentUser?.id) {
      showAlert('error', 'Not logged in', 'Could not find your user session.');
      return;
    }

    if (!isPetMarkedVaccinated(pet)) {
      setVaccinationConfirmChecked(false);
      setVaccinationConfirmContext({ source: 'existing-pet', pet });
      return;
    }

    launchVaccinationUploadForPet(pet);
  };

  const handleDeleteVaccinationRecord = (pet: Pet, url: string, fileName: string) => {
    showAlert(
      'confirm',
      'Remove Vaccination Record',
      `Are you sure you want to remove ${fileName} from ${pet.pet_name}'s vaccination records?`,
      async () => {
        if (!currentUser?.id) {
          showAlert('error', 'Not logged in', 'Could not find your user session.');
          return;
        }

        setVaccinationActionPetId(pet.pet_id);
        try {
          await apiService.updatePet(pet.pet_id, {
            vaccination_urls: (pet.vaccination_urls ?? []).filter(recordUrl => recordUrl !== url),
          });

          const freshPets = await fetchPets(currentUser.id);
          syncSelectedPet(freshPets, pet.pet_id);

          showAlert(
            'success',
            'Vaccination Removed',
            `${fileName} has been removed from ${pet.pet_name}'s vaccination records.`,
          );
        } catch (err: any) {
          console.error('handleDeleteVaccinationRecord error:', err);
          showAlert(
            'error',
            'Unable to Remove Vaccination',
            getPetApiErrorMessage(err, 'Failed to remove the vaccination record.'),
          );
        } finally {
          setVaccinationActionPetId(null);
        }
      },
      true,
      'Remove',
    );
  };

  const renderVaccinationRecords = (pet: Pet) => {
    const isVaccinationBusy = vaccinationActionPetId === pet.pet_id;

    return (
      <div className="vaccinations-section" style={{ marginTop: 25 }}>
        <div className="section-header vaccinations-header">
          <div className="vaccination-section-title">
            <IoMedicalOutline size={22} color="#3d67ee" />
            <h4>Vaccination Records</h4>
          </div>
          <button
            type="button"
            className="add-vaccine-btn"
            onClick={() => handleAddVaccinationRecord(pet)}
            disabled={isVaccinationBusy}
          >
            <IoAdd size={14} />
            <span>{isVaccinationBusy ? 'Adding...' : 'Add'}</span>
          </button>
        </div>
        {pet.vaccination_urls?.length ? (
          <div className="vaccinations-list">
            {pet.vaccination_urls.map((url, i) => {
              const fileName = getUploadedFileName(url, `Vaccination ${i + 1}`);

              return (
                <div key={`${url}-${i}`} className="vaccination-card">
                  <div className="vaccination-header">
                    <div>
                      <div className="vaccination-title">
                        <IoMedical size={20} color="#3d67ee" />
                        <span>Vaccination</span>
                      </div>
                      <p className="vaccination-name">{fileName}</p>
                    </div>
                    <div className="vaccination-actions">
                      <button
                        type="button"
                        className="delete-vaccine-btn"
                        onClick={() => handleDeleteVaccinationRecord(pet, url, fileName)}
                        aria-label={`Remove ${fileName}`}
                      >
                        <IoTrashOutline size={18} color="#ff6b6b" />
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="view-doc-btn"
                    onClick={() => window.open(url, '_blank')}
                  >
                    <IoEyeOutline size={18} />
                    <span>View Document</span>
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ color: '#999', fontSize: 14, fontStyle: 'italic' }}>
            {isPetMarkedVaccinated(pet)
              ? 'No vaccination records uploaded yet. Use the cute add button to upload one.'
              : 'This pet is currently marked as not vaccinated. Uploading a vaccination record will ask for confirmation and mark the pet as vaccinated.'}
          </p>
        )}
      </div>
    );
  };

  const handlePetSelect = (pet: Pet) => {
    setSelectedPet(pet);
    setActiveTab('profile');

    if (isMobileView) {
      setMobilePetModalOpen(true);
    }
  };

  const renderPetDetails = (pet: Pet, isModal = false) => (
    <div className={`pet-details-content${isModal ? ' pet-details-content-modal' : ''}`}>
      <div className="pet-profile-header">
        <img src={profileHeader} alt="Header" className="profile-header-bg" />
        <div className="profile-header-overlay">
          <div className="profile-picture-wrapper">
            <img
              src={pet.pet_photo_url ?? DEFAULT_PET_IMG}
              alt={pet.pet_name}
              className="profile-picture"
            />
          </div>
          <div className="profile-header-info">
            <h1>{pet.pet_name}</h1>
            <div className="profile-header-meta">
              <span>@{pet.pet_name.toLowerCase()}</span>
              <span>•</span>
              <span>{pet.pet_breed}</span>
            </div>
            <p>Added {formatDate(pet.created_at)}</p>
          </div>
        </div>
        <button className="edit-profile-btn" onClick={() => openEditModal(pet)}>
          <IoPencil size={15} color="#ffffff" />
        </button>
      </div>

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

      {activeTab === 'profile' && (
        <div className="profile-tab-content">
          <div className="info-section">
            <div className="section-header">
              <IoInformationCircleOutline size={25} color="#3d67ee" />
              <h3>Pet Information</h3>
            </div>
            <div className="info-grid">
              {([
                ['Name',     pet.pet_name],
                ['Species',  pet.pet_species],
                ['Gender',   pet.pet_gender],
                ['Breed',    pet.pet_breed],
                ['Size',     pet.pet_size],
                ['Birthday', pet.birthday ? formatDate(pet.birthday) : 'Unknown'],
                ['Age',      formatPetAge(pet.age, pet.birthday)],
                ['Weight',   pet.weight_kg ? `${pet.weight_kg} kg` : 'Unknown'],
                ['Vaccinated', getVaccinationDisplay(pet.is_vaccinated, pet.vaccination_urls)],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label} className="info-row">
                  <span className="info-label">{label}:</span>
                  <span className="info-value">{value}</span>
                </div>
              ))}
            </div>

            {renderVaccinationRecords(pet)}

            <div style={{ marginTop: 30, paddingTop: 20, borderTop: '1px solid #ffcccc', display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={() => handleDeletePet(pet)}
                style={{
                  background: '#ffeeee',
                  border: '1px solid #ee3d5a',
                  borderRadius: 8,
                  padding: '10px 20px',
                  color: '#ee3d5a',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <IoTrashOutline size={18} /> Remove Pet Profile
              </button>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="user-container">

      {/* ── Alert Modal ── */}
      {alertVisible && (
        <div className="modal-overlay" onClick={() => closeAlert()}>
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
                <button className="modal-btn modal-btn-cancel" onClick={() => closeAlert()}>Cancel</button>
              )}
              <button
                className={`modal-btn modal-btn-confirm ${alertConfig.type === 'error' ? 'error-btn' : ''}`}
                onClick={() => {
                  const hasConfirmAction = Boolean(alertConfig.onConfirm);
                  closeAlert(!hasConfirmAction);
                  alertConfig.onConfirm?.();
                }}
              >
                {alertConfig.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {vaccinationConfirmContext && (
        <div className="modal-overlay" onClick={closeVaccinationConfirm}>
          <div
            className="modal-content vaccination-confirm-modal"
            onClick={e => e.stopPropagation()}
          >
            <div className="vaccination-confirm-icon">
              <IoMedicalOutline size={34} color="#3d67ee" />
            </div>
            <h3 className="modal-title">Confirm Vaccination Update</h3>
            <p className="modal-message">
              This pet is currently marked as not vaccinated. Adding a vaccination
              record means the pet should now be treated as vaccinated.
            </p>

            <div className="vaccination-confirm-note">
              <IoInformationCircleOutline size={18} color="#3d67ee" />
              <span>
                We will keep the uploaded proof and automatically mark this pet as
                vaccinated after you continue.
              </span>
            </div>

            <label className="vaccination-confirm-checkbox">
              <input
                type="checkbox"
                checked={vaccinationConfirmChecked}
                onChange={e => setVaccinationConfirmChecked(e.target.checked)}
              />
              <span>{VACCINATION_ACKNOWLEDGEMENT}</span>
            </label>

            <div className="modal-actions vaccination-confirm-actions">
              <button
                className="modal-btn modal-btn-cancel"
                onClick={closeVaccinationConfirm}
              >
                Cancel
              </button>
              <button
                className="modal-btn modal-btn-confirm"
                onClick={handleConfirmVaccinationUpload}
                disabled={!vaccinationConfirmChecked}
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}

      <ClientNavBar
        currentUser={currentUser}
        onLogout={() => {
          localStorage.removeItem('userSession');
          localStorage.removeItem('access_token');
          navigate('/login');
        }}
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
                  onClick={() => handlePetSelect(pet)}
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
                        ['Gender',   selectedPet.pet_gender],
                        ['Breed',    selectedPet.pet_breed],
                        ['Size',     selectedPet.pet_size],
                        ['Birthday', selectedPet.birthday ? formatDate(selectedPet.birthday) : 'Unknown'],
                        ['Age',      formatPetAge(selectedPet.age, selectedPet.birthday)],
                        ['Weight',   selectedPet.weight_kg ? `${selectedPet.weight_kg} kg`    : 'Unknown'],
                      ] as [string, string][]).map(([label, value]) => (
                        <div key={label} className="info-row">
                          <span className="info-label">{label}:</span>
                          <span className="info-value">{value}</span>
                        </div>
                      ))}
                    </div>

                    {/* Vaccination records */}
                    {renderVaccinationRecords(selectedPet)}

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
      {mobilePetModalOpen && selectedPet && (
        <div className="modal-overlay pet-profile-modal-overlay" onClick={() => setMobilePetModalOpen(false)}>
          <div className="modal-content wide pet-profile-view-modal" onClick={e => e.stopPropagation()}>
            <div className="pet-profile-modal-scroll">
              {renderPetDetails(selectedPet, true)}
            </div>
            <button
              className="modal-close-btn pet-profile-view-close"
              onClick={() => setMobilePetModalOpen(false)}
            >
              <IoClose size={24} color="#666" />
            </button>
          </div>
        </div>
      )}

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
                    onClick={() => setAddForm(f => ({
                      ...f,
                      petType: type,
                      breed: '',
                      customBreed: '',
                    }))}
                  >
                    {type === 'Dog' ? <IoPaw size={18} /> : <IoHappy size={18} />}
                    <span>{type}</span>
                  </button>
                ))}
              </div>

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

              {/* Breed */}
              <label className="form-label">Breed</label>
              <select
                className={`form-select ${addErrors.breed ? 'error' : ''}`}
                value={addForm.breed}
                onChange={e => setAddForm(f => ({
                  ...f,
                  breed: e.target.value,
                  customBreed: e.target.value === 'Other' ? f.customBreed : '',
                }))}
              >
                <option value="">Select breed</option>
                {(addForm.petType === 'Dog' ? DOG_BREEDS : CAT_BREEDS).map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
              {addErrors.breed && <span className="error-message">{addErrors.breed}</span>}

              {addForm.breed === 'Other' && (
                <>
                  <label className="form-label">Specify Breed</label>
                  <div className="input-with-counter">
                    <input
                      type="text"
                      className={`form-input ${addErrors.customBreed ? 'error' : ''}`}
                      placeholder="Enter the breed name"
                      value={addForm.customBreed}
                      maxLength={60}
                      onChange={e => setAddForm(f => ({ ...f, customBreed: e.target.value }))}
                    />
                    <span className="char-counter">{addForm.customBreed.length}/60</span>
                  </div>
                  {addErrors.customBreed && <span className="error-message">{addErrors.customBreed}</span>}
                </>
              )}

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
                  type="date"
                  className={`form-input ${addErrors.birthday ? 'error' : ''}`}
                  value={addForm.ageUnknown ? '' : addForm.birthday}
                  disabled={addForm.ageUnknown}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={e => handleAddBirthdayChange(e.target.value)}
                />
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={addForm.ageUnknown}
                    onChange={handleAddBirthdayUnknownToggle}
                  />
                  <span>Unknown</span>
                </label>
              </div>
              {addErrors.birthday && <span className="error-message">{addErrors.birthday}</span>}

              {/* Age */}
              <label className="form-label">Age</label>
              <div className="input-with-unit">
                <input
                  type="text"
                  className="form-input"
                  placeholder={addForm.ageUnknown ? 'Unknown' : 'Select birthday first'}
                  value={getAgeDisplayValue(addForm.birthday, addForm.age, addForm.ageUnknown)}
                  readOnly
                />
              </div>
              <p style={{ marginTop: -8, marginBottom: 15, color: '#777', fontSize: 12 }}>
                Age is calculated automatically from the pet birthday.
              </p>

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

              <label className="form-label">Is your pet vaccinated?</label>
              <div className="size-selector vaccination-choice-selector">
                {[
                  { label: 'Yes', value: true },
                  { label: 'No', value: false },
                ].map(option => (
                  <button
                    key={option.label}
                    type="button"
                    className={`size-btn ${addForm.isVaccinated === option.value ? 'selected' : ''}`}
                    onClick={() => {
                      setAddForm(f => ({ ...f, isVaccinated: option.value }));
                      setAddErrors(prev => ({ ...prev, isVaccinated: undefined }));
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {addErrors.isVaccinated && <span className="error-message">{addErrors.isVaccinated}</span>}

              {/* Vaccination upload */}
              <label className="form-label">Vaccination Records</label>
              <button
                className="upload-area-btn"
                onClick={() => {
                  if (addForm.isVaccinated === false) {
                    setVaccinationConfirmChecked(false);
                    setVaccinationConfirmContext({ source: 'add-form' });
                    return;
                  }

                  launchVaccinationUploadForAddForm();
                }}
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
        <div className="modal-overlay" onClick={() => closeEditModal()}>
          <div className="modal-content wide" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Pet Information 🐈</h2>
              <button className="modal-close-btn" onClick={() => closeEditModal()}>
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
                type="date" className="form-input"
                value={editPet.birthday ?? ''}
                max={new Date().toISOString().split('T')[0]}
                onChange={e => handleEditBirthdayChange(e.target.value)}
              />

              <label className="form-label">Age</label>
              <input
                type="text"
                className="form-input"
                value={getAgeDisplayValue(editPet.birthday, editPet.age)}
                placeholder="Select birthday first"
                readOnly
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

              <label className="form-label">Is your pet vaccinated?</label>
              <div className="size-selector vaccination-choice-selector">
                {[
                  { label: 'Yes', value: true },
                  { label: 'No', value: false },
                ].map(option => (
                  <button
                    key={option.label}
                    type="button"
                    className={`size-btn ${editPet.is_vaccinated === option.value ? 'selected' : ''}`}
                    onClick={() => setEditPet(p => ({ ...p, is_vaccinated: option.value }))}
                  >
                    {option.label}
                  </button>
                ))}
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
                <button className="btn-secondary" onClick={() => closeEditModal()}>
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
