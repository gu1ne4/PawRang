import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import profileHeader from '../assets/ProfileHeader.png';
import { apiService } from '../apiService';
import ClientNavBar from '../reusable_components/ClientNavBar';
import { 
  IoPersonOutline,
  IoMailOutline,
  IoPencil,
  IoCheckmarkCircle,
  IoClose,
  IoCameraOutline,
  IoPaw,
  IoCalendarOutline,
  IoEyeOutline,
  IoEyeOffOutline,
  IoAdd,
  IoCheckmarkCircleOutline,
  IoAlertCircleOutline,
  IoCloseCircleOutline,
  IoInformationCircleOutline,
  IoCalendar,
  IoMedical,
  IoNotificationsOutline,
  IoArrowForwardOutline,
  IoMail,
  IoKeyOutline
} from 'react-icons/io5';
import './UserStyles3.css';

// Types
interface UserProfile {
  id?: string;
  username: string;
  firstName: string;
  lastName: string;
  fullname?: string;
  email: string;
  contactNumber: string;
  profileImage: string | null;
  dateJoined: string;
}

interface Pet {
  id: string;
  name: string;
  type: 'Dog' | 'Cat';
  breed: string;
  image: string | null;
  age: string;
  medicalRecords?: number;
  appointments?: number;
}

interface Appointment {
  id: string;
  petName: string;
  petImage: string | null;
  date: string;
  time: string;
  type: string;
  vet: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
}

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'info' | 'success' | 'warning' | 'reminder';
  read: boolean;
}

interface AlertConfig {
  type: 'info' | 'success' | 'error' | 'confirm';
  title: string;
  message: string;
  onConfirm: (() => void) | null;
  showCancel: boolean;
  confirmText: string;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  contactNumber?: string;
}

const DEFAULT_PROFILE_IMAGE = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400';
const DEFAULT_PET_IMAGE = 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400';
const PH_PHONE_TOTAL_DIGITS = 12;
const PH_PHONE_DISPLAY_MAX_LENGTH = 16;

const normalizePhilippinePhoneDigits = (value: string): string => {
  let digits = String(value || '').replace(/\D/g, '');

  if (!digits) return '';

  if (digits.startsWith('0')) {
    digits = `63${digits.slice(1)}`;
  } else if (digits.startsWith('9')) {
    digits = `63${digits}`;
  } else if (digits.startsWith('639')) {
    digits = digits;
  }

  if (digits.startsWith('63')) {
    return digits.slice(0, PH_PHONE_TOTAL_DIGITS);
  }

  return digits.slice(0, 10);
};

const formatPhoneNumber = (value: string): string => {
  const digits = normalizePhilippinePhoneDigits(value);

  if (!digits) return '+63 ';

  const localDigits = digits.startsWith('63') ? digits.slice(2) : digits;
  const parts = [
    localDigits.slice(0, 3),
    localDigits.slice(3, 6),
    localDigits.slice(6, 10),
  ].filter(Boolean);

  return `+63 ${parts.join(' ')}`.trim();
};

const toStoredPhoneNumber = (value: string): string => {
  const digits = normalizePhilippinePhoneDigits(value);
  return digits ? `+${digits}` : '';
};

const splitFullName = (fullName: string) => {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' '),
  };
};

const buildCharCountState = (profile: UserProfile) => ({
  firstName: profile.firstName.length,
  lastName: profile.lastName.length,
  username: profile.username.length,
  contactNumber: profile.contactNumber.length,
});

const normalizeProfileForComparison = (profile: UserProfile | null) => ({
  username: (profile?.username || '').trim(),
  firstName: (profile?.firstName || '').trim(),
  lastName: (profile?.lastName || '').trim(),
  contactNumber: normalizePhilippinePhoneDigits(profile?.contactNumber || ''),
  profileImage: profile?.profileImage || '',
});

const normalizeUserProfile = (raw: any): UserProfile => {
  const storedFullName = raw?.fullname || raw?.fullName || raw?.full_name || '';
  const splitName = splitFullName(storedFullName);
  const firstName = raw?.firstName || raw?.first_name || splitName.firstName;
  const lastName = raw?.lastName || raw?.last_name || splitName.lastName;
  const joinedDate = raw?.dateJoined || raw?.created_at || raw?.date_joined || '';
  const contactNumber = raw?.contactNumber || raw?.contact_number || raw?.contactnumber || '';

  return {
    id: raw?.id,
    username: raw?.username || '',
    firstName,
    lastName,
    fullname: `${firstName || ''} ${lastName || ''}`.trim() || storedFullName,
    email: raw?.email || '',
    contactNumber: contactNumber ? formatPhoneNumber(contactNumber) : '',
    profileImage: raw?.profileImage || raw?.userImage || raw?.userimage || raw?.user_image || null,
    dateJoined: joinedDate,
  };
};

const formatDisplayDate = (dateString: string): string => {
  if (!dateString) return 'Not provided';
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return 'Not provided';
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
  return parsed.toLocaleDateString(undefined, options);
};

const formatJoinedText = (dateString: string): string => {
  if (!dateString) return 'Joined recently';
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return 'Joined recently';
  return `Joined ${formatDisplayDate(dateString)}`;
};

const formatAppointmentTime = (timeValue: string): string => {
  if (!timeValue) return 'Time not set';
  const parts = String(timeValue).split(':');
  if (parts.length < 2) return String(timeValue);
  const hours = Number(parts[0]);
  const minutes = parts[1] ?? '00';
  if (Number.isNaN(hours)) return String(timeValue);
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${minutes} ${suffix}`;
};

const formatPetAge = (ageValue: any, birthday?: string): string => {
  const numericAge = Number(ageValue);
  if (!Number.isNaN(numericAge) && numericAge >= 0) {
    return `${numericAge} ${numericAge === 1 ? 'year' : 'years'}`;
  }

  if (!birthday) return 'Age unavailable';
  const birthdayDate = new Date(birthday);
  if (Number.isNaN(birthdayDate.getTime())) return 'Age unavailable';

  const today = new Date();
  let years = today.getFullYear() - birthdayDate.getFullYear();
  const hasBirthdayPassed =
    today.getMonth() > birthdayDate.getMonth() ||
    (today.getMonth() === birthdayDate.getMonth() && today.getDate() >= birthdayDate.getDate());

  if (!hasBirthdayPassed) years -= 1;
  return `${Math.max(years, 0)} ${Math.max(years, 0) === 1 ? 'year' : 'years'}`;
};

const normalizeAppointmentStatus = (status: string): Appointment['status'] => {
  const normalized = (status || '').toLowerCase();
  if (normalized === 'completed') return 'completed';
  if (normalized === 'cancelled') return 'cancelled';
  if (normalized === 'confirmed') return 'confirmed';
  return 'pending';
};

const mapAppointmentsToCards = (rawAppointments: any[]): Appointment[] =>
  (rawAppointments || []).map((appointment: any) => ({
    id: String(appointment?.appointment_id ?? appointment?.id ?? ''),
    petName: appointment?.petName || appointment?.pet_name || appointment?.pet_profile?.pet_name || 'Unknown Pet',
    petImage: appointment?.pet_photo_url || appointment?.petPhotoUrl || appointment?.pet_profile?.pet_photo_url || null,
    date: appointment?.appointment_date || appointment?.date || '',
    time: formatAppointmentTime(appointment?.appointment_time || appointment?.time || ''),
    type: appointment?.appointment_type || appointment?.type || appointment?.service || 'Appointment',
    vet: appointment?.doctor || appointment?.vet || 'PetShield Veterinarian',
    status: normalizeAppointmentStatus(appointment?.status || 'pending'),
  }));

const mapPetsToCards = (rawPets: any[], rawAppointments: any[]): Pet[] => {
  const appointmentsByPetId = (rawAppointments || []).reduce<Record<string, number>>((acc, appointment: any) => {
    const petId = String(appointment?.pet_id || appointment?.pet_profile?.pet_id || '');
    if (!petId) return acc;
    acc[petId] = (acc[petId] || 0) + 1;
    return acc;
  }, {});

  return (rawPets || []).map((pet: any) => {
    const petId = String(pet?.pet_id ?? pet?.id ?? '');
    const vaccinationRecords = Array.isArray(pet?.vaccination_urls) ? pet.vaccination_urls.length : 0;

    return {
      id: petId,
      name: pet?.pet_name || pet?.name || 'Unnamed Pet',
      type: pet?.pet_species || pet?.type || 'Pet',
      breed: pet?.pet_breed || pet?.breed || 'Breed not specified',
      image: pet?.pet_photo_url || pet?.image || null,
      age: formatPetAge(pet?.age, pet?.birthday),
      medicalRecords: vaccinationRecords,
      appointments: appointmentsByPetId[petId] || 0,
    };
  });
};

const UserProfile: React.FC = () => {
  const navigate = useNavigate();
  
  // Refs for scrollable containers
  const mainContentRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  
  // State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'pets' | 'appointments'>('profile');
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [customAlertVisible, setCustomAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    type: 'info',
    title: '',
    message: '',
    onConfirm: null,
    showCancel: false,
    confirmText: 'OK'
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Character counters
  const [charCounts, setCharCounts] = useState({
    firstName: 0,
    lastName: 0,
    username: 0,
    contactNumber: 0
  });

  // Form states
  const [editedProfile, setEditedProfile] = useState<UserProfile>({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    contactNumber: '+63 ',
    profileImage: null,
    dateJoined: ''
  });

  const currentProfileSnapshot = normalizeProfileForComparison(currentUser);
  const editedProfileSnapshot = normalizeProfileForComparison(editedProfile);
  const hasUnsavedProfileChanges =
    Boolean(currentUser) &&
    (
      currentProfileSnapshot.username !== editedProfileSnapshot.username ||
      currentProfileSnapshot.firstName !== editedProfileSnapshot.firstName ||
      currentProfileSnapshot.lastName !== editedProfileSnapshot.lastName ||
      currentProfileSnapshot.contactNumber !== editedProfileSnapshot.contactNumber ||
      currentProfileSnapshot.profileImage !== editedProfileSnapshot.profileImage
    );

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [emailData, setEmailData] = useState({
    newEmail: '',
    confirmEmail: '',
    otp: ''
  });

  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUploadingProfileImage, setIsUploadingProfileImage] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [emailErrors, setEmailErrors] = useState<Record<string, string>>({});

  const [pets, setPets] = useState<Pet[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: 'n1',
      title: 'Vaccination Reminder',
      message: 'Max is due for his rabies vaccination tomorrow',
      time: '2 hours ago',
      type: 'reminder',
      read: false
    },
    {
      id: 'n2',
      title: 'Appointment Confirmed',
      message: 'Your appointment with Dr. Smith on Mar 20 has been confirmed',
      time: '1 day ago',
      type: 'success',
      read: false
    },
    {
      id: 'n3',
      title: 'Medical Record Updated',
      message: 'New lab results have been added to Luna\'s record',
      time: '3 days ago',
      type: 'info',
      read: true
    },
    {
      id: 'n4',
      title: 'Payment Successful',
      message: 'Your payment for Charlie\'s check-up has been processed',
      time: '5 days ago',
      type: 'success',
      read: true
    },
    {
      id: 'n5',
      title: 'Appointment Reminder',
      message: 'Charlie has a check-up tomorrow at 11:30 AM',
      time: '6 hours ago',
      type: 'reminder',
      read: false
    }
  ]);

  // Load user session
  useEffect(() => {
    const loadUser = async () => {
      try {
        const session = localStorage.getItem('userSession');
        if (!session) {
          navigate('/login');
          return;
        }

        const user = JSON.parse(session);
        const normalizedSession = normalizeUserProfile(user);

        setCurrentUser(normalizedSession);
        setEditedProfile(normalizedSession);
        setCharCounts(buildCharCountState(normalizedSession));

        if (!user?.id) return;

        const [profileResponse, petsResponse, appointmentsResponse] = await Promise.all([
          apiService.getProfile(user.id),
          apiService.getUserPets(user.id),
          apiService.getUserAppointments(user.id),
        ]);

        const profilePayload = profileResponse?.user || profileResponse || {};
        const normalizedProfile = normalizeUserProfile({
          ...user,
          ...profilePayload,
          profileImage:
            profilePayload?.profileImage ||
            profilePayload?.userImage ||
            profilePayload?.userimage ||
            normalizedSession.profileImage ||
            null,
        });
        const rawPets = petsResponse?.pets || [];
        const rawAppointments = appointmentsResponse?.appointments || [];
        const mappedAppointments = mapAppointmentsToCards(rawAppointments);
        const mappedPets = mapPetsToCards(rawPets, rawAppointments);
        const mergedSession = {
          ...user,
          ...profilePayload,
          profileImage: normalizedProfile.profileImage,
          userImage: normalizedProfile.profileImage,
          userimage: normalizedProfile.profileImage,
        };

        localStorage.setItem('userSession', JSON.stringify(mergedSession));
        setCurrentUser(normalizedProfile);
        setEditedProfile(normalizedProfile);
        setCharCounts(buildCharCountState(normalizedProfile));
        setPets(mappedPets);
        setAppointments(mappedAppointments);
      } catch (error) {
        console.error("Failed to load user session", error);
        showAlert('error', 'Unable to Load Profile', 'We could not load your latest profile information right now.');
      }
    };
    loadUser();
  }, [navigate]);

  useEffect(() => {
    if (!isEditing || !hasUnsavedProfileChanges) return undefined;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedProfileChanges, isEditing]);

  // Handle contact number change
  const handleContactNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = formatPhoneNumber(e.target.value);

    if (value.length > PH_PHONE_DISPLAY_MAX_LENGTH) {
      value = value.slice(0, PH_PHONE_DISPLAY_MAX_LENGTH);
    }

    setEditedProfile({...editedProfile, contactNumber: value});
    setCharCounts({...charCounts, contactNumber: value.length});
    if (formErrors.contactNumber) setFormErrors({...formErrors, contactNumber: undefined});
  };

  // Validation functions
  const validateProfileForm = (): boolean => {
    const errors: FormErrors = {};

    // First Name validation
    if (!editedProfile.firstName.trim()) {
      errors.firstName = 'First name is required';
    } else if (editedProfile.firstName.length < 2) {
      errors.firstName = 'First name must be at least 2 characters';
    } else if (editedProfile.firstName.length > 30) {
      errors.firstName = 'First name must not exceed 30 characters';
    }

    // Last Name validation
    if (!editedProfile.lastName.trim()) {
      errors.lastName = 'Last name is required';
    } else if (editedProfile.lastName.length < 2) {
      errors.lastName = 'Last name must be at least 2 characters';
    } else if (editedProfile.lastName.length > 30) {
      errors.lastName = 'Last name must not exceed 30 characters';
    }

    // Username validation
    if (!editedProfile.username.trim()) {
      errors.username = 'Username is required';
    } else if (editedProfile.username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    } else if (editedProfile.username.length > 20) {
      errors.username = 'Username must not exceed 20 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(editedProfile.username)) {
      errors.username = 'Username can only contain letters, numbers, and underscores';
    }

    // Contact number validation 
    const digits = normalizePhilippinePhoneDigits(editedProfile.contactNumber);
    if (!editedProfile.contactNumber || editedProfile.contactNumber === '+63 ') {
      errors.contactNumber = 'Contact number is required';
    } else if (!digits.startsWith('63')) {
      errors.contactNumber = 'Please enter a valid PH number starting with 63';
    } else if (digits.length !== PH_PHONE_TOTAL_DIGITS) {
      errors.contactNumber = 'Please enter a valid 12-digit number (including 63)';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Helper functions
  const showAlert = (
    type: AlertConfig['type'],
    title: string,
    message: string,
    onConfirm: (() => void) | null = null,
    showCancel = false,
    confirmText = 'OK'
  ) => {
    setAlertConfig({ type, title, message, onConfirm, showCancel, confirmText });
    setCustomAlertVisible(true);
  };

  const discardProfileEdits = (nextAction?: () => void) => {
    if (currentUser) {
      setEditedProfile(currentUser);
      setCharCounts(buildCharCountState(currentUser));
    }
    setFormErrors({});
    setIsEditing(false);
    nextAction?.();
  };

  const confirmDiscardProfileChanges = (
    nextAction: () => void,
    options?: {
      title?: string;
      message?: string;
      confirmText?: string;
    }
  ) => {
    if (!isEditing || !hasUnsavedProfileChanges) {
      nextAction();
      return;
    }

    showAlert(
      'confirm',
      options?.title || 'Unsaved Changes',
      options?.message || 'You have unsaved changes. Are you sure you want to leave without saving?',
      () => discardProfileEdits(nextAction),
      true,
      options?.confirmText || 'Leave'
    );
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
    if (activeTab === 'profile') return;

    confirmDiscardProfileChanges(() => {
      setActiveTab('profile');
      navigate('/user/profile');
    });
  };

  const handleMyPets = () => {
    setDropdownVisible(false);
    if (activeTab === 'pets') return;

    confirmDiscardProfileChanges(() => {
      setActiveTab('pets');
    });
  };

  const handleTabClick = (tab: 'profile' | 'pets' | 'appointments') => {
    if (tab === activeTab) return;

    confirmDiscardProfileChanges(() => {
      setActiveTab(tab);
    });
  };

  const handleSaveProfile = async () => {
    if (!validateProfileForm()) {
      return;
    }

    if (!currentUser?.id) {
      showAlert('error', 'Unable to Save', 'Could not find your user session. Please log in again.');
      return;
    }

    try {
      const response = await apiService.updateProfile(currentUser.id, {
        username: editedProfile.username,
        firstName: editedProfile.firstName,
        lastName: editedProfile.lastName,
        contactNumber: toStoredPhoneNumber(editedProfile.contactNumber),
        userImage: editedProfile.profileImage || undefined,
      });

      const responsePayload = response?.user || response || {};
      const persistedProfileImage =
        responsePayload?.profileImage ||
        responsePayload?.userImage ||
        responsePayload?.userimage ||
        editedProfile.profileImage ||
        currentUser.profileImage ||
        null;

      const normalizedProfile = normalizeUserProfile({
        ...currentUser,
        ...editedProfile,
        ...responsePayload,
        profileImage: persistedProfileImage,
        userImage: persistedProfileImage,
        userimage: persistedProfileImage,
      });
      const rawSession = localStorage.getItem('userSession');
      const existingSession = rawSession ? JSON.parse(rawSession) : {};
      const mergedSession = {
        ...existingSession,
        ...responsePayload,
        username: normalizedProfile.username,
        firstName: normalizedProfile.firstName,
        lastName: normalizedProfile.lastName,
        fullname: normalizedProfile.fullname,
        fullName: normalizedProfile.fullname,
        contactNumber: normalizedProfile.contactNumber,
        contact_number: toStoredPhoneNumber(normalizedProfile.contactNumber),
        profileImage: persistedProfileImage,
        userImage: persistedProfileImage,
        userimage: persistedProfileImage,
      };

      localStorage.setItem('userSession', JSON.stringify(mergedSession));
      setCurrentUser(normalizedProfile);
      setEditedProfile(normalizedProfile);
      setCharCounts(buildCharCountState(normalizedProfile));
      setIsEditing(false);
      setFormErrors({});
      showAlert('success', 'Success', 'Profile updated successfully!');
    } catch (error: any) {
      console.error('Failed to update profile', error);
      showAlert('error', 'Unable to Save', error?.message || 'Failed to save profile changes. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    if (!currentUser) return;

    if (!hasUnsavedProfileChanges) {
      discardProfileEdits();
      return;
    }

    showAlert(
      'confirm',
      'Discard Changes',
      'You have unsaved changes. Are you sure you want to discard them?',
      () => discardProfileEdits(),
      true,
      'Discard'
    );
  };

  const handleSendOtp = () => {
    // Validate new email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailData.newEmail) {
      setEmailErrors({ ...emailErrors, newEmail: 'New email is required' });
      return;
    }
    if (!emailRegex.test(emailData.newEmail)) {
      setEmailErrors({ ...emailErrors, newEmail: 'Please enter a valid email address' });
      return;
    }
    if (emailData.newEmail !== emailData.confirmEmail) {
      setEmailErrors({ ...emailErrors, confirmEmail: 'Emails do not match' });
      return;
    }

    // Simulate sending OTP
    setOtpSent(true);
    setShowOtpInput(true);
    showAlert('info', 'OTP Sent', 'A verification code has been sent to your new email address.');
  };

  const handleVerifyOtp = () => {
    if (!emailData.otp || emailData.otp.length !== 6) {
      setEmailErrors({ ...emailErrors, otp: 'Please enter a valid 6-digit OTP' });
      return;
    }

    // Simulate OTP verification
    if (emailData.otp === '123456') { // Mock OTP
      setCurrentUser({ ...currentUser!, email: emailData.newEmail });
      setEditedProfile({ ...editedProfile, email: emailData.newEmail });
      setShowEmailModal(false);
      setEmailData({ newEmail: '', confirmEmail: '', otp: '' });
      setOtpSent(false);
      setShowOtpInput(false);
      setEmailErrors({});
      showAlert('success', 'Success', 'Email updated successfully!');
    } else {
      setEmailErrors({ ...emailErrors, otp: 'Invalid OTP. Please try again.' });
    }
  };

  const handleChangePassword = async () => {
    // Reset errors
    setPasswordErrors({});

    // Validate
    const errors: Record<string, string> = {};

    if (!passwordData.currentPassword) {
      errors.currentPassword = 'Current password is required';
    }

    if (!passwordData.newPassword) {
      errors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordData.newPassword)) {
      errors.newPassword = 'Password must contain at least one uppercase, one lowercase, and one number';
    } else if (passwordData.newPassword === passwordData.currentPassword) {
      errors.newPassword = 'New password must be different from your current password';
    }

    if (!passwordData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your new password';
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    if (!currentUser?.id) {
      showAlert('error', 'Unable to Change Password', 'Could not find your user session. Please log in again.');
      return;
    }

    try {
      setIsChangingPassword(true);
      await apiService.changeAuthenticatedPassword(currentUser.id, {
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword,
      });

      setShowPasswordModal(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordErrors({});
      showAlert('success', 'Success', 'Password changed successfully!');
    } catch (error: any) {
      const message = error?.message || 'Failed to change password. Please try again.';
      if (message.toLowerCase().includes('current password')) {
        setPasswordErrors({ currentPassword: message });
      } else if (message.toLowerCase().includes('uppercase') || message.toLowerCase().includes('lowercase') || message.toLowerCase().includes('number') || message.toLowerCase().includes('8 characters')) {
        setPasswordErrors({ newPassword: message });
      } else {
        showAlert('error', 'Unable to Change Password', message);
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const pickImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        return;
      }

      try {
        setIsUploadingProfileImage(true);

        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (typeof reader.result === 'string') {
              resolve(reader.result);
            } else {
              reject(new Error('Could not read the selected image.'));
            }
          };
          reader.onerror = () => reject(new Error('Could not read the selected image.'));
          reader.readAsDataURL(file);
        });

        const fileBase64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
        const uploadResponse = await apiService.uploadProfilePhoto(
          fileBase64,
          file.name,
          file.type || 'image/jpeg'
        );
        const uploadedPhotoUrl = uploadResponse?.photoUrl;

        if (!uploadedPhotoUrl) {
          throw new Error('Profile photo upload did not return an image URL.');
        }

        setEditedProfile((prev) => ({ ...prev, profileImage: uploadedPhotoUrl }));
      } catch (error: any) {
        console.error('Failed to upload profile image', error);
        showAlert(
          'error',
          'Unable to Upload Photo',
          error?.message || 'We could not upload your profile picture right now.'
        );
      } finally {
        setIsUploadingProfileImage(false);
      }
    };
    input.click();
  };

  const handleViewAllAppointments = () => {
    if (!isEditing) {
      navigate('/user/appointment-view');
    }
  };

  const formatDate = (dateString: string): string => {
    return formatDisplayDate(dateString);
  };

  const getStatusBadgeClass = (status: string) => {
    switch(status) {
      case 'pending': return 'upf-status-badge upf-pending';
      case 'confirmed': return 'upf-status-badge upf-confirmed';
      case 'completed': return 'upf-status-badge upf-completed';
      case 'cancelled': return 'upf-status-badge upf-cancelled';
      default: return 'upf-status-badge';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch(type) {
      case 'reminder': return <IoCalendarOutline size={18} color="#3d67ee" />;
      case 'success': return <IoCheckmarkCircleOutline size={18} color="#2e9e0c" />;
      case 'warning': return <IoAlertCircleOutline size={18} color="#ff9800" />;
      default: return <IoInformationCircleOutline size={18} color="#3d67ee" />;
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(notif => 
      notif.id === id ? { ...notif, read: true } : notif
    ));
  };

  // Make the entire container scrollable
  useEffect(() => {
    document.body.style.overflow = 'auto';
    document.body.style.height = 'auto';
    return () => {
      document.body.style.overflow = '';
      document.body.style.height = '';
    };
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showPasswordModal || showEmailModal || customAlertVisible) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
    } else {
      document.body.style.overflow = 'auto';
      document.body.style.position = 'static';
      document.body.style.width = 'auto';
      document.body.style.height = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
      document.body.style.position = 'static';
      document.body.style.width = 'auto';
      document.body.style.height = 'auto';
    };
  }, [showPasswordModal, showEmailModal, customAlertVisible]);

  return (
    <div className="upf-user-container">
    {/* Custom Alert Modal */}
    {customAlertVisible && (
    <div className="upf-modal-overlay" onClick={() => setCustomAlertVisible(false)}>
        <div className="upf-modal-content" onClick={e => e.stopPropagation()}>
        {alertConfig.type === 'success' ? (
            <IoCheckmarkCircleOutline size={55} color="#10b981" />
        ) : alertConfig.type === 'error' ? (
            <IoCloseCircleOutline size={55} color="#ef4444" />
        ) : alertConfig.type === 'confirm' ? (
            <IoAlertCircleOutline size={55} color="#ef4444" />
        ) : (
            <IoAlertCircleOutline size={55} color="#3b82f6" />
        )}
        
        <h3 className="upf-modal-title">{alertConfig.title}</h3>
        <p className="upf-modal-message">{alertConfig.message}</p>
        
        <div className="upf-modal-actions">
            {alertConfig.showCancel && (
            <button 
                className="upf-modal-btn upf-modal-btn-cancel"
                onClick={() => setCustomAlertVisible(false)}
            >
                Cancel
            </button>
            )}
            
            <button 
            className={`upf-modal-btn 
                ${alertConfig.type === 'success' ? 'upf-modal-btn-success' : 
                alertConfig.type === 'error' ? 'upf-modal-btn-error' : 
                alertConfig.type === 'confirm' ? 'upf-modal-btn-warning' : 
                'upf-modal-btn-info'}`}
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
        onNavigateAttempt={confirmDiscardProfileChanges}
        showAlert={showAlert}
      />

      {/* Main Content */}
      <div className="upf-main-content" ref={mainContentRef}>
        {/* Profile Header - with editing indicator */}
        <div className={`upf-profile-header-section ${isEditing ? 'upf-editing-mode' : ''}`}>
          <img 
            src={profileHeader}
            alt="Profile Header"
            className="upf-header-bg"
          />
          
          {isEditing && (
            <div className="upf-editing-badge">
              <IoPencil size={14} />
              <span>Editing Profile</span>
            </div>
          )}
          
          <div className="upf-header-overlay">
            <div className="upf-profile-picture-wrapper">
              <div className="upf-profile-picture-border">
                <img 
                  src={(isEditing ? editedProfile.profileImage : currentUser?.profileImage) || DEFAULT_PROFILE_IMAGE}
                  alt="Profile"
                  className="upf-profile-picture"
                />
                {isEditing && (
                  <button 
                    className="upf-change-photo-btn"
                    onClick={pickImage}
                    disabled={isUploadingProfileImage}
                    title={isUploadingProfileImage ? 'Uploading photo...' : 'Change profile photo'}
                  >
                    <IoCameraOutline size={20} color="#ffffff" />
                  </button>
                )}
              </div>
            </div>
            
            <div className="upf-header-info">
              <h1>{`${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim() || currentUser?.fullname || currentUser?.username || 'Pet Parent'}</h1>
              <div className="upf-header-meta">
                <span>@{currentUser?.username || 'petparent'}</span>
                <span>•</span>
                <span>{formatJoinedText(currentUser?.dateJoined || '')}</span>
              </div>
            </div>

            {!isEditing ? (
              <button
                className="upf-edit-profile-btn"
                onClick={() => {
                  setIsEditing(true);
                  setActiveTab('profile'); // Add this line to switch to profile tab
                }}
              >
                <IoPencil size={16} color="#1b57fc" />
                <span>Edit Profile</span>
              </button>
            ) : null}
          </div>
        </div>

        {/* Tab Navigation - with disabled state when editing */}
        <div className="upf-tabs-container">
          <button 
            className={`upf-tab-btn ${activeTab === 'profile' ? 'upf-active' : ''} ${isEditing ? 'upf-disabled' : ''}`}
            onClick={() => handleTabClick('profile')}
            disabled={isEditing}
          >
            <IoPersonOutline size={18} />
            <span>Profile</span>
          </button>
          <button 
            className={`upf-tab-btn ${activeTab === 'pets' ? 'upf-active' : ''} ${isEditing ? 'upf-disabled' : ''}`}
            onClick={() => handleTabClick('pets')}
            disabled={isEditing}
          >
            <IoPaw size={18} />
            <span>My Pets</span>
          </button>
          <button 
            className={`upf-tab-btn ${activeTab === 'appointments' ? 'upf-active' : ''} ${isEditing ? 'upf-disabled' : ''}`}
            onClick={() => handleTabClick('appointments')}
            disabled={isEditing}
          >
            <IoCalendarOutline size={18} />
            <span>Appointments</span>
          </button>
        </div>

        {/* Editing Overlay - shows when trying to click disabled tabs */}
        {isEditing && (
          <div className="upf-editing-overlay-message">
            <p>Reminder: Please save or cancel your profile edits before switching tabs</p>
          </div>
        )}

        {/* Tab Content */}
        <div className="upf-tab-content">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="upf-profile-tab">
              <div className="upf-info-card">
                <div className="upf-card-header">
                  <IoPersonOutline size={22} color="#3d67ee" />
                  <h3>Personal Information</h3>
                  {isEditing && <span className="upf-editing-indicator">(Editing Mode)</span>}
                </div>

                <div className="upf-info-grid">
                  <div className="upf-info-row">
                    <span className="upf-info-label">
                      Username {isEditing && <span className="upf-asterisk">*</span>}
                    </span>
                    {isEditing ? (
                      <div className="upf-input-wrapper">
                        <div className="upf-input-container">
                          <input
                            type="text"
                            className={`upf-info-input ${formErrors.username ? 'upf-error' : ''}`}
                            value={editedProfile.username}
                            onChange={(e) => {
                              const value = e.target.value;
                              setEditedProfile({...editedProfile, username: value});
                              setCharCounts({...charCounts, username: value.length});
                              if (formErrors.username) setFormErrors({...formErrors, username: undefined});
                            }}
                            maxLength={20}
                            placeholder="Enter username"
                          />
                          <span className="upf-char-counter">{charCounts.username}/20</span>
                        </div>
                        {formErrors.username && (
                          <span className="upf-field-error">{formErrors.username}</span>
                        )}
                      </div>
                    ) : (
                      <span className="upf-info-value">{currentUser?.username || 'Not provided'}</span>
                    )}
                  </div>

                  <div className="upf-info-row">
                    <span className="upf-info-label">
                      First Name {isEditing && <span className="upf-asterisk">*</span>}
                    </span>
                    {isEditing ? (
                      <div className="upf-input-wrapper">
                        <div className="upf-input-container">
                          <input
                            type="text"
                            className={`upf-info-input ${formErrors.firstName ? 'upf-error' : ''}`}
                            value={editedProfile.firstName}
                            onChange={(e) => {
                              const value = e.target.value;
                              setEditedProfile({...editedProfile, firstName: value});
                              setCharCounts({...charCounts, firstName: value.length});
                              if (formErrors.firstName) setFormErrors({...formErrors, firstName: undefined});
                            }}
                            maxLength={30}
                            placeholder="Enter first name"
                          />
                          <span className="upf-char-counter">{charCounts.firstName}/30</span>
                        </div>
                        {formErrors.firstName && (
                          <span className="upf-field-error">{formErrors.firstName}</span>
                        )}
                      </div>
                    ) : (
                      <span className="upf-info-value">{currentUser?.firstName || 'Not provided'}</span>
                    )}
                  </div>

                  <div className="upf-info-row">
                    <span className="upf-info-label">
                      Last Name {isEditing && <span className="upf-asterisk">*</span>}
                    </span>
                    {isEditing ? (
                      <div className="upf-input-wrapper">
                        <div className="upf-input-container">
                          <input
                            type="text"
                            className={`upf-info-input ${formErrors.lastName ? 'upf-error' : ''}`}
                            value={editedProfile.lastName}
                            onChange={(e) => {
                              const value = e.target.value;
                              setEditedProfile({...editedProfile, lastName: value});
                              setCharCounts({...charCounts, lastName: value.length});
                              if (formErrors.lastName) setFormErrors({...formErrors, lastName: undefined});
                            }}
                            maxLength={30}
                            placeholder="Enter last name"
                          />
                          <span className="upf-char-counter">{charCounts.lastName}/30</span>
                        </div>
                        {formErrors.lastName && (
                          <span className="upf-field-error">{formErrors.lastName}</span>
                        )}
                      </div>
                    ) : (
                      <span className="upf-info-value">{currentUser?.lastName || 'Not provided'}</span>
                    )}
                  </div>

                  <div className="upf-info-row">
                    <span className="upf-info-label">
                      Email
                    </span>
                    <div className="upf-email-display">
                      <span className="upf-info-value">{currentUser?.email || 'Not provided'}</span>
                      <button
                        className="upf-change-email-btn"
                        onClick={() => setShowEmailModal(true)}
                        disabled={isEditing}
                      >
                        <IoMail size={16} />
                        <span>Change</span>
                      </button>
                    </div>
                  </div>

                  <div className="upf-info-row">
                    <span className="upf-info-label">
                      Contact {isEditing && <span className="upf-asterisk">*</span>}
                    </span>
                    {isEditing ? (
                      <div className="upf-input-wrapper">
                        <div className="upf-input-container">
                          <input
                            type="tel"
                            className={`upf-info-input upf-phone-input ${formErrors.contactNumber ? 'upf-error' : ''}`}
                            value={editedProfile.contactNumber}
                            onChange={handleContactNumberChange}
                            placeholder="+63 XXX XXX XXXX"
                          />
                          <span className="upf-char-counter">{charCounts.contactNumber}/{PH_PHONE_DISPLAY_MAX_LENGTH}</span>
                        </div>
                        {formErrors.contactNumber && (
                          <span className="upf-field-error">{formErrors.contactNumber}</span>
                        )}
                      </div>
                    ) : (
                      <span className="upf-info-value">{currentUser?.contactNumber || 'Not provided'}</span>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <div className="upf-required-fields-note">
                    <span className="upf-asterisk">*</span> All fields are required
                  </div>
                )}

                {isEditing ? (
                  <div className="upf-edit-actions-bottom">
                    <button
                      className="upf-save-btn"
                      onClick={handleSaveProfile}
                      disabled={isUploadingProfileImage}
                    >
                      <IoCheckmarkCircle size={18} />
                      <span>{isUploadingProfileImage ? 'Uploading Photo...' : 'Save Changes'}</span>
                    </button>
                    <button
                      className="upf-cancel-btn"
                      onClick={handleCancelEdit}
                      disabled={isUploadingProfileImage}
                    >
                      <IoClose size={18} />
                      <span>Cancel</span>
                    </button>
                  </div>
                ) : (
                  <button
                    className="upf-change-password-btn"
                    onClick={() => setShowPasswordModal(true)}
                  >
                    <IoKeyOutline size={18} />
                    <span>Change Password</span>
                  </button>
                )}
              </div>

              <div className="upf-notifications-card">
                <div className="upf-card-header">
                  <IoNotificationsOutline size={22} color="#3d67ee" />
                  <h3>Recent Notifications</h3>
                </div>

                <div className="upf-notifications-list" ref={notificationsRef}>
                  {notifications.slice(0, 3).map(notification => (
                    <div 
                      key={notification.id} 
                      className={`upf-notification-item ${!notification.read ? 'upf-unread' : ''}`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="upf-notification-icon">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="upf-notification-content">
                        <h4>{notification.title}</h4>
                        <p>{notification.message}</p>
                        <span className="upf-notification-time">{notification.time}</span>
                      </div>
                      {!notification.read && <span className="upf-unread-dot"></span>}
                    </div>
                  ))}
                </div>

                <button className="upf-view-all-notifications">
                  <span>View All Notifications</span>
                  <IoArrowForwardOutline size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Pets Tab */}
          {activeTab === 'pets' && (
            <div className="upf-pets-tab">
              <div className="upf-pets-header">
                <h3>My Pets</h3>
                <button 
                  className="upf-add-pet-btn"
                  onClick={() => navigate('/user/pet-profile')}
                  disabled={isEditing}
                >
                  <IoAdd size={20} />
                  <span>Add New Pet</span>
                </button>
              </div>

              <div className="upf-pets-grid">
                {pets.length === 0 ? (
                  <div className="upf-empty-state-card">
                    <p>Your created pet profiles will show here.</p>
                  </div>
                ) : pets.map(pet => (
                  <div key={pet.id} className="upf-pet-card">
                    <img 
                      src={pet.image || DEFAULT_PET_IMAGE} 
                      alt={pet.name}
                      className="upf-pet-image"
                    />
                    <h4 className="upf-pet-name">{pet.name}</h4>
                    <p className="upf-pet-details">{pet.breed} • {pet.age}</p>
                    <div className="upf-pet-stats">
                      <span className="upf-pet-stat">
                        <IoMedical size={12} /> {pet.medicalRecords || 0} records
                      </span>
                      <span className="upf-pet-stat">
                        <IoCalendar size={12} /> {pet.appointments || 0} appts
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Appointments Tab */}
          {activeTab === 'appointments' && (
            <div className="upf-appointments-tab">
              <div className="upf-appointments-header">
                <h3>Upcoming Appointments</h3>
                <button 
                  className="upf-view-all-btn"
                  onClick={handleViewAllAppointments}
                  disabled={isEditing}
                >
                  <span>View All</span>
                  <IoArrowForwardOutline size={16} />
                </button>
              </div>

              <div className="upf-appointments-list">
                {appointments.filter(apt => apt.status !== 'completed' && apt.status !== 'cancelled').length === 0 ? (
                  <div className="upf-empty-state-card">
                    <p>Your created appointments will show here.</p>
                  </div>
                ) : appointments
                  .filter(apt => apt.status !== 'completed' && apt.status !== 'cancelled')
                  .map(appointment => (
                    <div key={appointment.id} className="upf-appointment-item">
                      <img 
                        src={appointment.petImage || DEFAULT_PET_IMAGE} 
                        alt={appointment.petName}
                        className="upf-appointment-pet-image"
                      />
                      <div className="upf-appointment-details">
                        <div className="upf-appointment-header">
                          <h4>{appointment.petName}</h4>
                          <span className={getStatusBadgeClass(appointment.status)}>
                            {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                          </span>
                        </div>
                        <p className="upf-appointment-type">
                          {appointment.type}
                          {appointment.vet ? ` with ${appointment.vet}` : ''}
                        </p>
                        <p className="upf-appointment-datetime">
                          <IoCalendar size={14} /> {formatDate(appointment.date)} • {appointment.time}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="upf-modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="upf-modal-content upf-password-modal" onClick={e => e.stopPropagation()}>
            <div className="upf-modal-header">
              <h2>Change Password</h2>
              <button className="upf-modal-close-btn" onClick={() => setShowPasswordModal(false)}>
                <IoClose size={24} color="#666" />
              </button>
            </div>

            <div className="upf-modal-body">
              <div className="upf-form-group">
                <label className="upf-form-label">
                  Current Password <span className="upf-asterisk">*</span>
                </label>
                <div className="upf-password-input-wrapper">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    className={`upf-form-input ${passwordErrors.currentPassword ? 'upf-error' : ''}`}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                  />
                  <button 
                    type="button"
                    className="upf-password-toggle"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? <IoEyeOffOutline size={20} /> : <IoEyeOutline size={20} />}
                  </button>
                </div>
                {passwordErrors.currentPassword && (
                  <span className="upf-error-message">{passwordErrors.currentPassword}</span>
                )}
              </div>

              <div className="upf-form-group">
                <label className="upf-form-label">
                  New Password <span className="upf-asterisk">*</span>
                </label>
                <div className="upf-password-input-wrapper">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    className={`upf-form-input ${passwordErrors.newPassword ? 'upf-error' : ''}`}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                  />
                  <button 
                    type="button"
                    className="upf-password-toggle"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <IoEyeOffOutline size={20} /> : <IoEyeOutline size={20} />}
                  </button>
                </div>
                {passwordErrors.newPassword && (
                  <span className="upf-error-message">{passwordErrors.newPassword}</span>
                )}
                <p className="upf-password-hint">
                  Must be at least 8 characters with at least one uppercase, one lowercase, and one number
                </p>
              </div>

              <div className="upf-form-group">
                <label className="upf-form-label">
                  Confirm New Password <span className="upf-asterisk">*</span>
                </label>
                <div className="upf-password-input-wrapper">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    className={`upf-form-input ${passwordErrors.confirmPassword ? 'upf-error' : ''}`}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                  />
                  <button 
                    type="button"
                    className="upf-password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <IoEyeOffOutline size={20} /> : <IoEyeOutline size={20} />}
                  </button>
                </div>
                {passwordErrors.confirmPassword && (
                  <span className="upf-error-message">{passwordErrors.confirmPassword}</span>
                )}
              </div>

              <div className="upf-modal-actions-row">
                <button 
                  className="upf-btn-secondary"
                  onClick={() => setShowPasswordModal(false)}
                  disabled={isChangingPassword}
                >
                  Cancel
                </button>
                <button 
                  className="upf-btn-primary"
                  onClick={handleChangePassword}
                  disabled={isChangingPassword}
                >
                  {isChangingPassword ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Email Modal */}
      {showEmailModal && (
        <div className="upf-modal-overlay" onClick={() => {
          setShowEmailModal(false);
          setEmailData({ newEmail: '', confirmEmail: '', otp: '' });
          setOtpSent(false);
          setShowOtpInput(false);
          setEmailErrors({});
        }}>
          <div className="upf-modal-content upf-email-modal" onClick={e => e.stopPropagation()}>
            <div className="upf-modal-header">
              <h2>Change Email Address</h2>
              <button className="upf-modal-close-btn" onClick={() => {
                setShowEmailModal(false);
                setEmailData({ newEmail: '', confirmEmail: '', otp: '' });
                setOtpSent(false);
                setShowOtpInput(false);
                setEmailErrors({});
              }}>
                <IoClose size={24} color="#666" />
              </button>
            </div>

            <div className="upf-modal-body">
              {!showOtpInput ? (
                <>
                  <div className="upf-form-group">
                    <label className="upf-form-label">
                      New Email Address <span className="upf-asterisk">*</span>
                    </label>
                    <input
                      type="email"
                      className={`upf-form-input ${emailErrors.newEmail ? 'upf-error' : ''}`}
                      value={emailData.newEmail}
                      onChange={(e) => {
                        setEmailData({...emailData, newEmail: e.target.value});
                        if (emailErrors.newEmail) setEmailErrors({...emailErrors});
                      }}
                      placeholder="Enter new email address"
                    />
                    {emailErrors.newEmail && (
                      <span className="upf-error-message">{emailErrors.newEmail}</span>
                    )}
                  </div>

                  <div className="upf-form-group">
                    <label className="upf-form-label">
                      Confirm New Email <span className="upf-asterisk">*</span>
                    </label>
                    <input
                      type="email"
                      className={`upf-form-input ${emailErrors.confirmEmail ? 'upf-error' : ''}`}
                      value={emailData.confirmEmail}
                      onChange={(e) => {
                        setEmailData({...emailData, confirmEmail: e.target.value});
                        if (emailErrors.confirmEmail) setEmailErrors({...emailErrors});
                      }}
                      placeholder="Confirm new email address"
                    />
                    {emailErrors.confirmEmail && (
                      <span className="upf-error-message">{emailErrors.confirmEmail}</span>
                    )}
                  </div>

                  <div className="upf-modal-actions-row">
                    <button 
                      className="upf-btn-secondary"
                      onClick={() => setShowEmailModal(false)}
                    >
                      Cancel
                    </button>
                    <button 
                      className="upf-btn-primary"
                      onClick={handleSendOtp}
                    >
                      Send OTP
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="upf-otp-info">
                    <IoMailOutline size={40} color="#3d67ee" />
                    <p>We've sent a verification code to</p>
                    <strong>{emailData.newEmail}</strong>
                  </div>

                  <div className="upf-form-group">
                    <label className="upf-form-label">
                      Enter OTP <span className="upf-asterisk">*</span>
                    </label>
                    <input
                      type="text"
                      className={`upf-form-input ${emailErrors.otp ? 'upf-error' : ''}`}
                      value={emailData.otp}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                        setEmailData({...emailData, otp: value});
                        if (emailErrors.otp) setEmailErrors({...emailErrors});
                      }}
                      placeholder="6-digit code"
                      maxLength={6}
                    />
                    {emailErrors.otp && (
                      <span className="upf-error-message">{emailErrors.otp}</span>
                    )}
                  </div>

                  <div className="upf-otp-resend">
                    <span>Didn't receive code? </span>
                    <button className="upf-resend-btn">Resend</button>
                  </div>

                  <div className="upf-modal-actions-row">
                    <button 
                      className="upf-btn-secondary"
                      onClick={() => {
                        setShowOtpInput(false);
                        setOtpSent(false);
                        setEmailErrors({});
                      }}
                    >
                      Back
                    </button>
                    <button 
                      className="upf-btn-primary"
                      onClick={handleVerifyOtp}
                    >
                      Verify & Update
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
