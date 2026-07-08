/**
 * Environment / runtime configuration for the frontend.
 * Values come from Vite env variables (`VITE_*`) with sensible dev defaults.
 */

export const SERVER_URL =
  import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';

export const JOIN_BASE_URL = `${window.location.origin}/play`;
