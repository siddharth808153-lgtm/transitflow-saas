// src/api/endpoints.ts

export const AUTH = {
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  ME: '/auth/me',
  CREATE_ADMIN: '/auth/create-admin',
  CREATE_USER: '/auth/create-user',
  LIST_ADMINS: '/auth/admins',
};

export const VEHICLES = {
  LIST: '/vehicles',
  CREATE: '/vehicles',
  UPDATE: (id: string | number) => `/vehicles/${id}`,
  DELETE: (id: string | number) => `/vehicles/${id}`,
  DETAIL: (id: string | number) => `/vehicles/${id}`,
  CURRENT_DRIVER: (id: string | number) => `/vehicles/${id}/current-driver`,
  CURRENT_STUDENTS: (id: string | number) => `/vehicles/${id}/current-students`,
  LOGS: (id: string | number) => `/vehicles/${id}/logs`,
};

export const DRIVERS = {
  LIST: '/drivers',
  CREATE: '/drivers',
  UPDATE: (id: string | number) => `/drivers/${id}`,
  DELETE: (id: string | number) => `/drivers/${id}`,
  DETAIL: (id: string | number) => `/drivers/${id}`,
  ASSIGN: (id: string | number) => `/drivers/${id}/assign`,
  RELIEVE: (id: string | number) => `/drivers/${id}/relieve`,
};
