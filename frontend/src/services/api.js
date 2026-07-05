import axios from 'axios';

const fallbackBaseUrl = window.location.hostname.includes('render')
  ? 'https://seoanalyser-krcu.onrender.com/api'
  : '/api';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || fallbackBaseUrl,
});

export default api;
