const parseDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getTotalMonths = (birthday: Date, now: Date) => {
  let months = (now.getFullYear() - birthday.getFullYear()) * 12;
  months += now.getMonth() - birthday.getMonth();

  if (now.getDate() < birthday.getDate()) {
    months -= 1;
  }

  return Math.max(months, 0);
};

export const formatPetAge = (age?: string | null, birthday?: string | null) => {
  const parsedBirthday = parseDate(birthday);

  if (parsedBirthday) {
    const totalMonths = getTotalMonths(parsedBirthday, new Date());

    if (totalMonths < 12) {
      const monthLabel = totalMonths === 1 ? 'month' : 'months';
      return `${totalMonths} ${monthLabel} old`;
    }

    const years = Math.floor(totalMonths / 12);
    const yearLabel = years === 1 ? 'year' : 'years';
    return `${years} ${yearLabel} old`;
  }

  const numericAge = Number(age);
  if (!Number.isFinite(numericAge) || numericAge < 0) return 'Unknown';

  if (numericAge < 1) {
    const months = Math.round(numericAge * 12);
    const monthLabel = months === 1 ? 'month' : 'months';
    return `${months} ${monthLabel} old`;
  }

  const roundedYears = Math.round(numericAge);
  const yearLabel = roundedYears === 1 ? 'year' : 'years';
  return `${roundedYears} ${yearLabel} old`;
};
