export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: 'admin' | 'doctor' | 'nurse' | 'patient';
  phone: string;
  address: string;
  created_at: string;
  // Optional fields the backend joins in for nurse/doctor accounts
  nurse_license?: string;
  nurse_department?: string;
  shift_preference?: string;
  license_number?: string;
  specialization?: string;
}

export interface Patient {
  id: number;
  user_id: number;
  full_name: string;
  email: string;
  phone: string;
  address?: string;
  date_of_birth: string;
  blood_type: string;
  emergency_contact: string;
  emergency_phone: string;
  medical_history: string;
  allergies: string;
  current_medications: string;
  dialysis_start_date: string;
  access_type: string;
  created_at: string;
}

export interface Doctor {
  id: number;
  user_id: number;
  full_name: string;
  email: string;
  phone: string;
  specialization: string;
  license_number: string;
  department: string;
}

export interface Nurse {
  id: number;
  user_id: number;
  full_name: string;
  email: string;
  phone: string;
  license_number: string;
  department: string;
  shift_preference: string;
}

export interface DialysisSession {
  id: number;
  patient_id: number;
  patient_name: string;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'missed';
  doctor_id: number;
  doctor_name: string;
  nurse_id: number;
  nurse_name: string;
  machine_id: string;
  pre_weight: number;
  post_weight: number;
  weight_gain: number;
  blood_pressure_before: string;
  blood_pressure_after: string;
  heart_rate_before: number;
  heart_rate_after: number;
  temperature: number;
  ufr: number;
  dry_weight: number;
  kt_v: number;
  urea_reduction_ratio: number;
  fluid_removed: number;
  heparin_dose: string;
  dialysate_composition: string;
  access_site_condition: string;
  complications: string;
  notes: string;
  created_at: string;
}

export interface LabResult {
  id: number;
  patient_id: number;
  patient_name: string;
  test_date: string;
  hemoglobin: number;
  hematocrit: number;
  white_blood_cells: number;
  platelets: number;
  sodium: number;
  potassium: number;
  chloride: number;
  bicarbonate: number;
  bun: number;
  creatinine: number;
  glucose: number;
  calcium: number;
  phosphorus: number;
  pth: number;
  albumin: number;
  iron: number;
  ferritin: number;
  tsat: number;
  crp: number;
  notes: string;
}

export interface Prescription {
  id: number;
  patient_id: number;
  patient_name: string;
  doctor_id: number;
  doctor_name: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  route: string;
  start_date: string;
  end_date: string;
  instructions: string;
  status: 'active' | 'discontinued' | 'completed';
  created_at: string;
}

export interface Appointment {
  id: number;
  patient_id: number;
  patient_name: string;
  doctor_id: number;
  doctor_name: string;
  appointment_date: string;
  appointment_time: string;
  type: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  notes: string;
  created_at: string;
}

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export interface DashboardStats {
  totalPatients: number;
  totalDoctors: number;
  totalNurses: number;
  todaySessions: any;
  todayStatus?: Array<{ status: string; count: number }>;
  recentSessions?: DialysisSession[];
  recentLabs?: any[];
  activePrescriptions?: any[];
  upcomingSessions?: DialysisSession[];
  inProgressSessions?: any[];
  sessionsTrend?: Array<{ date: string; count: number }>;
  weeklyCompleted?: number;
  weekOverWeekChange?: number;
  avgKtv?: number;
  avgKtvChange?: number;
}

export interface SymptomLog {
  id: number;
  patient_id: number;
  patient_name?: string;
  logged_at: string;
  symptoms: string;
  severity: 'mild' | 'moderate' | 'severe';
  fluid_intake_ml: number | null;
  weight_kg: number | null;
  notes: string | null;
  reviewed: number;
  reviewed_by?: number;
  reviewed_at: string | null;
  created_at: string;
}


export interface ShiftHandoff {
  id: number;
  from_nurse_id: number;
  to_nurse_id: number | null;
  from_nurse_name?: string;
  to_nurse_name?: string | null;
  shift_date: string;
  shift_type: 'morning' | 'afternoon' | 'night' | 'other';
  status: 'draft' | 'submitted' | 'acknowledged';
  unit_summary: string | null;
  patients_in_progress: string | null;
  completed_sessions_notes: string | null;
  complications_alerts: string | null;
  access_concerns: string | null;
  pending_tasks: string | null;
  medications_notes: string | null;
  equipment_notes: string | null;
  recommendations: string | null;
  census_count: number | null;
  submitted_at: string | null;
  acknowledged_at: string | null;
  acknowledged_by_name?: string | null;
  created_at: string;
  patients?: ShiftHandoffPatient[];
}

export interface ShiftHandoffPatient {
  id?: number;
  handoff_id?: number;
  patient_id: number;
  patient_name?: string;
  session_id?: number | null;
  acuity: 'stable' | 'watch' | 'critical';
  situation: string | null;
  background: string | null;
  assessment: string | null;
  recommendation: string | null;
}
