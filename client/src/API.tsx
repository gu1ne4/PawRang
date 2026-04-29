const DEFAULT_LOCAL_API_URL = 'http://127.0.0.1:5000';
const DEFAULT_PRODUCTION_API_URL = '/api-proxy';

const normalizeApiUrl = (value: string): string => value.replace(/\/+$/, '');

const API_URL: string = normalizeApiUrl(
  import.meta.env.VITE_API_URL?.trim() ||
    (import.meta.env.DEV ? DEFAULT_LOCAL_API_URL : DEFAULT_PRODUCTION_API_URL)
);

export default API_URL;