import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  Plus, Search, AlertTriangle, CheckCircle, Thermometer,
  Droplets, Scale, Trash2, X
} from 'lucide-react';
import ModalPortal from '../components/ModalPortal';

interface SymptomEntry {
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
  reviewed_at: string | null;
  created_at: string;
}

const SymptomLog: React.FC = () => {
  const { user } = useAuth();
  const isPatient = user?.role === 'patient';
  const isCareTeam = user?.role === 'admin' || user?.role === 'doctor' || user?.role === 'nurse';

  const [logs, setLogs] = useState<SymptomEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterUnreviewed, setFilterUnreviewed] = useState(false);

  const [formData, setFormData] = useState({
    symptoms: '',
    severity: 'mild',
    fluid_intake_ml: '',
    weight_kg: '',
    notes: '',
    logged_at: new Date().toISOString().slice(0, 16),
  });

  useEffect(() => {
    fetchLogs();
  }, [filterUnreviewed]);

  const fetchLogs = async () => {
    try {
      const params: any = {};
      if (filterUnreviewed && isCareTeam) params.reviewed = '0';
      const response = await axios.get('/api/symptoms', { params });
      setLogs(response.data);
    } catch (error) {
      console.error('Failed to fetch symptom logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/symptoms', {
        ...formData,
        logged_at: formData.logged_at.replace('T', ' '),
        fluid_intake_ml: formData.fluid_intake_ml || null,
        weight_kg: formData.weight_kg || null,
      });
      setShowCreateModal(false);
      setFormData({
        symptoms: '',
        severity: 'mild',
        fluid_intake_ml: '',
        weight_kg: '',
        notes: '',
        logged_at: new Date().toISOString().slice(0, 16),
      });
      fetchLogs();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to save symptom log');
    }
  };

  const handleReview = async (id: number) => {
    try {
      await axios.put(`/api/symptoms/${id}/review`);
      fetchLogs();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to mark as reviewed');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this symptom log?')) return;
    try {
      await axios.delete(`/api/symptoms/${id}`);
      fetchLogs();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete');
    }
  };

  const severityBadge = (severity: string) => {
    switch (severity) {
      case 'severe': return 'badge-red';
      case 'moderate': return 'badge-yellow';
      default: return 'badge-green';
    }
  };

  const filtered = logs.filter((log) => {
    const q = searchTerm.toLowerCase();
    return (
      log.symptoms.toLowerCase().includes(q) ||
      (log.patient_name || '').toLowerCase().includes(q) ||
      log.severity.includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-semibold text-gray-900 tracking-tight">
            {isPatient ? 'My Symptom Log' : 'Patient Symptom Reports'}
          </h1>
          <p className="text-gray-500 mt-1">
            {isPatient
              ? 'Track symptoms, fluid intake, and weight between dialysis sessions'
              : 'Review patient self-reports and mark them as reviewed'}
          </p>
        </div>
        {isPatient && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center justify-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Log Symptoms
          </button>
        )}
      </div>

      {/* CKD tips for patients */}
      {isPatient && (
        <div className="card p-4 bg-skyglow-50 border border-skyglow-100">
          <h3 className="font-semibold text-skyglow-800 mb-2">Between-session tips</h3>
          <ul className="text-sm text-skyglow-700 space-y-1 list-disc list-inside">
            <li>Log swelling, shortness of breath, or unusual fatigue promptly.</li>
            <li>Track interdialytic weight gain — report sudden jumps to your nurse.</li>
            <li>Stay within your fluid allowance; note approximate intake in ml.</li>
            <li>Severe symptoms (chest pain, severe breathlessness) need emergency care, not only this log.</li>
          </ul>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search symptoms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10 w-full"
          />
        </div>
        {isCareTeam && (
          <label className="flex items-center gap-2 text-sm text-gray-600 px-3 py-2 bg-white border border-gray-200 rounded-xl">
            <input
              type="checkbox"
              checked={filterUnreviewed}
              onChange={(e) => setFilterUnreviewed(e.target.checked)}
              className="rounded border-gray-300"
            />
            Unreviewed only
          </label>
        )}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="card p-12 text-center text-gray-500">
            <Thermometer className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p>No symptom logs yet.</p>
            {isPatient && (
              <p className="text-sm mt-1">Use “Log Symptoms” to record how you feel between sessions.</p>
            )}
          </div>
        ) : (
          filtered.map((log) => (
            <div key={log.id} className="card p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {!isPatient && (
                      <span className="font-semibold text-gray-900">{log.patient_name}</span>
                    )}
                    <span className={`badge ${severityBadge(log.severity)} capitalize`}>
                      {log.severity}
                    </span>
                    {log.reviewed ? (
                      <span className="inline-flex items-center text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                        <CheckCircle className="h-3 w-3 mr-1" /> Reviewed
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                        <AlertTriangle className="h-3 w-3 mr-1" /> Pending review
                      </span>
                    )}
                  </div>
                  <p className="text-gray-800 whitespace-pre-wrap">{log.symptoms}</p>
                  {log.notes && (
                    <p className="text-sm text-gray-500 mt-2">Notes: {log.notes}</p>
                  )}
                  <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
                    <span>{log.logged_at}</span>
                    {log.fluid_intake_ml != null && (
                      <span className="inline-flex items-center">
                        <Droplets className="h-3.5 w-3.5 mr-1" /> {log.fluid_intake_ml} ml
                      </span>
                    )}
                    {log.weight_kg != null && (
                      <span className="inline-flex items-center">
                        <Scale className="h-3.5 w-3.5 mr-1" /> {log.weight_kg} kg
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isCareTeam && !log.reviewed && (
                    <button
                      onClick={() => handleReview(log.id)}
                      className="btn-secondary text-sm flex items-center"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Mark reviewed
                    </button>
                  )}
                  {(isPatient && !log.reviewed) || user?.role === 'admin' || user?.role === 'doctor' ? (
                    <button
                      onClick={() => handleDelete(log.id)}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showCreateModal && isPatient && (
        <ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/10 backdrop-blur-[2px]" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl ring-1 ring-gray-200 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Log Symptoms</h2>
                <p className="text-sm text-gray-500 mt-1">Your care team will be notified of severe reports.</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600 ml-4 flex-shrink-0">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">When</label>
                <input
                  type="datetime-local"
                  required
                  value={formData.logged_at}
                  onChange={(e) => setFormData({ ...formData, logged_at: e.target.value })}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Symptoms *</label>
                <textarea
                  required
                  rows={3}
                  value={formData.symptoms}
                  onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
                  placeholder="e.g. ankle swelling, mild shortness of breath after walking"
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                <select
                  value={formData.severity}
                  onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                  className="input w-full"
                >
                  <option value="mild">Mild</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fluid intake (ml)</label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={formData.fluid_intake_ml}
                    onChange={(e) => setFormData({ ...formData, fluid_intake_ml: e.target.value })}
                    className="input w-full"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.weight_kg}
                    onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
                    className="input w-full"
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Additional notes</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input w-full"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save log
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

export default SymptomLog;
