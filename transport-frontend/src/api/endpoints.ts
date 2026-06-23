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

export const STUDENTS = {
  LIST: '/students',
  CREATE: '/students',
  UPDATE: (id: number | string) => `/students/${id}`,
  DELETE: (id: number | string) => `/students/${id}`,
  DETAIL: (id: number | string) => `/students/${id}`,
  ASSIGN_VEHICLE: (id: number | string) => `/students/${id}/assign`,
  REMOVE_VEHICLE: (id: number | string) => `/students/${id}/remove`,
  ASSIGNMENT_HISTORY: (id: number | string) => `/students/${id}/assignments`,
  DUES: (id: number | string) => `/students/${id}/dues`,
};

export const PASSENGERS = {
  LIST: '/passengers',
  CREATE: '/passengers',
  UPDATE: (id: number | string) => `/passengers/${id}`,
  DELETE: (id: number | string) => `/passengers/${id}`,
  DETAIL: (id: number | string) => `/passengers/${id}`,
  DUES: (id: number | string) => `/passengers/${id}/dues`,
};

export const TRANSACTIONS = {
  LIST: '/transactions',
  CREATE: '/transactions',
  DETAIL: (id: number | string) => `/transactions/${id}`,
};

export const DUES = {
  LIST: '/dues',
  SUMMARY: '/dues/summary',
  GENERATE_MONTHLY: '/dues/generate-monthly',
  GENERATE_DAILY: '/dues/generate-daily',
  MARK_PAID: (id: number | string) => `/dues/${id}/mark-paid`,
};
