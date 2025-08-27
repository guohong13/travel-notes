import config from '../config';

export const processResourcePath = (path) => {
  if (!path || typeof path !== 'string') return '';
  if (path.startsWith('http')) return path;
  const BASE = config.baseUrl;
  const clean = String(path).replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+/g, '/');
  return `${BASE}/${clean}`;
};