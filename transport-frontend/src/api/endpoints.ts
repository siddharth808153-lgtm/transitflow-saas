// src/api/endpoints.ts

export const AUTH = {
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  LOGOUT: '/auth/logout',
  ME: '/auth/me',
  CREATE_ADMIN: '/auth/create-admin',
  CREATE_USER: '/auth/create-user',
  LIST_ADMINS: '/auth/admins',
  CHANGE_PASSWORD: '/auth/change-password',
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
  LEAVES_LIST: (id: string | number) => `/drivers/${id}/leaves`,
  LEAVE_CREATE: '/drivers/leaves',
  LEAVE_DELETE: (id: string | number) => `/drivers/leaves/${id}`,
  ADJUSTMENTS_LIST: (id: string | number) => `/drivers/${id}/wage-adjustments`,
  ADJUSTMENT_CREATE: '/drivers/wage-adjustments',
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
  DELETE: (id: number | string) => `/transactions/${id}`,
};

export const DUES = {
  LIST: '/dues',
  SUMMARY: '/dues/summary',
  GENERATE_MONTHLY: '/dues/generate-monthly',
  GENERATE_DAILY: '/dues/generate-daily',
  MARK_PAID: (id: number | string) => `/dues/${id}/mark-paid`,
};

export const USERS = {
  LIST: '/users',
  CREATE: '/users',
};

export const WHATSAPP = {
  CONNECT: '/whatsapp/connect',
  DISCONNECT: '/whatsapp/disconnect',
  STATUS: '/whatsapp/status',
  LOGS: '/whatsapp/logs',
};

export const SETTINGS = {
  GET: '/settings',
  UPDATE: '/settings',
};

export const SUPER_ADMIN = {
  STATS: '/super-admin/stats',
  ADMINS_LIST: '/super-admin/admins',
  ADMIN_DETAIL: (id: number | string) => `/super-admin/admins/${id}`,
  TOGGLE_STATUS: (id: number | string) => `/super-admin/admins/${id}/toggle-status`,
  REVENUE_TREND: '/super-admin/revenue-trend',
  ADMIN_REVENUE_TREND: (id: number | string) => `/super-admin/admins/${id}/revenue-trend`,
};

export const ADMIN_DASHBOARD = {
  SUMMARY: '/admin-dashboard/summary',
  RECENT_TRANSACTIONS: '/admin-dashboard/recent-transactions',
  PENDING_DUES: '/admin-dashboard/pending-dues',
  MONTHLY_REVENUE: '/admin-dashboard/monthly-revenue',
  VEHICLE_PERFORMANCE: '/admin-dashboard/vehicle-performance',
};

export const PORTAL = {
  PROFILE: '/portal/profile',
  PAYMENTS: '/portal/payments',
  DUES: '/portal/dues',
  STUDENT_DETAIL: (id: number | string) => `/portal/students/${id}`,
};

export const REPORTS = {
  MONTHLY_COLLECTION: '/reports/monthly-collection',
  DUES_REPORT: '/reports/dues',
  VEHICLE_SUMMARY: '/reports/vehicle-summary',
  DRIVER_WAGES: '/reports/driver-wages',
};



