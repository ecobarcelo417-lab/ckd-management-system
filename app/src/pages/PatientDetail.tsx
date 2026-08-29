import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft, User, Phone, Mail, Droplets, HeartPulse,
  Calendar, FlaskConical, Pill
} from 'lucide-react';
import { Patient, DialysisSession, LabResult, Prescription } from '../types';

const PatientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [dialysisHistory, setDialysisHistory] = useState<DialysisSession[]>([]);
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchPatientData();
    }
  }, [id]);

  const fetchPatientData = async () => {
    try {
      const [patientRes, dialysisRes, labsRes, prescriptionsRes] = await Promise.all([
        axios.get(`/api/patients/${id}`),
        axios.get(`/api/patients/${id}/dialysis-history`),
        axios.get(`/api/patients/${id}/lab-results`),
        axios.get(`/api/prescriptions?patient_id=${id}`)
      ]);

      setPatient(patientRes.data);
      setDialysisHistory(dialysisRes.data);
      setLabResults(labsRes.data);
      setPrescriptions(prescriptionsRes.data);
    } catch (error) {
      console.error('Failed to fetch patient data:', error);
    } finally {
      setLoading(false);
    }
  };

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

  if (!patient) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Patient not found</p>
        <Link to="/patients" className="text-primary-600 hover:text-primary-700 mt-2 inline-block">
          Back to Patients
        </Link>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'dialysis', label: 'Dialysis History', icon: Droplets },
    { id: 'labs', label: 'Lab Results', icon: FlaskConical },
    { id: 'prescriptions', label: 'Prescriptions', icon: Pill },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link to="/patients" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-semibold text-gray-900 tracking-tight">{patient.full_name}</h1>
          <p className="text-gray-500">Patient ID: #{patient.id}</p>
        </div>
      </div>

      {/* Patient Info Card */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-xl">
              <Mail className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium text-gray-900">{patient.email}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-xl">
              <Phone className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p className="font-medium text-gray-900">{patient.phone || 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-xl">
              <HeartPulse className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Blood Type</p>
              <p className="font-medium text-gray-900">{patient.blood_type || 'Unknown'}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 rounded-xl">
              <Calendar className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Date of Birth</p>
              <p className="font-medium text-gray-900">{patient.date_of_birth || 'N/A'}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-500 mb-1">Emergency Contact</p>
            <p className="font-medium text-gray-900">{patient.emergency_contact || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Access Type</p>
            <p className="font-medium text-gray-900">{patient.access_type || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Dialysis Start Date</p>
            <p className="font-medium text-gray-900">{patient.dialysis_start_date || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Address</p>
            <p className="font-medium text-gray-900">{patient.address || 'N/A'}</p>
          </div>
        </div>

        {(patient.medical_history || patient.allergies) && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            {patient.medical_history && (
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-1">Medical History</p>
                <p className="text-gray-900">{patient.medical_history}</p>
              </div>
            )}
            {patient.allergies && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Allergies</p>
                <p className="text-gray-900">{patient.allergies}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-4 px-1 border-b-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-5 w-5 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Sessions</h3>
              <Droplets className="h-5 w-5 text-medical-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{dialysisHistory.length}</p>
            <p className="text-sm text-gray-500">Total dialysis sessions</p>
          </div>
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Lab Tests</h3>
              <FlaskConical className="h-5 w-5 text-purple-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{labResults.length}</p>
            <p className="text-sm text-gray-500">Total lab tests performed</p>
          </div>
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Prescriptions</h3>
              <Pill className="h-5 w-5 text-primary-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{prescriptions.length}</p>
            <p className="text-sm text-gray-500">Total prescriptions</p>
          </div>
        </div>
      )}

      {activeTab === 'dialysis' && (
        <div className="card-static overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="table-header">Date</th>
                  <th className="table-header">Time</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Pre Weight</th>
                  <th className="table-header">Post Weight</th>
                  <th className="table-header">Fluid Removed</th>
                  <th className="table-header">KTV</th>
                  <th className="table-header">URR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {dialysisHistory.map((session) => (
                  <tr key={session.id} className="table-row-hover">
                    <td className="table-cell">{session.scheduled_date}</td>
                    <td className="table-cell">{session.scheduled_time}</td>
                    <td className="table-cell">
                      <span className={`badge ${getStatusBadge(session.status)}`}>
                        {session.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="table-cell">{session.pre_weight ? `${session.pre_weight} kg` : '-'}</td>
                    <td className="table-cell">{session.post_weight ? `${session.post_weight} kg` : '-'}</td>
                    <td className="table-cell">{session.fluid_removed ? `${session.fluid_removed} L` : '-'}</td>
                    <td className="table-cell">{session.kt_v || '-'}</td>
                    <td className="table-cell">{session.urea_reduction_ratio ? `${session.urea_reduction_ratio}%` : '-'}</td>
                  </tr>
                ))}
                {dialysisHistory.length === 0 && (
                  <tr>
                    <td colSpan={8} className="table-cell text-center text-gray-500 py-8">
                      No dialysis history found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'labs' && (
        <div className="card-static overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="table-header">Test Date</th>
                  <th className="table-header">Hb</th>
                  <th className="table-header">Hct</th>
                  <th className="table-header">Na</th>
                  <th className="table-header">K</th>
                  <th className="table-header">BUN</th>
                  <th className="table-header">Cr</th>
                  <th className="table-header">Alb</th>
                  <th className="table-header">Ca</th>
                  <th className="table-header">Phos</th>
                  <th className="table-header">PTH</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {labResults.map((lab) => (
                  <tr key={lab.id} className="table-row-hover">
                    <td className="table-cell">{lab.test_date}</td>
                    <td className="table-cell">{lab.hemoglobin || '-'}</td>
                    <td className="table-cell">{lab.hematocrit || '-'}</td>
                    <td className="table-cell">{lab.sodium || '-'}</td>
                    <td className="table-cell">{lab.potassium || '-'}</td>
                    <td className="table-cell">{lab.bun || '-'}</td>
                    <td className="table-cell">{lab.creatinine || '-'}</td>
                    <td className="table-cell">{lab.albumin || '-'}</td>
                    <td className="table-cell">{lab.calcium || '-'}</td>
                    <td className="table-cell">{lab.phosphorus || '-'}</td>
                    <td className="table-cell">{lab.pth || '-'}</td>
                  </tr>
                ))}
                {labResults.length === 0 && (
                  <tr>
                    <td colSpan={11} className="table-cell text-center text-gray-500 py-8">
                      No lab results found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'prescriptions' && (
        <div className="space-y-4">
          {prescriptions.map((prescription) => (
            <div key={prescription.id} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{prescription.medication_name}</h3>
                  <p className="text-sm text-gray-500">Prescribed by: {prescription.doctor_name}</p>
                </div>
                <span className={`badge ${
                  prescription.status === 'active' ? 'badge-green' :
                  prescription.status === 'discontinued' ? 'badge-red' : 'badge-gray'
                }`}>
                  {prescription.status}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Dosage</p>
                  <p className="font-medium text-gray-900">{prescription.dosage}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Frequency</p>
                  <p className="font-medium text-gray-900">{prescription.frequency}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Start Date</p>
                  <p className="font-medium text-gray-900">{prescription.start_date}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Route</p>
                  <p className="font-medium text-gray-900">{prescription.route || 'N/A'}</p>
                </div>
              </div>
              {prescription.instructions && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500">Instructions</p>
                  <p className="text-gray-900">{prescription.instructions}</p>
                </div>
              )}
            </div>
          ))}
          {prescriptions.length === 0 && (
            <div className="card text-center py-12">
              <Pill className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No prescriptions found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PatientDetail;
