import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  Plus, Search, Calendar, Clock,
  CheckCircle, XCircle, LayoutList, CalendarDays, X
} from 'lucide-react';
import { Appointment } from '../types';
import MonthCalendar, { CalendarEvent } from '../components/MonthCalendar';
import ModalPortal from '../components/ModalPortal';
import { format, parseISO, isSameDay } from 'date-fns';

const Appointments: React.FC = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [view, setView] = useState<'list' | 'calendar'>('calendar');
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const [formData, setFormData] = useState({
    patient_id: '',
    doctor_id: '',
    appointment_date: '',
    appointment_time: '',
    type: '',
    notes: ''
  });

  useEffect(() => {
    fetchAppointments();
    if (user?.role !== 'patient') {
      fetchFormData();
    }
  }, []);

  const fetchAppointments = async () => {
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      const response = await axios.get('/api/appointments', { params });
      setAppointments(response.data);
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFormData = async () => {
    try {
      const [patientsRes, doctorsRes] = await Promise.all([
        axios.get('/api/patients'),
        axios.get('/api/doctors')
      ]);
      setPatients(patientsRes.data);
      setDoctors(doctorsRes.data);
    } catch (error) {
      console.error('Failed to fetch form data:', error);
    }
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/appointments', formData);
      setShowCreateModal(false);
      setFormData({
        patient_id: '', doctor_id: '', appointment_date: '',
        appointment_time: '', type: '', notes: ''
      });
      fetchAppointments();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to create appointment');
    }
  };

  const handleStatusUpdate = async (id: number, newStatus: string) => {
    try {
      await axios.put(`/api/appointments/${id}`, { status: newStatus });
      fetchAppointments();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to update appointment');
    }
  };

  const filteredAppointments = appointments.filter(a =>
    !searchTerm ||
    a.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const calendarEvents: CalendarEvent[] = filteredAppointments
    .filter((a) => !!a.appointment_date)
    .map((a) => ({
      id: a.id,
      date: a.appointment_date,
      label: a.type,
      status: a.status,
    }));

  const dayAppointments = selectedDate
    ? filteredAppointments.filter((a) => a.appointment_date && isSameDay(parseISO(a.appointment_date), selectedDate))
    : filteredAppointments;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return 'badge-green';
      case 'scheduled': return 'badge-yellow';
      case 'cancelled': return 'badge-red';
      case 'no_show': return 'badge-gray';
      default: return 'badge-gray';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative h-14 w-14">
          <div className="absolute inset-0 rounded-full border-4 border-skyglow-100"></div>
          <div className="absolute inset-0 rounded-full border-4 border-skyglow-500 border-t-transparent animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Appointments</h1>
          <p className="page-subtitle">Schedule and manage patient appointments</p>
        </div>
        {user?.role !== 'patient' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Appointment
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card-static">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by patient or appointment type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <div className="sm:w-40">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); fetchAppointments(); }}
              className="input-field"
            >
              <option value="">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No Show</option>
            </select>
          </div>
          <div className="flex rounded-xl border border-gray-200 p-1 bg-gray-50 shadow-inset-line self-start">
            <button
              onClick={() => setView('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-xl ${
                view === 'calendar' ? 'bg-white shadow-soft text-skyglow-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <CalendarDays className="h-4 w-4" /> Calendar
            </button>
            <button
              onClick={() => setView('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-xl ${
                view === 'list' ? 'bg-white shadow-soft text-skyglow-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <LayoutList className="h-4 w-4" /> List
            </button>
          </div>
        </div>
      </div>

      {view === 'calendar' ? (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <MonthCalendar
              events={calendarEvents}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
          </div>
          <div className="lg:col-span-2 space-y-4">
            <h3 className="section-title">
              {selectedDate ? format(selectedDate, 'EEEE, MMM d') : 'All appointments'}
            </h3>
            <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
              {dayAppointments.map((appointment) => (
                <div key={appointment.id} className="card">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="stat-icon stat-icon-blue h-10 w-10">
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{appointment.type}</h4>
                        <p className="text-sm text-gray-500">{appointment.patient_name}</p>
                      </div>
                    </div>
                    <span className={`badge ${getStatusBadge(appointment.status)}`}>
                      {appointment.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center text-sm text-gray-500 font-mono">
                    <Clock className="h-4 w-4 mr-1" />
                    {appointment.appointment_time}
                  </div>
                  {user?.role !== 'patient' && appointment.status === 'scheduled' && (
                    <div className="mt-3 flex justify-end space-x-2">
                      <button
                        onClick={() => handleStatusUpdate(appointment.id, 'completed')}
                        className="btn-success text-xs py-1 px-2.5"
                      >
                        <CheckCircle className="h-3.5 w-3.5 mr-1 inline" />
                        Complete
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(appointment.id, 'cancelled')}
                        className="btn-danger text-xs py-1 px-2.5"
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1 inline" />
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {dayAppointments.length === 0 && (
                <div className="card-flat text-center py-10">
                  <Calendar className="h-10 w-10 mx-auto text-gray-200 mb-2" />
                  <p className="text-gray-400 text-sm">No appointments on this day</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Appointments List */
        <div className="space-y-4">
          {filteredAppointments.map((appointment) => (
            <div key={appointment.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="stat-icon stat-icon-blue">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{appointment.type}</h3>
                    <p className="text-sm text-gray-500">Patient: {appointment.patient_name}</p>
                    {appointment.doctor_name && (
                      <p className="text-sm text-gray-500">Doctor: {appointment.doctor_name}</p>
                    )}
                  </div>
                </div>
                <span className={`badge ${getStatusBadge(appointment.status)}`}>
                  {appointment.status.replace('_', ' ')}
                </span>
              </div>

              <div className="mt-4 flex items-center space-x-6 text-sm text-gray-500">
                <div className="flex items-center font-mono">
                  <Calendar className="h-4 w-4 mr-1" />
                  {appointment.appointment_date}
                </div>
                <div className="flex items-center font-mono">
                  <Clock className="h-4 w-4 mr-1" />
                  {appointment.appointment_time}
                </div>
              </div>

              {appointment.notes && (
                <div className="mt-3 p-3 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-700">{appointment.notes}</p>
                </div>
              )}

              {user?.role !== 'patient' && appointment.status === 'scheduled' && (
                <div className="mt-4 flex justify-end space-x-2">
                  <button
                    onClick={() => handleStatusUpdate(appointment.id, 'completed')}
                    className="btn-success text-sm py-1 px-3"
                  >
                    <CheckCircle className="h-4 w-4 mr-1 inline" />
                    Complete
                  </button>
                  <button
                    onClick={() => handleStatusUpdate(appointment.id, 'cancelled')}
                    className="btn-danger text-sm py-1 px-3"
                  >
                    <XCircle className="h-4 w-4 mr-1 inline" />
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ))}
          {filteredAppointments.length === 0 && (
            <div className="card text-center py-12">
              <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No appointments found</p>
            </div>
          )}
        </div>
      )}

      {/* Create Appointment Modal */}
      {showCreateModal && (
        <ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/10 backdrop-blur-[2px]" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl ring-1 ring-gray-200 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">New Appointment</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleCreateAppointment} className="space-y-4">
                <div>
                  <label className="label">Patient *</label>
                  <select
                    value={formData.patient_id}
                    onChange={(e) => setFormData({...formData, patient_id: e.target.value})}
                    className="input-field"
                    required
                  >
                    <option value="">Select Patient</option>
                    {patients.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.full_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Doctor</label>
                  <select
                    value={formData.doctor_id}
                    onChange={(e) => setFormData({...formData, doctor_id: e.target.value})}
                    className="input-field"
                  >
                    <option value="">Select Doctor</option>
                    {doctors.map((d: any) => (
                      <option key={d.id} value={d.id}>{d.full_name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Date *</label>
                    <input
                      type="date"
                      value={formData.appointment_date}
                      onChange={(e) => setFormData({...formData, appointment_date: e.target.value})}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Time *</label>
                    <input
                      type="time"
                      value={formData.appointment_time}
                      onChange={(e) => setFormData({...formData, appointment_time: e.target.value})}
                      className="input-field"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Appointment Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="input-field"
                    required
                  >
                    <option value="">Select type</option>
                    <option value="Follow-up">Follow-up</option>
                    <option value="Consultation">Consultation</option>
                    <option value="Lab Review">Lab Review</option>
                    <option value="Pre-dialysis Assessment">Pre-dialysis Assessment</option>
                    <option value="Vascular Access Check">Vascular Access Check</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="label">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="input-field h-20"
                    placeholder="Additional notes..."
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Schedule Appointment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default Appointments;
