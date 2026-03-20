// apiService.ts
// All HTTP calls to the Flask backend live here.
// Every page imports from this file instead of calling fetch/axios inline.

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

// ─── Generic fetch wrapper ────────────────────────────────────────────────────

async function request<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('access_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw Object.assign(new Error(body.error ?? 'Request failed'), {
      status: res.status,
      data: body,
    });
  }

  return res.json();
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const apiService = {

  login(payload: { email: string; username: string; password: string }) {
    return request('/login', { method: 'POST', body: JSON.stringify(payload) });
  },

  signup(payload: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    contactNumber: string;
    username: string;
  }) {
    return request('/signup', { method: 'POST', body: JSON.stringify(payload) });
  },

  forgotPassword(email: string) {
    return request('/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  verifyOtp(payload: { email: string; otp: string; mode: string }) {
    return request('/verify-otp', { method: 'POST', body: JSON.stringify(payload) });
  },

  resendOtp(payload: { email: string; mode: string }) {
    return request('/resend-otp', { method: 'POST', body: JSON.stringify(payload) });
  },

  changePassword(payload: { email: string; new_password: string }) {
    return request('/change-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // ─── Pets ───────────────────────────────────────────────────────────────

  getUserPets(userId: string) {
    return request(`/pets/user/${userId}`);
  },

  addPet(payload: {
    owner_id: string;
    pet_name: string;
    pet_type: string;
    breed: string;
    pet_size: string;
    gender: string;
    birthday?: string;
    age?: string;
    weight_kg?: string;
    pet_photo_url?: string;
    vaccination_urls?: string[];
  }) {
    return request('/pets', { method: 'POST', body: JSON.stringify(payload) });
  },

  updatePet(petId: number, payload: Partial<{
    pet_name: string;
    pet_species: string;
    pet_breed: string;
    pet_gender: string;
    pet_size: string;
    birthday: string;
    age: string;
    weight_kg: string;
    pet_photo_url: string;
    vaccination_urls: string[];
  }>) {
    return request(`/pets/${petId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  deletePet(petId: number) {
    return request(`/pets/${petId}`, { method: 'DELETE' });
  },

  uploadPetPhoto(fileBase64: string, fileName: string, mimeType: string) {
    return request('/upload-pet-photo', {
      method: 'POST',
      body: JSON.stringify({
        file: fileBase64,
        file_name: fileName,
        mime_type: mimeType,
      }),
    });
  },

  // ─── Appointments ────────────────────────────────────────────────────────

  getUserAppointments(userId: string) {
    return request(`/appointments/user/${userId}`);
  },

  bookAppointment(payload: {
    owner_id: string;
    pet_id: number;
    appointment_type: string;
    appointment_date: string;
    appointment_time: string;
    patient_reason?: string;
    branch_id?: number;
  }) {
    return request('/appointments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  cancelAppointment(appointmentId: number, reason: string) {
    return request(`/appointments/${appointmentId}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ cancel_reason: reason }),
    });
  },

  rescheduleAppointment(
    appointmentId: number,
    payload: {
      new_date: string;
      new_time: string;
      reschedule_reason: string;
    }
  ) {
    return request(`/appointments/${appointmentId}/reschedule`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  // ─── Grooming details ────────────────────────────────────────────────────

  saveGroomingDetails(payload: {
    appointment_id: number;
    haircut_style: string;
    haircut_description?: string;
    haircut_reference_url?: string;
  }) {
    return request('/grooming-details', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // ─── Medical information ─────────────────────────────────────────────────

  saveMedicalInformation(payload: {
    appointment_id: number;
    is_pregnant?: boolean;
    is_vaccinated?: boolean;
    has_allergies?: boolean;
    allergy_details?: string;
    has_skin_condition?: boolean;
    been_groomed_before?: boolean;
    on_medication?: boolean;
    medication_details?: string;
    skin_condition_details?: string;
    flea_tick_prevention?: boolean;
    additional_notes?: string;
  }) {
    return request('/medical-information', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // ─── Branches ────────────────────────────────────────────────────────────

  getBranches() {
    return request('/branches');
  },

  // ─── User profile ────────────────────────────────────────────────────────

  updateProfile(userId: string, payload: Partial<{
    firstName: string;
    lastName: string;
    contact_number: string;
    userImage: string;
  }>) {
    return request(`/profile/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
};