import axios from 'axios';

const api = axios.create({
  baseURL: '/api', // Adjust this if your backend URL is different
});

export default api;
