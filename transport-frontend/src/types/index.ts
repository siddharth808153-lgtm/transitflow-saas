// src/types/index.ts

export interface User {
  id: number
  name: string
  phone: string
  email?: string
  role: 'super_admin' | 'admin' | 'user'
  is_active: boolean
  created_at: string
}

export interface Vehicle {
  id: number
  name: string
  type: 'auto' | 'bus'
  wage_type: 'daily' | 'monthly'
  capacity?: number
  is_active: boolean
  admin_id: number
  current_driver?: Driver
  created_at: string
}

export interface Driver {
  id: number
  name: string
  phone: string
  license_number?: string
  daily_wage?: number
  is_active: boolean
  is_currently_assigned: boolean
  current_vehicle?: Vehicle
  created_at: string
}

export interface Student {
  id: number
  student_name: string
  class?: string
  section?: string
  is_active: boolean
  admin_id: number
  user_id: number
  parent?: User
  current_assignment?: StudentAssignment
  created_at: string
}

export interface StudentAssignment {
  id: number
  student_id: number
  vehicle_id: number
  monthly_fee: number
  assigned_date: string
  removed_date?: string
  removal_reason?: string
  vehicle?: Vehicle
}

export interface AutoPassenger {
  id: number
  name: string
  phone: string
  daily_fare: number
  is_active: boolean
  vehicle_id: number
  user_id?: number
  vehicle?: Vehicle
  created_at: string
}

export interface Transaction {
  id: number
  amount: number
  transaction_type: 'student_fee' | 'auto_daily' | 'driver_wage'
  payment_method: 'cash' | 'upi' | 'bank' | 'other'
  payment_for_month?: string
  payment_for_date?: string
  notes?: string
  created_at: string
}

export interface Due {
  id: number
  due_amount: number
  is_paid: boolean
  due_for_month?: string
  due_for_date?: string
  paid_at?: string
  transaction_id?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}
