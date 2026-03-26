const API_URL = 'http://localhost:5000';

export const availabilityService = {
  // 1. Get Day Availability
  getDayAvailability: async () => {
    const res = await fetch(`${API_URL}/api/day-availability`);
    if (!res.ok) throw new Error('Failed to fetch days');
    const data = await res.json();
    
    // Transforms the database array into the { monday: true } object your UI needs
    const formattedDays: any = {};
    data.forEach((item: any) => {
      if (item.day_of_week) {
        formattedDays[item.day_of_week] = item.is_available;
      }
    });
    return formattedDays;
  },

  // 2. Save Day Availability
  saveDayAvailability: async (day: string, is_active: boolean) => {
    const res = await fetch(`${API_URL}/api/day-availability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ day_of_week: day, is_available: is_active })
    });
    if (!res.ok) throw new Error('Failed to save day');
    return await res.json();
  },

  // 3. Get Time Slots
  getTimeSlotsForDay: async (day: string) => {
    const res = await fetch(`${API_URL}/api/time-slots/${day}`);
    if (!res.ok) throw new Error('Failed to fetch slots');
    const data = await res.json();
    return data.timeSlots || [];
  },

  // 4. Save Time Slots
  saveTimeSlots: async (day: string, slots: any[]) => {
    const res = await fetch(`${API_URL}/api/time-slots/${day}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slots })
    });
    if (!res.ok) throw new Error('Failed to save slots');
    return await res.json();
  },

  // 5. Delete Time Slot
  deleteTimeSlot: async (slotId: number | string) => {
    const res = await fetch(`${API_URL}/api/time-slots/${slotId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete slot');
    return await res.json();
  },

  // 6. Get Booked Dates (For Calendar)
  getAppointmentsForTable: async () => {
    const res = await fetch(`${API_URL}/api/booked-dates`);
    if (!res.ok) return []; // Returns empty array if it fails so calendar doesn't crash
    return await res.json();
  }
};