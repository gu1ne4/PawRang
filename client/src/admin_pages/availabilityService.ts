// Service to manage vet availability data
const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:5000';

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

function withUserIdQuery(path: string): string {
  const currentUser = getCurrentAuditUser();
  const userId = currentUser?.id || currentUser?.pk;
  if (!userId) return path;
  return `${path}${path.includes('?') ? '&' : '?'}userId=${encodeURIComponent(String(userId))}`;
}

function withQueryParams(path: string, params: Record<string, string | number | boolean | null | undefined>): string {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '');
  if (entries.length === 0) return path;
  const query = entries
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
  return `${path}${path.includes('?') ? '&' : '?'}${query}`;
}

type AppointmentReadOptions = {
  scope?: 'all';
};

export const availabilityService = {
  // Get day availability (all 7 days)
  async getDayAvailability(): Promise<any> {
    try {
      const response = await fetch(`${API_URL}/api/day-availability`);
      if (!response.ok) throw new Error('Failed to load day availability');
      const data = await response.json();
      
      const dayAvailability: any = {};
      
      // data should now be the array directly
      data.forEach((day: any) => {
        const dayKey = day.day_of_week?.toLowerCase();
        if (dayKey) {
          dayAvailability[dayKey] = day.is_available;
        }
      });
      
      return dayAvailability;
    } catch (error) {
      console.error('Error loading day availability:', error);
      return {
        sunday: false,
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false
      };
    }
  },

  // Save day availability - FIXED VERSION
  async saveDayAvailability(dayName: string, isAvailable: boolean): Promise<any> {
    try {
      console.log('Saving day availability:', { dayName, isAvailable });
      
      // Format the data to match your database schema
      const payload = {
        day_of_week: dayName.toLowerCase(),  // Match your column name
        is_available: isAvailable            // Match your column name
      };
      
      console.log('Sending payload:', payload);
      
      // Try PUT first (update existing)
      const response = await fetch(`${API_URL}/api/day-availability/${dayName.toLowerCase()}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(withAuditActor(payload))
      });
      
      // If PUT fails with 404, try POST (create new)
      if (response.status === 404) {
        console.log('Record not found, trying POST to create new');
        const postResponse = await fetch(`${API_URL}/api/day-availability`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(withAuditActor(payload))
        });
        
        if (!postResponse.ok) {
          // Get more detailed error information
          const errorText = await postResponse.text();
          console.error('POST error response:', errorText);
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch (e) {
            errorData = { error: errorText };
          }
          throw new Error(errorData.error || `Failed to create day availability (Status: ${postResponse.status})`);
        }
        
        return await postResponse.json();
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('PUT error response:', errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { error: errorText };
        }
        throw new Error(errorData.error || `Failed to save day availability (Status: ${response.status})`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error saving day availability:', error);
      throw error;
    }
  },

  async getTimeSlotsForDay(dayName: string): Promise<any[]> {
    try {
      const response = await fetch(`${API_URL}/api/time-slots/${dayName.toLowerCase()}`);
      if (!response.ok) throw new Error('Failed to load time slots');
      const data = await response.json();
      return data.timeSlots || [];
    } catch (error) {
      console.error('Error loading time slots:', error);
      return [];
    }
  },

  // Save time slots for a day
  async saveTimeSlots(dayName: string, slots: any[]): Promise<any[]> {
    try {
      const sanitizedSlots = (slots || []).map(({ capacity, ...slot }) => slot);
      console.log('Saving slots to API:', { dayName, slots: sanitizedSlots });
      const response = await fetch(`${API_URL}/api/time-slots/${dayName.toLowerCase()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(withAuditActor({ slots: sanitizedSlots }))
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API error response:', errorData);
        throw new Error(errorData.error || 'Failed to save time slots');
      }
      
      const data = await response.json();
      console.log('API save response:', data);
      
      // Return the timeSlots array from the response
      return data.timeSlots || [];
    } catch (error) {
      console.error('Error saving time slots:', error);
      throw error;
    }
  },

  // Delete a specific time slot
  async deleteTimeSlot(slotId: string | number): Promise<any> {
    try {
      console.log('Calling delete API for slot:', slotId);
      const response = await fetch(`${API_URL}/api/time-slots/${slotId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(withAuditActor({}))
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Delete API error response:', errorData);
        throw new Error(errorData.error || 'Failed to delete time slot');
      }
      
      const data = await response.json();
      console.log('Delete API success response:', data);
      return data;
    } catch (error) {
      console.error('Error deleting time slot:', error);
      throw error;
    }
  },

  // Get booked slots count for a specific time slot on a specific date
  async getBookedSlotsCount(timeSlotId: string | number, date: string): Promise<any> {
    try {
      const response = await fetch(`${API_URL}/api/appointments/booked-slots/${timeSlotId}?date=${date}`);
      if (!response.ok) throw new Error('Failed to load booked slots');
      const data = await response.json();
      return {
        bookedCount: data.bookedCount || 0,
        capacity: data.capacity || 1,
        availableSlots: data.availableSlots || 0
      };
    } catch (error) {
      console.error('Error loading booked slots:', error);
      return { bookedCount: 0, capacity: 1, availableSlots: 1 };
    }
  },

  // Create a new appointment
  async createAppointment(appointmentData: any): Promise<any> {
    try {
      const response = await fetch(`${API_URL}/api/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appointmentData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create appointment');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating appointment:', error);
      throw error;
    }
  },

  async saveMedicalInformation(appointmentId: string | number, medicalData: any, recordType: 'appointment' | 'walkin' = 'appointment'): Promise<any> {
    try {
      const response = await fetch(`${API_URL}/api/medical-information`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          record_type: recordType,
          appointment_id: recordType === 'appointment' ? appointmentId : null,
          walkin_id: recordType === 'walkin' ? appointmentId : null,
          ...medicalData
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save medical information');
      }

      return await response.json();
    } catch (error) {
      console.error('Error saving medical information:', error);
      throw error;
    }
  },

  async getMedicalInformationList(appointmentIds?: Array<string | number>): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      if (appointmentIds && appointmentIds.length > 0) {
        params.set('appointmentIds', appointmentIds.map(String).join(','));
      }

      const query = params.toString();
      const response = await fetch(`${API_URL}/api/medical-information${query ? `?${query}` : ''}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load medical information');
      }

      const data = await response.json();
      return data.medicalInformation || [];
    } catch (error) {
      console.error('Error loading medical information list:', error);
      return [];
    }
  },

  async getMedicalInformation(appointmentId: string | number): Promise<any | null> {
    try {
      const response = await fetch(`${API_URL}/api/medical-information/${appointmentId}`);
      if (!response.ok) throw new Error('Failed to load medical information');
      const data = await response.json();
      return data.medicalInformation || null;
    } catch (error) {
      console.error('Error loading medical information:', error);
      return null;
    }
  },

  // Get all appointments for the schedule table
  async getAppointmentsForTable(options: AppointmentReadOptions = {}): Promise<any[]> {
    try {
      const path = withQueryParams(withUserIdQuery('/api/appointments/table'), { scope: options.scope });
      const response = await fetch(`${API_URL}${path}`);
      if (!response.ok) throw new Error('Failed to load appointments');
      const data = await response.json();
      return data.appointments || [];
    } catch (error) {
      console.error('Error loading appointments:', error);
      return [];
    }
  },

  // Get doctors list
  async getDoctors(): Promise<any[]> {
    try {
      const response = await fetch(`${API_URL}/accounts`);
      if (!response.ok) throw new Error('Failed to load doctors');
      const data = await response.json();
      // Filter for doctors/vets only
      return data.filter((account: any) => {
        const role = account.role?.toLowerCase() || '';
        return role.includes('vet') || role.includes('doctor') || role.includes('veterinarian');
      });
    } catch (error) {
      console.error('Error loading doctors:', error);
      return [];
    }
  },

  // Cancel appointment with reason and email
  async cancelAppointmentWithReason(appointmentId: string | number, cancellationData: any, recordType?: string): Promise<any> {
    try {
      console.log('Cancelling appointment with reason:', { appointmentId, cancellationData });
      
      const response = await fetch(`${API_URL}/api/appointments/${appointmentId}/cancel-with-reason`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...cancellationData,
          recordType
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel appointment');
      }
      
      const data = await response.json();
      console.log('Cancel response:', data);
      return data;
    } catch (error) {
      console.error('Error cancelling appointment with reason:', error);
      throw error;
    }
  },

  // Create reschedule request
  async createRescheduleRequest(appointmentId: string | number, rescheduleData: any, recordType?: string): Promise<any> {
    try {
      console.log('Creating reschedule request:', { appointmentId, rescheduleData });
      
      const response = await fetch(`${API_URL}/api/appointments/${appointmentId}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...rescheduleData,
          recordType
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create reschedule request');
      }
      
      const data = await response.json();
      console.log('Reschedule response:', data);
      return data;
    } catch (error) {
      console.error('Error creating reschedule request:', error);
      throw error;
    }
  },

  async getRescheduleRequests(targetType?: string, targetId?: string | number): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      if (targetType) params.set('targetType', targetType);
      if (targetId !== undefined && targetId !== null) params.set('targetId', String(targetId));

      const query = params.toString();
      const response = await fetch(`${API_URL}/api/reschedule-requests${query ? `?${query}` : ''}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load reschedule requests');
      }

      const data = await response.json();
      return data.requests || [];
    } catch (error) {
      console.error('Error loading reschedule requests:', error);
      return [];
    }
  },

  async reviewRescheduleRequest(requestId: string | number, action: 'accept' | 'decline', note?: string): Promise<any> {
    try {
      const response = await fetch(`${API_URL}/api/reschedule-requests/${requestId}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, note })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to review reschedule request');
      }

      return await response.json();
    } catch (error) {
      console.error('Error reviewing reschedule request:', error);
      throw error;
    }
  },

  // Get available time slots for a specific date
  async getAvailableTimeSlots(date: string): Promise<any[]> {
    try {
      const response = await fetch(`${API_URL}/api/available-time-slots?date=${date}`);
      if (!response.ok) throw new Error('Failed to load available time slots');
      const data = await response.json();
      return data.timeSlots || [];
    } catch (error) {
      console.error('Error loading available time slots:', error);
      return [];
    }
  },

  // Assign doctor to appointment
  async assignDoctor(appointmentId: string | number, doctorId: string | number, recordType?: string): Promise<any> {
    try {
      const response = await fetch(`${API_URL}/api/appointments/${appointmentId}/assign-doctor`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctorId, recordType })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to assign doctor');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error assigning doctor:', error);
      throw error;
    }
  },

  // Get all special dates
  async getSpecialDates(): Promise<any[]> {
    try {
      const response = await fetch(`${API_URL}/api/special-dates`);
      if (!response.ok) throw new Error('Failed to load special dates');
      const data = await response.json();
      return data.specialDates || [];
    } catch (error) {
      console.error('Error loading special dates:', error);
      return [];
    }
  },

  // Save a special date
  async saveSpecialDate(eventName: string, eventDate: string, eventDescription = '', eventRecurrence: 'once' | 'annual' = 'once'): Promise<any> {
    const [, eventMonth, eventDay] = eventDate.split('-').map(Number);
    try {
      const response = await fetch(`${API_URL}/api/special-dates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(withAuditActor({
          event_name: eventName,
          event_date: eventRecurrence === 'annual' ? null : eventDate,
          event_description: eventDescription,
          event_recurrence: eventRecurrence,
          event_month: eventMonth,
          event_day: eventDay
        }))
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save special date');
      }
      return await response.json();
    } catch (error) {
      console.error('Error saving special date:', error);
      throw error;
    }
  },

  // Update a special date
  async updateSpecialDate(
    originalEventDate: string,
    eventName: string,
    eventDate: string,
    eventDescription = '',
    eventRecurrence: 'once' | 'annual' = 'once',
    originalEventRecurrence: 'once' | 'annual' = 'once',
    originalEventMonth?: number | null,
    originalEventDay?: number | null
  ): Promise<any> {
    const [, eventMonth, eventDay] = eventDate.split('-').map(Number);
    try {
      const response = await fetch(`${API_URL}/api/special-dates/${originalEventDate}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(withAuditActor({
          event_name: eventName,
          event_date: eventRecurrence === 'annual' ? null : eventDate,
          event_description: eventDescription,
          event_recurrence: eventRecurrence,
          event_month: eventMonth,
          event_day: eventDay,
          original_event_recurrence: originalEventRecurrence,
          original_event_month: originalEventMonth,
          original_event_day: originalEventDay
        }))
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update special date');
      }
      return await response.json();
    } catch (error) {
      console.error('Error updating special date:', error);
      throw error;
    }
  },

  // Delete a special date
  async deleteSpecialDate(eventDate: string, eventRecurrence: 'once' | 'annual' = 'once', eventMonth?: number, eventDay?: number): Promise<any> {
    try {
      const query = eventRecurrence === 'annual' && eventMonth && eventDay
        ? `?event_recurrence=annual&event_month=${eventMonth}&event_day=${eventDay}`
        : '';
      const response = await fetch(`${API_URL}/api/special-dates/${eventDate}${query}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(withAuditActor({
          event_date: eventDate,
          event_recurrence: eventRecurrence,
          event_month: eventMonth,
          event_day: eventDay
        }))
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete special date');
      }
      return await response.json();
    } catch (error) {
      console.error('Error deleting special date:', error);
      throw error;
    }
  },

  // Cancel appointment
  async cancelAppointment(appointmentId: string | number): Promise<any> {
    try {
      const response = await fetch(`${API_URL}/api/appointments/${appointmentId}/cancel`, {
        method: 'PUT'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel appointment');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      throw error;
    }
  },

  // Update appointment status (complete or cancel)
  async updateAppointmentStatus(appointmentId: string | number, status: string, recordType?: string): Promise<any> {
    try {
      const response = await fetch(`${API_URL}/api/appointments/${appointmentId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, recordType })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${status} appointment`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error ${status}ing appointment:`, error);
      throw error;
    }
  },

  // Get completed/cancelled appointments for history
  async getAppointmentHistory(options: AppointmentReadOptions = {}): Promise<any[]> {
    try {
      const path = withQueryParams(withUserIdQuery('/api/appointments/history'), { scope: options.scope });
      const response = await fetch(`${API_URL}${path}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to load appointment history');
      }
      const data = await response.json();
      return data.appointments || [];
    } catch (error) {
      console.error('Error loading appointment history:', error);
      return [];
    }
  },

  // Check if a date is a special date
  isSpecialDate(dateString: string, specialDates: any[]): boolean {
    if (!specialDates || !dateString) return false;
    const [, month, day] = dateString.split('-');
    const annualKey = month && day ? `${month}-${day}` : '';

    return specialDates.some(event => {
      const recurrence = String(event?.event_recurrence || event?.recurrence_type || 'once').toLowerCase();
      if (recurrence === 'annual' || recurrence === 'yearly') {
        const eventMonth = Number(event?.event_month) || Number(String(event?.event_date || '').split('-')[1]);
        const eventDay = Number(event?.event_day) || Number(String(event?.event_date || '').split('-')[2]);
        return annualKey === `${String(eventMonth).padStart(2, '0')}-${String(eventDay).padStart(2, '0')}`;
      }
      return event.event_date === dateString;
    });
  },

  // Get day name from date string
  getDayNameFromDate(dateString: string): string {
    const date = new Date(dateString);
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
  },

  // Format time slots for display with availability
  async formatTimeSlotsForDisplay(timeSlots: any[], selectedDate: string): Promise<any[]> {
    if (!timeSlots || timeSlots.length === 0) return [];
    
    const formattedSlots = [];
    
    for (const slot of timeSlots) {
      // Get booked count for this slot on the selected date
      const availability = await this.getBookedSlotsCount(slot.id, selectedDate);
      
      // Format time for display
      const formatTime = (timeStr: string) => {
        if (!timeStr) return '';
        const [hours, minutes] = timeStr.split(':');
        let hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
      };
      
      formattedSlots.push({
        id: slot.id,
        displayText: `${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}`,
        startTime: slot.start_time,
        endTime: slot.end_time,
        capacity: slot.capacity,
        bookedCount: availability.bookedCount,
        availableSlots: availability.availableSlots
      });
    }
    
    return formattedSlots;
  }
};
