import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  Plus, Search, Pill, AlertCircle, XCircle, X
} from 'lucide-react';
import { Prescription } from '../types';
import ModalPortal from '../components/ModalPortal';

const Prescriptions: React.FC = () => {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [patients, setPatients] = useState([]);

  const [formData, setFormData] = useState({
    patient_id: '',
    medication_name: '',
    dosage: '',
    frequency: '',
    route: '',
    start_date: '',
    end_date: '',
    instructions: ''
  });

  useEffect(() => {
    fetchPrescriptions();
    if (user?.role === 'doctor' || user?.role === 'admin') {
      fetchPatients();
    }
  }, []);

  const fetchPrescriptions = async () => {
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      const response = await axios.get('/api/prescriptions', { params });
      setPrescriptions(response.data);
    } catch (error) {
      console.error('Failed to fetch prescriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await axios.get('/api/patients');
      setPatients(response.data);
    } catch (error) {
      console.error('Failed to fetch patients:', error);
    }
  };

  const handleCreatePrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/prescriptions', formData);
      setShowCreateModal(false);
      setFormData({
        patient_id: '', medication_name: '', dosage: '', frequency: '',
        route: '', start_date: '', end_date: '', instructions: ''
      });
      fetchPrescriptions();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to create prescription');
    }
  };

  const handleStatusUpdate = async (id: number, newStatus: string) => {
    try {
      await axios.put(`/api/prescriptions/${id}`, { status: newStatus });
      fetchPrescriptions();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to update prescription');
    }
  };

  const filteredPrescriptions = prescriptions.filter(p =>
    !searchTerm || 
    p.medication_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.patient_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h1 className="text-2xl sm:text-3xl font-display font-semibold text-gray-900 tracking-tight">Prescriptions</h1>
          <p className="text-gray-500">Manage patient medications and prescriptions</p>
        </div>
        {(user?.role === 'doctor' || user?.role === 'admin') && (
          <button 
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Prescription
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by medication or patient..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <div className="sm:w-40">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); fetchPrescriptions(); }}
              className="input-field"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="discontinued">Discontinued</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Prescriptions Cards */}
      <div className="space-y-4">
        {filteredPrescriptions.map((prescription) => (
          <div key={prescription.id} className="card">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-primary-100 rounded-xl">
                  <Pill className="h-6 w-6 text-primary-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{prescription.medication_name}</h3>
                  <p className="text-sm text-gray-500">Patient: {prescription.patient_name}</p>
                  <p className="text-sm text-gray-500">Prescribed by: {prescription.doctor_name}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`badge ${
                  prescription.status === 'active' ? 'badge-green' :
                  prescription.status === 'discontinued' ? 'badge-red' : 'badge-gray'
                }`}>
                  {prescription.status}
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500">Dosage</p>
                <p className="font-medium text-gray-900">{prescription.dosage}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500">Frequency</p>
                <p className="font-medium text-gray-900">{prescription.frequency}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500">Route</p>
                <p className="font-medium text-gray-900">{prescription.route || 'N/A'}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500">Start Date</p>
                <p className="font-medium text-gray-900">{prescription.start_date}</p>
              </div>
            </div>

            {prescription.instructions && (
              <div className="mt-4 p-3 bg-yellow-50 rounded-xl border border-yellow-200">
                <p className="text-sm text-yellow-800">
                  <AlertCircle className="h-4 w-4 inline mr-1" />
                  {prescription.instructions}
                </p>
              </div>
            )}

            {(user?.role === 'doctor' || user?.role === 'admin') && prescription.status === 'active' && (
              <div className="mt-4 flex justify-end space-x-2">
                <button
                  onClick={() => handleStatusUpdate(prescription.id, 'discontinued')}
                  className="btn-danger text-sm py-1 px-3"
                >
                  <XCircle className="h-4 w-4 mr-1 inline" />
                  Discontinue
                </button>
              </div>
            )}
          </div>
        ))}
        {filteredPrescriptions.length === 0 && (
          <div className="card text-center py-12">
            <Pill className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No prescriptions found</p>
          </div>
        )}
      </div>

      {/* Create Prescription Modal */}
      {showCreateModal && (
        <ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/10 backdrop-blur-[2px]" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl ring-1 ring-gray-200 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">New Prescription</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleCreatePrescription} className="space-y-4">
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
                  <label className="label">Medication Name *</label>
                  <input
                    type="text"
                    value={formData.medication_name}
                    onChange={(e) => setFormData({...formData, medication_name: e.target.value})}
                    className="input-field"
                    placeholder="e.g., Epoetin Alfa"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Dosage *</label>
                    <input
                      type="text"
                      value={formData.dosage}
                      onChange={(e) => setFormData({...formData, dosage: e.target.value})}
                      className="input-field"
                      placeholder="e.g., 4000 units"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Frequency *</label>
                    <input
                      type="text"
                      value={formData.frequency}
                      onChange={(e) => setFormData({...formData, frequency: e.target.value})}
                      className="input-field"
                      placeholder="e.g., 3x weekly"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Route</label>
                    <select
                      value={formData.route}
                      onChange={(e) => setFormData({...formData, route: e.target.value})}
                      className="input-field"
                    >
                      <option value="">Select route</option>
                      <option value="Oral">Oral</option>
                      <option value="IV">IV</option>
                      <option value="Subcutaneous">Subcutaneous</option>
                      <option value="Intramuscular">Intramuscular</option>
                      <option value="Topical">Topical</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Start Date *</label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                      className="input-field"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="label">End Date</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Instructions</label>
                  <textarea
                    value={formData.instructions}
                    onChange={(e) => setFormData({...formData, instructions: e.target.value})}
                    className="input-field h-20"
                    placeholder="Special instructions for the patient..."
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Create Prescription
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

export default Prescriptions;
