import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  Plus, Search, FlaskConical, TrendingUp, TrendingDown,
  CheckCircle, X
} from 'lucide-react';
import { LabResult } from '../types';
import ModalPortal from '../components/ModalPortal';

// Lab Value Component with status indicator
const LabValue: React.FC<{ value: number | null; param: string }> = ({ value, param }) => {
  const getValueStatus = (value: number | null, param: string) => {
    if (value === null || value === undefined) return null;

    const ranges: Record<string, { min: number; max: number }> = {
      hemoglobin: { min: 11, max: 13 },
      hematocrit: { min: 33, max: 36 },
      sodium: { min: 135, max: 145 },
      potassium: { min: 3.5, max: 5.0 },
      bun: { min: 10, max: 20 },
      creatinine: { min: 0.7, max: 1.3 },
      albumin: { min: 3.5, max: 5.0 },
      calcium: { min: 8.5, max: 10.5 },
      phosphorus: { min: 2.5, max: 4.5 },
      pth: { min: 150, max: 300 },
    };

    const range = ranges[param];
    if (!range) return null;

    if (value < range.min) return 'low';
    if (value > range.max) return 'high';
    return 'normal';
  };

  const status = getValueStatus(value, param);

  if (value === null || value === undefined) {
    return <span className="text-gray-400">-</span>;
  }

  return (
    <span className={`inline-flex items-center ${
      status === 'normal' ? 'text-green-600' :
      status === 'low' ? 'text-blue-600' :
      status === 'high' ? 'text-red-600' : 'text-gray-900'
    }`}>
      {value}
      {status === 'high' && <TrendingUp className="h-3 w-3 ml-1" />}
      {status === 'low' && <TrendingDown className="h-3 w-3 ml-1" />}
      {status === 'normal' && <CheckCircle className="h-3 w-3 ml-1" />}
    </span>
  );
};

const LabResults: React.FC = () => {
  const { user } = useAuth();
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [patients, setPatients] = useState([]);

  const [formData, setFormData] = useState({
    patient_id: '',
    test_date: '',
    hemoglobin: '',
    hematocrit: '',
    sodium: '',
    potassium: '',
    bun: '',
    creatinine: '',
    albumin: '',
    calcium: '',
    phosphorus: '',
    pth: '',
    notes: ''
  });

  useEffect(() => {
    fetchLabResults();
    if (user?.role === 'doctor' || user?.role === 'admin') {
      fetchPatients();
    }
  }, []);

  const fetchLabResults = async () => {
    try {
      const response = await axios.get('/api/labs');
      setLabResults(response.data);
    } catch (error) {
      console.error('Failed to fetch lab results:', error);
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

  const handleCreateLab = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/labs', {
        ...formData,
        hemoglobin: formData.hemoglobin ? parseFloat(formData.hemoglobin) : null,
        hematocrit: formData.hematocrit ? parseFloat(formData.hematocrit) : null,
        sodium: formData.sodium ? parseFloat(formData.sodium) : null,
        potassium: formData.potassium ? parseFloat(formData.potassium) : null,
        bun: formData.bun ? parseFloat(formData.bun) : null,
        creatinine: formData.creatinine ? parseFloat(formData.creatinine) : null,
        albumin: formData.albumin ? parseFloat(formData.albumin) : null,
        calcium: formData.calcium ? parseFloat(formData.calcium) : null,
        phosphorus: formData.phosphorus ? parseFloat(formData.phosphorus) : null,
        pth: formData.pth ? parseFloat(formData.pth) : null,
      });
      setShowCreateModal(false);
      setFormData({
        patient_id: '', test_date: '', hemoglobin: '', hematocrit: '', sodium: '',
        potassium: '', bun: '', creatinine: '', albumin: '', calcium: '',
        phosphorus: '', pth: '', notes: ''
      });
      fetchLabResults();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to create lab result');
    }
  };

  const filteredResults = labResults.filter(result =>
    !searchTerm || result.patient_name?.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h1 className="text-2xl sm:text-3xl font-display font-semibold text-gray-900 tracking-tight">Lab Results</h1>
          <p className="text-gray-500">View and manage laboratory test results</p>
        </div>
        {(user?.role === 'doctor' || user?.role === 'admin') && (
          <button 
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Lab Result
          </button>
        )}
      </div>

      {/* Search */}
      <div className="card-static">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by patient name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-10"
          />
        </div>
      </div>

      {/* Lab Results Table */}
      <div className="card-static overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="table-header">Patient</th>
                <th className="table-header">Date</th>
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
              {filteredResults.map((lab) => (
                <tr key={lab.id} className="table-row-hover">
                  <td className="table-cell font-medium">{lab.patient_name}</td>
                  <td className="table-cell">{lab.test_date}</td>
                  <td className="table-cell">
                    <LabValue value={lab.hemoglobin} param="hemoglobin" />
                  </td>
                  <td className="table-cell">
                    <LabValue value={lab.hematocrit} param="hematocrit" />
                  </td>
                  <td className="table-cell">
                    <LabValue value={lab.sodium} param="sodium" />
                  </td>
                  <td className="table-cell">
                    <LabValue value={lab.potassium} param="potassium" />
                  </td>
                  <td className="table-cell">
                    <LabValue value={lab.bun} param="bun" />
                  </td>
                  <td className="table-cell">
                    <LabValue value={lab.creatinine} param="creatinine" />
                  </td>
                  <td className="table-cell">
                    <LabValue value={lab.albumin} param="albumin" />
                  </td>
                  <td className="table-cell">
                    <LabValue value={lab.calcium} param="calcium" />
                  </td>
                  <td className="table-cell">
                    <LabValue value={lab.phosphorus} param="phosphorus" />
                  </td>
                  <td className="table-cell">
                    <LabValue value={lab.pth} param="pth" />
                  </td>
                </tr>
              ))}
              {filteredResults.length === 0 && (
                <tr>
                  <td colSpan={12} className="table-cell text-center text-gray-500 py-12">
                    <FlaskConical className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                    <p>No lab results found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Lab Modal */}
      {showCreateModal && (
        <ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/10 backdrop-blur-[2px]" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl ring-1 ring-gray-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Add Lab Result</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleCreateLab} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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
                    <label className="label">Test Date *</label>
                    <input
                      type="date"
                      value={formData.test_date}
                      onChange={(e) => setFormData({...formData, test_date: e.target.value})}
                      className="input-field"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="label">Hemoglobin (g/dL)</label>
                    <input
                      type="number" step="0.1"
                      value={formData.hemoglobin}
                      onChange={(e) => setFormData({...formData, hemoglobin: e.target.value})}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label">Hematocrit (%)</label>
                    <input
                      type="number" step="0.1"
                      value={formData.hematocrit}
                      onChange={(e) => setFormData({...formData, hematocrit: e.target.value})}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label">Sodium (mEq/L)</label>
                    <input
                      type="number" step="0.1"
                      value={formData.sodium}
                      onChange={(e) => setFormData({...formData, sodium: e.target.value})}
                      className="input-field"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="label">Potassium (mEq/L)</label>
                    <input
                      type="number" step="0.1"
                      value={formData.potassium}
                      onChange={(e) => setFormData({...formData, potassium: e.target.value})}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label">BUN (mg/dL)</label>
                    <input
                      type="number" step="0.1"
                      value={formData.bun}
                      onChange={(e) => setFormData({...formData, bun: e.target.value})}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label">Creatinine (mg/dL)</label>
                    <input
                      type="number" step="0.1"
                      value={formData.creatinine}
                      onChange={(e) => setFormData({...formData, creatinine: e.target.value})}
                      className="input-field"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="label">Albumin (g/dL)</label>
                    <input
                      type="number" step="0.1"
                      value={formData.albumin}
                      onChange={(e) => setFormData({...formData, albumin: e.target.value})}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label">Calcium (mg/dL)</label>
                    <input
                      type="number" step="0.1"
                      value={formData.calcium}
                      onChange={(e) => setFormData({...formData, calcium: e.target.value})}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label">Phosphorus (mg/dL)</label>
                    <input
                      type="number" step="0.1"
                      value={formData.phosphorus}
                      onChange={(e) => setFormData({...formData, phosphorus: e.target.value})}
                      className="input-field"
                    />
                  </div>
                </div>
                <div>
                  <label className="label">PTH (pg/mL)</label>
                  <input
                    type="number" step="0.1"
                    value={formData.pth}
                    onChange={(e) => setFormData({...formData, pth: e.target.value})}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="input-field h-20"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Save Lab Result
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

export default LabResults;
