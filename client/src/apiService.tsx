// apiService.ts
// All HTTP calls to the Flask backend live here.
// Every page imports from this file instead of calling fetch inline.

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:5000';

const getRequestCache = new Map<string, { expiresAt: number; data: any }>();
const inFlightGetRequests = new Map<string, Promise<any>>();

function cloneForConsumer<T>(value: T): T {
  try {
    if (typeof structuredClone === 'function') {
      return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

function getCacheTtl(path: string): number {
  if (path.startsWith('/api/billing/services') || path.startsWith('/api/billing/products')) {
    return 5 * 60 * 1000;
  }

  if (
    path.startsWith('/api/doctors') ||
    path.startsWith('/api/emr/search-pets') ||
    path.startsWith('/api/billing/source-records')
  ) {
    return 30 * 1000;
  }

  if (path.startsWith('/api/billing/invoices') || path.startsWith('/api/emr/records')) {
    return 10 * 1000;
  }

  if (path.startsWith('/api/admin/analytics/overview')) {
    return 30 * 1000;
  }

  return 0;
}

export function invalidateApiCache(prefix?: string): void {
  if (!prefix) {
    getRequestCache.clear();
    return;
  }

  for (const key of Array.from(getRequestCache.keys())) {
    if (key.startsWith(prefix)) {
      getRequestCache.delete(key);
    }
  }
}

// ─── Generic fetch wrapper ────────────────────────────────────────────────────

function getStoredUserId(): string {
  try {
    const session = localStorage.getItem('userSession');
    const parsed = session ? JSON.parse(session) : null;
    return parsed?.id || parsed?.pk || '';
  } catch {
    return '';
  }
}

function withUserIdQuery(path: string, userId?: string | number | null): string {
  const resolvedUserId = userId || getStoredUserId();
  if (!resolvedUserId) return path;
  return `${path}${path.includes('?') ? '&' : '?'}userId=${encodeURIComponent(String(resolvedUserId))}`;
}

async function request<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const isCacheableGet = method === 'GET' && !options.body;
  const cacheTtl = isCacheableGet ? getCacheTtl(path) : 0;
  const cacheKey = path;

  if (cacheTtl > 0) {
    const cached = getRequestCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cloneForConsumer(cached.data);
    }

    const inFlight = inFlightGetRequests.get(cacheKey);
    if (inFlight) {
      return inFlight.then((data) => cloneForConsumer(data));
    }
  }

  const token = localStorage.getItem('access_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const runFetch = async (): Promise<T> => {
    const res = await fetch(`${BASE_URL}${path}`, { ...options, method, headers });

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

    const data = await res.json();

    if (cacheTtl > 0) {
      getRequestCache.set(cacheKey, {
        expiresAt: Date.now() + cacheTtl,
        data: cloneForConsumer(data),
      });
    } else if (!isCacheableGet) {
      invalidateApiCache();
    }

    return data;
  };

  if (cacheTtl > 0) {
    const requestPromise = runFetch().finally(() => {
      inFlightGetRequests.delete(cacheKey);
    });
    inFlightGetRequests.set(cacheKey, requestPromise);
    return requestPromise.then((data) => cloneForConsumer(data));
  }

  return runFetch();
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

function getCurrentAuditUser(): any | null {
  try {
    const session = localStorage.getItem('userSession');
    return session ? JSON.parse(session) : null;
  } catch {
    return null;
  }
}

function withAuditActor<T extends Record<string, any>>(payload: T): T & Record<string, any> {
  const currentUser = getCurrentAuditUser();
  if (!currentUser) return payload;

  const userId = currentUser.id || currentUser.pk;
  const role = currentUser.role;
  const normalizedRole = String(role || '').toLowerCase();
  const accountType =
    currentUser.account_type ||
    currentUser.accountType ||
    (normalizedRole.includes('patient') || normalizedRole.includes('owner') || normalizedRole.includes('user')
      ? 'patient'
      : 'employee');

  return {
    ...payload,
    actorId: userId,
    userId,
    userType: accountType,
    actorAccountType: accountType,
    username: currentUser.username || currentUser.fullName || currentUser.fullname,
    role,
    currentUser,
  };
}

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

  requestEmailChangeOtp(userId: string, payload: { newEmail: string }) {
    return request(`/profile/${userId}/change-email/request-otp`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  verifyEmailChangeOtp(userId: string, payload: { newEmail: string; otp: string }) {
    return request(`/profile/${userId}/change-email/verify`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },




// 

// ─── Admin Schedule & Appointment Endpoints ───────────────────────────────

  getAppointmentsForTable(userId?: string | number | null) {
    return request(withUserIdQuery('/api/appointments/table', userId));
  },

  getDoctors(userId?: string | number | null) {
    // In your app.py, /accounts and /api/doctors both route to get_accounts()
    return request(withUserIdQuery('/api/doctors', userId));
  },

  updateAppointmentStatus(appointmentId: string | number, status: string, recordType: string) {
    return request(`/api/appointments/${appointmentId}/status`, {
      method: 'PUT',
      body: JSON.stringify(withAuditActor({ status, recordType })),
    });
  },

  assignDoctor(appointmentId: string | number, doctorId: string | number, recordType: string) {
    return request(`/api/appointments/${appointmentId}/assign-doctor`, {
      method: 'PUT',
      body: JSON.stringify(withAuditActor({ doctorId, recordType })),
    });
  },

  cancelAppointmentWithReason(appointmentId: string | number, data: any, recordType: string) {
    return request(`/api/appointments/${appointmentId}/cancel-with-reason`, {
      method: 'PUT',
      body: JSON.stringify(withAuditActor({ ...data, recordType })),
    });
  },

  createRescheduleRequest(appointmentId: string | number, data: any, recordType: string) {
    return request(`/api/appointments/${appointmentId}/reschedule`, {
      method: 'POST',
      body: JSON.stringify(withAuditActor({ ...data, recordType })),
    });
  },

  reviewRescheduleRequest(requestId: string | number, action: string, note?: string) {
    return request(`/api/reschedule-requests/${requestId}/review`, {
      method: 'PUT',
      body: JSON.stringify(withAuditActor({ action, note })),
    });
  },

  generateAdminAppointmentSummary(payload: any) {
    return request('/api/ai/admin-appointment-summary', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  generateDoctorEmrBrief(payload: any) {
    return request('/api/ai/doctor-emr-brief', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  createAdminAppointment(payload: any) {
    return request('/api/appointments', {
      method: 'POST',
      body: JSON.stringify(withAuditActor({ ...payload, userId: payload?.userId || getStoredUserId() })),
    });
  },

  // Update your existing saveMedicalInformation to handle both types (walkin & appointment)

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
      body: JSON.stringify(withAuditActor(payload)),
    });
  },

  cancelAppointment(appointmentId: number, reason: string) {
    return request(`/appointments/${appointmentId}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify(withAuditActor({ cancel_reason: reason })),
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
      body: JSON.stringify(withAuditActor(payload)),
    });
  },

  withdrawRescheduleRequest(requestId: number) {
    return request(`/api/reschedule-requests/${requestId}/withdraw`, {
      method: 'PUT',
      body: JSON.stringify(withAuditActor({})),
    });
  },

  confirmRescheduleRequest(requestId: number) {
    return request(`/api/reschedule-requests/${requestId}/confirm`, {
      method: 'PUT',
      body: JSON.stringify(withAuditActor({})),
    });
  },

  cancelRescheduleAppointment(requestId: number) {
    return request(`/api/reschedule-requests/${requestId}/cancel-appointment`, {
      method: 'PUT',
      body: JSON.stringify(withAuditActor({})),
    });
  },

  chooseAnotherDateForRescheduleRequest(
    requestId: number,
    payload: {
      preferred_date: string;
      preferred_time: string;
      response_note?: string;
    }
  ) {
    return request(`/api/reschedule-requests/${requestId}/choose-another-date`, {
      method: 'PUT',
      body: JSON.stringify(withAuditActor(payload)),
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
    appointment_id?: number;
    walkin_id?: number;
    record_type?: 'appointment' | 'walkin';
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
    return request('/api/medical-information', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // ─── Branches ────────────────────────────────────────────────────────────

  getBranches() {
    return request('/branches');
  },

  getAdminAnalyticsOverview(params: {
    branchId?: string | number | null;
    startDate?: string;
    endDate?: string;
  } = {}) {
    const query = new URLSearchParams();
    if (params.branchId !== undefined && params.branchId !== null && params.branchId !== '' && params.branchId !== 'all') {
      query.set('branchId', String(params.branchId));
    }
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return request(withUserIdQuery(`/api/admin/analytics/overview${suffix}`));
  },

  getAdminAppointmentSearchData() {
    return request('/api/admin/appointment-search-data');
  },

  getEmrSearchPets() {
    return request(withUserIdQuery('/api/emr/search-pets'));
  },

  getEmrRecords() {
    return request(withUserIdQuery('/api/emr/records'));
  },

  getEmrRecord(recordId: number | string) {
    return request(withUserIdQuery(`/api/emr/records/${recordId}`));
  },

  createEmrRecord(payload: any) {
    return request('/api/emr/records', {
      method: 'POST',
      body: JSON.stringify({ ...payload, userId: payload?.userId || getStoredUserId() }),
    });
  },

  updateEmrRecord(recordId: number | string, payload: any) {
    return request(`/api/emr/records/${recordId}`, {
      method: 'PUT',
      body: JSON.stringify({ ...payload, userId: payload?.userId || getStoredUserId() }),
    });
  },

  deleteEmrRecord(recordId: number | string) {
    return request(withUserIdQuery(`/api/emr/records/${recordId}`), {
      method: 'DELETE',
    });
  },

  getEmrPetAppointments(petId: number | string) {
    return request(withUserIdQuery(`/api/emr/pets/${petId}/appointments`));
  },

  getBillingServices() {
    return request('/api/billing/services').then(
      (data: any) => data?.services || []
    );
  },

  getBillingProducts(userId?: string | number | null) {
    return request(withUserIdQuery('/api/billing/products', userId)).then(
      (data: any) => data?.products || []
    );
  },

  getBillingSourceRecords(userId?: string | number | null) {
    return request(withUserIdQuery('/api/billing/source-records', userId));
  },

  getBillingInvoices(userId?: string | number | null) {
    return request(withUserIdQuery('/api/billing/invoices', userId)).then(
      (data: any) => data?.invoices || []
    );
  },

  createBillingInvoice(payload: any) {
    return request('/api/billing/invoices', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  recordBillingInvoicePayment(invoiceId: number | string, payload: any) {
    return request(`/api/billing/invoices/${invoiceId}/payments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  deleteBillingInvoices(invoiceIds: Array<number | string>) {
    return request('/api/billing/invoices/bulk', {
      method: 'DELETE',
      body: JSON.stringify({ invoiceIds, userId: getStoredUserId() }),
    });
  },

  updateEmrLabResultOwnerVisibility(labResultId: number | string, payload: {
    visibleToOwner: boolean;
    visibleToOwnerBy?: string;
  }) {
    return request(`/api/emr/lab-results/${labResultId}/owner-visibility`, {
      method: 'PUT',
      body: JSON.stringify({ ...payload, userId: getStoredUserId() }),
    });
  },

  updateEmrVaccinationOwnerVisibility(vaccinationId: number | string, payload: {
    visibleToOwner: boolean;
    visibleToOwnerBy?: string;
  }) {
    return request(`/api/emr/vaccinations/${vaccinationId}/owner-visibility`, {
      method: 'PUT',
      body: JSON.stringify({ ...payload, userId: getStoredUserId() }),
    });
  },

  logout() {
    let currentUser: any = null;
    try {
      const session = localStorage.getItem('userSession');
      currentUser = session ? JSON.parse(session) : null;
    } catch {
      currentUser = null;
    }

    return request('/logout', {
      method: 'POST',
      body: JSON.stringify({
        userId: currentUser?.id || currentUser?.pk,
        userType: currentUser ? 'EMPLOYEE' : undefined,
        username: currentUser?.username || currentUser?.fullName || currentUser?.fullname,
        role: currentUser?.role,
      }),
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

  getAvailableTimeSlots(date: string) {
    return request(`/api/available-time-slots?date=${encodeURIComponent(date)}`).then(
      (data: any) => data?.timeSlots || []
    );
  },

  getSpecialDates() {
    return request('/api/special-dates').then(
      (data: any) => data?.specialDates || []
    );
  },

  getPetSharedRecords(petId: number | string) {
    return request(`/api/pets/${petId}/shared-records`);
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
