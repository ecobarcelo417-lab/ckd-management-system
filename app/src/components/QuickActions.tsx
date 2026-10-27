import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import {
  UserPlus, UserCog, CalendarPlus, CalendarDays, Users, BarChart3, Pill,
  FlaskConical, Droplets, ClipboardList, Thermometer, UserCircle, Zap, LucideIcon,
} from 'lucide-react';

interface QuickAction {
  to: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  primary?: boolean; 
}

const ACTIONS: Record<string, QuickAction[]> = {
  admin: [
    { to: '/patients?action=new', label: 'Add Patient', hint: 'Register a new patient', icon: UserPlus, primary: true },
    { to: '/users?action=new', label: 'Add User', hint: 'Create a staff or patient account', icon: UserCog, primary: true },
    { to: '/appointments?action=new', label: 'New Appointment', hint: 'Schedule a visit', icon: CalendarPlus, primary: true },
    { to: '/patients', label: 'Patient Records', hint: 'Browse all patients', icon: Users },
    { to: '/reports', label: 'Reports', hint: 'View system reports', icon: BarChart3 },
    { to: '/profile', label: 'My Profile', hint: 'Account settings', icon: UserCircle },
  ],
  doctor: [
    { to: '/appointments?action=new', label: 'New Appointment', hint: 'Schedule a visit', icon: CalendarPlus, primary: true },
    { to: '/prescriptions?action=new', label: 'New Prescription', hint: 'Prescribe a medication', icon: Pill, primary: true },
    { to: '/lab-results?action=new', label: 'Add Lab Result', hint: 'Record a lab test', icon: FlaskConical, primary: true },
    { to: '/patients', label: 'My Patients', hint: 'Open patient records', icon: Users },
    { to: '/dialysis', label: 'Dialysis Sessions', hint: 'Review sessions', icon: Droplets },
    { to: '/reports', label: 'Clinical Reports', hint: 'View clinical reports', icon: BarChart3 },
    { to: '/profile', label: 'My Profile', hint: 'Account settings', icon: UserCircle },
  ],
  nurse: [
    { to: '/dialysis?action=new', label: 'Schedule Session', hint: 'Create a dialysis session', icon: Droplets, primary: true },
    { to: '/handoffs?action=new', label: 'New Shift Handoff', hint: 'Write a handoff report', icon: ClipboardList, primary: true },
    { to: '/appointments?action=new', label: 'New Appointment', hint: 'Schedule a visit', icon: CalendarPlus, primary: true },
    { to: '/patients', label: 'Patients', hint: 'Open patient records', icon: Users },
    { to: '/lab-results', label: 'Lab Results', hint: 'View lab results', icon: FlaskConical },
    { to: '/prescriptions', label: 'Medications', hint: 'View medications', icon: Pill },
    { to: '/symptoms', label: 'Symptom Reports', hint: 'Review patient reports', icon: Thermometer },
    { to: '/profile', label: 'My Profile', hint: 'Account settings', icon: UserCircle },
  ],
  patient: [
    { to: '/symptoms?action=new', label: 'Log Symptoms', hint: 'Report how you feel', icon: Thermometer, primary: true },
    { to: '/appointments', label: 'My Appointments', hint: 'View upcoming visits', icon: CalendarDays },
    { to: '/dialysis', label: 'My Sessions', hint: 'View dialysis schedule', icon: Droplets },
    { to: '/lab-results', label: 'My Labs', hint: 'View lab results', icon: FlaskConical },
    { to: '/prescriptions', label: 'My Medications', hint: 'View prescriptions', icon: Pill },
    { to: '/profile', label: 'My Profile', hint: 'Account settings', icon: UserCircle },
  ],
};

const QuickActions: React.FC = () => {
  const { user } = useAuth();
  const actions = ACTIONS[user?.role || 'patient'] || ACTIONS.patient;

  return (
    <div className="card p-5 animate-fade-in-up">
      <div className="flex items-center gap-2 mb-1">
        <Zap className="h-4 w-4 text-gray-500" />
        <h3 className="section-title">Quick Actions</h3>
      </div>
      <p className="text-sm text-gray-400 mb-4">Jump straight to the things you do most</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {actions.map((a, i) => {
          const Icon = a.icon;
          return (
            <motion.div
              key={a.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.3 }}
            >
              <Link
                to={a.to}
                className={`group flex items-center gap-3 p-3.5 rounded-xl border transition-colors duration-150 ${
                  a.primary
                    ? 'bg-gray-900 border-gray-900 text-white hover:bg-gray-700'
                    : 'bg-gray-50 border-gray-100 text-gray-900 hover:bg-gray-100'
                }`}
              >
                <span
                  className={`h-10 w-10 shrink-0 rounded-lg flex items-center justify-center ${
                    a.primary ? 'bg-white/10' : 'bg-white ring-1 ring-inset ring-gray-200'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${a.primary ? 'text-white' : 'text-gray-600'}`} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold truncate">{a.label}</span>
                  <span className={`block text-xs truncate ${a.primary ? 'text-gray-300' : 'text-gray-500'}`}>
                    {a.hint}
                  </span>
                </span>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default QuickActions;
