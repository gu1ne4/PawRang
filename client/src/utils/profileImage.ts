export type ProfileImageRecord = Partial<Record<
  'profileImage' | 'employee_image' | 'image' | 'userImage' | 'userimage' | 'user_image',
  string | null | undefined
>>;

const PROFILE_IMAGE_FIELDS: Array<keyof ProfileImageRecord> = [
  'profileImage',
  'employee_image',
  'image',
  'userImage',
  'userimage',
  'user_image',
];

const isLikelyRawBase64Image = (value: string): boolean => {
  const normalized = value.replace(/\s/g, '');
  return (
    normalized.length > 0 &&
    normalized.length % 4 === 0 &&
    /^[A-Za-z0-9+/]+={0,2}$/.test(normalized)
  );
};

export const resolveProfileImage = (image: string | null | undefined, fallbackImage: string): string => {
  const value = String(image || '').trim();
  if (!value) return fallbackImage;

  const lowerValue = value.toLowerCase();
  if (
    lowerValue.startsWith('data:image') ||
    lowerValue.startsWith('http://') ||
    lowerValue.startsWith('https://') ||
    lowerValue.startsWith('blob:') ||
    value.startsWith('/')
  ) {
    return value;
  }

  return isLikelyRawBase64Image(value)
    ? `data:image/jpeg;base64,${value}`
    : fallbackImage;
};

export const getProfileImageFromRecord = (
  record: ProfileImageRecord | null | undefined,
  fallbackImage: string
): string => {
  if (!record) return fallbackImage;

  for (const field of PROFILE_IMAGE_FIELDS) {
    const image = record[field];
    if (image) return resolveProfileImage(image, fallbackImage);
  }

  return fallbackImage;
};
