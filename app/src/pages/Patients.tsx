import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Search, Plus, User, Phone, Droplets, ChevronRight, X } from 'lucide-react';
import { Patient } from '../types';
import { useAuth } from '../context/AuthContext';
import ModalPortal from '../components/ModalPortal';

const emptyForm = {
  username: '',
  password: '',
  full_name: '',
  email: '',
  phone: '',
  address: '',
  date_of_birth: '',
  blood_type: '',
  emergency_contact: '',
  emergency_phone: '',
  dialysis_start_date: '',
  access_type: '',
  medical_history: '',
  allergies: '',
  current_medications: '',
};

const Patients: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBloodType, setFilterBloodType] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const response = await axios.get('/api/patients');
      setPatients(response.data);
    } catch (error) {
      console.error('Failed to fetch patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = patient.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient.phone?.includes(searchTerm);
    const matchesBloodType = !filterBloodType || patient.blood_type === filterBloodType;
    return matchesSearch && matchesBloodType;
  });

  const bloodTypes = [...new Set(patients.map(p => p.blood_type).filter(Boolean))];

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openAddModal = () => {
    setFormData(emptyForm);
    setFormError('');
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    if (submitting) return;
    setShowAddModal(false);
  };

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.username || !formData.password || !formData.email || !formData.full_name) {
      setFormError('Username, password, email, and full name are required.');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post('/api/patients', formData);
      setShowAddModal(false);
      setFormData(emptyForm);
      await fetchPatients();
    } catch (error: any) {
      setFormError(error.response?.data?.error || 'Failed to add patient. Please try again.');
    } finally {
      setSubmitting(false);
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
          <h1 className="text-2xl sm:text-3xl font-display font-semibold text-gray-900 tracking-tight">Patients</h1>
          <p className="text-gray-500">Manage patient records and information</p>
        </div>
        {isAdmin && (
          <button className="btn-primary flex items-center" onClick={openAddModal}>
            <Plus className="h-5 w-5 mr-2" />
            Add Patient
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
              placeholder="Search patients by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <div className="sm:w-48">
            <select
              value={filterBloodType}
              onChange={(e) => setFilterBloodType(e.target.value)}
              className="input-field"
            >
              <option value="">All Blood Types</option>
              {bloodTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Patients Table */}
      <div className="card-static overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="table-header">Patient</th>
                <th className="table-header">Contact</th>
                <th className="table-header">Blood Type</th>
                <th className="table-header">Dialysis Start</th>
                <th className="table-header">Access Type</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredPatients.map((patient) => (
                <tr key={patient.id} className="table-row-hover">
                  <td className="table-cell">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{patient.full_name}</div>
                        <div className="text-sm text-gray-500">{patient.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center text-sm text-gray-500">
                      <Phone className="h-4 w-4 mr-1" />
                      {patient.phone || 'N/A'}
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className="badge badge-blue">{patient.blood_type || 'Unknown'}</span>
                  </td>
                  <td className="table-cell text-sm text-gray-500">
                    {patient.dialysis_start_date || 'N/A'}
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center text-sm text-gray-500">
                      <Droplets className="h-4 w-4 mr-1 text-medical-500" />
                      {patient.access_type || 'N/A'}
                    </div>
                  </td>
                  <td className="table-cell">
                    <Link
                      to={`/patients/${patient.id}`}
                      className="text-primary-600 hover:text-primary-700 font-medium flex items-center"
                    >
                      View <ChevronRight className="h-4 w-4 ml-1" />
                    </Link>
                  </td>
                </tr>
              ))}
              {filteredPatients.length === 0 && (
                <tr>
                  <td colSpan={6} className="table-cell text-center text-gray-500 py-12">
                    <User className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                    <p>No patients found matching your criteria</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Patient Modal */}
      {isAdmin && showAddModal && (
        <ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/10 backdrop-blur-[2px]" onClick={closeAddModal}>
          <div className="bg-white rounded-xl shadow-2xl ring-1 ring-gray-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Add New Patient</h2>
              <button onClick={closeAddModal} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddPatient} className="p-6 space-y-4">
              {formError && (
                <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2">
                  {formError}
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Account Info</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input name="username" placeholder="Username *" value={formData.username} onChange={handleFormChange} className="input-field" required />
                  <input name="password" type="password" placeholder="Password *" value={formData.password} onChange={handleFormChange} className="input-field" required />
                  <input name="full_name" placeholder="Full Name *" value={formData.full_name} onChange={handleFormChange} className="input-field" required />
                  <input name="email" type="email" placeholder="Email *" value={formData.email} onChange={handleFormChange} className="input-field" required />
                  <input name="phone" placeholder="Phone" value={formData.phone} onChange={handleFormChange} className="input-field" />
                  <input name="address" placeholder="Address" value={formData.address} onChange={handleFormChange} className="input-field" />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Medical Info</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input name="date_of_birth" type="date" placeholder="Date of Birth" value={formData.date_of_birth} onChange={handleFormChange} className="input-field" />
                  <select name="blood_type" value={formData.blood_type} onChange={handleFormChange} className="input-field">
                    <option value="">Blood Type</option>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bt => (
                      <option key={bt} value={bt}>{bt}</option>
                    ))}
                  </select>
                  <input name="emergency_contact" placeholder="Emergency Contact" value={formData.emergency_contact} onChange={handleFormChange} className="input-field" />
                  <input name="emergency_phone" placeholder="Emergency Phone" value={formData.emergency_phone} onChange={handleFormChange} className="input-field" />
                  <input name="dialysis_start_date" type="date" placeholder="Dialysis Start Date" value={formData.dialysis_start_date} onChange={handleFormChange} className="input-field" />
                  <input name="access_type" placeholder="Access Type" value={formData.access_type} onChange={handleFormChange} className="input-field" />
                </div>
                <textarea name="medical_history" placeholder="Medical History" value={formData.medical_history} onChange={handleFormChange} className="input-field mt-4 w-full" rows={2} />
                <textarea name="allergies" placeholder="Allergies" value={formData.allergies} onChange={handleFormChange} className="input-field mt-4 w-full" rows={2} />
                <textarea name="current_medications" placeholder="Current Medications" value={formData.current_medications} onChange={handleFormChange} className="input-field mt-4 w-full" rows={2} />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeAddModal} className="btn-secondary" disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Adding...' : 'Add Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default Patients;
