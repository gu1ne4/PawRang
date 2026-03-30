const API_URL = 'http://localhost:5000';

export const availabilityService = {
  
  // ==========================================
  // AVAILABILITY SETTINGS FUNCTIONS
  // ==========================================
  getDayAvailability: async () => {
    const res = await fetch(`${API_URL}/api/day-availability`);
    if (!res.ok) throw new Error('Failed to fetch days');
    const data = await res.json();
    
    const formattedDays: any = {};
    data.forEach((item: any) => {
      if (item.day_of_week) {
        formattedDays[item.day_of_week] = item.is_available;
      }
    });
    return formattedDays;
  },

  saveDayAvailability: async (day: string, is_active: boolean) => {
    const res = await fetch(`${API_URL}/api/day-availability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ day_of_week: day, is_available: is_active })
    });
    if (!res.ok) throw new Error('Failed to save day');
    return await res.json();
  },

  getTimeSlotsForDay: async (day: string) => {
    const res = await fetch(`${API_URL}/api/time-slots/${day}`);
    if (!res.ok) throw new Error('Failed to fetch slots');
    const data = await res.json();
    return data.timeSlots || [];
  },

  saveTimeSlots: async (day: string, slots: any[]) => {
    const res = await fetch(`${API_URL}/api/time-slots/${day}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slots })
    });
    if (!res.ok) throw new Error('Failed to save slots');
    return await res.json();
  },

  deleteTimeSlot: async (slotId: number | string) => {
    const res = await fetch(`${API_URL}/api/time-slots/${slotId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete slot');
    return await res.json();
  },

  getAppointmentsForTable: async () => {
    const res = await fetch(`${API_URL}/api/booked-dates`);
    if (!res.ok) return []; 
    return await res.json();
  },

  // ==========================================
  // SCHEDULE PAGE FUNCTIONS (Restored!)
  // ==========================================
  getDoctors: async () => {
    const res = await fetch(`${API_URL}/accounts`);
    if (!res.ok) throw new Error('Failed to load doctors');
    const data = await res.json();
    return data.filter((account: any) => {
      const role = account.role?.toLowerCase() || '';
      return role.includes('vet') || role.includes('doctor') || role.includes('veterinarian');
    });
  },

  assignDoctor: async (appointmentId: string | number, doctorId: string | number) => {
    const res = await fetch(`${API_URL}/api/appointments/${appointmentId}/assign-doctor`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doctorId })
    });
    if (!res.ok) throw new Error('Failed to assign doctor');
    return await res.json();
  },

  cancelAppointmentWithReason: async (appointmentId: string | number, cancellationData: any) => {
    const res = await fetch(`${API_URL}/api/appointments/${appointmentId}/cancel-with-reason`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cancellationData)
    });
    if (!res.ok) throw new Error('Failed to cancel appointment');
    return await res.json();
  },

  createRescheduleRequest: async (appointmentId: string | number, rescheduleData: any) => {
    const res = await fetch(`${API_URL}/api/appointments/${appointmentId}/reschedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rescheduleData)
    });
    if (!res.ok) throw new Error('Failed to create reschedule request');
    return await res.json();
  },

  updateAppointmentStatus: async (appointmentId: string | number, status: string) => {
    const res = await fetch(`${API_URL}/api/appointments/${appointmentId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error('Failed to update appointment status');
    return await res.json();
  },


  // Add this to the bottom of availabilityService.ts
  createAppointment: async (appointmentData: any) => {
    const res = await fetch(`${API_URL}/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(appointmentData)
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to create appointment');
    }
    return await res.json();
  }
};