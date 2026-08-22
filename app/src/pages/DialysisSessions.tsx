import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  Plus, Search, Calendar, Clock, Droplets,
  ChevronRight, X
} from 'lucide-react';
import { DialysisSession } from '../types';
import ModalPortal from '../components/ModalPortal';

const DialysisSessions: React.FC = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<DialysisSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form state for creating session
  const [formData, setFormData] = useState({
    patient_id: '',
    scheduled_date: '',
    scheduled_time: '',
    duration_minutes: '240',
    doctor_id: '',
    nurse_id: '',
    machine_id: '',
    dry_weight: '',
    dialysate_composition: ''
  });

  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [nurses, setNurses] = useState([]);

  useEffect(() => {
    fetchSessions();
    if (user?.role !== 'patient') {
      fetchFormData();
    }
  }, []);

  const fetchSessions = async () => {
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (dateFilter) params.date = dateFilter;

      const response = await axios.get('/api/dialysis', { params });
      setSessions(response.data);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFormData = async () => {
    try {
      const [patientsRes, doctorsRes, nursesRes] = await Promise.all([
        axios.get('/api/patients'),
        axios.get('/api/doctors'),
        axios.get('/api/nurses')
      ]);
      setPatients(patientsRes.data);
      setDoctors(doctorsRes.data);
      setNurses(nursesRes.data);
    } catch (error) {
      console.error('Failed to fetch form data:', error);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/dialysis', {
        ...formData,
        duration_minutes: parseInt(formData.duration_minutes),
        dry_weight: formData.dry_weight ? parseFloat(formData.dry_weight) : null
      });
      setShowCreateModal(false);
      setFormData({
        patient_id: '', scheduled_date: '', scheduled_time: '', duration_minutes: '240',
        doctor_id: '', nurse_id: '', machine_id: '', dry_weight: '', dialysate_composition: ''
      });
      fetchSessions();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to create session');
    }
  };

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = !searchTerm || 
      session.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.machine_id?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return 'badge-green';
      case 'in_progress': return 'badge-blue';
      case 'scheduled': return 'badge-yellow';
      case 'cancelled': return 'badge-red';
      case 'missed': return 'badge-gray';
      default: return 'badge-gray';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-semibold text-gray-900 tracking-tight">Dialysis Sessions</h1>
          <p className="text-gray-500">Manage and monitor dialysis treatments</p>
        </div>
        {user?.role !== 'patient' && (
          <button 
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            Schedule Session
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
              placeholder="Search by patient or machine..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <div className="sm:w-40">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); fetchSessions(); }}
              className="input-field"
            >
              <option value="">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="missed">Missed</option>
            </select>
          </div>
          <div className="sm:w-40">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => { setDateFilter(e.target.value); fetchSessions(); }}
              className="input-field"
            />
          </div>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="card-static overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="table-header">Patient</th>
                <th className="table-header">Date & Time</th>
                <th className="table-header">Status</th>
                <th className="table-header">Doctor</th>
                <th className="table-header">Nurse</th>
                <th className="table-header">Machine</th>
                <th className="table-header">Pre Weight</th>
                <th className="table-header">Post Weight</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSessions.map((session) => (
                <tr key={session.id} className="table-row-hover">
                  <td className="table-cell font-medium">{session.patient_name}</td>
                  <td className="table-cell">
                    <div className="flex items-center text-sm">
                      <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                      {session.scheduled_date}
                      <Clock className="h-4 w-4 ml-2 mr-1 text-gray-400" />
                      {session.scheduled_time}
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className={`badge ${getStatusBadge(session.status)}`}>
                      {session.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="table-cell">{session.doctor_name || 'Unassigned'}</td>
                  <td className="table-cell">{session.nurse_name || 'Unassigned'}</td>
                  <td className="table-cell">{session.machine_id || 'TBD'}</td>
                  <td className="table-cell">{session.pre_weight ? `${session.pre_weight} kg` : '-'}</td>
                  <td className="table-cell">{session.post_weight ? `${session.post_weight} kg` : '-'}</td>
                  <td className="table-cell">
                    <Link 
                      to={`/dialysis/${session.id}`} 
                      className="text-primary-600 hover:text-primary-700 font-medium flex items-center"
                    >
                      View <ChevronRight className="h-4 w-4 ml-1" />
                    </Link>
                  </td>
                </tr>
              ))}
              {filteredSessions.length === 0 && (
                <tr>
                  <td colSpan={9} className="table-cell text-center text-gray-500 py-12">
                    <Droplets className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                    <p>No dialysis sessions found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Session Modal */}
      {showCreateModal && (
        <ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/10 backdrop-blur-[2px]" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl ring-1 ring-gray-200 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Schedule New Dialysis Session</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleCreateSession} className="space-y-4">
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Date *</label>
                    <input
                      type="date"
                      value={formData.scheduled_date}
                      onChange={(e) => setFormData({...formData, scheduled_date: e.target.value})}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Time *</label>
                    <input
                      type="time"
                      value={formData.scheduled_time}
                      onChange={(e) => setFormData({...formData, scheduled_time: e.target.value})}
                      className="input-field"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Duration (min)</label>
                    <input
                      type="number"
                      value={formData.duration_minutes}
                      onChange={(e) => setFormData({...formData, duration_minutes: e.target.value})}
                      className="input-field"
                      min="60"
                      max="480"
                    />
                  </div>
                  <div>
                    <label className="label">Machine ID</label>
                    <input
                      type="text"
                      value={formData.machine_id}
                      onChange={(e) => setFormData({...formData, machine_id: e.target.value})}
                      className="input-field"
                      placeholder="e.g., Machine-01"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
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
                  <div>
                    <label className="label">Nurse</label>
                    <select
                      value={formData.nurse_id}
                      onChange={(e) => setFormData({...formData, nurse_id: e.target.value})}
                      className="input-field"
                    >
                      <option value="">Select Nurse</option>
                      {nurses.map((n: any) => (
                        <option key={n.id} value={n.id}>{n.full_name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Dry Weight (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.dry_weight}
                      onChange={(e) => setFormData({...formData, dry_weight: e.target.value})}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label">Dialysate</label>
                    <input
                      type="text"
                      value={formData.dialysate_composition}
                      onChange={(e) => setFormData({...formData, dialysate_composition: e.target.value})}
                      className="input-field"
                      placeholder="e.g., Na 138, K 2.0"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Schedule Session
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

export default DialysisSessions;
