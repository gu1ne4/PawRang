// apiService.ts
// All HTTP calls to the Flask backend live here.
// Every page imports from this file instead of calling fetch inline.

const BASE_URL = 'http://127.0.0.1:5000';

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
    const error = Object.assign(new Error(body.error ?? 'Request failed'), {
      status: res.status,
      data: body,
      response: {
        status: res.status,
        data: body,
      },
    });
    throw error;
  }

  return res.json();
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const apiService = {

  login(payload: { identifier: string; password: string }) {
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

  getProfile(userId: string) {
    return request(`/profile/${userId}`);
  },

  changeAuthenticatedPassword(
    userId: string,
    payload: { current_password: string; new_password: string }
  ) {
    return request(`/profile/${userId}/change-password`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },




// 

// ─── Admin Schedule & Appointment Endpoints ───────────────────────────────

  getAppointmentsForTable() {
    return request('/api/appointments/table');
  },

  getDoctors() {
    // In your app.py, /accounts and /api/doctors both route to get_accounts()
    return request('/api/doctors');
  },

  updateAppointmentStatus(appointmentId: string | number, status: string, recordType: string) {
    return request(`/api/appointments/${appointmentId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, recordType }),
    });
  },

  assignDoctor(appointmentId: string | number, doctorId: string | number, recordType: string) {
    return request(`/api/appointments/${appointmentId}/assign-doctor`, {
      method: 'PUT',
      body: JSON.stringify({ doctorId, recordType }),
    });
  },

  cancelAppointmentWithReason(appointmentId: string | number, data: any, recordType: string) {
    return request(`/api/appointments/${appointmentId}/cancel-with-reason`, {
      method: 'PUT',
      body: JSON.stringify({ ...data, recordType }),
    });
  },

  createRescheduleRequest(appointmentId: string | number, data: any, recordType: string) {
    return request(`/api/appointments/${appointmentId}/reschedule`, {
      method: 'POST',
      body: JSON.stringify({ ...data, recordType }),
    });
  },

  reviewRescheduleRequest(requestId: string | number, action: string, note?: string) {
    return request(`/api/reschedule-requests/${requestId}/review`, {
      method: 'PUT',
      body: JSON.stringify({ action, note }),
    });
  },

  createAdminAppointment(payload: any) {
    return request('/api/appointments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Update your existing saveMedicalInformation to handle both types (walkin & appointment)
  saveMedicalInformation(payload: any) {
    return request('/api/medical-information', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

// 


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
    is_vaccinated?: boolean;
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
    is_vaccinated: boolean;
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

  uploadProfilePhoto(fileBase64: string, fileName: string, mimeType: string) {
    return request('/upload-profile-photo', {
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
      requested_by?: string | null;
      recordType?: string;
    }
  ) {
    return request(`/api/appointments/${appointmentId}/request-reschedule`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  withdrawRescheduleRequest(requestId: number) {
    return request(`/api/reschedule-requests/${requestId}/withdraw`, {
      method: 'PUT',
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

  getAdminAppointmentSearchData() {
    return request('/api/admin/appointment-search-data');
  },

  getEmrSearchPets() {
    return request('/api/emr/search-pets');
  },

  getEmrRecords() {
    return request('/api/emr/records');
  },

  getEmrRecord(recordId: number | string) {
    return request(`/api/emr/records/${recordId}`);
  },

  createEmrRecord(payload: any) {
    return request('/api/emr/records', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateEmrRecord(recordId: number | string, payload: any) {
    return request(`/api/emr/records/${recordId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  deleteEmrRecord(recordId: number | string) {
    return request(`/api/emr/records/${recordId}`, {
      method: 'DELETE',
    });
  },

  getEmrPetAppointments(petId: number | string) {
    return request(`/api/emr/pets/${petId}/appointments`);
  },

  logout() {
    return request('/logout', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  // ─── User profile ────────────────────────────────────────────────────────

  getDayAvailability() {
    return request('/api/day-availability').then((data: any) => {
      const dayAvailability: Record<string, boolean> = {
        sunday: false,
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
      };

      (Array.isArray(data) ? data : []).forEach((day: any) => {
        const dayKey = day?.day_of_week?.toLowerCase?.();
        if (dayKey) {
          dayAvailability[dayKey] = Boolean(day?.is_available);
        }
      });

      return dayAvailability;
    });
  },

  getTimeSlotsForDay(dayName: string) {
    return request(`/api/time-slots/${dayName.toLowerCase()}`).then(
      (data: any) => data?.timeSlots || []
    );
  },

  getSpecialDates() {
    return request('/api/special-dates').then(
      (data: any) => data?.specialDates || []
    );
  },

  updateProfile(userId: string, payload: Partial<{
    username: string;
    firstName: string;
    lastName: string;
    contactNumber: string;
    contact_number: string;
    userImage: string;
    profileImage: string;
  }>) {
    return request(`/profile/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
};
