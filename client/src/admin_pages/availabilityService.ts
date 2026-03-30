// Service to manage vet availability data
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

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
        body: JSON.stringify(payload)
      });
      
      // If PUT fails with 404, try POST (create new)
      if (response.status === 404) {
        console.log('Record not found, trying POST to create new');
        const postResponse = await fetch(`${API_URL}/api/day-availability`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
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
      console.log('Saving slots to API:', { dayName, slots });
      const response = await fetch(`${API_URL}/api/time-slots/${dayName.toLowerCase()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots })
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
        method: 'DELETE'
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

  // Get all appointments for the schedule table
  async getAppointmentsForTable(): Promise<any[]> {
    try {
      const response = await fetch(`${API_URL}/api/appointments/table`);
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
  async cancelAppointmentWithReason(appointmentId: string | number, cancellationData: any): Promise<any> {
    try {
      console.log('Cancelling appointment with reason:', { appointmentId, cancellationData });
      
      const response = await fetch(`${API_URL}/api/appointments/${appointmentId}/cancel-with-reason`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cancellationData)
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
  async createRescheduleRequest(appointmentId: string | number, rescheduleData: any): Promise<any> {
    try {
      console.log('Creating reschedule request:', { appointmentId, rescheduleData });
      
      const response = await fetch(`${API_URL}/api/appointments/${appointmentId}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rescheduleData)
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
  async assignDoctor(appointmentId: string | number, doctorId: string | number): Promise<any> {
    try {
      const response = await fetch(`${API_URL}/api/appointments/${appointmentId}/assign-doctor`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctorId })
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
  async saveSpecialDate(eventName: string, eventDate: string): Promise<any> {
    try {
      const response = await fetch(`${API_URL}/api/special-dates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_name: eventName, event_date: eventDate })
      });
      
      if (!response.ok) throw new Error('Failed to save special date');
      return await response.json();
    } catch (error) {
      console.error('Error saving special date:', error);
      throw error;
    }
  },

  // Delete a special date
  async deleteSpecialDate(eventDate: string): Promise<any> {
    try {
      const response = await fetch(`${API_URL}/api/special-dates/${eventDate}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete special date');
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
  async updateAppointmentStatus(appointmentId: string | number, status: string): Promise<any> {
    try {
      const response = await fetch(`${API_URL}/api/appointments/${appointmentId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
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
  async getAppointmentHistory(): Promise<any[]> {
    try {
      const response = await fetch(`${API_URL}/api/appointments/history`);
      if (!response.ok) throw new Error('Failed to load appointment history');
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
    return specialDates.some(event => event.event_date === dateString);
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
