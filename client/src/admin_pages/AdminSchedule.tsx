import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient'; 
// Reusable Navbar
import Navbar from '../reusable_components/NavBar'; 

// Web icons
import { 
  IoDocumentTextOutline, IoNotifications, IoAddCircle, IoFilterSharp, 
  IoCloseCircle, IoEyeOutline, IoClose, IoCheckmarkCircleOutline, 
  IoCloseCircleOutline, IoAlertCircleOutline, IoMedical, IoArrowBack, 
  IoCalendarClearOutline, IoInformationCircle, IoChevronBack, IoChevronForward,
  IoSearchSharp, IoPaw
} from 'react-icons/io5';

// Styles and Images
import './AdminStyles.css';
import defaultUserImg from '../assets/userImg.jpg';

// Imported Modals and Services
import AdminCancelAppointmentModal from './AdminCancelAppointmentModal'; 
import AdminRescheduleModal from './AdminRescheduleModal';               
import { availabilityService } from './availabilityService';             
import Notifications from '../reusable_components/Notifications';

// --- TYPESCRIPT INTERFACES ---
interface CurrentUser {
  id?: string | number;
  pk?: string | number;
  username: string;     
  fullName?: string;
  role: string;         
  userImage?: string;
}

interface ModalConfigType {
  type: 'info' | 'success' | 'error' | 'confirm';
  title: string;
  message: string | React.ReactNode;
  onConfirm: (() => void) | null;
  showCancel: boolean;
}

// ==========================================
//  0. CUSTOM CALENDAR COMPONENT (Upgraded with Availability Logic)
// ==========================================
// ==========================================
//  0. CUSTOM CALENDAR COMPONENT (Upgraded with Month Limits)
// ==========================================
const CustomCalendar = ({ selectedDate, onSelectDate, bookedDates = {}, availableDays = null, disablePastDates = false }: any) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const todayDate = new Date();
    
    // 🟢 NEW: Calculate the strict month boundaries
    const minMonth = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
    const maxMonth = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 1); // Only allows 1 month ahead

    // Check if we are allowed to go backwards or forwards
    const canGoPrev = currentMonth > minMonth;
    const canGoNext = currentMonth < maxMonth;

    const nextMonth = () => {
        if (canGoNext) {
            setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
        }
    };
    
    const prevMonth = () => {
        if (canGoPrev) {
            setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
        }
    };

    const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

    const todayStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;

    const renderDays = () => {
        const daysInMonth = getDaysInMonth(currentMonth);
        const firstDay = getFirstDayOfMonth(currentMonth);
        const days = [];
        const monthStr = String(currentMonth.getMonth() + 1).padStart(2, '0');
        const yearStr = currentMonth.getFullYear();

        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} style={{ width: '40px', height: '40px' }}></div>);
        }

        const dayNamesList = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

        for (let i = 1; i <= daysInMonth; i++) {
            const dayStr = String(i).padStart(2, '0');
            const fullDate = `${yearStr}-${monthStr}-${dayStr}`;
            
            const dayOfWeek = new Date(yearStr, currentMonth.getMonth(), i).getDay();
            const dayName = dayNamesList[dayOfWeek];

            const isSelected = selectedDate === fullDate;
            const isToday = fullDate === todayStr; 
            const hasAppointment = bookedDates[fullDate];

            // AVAILABILITY CHECKS
            const isPast = disablePastDates && fullDate < todayStr;
            const isUnavailableDay = availableDays && availableDays[dayName] === false;
            const isDisabled = isPast || isUnavailableDay;

            let bgColor = 'transparent';
            let textColor = isDisabled ? '#d3d3d3' : '#333';
            let fontWeight = '400';
            let cursor = isDisabled ? 'not-allowed' : 'pointer';

            if (!isDisabled) {
                if (isSelected) {
                    bgColor = '#3d67ee';     
                    textColor = 'white';
                    fontWeight = '600';
                } else if (isToday) {
                    bgColor = '#f0f7ff';     
                    textColor = '#3d67ee';   
                    fontWeight = '700';
                }
            }

            days.push(
                <div 
                    key={i} 
                    onClick={() => !isDisabled && onSelectDate(isSelected ? '' : fullDate)}
                    style={{
                        width: '40px', height: '40px', display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', cursor: cursor,
                        backgroundColor: bgColor,
                        color: textColor,
                        borderRadius: '50%', position: 'relative',
                        fontSize: '14px', fontWeight: fontWeight,
                        transition: 'all 0.2s ease',
                        opacity: isDisabled ? 0.6 : 1
                    }}
                >
                    {i}
                    {hasAppointment && !isDisabled && (
                        <div style={{ 
                            width: '5px', height: '5px', 
                            backgroundColor: isSelected ? 'white' : '#3d67ee', 
                            borderRadius: '50%', position: 'absolute', bottom: '2px' 
                        }}></div>
                    )}
                </div>
            );
        }
        return days;
    };

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    return (
        <div style={{ width: '100%', userSelect: 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '0 10px' }}>
                <button 
                    onClick={prevMonth} 
                    type="button" 
                    disabled={!canGoPrev} 
                    style={{ background: 'none', border: 'none', cursor: canGoPrev ? 'pointer' : 'not-allowed', color: canGoPrev ? '#3d67ee' : '#ccc', display: 'flex', alignItems: 'center' }}
                >
                    <IoChevronBack size={18} />
                </button>
                <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0, color: '#111' }}>
                    {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </h3>
                <button 
                    onClick={nextMonth} 
                    type="button" 
                    disabled={!canGoNext} 
                    style={{ background: 'none', border: 'none', cursor: canGoNext ? 'pointer' : 'not-allowed', color: canGoNext ? '#3d67ee' : '#ccc', display: 'flex', alignItems: 'center' }}
                >
                    <IoChevronForward size={18} />
                </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px', textAlign: 'center', marginBottom: '15px' }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} style={{ fontSize: '12px', color: '#a0a0a0', fontWeight: '600' }}>{day}</div>
                ))}
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px 5px', justifyItems: 'center', minHeight: '200px' }}>
                {renderDays()}
            </div>
        </div>
    );
};

// ==========================================
//  1. CREATE APPOINTMENT MODAL
// ==========================================
const CreateAppointmentModal = ({ visible, onClose, onSubmit }: any) => {
    // --- PATIENT STATE ---
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [reason, setReason] = useState('');

    // --- PET STATE ---
    const [petName, setPetName] = useState('');
    const [petType, setPetType] = useState('');
    const [unknownDob, setUnknownDob] = useState(false);
    const [customPetType, setCustomPetType] = useState(''); 
    
    const [breed, setBreed] = useState('');
    const [customBreed, setCustomBreed] = useState(''); 
    
    const [gender, setGender] = useState('');
    const [dob, setDob] = useState('');
    const [age, setAge] = useState('');
    const [color, setColor] = useState('');

    // --- APPOINTMENT STATE ---
    const [service, setService] = useState('');
    const [subService, setSubService] = useState(''); 
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');

    // --- AVAILABILITY STATE ---
    const [availableDays, setAvailableDays] = useState<any>(null);
    const [timeSlots, setTimeSlots] = useState<any[]>([]);

    // --- HIDDEN STATE (Supabase IDs) ---
    const [ownerId, setOwnerId] = useState('');
    const [petId, setPetId] = useState('');

    // --- SEARCH STATE ---
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [fetchedPets, setFetchedPets] = useState<any[]>([]);
    const [fetchedPatients, setFetchedPatients] = useState<any[]>([]);
    const [loadingSearch, setLoadingSearch] = useState(false);

    // --- CONSTANTS ---
    const dogBreeds = ['Labrador Retriever', 'German Shepherd', 'Golden Retriever', 'Bulldog', 'Beagle', 'Poodle', 'Rottweiler', 'Yorkshire Terrier', 'Boxer', 'Siberian Husky', 'Dachshund', 'Great Dane', 'Shih Tzu', 'Mixed Breed', 'N/A', 'Others'];
    const catBreeds = ['Persian', 'Maine Coon', 'Siamese', 'Ragdoll', 'Bengal', 'Sphynx', 'British Shorthair', 'Abyssinian', 'Scottish Fold', 'Birman', 'Burmese', 'Mixed Breed', 'N/A', 'Others'];

    const servicesList = [
        { id: 1, name: 'Pet Grooming', hasOptions: true, options: ['Basic Grooming', 'Full Grooming', 'Deluxe Grooming', 'Nail Trim Only', 'Bath Only'] },
        { id: 2, name: 'Consultation & Check-Up', hasOptions: false },
        { id: 3, name: 'Dental Prophylaxis', hasOptions: false },
        { id: 4, name: 'Pet Boarding', hasOptions: false },
        { id: 5, name: 'Confinement', hasOptions: false },
        { id: 6, name: 'X-Ray', hasOptions: false },
        { id: 7, name: 'Ultrasound', hasOptions: false },
        { id: 8, name: 'Laboratory Tests', hasOptions: true, options: ['Complete Blood Count', 'Blood Chemistry', 'Urinalysis', 'Fecal Examination', 'X-Ray', 'Ultrasound'] },
        { id: 9, name: 'Vaccinations', hasOptions: false }
    ];

    // Helper to format raw Python time string "09:00:00" to "9:00 AM"
    const formatTimeStr = (timeStr: string) => {
        if (!timeStr) return '';
        const [hours, minutes] = timeStr.split(':');
        const h = parseInt(hours, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const formattedH = h % 12 || 12;
        return `${formattedH}:${minutes} ${ampm}`;
    };

    // Load available days when modal opens
    useEffect(() => {
        if (visible) {
            availabilityService.getDayAvailability()
                .then(setAvailableDays)
                .catch(console.error);
        }
    }, [visible]);

    // Load time slots when a Date is selected
    useEffect(() => {
        if (date) {
            const dayNamesList = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const selectedDayName = dayNamesList[new Date(date).getDay()];
            
            availabilityService.getTimeSlotsForDay(selectedDayName)
                .then(slots => {
                    const formatted = slots.map((s: any) => {
                        return `${formatTimeStr(s.start_time)} - ${formatTimeStr(s.end_time)}`;
                    });
                    setTimeSlots(formatted);
                    setTime(''); // Reset time selection when date changes
                })
                .catch(console.error);
        } else {
            setTimeSlots([]);
        }
    }, [date]);

    // Auto-calculate exact age
    useEffect(() => {
        if (dob) {
            const birthDate = new Date(dob);
            const today = new Date();
            
            let years = today.getFullYear() - birthDate.getFullYear();
            let months = today.getMonth() - birthDate.getMonth();
            
            if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
                years--;
                months += 12;
            }
            if (today.getDate() < birthDate.getDate()) {
                months--;
                if (months < 0) { months = 11; }
            }

            let ageString = '';
            if (years > 0) ageString += `${years} year${years > 1 ? 's' : ''}`;
            if (months > 0) {
                if (ageString) ageString += ' and ';
                ageString += `${months} month${months > 1 ? 's' : ''}`;
            }
            if (years === 0 && months === 0) ageString = 'Less than a month';
            
            setAge(ageString);
        } else {
            setAge('');
        }
    }, [dob]);

    // Fetch patients and pets
    useEffect(() => {
        if (visible) {
            const loadDatabase = async () => {
                setLoadingSearch(true);
                try {
                    const { data: petsData } = await supabase.from('pet_profile').select('*');
                    const { data: patientsData } = await supabase.from('patient_account').select('*');
                    setFetchedPets(petsData || []);
                    setFetchedPatients(patientsData || []);
                } catch (error) {
                    console.error("Error loading search data", error);
                } finally {
                    setLoadingSearch(false);
                }
            };
            loadDatabase();
        }
    }, [visible]);

    if (!visible) return null;

    const handleSave = () => {
        const finalPetType = petType === 'Other' ? customPetType : petType;
        const finalBreed = (petType === 'Other' || breed === 'Others') ? customBreed : breed;
        const finalService = subService ? `${service} - ${subService}` : service;

        // 🟢 FIX: Convert "9:00 AM - 10:00 AM" into pure Supabase time "09:00:00"
        let formattedTime = time;
        if (time.includes(' - ')) {
            const startStr = time.split(' - ')[0].trim(); // Extracts just "9:00 AM"
            const [timeVal, modifier] = startStr.split(' ');
            let [hours, minutes] = timeVal.split(':');
            let h = parseInt(hours, 10);
            
            if (modifier.toUpperCase() === 'PM' && h < 12) h += 12;
            if (modifier.toUpperCase() === 'AM' && h === 12) h = 0;
            
            formattedTime = `${h.toString().padStart(2, '0')}:${minutes}:00`; // "09:00:00"
        } else if (time && time.length === 5) {
            formattedTime = `${time}:00`; // Fallback for standard time inputs
        }

        onSubmit({
            owner_id: ownerId || 'WALK_IN', 
            pet_id: petId || 'WALK_IN',   
            appointment_type: finalService,
            appointment_date: date,
            appointment_time: formattedTime, // <-- Sending the cleaned time!
            patient_reason: reason,
            
            walk_in_first_name: firstName,
            walk_in_last_name: lastName,
            walk_in_pet_name: petName,
            walk_in_pet_type: finalPetType,
            walk_in_breed: finalBreed,
            walk_in_gender: gender,
            walk_in_dob: dob,
            walk_in_age: age,
            walk_in_color: color
        });
        
        // Reset form
        setFirstName(''); setLastName(''); setEmail(''); setPhone(''); setReason('');
        setPetName(''); setPetType(''); setCustomPetType(''); setBreed(''); setCustomBreed(''); setGender(''); 
        setDob(''); setAge(''); setColor(''); setUnknownDob(false);
        setService(''); setSubService(''); setDate(''); setTime('');
        setOwnerId(''); setPetId('');
    };

    const handleSelectPet = (pet: any) => {
        const owner = fetchedPatients.find(p => p.id === pet.owner_id);
        
        // 🟢 FIX: Use the exact column names from your Supabase schema!
        setPetId(pet.pet_id || pet.id);
        setOwnerId(pet.owner_id || (owner ? owner.id : ''));
        
        setPetName(pet.pet_name || '');
        
        // 1. Smart Pet Type Auto-fill
        const rawSpecies = (pet.pet_species || '').trim().toLowerCase();
        let finalType = '';
        
        if (rawSpecies === 'dog') { finalType = 'Dog'; setPetType('Dog'); setCustomPetType(''); } 
        else if (rawSpecies === 'cat') { finalType = 'Cat'; setPetType('Cat'); setCustomPetType(''); } 
        else if (rawSpecies) { finalType = 'Other'; setPetType('Other'); setCustomPetType(pet.pet_species); } 
        else { setPetType(''); setCustomPetType(''); }

        // 2. Smart Breed Auto-fill
        const rawBreed = (pet.pet_breed || '').trim().toLowerCase();
        if (finalType === 'Dog') {
            const matchedDogBreed = dogBreeds.find(b => b.toLowerCase() === rawBreed);
            if (matchedDogBreed) { setBreed(matchedDogBreed); setCustomBreed(''); } 
            else if (rawBreed) { setBreed('Others'); setCustomBreed(pet.pet_breed); } 
            else { setBreed(''); setCustomBreed(''); }
        } else if (finalType === 'Cat') {
            const matchedCatBreed = catBreeds.find(b => b.toLowerCase() === rawBreed);
            if (matchedCatBreed) { setBreed(matchedCatBreed); setCustomBreed(''); } 
            else if (rawBreed) { setBreed('Others'); setCustomBreed(pet.pet_breed); } 
            else { setBreed(''); setCustomBreed(''); }
        } else {
            setBreed(''); setCustomBreed(pet.pet_breed || '');
        }

        // 3. Smart Gender Auto-fill
        const rawGender = (pet.pet_gender || '').trim().toLowerCase();
        if (rawGender === 'male') setGender('Male');
        else if (rawGender === 'female') setGender('Female');
        else setGender('');

        // 4. SMART DATE OF BIRTH AUTO-FILL
        let formattedDob = '';
        const rawDob = pet.birthday || pet.date_of_birth || pet.dob || ''; 
        if (rawDob) {
            try {
                if (rawDob.includes('/')) {
                    const parts = rawDob.split('/');
                    if (parts.length === 3) formattedDob = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
                } else if (rawDob.includes('-')) {
                    formattedDob = rawDob.split('T')[0].split(' ')[0];
                } else {
                    const parsedDate = new Date(rawDob);
                    if (!isNaN(parsedDate.getTime())) formattedDob = parsedDate.toISOString().split('T')[0];
                }
            } catch (e) { console.error("Could not parse date:", rawDob); }
        }
        setDob(formattedDob);
        setUnknownDob(formattedDob === '');
        setColor(pet.color_markings || pet.color || '');

        if (owner) {
            setFirstName(owner.firstName || '');
            setLastName(owner.lastName || '');
            setEmail(owner.email || '');
            setPhone(owner.contact_number || '');
        }

        setIsSearchOpen(false);
        setSearchQuery('');
    };

    const filteredSearchList = fetchedPets.filter(pet => {
        const owner = fetchedPatients.find(p => p.id === pet.owner_id);
        const searchStr = `${pet.pet_name} ${owner?.fullname} ${owner?.username}`.toLowerCase();
        return searchStr.includes(searchQuery.toLowerCase());
    });

    let validPetType = petType !== '';
    if (petType === 'Other' && customPetType.trim() === '') validPetType = false;

    const selectedServiceObj = servicesList.find(s => s.name === service);
    let validService = service !== '';
    if (selectedServiceObj?.hasOptions && subService === '') validService = false;

    const isFormValid = firstName.trim() !== '' && lastName.trim() !== '' && petName.trim() !== '' && date !== '' && time !== '' && validPetType && validService;

    return (
        <div className="modalOverlay" style={{ zIndex: 1000 }}>
            <div className="modalContainer" style={{ width: '95%', maxWidth: '600px', padding: '25px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#333', margin: 0 }}>Create New Appointment</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><IoClose size={24} color="#666" /></button>
                </div>

                <button 
                    onClick={() => setIsSearchOpen(true)}
                    style={{ width: '100%', padding: '12px', backgroundColor: '#3d67ee', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', marginBottom: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                >
                    <IoSearchSharp size={18} /> Search Existing Pet
                </button>

                {/* SCROLLABLE BODY */}
                <div style={{ overflowY: 'auto', paddingRight: '5px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* PATIENT INFORMATION */}
                    <div>
                        <div style={{ borderBottom: '2px solid #3d67ee', paddingBottom: '8px', marginBottom: '15px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#555', margin: 0 }}>Patient Information</h3>
                        </div>
                        
                        {/* ROW 1: First Name & Last Name */}
                        <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}><label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>First Name *</label><span style={{ fontSize: '11px', color: '#999' }}>{firstName.length}/50</span></div>
                                <input type="text" className="formInput" placeholder="First Name" maxLength={50} value={firstName} onChange={e => {setFirstName(e.target.value); setOwnerId('');}} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}><label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Last Name *</label><span style={{ fontSize: '11px', color: '#999' }}>{lastName.length}/50</span></div>
                                <input type="text" className="formInput" placeholder="Last Name" maxLength={50} value={lastName} onChange={e => {setLastName(e.target.value); setOwnerId('');}} />
                            </div>
                        </div>

                        {/* ROW 2: Email & Phone */}
                        <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}><label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Email</label><span style={{ fontSize: '11px', color: '#999' }}>{email.length}/60</span></div>
                                <input type="email" className="formInput" placeholder="Enter email address" maxLength={60} value={email} onChange={e => setEmail(e.target.value)} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}><label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Phone Number</label><span style={{ fontSize: '11px', color: '#999' }}>{phone.length}/13</span></div>
                                <input type="text" className="formInput" placeholder="0917-123-4567" maxLength={13} value={phone} onChange={e => setPhone(e.target.value)} />
                            </div>
                        </div>

                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}><label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Reason for Visit</label><span style={{ fontSize: '11px', color: '#999' }}>{reason.length}/200</span></div>
                            <textarea className="formInput" rows={2} placeholder="Please describe the reason for your visit" maxLength={200} value={reason} onChange={e => setReason(e.target.value)} style={{ resize: 'none' }} />
                        </div>
                    </div>

                    {/* PET INFORMATION */}
                    <div>
                        <div style={{ borderBottom: '2px solid #3d67ee', paddingBottom: '8px', marginBottom: '15px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#555', margin: 0 }}>Pet Information</h3>
                        </div>
                        <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}><label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Pet Name *</label><span style={{ fontSize: '11px', color: '#999' }}>{petName.length}/30</span></div>
                                <input type="text" className="formInput" placeholder="Enter pet name" maxLength={30} value={petName} onChange={e => {setPetName(e.target.value); setPetId('');}} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}><label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Pet Type *</label></div>
                                <select className="formInput" value={petType} onChange={e => { setPetType(e.target.value); setBreed(''); setCustomPetType(''); setCustomBreed(''); }} style={{ width: '100%', padding: '10px', height: '40px', boxSizing: 'border-box', marginBottom: petType === 'Other' ? '10px' : '0' }}>
                                    <option value="">Select type</option>
                                    <option value="Dog">Dog</option>
                                    <option value="Cat">Cat</option>
                                    <option value="Other">Other</option>
                                </select>
                                {petType === 'Other' && <input type="text" className="formInput" placeholder="Specify pet type" maxLength={30} value={customPetType} onChange={e => setCustomPetType(e.target.value)} style={{ width: '100%' }} />}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}><label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Breed</label></div>
                                {petType === 'Other' ? (
                                    <input type="text" className="formInput" placeholder="Enter breed" maxLength={30} value={customBreed} onChange={e => setCustomBreed(e.target.value)} style={{ width: '100%' }} />
                                ) : (
                                    <>
                                        <select className="formInput" value={breed} onChange={e => { setBreed(e.target.value); setCustomBreed(''); }} disabled={!petType} style={{ width: '100%', padding: '10px', height: '40px', boxSizing: 'border-box', backgroundColor: (!petType) ? '#f9f9f9' : 'white', marginBottom: breed === 'Others' ? '10px' : '0' }}>
                                            <option value="">Select breed</option>
                                            {petType === 'Dog' && dogBreeds.map(b => <option key={b} value={b}>{b}</option>)}
                                            {petType === 'Cat' && catBreeds.map(b => <option key={b} value={b}>{b}</option>)}
                                        </select>
                                        {breed === 'Others' && <input type="text" className="formInput" placeholder="Specify breed" maxLength={30} value={customBreed} onChange={e => setCustomBreed(e.target.value)} style={{ width: '100%' }} />}
                                    </>
                                )}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}><label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Color/Markings</label><span style={{ fontSize: '11px', color: '#999' }}>{color.length}/30</span></div>
                                <input type="text" className="formInput" placeholder="e.g. Brown with white spots" maxLength={30} value={color} onChange={e => setColor(e.target.value)} />
                            </div>
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ fontSize: '12px', fontWeight: '600', color: '#555', marginBottom: '5px', display: 'block' }}>Gender</label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button type="button" onClick={() => setGender('Male')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: gender === 'Male' ? 'none' : '1px solid #ddd', backgroundColor: gender === 'Male' ? '#3d67ee' : 'white', color: gender === 'Male' ? 'white' : '#555', fontWeight: '600', transition: 'all 0.2s', cursor: 'pointer' }}>♂ Male</button>
                                <button type="button" onClick={() => setGender('Female')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: gender === 'Female' ? 'none' : '1px solid #ddd', backgroundColor: gender === 'Female' ? '#e91e63' : 'white', color: gender === 'Female' ? 'white' : '#555', fontWeight: '600', transition: 'all 0.2s', cursor: 'pointer' }}>♀ Female</button>
                            </div>
                        </div>

                        {/* 🟢 FIXED: Date of Birth and Age Row with Unknown Checkbox */}
                        <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Date of Birth</label>
                                    <label style={{ fontSize: '11px', color: '#666', display: 'flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={unknownDob} 
                                            onChange={(e) => {
                                                setUnknownDob(e.target.checked);
                                                if (e.target.checked) setDob(''); // Clear date if checked
                                            }} 
                                            style={{ marginRight: '5px', cursor: 'pointer' }} 
                                        />
                                        Unknown
                                    </label>
                                </div>
                                <input 
                                    type="date" 
                                    className="formInput" 
                                    value={dob} 
                                    onChange={e => setDob(e.target.value)} 
                                    disabled={unknownDob} 
                                    style={{ 
                                        backgroundColor: unknownDob ? '#f5f5f5' : 'white', 
                                        color: unknownDob ? '#aaa' : '#333',
                                        cursor: unknownDob ? 'not-allowed' : 'text' 
                                    }} 
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '12px', fontWeight: '600', color: '#555', marginBottom: '5px', display: 'block' }}>Age</label>
                                <input 
                                    type="text" 
                                    className="formInput" 
                                    placeholder={unknownDob ? "Unknown" : "Auto-calculated"} 
                                    value={unknownDob ? "Unknown" : age} 
                                    disabled 
                                    style={{ backgroundColor: '#f5f5f5', color: '#888', cursor: 'not-allowed' }} 
                                />
                            </div>
                        </div>
                    </div>

                    {/* APPOINTMENT DETAILS (Upgraded Calendar & Time Slots) */}
                    <div>
                        <div style={{ borderBottom: '2px solid #3d67ee', paddingBottom: '8px', marginBottom: '15px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#555', margin: 0 }}>Appointment Details</h3>
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ fontSize: '12px', fontWeight: '600', color: '#555', marginBottom: '5px', display: 'block' }}>Service *</label>
                            <select className="formInput" value={service} onChange={e => { setService(e.target.value); setSubService(''); }} style={{ width: '100%', padding: '10px', marginBottom: selectedServiceObj?.hasOptions ? '10px' : '0' }}>
                                <option value="">Select Service</option>
                                {servicesList.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                            </select>
                            {selectedServiceObj?.hasOptions && (
                                <select className="formInput" value={subService} onChange={e => setSubService(e.target.value)} style={{ width: '100%', padding: '10px' }}>
                                    <option value="">Select specific option... *</option>
                                    {selectedServiceObj.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            )}
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ fontSize: '12px', fontWeight: '600', color: '#555', marginBottom: '10px', display: 'block' }}>Select Date *</label>
                            <div style={{ border: '1px solid #ddd', borderRadius: '12px', padding: '15px', backgroundColor: '#fafafa' }}>
                                <CustomCalendar 
                                    selectedDate={date} 
                                    onSelectDate={setDate} 
                                    availableDays={availableDays} 
                                    disablePastDates={true} 
                                />
                            </div>
                        </div>

                        {/* Interactive Time Slots */}
                        {date && (
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ fontSize: '12px', fontWeight: '600', color: '#555', marginBottom: '10px', display: 'block' }}>Select Time Slot *</label>
                                
                                {timeSlots.length > 0 ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        {timeSlots.map((slot, index) => (
                                            <button
                                                key={index}
                                                type="button"
                                                onClick={() => setTime(slot)}
                                                style={{
                                                    padding: '15px 10px', borderRadius: '8px', 
                                                    border: time === slot ? 'none' : '1px solid #ccc', 
                                                    backgroundColor: time === slot ? '#3d67ee' : 'white', 
                                                    color: time === slot ? 'white' : '#555', 
                                                    fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s',
                                                    boxShadow: time === slot ? '0 4px 10px rgba(61, 103, 238, 0.3)' : 'none'
                                                }}
                                            >
                                                {slot}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ padding: '15px', backgroundColor: '#fff3e0', borderLeft: '4px solid #ff9800', borderRadius: '4px' }}>
                                        <p style={{ margin: 0, fontSize: '13px', color: '#e65100' }}>No available time slots configured for this day.</p>
                                    </div>
                                )}

                                {/* Success Badge for Time */}
                                {time && (
                                    <div style={{ backgroundColor: '#e8f5e9', padding: '12px', borderRadius: '8px', color: '#2e7d32', display: 'flex', alignItems: 'center', marginTop: '15px', fontWeight: '600', fontSize: '13px' }}>
                                        <IoCheckmarkCircleOutline size={18} style={{ marginRight: '8px' }} /> Selected: {time}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '15px', marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #eee' }}>
                    <button onClick={onClose} type="button" style={{ flex: 1, padding: '12px', backgroundColor: '#f5f5f5', border: 'none', borderRadius: '8px', color: '#666', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={handleSave} type="button" disabled={!isFormValid} style={{ flex: 1, padding: '12px', backgroundColor: isFormValid ? '#3d67ee' : '#e0e0e0', border: 'none', borderRadius: '8px', color: isFormValid ? '#fff' : '#999', fontWeight: '600', cursor: isFormValid ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}>Create Appointment</button>
                </div>

                {/* SEARCH OVERLAY MODAL */}
                {isSearchOpen && (
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'white', borderRadius: '20px', zIndex: 10, padding: '25px', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#333', margin: 0 }}>Search Existing Pet</h2>
                            <button onClick={() => setIsSearchOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><IoClose size={24} color="#666" /></button>
                        </div>

                        <div style={{ position: 'relative', marginBottom: '20px' }}>
                            <IoSearchSharp size={20} color="#999" style={{ position: 'absolute', left: '15px', top: '12px' }} />
                            <input 
                                type="text" 
                                placeholder="Search by pet name, owner name..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{ width: '100%', padding: '12px 12px 12px 45px', border: '1px solid #ddd', borderRadius: '8px', outline: 'none', boxSizing: 'border-box' }}
                            />
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {loadingSearch ? (
                                <p style={{ textAlign: 'center', color: '#999', marginTop: '20px' }}>Loading database...</p>
                            ) : filteredSearchList.length > 0 ? (
                                filteredSearchList.map((pet, index) => {
                                    const owner = fetchedPatients.find(p => p.id === pet.owner_id);
                                    return (
                                        <div 
                                            key={pet.id || `pet-search-${index}`}
                                            onClick={() => handleSelectPet(pet)}
                                            style={{ border: '1px solid #eee', borderLeft: '4px solid #ff9800', borderRadius: '8px', padding: '15px', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', transition: 'background 0.2s' }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9f9f9'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                        >
                                            <div style={{ width: '45px', height: '45px', backgroundColor: '#f0f0f0', borderRadius: '50%', flexShrink: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                                <IoPaw size={20} color="#999" />
                                            </div>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                                                    <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#333' }}>{pet.pet_name}</span>
                                                    <span style={{ backgroundColor: '#ff9800', color: 'white', fontSize: '10px', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>Has Record</span>
                                                </div>
                                                <div style={{ fontSize: '13px', color: '#666', marginBottom: '5px' }}>
                                                    Owner: {owner ? (owner.fullname || owner.username) : 'Unknown'}
                                                </div>
                                                <div style={{ fontSize: '12px', color: '#999' }}>
                                                    {pet.pet_species} • {pet.pet_breed || 'Unknown Breed'} • {pet.pet_gender || 'Unknown'}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })
                            ) : (
                                <p style={{ textAlign: 'center', color: '#999', marginTop: '20px' }}>No pets found matching "{searchQuery}"</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ==========================================
//  2. CONFIRMATION MODAL
// ==========================================
const ConfirmationModal = ({ visible, onClose, onConfirm, title, message, confirmText = 'Yes', cancelText = 'No', confirmColor = '#3d67ee', type = 'info' }: any) => {
    if (!visible) return null;
    const getIconProps = () => {
        switch(type) {
            case 'cancel': return { icon: <IoCloseCircle size={40} color="#d32f2f" />, bg: '#ffebee' };
            case 'complete': return { icon: <IoCheckmarkCircleOutline size={40} color="#2e7d32" />, bg: '#e8f5e9' };
            default: return { icon: <IoInformationCircle size={40} color="#3d67ee" />, bg: '#e3f2fd' };
        }
    };
    const { icon, bg } = getIconProps();
    const btnColor = type === 'cancel' ? '#d32f2f' : (type === 'complete' ? '#2e7d32' : confirmColor);

    return (
        <div className="modalOverlay">
            <div className="modalContainer" style={{ width: '40%', maxWidth: '400px', padding: '0', display: 'flex', flexDirection: 'column' }}>
                <div style={{ alignItems: 'center', paddingTop: '30px', paddingBottom: '20px', display: 'flex', justifyContent: 'center' }}>
                    <div style={{ width: '70px', height: '70px', borderRadius: '35px', backgroundColor: bg, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>{icon}</div>
                </div>
                <div style={{ padding: '0 30px', textAlign: 'center', flex: 1 }}>
                    <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#333', marginBottom: '10px' }}>{title}</h2>
                    <p style={{ fontSize: '16px', color: '#666', lineHeight: '22px' }}>{message}</p>
                </div>
                <div style={{ display: 'flex', padding: '20px', borderTop: '1px solid #f0f0f0', marginTop: '20px', gap: '15px' }}>
                    <button onClick={onClose} style={{ flex: 1, padding: '12px', backgroundColor: '#f5f5f5', border: 'none', borderRadius: '8px', color: '#666', fontWeight: '600', cursor: 'pointer' }}>{cancelText}</button>
                    <button onClick={() => { onConfirm(); onClose(); }} style={{ flex: 1, padding: '12px', backgroundColor: btnColor, border: 'none', borderRadius: '8px', color: 'white', fontWeight: '600', cursor: 'pointer' }}>{confirmText}</button>
                </div>
            </div>
        </div>
    );
};

// ==========================================
//  3. ASSIGN DOCTOR MODAL
// ==========================================
const AssignDoctorModal = ({ visible, onClose, appointment, doctors, onAssign }: any) => {
    if (!visible) return null;
    return <div className="modalOverlay"><div className="modalContainer">...</div></div>;
};

// ==========================================
//  4. TABLE VIEW COMPONENT
// ==========================================
const TableView = ({ onViewUser, loading, filteredAppointments, service, setService, doctorFilter, setDoctorFilter, selectedCalendarDate, setSelectedCalendarDate, tableSearchQuery, setTableSearchQuery, doctors, userData, handleCreateAppointment }: any) => {
  return (
    <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '20px', flex: 1, display: 'flex', flexDirection: 'column', boxShadow: '0 0 18px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <div>
          <h2 style={{ fontSize: '25px', fontWeight: '700', margin: 0 }}>Booked Appointments</h2>
          <p style={{ fontSize: '14px', marginTop: '5px', color: '#888', margin: 0 }}>
            {loading ? 'Loading appointments...' : `Total appointments: ${filteredAppointments.length}`}
          </p>
        </div>
        
        <button onClick={handleCreateAppointment} className="blackBtn" style={{ backgroundColor: '#3d67ee', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IoAddCircle size={20} color="#fff" />
          <span>Create Appointment</span>
        </button>
      </div>
      
      {loading ? (
        <div className="loadingContainer"><div className="spinner"></div></div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          
          {/* SEARCH & FILTER ROW */}
          <div style={{ display: 'flex', alignItems: 'center', marginLeft: '5px', marginTop: '20px', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
            
            {/* Search Bar */}
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #ddd', borderRadius: '8px', padding: '8px 12px', backgroundColor: '#fff', width: '250px' }}>
                <IoSearchSharp size={18} color="#999" style={{ marginRight: '8px' }} />
                <input 
                    type="text" 
                    placeholder="Search name, pet, or service..." 
                    value={tableSearchQuery}
                    onChange={(e) => setTableSearchQuery(e.target.value)}
                    style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13px' }}
                />
            </div>

            {/* Divider Line */}
            <div style={{ width: '1px', height: '30px', backgroundColor: '#eee', margin: '0 5px' }}></div>

            <IoFilterSharp size={25} color="#3d67ee" style={{ marginRight: '5px' }} />
            
            <div>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Service</div>
              <select value={service} onChange={(e) => setService(e.target.value)} className="filterSelect" style={{ width: '150px' }}>
                <option value="" style={{color: '#a8a8a8'}}>All Services</option>
                <option value="Pet Grooming">Pet Grooming</option>
                <option value="Consultation & Check-Up">Check-up or Consultation</option>
                <option value="Dental Prophylaxis">Dental Prophylaxis</option>
                <option value="Pet Boarding">Pet Boarding</option>
                <option value="Confinement">Confinement</option>
                <option value="X-Ray">X-Ray</option>
                <option value="Ultrasound">Ultrasound</option>
                <option value="Laboratory Tests">Laboratory Tests</option>
                <option value="Vaccinations">Vaccinations</option>
              </select>
            </div>
            
            <div>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Doctor</div>
              <select value={doctorFilter} onChange={(e) => setDoctorFilter(e.target.value)} className="filterSelect" style={{ width: '180px' }}>
                <option value="" style={{color: '#a8a8a8'}}>All Doctors</option>
                <option value="Not Assigned">Not Assigned</option>
                {doctors.map((doctor: any) => (
                  <option key={doctor.pk || doctor.id} value={doctor.fullName || doctor.name}>
                    {doctor.fullName || doctor.name} ({doctor.role || 'Doctor'})
                  </option>
                ))}
              </select>
            </div>
            
            {/* Clear Filters Button */}
            {(service || doctorFilter || selectedCalendarDate || tableSearchQuery) && (
              <button onClick={() => { setService(''); setDoctorFilter(''); setSelectedCalendarDate(''); setTableSearchQuery(''); }} style={{ marginLeft: '15px', display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer' }}>
                <IoCloseCircle size={18} color="#666" />
                <span style={{ marginLeft: '5px', fontSize: '12px', color: '#666' }}>
                  {(selectedCalendarDate || tableSearchQuery) ? 'Clear All Filters' : 'Clear'}
                </span>
              </button>
            )}
          </div>

          {/* TABLE DATA */}
          <div className="tableWrapper" style={{ marginTop: '0' }}>
            <table className="dataTable">
                <thead>
                    <tr>
                        <th style={{ width: '15%' }}>Owner Name</th>
                        <th style={{ width: '15%' }}>Pet Name</th>
                        <th style={{ textAlign: 'center', width: '20%' }}>Service</th>
                        <th style={{ textAlign: 'center', width: '10%' }}>Date</th>
                        <th style={{ textAlign: 'center', width: '10%' }}>Time</th>
                        <th style={{ textAlign: 'center', width: '10%' }}>Status</th>
                        <th style={{ textAlign: 'center', width: '15%' }}>Doctor</th>
                        <th style={{ textAlign: 'right', width: '5%' }}>View</th>
                    </tr>
                </thead>
                <tbody>
                {filteredAppointments.length > 0 ? (
                    filteredAppointments.map((user: any, index: number) => (
                    <tr key={user.id || `appt-row-${index}`}>
                        <td className="tableFont" style={{ fontWeight: '600', color: '#333' }}>{user.ownerName}</td>
                        <td className="tableFont" style={{ color: '#555' }}>{user.petName}</td>
                        <td className="tableFont" style={{ textAlign: 'center' }}>{user.service}</td>
                        <td className="tableFont" style={{ textAlign: 'center' }}>{user.date_display}</td>
                        {/* Time color changed to #555 here */}
                        <td className="tableFont" style={{ textAlign: 'center', fontWeight: '500', color: '#555' }}>{user.time_display}</td>
                        <td style={{ textAlign: 'center' }}>
                            <div className="statusBadge" style={{
                                backgroundColor: user.status === 'pending' ? '#fff3e0' : (user.status === 'scheduled' ? '#e8f5e9' : '#ffebee'),
                                display: 'inline-block'
                            }}>
                                <span style={{
                                    fontSize: '11px', fontWeight: '600',
                                    color: user.status === 'pending' ? '#f57c00' : (user.status === 'scheduled' ? '#2e7d32' : '#d32f2f')
                                }}>
                                    {user.status ? user.status.toUpperCase() : 'SCHEDULED'}
                                </span>
                            </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: '12px', color: user.doctor === 'Not Assigned' ? '#f57c00' : '#333' }}>{user.doctor}</span>
                                {user.doctor === 'Not Assigned' && <IoAlertCircleOutline size={14} color="#f57c00" style={{ marginLeft: '5px' }} />}
                            </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                            <button onClick={() => onViewUser(user)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                <IoEyeOutline size={18} color="#3d67ee" />
                            </button>
                        </td>
                    </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan={8} className="noData">
                            {userData.length === 0 ? 'No appointments found' : 'No appointments matching your filters'}
                        </td>
                    </tr>
                )}
                </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
//  5. USER DETAILS VIEW
// ==========================================
const UserDetailsView = ({ user, onBack, onCancel, onComplete, onAssignDoctor, onReschedule }: any) => {
    if (!user) return null;
    return <div style={{ backgroundColor: 'white', padding: '30px' }}>...</div>;
};

// ==========================================
//  6. MAIN COMPONENT (SCHEDULE)
// ==========================================
export default function Schedule() {
    const navigate = useNavigate();

    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
    const [service, setService] = useState('');
    const [doctorFilter, setDoctorFilter] = useState('');
    const [tableSearchQuery, setTableSearchQuery] = useState(''); 
    const [bookedDates, setBookedDates] = useState<any>({});
    
    // LOGOUT POPUP STATE
    const [logoutModalVisible, setLogoutModalVisible] = useState(false);
    const [modalConfig, setModalConfig] = useState<ModalConfigType>({ type: 'info', title: '', message: '', onConfirm: null, showCancel: false });

    // Calendar state
    const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>('');
    
    const [currentView, setCurrentView] = useState('table'); 
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [selectedDoctor, setSelectedDoctor] = useState('');
    const [showDoctorModal, setShowDoctorModal] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
    
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [selectedAppointmentForCancel, setSelectedAppointmentForCancel] = useState<any>(null);
    const [showRescheduleModal, setShowRescheduleModal] = useState(false);
    const [selectedAppointmentForReschedule, setSelectedAppointmentForReschedule] = useState<any>(null);

    const [userData, setUserData] = useState<any[]>([]);
    const [doctors, setDoctors] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const [showConfirmationModal, setShowConfirmationModal] = useState(false);
    const [confirmationAction, setConfirmationAction] = useState<any>(null);
    const [selectedAppointmentForAction, setSelectedAppointmentForAction] = useState<any>(null);
    const [confirmationType, setConfirmationType] = useState('info');

    const showAlert = (type: 'info' | 'success' | 'error' | 'confirm', title: string, message: string | React.ReactNode, onConfirm: (() => void) | null = null, showCancel = false) => {
      setModalConfig({ type, title, message, onConfirm, showCancel });
      setLogoutModalVisible(true);
    };

    const handleLogoutPress = () => {
      showAlert('confirm', 'Log Out', 'Are you sure you want to log out?', async () => {
        try {
          await supabase.auth.signOut();
        } catch (error) { 
            console.error("Logout failed:", error); 
        }
        localStorage.removeItem('userSession'); 
        setCurrentUser(null);
        navigate('/Login'); 
      }, true); 
    };

    useEffect(() => {
        const loadUser = () => {
          try {
            const session = localStorage.getItem('userSession');
            if (session) setCurrentUser(JSON.parse(session));
            else setCurrentUser(null);
          } catch (error) { console.error("Failed to load user session", error); }
        };
        loadUser();
    }, []);

    const filteredAppointments = userData.filter(appointment => {
      // 1. Hide completed/cancelled
      if (appointment.status === 'completed' || appointment.status === 'cancelled') return false;
      
      // 2. Calendar Date Filter
      if (selectedCalendarDate && !appointment.date_time.includes(selectedCalendarDate)) return false; 
      
      // 3. Dropdown Filters
      const matchesService = service === '' || (appointment.service && appointment.service.includes(service));
      const matchesDoctor = doctorFilter === '' || appointment.doctor === doctorFilter;
      
      // 4. 🟢 STRICT SEARCH: Only checks Owner Name and Pet Name
      const searchLower = (tableSearchQuery || '').toLowerCase().trim();
      
      // We combine them safely so it doesn't crash if a pet has no name
      const combinedNames = `${appointment.ownerName || ''} ${appointment.petName || ''}`.toLowerCase();
      const matchesSearch = searchLower === '' || combinedNames.includes(searchLower);

      return matchesService && matchesDoctor && matchesSearch;
    });

    const handleViewUser = (user: any) => {
        setSelectedUser(user);
        setSelectedAppointment(user); 
        setSelectedDoctor(user.assignedDoctor || '');
        setCurrentView('userDetails');
    };

    const openDoctorModal = (appointment: any) => {
        setSelectedAppointment(appointment);
        setShowDoctorModal(true);
    };
    
    const handleBackToList = () => {
        setCurrentView('table');
        setSelectedUser(null);
        setSelectedDoctor('');
    };

    const handleAssignDoctor = async (appointmentId: any, doctorId: any) => {
        try {
            const result = await availabilityService.assignDoctor(appointmentId, doctorId);
            const updatedUserData = userData.map(appointment => {
                if (appointment.id === appointmentId) {
                    const doctor = doctors.find(d => (d.pk || d.id) === doctorId);
                    return {
                        ...appointment,
                        doctor: doctor ? doctor.fullName : 'Unknown Doctor',
                        assignedDoctor: doctorId
                    };
                }
                return appointment;
            });
            setUserData(updatedUserData);
            
            if (selectedUser && selectedUser.id === appointmentId) {
                const doctor = doctors.find(d => (d.pk || d.id) === doctorId);
                setSelectedUser((prev: any) => ({
                    ...prev,
                    doctor: doctor ? doctor.fullName : 'Unknown Doctor',
                    assignedDoctor: doctorId
                }));
            }
            window.alert('Success: ' + (result.message || 'Doctor assigned successfully!'));
            return result;
        } catch (error: any) {
            window.alert('Error: ' + (error.message || 'Failed to assign doctor'));
            throw error;
        }
    };

    const handleCancelAppointment = (appointment: any) => {
        if (!appointment || !appointment.id) { window.alert('Error: Invalid appointment data'); return; }
        setSelectedAppointmentForCancel(appointment);
        setShowCancelModal(true);
    };

    const handleCancelWithReason = async (cancellationData: any) => {
        try {
            setLoading(true);
            const currentUserId = 1; 
            const fullCancelData = { ...cancellationData, cancelled_by: currentUserId };
            const result = await availabilityService.cancelAppointmentWithReason(selectedAppointmentForCancel.id, fullCancelData);
            
            const updatedUserData = userData.filter(user => user.id !== selectedAppointmentForCancel.id);
            setUserData(updatedUserData);
            
            if (selectedUser && selectedUser.id === selectedAppointmentForCancel.id) {
                setCurrentView('table');
                setSelectedUser(null);
            }
            
            setShowCancelModal(false);
            setSelectedAppointmentForCancel(null);
            return result;
        } catch (error: any) {
            window.alert('Error: ' + (error.message || 'Failed to cancel appointment'));
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const handleRescheduleAppointment = (appointment: any) => {
        if (!appointment || !appointment.id) { window.alert('Error: Invalid appointment data'); return; }
        setSelectedAppointmentForReschedule(appointment);
        setShowRescheduleModal(true);
    };

    const handleRescheduleSubmit = async (rescheduleData: any) => {
        try {
            setLoading(true);
            const currentUserId = 1; 
            const fullRescheduleData = { ...rescheduleData, requested_by: currentUserId };
            const result = await availabilityService.createRescheduleRequest(selectedAppointmentForReschedule.id, fullRescheduleData);
            
            setShowRescheduleModal(false);
            setSelectedAppointmentForReschedule(null);
            return result;
        } catch (error: any) {
            window.alert('Error: ' + (error.message || 'Failed to create reschedule request'));
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const handleCompleteAppointment = (appointment: any) => {
        if (!appointment || !appointment.id) { window.alert('Error: Invalid appointment data'); return; }
        setSelectedAppointmentForAction(appointment);
        setConfirmationType('complete');
        setConfirmationAction(() => async () => {
            try {
                setLoading(true);
                const result = await availabilityService.updateAppointmentStatus(appointment.id, 'completed');
                if (result) {
                    const updatedUserData = userData.filter(user => user.id !== appointment.id);
                    setUserData(updatedUserData);
                    if (selectedUser && selectedUser.id === appointment.id) {
                        setCurrentView('table');
                        setSelectedUser(null);
                    }
                    window.alert('Success: Appointment marked as completed and moved to history.');
                }
            } catch (error: any) {
                window.alert('Error: ' + (error.message || 'Failed to complete appointment.'));
            } finally {
                setLoading(false);
                setSelectedAppointmentForAction(null);
            }
        });
        setShowConfirmationModal(true);
    };

    const handleCreateAppointment = () => setShowCreateModal(true);

    const loadAppointments = async () => {
        setLoading(true);
        try {
            // 1. Fetch all appointments from Supabase directly
            const { data: appts, error: apptError } = await supabase
                .from('appointments')
                .select('*')
                .order('appointment_date', { ascending: true }); // Show soonest first
                
            if (apptError) throw apptError;

            // 2. Fetch Patients & Pets so we can match their IDs to their real names
            const { data: patients } = await supabase.from('patient_account').select('id, firstName, lastName, username');
            const { data: pets } = await supabase.from('pet_profile').select('pet_id, pet_name');

            // 3. Format the data perfectly for the Table!
            const formattedData = (appts || []).map(app => {
                // Find the matching owner and pet (Convert to strings just to be safe!)
                const owner = (patients || []).find(p => String(p.id) === String(app.owner_id));
                const pet = (pets || []).find(p => String(p.pet_id) === String(app.pet_id));
                
                let ownerName = 'Unknown Owner';
                if (owner) {
                    const constructedName = `${owner.firstName || ''} ${owner.lastName || ''}`.trim();
                    ownerName = constructedName || owner.username || 'Unknown Owner';
                }

                const petName = pet ? pet.pet_name : 'Unknown Pet';

                // Format Time from "14:00:00" to "2:00 PM"
                // Format Time to include the 1-hour range (e.g. "1:00 PM - 2:00 PM")
                let timeStr = app.appointment_time || '';
                if (timeStr) {
                    const [h, m] = timeStr.split(':');
                    const startHours = parseInt(h, 10);
                    
                    // 1. Format Start Time
                    const startAmPm = startHours >= 12 ? 'PM' : 'AM';
                    const formatStartH = startHours % 12 || 12;
                    const startTimeFormatted = `${formatStartH}:${m} ${startAmPm}`;

                    // 2. Format End Time (Adding 1 hour)
                    const endHours = (startHours + 1) % 24; 
                    const endAmPm = (endHours >= 12 && endHours < 24) ? 'PM' : 'AM';
                    const formatEndH = endHours % 12 || 12;
                    const endTimeFormatted = `${formatEndH}:${m} ${endAmPm}`;

                    // Combine them!
                    timeStr = `${startTimeFormatted} - ${endTimeFormatted}`;
                }

                return {
                    id: app.appointment_id,
                    ownerName: ownerName,
                    petName: petName,     
                    name: `${ownerName} ${petName}`, // Hidden combo for filters
                    service: app.appointment_type || 'General',
                    date_time: `${app.appointment_date} ${timeStr}`, // Hidden combo for filters
                    date_display: app.appointment_date, // 🟢 NEW: Separated Date
                    time_display: timeStr,              // 🟢 NEW: Separated Time
                    date_only: app.appointment_date,
                    status: app.status || 'scheduled',
                    doctor: 'Not Assigned', 
                    raw_data: app
                };
            });
            setUserData(formattedData);
            
            // 4. Generate the blue dots for the Calendar
            const booked: any = {};
            formattedData.forEach((app: any) => {
                if (app.date_only) {
                    booked[app.date_only] = true;
                }
            });
            setBookedDates(booked);

        } catch (error) {
            console.error("Error loading appointments:", error);
            window.alert('Error: Failed to load complete appointment details');
        } finally {
            setLoading(false);
        }
    };

    const loadDoctors = async () => {
        try {
            const doctorsList = await availabilityService.getDoctors();
            const formattedDoctors = doctorsList.map((doctor: any) => ({
                id: doctor.pk || doctor.id,
                pk: doctor.pk,
                fullName: doctor.fullname || doctor.fullName || doctor.name || 'Unknown',
                name: doctor.fullname || doctor.fullName || doctor.name || 'Unknown',
                role: doctor.role || 'Veterinarian',
                department: doctor.department || 'General',
                userImage: doctor.userImage || doctor.userimage,
            }));
            setDoctors(formattedDoctors);
        } catch (error) {
            console.error('Failed to load doctors:', error);
        }
    };

    const handleSubmitAppointment = async (appointmentData: any) => {
        try {
            setLoading(true);

            // Send the data to Python (Even if it says 'WALK_IN')!
            await availabilityService.createAppointment(appointmentData);
            
            setShowCreateModal(false);
            window.alert('Success: Appointment created successfully!');
            
            loadAppointments(); 
            
        } catch (error: any) {
            window.alert('Error: ' + (error.message || 'Failed to create appointment'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAppointments();
        loadDoctors();
    }, []);

    const handleCloseModal = () => {
        setShowCreateModal(false);
        setTimeout(() => { loadAppointments(); }, 300);
    };

    return (
        <div className="biContainer">
            
            <Navbar currentUser={currentUser} onLogout={handleLogoutPress} />

            {/* BODY CONTAINER */}
            <div className="bodyContainer">
                <div className="topContainer">
                    <div className="subTopContainer">
                        <IoDocumentTextOutline size={20} color="#3d67ee" style={{ marginTop: '2px' }} />
                        <span className="blueText" style={{ marginLeft: '10px' }}>
                            {currentView === 'table' ? 'Appointments / Schedule' : 'Patient Details'}
                        </span>
                    </div>
                    <div className="invSubTopContainer invNotificationContainer" style={{padding: 20}}>
                                <Notifications 
                                  buttonClassName="invIconButton"
                                  iconClassName="invBlueIcon"
                                  onViewAll={() => {
                                    console.log('View all notifications');
                                  }}
                                  onNotificationClick={(notification) => {
                                    if (notification.link) {
                                      navigate(notification.link);
                                    }
                                  }}
                                />
                              </div>
                </div>

                {/* TABLE/VIEW AREA WITH SIDEBAR */}
                <div className="tableContainer" style={{ flexDirection: 'row', gap: '20px', padding: 0, backgroundColor: 'transparent', boxShadow: 'none' }}>
                    
                    {/* LEFT SIDEBAR (Calendar & Doctors) */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', minWidth: '500px', maxWidth: '500px' }}>
                        
                        {/* 🟢 DASHBOARD CALENDAR (No blocked days) */}
                        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '20px', boxShadow: '0 0 18px rgba(0,0,0,0.05)' }}>
                            <CustomCalendar 
                                selectedDate={selectedCalendarDate} 
                                onSelectDate={setSelectedCalendarDate} 
                                bookedDates={bookedDates} 
                            />
                        </div>

                       {/* Doctors List */}
                        <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '20px', flex: 1, boxShadow: '0 0 18px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '5px', flexShrink: 0 }}>Doctors Available</h3>
                            
                            <div className="doctors-scroll-container" style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                {doctors.map((doctor, index) => (
                                    <div 
                                        key={doctor.id || `doctor-${index}`}
                                        style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            padding: '12px 0',
                                            borderBottom: index === doctors.length - 1 ? 'none' : '1px solid #eee' 
                                        }}
                                    >
                                        <img src={doctor.userImage || defaultUserImg} style={{ width: '45px', height: '45px', borderRadius: '50%', marginRight: '12px', objectFit: 'cover' }} alt="Dr" />
                                        <div>
                                            <div style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>{doctor.name}</div>
                                            <div style={{ fontSize: '12px', color: '#666' }}>{doctor.department}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* MAIN CONTENT AREA */}
                    <div style={{ flex: 3, display: 'flex', flexDirection: 'column' }}>
                        {currentView === 'table' ? (
                            <TableView 
                                onViewUser={handleViewUser}
                                loading={loading}
                                filteredAppointments={filteredAppointments}
                                service={service}
                                setService={setService}
                                doctorFilter={doctorFilter}
                                setDoctorFilter={setDoctorFilter}
                                selectedCalendarDate={selectedCalendarDate}
                                setSelectedCalendarDate={setSelectedCalendarDate}
                                // 🟢 FIX: These two lines connect the Search Bar to your data!
                                tableSearchQuery={tableSearchQuery}       
                                setTableSearchQuery={setTableSearchQuery} 
                                doctors={doctors}
                                userData={userData}
                                handleCreateAppointment={handleCreateAppointment}
                            />
                        ) : (
                            <UserDetailsView 
                                user={selectedUser} 
                                onBack={handleBackToList}
                                onCancel={handleCancelAppointment}
                                onComplete={handleCompleteAppointment}
                                onAssignDoctor={openDoctorModal} 
                                onReschedule={handleRescheduleAppointment}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* MODALS */}
            <AssignDoctorModal 
                visible={showDoctorModal}
                onClose={() => setShowDoctorModal(false)}
                appointment={selectedAppointment}
                doctors={doctors}
                onAssign={handleAssignDoctor}
            />

            <CreateAppointmentModal 
                visible={showCreateModal}
                onClose={handleCloseModal}
                onSubmit={handleSubmitAppointment}
            />

            <ConfirmationModal 
                visible={showConfirmationModal}
                onClose={() => {
                    setShowConfirmationModal(false);
                    setSelectedAppointmentForAction(null);
                }}
                onConfirm={confirmationAction}
                title={confirmationType === 'cancel' ? 'Cancel Appointment' : 'Complete Appointment'}
                message={confirmationType === 'cancel' 
                    ? 'Are you sure you want to cancel this appointment? This will move it to history.'
                    : 'Mark this appointment as completed? It will be moved to history.'
                }
                confirmText={confirmationType === 'cancel' ? 'Yes, Cancel' : 'Yes, Complete'}
                cancelText="No"
                type={confirmationType}
            />

            {showCancelModal && (
                <AdminCancelAppointmentModal 
                    visible={showCancelModal}
                    onClose={() => { setShowCancelModal(false); setSelectedAppointmentForCancel(null); }}
                    appointment={selectedAppointmentForCancel}
                    onSubmit={handleCancelWithReason}
                    currentUserId={1} // Replace with Auth ID
                />
            )}

            {showRescheduleModal && (
                <AdminRescheduleModal 
                    visible={showRescheduleModal}
                    onClose={() => { setShowRescheduleModal(false); setSelectedAppointmentForReschedule(null); }}
                    appointment={selectedAppointmentForReschedule}
                    onSubmit={handleRescheduleSubmit}
                    currentUserId={1} // Replace with Auth ID
                />
            )}

            {logoutModalVisible && (
                <div className="modalOverlay">
                    <div className="alertModal">
                        <div className="alertIcon">
                            {modalConfig.type === 'success' ? <IoCheckmarkCircleOutline size={55} color="#2e9e0c" /> : 
                             modalConfig.type === 'error' ? <IoCloseCircleOutline size={55} color="#d93025" /> : 
                             <IoAlertCircleOutline size={55} color="#3d67ee" />}
                        </div>
                        <h3 className="alertTitle">{modalConfig.title}</h3>
                        {typeof modalConfig.message === 'string' ? (
                            <p className="alertMessage">{modalConfig.message}</p>
                        ) : (
                            <div style={{ marginBottom: '25px' }}>{modalConfig.message}</div>
                        )}
                        <div className="alertActions">
                            {modalConfig.showCancel && (
                                <button className="alertBtn cancelAlertBtn" onClick={() => setLogoutModalVisible(false)}>Cancel</button>
                            )}
                            <button 
                                className={`alertBtn ${modalConfig.type === 'error' ? 'errorBtn' : 'confirmAlertBtn'}`}
                                onClick={() => {
                                    setLogoutModalVisible(false);
                                    if (modalConfig.onConfirm) modalConfig.onConfirm();
                                }} 
                            >
                                {modalConfig.type === 'confirm' ? 'Confirm' : 'OK'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}