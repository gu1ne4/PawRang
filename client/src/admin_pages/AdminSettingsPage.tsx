import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useBeforeUnload, useLocation, useNavigate } from 'react-router-dom';
import {
  IoAddOutline,
  IoAlertCircleOutline,
  IoAppsOutline,
  IoCheckmarkCircleOutline,
  IoCloseCircleOutline,
  IoCreateOutline,
  IoGlobeOutline,
  IoImageOutline,
  IoLayersOutline,
  IoLocationOutline,
  IoMailOpenOutline,
  IoPeopleOutline,
  IoPricetagOutline,
  IoSettingsOutline,
  IoShieldCheckmarkOutline,
  IoTrashOutline
} from 'react-icons/io5';

import './AdminStyles.css';
import Navbar from '../reusable_components/NavBar';
import Notifications from '../reusable_components/Notifications';
import RichTextEditor from '../reusable_components/RichTextEditor';
import defaultUserImg from '../assets/userImg.jpg';
import heroImg from '../assets/hero.png';
import branchLPImg from '../assets/branchLP.jpg';
import branchTaguigImg from '../assets/branchTaguig.jpg';
import { apiService } from '../apiService';
import { recordSettingsAuditLog } from './auditLogService';

interface CurrentUser {
  id?: string | number;
  pk?: string | number;
  employee_id?: string | number;
  employeeId?: string | number;
  account_id?: string | number;
  username: string;
  fullName?: string;
  fullname?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  role: string;
  userImage?: string;
  userimage?: string;
  profileImage?: string;
  employee_image?: string;
  email?: string;
  contactNumber?: string;
  contact_number?: string;
}

interface ModalConfigType {
  type: 'info' | 'success' | 'error' | 'confirm';
  title: string;
  message: string | React.ReactNode;
  onConfirm: (() => void) | null;
  showCancel: boolean;
}

interface ProfileForm {
  fullName: string;
  username: string;
  contactNumber: string;
  role: string;
  branch: string;
  userImage: string;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface EmailForm {
  currentEmail: string;
  newEmail: string;
  confirmEmail: string;
}

interface ServiceItem {
  id: string;
  category: string;
  name: string;
  price: string;
  status: 'Active' | 'Draft';
  description: string;
}

interface AnnouncementItem {
  id: string;
  title: string;
  displayType: 'Custom Announcement' | 'Banner Upload';
  channel: 'Web Home' | 'Mobile App Home' | 'Both Homepages';
  notifyAllUsers: boolean;
  audience: string;
  schedule: string;
  status: 'Draft' | 'Scheduled' | 'Live';
  theme: 'Normal' | 'Urgent' | 'Promo' | 'Important Notice';
  image?: string;
  body: string;
}

interface FeatureCard {
  id: string;
  title: string;
  text: string;
}

interface AboutCard {
  id: string;
  title: string;
  body: string;
}

interface CarouselImage {
  id: string;
  title: string;
  caption: string;
  image: string;
}

interface BranchLocation {
  id: string;
  name: string;
  address: string;
  hours: string;
  mapsUrl: string;
  image: string;
}

interface HomepageContent {
  heroEyebrow: string;
  heroTitle: string;
  heroBody: string;
  servicesTitle: string;
  servicesIntro: string;
  branchesIntro: string;
  aboutTitle: string;
  aboutBody: string;
}

type HomepageEditorTarget =
  | 'hero'
  | 'features'
  | 'carousel'
  | 'services'
  | 'service-card'
  | 'branches'
  | 'about'
  | 'about-card-1'
  | 'about-card-2';

type SettingsPanel = 'account' | 'security' | 'developer' | 'homepage' | 'announcements';
type FieldErrors = Record<string, string>;
type PasswordRequirement = {
  id: string;
  label: string;
  isMet: boolean;
};
type SettingsMode = 'admin' | 'doctor';

interface AdminSettingsPageProps {
  settingsMode?: SettingsMode;
}

const showFutureDefenseSettings = false;
const futureDefenseSettingsPanels = new Set<SettingsPanel>(['developer', 'homepage', 'announcements']);

const defaultSessionUser: CurrentUser = {
  username: '',
  fullName: '',
  role: 'Administrator',
  email: '',
  contactNumber: '',
  userImage: defaultUserImg
};

const initialProfileForm: ProfileForm = {
  fullName: '',
  username: '',
  contactNumber: '',
  role: '',
  branch: '',
  userImage: defaultUserImg
};

const initialPasswordForm: PasswordForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
};

const initialEmailForm: EmailForm = {
  currentEmail: '',
  newEmail: '',
  confirmEmail: ''
};

const initialServiceForm: ServiceItem = {
  id: '',
  category: 'Consultation',
  name: '',
  price: '',
  status: 'Active',
  description: ''
};

const initialAnnouncementForm: AnnouncementItem = {
  id: '',
  title: '',
  displayType: 'Custom Announcement',
  channel: 'Both Homepages',
  notifyAllUsers: true,
  audience: '',
  schedule: '2026-05-02 09:00',
  status: 'Draft',
  theme: 'Normal',
  image: '',
  body: ''
};

const initialHomepageContent: HomepageContent = {
  heroEyebrow: 'Welcome to PetShield',
  heroTitle: 'Pet care bookings, profiles, and clinic services in one place.',
  heroBody: '<p>Help pet owners prepare for every visit with guided booking, organized service details, and a simpler way to review records before appointments.</p>',
  servicesTitle: 'Services available through the PetShield client portal',
  servicesIntro: '<p>Browse supported services before you book so clients can choose the right appointment for their pet.</p>',
  branchesIntro: '<p>Find the PetShield branch nearest you and open the location in Google Maps before your visit.</p>',
  aboutTitle: 'Built to give PetShield clients a clearer, simpler booking experience',
  aboutBody: '<p>The goal of this website is straightforward: reduce friction for pet owners by organizing service selection, pet records, and appointment details in one consistent place.</p>'
};

const initialFeatureCards: FeatureCard[] = [
  {
    id: 'feature-1',
    title: 'Book Veterinary Visits',
    text: 'Schedule consultations, check ups, vaccinations, diagnostics, and grooming in one booking flow.'
  },
  {
    id: 'feature-2',
    title: 'Manage Pet Profiles',
    text: 'Keep vaccination dates, breed details, and appointment notes easy to review any time.'
  },
  {
    id: 'feature-3',
    title: 'Review Care Services',
    text: 'Browse the available PetShield services before booking, including pet grooming and medical care.'
  }
];

const initialAboutCards: AboutCard[] = [
  {
    id: 'about-1',
    title: 'About the Website',
    body: '<p>This client portal helps pet owners manage appointments, review services, and keep pet information ready before every visit.</p>'
  },
  {
    id: 'about-2',
    title: 'About PetShield',
    body: '<p>PetShield is the client-facing brand behind this experience, focused on making veterinary and grooming coordination simpler for pet owners.</p>'
  }
];

const initialCarouselImages: CarouselImage[] = [
  {
    id: 'clinic-slide-1',
    title: 'Reception and care desk',
    caption: 'A welcoming first stop for appointment check-ins, product questions, and pet care guidance.',
    image: heroImg
  },
  {
    id: 'clinic-slide-2',
    title: 'Las Pinas clinic',
    caption: 'A convenient clinic branch for consultations, grooming, and preventive care visits.',
    image: branchLPImg
  },
  {
    id: 'clinic-slide-3',
    title: 'Taguig clinic',
    caption: 'A second service point for clients who need easier access across the metro.',
    image: branchTaguigImg
  }
];

const initialBranchLocations: BranchLocation[] = [
  {
    id: 'branch-las-pinas',
    name: 'PetShield Las Pinas',
    address: 'BF Resort Village, 65 Judge B Tan, Talon Dos, Las Pinas, 1747 Metro Manila',
    hours: 'Open Monday to Saturday, 9:00 AM - 6:00 PM',
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=BF%20Resort%20Village%2C%2065%20Judge%20B%20Tan%2C%20Talon%20Dos%2C%20Las%20Pinas%2C%201747%20Metro%20Manila',
    image: branchLPImg
  },
  {
    id: 'branch-taguig',
    name: 'PetShield Taguig',
    address: '99 General Espino St, cor Bravo St, Central Signal, Taguig, 1630 Metro Manila',
    hours: 'Open Monday to Saturday, 9:00 AM - 6:00 PM',
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=99%20General%20Espino%20St%2C%20cor%20Bravo%20St%2C%20Central%20Signal%2C%20Taguig%2C%201630%20Metro%20Manila',
    image: branchTaguigImg
  }
];

const billingBasedServices: ServiceItem[] = [
  { id: 'svc-1', category: 'Consultation', name: 'General Consultation', price: '500', status: 'Active', description: 'Standard veterinary consultation.' },
  { id: 'svc-2', category: 'Consultation', name: 'Emergency Consultation', price: '800', status: 'Active', description: 'Emergency after-hours consultation.' },
  { id: 'svc-3', category: 'Consultation', name: 'Follow-up Consultation', price: '350', status: 'Active', description: 'Follow-up checkup.' },
  { id: 'svc-4', category: 'Consultation', name: 'Specialist Consultation', price: '1200', status: 'Active', description: 'Specialist veterinarian consultation.' },
  { id: 'svc-5', category: 'Vaccinations', name: 'Anti-Rabies', price: '350', status: 'Active', description: 'Anti-rabies vaccination.' },
  { id: 'svc-6', category: 'Vaccinations', name: '5-in-1 Vaccine', price: '600', status: 'Active', description: '5-in-1 combination vaccine.' },
  { id: 'svc-7', category: 'Vaccinations', name: '6-in-1 Vaccine', price: '750', status: 'Active', description: '6-in-1 combination vaccine.' },
  { id: 'svc-8', category: 'Vaccinations', name: 'Bordetella', price: '500', status: 'Active', description: 'Kennel cough vaccine.' },
  { id: 'svc-9', category: 'Vaccinations', name: 'Leptospirosis', price: '450', status: 'Active', description: 'Leptospirosis vaccine.' },
  { id: 'svc-10', category: 'Vaccinations', name: 'Canine Influenza', price: '550', status: 'Active', description: 'Canine influenza vaccine.' },
  { id: 'svc-11', category: 'Vaccinations', name: 'Feline Leukemia', price: '600', status: 'Active', description: 'FeLV vaccine for cats.' },
  { id: 'svc-12', category: 'Vaccinations', name: 'Feline Distemper', price: '500', status: 'Active', description: 'Feline distemper vaccine.' },
  { id: 'svc-13', category: 'Preventive Care', name: 'Deworming', price: '250', status: 'Draft', description: 'Internal parasite deworming.' },
  { id: 'svc-14', category: 'Preventive Care', name: 'Flea & Tick Treatment', price: '400', status: 'Active', description: 'External parasite treatment.' },
  { id: 'svc-15', category: 'Preventive Care', name: 'Heartworm Prevention', price: '500', status: 'Active', description: 'Heartworm preventive medication.' },
  { id: 'svc-16', category: 'Preventive Care', name: 'Annual Health Check', price: '800', status: 'Active', description: 'Comprehensive annual health examination.' },
  { id: 'svc-17', category: 'Preventive Care', name: 'Microchipping', price: '1200', status: 'Active', description: 'Pet identification microchip implantation.' },
  { id: 'svc-18', category: 'Preventive Care', name: 'Nail Trim', price: '150', status: 'Draft', description: 'Nail clipping and filing.' },
  { id: 'svc-19', category: 'Preventive Care', name: 'Ear Cleaning', price: '200', status: 'Draft', description: 'Ear cleaning and inspection.' },
  { id: 'svc-20', category: 'Preventive Care', name: 'Anal Gland Expression', price: '250', status: 'Draft', description: 'Anal gland cleaning.' },
  { id: 'svc-21', category: 'Diagnostics', name: 'CBC', price: '500', status: 'Active', description: 'Complete Blood Count.' },
  { id: 'svc-22', category: 'Diagnostics', name: 'Blood Chemistry', price: '800', status: 'Active', description: 'Blood chemistry panel.' },
  { id: 'svc-23', category: 'Diagnostics', name: 'Urinalysis', price: '300', status: 'Active', description: 'Urine analysis.' },
  { id: 'svc-24', category: 'Diagnostics', name: 'Fecalysis', price: '250', status: 'Active', description: 'Stool examination.' },
  { id: 'svc-25', category: 'Diagnostics', name: 'Skin Scraping', price: '350', status: 'Active', description: 'Skin scraping for parasites.' },
  { id: 'svc-26', category: 'Diagnostics', name: 'Vaginal Smear', price: '400', status: 'Active', description: 'Vaginal cytology.' },
  { id: 'svc-27', category: 'Diagnostics', name: 'Progesterone Test', price: '1500', status: 'Active', description: 'Progesterone level testing.' },
  { id: 'svc-28', category: 'Diagnostics', name: 'Antigen Test', price: '800', status: 'Active', description: 'Antigen detection test.' },
  { id: 'svc-29', category: 'Diagnostics', name: 'Antibody Test', price: '800', status: 'Active', description: 'Antibody titer test.' },
  { id: 'svc-30', category: 'Diagnostics', name: 'X-Ray', price: '800', status: 'Active', description: 'Radiographic imaging (per view).' },
  { id: 'svc-31', category: 'Diagnostics', name: 'Ultrasound', price: '1500', status: 'Active', description: 'Ultrasound imaging.' },
  { id: 'svc-32', category: 'Surgery', name: 'Spay/Neuter', price: '3000', status: 'Active', description: 'Sterilization surgery.' },
  { id: 'svc-33', category: 'Surgery', name: 'Mass Removal', price: '4500', status: 'Active', description: 'Tumor/mass excision.' },
  { id: 'svc-34', category: 'Surgery', name: 'Foreign Body Removal', price: '5000', status: 'Active', description: 'Foreign object extraction.' },
  { id: 'svc-35', category: 'Surgery', name: 'Wound Repair', price: '2000', status: 'Active', description: 'Laceration repair and suturing.' },
  { id: 'svc-36', category: 'Surgery', name: 'Orthopedic Surgery', price: '12000', status: 'Draft', description: 'Bone/joint surgery.' },
  { id: 'svc-37', category: 'Surgery', name: 'Dental Extraction', price: '1500', status: 'Active', description: 'Tooth extraction.' },
  { id: 'svc-38', category: 'Dental Prophylaxis', name: 'Basic Dental Cleaning', price: '1200', status: 'Draft', description: 'Teeth scaling and polishing.' },
  { id: 'svc-39', category: 'Dental Prophylaxis', name: 'Comprehensive Dental', price: '2500', status: 'Draft', description: 'Complete dental cleaning with anesthesia.' },
  { id: 'svc-40', category: 'Dental Prophylaxis', name: 'Periodontal Treatment', price: '3000', status: 'Draft', description: 'Gum disease treatment.' },
  { id: 'svc-41', category: 'Grooming', name: 'Basic Grooming', price: '400', status: 'Active', description: 'Bath, brush, nail trim.' },
  { id: 'svc-42', category: 'Grooming', name: 'Full Grooming', price: '800', status: 'Active', description: 'Complete grooming service.' },
  { id: 'svc-43', category: 'Grooming', name: 'Lion Cut', price: '1000', status: 'Draft', description: 'Full body shave for cats.' },
  { id: 'svc-44', category: 'Grooming', name: 'De-shedding Treatment', price: '600', status: 'Active', description: 'Professional de-shedding.' },
  { id: 'svc-45', category: 'Boarding', name: 'Standard Boarding', price: '350', status: 'Active', description: 'Per night, includes basic care.' },
  { id: 'svc-46', category: 'Boarding', name: 'Deluxe Boarding', price: '600', status: 'Active', description: 'Per night, with premium amenities.' },
  { id: 'svc-47', category: 'Boarding', name: 'Day Care', price: '250', status: 'Active', description: 'Daytime care (8 hours).' },
  { id: 'svc-48', category: 'Confinement', name: 'Hospitalization (per day)', price: '1000', status: 'Active', description: '24-hour veterinary care.' },
  { id: 'svc-49', category: 'Confinement', name: 'ICU Monitoring', price: '2000', status: 'Draft', description: 'Intensive care unit monitoring.' },
  { id: 'svc-50', category: 'Confinement', name: 'Fluid Therapy', price: '500', status: 'Active', description: 'IV fluid administration.' }
];

const mockAnnouncements: AnnouncementItem[] = [
  {
    id: 'ann-1',
    title: 'Holiday clinic hours reminder',
    displayType: 'Custom Announcement',
    channel: 'Both Homepages',
    notifyAllUsers: true,
    audience: '',
    schedule: '2026-05-03 10:00',
    status: 'Scheduled',
    theme: 'Important Notice',
    image: '',
    body: 'Share clinic schedule changes and support reminders before the holiday weekend.'
  },
  {
    id: 'ann-2',
    title: 'Dental month promo banner',
    displayType: 'Banner Upload',
    channel: 'Web Home',
    notifyAllUsers: false,
    audience: 'Homepage visitors in Metro Manila',
    schedule: '2026-04-30 08:30',
    status: 'Live',
    theme: 'Promo',
    image: '',
    body: 'Highlight preventive dental care packages on the public-facing homepage hero section.'
  }
];

const defaultServiceCategoryOptions = ['Consultation', 'Vaccinations', 'Preventive Care', 'Diagnostics', 'Surgery', 'Dental Prophylaxis', 'Grooming', 'Boarding', 'Confinement'];

const stripHtml = (value: string) => value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const createGoogleMapsSearchUrl = (address: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.trim())}`;

const formatPeso = (value: string) => `PHP ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const getSettingsUserId = (user?: CurrentUser | null): string => {
  const id = user?.id ?? user?.pk ?? user?.employee_id ?? user?.employeeId ?? user?.account_id;
  return id === undefined || id === null ? '' : String(id);
};

const splitSettingsFullName = (fullName: string): { firstName: string; lastName: string } => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return { firstName: parts[0] || '', lastName: '' };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' ')
  };
};

const getSettingsProfileImage = (profile: Partial<CurrentUser> | Record<string, any> | null | undefined): string =>
  profile?.profileImage ||
  profile?.employee_image ||
  profile?.userImage ||
  profile?.userimage ||
  defaultUserImg;

const normalizeSettingsPhoneDigits = (value: string | number | null | undefined): string => String(value || '').replace(/\D/g, '');

const getSettingsLocalMobileDigits = (value: string | number | null | undefined): string => {
  let digits = normalizeSettingsPhoneDigits(value);
  if (digits.startsWith('63')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = digits.slice(1);
  return digits;
};

const formatSettingsPhoneNumber = (value: string | number | null | undefined): string => {
  const localDigits = getSettingsLocalMobileDigits(value).slice(0, 10);
  if (!localDigits) return '';

  const firstGroup = localDigits.slice(0, 3);
  const secondGroup = localDigits.slice(3, 6);
  const thirdGroup = localDigits.slice(6, 10);
  return `+63 ${[firstGroup, secondGroup, thirdGroup].filter(Boolean).join(' ')}`;
};

const isValidSettingsPhoneNumber = (value: string | number | null | undefined): boolean => /^9\d{9}$/.test(getSettingsLocalMobileDigits(value));

const normalizeSettingsUser = (
  profile: Partial<CurrentUser> | Record<string, any>,
  fallback: Partial<CurrentUser> = {}
): CurrentUser => {
  const profileData = profile as Record<string, any>;
  const fallbackData = fallback as Record<string, any>;
  const firstName = profileData.firstName || profileData.first_name || fallbackData.firstName || '';
  const lastName = profileData.lastName || profileData.last_name || fallbackData.lastName || '';
  const fullName =
    profileData.fullName ||
    profileData.fullname ||
    profileData.full_name ||
    profileData.name ||
    [firstName, lastName].filter(Boolean).join(' ') ||
    fallbackData.fullName ||
    fallbackData.fullname ||
    fallbackData.name ||
    '';

  return {
    ...fallback,
    ...profile,
    id: profileData.id ?? fallbackData.id,
    pk: profileData.pk ?? fallbackData.pk,
    employee_id: profileData.employee_id ?? fallbackData.employee_id,
    employeeId: profileData.employeeId ?? profileData.employee_id ?? fallbackData.employeeId ?? fallbackData.employee_id,
    account_id: profileData.account_id ?? fallbackData.account_id,
    username: profileData.username || fallbackData.username || '',
    fullName,
    fullname: fullName,
    firstName,
    lastName,
    role: profileData.role || fallbackData.role || 'Administrator',
    email: profileData.email || fallbackData.email || '',
    contactNumber: formatSettingsPhoneNumber(profileData.contactNumber || profileData.contact_number || profileData.contactnumber || fallbackData.contactNumber || fallbackData.contact_number || ''),
    contact_number: formatSettingsPhoneNumber(profileData.contact_number || profileData.contactNumber || profileData.contactnumber || fallbackData.contact_number || fallbackData.contactNumber || ''),
    userImage: getSettingsProfileImage(profile) || getSettingsProfileImage(fallback),
    userimage: getSettingsProfileImage(profile) || getSettingsProfileImage(fallback),
    profileImage: getSettingsProfileImage(profile) || getSettingsProfileImage(fallback)
  };
};

const buildProfileFormFromUser = (user: CurrentUser, previousBranch = ''): ProfileForm => ({
  fullName: user.fullName || user.fullname || '',
  username: user.username || '',
  contactNumber: user.contactNumber || user.contact_number || '',
  role: user.role || '',
  branch: previousBranch,
  userImage: getSettingsProfileImage(user)
});

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Could not read the selected image.'));
      }
    };
    reader.onerror = () => reject(new Error('Could not read the selected image.'));
    reader.readAsDataURL(file);
  });

const getPasswordRequirementItems = (newPassword: string, currentPassword: string): PasswordRequirement[] => [
  {
    id: 'length',
    label: 'At least 8 characters',
    isMet: newPassword.length >= 8
  },
  {
    id: 'lowercase',
    label: 'At least one lowercase letter',
    isMet: /[a-z]/.test(newPassword)
  },
  {
    id: 'uppercase',
    label: 'At least one uppercase letter',
    isMet: /[A-Z]/.test(newPassword)
  },
  {
    id: 'number',
    label: 'At least one number',
    isMet: /\d/.test(newPassword)
  },
  {
    id: 'different',
    label: 'Different from the current password',
    isMet: Boolean(newPassword) && newPassword !== currentPassword
  }
];

const maskSettingsEmail = (email: string): string => {
  const trimmed = email.trim();
  const [localPart, domainPart] = trimmed.split('@');
  if (!localPart || !domainPart) {
    return 'selected email address';
  }

  const visiblePrefix = localPart.slice(0, Math.min(2, localPart.length));
  return `${visiblePrefix}${localPart.length > 2 ? '***' : '***'}@${domainPart}`;
};

const getSettingsAuditTarget = (user?: CurrentUser | null): string =>
  user?.username || user?.fullName || user?.fullname || user?.email || 'Current admin account';

const getSettingsAccountType = (user?: CurrentUser | null): 'employee' | 'patient' => {
  const role = String(user?.role || '').trim().toLowerCase();
  return role.includes('patient') || role.includes('owner') || role === 'user' ? 'patient' : 'employee';
};

const getProfileChangedFields = (currentUser: CurrentUser | null, nextProfile: ProfileForm): string[] => {
  if (!currentUser) {
    return ['profile details'];
  }

  const changes: string[] = [];
  const currentFullName = (currentUser.fullName || currentUser.fullname || '').trim();
  const currentUsername = (currentUser.username || '').trim();
  const currentContactNumber = formatSettingsPhoneNumber(currentUser.contactNumber || currentUser.contact_number || '');
  const nextContactNumber = formatSettingsPhoneNumber(nextProfile.contactNumber);
  const currentImage = getSettingsProfileImage(currentUser);

  if (currentFullName !== nextProfile.fullName.trim()) changes.push('full name');
  if (currentUsername !== nextProfile.username.trim()) changes.push('username');
  if (currentContactNumber !== nextContactNumber) changes.push('contact number');
  if (currentImage !== nextProfile.userImage) changes.push('profile image');

  return changes;
};

const toSafeSettingsError = (message?: string): string => {
  const cleanMessage = String(message || '').trim();
  if (!cleanMessage) return 'The request could not be completed.';
  return cleanMessage.replace(/\b\d{6}\b/g, '[otp]').slice(0, 180);
};

const summarizeServiceChanges = (previousService: ServiceItem, nextService: ServiceItem) => {
  const changes: string[] = [];

  if (previousService.name !== nextService.name) changes.push(`name changed from "${previousService.name}" to "${nextService.name}"`);
  if (previousService.category !== nextService.category) changes.push(`category changed from ${previousService.category} to ${nextService.category}`);
  if (previousService.status !== nextService.status) changes.push(`status changed from ${previousService.status} to ${nextService.status}`);
  if (previousService.price !== nextService.price) changes.push(`price changed from ${formatPeso(previousService.price)} to ${formatPeso(nextService.price)}`);
  if (previousService.description !== nextService.description) changes.push('description updated');

  return changes.length > 0 ? changes.join('; ') : 'Service details were reviewed with no field changes.';
};

export default function AdminSettingsPage({ settingsMode = 'admin' }: AdminSettingsPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const announcementImageInputRef = useRef<HTMLInputElement>(null);
  const isDoctorSettings = settingsMode === 'doctor' || location.pathname.startsWith('/doctor');
  const fallbackSettingsUser = useMemo<CurrentUser>(
    () => ({
      ...defaultSessionUser,
      role: isDoctorSettings ? 'Veterinarian' : 'Administrator'
    }),
    [isDoctorSettings]
  );
  const settingsHeroCopy = useMemo(() => ({
    eyebrow: isDoctorSettings ? 'Doctor Settings' : 'Admin Control Center',
    title: 'Manage account profile and security.',
    description: isDoctorSettings
      ? 'This Settings page focuses on your doctor profile details and security controls.'
      : 'This Settings page focuses on the account details and security controls needed for the current defense.',
    securityTitle: isDoctorSettings ? 'Protect the doctor account' : 'Protect the admin account'
  }), [isDoctorSettings]);

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState<ModalConfigType>({
    type: 'info',
    title: '',
    message: '',
    onConfirm: null,
    showCancel: false
  });

  const [activePanel, setActivePanel] = useState<SettingsPanel>('account');
  const [homepageTarget, setHomepageTarget] = useState<HomepageEditorTarget>('hero');

  const [profileForm, setProfileForm] = useState<ProfileForm>(initialProfileForm);
  const [passwordForm, setPasswordForm] = useState<PasswordForm>(initialPasswordForm);
  const [emailForm, setEmailForm] = useState<EmailForm>(initialEmailForm);
  const [services, setServices] = useState<ServiceItem[]>(billingBasedServices);
  const [serviceForm, setServiceForm] = useState<ServiceItem>(initialServiceForm);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>(mockAnnouncements);
  const [announcementForm, setAnnouncementForm] = useState<AnnouncementItem>(initialAnnouncementForm);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  const [homepageContent, setHomepageContent] = useState<HomepageContent>(initialHomepageContent);
  const [featureCards, setFeatureCards] = useState<FeatureCard[]>(initialFeatureCards);
  const [aboutCards, setAboutCards] = useState<AboutCard[]>(initialAboutCards);
  const [carouselImages, setCarouselImages] = useState<CarouselImage[]>(initialCarouselImages);
  const [branchLocations, setBranchLocations] = useState<BranchLocation[]>(initialBranchLocations);
  const [serviceCategoryOptions, setServiceCategoryOptions] = useState<string[]>(defaultServiceCategoryOptions);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');
  const [carouselIndex, setCarouselIndex] = useState(0);

  const [profileErrors, setProfileErrors] = useState<FieldErrors>({});
  const [passwordErrors, setPasswordErrors] = useState<FieldErrors>({});
  const [emailErrors, setEmailErrors] = useState<FieldErrors>({});
  const [serviceErrors, setServiceErrors] = useState<FieldErrors>({});
  const [categoryErrors, setCategoryErrors] = useState<FieldErrors>({});
  const [announcementErrors, setAnnouncementErrors] = useState<FieldErrors>({});
  const [homepageErrors, setHomepageErrors] = useState<FieldErrors>({});
  const [openServiceCategories, setOpenServiceCategories] = useState<Record<string, boolean>>({
    Consultation: true,
    Vaccinations: false,
    'Preventive Care': false,
    Diagnostics: false,
    Surgery: false,
    'Dental Prophylaxis': false,
    Grooming: false,
    Boarding: false,
    Confinement: false
  });

  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [selectedHomepageServiceId, setSelectedHomepageServiceId] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [emailOtpSending, setEmailOtpSending] = useState(false);
  const [emailVerifying, setEmailVerifying] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  const activePanelLabel = useMemo(() => {
    const labels: Record<typeof activePanel, string> = {
      account: 'Account',
      security: 'Security',
      developer: 'Developer Settings',
      homepage: 'Homepage Editor',
      announcements: 'Announcements'
    };
    return labels[activePanel];
  }, [activePanel]);

  useEffect(() => {
    let isMounted = true;

    const loadSettingsProfile = async () => {
      try {
        const session = localStorage.getItem('userSession');
        if (!session) {
          navigate('/Login');
          return;
        }

        const parsed = JSON.parse(session) as CurrentUser;
        const sessionUser = normalizeSettingsUser(parsed, fallbackSettingsUser);
        if (!isMounted) return;

        setCurrentUser(sessionUser);
        setProfileForm(buildProfileFormFromUser(sessionUser));
        setEmailForm(prev => ({
          ...prev,
          currentEmail: sessionUser.email || ''
        }));

        const userId = getSettingsUserId(sessionUser);
        if (!userId) return;

        const response = await apiService.getProfile(userId);
        const profilePayload = response?.user || response || {};
        const normalizedProfile = normalizeSettingsUser(profilePayload, sessionUser);
        const mergedSession = {
          ...parsed,
          ...profilePayload,
          id: normalizedProfile.id,
          pk: normalizedProfile.pk,
          employee_id: normalizedProfile.employee_id,
          employeeId: normalizedProfile.employeeId,
          account_id: normalizedProfile.account_id,
          username: normalizedProfile.username,
          fullName: normalizedProfile.fullName,
          fullname: normalizedProfile.fullName,
          firstName: normalizedProfile.firstName,
          lastName: normalizedProfile.lastName,
          contactNumber: normalizedProfile.contactNumber,
          contact_number: normalizedProfile.contact_number,
          role: normalizedProfile.role,
          email: normalizedProfile.email,
          profileImage: normalizedProfile.profileImage,
          userImage: normalizedProfile.userImage,
          userimage: normalizedProfile.userImage
        };

        localStorage.setItem('userSession', JSON.stringify(mergedSession));
        if (!isMounted) return;
        setCurrentUser(normalizedProfile);
        setProfileForm(prev => buildProfileFormFromUser(normalizedProfile, prev.branch));
        setEmailForm(prev => ({
          ...prev,
          currentEmail: normalizedProfile.email || ''
        }));
      } catch (error: any) {
        console.error('Failed to load settings profile', error);
        if (isMounted) {
          showAlert('error', 'Unable to Load Profile', error?.message || 'We could not load your latest profile information right now.');
        }
      } finally {
        if (isMounted) {
          setProfileLoading(false);
        }
      }
    };

    loadSettingsProfile();
    return () => {
      isMounted = false;
    };
  }, [fallbackSettingsUser, navigate]);

  useEffect(() => {
    if (!showFutureDefenseSettings && futureDefenseSettingsPanels.has(activePanel)) {
      setActivePanel('account');
    }
  }, [activePanel]);

  const homepageServicesPreview = useMemo(
    () => services.filter(service => service.status === 'Active').slice(0, 4),
    [services]
  );

  useEffect(() => {
    if (!selectedHomepageServiceId && homepageServicesPreview.length > 0) {
      setSelectedHomepageServiceId(homepageServicesPreview[0].id);
    }
  }, [homepageServicesPreview, selectedHomepageServiceId]);

  useEffect(() => {
    setCarouselIndex(current => Math.min(current, Math.max(0, carouselImages.length - 1)));
  }, [carouselImages.length]);

  const groupedServices = useMemo(() => {
    const searchLower = serviceSearchQuery.trim().toLowerCase();
    const grouped = services.reduce<Record<string, ServiceItem[]>>((acc, service) => {
      if (!acc[service.category]) acc[service.category] = [];
      acc[service.category].push(service);
      return acc;
    }, {});

    const groups = serviceCategoryOptions.map((category) => {
      const items = (grouped[category] || []).filter((service) => {
        if (!searchLower) return true;
        return (
          service.name.toLowerCase().includes(searchLower) ||
          service.description.toLowerCase().includes(searchLower) ||
          service.category.toLowerCase().includes(searchLower) ||
          service.status.toLowerCase().includes(searchLower)
        );
      });

      return {
      category,
        items: items.sort((a, b) => a.name.localeCompare(b.name))
      };
    });

    if (!searchLower) return groups;
    return groups.filter(group => group.items.length > 0);
  }, [serviceCategoryOptions, serviceSearchQuery, services]);

  const homepageTargetLabel = useMemo(() => {
    const labels: Record<HomepageEditorTarget, string> = {
      hero: 'Hero section',
      features: 'What you can do here',
      carousel: 'Clinic image carousel',
      services: 'Services section',
      'service-card': 'Homepage service card',
      branches: 'Branches section',
      about: 'About section',
      'about-card-1': 'About card one',
      'about-card-2': 'About card two'
    };
    return labels[homepageTarget];
  }, [homepageTarget]);

  const passwordRequirementItems = useMemo(
    () => getPasswordRequirementItems(passwordForm.newPassword, passwordForm.currentPassword),
    [passwordForm.currentPassword, passwordForm.newPassword]
  );

  const hasUnsavedAccountChanges = useMemo(
    () => Boolean(currentUser) && !profileLoading && getProfileChangedFields(currentUser, profileForm).length > 0,
    [currentUser, profileForm, profileLoading]
  );

  useBeforeUnload((event) => {
    if (!hasUnsavedAccountChanges) return;
    event.preventDefault();
    event.returnValue = '';
  });

  const showAlert = (
    type: 'info' | 'success' | 'error' | 'confirm',
    title: string,
    message: string | React.ReactNode,
    onConfirm: (() => void) | null = null,
    showCancel = false
  ) => {
    setModalConfig({ type, title, message, onConfirm, showCancel });
    setModalVisible(true);
  };

  const confirmAction = (title: string, message: string, onConfirm: () => void) => {
    showAlert('confirm', title, message, onConfirm, true);
  };

  const confirmLeaveUnsavedAccountChanges = (
    onProceed: () => void,
    message = 'You have unsaved changes. Are you sure you want to leave without saving?'
  ) => {
    if (!hasUnsavedAccountChanges) {
      onProceed();
      return;
    }

    showAlert('confirm', 'Unsaved Changes', message, onProceed, true);
  };

  const handleSettingsPanelChange = (nextPanel: SettingsPanel) => {
    if (nextPanel === activePanel) return;

    if (activePanel === 'account') {
      confirmLeaveUnsavedAccountChanges(
        () => setActivePanel(nextPanel),
        'You have unsaved changes. Are you sure you want to leave this page without saving?'
      );
      return;
    }

    setActivePanel(nextPanel);
  };

  const handleProtectedSettingsNavigation = (path: string, navigateFn: () => void) => {
    if (path === location.pathname) {
      navigateFn();
      return;
    }

    confirmLeaveUnsavedAccountChanges(
      navigateFn,
      'You have unsaved changes. Are you sure you want to leave this page without saving?'
    );
  };

  const handleLogoutPress = () => {
    const finishLogout = () => {
      localStorage.removeItem('userSession');
      setCurrentUser(null);
      navigate('/Login');
    };

    if (hasUnsavedAccountChanges) {
      showAlert('confirm', 'Unsaved Changes', 'You have unsaved changes. Are you sure you want to leave and log out?', finishLogout, true);
      return;
    }

    showAlert('confirm', 'Log Out', 'Are you sure you want to log out?', () => {
      finishLogout();
    }, true);
  };

  const validateProfile = () => {
    const errors: FieldErrors = {};
    const formattedContactNumber = formatSettingsPhoneNumber(profileForm.contactNumber);
    if (!profileForm.fullName.trim()) errors.fullName = 'Full name is required.';
    if (!profileForm.username.trim()) errors.username = 'Username is required.';
    if (!/^[a-z0-9._-]{4,}$/i.test(profileForm.username.trim())) errors.username = 'Use at least 4 letters, numbers, dots, or underscores.';
    if (!formattedContactNumber) errors.contactNumber = 'Contact number is required.';
    if (formattedContactNumber && !isValidSettingsPhoneNumber(formattedContactNumber)) {
      errors.contactNumber = 'Use a PH mobile number in +63 format, example +63 927 306 6923.';
    }
    if (!profileForm.userImage.trim()) errors.userImage = 'Profile image is required.';
    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validatePassword = () => {
    const errors: FieldErrors = {};
    if (!passwordForm.currentPassword) errors.currentPassword = 'Current password is required.';
    if (!passwordForm.newPassword) errors.newPassword = 'New password is required.';
    if (passwordForm.newPassword && passwordRequirementItems.some(requirement => !requirement.isMet)) {
      errors.newPassword = 'Complete all password requirements below.';
    }
    if (!passwordForm.confirmPassword) errors.confirmPassword = 'Please confirm the new password.';
    if (passwordForm.confirmPassword && passwordForm.confirmPassword !== passwordForm.newPassword) errors.confirmPassword = 'Passwords do not match.';
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateEmail = () => {
    const errors: FieldErrors = {};
    if (!emailForm.currentEmail.trim()) errors.currentEmail = 'Current email is required.';
    if (!emailForm.newEmail.trim()) errors.newEmail = 'New email is required.';
    if (emailForm.newEmail && !isValidEmail(emailForm.newEmail.trim())) errors.newEmail = 'Enter a valid email address.';
    if (!emailForm.confirmEmail.trim()) errors.confirmEmail = 'Please confirm the new email.';
    if (emailForm.confirmEmail && emailForm.confirmEmail.trim() !== emailForm.newEmail.trim()) errors.confirmEmail = 'Email addresses do not match.';
    if (emailForm.newEmail.trim() && emailForm.newEmail.trim() === emailForm.currentEmail.trim()) errors.newEmail = 'New email must be different from the current email.';
    setEmailErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateService = () => {
    const errors: FieldErrors = {};
    const numericPrice = Number(serviceForm.price);
    if (!serviceForm.category.trim()) errors.category = 'Category is required.';
    if (!serviceForm.name.trim()) errors.name = 'Service name is required.';
    if (!serviceForm.price.trim()) errors.price = 'Price is required.';
    if (serviceForm.price.trim() && (Number.isNaN(numericPrice) || numericPrice < 0)) errors.price = 'Use a valid money value like 0.00.';
    if (!serviceForm.description.trim()) errors.description = 'Description is required.';
    setServiceErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateAnnouncement = () => {
    const errors: FieldErrors = {};
    if (!announcementForm.title.trim()) errors.title = 'Announcement title is required.';
    if (!announcementForm.schedule.trim()) errors.schedule = 'Publish schedule is required.';
    if (announcementForm.displayType === 'Custom Announcement' && stripHtml(announcementForm.body).length < 12) errors.body = 'Message body is required.';
    if (announcementForm.displayType === 'Banner Upload' && !announcementForm.image) errors.image = 'Upload a banner image to preview on the website.';
    setAnnouncementErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateHomepage = () => {
    const errors: FieldErrors = {};
    if (!homepageContent.heroEyebrow.trim()) errors.heroEyebrow = 'Eyebrow label is required.';
    if (!homepageContent.heroTitle.trim()) errors.heroTitle = 'Hero title is required.';
    if (stripHtml(homepageContent.heroBody).length < 20) errors.heroBody = 'Hero body should be a bit more descriptive.';
    if (!homepageContent.servicesTitle.trim()) errors.servicesTitle = 'Services section title is required.';
    if (stripHtml(homepageContent.servicesIntro).length < 20) errors.servicesIntro = 'Services intro should be at least 20 characters.';
    if (stripHtml(homepageContent.branchesIntro).length < 20) errors.branchesIntro = 'Branches intro should be at least 20 characters.';
    if (!homepageContent.aboutTitle.trim()) errors.aboutTitle = 'About title is required.';
    if (stripHtml(homepageContent.aboutBody).length < 20) errors.aboutBody = 'About body should be at least 20 characters.';
    if (featureCards.some(card => !card.title.trim() || !card.text.trim())) errors.features = 'Each "What you can do here" card needs a title and description.';
    if (carouselImages.some(slide => !slide.title.trim() || !slide.caption.trim() || !slide.image.trim())) errors.carousel = 'Each carousel slide needs a title, caption, and image.';
    if (branchLocations.some(branch => !branch.name.trim() || !branch.address.trim() || !branch.hours.trim() || !branch.mapsUrl.trim() || !branch.image.trim())) errors.branches = 'Each branch needs a name, address, hours, map link, and image.';
    if (aboutCards.some(card => !card.title.trim() || stripHtml(card.body).length < 10)) errors.aboutCards = 'Each about card needs a title and description.';
    setHomepageErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProfileSave = () => {
    if (!validateProfile()) return;
    const userId = getSettingsUserId(currentUser);
    if (!userId) {
      showAlert('error', 'Unable to Save', 'Could not find your user session. Please log in again.');
      return;
    }

    confirmAction('Save profile changes', 'Save these account profile changes?', async () => {
      const { firstName, lastName } = splitSettingsFullName(profileForm.fullName);
      const formattedContactNumber = formatSettingsPhoneNumber(profileForm.contactNumber);
      const nextProfile = {
        ...profileForm,
        contactNumber: formattedContactNumber
      };
      const changedFields = getProfileChangedFields(currentUser, nextProfile);
      try {
        setProfileSaving(true);
        const response = await apiService.updateProfile(userId, {
          username: profileForm.username.trim(),
          firstName,
          lastName,
          contactNumber: formattedContactNumber,
          userImage: profileForm.userImage || undefined,
          accountType: getSettingsAccountType(currentUser)
        });
        const responsePayload = response?.user || response || {};
        const normalizedProfile = normalizeSettingsUser(
          {
            ...currentUser,
            ...responsePayload,
            username: profileForm.username.trim(),
            fullName: profileForm.fullName.trim(),
            firstName,
            lastName,
            contactNumber: formattedContactNumber,
            userImage: profileForm.userImage
          },
          currentUser || fallbackSettingsUser
        );
        const rawSession = localStorage.getItem('userSession');
        const existingSession = rawSession ? JSON.parse(rawSession) : {};
        const mergedSession = {
          ...existingSession,
          ...responsePayload,
          username: normalizedProfile.username,
          fullName: normalizedProfile.fullName,
          fullname: normalizedProfile.fullName,
          employee_id: normalizedProfile.employee_id,
          employeeId: normalizedProfile.employeeId,
          account_id: normalizedProfile.account_id,
          firstName: normalizedProfile.firstName,
          lastName: normalizedProfile.lastName,
          contactNumber: normalizedProfile.contactNumber,
          contact_number: normalizedProfile.contact_number,
          role: normalizedProfile.role,
          email: normalizedProfile.email,
          profileImage: normalizedProfile.profileImage,
          userImage: normalizedProfile.userImage,
          userimage: normalizedProfile.userImage
        };

        localStorage.setItem('userSession', JSON.stringify(mergedSession));
        setCurrentUser(normalizedProfile);
        setProfileForm(prev => buildProfileFormFromUser(normalizedProfile, prev.branch));
        setProfileErrors({});
        recordSettingsAuditLog({
          module: 'Settings',
          event: 'Account Profile Updated',
          target: getSettingsAuditTarget(normalizedProfile),
          summary: changedFields.length > 0
            ? `Account profile was updated: ${changedFields.join(', ')}.`
            : 'Account profile was saved with no visible field changes.',
          status: 'Success'
        }, normalizedProfile);
        showAlert('success', 'Profile Updated', 'Your account profile has been saved.');
      } catch (error: any) {
        console.error('Failed to update settings profile', error);
        const message = toSafeSettingsError(error?.message || 'Failed to save profile changes. Please try again.');
        recordSettingsAuditLog({
          module: 'Settings',
          event: 'Account Profile Update Failed',
          target: getSettingsAuditTarget(currentUser),
          summary: `Account profile update failed: ${message}`,
          status: 'Failed'
        }, currentUser);
        showAlert('error', 'Unable to Save Profile', message);
      } finally {
        setProfileSaving(false);
      }
    });
  };

  const handlePasswordSave = () => {
    if (!validatePassword()) return;
    const userId = getSettingsUserId(currentUser);
    if (!userId) {
      showAlert('error', 'Unable to Update Password', 'Could not find your user session. Please log in again.');
      return;
    }

    confirmAction('Update password', 'Apply this password change?', async () => {
      try {
        setPasswordSaving(true);
        await apiService.changeAuthenticatedPassword(userId, {
          current_password: passwordForm.currentPassword,
          new_password: passwordForm.newPassword
        });
        setPasswordForm(initialPasswordForm);
        setPasswordErrors({});
        recordSettingsAuditLog({
          module: 'Settings',
          event: 'Password Changed',
          target: getSettingsAuditTarget(currentUser),
          summary: 'Account password was changed from Settings. Password values were not logged.',
          status: 'Success'
        }, currentUser);
        showAlert('success', 'Password Updated', 'Password changed successfully.');
      } catch (error: any) {
        const message = toSafeSettingsError(error?.message || 'Failed to change password. Please try again.');
        if (message.toLowerCase().includes('current password')) {
          setPasswordErrors({ currentPassword: message });
        } else {
          setPasswordErrors({ newPassword: message });
        }
        recordSettingsAuditLog({
          module: 'Settings',
          event: 'Password Change Failed',
          target: getSettingsAuditTarget(currentUser),
          summary: `Password change failed: ${message}`,
          status: 'Failed'
        }, currentUser);
        showAlert('error', 'Unable to Update Password', message);
      } finally {
        setPasswordSaving(false);
      }
    });
  };

  const handleEmailSubmit = () => {
    if (!validateEmail()) return;
    const nextEmail = emailForm.newEmail.trim();
    const userId = getSettingsUserId(currentUser);
    if (!userId) {
      showAlert('error', 'Unable to Send OTP', 'Could not find your user session. Please log in again.');
      return;
    }

    confirmAction('Send OTP', `Send an OTP to ${nextEmail}?`, async () => {
      try {
        setEmailOtpSending(true);
        await apiService.requestEmailChangeOtp(userId, { newEmail: nextEmail });
        setPendingEmail(nextEmail);
        setOtpCode('');
        setOtpError('');
        setEmailErrors({});
        setShowOtpModal(true);
        recordSettingsAuditLog({
          module: 'Settings',
          event: 'Email Change OTP Requested',
          target: getSettingsAuditTarget(currentUser),
          summary: `Email change OTP was requested for ${maskSettingsEmail(nextEmail)}.`,
          status: 'Success'
        }, currentUser);
      } catch (error: any) {
        const message = toSafeSettingsError(error?.message || 'Unable to send OTP. Please try again.');
        setEmailErrors({ newEmail: message });
        recordSettingsAuditLog({
          module: 'Settings',
          event: 'Email Change OTP Request Failed',
          target: getSettingsAuditTarget(currentUser),
          summary: `Email change OTP request for ${maskSettingsEmail(nextEmail)} failed: ${message}`,
          status: 'Failed'
        }, currentUser);
        showAlert('error', 'Unable to Send OTP', message);
      } finally {
        setEmailOtpSending(false);
      }
    });
  };

  const handleOtpVerify = async () => {
    if (!/^\d{6}$/.test(otpCode.trim())) {
      setOtpError('Enter the 6-digit OTP sent to the new email address.');
      return;
    }
    const userId = getSettingsUserId(currentUser);
    if (!userId) {
      setOtpError('Could not find your user session. Please log in again.');
      return;
    }

    try {
      setEmailVerifying(true);
      const response = await apiService.verifyEmailChangeOtp(userId, {
        newEmail: pendingEmail,
        otp: otpCode.trim()
      });
      const responsePayload = response?.user || response || {};
      const normalizedProfile = normalizeSettingsUser(
        {
          ...currentUser,
          ...responsePayload,
          email: pendingEmail
        },
        currentUser || fallbackSettingsUser
      );
      const rawSession = localStorage.getItem('userSession');
      const existingSession = rawSession ? JSON.parse(rawSession) : {};
      localStorage.setItem('userSession', JSON.stringify({
        ...existingSession,
        ...responsePayload,
        email: pendingEmail,
        employee_id: normalizedProfile.employee_id,
        employeeId: normalizedProfile.employeeId,
        account_id: normalizedProfile.account_id
      }));
      setCurrentUser(normalizedProfile);
      setProfileForm(prev => buildProfileFormFromUser(normalizedProfile, prev.branch));
      setShowOtpModal(false);
      setEmailForm({
        currentEmail: pendingEmail,
        newEmail: '',
        confirmEmail: ''
      });
      setEmailErrors({});
      recordSettingsAuditLog({
        module: 'Settings',
        event: 'Email Changed',
        target: getSettingsAuditTarget(normalizedProfile),
        summary: `Account email was changed to ${maskSettingsEmail(pendingEmail)} after OTP verification.`,
        status: 'Success'
      }, normalizedProfile);
      showAlert('success', 'Email Updated', `${pendingEmail} is now the active account email.`);
    } catch (error: any) {
      const message = toSafeSettingsError(error?.message || 'Unable to verify OTP. Please try again.');
      recordSettingsAuditLog({
        module: 'Settings',
        event: 'Email Change Verification Failed',
        target: getSettingsAuditTarget(currentUser),
        summary: `Email change verification for ${maskSettingsEmail(pendingEmail)} failed: ${message}`,
        status: 'Failed'
      }, currentUser);
      if (message.toLowerCase().includes('otp') || message.toLowerCase().includes('code')) {
        setOtpError(message);
      } else {
        setEmailErrors({ newEmail: message });
        setShowOtpModal(false);
        showAlert('error', 'Unable to Update Email', message);
      }
    } finally {
      setEmailVerifying(false);
    }
  };

  const handleImagePick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    confirmAction('Upload profile photo', 'Upload and save this image as the account profile photo?', async () => {
      try {
        const userId = getSettingsUserId(currentUser);
        if (!userId) {
          throw new Error('Could not find your user session. Please log in again.');
        }

        setImageUploading(true);
        const dataUrl = await readFileAsDataUrl(file);
        const fileBase64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
        const uploadResponse = await apiService.uploadProfilePhoto(fileBase64, file.name, file.type || 'image/jpeg');
        const uploadedPhotoUrl = uploadResponse?.photoUrl;
        if (!uploadedPhotoUrl) {
          throw new Error('Profile photo upload did not return an image URL.');
        }

        const saveResponse = await apiService.updateProfile(userId, {
          userImage: uploadedPhotoUrl,
          profileImage: uploadedPhotoUrl,
          accountType: getSettingsAccountType(currentUser)
        });
        const responsePayload = saveResponse?.user || saveResponse || {};
        const normalizedProfile = normalizeSettingsUser(
          {
            ...currentUser,
            ...responsePayload,
            userImage: uploadedPhotoUrl,
            userimage: uploadedPhotoUrl,
            profileImage: uploadedPhotoUrl,
            employee_image: uploadedPhotoUrl
          },
          currentUser || fallbackSettingsUser
        );
        const rawSession = localStorage.getItem('userSession');
        const existingSession = rawSession ? JSON.parse(rawSession) : {};
        const mergedSession = {
          ...existingSession,
          ...responsePayload,
          username: normalizedProfile.username,
          fullName: normalizedProfile.fullName,
          fullname: normalizedProfile.fullName,
          employee_id: normalizedProfile.employee_id,
          employeeId: normalizedProfile.employeeId,
          account_id: normalizedProfile.account_id,
          firstName: normalizedProfile.firstName,
          lastName: normalizedProfile.lastName,
          contactNumber: normalizedProfile.contactNumber,
          contact_number: normalizedProfile.contact_number,
          role: normalizedProfile.role,
          email: normalizedProfile.email,
          profileImage: uploadedPhotoUrl,
          userImage: uploadedPhotoUrl,
          userimage: uploadedPhotoUrl,
          employee_image: uploadedPhotoUrl
        };

        localStorage.setItem('userSession', JSON.stringify(mergedSession));
        setProfileForm(prev => buildProfileFormFromUser(normalizedProfile, prev.branch));
        setCurrentUser(normalizedProfile);
        setProfileErrors(prev => {
          const nextErrors = { ...prev };
          delete nextErrors.userImage;
          return nextErrors;
        });
        recordSettingsAuditLog({
          module: 'Settings',
          event: 'Profile Photo Updated',
          target: getSettingsAuditTarget(normalizedProfile),
          summary: 'A new profile photo was uploaded and saved to the account from Settings.',
          status: 'Success'
        }, normalizedProfile);
        showAlert('success', 'Photo Saved', 'Your profile photo has been saved to your account.');
      } catch (error: any) {
        console.error('Failed to upload settings profile image', error);
        const message = toSafeSettingsError(error?.message || 'We could not upload your profile picture right now.');
        recordSettingsAuditLog({
          module: 'Settings',
          event: 'Profile Photo Upload Failed',
          target: getSettingsAuditTarget(currentUser),
          summary: `Profile photo upload failed: ${message}`,
          status: 'Failed'
        }, currentUser);
        showAlert('error', 'Unable to Upload Photo', message);
      } finally {
        setImageUploading(false);
      }
    });
    event.currentTarget.value = '';
  };

  const handleAnnouncementImagePick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const imageValue = typeof reader.result === 'string' ? reader.result : '';
      confirmAction('Update announcement image', 'Use this image for the announcement preview?', () => {
        setAnnouncementForm(prev => ({ ...prev, image: imageValue }));
      });
    };
    reader.readAsDataURL(file);
    event.currentTarget.value = '';
  };

  const handleCarouselImagePick = (event: React.ChangeEvent<HTMLInputElement>, slideId: string) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const imageValue = typeof reader.result === 'string' ? reader.result : '';
      confirmAction('Update carousel image', 'Use this image for the selected carousel slide?', () => {
        const targetSlide = carouselImages.find(slide => slide.id === slideId);
        setCarouselImages(prev => prev.map(slide => slide.id === slideId ? { ...slide, image: imageValue } : slide));
        recordSettingsAuditLog({
          module: 'Settings',
          event: 'Homepage Carousel Image Updated',
          target: targetSlide?.title || 'Carousel image',
          summary: targetSlide ? `${targetSlide.title} image artwork was updated in the homepage carousel.` : 'A homepage carousel image artwork was updated.',
          status: 'Success'
        }, currentUser);
      });
    };
    reader.readAsDataURL(file);
    event.currentTarget.value = '';
  };

  const handleBranchImagePick = (event: React.ChangeEvent<HTMLInputElement>, branchId: string) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const imageValue = typeof reader.result === 'string' ? reader.result : '';
      confirmAction('Update branch image', 'Use this image for the selected branch?', () => {
        const targetBranch = branchLocations.find(branch => branch.id === branchId);
        setBranchLocations(prev => prev.map(branch => branch.id === branchId ? { ...branch, image: imageValue } : branch));
        recordSettingsAuditLog({
          module: 'Settings',
          event: 'Homepage Branch Image Updated',
          target: targetBranch?.name || 'Branch image',
          summary: targetBranch ? `${targetBranch.name} image artwork was updated in the homepage branch section.` : 'A homepage branch image artwork was updated.',
          status: 'Success'
        }, currentUser);
      });
    };
    reader.readAsDataURL(file);
    event.currentTarget.value = '';
  };

  const resetServiceForm = () => {
    setServiceForm(initialServiceForm);
    setEditingServiceId(null);
    setServiceErrors({});
  };

  const handleResetServiceForm = () => {
    confirmAction('Clear service form', 'Clear the current service form values?', resetServiceForm);
  };

  const sanitizeMoneyValue = (value: string) => {
    const numericOnly = value.replace(/[^\d.]/g, '');
    const [wholeRaw, ...decimalParts] = numericOnly.split('.');
    const whole = wholeRaw || '';
    const decimal = decimalParts.join('').slice(0, 2);
    return numericOnly.includes('.') ? `${whole}.${decimal}` : whole;
  };

  const handleServicePriceChange = (value: string) => {
    setServiceForm(prev => ({
      ...prev,
      price: sanitizeMoneyValue(value)
    }));
  };

  const handleServicePriceBlur = () => {
    if (!serviceForm.price.trim()) return;
    const numericPrice = Number(serviceForm.price);
    if (Number.isNaN(numericPrice)) return;
    setServiceForm(prev => ({
      ...prev,
      price: numericPrice.toFixed(2)
    }));
  };

  const handleServiceCategoryChange = (category: string) => {
    setServiceForm(prev => ({
      ...prev,
      category
    }));
  };

  const handleAddCategory = () => {
    const nextCategory = newCategoryName.trim();
    const errors: FieldErrors = {};

    if (!nextCategory) {
      errors.newCategoryName = 'Category name is required.';
    } else if (serviceCategoryOptions.some(option => option.toLowerCase() === nextCategory.toLowerCase())) {
      errors.newCategoryName = 'This category already exists.';
    }

    setCategoryErrors(errors);
    if (Object.keys(errors).length > 0) return;

    confirmAction('Add service category', `Add ${nextCategory} to the service category list?`, () => {
      setServiceCategoryOptions(prev => [...prev, nextCategory].sort((a, b) => a.localeCompare(b)));
      setOpenServiceCategories(prev => ({ ...prev, [nextCategory]: true }));
      setServiceForm(prev => ({ ...prev, category: nextCategory }));
      recordSettingsAuditLog({
        module: 'Settings',
        event: 'Service Category Added',
        target: nextCategory,
        summary: `${nextCategory} was added to the Developer Settings service categories.`,
        status: 'Success'
      }, currentUser);
      setNewCategoryName('');
      setCategoryErrors({});
      showAlert('success', 'Category added', `${nextCategory} is now available in the service category list.`);
    });
  };

  const toggleServiceCategory = (category: string) => {
    setOpenServiceCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const handleHomepageServiceEdit = (service: ServiceItem) => {
    setSelectedHomepageServiceId(service.id);
    setHomepageTarget('service-card');
  };

  const moveCarousel = (direction: 'previous' | 'next') => {
    if (carouselImages.length === 0) return;
    setCarouselIndex(current => {
      const offset = direction === 'next' ? 1 : -1;
      return (current + offset + carouselImages.length) % carouselImages.length;
    });
  };

  const handleServiceSave = () => {
    if (!validateService()) return;
    confirmAction(editingServiceId ? 'Save service changes' : 'Add service', editingServiceId ? 'Save changes to this service?' : 'Add this service to the list?', () => {
      if (editingServiceId) {
        const previousService = services.find(item => item.id === editingServiceId);
        const updatedService = { ...serviceForm, id: editingServiceId };
        setServices(prev => prev.map(item => (item.id === editingServiceId ? updatedService : item)));
        recordSettingsAuditLog({
          module: 'Settings',
          event: previousService?.price !== updatedService.price ? 'Service Price Changed' : 'Service Updated',
          target: updatedService.name,
          summary: previousService ? summarizeServiceChanges(previousService, updatedService) : `${updatedService.name} was updated in Developer Settings.`,
          status: previousService?.price !== updatedService.price ? 'Warning' : 'Success'
        }, currentUser);
        showAlert('success', 'Service updated', 'The selected billing-based service has been updated in this preview.');
      } else {
        const newService = { ...serviceForm, id: `svc-${Date.now()}` };
        setServices(prev => [newService, ...prev]);
        recordSettingsAuditLog({
          module: 'Settings',
          event: 'Service Added',
          target: newService.name,
          summary: `${newService.name} was added under ${newService.category} at ${formatPeso(newService.price)} with ${newService.status.toLowerCase()} status.`,
          status: 'Success'
        }, currentUser);
        showAlert('success', 'Service added', 'A new service row has been added to the developer settings list.');
      }
      resetServiceForm();
    });
  };

  const handleEditService = (service: ServiceItem) => {
    setEditingServiceId(service.id);
    setServiceForm(service);
    setActivePanel('developer');
  };

  const handleDeleteService = (serviceId: string) => {
    const deletedService = services.find(item => item.id === serviceId);
    showAlert('confirm', 'Delete service', 'Remove this service from the mock settings list?', () => {
      setServices(prev => prev.filter(item => item.id !== serviceId));
      recordSettingsAuditLog({
        module: 'Settings',
        event: 'Service Deleted',
        target: deletedService?.name || 'Service record',
        summary: deletedService ? `${deletedService.name} was removed from ${deletedService.category}. Last listed price was ${formatPeso(deletedService.price)}.` : 'A service record was removed from Developer Settings.',
        status: 'Warning'
      }, currentUser);
      if (editingServiceId === serviceId) resetServiceForm();
    }, true);
  };

  const resetAnnouncementForm = () => {
    setAnnouncementForm(initialAnnouncementForm);
    setEditingAnnouncementId(null);
    setAnnouncementErrors({});
  };

  const handleResetAnnouncementForm = () => {
    confirmAction('Clear announcement form', 'Clear the current announcement draft fields?', resetAnnouncementForm);
  };

  const handleAnnouncementSave = () => {
    if (!validateAnnouncement()) return;
    confirmAction(editingAnnouncementId ? 'Save announcement changes' : 'Create announcement', editingAnnouncementId ? 'Save changes to this homepage announcement?' : 'Create this homepage announcement?', () => {
      if (editingAnnouncementId) {
        setAnnouncements(prev => prev.map(item => (item.id === editingAnnouncementId ? { ...announcementForm, id: editingAnnouncementId } : item)));
        recordSettingsAuditLog({
          module: 'Settings',
          event: 'Homepage Announcement Updated',
          target: announcementForm.title,
          summary: `${announcementForm.title} was updated for ${announcementForm.channel} with ${announcementForm.status.toLowerCase()} status.`,
          status: 'Success'
        }, currentUser);
        showAlert('success', 'Announcement updated', 'The homepage announcement has been updated in this preview.');
      } else {
        const newAnnouncement = { ...announcementForm, id: `ann-${Date.now()}` };
        setAnnouncements(prev => [newAnnouncement, ...prev]);
        recordSettingsAuditLog({
          module: 'Settings',
          event: 'Homepage Announcement Created',
          target: newAnnouncement.title,
          summary: `${newAnnouncement.title} was created for ${newAnnouncement.channel} with ${newAnnouncement.status.toLowerCase()} status.`,
          status: 'Success'
        }, currentUser);
        showAlert('success', 'Announcement drafted', 'A new homepage announcement has been added to the publishing queue.');
      }
      resetAnnouncementForm();
    });
  };

  const handleEditAnnouncement = (announcement: AnnouncementItem) => {
    setEditingAnnouncementId(announcement.id);
    setAnnouncementForm(announcement);
    setActivePanel('announcements');
  };

  const handleDeleteAnnouncement = (announcementId: string) => {
    const deletedAnnouncement = announcements.find(item => item.id === announcementId);
    showAlert('confirm', 'Delete announcement', 'Remove this announcement from the mock publishing queue?', () => {
      setAnnouncements(prev => prev.filter(item => item.id !== announcementId));
      recordSettingsAuditLog({
        module: 'Settings',
        event: 'Homepage Announcement Deleted',
        target: deletedAnnouncement?.title || 'Homepage announcement',
        summary: deletedAnnouncement ? `${deletedAnnouncement.title} was removed from the ${deletedAnnouncement.channel} publishing queue.` : 'A homepage announcement was removed from the publishing queue.',
        status: 'Warning'
      }, currentUser);
      if (editingAnnouncementId === announcementId) resetAnnouncementForm();
    }, true);
  };

  const handleHomepageSave = () => {
    if (!validateHomepage()) return;
    confirmAction('Save homepage draft', 'Save these homepage editor changes?', () => {
      recordSettingsAuditLog({
        module: 'Settings',
        event: 'Homepage Draft Saved',
        target: homepageTargetLabel,
        summary: `Homepage editor changes were saved from the ${homepageTargetLabel.toLowerCase()} panel.`,
        status: 'Success'
      }, currentUser);
      showAlert('success', 'Homepage draft updated', 'Homepage content passed validation and the preview has been refreshed.');
    });
  };

  const handleRemoveFeatureCard = (cardId: string) => {
    const removedCard = featureCards.find(item => item.id === cardId);
    confirmAction('Remove feature card', 'Remove this feature card from the homepage preview?', () => {
      setFeatureCards(prev => prev.filter(item => item.id !== cardId));
      recordSettingsAuditLog({
        module: 'Settings',
        event: 'Homepage Feature Removed',
        target: removedCard?.title || 'Feature card',
        summary: removedCard ? `${removedCard.title} was removed from the homepage feature cards.` : 'A homepage feature card was removed.',
        status: 'Warning'
      }, currentUser);
    });
  };

  const handleAddFeatureCard = () => {
    confirmAction('Add feature card', 'Add a new feature card to the homepage preview?', () => {
      const newCard = { id: `feature-${Date.now()}`, title: 'New Feature Card', text: 'Write a short description for this homepage action.' };
      setFeatureCards(prev => [...prev, newCard]);
      recordSettingsAuditLog({
        module: 'Settings',
        event: 'Homepage Feature Added',
        target: newCard.title,
        summary: 'A new homepage feature card was added to the preview.',
        status: 'Success'
      }, currentUser);
    });
  };

  const handleRemoveCarouselImage = (slideId: string) => {
    const removedSlide = carouselImages.find(item => item.id === slideId);
    confirmAction('Remove carousel image', 'Remove this image from the clinic carousel?', () => {
      setCarouselImages(prev => prev.filter(item => item.id !== slideId));
      recordSettingsAuditLog({
        module: 'Settings',
        event: 'Homepage Carousel Image Removed',
        target: removedSlide?.title || 'Carousel image',
        summary: removedSlide ? `${removedSlide.title} was removed from the homepage clinic carousel.` : 'A homepage carousel image was removed.',
        status: 'Warning'
      }, currentUser);
    });
  };

  const handleAddCarouselImage = () => {
    confirmAction('Add carousel image', 'Add a new image slot to the clinic carousel?', () => {
      const newSlide = { id: `clinic-slide-${Date.now()}`, title: 'New Clinic Image', caption: 'Write a short caption for this clinic photo.', image: heroImg };
      setCarouselImages(prev => [...prev, newSlide]);
      recordSettingsAuditLog({
        module: 'Settings',
        event: 'Homepage Carousel Image Added',
        target: newSlide.title,
        summary: 'A new image slot was added to the homepage clinic carousel.',
        status: 'Success'
      }, currentUser);
    });
  };

  const handleRemoveBranch = (branchId: string) => {
    const removedBranch = branchLocations.find(item => item.id === branchId);
    confirmAction('Remove branch', 'Remove this branch from the homepage preview?', () => {
      setBranchLocations(prev => prev.filter(item => item.id !== branchId));
      recordSettingsAuditLog({
        module: 'Settings',
        event: 'Homepage Branch Removed',
        target: removedBranch?.name || 'Branch section',
        summary: removedBranch ? `${removedBranch.name} was removed from the homepage branch list.` : 'A homepage branch section was removed.',
        status: 'Warning'
      }, currentUser);
    });
  };

  const handleAddBranch = () => {
    confirmAction('Add branch', 'Add a new branch section to the homepage preview?', () => {
      const newBranch = { id: `branch-${Date.now()}`, name: 'New PetShield Branch', address: 'Add the branch address here.', hours: 'Add clinic hours here.', mapsUrl: createGoogleMapsSearchUrl('PetShield branch'), image: branchLPImg };
      setBranchLocations(prev => [...prev, newBranch]);
      recordSettingsAuditLog({
        module: 'Settings',
        event: 'Homepage Branch Added',
        target: newBranch.name,
        summary: 'A new branch section was added to the homepage preview.',
        status: 'Success'
      }, currentUser);
    });
  };

  const renderHomepageEditorPane = () => {
    if (homepageTarget === 'hero') {
      return (
        <div className="settingsEditorStack">
          <div className="settingsFormField">
            <label>Hero Eyebrow</label>
            <input className={`settingsInput ${homepageErrors.heroEyebrow ? 'hasError' : ''}`} value={homepageContent.heroEyebrow} onChange={(e) => setHomepageContent(prev => ({ ...prev, heroEyebrow: e.target.value }))} />
            {homepageErrors.heroEyebrow && <small className="settingsErrorText">{homepageErrors.heroEyebrow}</small>}
          </div>
          <div className="settingsFormField">
            <label>Hero Title</label>
            <input className={`settingsInput ${homepageErrors.heroTitle ? 'hasError' : ''}`} value={homepageContent.heroTitle} onChange={(e) => setHomepageContent(prev => ({ ...prev, heroTitle: e.target.value }))} />
            {homepageErrors.heroTitle && <small className="settingsErrorText">{homepageErrors.heroTitle}</small>}
          </div>
          <div className="settingsFormField">
            <RichTextEditor value={homepageContent.heroBody} onChange={(value) => setHomepageContent(prev => ({ ...prev, heroBody: value }))} placeholder="Write the hero supporting copy..." rows={5} label="Hero Body" />
            {homepageErrors.heroBody && <small className="settingsErrorText">{homepageErrors.heroBody}</small>}
          </div>
        </div>
      );
    }

    if (homepageTarget === 'features') {
      return (
        <div className="settingsEditorStack">
          {featureCards.map((card, index) => (
            <div key={card.id} className="settingsMiniEditorCard">
              <div className="settingsMiniEditorHeader">
                <strong>Feature Card {index + 1}</strong>
                <button className="settingsGhostBtn" onClick={() => handleRemoveFeatureCard(card.id)} disabled={featureCards.length <= 1}>
                  <IoTrashOutline size={14} />
                  <span>Remove</span>
                </button>
              </div>
              <div className="settingsFormField">
                <label>Title</label>
                <input className="settingsInput" value={card.title} onChange={(e) => setFeatureCards(prev => prev.map(item => item.id === card.id ? { ...item, title: e.target.value } : item))} />
              </div>
              <div className="settingsFormField">
                <label>Description</label>
                <textarea className="settingsInput settingsTextarea" value={card.text} onChange={(e) => setFeatureCards(prev => prev.map(item => item.id === card.id ? { ...item, text: e.target.value } : item))} />
              </div>
            </div>
          ))}
          <button className="settingsGhostBtn settingsWideBtn" onClick={handleAddFeatureCard}>
            <IoAddOutline size={16} />
            <span>Add Feature Card</span>
          </button>
          {homepageErrors.features && <small className="settingsErrorText">{homepageErrors.features}</small>}
        </div>
      );
    }

    if (homepageTarget === 'services') {
      return (
        <div className="settingsEditorStack">
          <div className="settingsFormField">
            <label>Services Section Title</label>
            <input className={`settingsInput ${homepageErrors.servicesTitle ? 'hasError' : ''}`} value={homepageContent.servicesTitle} onChange={(e) => setHomepageContent(prev => ({ ...prev, servicesTitle: e.target.value }))} />
            {homepageErrors.servicesTitle && <small className="settingsErrorText">{homepageErrors.servicesTitle}</small>}
          </div>
          <div className="settingsFormField">
            <RichTextEditor value={homepageContent.servicesIntro} onChange={(value) => setHomepageContent(prev => ({ ...prev, servicesIntro: value }))} placeholder="Describe the services section..." rows={4} label="Services Intro" />
            {homepageErrors.servicesIntro && <small className="settingsErrorText">{homepageErrors.servicesIntro}</small>}
          </div>
          <div className="settingsInlineNotice">
            <IoPricetagOutline size={18} />
            <span>Service cards in the homepage preview are pulled from the Billing-based service catalog. Use the individual card edit buttons to adjust each preview card as plain text fields.</span>
          </div>
        </div>
      );
    }

    if (homepageTarget === 'carousel') {
      return (
        <div className="settingsEditorStack">
          {carouselImages.map((slide, index) => (
            <div key={slide.id} className="settingsMiniEditorCard">
              <div className="settingsMiniEditorHeader">
                <strong>Carousel Image {index + 1}</strong>
                <button className="settingsGhostBtn" onClick={() => handleRemoveCarouselImage(slide.id)} disabled={carouselImages.length <= 1}>
                  <IoTrashOutline size={14} />
                  <span>Remove</span>
                </button>
              </div>
              <img src={slide.image} alt={slide.title || `Clinic carousel image ${index + 1}`} className="settingsEditorImagePreview" />
              <button type="button" className="settingsGhostBtn settingsWideBtn" onClick={() => document.getElementById(`carousel-upload-${slide.id}`)?.click()}>
                <IoImageOutline size={16} />
                <span>Change Image</span>
              </button>
              <input id={`carousel-upload-${slide.id}`} type="file" accept="image/*" className="settingsHiddenFileInput" onChange={(event) => handleCarouselImagePick(event, slide.id)} />
              <div className="settingsFormField">
                <label>Image Title</label>
                <input className="settingsInput" value={slide.title} onChange={(e) => setCarouselImages(prev => prev.map(item => item.id === slide.id ? { ...item, title: e.target.value } : item))} />
              </div>
              <div className="settingsFormField">
                <label>Caption</label>
                <textarea className="settingsInput settingsTextarea" value={slide.caption} onChange={(e) => setCarouselImages(prev => prev.map(item => item.id === slide.id ? { ...item, caption: e.target.value } : item))} />
              </div>
            </div>
          ))}
          <button className="settingsGhostBtn settingsWideBtn" onClick={handleAddCarouselImage}>
            <IoAddOutline size={16} />
            <span>Add Carousel Image</span>
          </button>
          {homepageErrors.carousel && <small className="settingsErrorText">{homepageErrors.carousel}</small>}
        </div>
      );
    }

    if (homepageTarget === 'service-card') {
      const targetService = homepageServicesPreview.find(service => service.id === selectedHomepageServiceId) || homepageServicesPreview[0];

      if (!targetService) {
        return (
          <div className="settingsInlineNotice">
            <IoPricetagOutline size={18} />
            <span>No active homepage services are available to edit yet.</span>
          </div>
        );
      }

      return (
        <div className="settingsEditorStack">
          <div className="settingsInlineNotice">
            <IoPricetagOutline size={18} />
            <span>This editor treats homepage service cards as simple text fields without redirecting you to Developer Settings.</span>
          </div>
          <div className="settingsFormField">
            <label>Service Card Title</label>
            <input
              className="settingsInput"
              value={targetService.name}
              onChange={(e) => setServices(prev => prev.map(service => service.id === targetService.id ? { ...service, name: e.target.value } : service))}
            />
          </div>
          <div className="settingsFormField">
            <label>Service Card Description</label>
            <textarea
              className="settingsInput settingsTextarea"
              value={targetService.description}
              onChange={(e) => setServices(prev => prev.map(service => service.id === targetService.id ? { ...service, description: e.target.value } : service))}
            />
          </div>
        </div>
      );
    }

    if (homepageTarget === 'branches') {
      return (
        <div className="settingsEditorStack">
          <div className="settingsFormField">
            <RichTextEditor
              value={homepageContent.branchesIntro}
              onChange={(value) => setHomepageContent(prev => ({ ...prev, branchesIntro: value }))}
              placeholder="Write a short branches intro..."
              rows={4}
              label="Branches Description"
            />
            {homepageErrors.branchesIntro && <small className="settingsErrorText">{homepageErrors.branchesIntro}</small>}
          </div>
          {branchLocations.map((branch, index) => (
            <div key={branch.id} className="settingsMiniEditorCard">
              <div className="settingsMiniEditorHeader">
                <strong>Branch {index + 1}</strong>
                <button className="settingsGhostBtn" onClick={() => handleRemoveBranch(branch.id)} disabled={branchLocations.length <= 1}>
                  <IoTrashOutline size={14} />
                  <span>Remove</span>
                </button>
              </div>
              <img src={branch.image} alt={branch.name || `Branch ${index + 1}`} className="settingsEditorImagePreview" />
              <button type="button" className="settingsGhostBtn settingsWideBtn" onClick={() => document.getElementById(`branch-upload-${branch.id}`)?.click()}>
                <IoImageOutline size={16} />
                <span>Change Image</span>
              </button>
              <input id={`branch-upload-${branch.id}`} type="file" accept="image/*" className="settingsHiddenFileInput" onChange={(event) => handleBranchImagePick(event, branch.id)} />
              <div className="settingsFormField">
                <label>Branch Name</label>
                <input className="settingsInput" value={branch.name} onChange={(e) => setBranchLocations(prev => prev.map(item => item.id === branch.id ? { ...item, name: e.target.value } : item))} />
              </div>
              <div className="settingsFormField">
                <label>Address</label>
                <input
                  className="settingsInput"
                  value={branch.address}
                  onChange={(e) => {
                    const nextAddress = e.target.value;
                    setBranchLocations(prev => prev.map(item => item.id === branch.id ? { ...item, address: nextAddress, mapsUrl: createGoogleMapsSearchUrl(nextAddress) } : item));
                  }}
                />
              </div>
              <div className="settingsFormField">
                <label>Clinic Hours</label>
                <textarea className="settingsInput settingsTextarea" value={branch.hours} onChange={(e) => setBranchLocations(prev => prev.map(item => item.id === branch.id ? { ...item, hours: e.target.value } : item))} />
              </div>
              <div className="settingsFormField">
                <label>Google Maps Link</label>
                <input className="settingsInput" value={branch.mapsUrl} onChange={(e) => setBranchLocations(prev => prev.map(item => item.id === branch.id ? { ...item, mapsUrl: e.target.value } : item))} />
              </div>
            </div>
          ))}
          <button className="settingsGhostBtn settingsWideBtn" onClick={handleAddBranch}>
            <IoAddOutline size={16} />
            <span>Add Branch</span>
          </button>
          {homepageErrors.branches && <small className="settingsErrorText">{homepageErrors.branches}</small>}
        </div>
      );
    }

    if (homepageTarget === 'about') {
      return (
        <div className="settingsEditorStack">
          <div className="settingsFormField">
            <label>About Title</label>
            <input className={`settingsInput ${homepageErrors.aboutTitle ? 'hasError' : ''}`} value={homepageContent.aboutTitle} onChange={(e) => setHomepageContent(prev => ({ ...prev, aboutTitle: e.target.value }))} />
            {homepageErrors.aboutTitle && <small className="settingsErrorText">{homepageErrors.aboutTitle}</small>}
          </div>
          <div className="settingsFormField">
            <RichTextEditor value={homepageContent.aboutBody} onChange={(value) => setHomepageContent(prev => ({ ...prev, aboutBody: value }))} placeholder="Write the about section..." rows={5} label="About Body" />
            {homepageErrors.aboutBody && <small className="settingsErrorText">{homepageErrors.aboutBody}</small>}
          </div>
        </div>
      );
    }

    const cardIndex = homepageTarget === 'about-card-1' ? 0 : 1;
    const card = aboutCards[cardIndex];
    return (
      <div className="settingsEditorStack">
        <div className="settingsFormField">
          <label>Card Title</label>
          <input className="settingsInput" value={card.title} onChange={(e) => setAboutCards(prev => prev.map((item, index) => index === cardIndex ? { ...item, title: e.target.value } : item))} />
        </div>
        <div className="settingsFormField">
          <RichTextEditor value={card.body} onChange={(value) => setAboutCards(prev => prev.map((item, index) => index === cardIndex ? { ...item, body: value } : item))} placeholder="Write the card description..." rows={4} label="Card Body" />
        </div>
        {homepageErrors.aboutCards && <small className="settingsErrorText">{homepageErrors.aboutCards}</small>}
      </div>
    );
  };

  return (
    <div className="biContainer">
      <Navbar currentUser={currentUser} onLogout={handleLogoutPress} onNavigateAttempt={handleProtectedSettingsNavigation} />

      <div className="bodyContainer">
        <div className="topContainer settingsTopContainer">
          <div className="subTopContainer settingsSubTopContainer">
            <div className="settingsSubTopLeft">
              <IoSettingsOutline size={23} className="blueIcon" />
              <span className="blueText">Settings</span>
            </div>

            <div className="settingsHeaderStatus">
              <span>Current Panel:</span>
              <strong>{activePanelLabel}</strong>
            </div>

          </div>

          {!isDoctorSettings && (
            <div className="subTopContainer notificationContainer settingsNotificationContainer">
              <Notifications
                buttonClassName="iconButton"
                iconClassName="blueIcon"
                onViewAll={() => {
                  console.log('View all notifications');
                }}
                onNotificationClick={(notification) => {
                  const notificationLink = notification.link;
                  if (notificationLink) {
                    handleProtectedSettingsNavigation(notificationLink, () => navigate(notificationLink));
                  }
                }}
              />
            </div>
          )}
        </div>

        <div className="tableContainer settingsTableContainer settingsTableNoHeader">
          <div className={`settingsHero ${showFutureDefenseSettings ? '' : 'settingsHeroDefenseMode'}`}>
            <div className="settingsHeroPanel">
              <span className="settingsHeroEyebrow">{settingsHeroCopy.eyebrow}</span>
              <h2>{settingsHeroCopy.title}</h2>
              <p>
                {settingsHeroCopy.description}
              </p>
              <div className="settingsHeroPills">
                <span>Editable profile image</span>
                <span>Password validation</span>
                <span>Email OTP verification</span>
              </div>
            </div>

            {showFutureDefenseSettings && (
              <div className="settingsSummaryGrid">
                <div className="settingsSummaryCard">
                  <div className="settingsSummaryIcon blue"><IoShieldCheckmarkOutline size={18} /></div>
                  <strong>3 security actions</strong>
                  <span>Profile, password, and email management with validation.</span>
                </div>
                <div className="settingsSummaryCard">
                  <div className="settingsSummaryIcon cyan"><IoPricetagOutline size={18} /></div>
                  <strong>{services.length} services</strong>
                  <span>Based on the Billing module structure and editable here.</span>
                </div>
                <div className="settingsSummaryCard">
                  <div className="settingsSummaryIcon pink"><IoAppsOutline size={18} /></div>
                  <strong>{announcements.length} homepage announcements</strong>
                  <span>Target Web Home, Mobile App Home, or both homepages.</span>
                </div>
                <div className="settingsSummaryCard">
                  <div className="settingsSummaryIcon amber"><IoGlobeOutline size={18} /></div>
                  <strong>Focused editor flow</strong>
                  <span>Click a preview area first, then edit only that part in the side pane.</span>
                </div>
              </div>
            )}
          </div>

          <div className="settingsTabRow">
            <button className={`settingsTab ${activePanel === 'account' ? 'active' : ''}`} onClick={() => handleSettingsPanelChange('account')}>
              <IoPeopleOutline size={16} />
              <span>Account</span>
            </button>
            <button className={`settingsTab ${activePanel === 'security' ? 'active' : ''}`} onClick={() => handleSettingsPanelChange('security')}>
              <IoShieldCheckmarkOutline size={16} />
              <span>Security</span>
            </button>
            {showFutureDefenseSettings && (
              <>
                <button className={`settingsTab ${activePanel === 'developer' ? 'active' : ''}`} onClick={() => handleSettingsPanelChange('developer')}>
                  <IoLayersOutline size={16} />
                  <span>Developer Settings</span>
                </button>
                <button className={`settingsTab ${activePanel === 'homepage' ? 'active' : ''}`} onClick={() => handleSettingsPanelChange('homepage')}>
                  <IoGlobeOutline size={16} />
                  <span>Homepage Editor</span>
                </button>
                <button className={`settingsTab ${activePanel === 'announcements' ? 'active' : ''}`} onClick={() => handleSettingsPanelChange('announcements')}>
                  <IoAppsOutline size={16} />
                  <span>Announcements</span>
                </button>
              </>
            )}
          </div>

          {activePanel === 'account' && (
            <div className="settingsPanelGrid">
              <section className="settingsCard settingsAccountCard">
                <div className="settingsSectionHeader">
                  <div>
                    <span className="settingsSectionEyebrow">Edit Account Profile</span>
                    <h3>Update user information</h3>
                  </div>
                  <button className="settingsPrimaryBtn" onClick={handleProfileSave} disabled={profileLoading || profileSaving || imageUploading}>
                    {profileSaving ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>

                <div className="settingsProfileShell">
                  <div className="settingsProfileBadge">
                    <img src={profileForm.userImage || defaultUserImg} alt={profileForm.fullName} />
                    <div>
                      <strong>{profileForm.fullName}</strong>
                      <span>@{profileForm.username}</span>
                      <small>{profileForm.role}</small>
                    </div>
                  </div>

                  <div className="settingsImageEditor">
                    <div className="settingsImageEditorInfo">
                      <IoImageOutline size={18} />
                      <span>{imageUploading ? 'Uploading profile image...' : 'Upload a new profile image'}</span>
                    </div>
                    <div className="settingsImageEditorActions">
                      <button className="settingsGhostBtn" onClick={() => fileInputRef.current?.click()} disabled={profileLoading || profileSaving || imageUploading}>
                        <IoImageOutline size={16} />
                        <span>{imageUploading ? 'Uploading...' : 'Upload Image'}</span>
                      </button>
                      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImagePick} />
                    </div>
                    {profileErrors.userImage && <small className="settingsErrorText">{profileErrors.userImage}</small>}
                  </div>

                  <div className="settingsFormGrid">
                    <div className="settingsFormField">
                      <label>Full Name</label>
                      <input className={`settingsInput ${profileErrors.fullName ? 'hasError' : ''}`} value={profileForm.fullName} onChange={(e) => setProfileForm(prev => ({ ...prev, fullName: e.target.value }))} disabled={profileLoading || profileSaving} />
                      {profileErrors.fullName && <small className="settingsErrorText">{profileErrors.fullName}</small>}
                    </div>
                    <div className="settingsFormField">
                      <label>Username</label>
                      <input className={`settingsInput ${profileErrors.username ? 'hasError' : ''}`} value={profileForm.username} onChange={(e) => setProfileForm(prev => ({ ...prev, username: e.target.value }))} disabled={profileLoading || profileSaving} />
                      {profileErrors.username && <small className="settingsErrorText">{profileErrors.username}</small>}
                    </div>
                    <div className="settingsFormField">
                      <label>Contact Number</label>
                      <input
                        className={`settingsInput ${profileErrors.contactNumber ? 'hasError' : ''}`}
                        value={profileForm.contactNumber}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, contactNumber: formatSettingsPhoneNumber(e.target.value) }))}
                        inputMode="tel"
                        placeholder="+63 927 306 6923"
                        disabled={profileLoading || profileSaving}
                      />
                      {profileErrors.contactNumber && <small className="settingsErrorText">{profileErrors.contactNumber}</small>}
                    </div>
                    <div className="settingsFormField">
                      <label>Role</label>
                      <input className={`settingsInput ${profileErrors.role ? 'hasError' : ''}`} value={profileForm.role} readOnly disabled={profileLoading} />
                      {profileErrors.role && <small className="settingsErrorText">{profileErrors.role}</small>}
                    </div>
                  </div>
                </div>
              </section>

              <section className="settingsCard settingsNoteCard">
                <div className="settingsSectionHeader">
                  <div>
                    <span className="settingsSectionEyebrow">Profile Rules</span>
                    <h3>Validation checklist</h3>
                  </div>
                </div>
                <ul className="settingsChecklist">
                  <li>Full name, username, contact number, and profile image are saved to the current account.</li>
                  <li>Username must use at least 4 valid characters.</li>
                  <li>Contact number uses +63 format, example +63 927 306 6923.</li>
                  <li>Role is shown from the account record and is not edited here.</li>
                  <li>Branch assignment is intentionally untouched for now to avoid conflicts with the team branch work.</li>
                </ul>
              </section>
            </div>
          )}

          {activePanel === 'security' && (
            <div className="settingsPanelGrid settingsPanelGridTwo">
              <section className="settingsCard">
                <div className="settingsSectionHeader">
                  <div>
                    <span className="settingsSectionEyebrow">Change Password</span>
                    <h3>{settingsHeroCopy.securityTitle}</h3>
                  </div>
                  <button className="settingsPrimaryBtn" onClick={handlePasswordSave} disabled={passwordSaving}>
                    {passwordSaving ? 'Updating...' : 'Update Password'}
                  </button>
                </div>

                <div className="settingsFormGrid">
                  <div className="settingsFormField settingsFormFieldWide">
                    <label>Current Password</label>
                    <input
                      type="password"
                      name="settings-current-password"
                      autoComplete="new-password"
                      className={`settingsInput ${passwordErrors.currentPassword ? 'hasError' : ''}`}
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                      disabled={passwordSaving}
                    />
                    {passwordErrors.currentPassword && <small className="settingsErrorText">{passwordErrors.currentPassword}</small>}
                  </div>
                  <div className="settingsFormField">
                    <label>New Password</label>
                    <input
                      type="password"
                      name="settings-new-password"
                      autoComplete="new-password"
                      className={`settingsInput ${passwordErrors.newPassword ? 'hasError' : ''}`}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                      disabled={passwordSaving}
                    />
                    <div className="settingsPasswordRequirements" aria-live="polite">
                      {passwordRequirementItems.map(requirement => (
                        <div
                          key={requirement.id}
                          className={`settingsPasswordRequirement ${requirement.isMet ? 'met' : 'missing'}`}
                        >
                          <span className="settingsPasswordRequirementMark" aria-hidden="true">
                            {requirement.isMet ? <IoCheckmarkCircleOutline size={14} /> : <IoCloseCircleOutline size={14} />}
                          </span>
                          <span>{requirement.label}</span>
                        </div>
                      ))}
                    </div>
                    {passwordErrors.newPassword && <small className="settingsErrorText">{passwordErrors.newPassword}</small>}
                  </div>
                  <div className="settingsFormField">
                    <label>Confirm New Password</label>
                    <input
                      type="password"
                      name="settings-confirm-password"
                      autoComplete="new-password"
                      className={`settingsInput ${passwordErrors.confirmPassword ? 'hasError' : ''}`}
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      disabled={passwordSaving}
                    />
                    {passwordErrors.confirmPassword && <small className="settingsErrorText">{passwordErrors.confirmPassword}</small>}
                  </div>
                </div>
              </section>

              <section className="settingsCard">
                <div className="settingsSectionHeader">
                  <div>
                    <span className="settingsSectionEyebrow">Change Email</span>
                    <h3>Verify using OTP</h3>
                  </div>
                  <button className="settingsPrimaryBtn" onClick={handleEmailSubmit} disabled={emailOtpSending}>
                    {emailOtpSending ? 'Sending...' : 'Send OTP'}
                  </button>
                </div>

                <div className="settingsFormGrid">
                  <div className="settingsFormField settingsFormFieldWide">
                    <label>Current Email</label>
                    <input className={`settingsInput ${emailErrors.currentEmail ? 'hasError' : ''}`} value={emailForm.currentEmail} readOnly />
                    {emailErrors.currentEmail && <small className="settingsErrorText">{emailErrors.currentEmail}</small>}
                  </div>
                  <div className="settingsFormField">
                    <label>New Email</label>
                    <input className={`settingsInput ${emailErrors.newEmail ? 'hasError' : ''}`} value={emailForm.newEmail} onChange={(e) => setEmailForm(prev => ({ ...prev, newEmail: e.target.value }))} disabled={emailOtpSending} />
                    {emailErrors.newEmail && <small className="settingsErrorText">{emailErrors.newEmail}</small>}
                  </div>
                  <div className="settingsFormField">
                    <label>Confirm New Email</label>
                    <input className={`settingsInput ${emailErrors.confirmEmail ? 'hasError' : ''}`} value={emailForm.confirmEmail} onChange={(e) => setEmailForm(prev => ({ ...prev, confirmEmail: e.target.value }))} disabled={emailOtpSending} />
                    {emailErrors.confirmEmail && <small className="settingsErrorText">{emailErrors.confirmEmail}</small>}
                  </div>
                </div>

                <div className="settingsInlineNotice">
                  <IoMailOpenOutline size={18} />
                  <span>After validation, a 6-digit OTP is sent to the new email address.</span>
                </div>
              </section>
            </div>
          )}

          {showFutureDefenseSettings && activePanel === 'developer' && (
            <div className="settingsPanelGrid settingsDeveloperGrid">
              <section className="settingsCard">
                <div className="settingsSectionHeader">
                  <div>
                    <span className="settingsSectionEyebrow">Developer Settings</span>
                    <h3>Edit Services</h3>
                  </div>
                  <button className="settingsGhostBtn" onClick={handleResetServiceForm}>
                    <IoAddOutline size={16} />
                    <span>New Service</span>
                  </button>
                </div>

                <div className="settingsCategoryManager">
                  <div className="settingsFormField">
                    <label>Add Service Category</label>
                    <input
                      className={`settingsInput ${categoryErrors.newCategoryName ? 'hasError' : ''}`}
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Example: Pet Training"
                    />
                    {categoryErrors.newCategoryName && <small className="settingsErrorText">{categoryErrors.newCategoryName}</small>}
                  </div>
                  <button type="button" className="settingsGhostBtn" onClick={handleAddCategory}>
                    <IoAddOutline size={16} />
                    <span>Add Category</span>
                  </button>
                </div>

                <div className="settingsCategoryChips">
                  {serviceCategoryOptions.map(category => (
                    <button
                      key={category}
                      type="button"
                      className={`settingsCategoryChip ${serviceForm.category === category ? 'active' : ''}`}
                      onClick={() => handleServiceCategoryChange(category)}
                    >
                      {category}
                    </button>
                  ))}
                </div>

                <div className="settingsFormGrid">
                  <div className="settingsFormField">
                    <label>Category</label>
                    <select className={`settingsInput ${serviceErrors.category ? 'hasError' : ''}`} value={serviceForm.category} onChange={(e) => handleServiceCategoryChange(e.target.value)}>
                      {serviceCategoryOptions.map(option => <option key={option}>{option}</option>)}
                    </select>
                    {serviceErrors.category && <small className="settingsErrorText">{serviceErrors.category}</small>}
                  </div>
                  <div className="settingsFormField">
                    <label>Status</label>
                    <select className="settingsInput" value={serviceForm.status} onChange={(e) => setServiceForm(prev => ({ ...prev, status: e.target.value as ServiceItem['status'] }))}>
                      <option value="Active">Active</option>
                      <option value="Draft">Draft</option>
                    </select>
                  </div>
                  <div className="settingsFormField settingsFormFieldWide">
                    <label>Service Name</label>
                    <input className={`settingsInput ${serviceErrors.name ? 'hasError' : ''}`} value={serviceForm.name} onChange={(e) => setServiceForm(prev => ({ ...prev, name: e.target.value }))} />
                    {serviceErrors.name && <small className="settingsErrorText">{serviceErrors.name}</small>}
                  </div>
                  <div className="settingsFormField">
                    <label>Price</label>
                    <div className={`settingsMoneyInput ${serviceErrors.price ? 'hasError' : ''}`}>
                      <span>PHP</span>
                      <input
                        value={serviceForm.price}
                        onChange={(e) => handleServicePriceChange(e.target.value)}
                        onBlur={handleServicePriceBlur}
                        inputMode="decimal"
                        placeholder="0.00"
                      />
                    </div>
                    {serviceErrors.price && <small className="settingsErrorText">{serviceErrors.price}</small>}
                  </div>
                  <div className="settingsFormField settingsFormFieldWide">
                    <label>Description</label>
                    <textarea className={`settingsInput settingsTextarea ${serviceErrors.description ? 'hasError' : ''}`} value={serviceForm.description} onChange={(e) => setServiceForm(prev => ({ ...prev, description: e.target.value }))} />
                    {serviceErrors.description && <small className="settingsErrorText">{serviceErrors.description}</small>}
                  </div>
                </div>

                <div className="settingsActionRow">
                  <button className="settingsSecondaryBtn" onClick={handleResetServiceForm}>Clear</button>
                  <button className="settingsPrimaryBtn" onClick={handleServiceSave}>{editingServiceId ? 'Save Changes' : 'Add Service'}</button>
                </div>
              </section>

              <section className="settingsCard">
                <div className="settingsSectionHeader">
                  <div>
                    <span className="settingsSectionEyebrow">Service List</span>
                    <h3>Homepage-ready service cards</h3>
                  </div>
                </div>

                <div className="settingsServiceSearch">
                  <input
                    className="settingsInput"
                    value={serviceSearchQuery}
                    onChange={(e) => setServiceSearchQuery(e.target.value)}
                    placeholder="Search services or categories..."
                  />
                </div>

                <div className="settingsServiceGroupStack settingsServicePaneScroll">
                  {groupedServices.map(group => (
                    <section key={group.category} className="settingsServiceGroupCard">
                      <button type="button" className="settingsServiceGroupHeader settingsServiceGroupToggle" onClick={() => toggleServiceCategory(group.category)}>
                        <div>
                          <h4>{group.category}</h4>
                          <span>{group.items.length} services</span>
                        </div>
                        <span className="settingsServiceChevron">{openServiceCategories[group.category] ? '-' : '+'}</span>
                      </button>

                      {openServiceCategories[group.category] && (
                      <div className="settingsCompactServiceList">
                        {group.items.length > 0 ? group.items.map(service => (
                          <article key={service.id} className="settingsCompactServiceRow">
                            <div className="settingsCompactServiceMain">
                              <div className="settingsCompactServiceTop">
                                <strong>{service.name}</strong>
                                <span className={`settingsCompactStatus ${service.status === 'Active' ? 'active' : 'draft'}`}>
                                  {service.status}
                                </span>
                              </div>
                              <div className="settingsCompactMetaRow">
                                <span>PHP {Number(service.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                              <p>{service.description}</p>
                            </div>

                            <div className="settingsCompactActions">
                              <button className="settingsIconBtn" onClick={() => handleEditService(service)}>
                                <IoCreateOutline size={16} />
                                <span>Edit</span>
                              </button>
                              <button className="settingsIconBtn danger" onClick={() => handleDeleteService(service.id)}>
                                <IoTrashOutline size={16} />
                                <span>Delete</span>
                              </button>
                            </div>
                          </article>
                        )) : (
                          <div className="settingsEmptyCategory">
                            {serviceSearchQuery.trim() ? 'No services match this search in this category.' : 'No services in this category yet.'}
                          </div>
                        )}
                      </div>
                      )}
                    </section>
                  ))}
                </div>
              </section>
            </div>
          )}

          {showFutureDefenseSettings && activePanel === 'homepage' && (
            <div className="settingsPanelGrid settingsHomepageGrid settingsHomepageFocusedGrid">
              <section className="settingsCard">
                <div className="settingsSectionHeader">
                  <div>
                    <span className="settingsSectionEyebrow">Editing Pane</span>
                    <h3>{homepageTargetLabel}</h3>
                  </div>
                  <button className="settingsPrimaryBtn" onClick={handleHomepageSave}>Save Homepage Draft</button>
                </div>

                {renderHomepageEditorPane()}
              </section>

              <section className="settingsCard settingsHomepagePreviewCard">
                <div className="settingsSectionHeader">
                  <div>
                    <span className="settingsSectionEyebrow">Live Preview</span>
                    <h3>Click an edit button to load that section into the editing pane</h3>
                  </div>
                </div>

                <div className="settingsHomepagePreview">
                  <div className="settingsPreviewHero">
                    <div className="settingsPreviewHeroMain">
                      <button className="settingsPreviewEditButton" onClick={() => setHomepageTarget('hero')}>
                        <IoCreateOutline size={14} />
                        <span>Edit hero</span>
                      </button>
                      <span className="settingsPreviewEyebrow">{homepageContent.heroEyebrow}</span>
                      <h2>{homepageContent.heroTitle}</h2>
                      <div className="settingsPreviewRichText" dangerouslySetInnerHTML={{ __html: homepageContent.heroBody }} />
                    </div>

                    <div className="settingsPreviewHeroSide">
                      <div className="settingsPreviewHeaderRow">
                        <h4>What you can do here</h4>
                        <button className="settingsPreviewEditButton compact" onClick={() => setHomepageTarget('features')}>
                          <IoCreateOutline size={14} />
                          <span>Edit</span>
                        </button>
                      </div>
                      {featureCards.map(card => (
                        <div key={card.id} className="settingsPreviewMiniCard">
                          <div className="settingsPreviewMiniIcon"><IoAppsOutline size={14} /></div>
                          <div>
                            <strong>{card.title}</strong>
                            <p>{card.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="settingsPreviewCarouselSection">
                    <button className="settingsPreviewEditButton" onClick={() => setHomepageTarget('carousel')}>
                      <IoCreateOutline size={14} />
                      <span>Edit carousel</span>
                    </button>
                    <span className="settingsPreviewEyebrow">Clinic Photos</span>
                    <div className="settingsPreviewCarousel">
                      {carouselImages.length > 1 && (
                        <button type="button" className="settingsCarouselNav settingsCarouselPrev" onClick={() => moveCarousel('previous')}>
                          Prev
                        </button>
                      )}
                      <div className="settingsCarouselStage">
                        {[-1, 0, 1].map((offset) => {
                          const slideIndex = (carouselIndex + offset + carouselImages.length) % carouselImages.length;
                          const slide = carouselImages[slideIndex];
                          const positionClass = offset === 0 ? 'active' : offset < 0 ? 'previous' : 'next';

                          return (
                            <article key={`${slide.id}-${positionClass}`} className={`settingsPreviewCarouselCard ${positionClass}`}>
                              <img src={slide.image} alt={slide.title} />
                              <div>
                                <strong>{slide.title}</strong>
                                <p>{slide.caption}</p>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                      {carouselImages.length > 1 && (
                        <button type="button" className="settingsCarouselNav settingsCarouselNext" onClick={() => moveCarousel('next')}>
                          Next
                        </button>
                      )}
                      <div className="settingsCarouselDots">
                        {carouselImages.map((slide, index) => (
                          <button
                            key={`dot-${slide.id}`}
                            type="button"
                            className={index === carouselIndex ? 'active' : ''}
                            onClick={() => setCarouselIndex(index)}
                            aria-label={`Show clinic image ${index + 1}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="settingsPreviewSection">
                    <button className="settingsPreviewEditButton" onClick={() => setHomepageTarget('services')}>
                      <IoCreateOutline size={14} />
                      <span>Edit services section</span>
                    </button>
                    <span className="settingsPreviewEyebrow">Services</span>
                    <h3>{homepageContent.servicesTitle}</h3>
                    <div className="settingsPreviewRichText" dangerouslySetInnerHTML={{ __html: homepageContent.servicesIntro }} />
                    <div className="settingsPreviewServiceGrid">
                      {homepageServicesPreview.map(card => (
                        <article key={card.id}>
                          <div className="settingsPreviewCardTop">
                            <strong>{card.name}</strong>
                            <button className="settingsPreviewEditButton compact" onClick={() => handleHomepageServiceEdit(card)}>
                              <IoCreateOutline size={14} />
                              <span>Edit</span>
                            </button>
                          </div>
                          <p>{card.description}</p>
                        </article>
                      ))}
                    </div>
                  </div>

                  <div className="settingsPreviewSection">
                    <button className="settingsPreviewEditButton" onClick={() => setHomepageTarget('branches')}>
                      <IoCreateOutline size={14} />
                      <span>Edit branches</span>
                    </button>
                    <span className="settingsPreviewEyebrow">Branches</span>
                    <h3>View PetShield branches and choose the clinic closest to you.</h3>
                    <div className="settingsPreviewRichText" dangerouslySetInnerHTML={{ __html: homepageContent.branchesIntro }} />
                    <div className="settingsPreviewBranchGrid">
                      {branchLocations.map(branch => (
                        <article key={branch.id}>
                          <img src={branch.image} alt={branch.name} />
                          <div>
                            <strong>{branch.name}</strong>
                            <p>{branch.address}</p>
                            <span>{branch.hours}</span>
                            <a href={branch.mapsUrl} target="_blank" rel="noreferrer" className="settingsBranchMapLink">
                              <IoLocationOutline size={14} />
                              <span>View on Google Maps</span>
                            </a>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>

                  <div className="settingsPreviewSection">
                    <button className="settingsPreviewEditButton" onClick={() => setHomepageTarget('about')}>
                      <IoCreateOutline size={14} />
                      <span>Edit about section</span>
                    </button>
                    <span className="settingsPreviewEyebrow">About Us</span>
                    <h3>{homepageContent.aboutTitle}</h3>
                    <div className="settingsPreviewRichText" dangerouslySetInnerHTML={{ __html: homepageContent.aboutBody }} />
                    <div className="settingsPreviewAboutGrid">
                      <article>
                        <div className="settingsPreviewCardTop">
                          <strong>{aboutCards[0].title}</strong>
                          <button className="settingsPreviewEditButton compact" onClick={() => setHomepageTarget('about-card-1')}>
                            <IoCreateOutline size={14} />
                            <span>Edit</span>
                          </button>
                        </div>
                        <div className="settingsPreviewRichText" dangerouslySetInnerHTML={{ __html: aboutCards[0].body }} />
                      </article>
                      <article>
                        <div className="settingsPreviewCardTop">
                          <strong>{aboutCards[1].title}</strong>
                          <button className="settingsPreviewEditButton compact" onClick={() => setHomepageTarget('about-card-2')}>
                            <IoCreateOutline size={14} />
                            <span>Edit</span>
                          </button>
                        </div>
                        <div className="settingsPreviewRichText" dangerouslySetInnerHTML={{ __html: aboutCards[1].body }} />
                      </article>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {showFutureDefenseSettings && activePanel === 'announcements' && (
            <div className="settingsPanelGrid settingsAnnouncementsGrid">
              <div className="settingsAnnouncementsLeftStack">
                <section className="settingsCard">
                  <div className="settingsSectionHeader">
                    <div>
                      <span className="settingsSectionEyebrow">Create Announcement</span>
                      <h3>Homepage announcements for web or mobile app</h3>
                    </div>
                    <button className="settingsGhostBtn" onClick={handleResetAnnouncementForm}>
                      <IoAddOutline size={16} />
                      <span>New Draft</span>
                    </button>
                  </div>

                  <div className="settingsFormGrid">
                    <div className="settingsFormField settingsFormFieldWide">
                      <label>Announcement Type</label>
                      <div className="settingsChoiceGrid">
                        <button
                          type="button"
                          className={`settingsChoiceCard ${announcementForm.displayType === 'Custom Announcement' ? 'active' : ''}`}
                          onClick={() => setAnnouncementForm(prev => ({ ...prev, displayType: 'Custom Announcement' }))}
                        >
                          <IoCreateOutline size={18} />
                          <span>Custom Announcement</span>
                          <small>Build a text announcement with an optional image.</small>
                        </button>
                        <button
                          type="button"
                          className={`settingsChoiceCard ${announcementForm.displayType === 'Banner Upload' ? 'active' : ''}`}
                          onClick={() => setAnnouncementForm(prev => ({ ...prev, displayType: 'Banner Upload' }))}
                        >
                          <IoImageOutline size={18} />
                          <span>Upload Banner</span>
                          <small>Use a finished banner artwork for the website.</small>
                        </button>
                      </div>
                    </div>
                    <div className="settingsFormField settingsFormFieldWide">
                      <label>Announcement Title</label>
                      <input className={`settingsInput ${announcementErrors.title ? 'hasError' : ''}`} value={announcementForm.title} onChange={(e) => setAnnouncementForm(prev => ({ ...prev, title: e.target.value }))} />
                      {announcementErrors.title && <small className="settingsErrorText">{announcementErrors.title}</small>}
                    </div>
                    <div className="settingsFormField">
                      <label>Display On</label>
                      <select className="settingsInput" value={announcementForm.channel} onChange={(e) => setAnnouncementForm(prev => ({ ...prev, channel: e.target.value as AnnouncementItem['channel'] }))}>
                        <option value="Web Home">Web Home</option>
                        <option value="Mobile App Home">Mobile App Home</option>
                        <option value="Both Homepages">Both Homepages</option>
                      </select>
                    </div>
                    <div className="settingsFormField">
                      <label>Status</label>
                      <select className="settingsInput" value={announcementForm.status} onChange={(e) => setAnnouncementForm(prev => ({ ...prev, status: e.target.value as AnnouncementItem['status'] }))}>
                        <option value="Draft">Draft</option>
                        <option value="Scheduled">Scheduled</option>
                        <option value="Live">Live</option>
                      </select>
                    </div>
                    {announcementForm.displayType === 'Custom Announcement' && (
                      <div className="settingsFormField">
                        <label>Theme Preset</label>
                        <select className="settingsInput" value={announcementForm.theme} onChange={(e) => setAnnouncementForm(prev => ({ ...prev, theme: e.target.value as AnnouncementItem['theme'] }))}>
                          <option value="Normal">Normal</option>
                          <option value="Urgent">Urgent</option>
                          <option value="Important Notice">Important Notice</option>
                          <option value="Promo">Promo</option>
                        </select>
                      </div>
                    )}
                    <div className={announcementForm.displayType === 'Banner Upload' ? 'settingsFormField settingsFormFieldWide' : 'settingsFormField'}>
                      <label>{announcementForm.displayType === 'Banner Upload' ? 'Banner Image' : 'Image'}</label>
                      <button type="button" className="settingsGhostBtn settingsWideBtn" onClick={() => announcementImageInputRef.current?.click()}>
                        <IoImageOutline size={16} />
                        <span>{announcementForm.image ? 'Change Image' : announcementForm.displayType === 'Banner Upload' ? 'Upload Banner' : 'Upload Image'}</span>
                      </button>
                      <input ref={announcementImageInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAnnouncementImagePick} />
                      {announcementErrors.image && <small className="settingsErrorText">{announcementErrors.image}</small>}
                    </div>
                    <div className="settingsFormField settingsFormFieldWide">
                      <label>Schedule</label>
                      <input className={`settingsInput ${announcementErrors.schedule ? 'hasError' : ''}`} value={announcementForm.schedule} onChange={(e) => setAnnouncementForm(prev => ({ ...prev, schedule: e.target.value }))} placeholder="2026-05-02 09:00" />
                      {announcementErrors.schedule && <small className="settingsErrorText">{announcementErrors.schedule}</small>}
                    </div>
                    {announcementForm.displayType === 'Custom Announcement' && (
                      <div className="settingsFormField settingsFormFieldWide">
                        <label>Message</label>
                        <RichTextEditor
                          value={announcementForm.body}
                          onChange={(value) => setAnnouncementForm(prev => ({ ...prev, body: value }))}
                          placeholder="Write the homepage announcement body."
                          rows={5}
                          label=""
                        />
                        {announcementErrors.body && <small className="settingsErrorText">{announcementErrors.body}</small>}
                      </div>
                    )}
                  </div>

                  <div className="settingsActionRow">
                    <button className="settingsSecondaryBtn" onClick={handleResetAnnouncementForm}>Clear</button>
                    <button className="settingsPrimaryBtn" onClick={handleAnnouncementSave}>{editingAnnouncementId ? 'Save Changes' : 'Create Announcement'}</button>
                  </div>
                </section>

                <section className="settingsCard">
                  <div className="settingsSectionHeader">
                    <div>
                      <span className="settingsSectionEyebrow">Publishing Queue</span>
                      <h3>Homepage announcement cards</h3>
                    </div>
                  </div>
                  <div className="settingsListStack">
                    {announcements.map(item => (
                      <article key={item.id} className="settingsAnnouncementCard">
                        <div className="settingsAnnouncementTop">
                          <div>
                            <div className="settingsListTags">
                              <span>{item.channel}</span>
                              <span>{item.displayType}</span>
                              {item.displayType === 'Custom Announcement' && <span>{item.theme}</span>}
                              <span className={item.status === 'Live' ? 'active' : item.status === 'Scheduled' ? 'scheduled' : 'draft'}>{item.status}</span>
                            </div>
                            <h4>{item.title}</h4>
                            {item.displayType === 'Custom Announcement' ? (
                              <div className="settingsPreviewRichText" dangerouslySetInnerHTML={{ __html: item.body }} />
                            ) : (
                              <p>Uploaded banner artwork will appear below the homepage hero and before services.</p>
                            )}
                          </div>
                          <div className="settingsAnnouncementMeta">
                            <strong>{item.schedule}</strong>
                            <small>Website placement</small>
                          </div>
                        </div>
                        <div className="settingsListActions">
                          <button className="settingsIconBtn" onClick={() => handleEditAnnouncement(item)}>
                            <IoCreateOutline size={16} />
                            <span>Edit</span>
                          </button>
                          <button className="settingsIconBtn danger" onClick={() => handleDeleteAnnouncement(item.id)}>
                            <IoTrashOutline size={16} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              </div>

              <section className="settingsCard settingsAnnouncementPreviewPane">
                <div className="settingsSectionHeader">
                  <div>
                    <span className="settingsSectionEyebrow">Live Website Preview</span>
                    <h3>Announcement appears below the first homepage section and before services</h3>
                  </div>
                </div>

                <div className="settingsHomepagePreview settingsAnnouncementHomepagePreview">
                  <div className="settingsPreviewHero">
                    <div className="settingsPreviewHeroMain">
                      <span className="settingsPreviewEyebrow">{homepageContent.heroEyebrow}</span>
                      <h2>{homepageContent.heroTitle}</h2>
                      <div className="settingsPreviewRichText" dangerouslySetInnerHTML={{ __html: homepageContent.heroBody }} />
                    </div>

                    <div className="settingsPreviewHeroSide">
                      <div className="settingsPreviewHeaderRow">
                        <h4>What you can do here</h4>
                      </div>
                      {featureCards.slice(0, 3).map(card => (
                        <div key={card.id} className="settingsPreviewMiniCard">
                          <div className="settingsPreviewMiniIcon"><IoAppsOutline size={14} /></div>
                          <div>
                            <strong>{card.title}</strong>
                            <p>{card.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="settingsPreviewCarouselSection">
                    <span className="settingsPreviewEyebrow">Clinic Photos</span>
                    <div className="settingsPreviewCarousel">
                      <div className="settingsCarouselStage">
                        {[-1, 0, 1].map((offset) => {
                          const slideIndex = (carouselIndex + offset + carouselImages.length) % carouselImages.length;
                          const slide = carouselImages[slideIndex];
                          const positionClass = offset === 0 ? 'active' : offset < 0 ? 'previous' : 'next';

                          return (
                            <article key={`announcement-${slide.id}-${positionClass}`} className={`settingsPreviewCarouselCard ${positionClass}`}>
                              <img src={slide.image} alt={slide.title} />
                              <div>
                                <strong>{slide.title}</strong>
                                <p>{slide.caption}</p>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {announcementForm.displayType === 'Banner Upload' ? (
                    announcementForm.image ? (
                      <img src={announcementForm.image} alt={announcementForm.title || 'Website announcement banner'} className="settingsWebsiteBannerPreview settingsAnnouncementAlignedBanner" />
                    ) : (
                      <div className="settingsWebsiteBannerPlaceholder settingsAnnouncementAlignedBanner">
                        <IoImageOutline size={28} />
                        <span>Upload a banner to preview this website placement.</span>
                      </div>
                    )
                  ) : (
                    <div className={`settingsWebsiteAnnouncement theme-${announcementForm.theme.toLowerCase().replace(/\s+/g, '-')}`}>
                      <div className="settingsWebsiteAnnouncementCopy">
                        <span className="settingsPreviewEyebrow">Announcement</span>
                        <h3>{announcementForm.title || 'Announcement title preview'}</h3>
                        <div className="settingsPreviewRichText" dangerouslySetInnerHTML={{ __html: announcementForm.body || '<p>Your homepage announcement message will appear here.</p>' }} />
                      </div>
                      {announcementForm.image && (
                        <img src={announcementForm.image} alt={announcementForm.title || 'Announcement artwork'} className="settingsWebsiteAnnouncementImage" />
                      )}
                    </div>
                  )}

                  <div className="settingsPreviewSection">
                    <span className="settingsPreviewEyebrow">Services</span>
                    <h3>{homepageContent.servicesTitle}</h3>
                    <div className="settingsPreviewRichText" dangerouslySetInnerHTML={{ __html: homepageContent.servicesIntro }} />
                    <div className="settingsPreviewServiceGrid">
                      {homepageServicesPreview.map(card => (
                        <article key={card.id}>
                          <strong>{card.name}</strong>
                          <p>{card.description}</p>
                        </article>
                      ))}
                    </div>
                  </div>

                  <div className="settingsPreviewSection">
                    <span className="settingsPreviewEyebrow">Branches</span>
                    <h3>View PetShield branches and choose the clinic closest to you.</h3>
                    <div className="settingsPreviewRichText" dangerouslySetInnerHTML={{ __html: homepageContent.branchesIntro }} />
                    <div className="settingsPreviewBranchGrid">
                      {branchLocations.map(branch => (
                        <article key={`announcement-${branch.id}`}>
                          <img src={branch.image} alt={branch.name} />
                          <div>
                            <strong>{branch.name}</strong>
                            <p>{branch.address}</p>
                            <span>{branch.hours}</span>
                            <a href={branch.mapsUrl} target="_blank" rel="noreferrer" className="settingsBranchMapLink">
                              <IoLocationOutline size={14} />
                              <span>View on Google Maps</span>
                            </a>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>

      {showOtpModal && (
        <div className="modalOverlay">
          <div className="settingsOtpModal">
            <div className="settingsOtpIcon"><IoMailOpenOutline size={34} /></div>
            <h3>Verify email change</h3>
            <p>Enter the 6-digit OTP sent to <strong>{pendingEmail}</strong>.</p>
            <input className={`settingsOtpInput ${otpError ? 'hasError' : ''}`} value={otpCode} onChange={(e) => { setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setOtpError(''); }} placeholder="000000" disabled={emailVerifying} />
            {otpError && <small className="settingsErrorText">{otpError}</small>}
            <span className="settingsOtpHint">Use the code from the email sent by the system.</span>
            <div className="settingsOtpActions">
              <button className="settingsSecondaryBtn" onClick={() => setShowOtpModal(false)} disabled={emailVerifying}>Cancel</button>
              <button className="settingsPrimaryBtn" onClick={handleOtpVerify} disabled={emailVerifying}>
                {emailVerifying ? 'Verifying...' : 'Verify OTP'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalVisible && (
        <div className="modalOverlay">
          <div className="alertModal">
            <div className="alertIcon">
              {modalConfig.type === 'success' ? <IoCheckmarkCircleOutline size={55} color="#2e9e0c" /> : modalConfig.type === 'error' ? <IoCloseCircleOutline size={55} color="#d93025" /> : <IoAlertCircleOutline size={55} color="#3d67ee" />}
            </div>
            <h3 className="alertTitle">{modalConfig.title}</h3>
            {typeof modalConfig.message === 'string' ? <p className="alertMessage">{modalConfig.message}</p> : <div style={{ marginBottom: '25px' }}>{modalConfig.message}</div>}
            <div className="alertActions">
              {modalConfig.showCancel && <button className="alertBtn cancelAlertBtn" onClick={() => setModalVisible(false)}>Cancel</button>}
              <button className={`alertBtn ${modalConfig.type === 'error' ? 'errorBtn' : 'confirmAlertBtn'}`} onClick={() => { setModalVisible(false); if (modalConfig.onConfirm) modalConfig.onConfirm(); }}>
                {modalConfig.type === 'confirm' ? 'Confirm' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
