import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft, Clock, UserCheck, Calendar, HeartPulse,
  Save, Play, CheckCircle, AlertCircle
} from 'lucide-react';
import { DialysisSession } from '../types';

const SessionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [session, setSession] = useState<DialysisSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');

  // Pre-dialysis form
  const [preForm, setPreForm] = useState({
    pre_weight: '',
    blood_pressure_before: '',
    heart_rate_before: '',
    temperature: '',
    access_site_condition: '',
    heparin_dose: '',
    notes: ''
  });

  // Post-dialysis form
  const [postForm, setPostForm] = useState({
    post_weight: '',
    blood_pressure_after: '',
    heart_rate_after: '',
    fluid_removed: '',
    kt_v: '',
    urea_reduction_ratio: '',
    complications: '',
    notes: ''
  });

  useEffect(() => {
    if (id) fetchSession();
  }, [id]);

  const fetchSession = async () => {
    try {
      const response = await axios.get(`/api/dialysis/${id}`);
      setSession(response.data);
    } catch (error) {
      console.error('Failed to fetch session:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePreAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.put(`/api/dialysis/${id}/pre`, {
        ...preForm,
        pre_weight: preForm.pre_weight ? parseFloat(preForm.pre_weight) : null,
        heart_rate_before: preForm.heart_rate_before ? parseInt(preForm.heart_rate_before) : null,
        temperature: preForm.temperature ? parseFloat(preForm.temperature) : null
      });
      fetchSession();
      alert('Pre-dialysis assessment saved successfully');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to save assessment');
    }
  };

  const handlePostAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.put(`/api/dialysis/${id}/post`, {
        ...postForm,
        post_weight: postForm.post_weight ? parseFloat(postForm.post_weight) : null,
        heart_rate_after: postForm.heart_rate_after ? parseInt(postForm.heart_rate_after) : null,
        fluid_removed: postForm.fluid_removed ? parseFloat(postForm.fluid_removed) : null,
        kt_v: postForm.kt_v ? parseFloat(postForm.kt_v) : null,
        urea_reduction_ratio: postForm.urea_reduction_ratio ? parseFloat(postForm.urea_reduction_ratio) : null
      });
      fetchSession();
      alert('Post-dialysis assessment saved successfully');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to save assessment');
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await axios.put(`/api/dialysis/${id}/status`, { status: newStatus });
      fetchSession();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to update status');
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

  if (!session) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Session not found</p>
        <Link to="/dialysis" className="text-primary-600 hover:text-primary-700 mt-2 inline-block">
          Back to Sessions
        </Link>
      </div>
    );
  }

  // Nurse + admin: run the floor (start session, pre/post vitals)
  // Doctor: view + clinical oversight (no vitals entry)
  // Patient: read-only own session
  const canRunSession = user?.role === 'nurse' || user?.role === 'admin';
  const canEdit = canRunSession;
  const isScheduled = session.status === 'scheduled';
  const isInProgress = session.status === 'in_progress';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/dialysis" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-semibold text-gray-900 tracking-tight">Dialysis Session</h1>
            <p className="text-gray-500">Session #{session.id} | {session.patient_name}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span className={`badge ${getStatusBadge(session.status)} text-sm px-3 py-1`}>
            {session.status.replace('_', ' ')}
          </span>
          {canRunSession && isScheduled && (
            <button
              onClick={() => handleStatusChange('in_progress')}
              className="btn-primary flex items-center text-sm"
            >
              <Play className="h-4 w-4 mr-1" />
              Start Session
            </button>
          )}
          {canRunSession && isInProgress && (
            <button
              onClick={() => setActiveTab('post')}
              className="btn-success flex items-center text-sm"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Complete
            </button>
          )}
          {user?.role === 'doctor' && (
            <span className="text-xs text-gray-500 hidden sm:inline">View only — nurses record vitals</span>
          )}
          {user?.role === 'patient' && (
            <span className="text-xs text-gray-500 hidden sm:inline">Your session (read-only)</span>
          )}
        </div>
      </div>

      {/* Session Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center space-x-3">
            <Calendar className="h-5 w-5 text-primary-600" />
            <div>
              <p className="text-sm text-gray-500">Date</p>
              <p className="font-medium text-gray-900">{session.scheduled_date}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center space-x-3">
            <Clock className="h-5 w-5 text-primary-600" />
            <div>
              <p className="text-sm text-gray-500">Time</p>
              <p className="font-medium text-gray-900">{session.scheduled_time}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center space-x-3">
            <UserCheck className="h-5 w-5 text-primary-600" />
            <div>
              <p className="text-sm text-gray-500">Doctor</p>
              <p className="font-medium text-gray-900">{session.doctor_name || 'Unassigned'}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center space-x-3">
            <HeartPulse className="h-5 w-5 text-primary-600" />
            <div>
              <p className="text-sm text-gray-500">Nurse</p>
              <p className="font-medium text-gray-900">{session.nurse_name || 'Unassigned'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      {canEdit && (
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {['details', 'pre', 'post'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 text-sm font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'pre' ? 'Pre-Dialysis' : tab === 'post' ? 'Post-Dialysis' : 'Details'}
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Details Tab */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Pre-Dialysis Vitals</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">Weight</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {session.pre_weight ? `${session.pre_weight} kg` : 'Not recorded'}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">Blood Pressure</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {session.blood_pressure_before || 'Not recorded'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">Heart Rate</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {session.heart_rate_before ? `${session.heart_rate_before} bpm` : 'Not recorded'}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">Temperature</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {session.temperature ? `${session.temperature} °C` : 'Not recorded'}
                  </p>
                </div>
              </div>
              {session.access_site_condition && (
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">Access Site Condition</p>
                  <p className="text-gray-900">{session.access_site_condition}</p>
                </div>
              )}
              {session.heparin_dose && (
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">Heparin Dose</p>
                  <p className="text-gray-900">{session.heparin_dose}</p>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Post-Dialysis Vitals</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">Weight</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {session.post_weight ? `${session.post_weight} kg` : 'Not recorded'}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">Weight Loss</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {session.weight_gain ? `${session.weight_gain} kg` : 'Not recorded'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">Blood Pressure</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {session.blood_pressure_after || 'Not recorded'}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">Heart Rate</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {session.heart_rate_after ? `${session.heart_rate_after} bpm` : 'Not recorded'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">Fluid Removed</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {session.fluid_removed ? `${session.fluid_removed} L` : 'Not recorded'}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">KTV</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {session.kt_v || 'Not recorded'}
                  </p>
                </div>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500">Urea Reduction Ratio (URR)</p>
                <p className="text-lg font-semibold text-gray-900">
                  {session.urea_reduction_ratio ? `${session.urea_reduction_ratio}%` : 'Not recorded'}
                </p>
              </div>
            </div>
          </div>

          {session.complications && (
            <div className="card lg:col-span-2 border-red-200">
              <h3 className="text-lg font-semibold text-red-700 mb-2 flex items-center">
                <AlertCircle className="h-5 w-5 mr-2" />
                Complications
              </h3>
              <p className="text-gray-900">{session.complications}</p>
            </div>
          )}

          {session.notes && (
            <div className="card lg:col-span-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Notes</h3>
              <p className="text-gray-900">{session.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Pre-Dialysis Assessment Form */}
      {activeTab === 'pre' && canEdit && (
        <div className="card max-w-2xl">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pre-Dialysis Assessment</h3>
          <form onSubmit={handlePreAssessment} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Pre-Dialysis Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={preForm.pre_weight}
                  onChange={(e) => setPreForm({...preForm, pre_weight: e.target.value})}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="label">Blood Pressure</label>
                <input
                  type="text"
                  value={preForm.blood_pressure_before}
                  onChange={(e) => setPreForm({...preForm, blood_pressure_before: e.target.value})}
                  className="input-field"
                  placeholder="e.g., 140/90"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Heart Rate (bpm)</label>
                <input
                  type="number"
                  value={preForm.heart_rate_before}
                  onChange={(e) => setPreForm({...preForm, heart_rate_before: e.target.value})}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="label">Temperature (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={preForm.temperature}
                  onChange={(e) => setPreForm({...preForm, temperature: e.target.value})}
                  className="input-field"
                />
              </div>
            </div>
            <div>
              <label className="label">Access Site Condition</label>
              <select
                value={preForm.access_site_condition}
                onChange={(e) => setPreForm({...preForm, access_site_condition: e.target.value})}
                className="input-field"
              >
                <option value="">Select condition</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Poor">Poor</option>
                <option value="Infected">Infected</option>
                <option value="Thrombosed">Thrombosed</option>
              </select>
            </div>
            <div>
              <label className="label">Heparin Dose</label>
              <input
                type="text"
                value={preForm.heparin_dose}
                onChange={(e) => setPreForm({...preForm, heparin_dose: e.target.value})}
                className="input-field"
                placeholder="e.g., 1000 units bolus"
              />
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea
                value={preForm.notes}
                onChange={(e) => setPreForm({...preForm, notes: e.target.value})}
                className="input-field h-24"
                placeholder="Any additional observations..."
              />
            </div>
            <div className="flex justify-end">
              <button type="submit" className="btn-primary flex items-center">
                <Save className="h-4 w-4 mr-2" />
                Save & Start Session
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Post-Dialysis Assessment Form */}
      {activeTab === 'post' && canEdit && (
        <div className="card max-w-2xl">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Post-Dialysis Assessment</h3>
          <form onSubmit={handlePostAssessment} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Post-Dialysis Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={postForm.post_weight}
                  onChange={(e) => setPostForm({...postForm, post_weight: e.target.value})}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="label">Blood Pressure</label>
                <input
                  type="text"
                  value={postForm.blood_pressure_after}
                  onChange={(e) => setPostForm({...postForm, blood_pressure_after: e.target.value})}
                  className="input-field"
                  placeholder="e.g., 130/85"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Heart Rate (bpm)</label>
                <input
                  type="number"
                  value={postForm.heart_rate_after}
                  onChange={(e) => setPostForm({...postForm, heart_rate_after: e.target.value})}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="label">Fluid Removed (L)</label>
                <input
                  type="number"
                  step="0.1"
                  value={postForm.fluid_removed}
                  onChange={(e) => setPostForm({...postForm, fluid_removed: e.target.value})}
                  className="input-field"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Kt/V</label>
                <input
                  type="number"
                  step="0.01"
                  value={postForm.kt_v}
                  onChange={(e) => setPostForm({...postForm, kt_v: e.target.value})}
                  className="input-field"
                  placeholder="e.g., 1.4"
                />
              </div>
              <div>
                <label className="label">URR (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={postForm.urea_reduction_ratio}
                  onChange={(e) => setPostForm({...postForm, urea_reduction_ratio: e.target.value})}
                  className="input-field"
                  placeholder="e.g., 70"
                />
              </div>
            </div>
            <div>
              <label className="label">Complications</label>
              <select
                value={postForm.complications}
                onChange={(e) => setPostForm({...postForm, complications: e.target.value})}
                className="input-field"
              >
                <option value="">None</option>
                <option value="Hypotension">Hypotension</option>
                <option value="Muscle Cramps">Muscle Cramps</option>
                <option value="Nausea/Vomiting">Nausea/Vomiting</option>
                <option value="Headache">Headache</option>
                <option value="Chest Pain">Chest Pain</option>
                <option value="Fever/Chills">Fever/Chills</option>
                <option value="Access Site Bleeding">Access Site Bleeding</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea
                value={postForm.notes}
                onChange={(e) => setPostForm({...postForm, notes: e.target.value})}
                className="input-field h-24"
                placeholder="Session summary and recommendations..."
              />
            </div>
            <div className="flex justify-end">
              <button type="submit" className="btn-success flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                Complete Session
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default SessionDetail;
