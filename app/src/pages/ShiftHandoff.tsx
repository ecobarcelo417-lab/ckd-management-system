import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import ModalPortal from '../components/ModalPortal';
import {
  Plus, ClipboardList, CheckCircle, Clock, AlertTriangle,
  Users, ChevronDown, ChevronUp, Trash2, Send, Eye, RefreshCw, X
} from 'lucide-react';

interface HandoffSummary {
  id: number;
  from_nurse_id: number;
  to_nurse_id: number | null;
  from_nurse_name: string;
  to_nurse_name: string | null;
  shift_date: string;
  shift_type: string;
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
  acknowledged_by_name: string | null;
  created_at: string;
}

interface SbarPatient {
  patient_id: number;
  patient_name?: string;
  session_id?: number | null;
  acuity: 'stable' | 'watch' | 'critical';
  situation: string;
  background: string;
  assessment: string;
  recommendation: string;
}

interface FloorSnapshot {
  date: string;
  summary: {
    total: number;
    in_progress: number;
    completed: number;
    scheduled: number;
    with_complications: number;
  };
  in_progress: any[];
  completed: any[];
  with_complications: any[];
}

const emptyForm = {
  shift_date: new Date().toISOString().split('T')[0],
  shift_type: 'afternoon',
  to_nurse_id: '',
  unit_summary: '',
  patients_in_progress: '',
  completed_sessions_notes: '',
  complications_alerts: '',
  access_concerns: '',
  pending_tasks: '',
  medications_notes: '',
  equipment_notes: '',
  recommendations: '',
  census_count: '',
};

const ShiftHandoff: React.FC = () => {
  const { user } = useAuth();
  const isNurse = user?.role === 'nurse';
  const canCreate = user?.role === 'nurse' || user?.role === 'admin';

  const [handoffs, setHandoffs] = useState<HandoffSummary[]>([]);
  const [pending, setPending] = useState<HandoffSummary[]>([]);
  const [nurses, setNurses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [sbarPatients, setSbarPatients] = useState<SbarPatient[]>([]);
  const [snapshot, setSnapshot] = useState<FloorSnapshot | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'sent'>('all');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [listRes, pendingRes, nursesRes] = await Promise.all([
        axios.get('/api/handoffs'),
        axios.get('/api/handoffs/pending'),
        axios.get('/api/nurses'),
      ]);
      setHandoffs(listRes.data);
      setPending(pendingRes.data);
      setNurses(nursesRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openCreateForm = async () => {
    setForm({ ...emptyForm });
    setSbarPatients([]);
    setShowForm(true);
    try {
      const res = await axios.get('/api/handoffs/floor-snapshot');
      setSnapshot(res.data);
      const s = res.data;
      // Prefill from floor
      const inProgNames = (s.in_progress || []).map((x: any) => x.patient_name).join(', ');
      const completedNotes = (s.completed || [])
        .map((x: any) => `${x.patient_name}: Kt/V ${x.kt_v ?? '—'}, UF ${x.fluid_removed ?? '—'}L`)
        .join('\n');
      const compNotes = (s.with_complications || [])
        .map((x: any) => `${x.patient_name}: ${x.complications}`)
        .join('\n');

      setForm((f) => ({
        ...f,
        census_count: String(s.summary?.total ?? ''),
        patients_in_progress: inProgNames || f.patients_in_progress,
        completed_sessions_notes: completedNotes || f.completed_sessions_notes,
        complications_alerts: compNotes || f.complications_alerts,
        unit_summary: `Floor census ${s.summary?.total ?? 0}: ${s.summary?.in_progress ?? 0} in progress, ${s.summary?.completed ?? 0} completed, ${s.summary?.scheduled ?? 0} still scheduled.`,
      }));

      // Seed SBAR rows for in-progress / watch patients
      const seed: SbarPatient[] = (s.in_progress || []).map((x: any) => ({
        patient_id: x.patient_id,
        patient_name: x.patient_name,
        session_id: x.id,
        acuity: x.complications ? 'watch' : 'stable',
        situation: `In-progress dialysis (session #${x.id})`,
        background: `Access: ${x.access_site_condition || 'not noted'}; machine ${x.machine_id || '—'}`,
        assessment: x.complications || 'Stable so far',
        recommendation: 'Continue monitoring; complete post-assessment before end of treatment',
      }));
      setSbarPatients(seed);
    } catch (e) {
      console.error('Floor snapshot failed', e);
      setSnapshot(null);
    }
  };

  const addSbarRow = () => {
    setSbarPatients((rows) => [
      ...rows,
      {
        patient_id: 0,
        patient_name: '',
        session_id: null,
        acuity: 'stable',
        situation: '',
        background: '',
        assessment: '',
        recommendation: '',
      },
    ]);
  };

  const updateSbar = (index: number, patch: Partial<SbarPatient>) => {
    setSbarPatients((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const removeSbar = (index: number) => {
    setSbarPatients((rows) => rows.filter((_, i) => i !== index));
  };

  const handleSave = async (submit: boolean) => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        to_nurse_id: form.to_nurse_id ? Number(form.to_nurse_id) : null,
        census_count: form.census_count ? Number(form.census_count) : null,
        status: submit ? 'submitted' : 'draft',
        patients: sbarPatients
          .filter((p) => p.patient_id)
          .map(({ patient_id, session_id, acuity, situation, background, assessment, recommendation }) => ({
            patient_id,
            session_id,
            acuity,
            situation,
            background,
            assessment,
            recommendation,
          })),
      };
      await axios.post('/api/handoffs', payload);
      setShowForm(false);
      await loadAll();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to save handoff');
    } finally {
      setSaving(false);
    }
  };

  const handleAcknowledge = async (id: number) => {
    try {
      await axios.put(`/api/handoffs/${id}/acknowledge`);
      await loadAll();
      if (expandedId === id) {
        const res = await axios.get(`/api/handoffs/${id}`);
        setDetail(res.data);
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to acknowledge');
    }
  };

  const handleSubmitDraft = async (id: number) => {
    try {
      await axios.put(`/api/handoffs/${id}/submit`);
      await loadAll();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to submit');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this draft handoff?')) return;
    try {
      await axios.delete(`/api/handoffs/${id}`);
      await loadAll();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete');
    }
  };

  const toggleExpand = async (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(id);
    try {
      const res = await axios.get(`/api/handoffs/${id}`);
      setDetail(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'acknowledged': return 'badge-green';
      case 'submitted': return 'badge-yellow';
      default: return 'badge-gray';
    }
  };

  const acuityBadge = (acuity: string) => {
    switch (acuity) {
      case 'critical': return 'badge-red';
      case 'watch': return 'badge-yellow';
      default: return 'badge-green';
    }
  };

  const displayed = (() => {
    if (filter === 'pending') return pending;
    if (filter === 'sent') {
      return handoffs.filter((h) =>
        // for nurse, list already scoped; show submitted/acknowledged from me preferentially
        h.status !== 'draft' || true
      );
    }
    return handoffs;
  })();

  // Patient options from snapshot sessions for SBAR picker
  const patientOptions = snapshot
    ? Array.from(
        new Map(
          [...(snapshot.in_progress || []), ...(snapshot.completed || [])].map((s: any) => [
            s.patient_id,
            { id: s.patient_id, name: s.patient_name, session_id: s.id },
          ])
        ).values()
      )
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-semibold text-gray-900 tracking-tight">
            Shift Handoff
          </h1>
          <p className="text-gray-500 mt-1">
            Structured nurse-to-nurse handoff for dialysis unit continuity of care
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadAll} className="btn-secondary flex items-center text-sm" title="Refresh">
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </button>
          {canCreate && (
            <button onClick={openCreateForm} className="btn-primary flex items-center">
              <Plus className="h-4 w-4 mr-2" />
              New Handoff
            </button>
          )}
        </div>
      </div>

      {/* Protocol reminder */}
      <div className="card p-4 bg-leaf-50 border border-leaf-100">
        <h3 className="font-semibold text-leaf-800 mb-1 flex items-center">
          <ClipboardList className="h-4 w-4 mr-2" />
          Handoff protocol
        </h3>
        <ol className="text-sm text-leaf-700 list-decimal list-inside space-y-0.5">
          <li>Outgoing nurse completes unit summary and per-patient SBAR for watch/critical cases.</li>
          <li>Submit handoff before leaving the unit; optionally assign the incoming nurse.</li>
          <li>Incoming nurse reviews, asks clarifying questions as needed, then <strong>acknowledges</strong>.</li>
          <li>Handoff is closed only after acknowledgment — verbal + written required.</li>
        </ol>
      </div>

      {/* Pending banner */}
      {pending.length > 0 && (
        <div className="card-static p-4 border border-amber-200 bg-amber-50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-amber-900">
                {pending.length} handoff{pending.length > 1 ? 's' : ''} awaiting acknowledgment
              </p>
              <ul className="mt-2 space-y-2">
                {pending.map((h) => (
                  <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="text-amber-800">
                      From <strong>{h.from_nurse_name}</strong> · {h.shift_type} shift · {h.shift_date}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleExpand(h.id)}
                        className="btn-secondary text-xs py-1 px-2 flex items-center"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" /> Review
                      </button>
                      {isNurse && (
                        <button
                          onClick={() => handleAcknowledge(h.id)}
                          className="btn-primary text-xs py-1 px-2 flex items-center"
                        >
                          <CheckCircle className="h-3.5 w-3.5 mr-1" /> Acknowledge
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'pending', 'sent'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize ${
              filter === f
                ? 'bg-skyglow-100 text-skyglow-800'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f === 'all' ? 'All handoffs' : f === 'pending' ? 'Pending ack' : 'History'}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {displayed.length === 0 ? (
          <div className="card p-12 text-center text-gray-500">
            <ClipboardList className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p>No shift handoffs yet.</p>
            {canCreate && (
              <p className="text-sm mt-1">Create one at the end of your shift using “New Handoff”.</p>
            )}
          </div>
        ) : (
          displayed.map((h) => (
            <div key={h.id} className="card overflow-hidden">
              <button
                type="button"
                onClick={() => toggleExpand(h.id)}
                className="w-full p-4 sm:p-5 flex items-start justify-between gap-3 text-left hover:bg-gray-50/80"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`badge ${statusBadge(h.status)} capitalize`}>{h.status}</span>
                    <span className="text-sm font-medium text-gray-900 capitalize">{h.shift_type} shift</span>
                    <span className="text-sm text-gray-500">{h.shift_date}</span>
                    {h.census_count != null && (
                      <span className="inline-flex items-center text-xs text-gray-500">
                        <Users className="h-3 w-3 mr-1" /> {h.census_count}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">{h.from_nurse_name}</span>
                    {' → '}
                    <span className="font-medium">{h.to_nurse_name || 'Any incoming nurse'}</span>
                  </p>
                  {h.unit_summary && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{h.unit_summary}</p>
                  )}
                </div>
                {expandedId === h.id ? (
                  <ChevronUp className="h-5 w-5 text-gray-400 shrink-0" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400 shrink-0" />
                )}
              </button>

              {expandedId === h.id && detail && detail.id === h.id && (
                <div className="border-t border-gray-100 p-4 sm:p-5 space-y-4 bg-gray-50/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {[
                      ['Unit summary', detail.unit_summary],
                      ['Patients in progress', detail.patients_in_progress],
                      ['Completed sessions', detail.completed_sessions_notes],
                      ['Complications / alerts', detail.complications_alerts],
                      ['Access concerns', detail.access_concerns],
                      ['Pending tasks', detail.pending_tasks],
                      ['Medications', detail.medications_notes],
                      ['Equipment', detail.equipment_notes],
                      ['Recommendations', detail.recommendations],
                    ].map(([label, value]) =>
                      value ? (
                        <div key={label as string} className="bg-white rounded-xl p-3 border border-gray-100">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                            {label}
                          </p>
                          <p className="text-gray-800 whitespace-pre-wrap">{value}</p>
                        </div>
                      ) : null
                    )}
                  </div>

                  {detail.patients?.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Patient SBAR</h4>
                      <div className="space-y-3">
                        {detail.patients.map((p: any) => (
                          <div key={p.id} className="bg-white rounded-xl p-4 border border-gray-100">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium text-gray-900">{p.patient_name}</span>
                              <span className={`badge ${acuityBadge(p.acuity)} capitalize`}>{p.acuity}</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                              {p.situation && (
                                <p><span className="text-gray-500 font-medium">S:</span> {p.situation}</p>
                              )}
                              {p.background && (
                                <p><span className="text-gray-500 font-medium">B:</span> {p.background}</p>
                              )}
                              {p.assessment && (
                                <p><span className="text-gray-500 font-medium">A:</span> {p.assessment}</p>
                              )}
                              {p.recommendation && (
                                <p><span className="text-gray-500 font-medium">R:</span> {p.recommendation}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {detail.status === 'submitted' && isNurse && detail.from_nurse_id !== user?.nurse_id && (
                      <button
                        onClick={() => handleAcknowledge(detail.id)}
                        className="btn-primary text-sm flex items-center"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Acknowledge receipt
                      </button>
                    )}
                    {detail.status === 'draft' && canCreate && (
                      <>
                        <button
                          onClick={() => handleSubmitDraft(detail.id)}
                          className="btn-primary text-sm flex items-center"
                        >
                          <Send className="h-4 w-4 mr-1" />
                          Submit
                        </button>
                        <button
                          onClick={() => handleDelete(detail.id)}
                          className="btn-secondary text-sm flex items-center text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete draft
                        </button>
                      </>
                    )}
                    {detail.status === 'acknowledged' && (
                      <p className="text-sm text-green-700 flex items-center">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Acknowledged
                        {detail.acknowledged_by_name ? ` by ${detail.acknowledged_by_name}` : ''}
                        {detail.acknowledged_at ? ` · ${new Date(detail.acknowledged_at).toLocaleString()}` : ''}
                      </p>
                    )}
                    {detail.submitted_at && detail.status !== 'draft' && (
                      <p className="text-xs text-gray-400 flex items-center ml-auto">
                        <Clock className="h-3.5 w-3.5 mr-1" />
                        Submitted {new Date(detail.submitted_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create modal */}
      {showForm && (
        <ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/10 backdrop-blur-[2px]" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-2xl ring-1 ring-gray-200 w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">New shift handoff</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Prefills from today’s floor when available. Complete SBAR for any patient needing extra attention.
                </p>
                {snapshot && (
                  <div className="mt-3 flex flex-wrap gap-3 text-xs">
                    <span className="px-2 py-1 rounded-full bg-gray-100">Census {snapshot.summary.total}</span>
                    <span className="px-2 py-1 rounded-full bg-skyglow-50 text-skyglow-800">
                      In progress {snapshot.summary.in_progress}
                    </span>
                    <span className="px-2 py-1 rounded-full bg-green-50 text-green-800">
                      Completed {snapshot.summary.completed}
                    </span>
                    <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-800">
                      Complications {snapshot.summary.with_complications}
                    </span>
                  </div>
                )}
              </div>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 ml-4 flex-shrink-0">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Shift date *</label>
                  <input
                    type="date"
                    required
                    value={form.shift_date}
                    onChange={(e) => setForm({ ...form, shift_date: e.target.value })}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Shift type *</label>
                  <select
                    value={form.shift_type}
                    onChange={(e) => setForm({ ...form, shift_type: e.target.value })}
                    className="input w-full"
                  >
                    <option value="morning">Morning</option>
                    <option value="afternoon">Afternoon</option>
                    <option value="night">Night</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Incoming nurse</label>
                  <select
                    value={form.to_nurse_id}
                    onChange={(e) => setForm({ ...form, to_nurse_id: e.target.value })}
                    className="input w-full"
                  >
                    <option value="">Any / unassigned</option>
                    {nurses.map((n: any) => (
                      <option key={n.id} value={n.id}>{n.full_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit summary</label>
                <textarea
                  rows={2}
                  value={form.unit_summary}
                  onChange={(e) => setForm({ ...form, unit_summary: e.target.value })}
                  className="input w-full"
                  placeholder="Overall unit status, staffing, throughput..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(
                  [
                    ['patients_in_progress', 'Patients still on machine'],
                    ['completed_sessions_notes', 'Completed sessions notes'],
                    ['complications_alerts', 'Complications / alerts'],
                    ['access_concerns', 'Access concerns'],
                    ['pending_tasks', 'Pending tasks for next shift'],
                    ['medications_notes', 'Medications given / due'],
                    ['equipment_notes', 'Equipment / machine notes'],
                    ['recommendations', 'Recommendations for next shift'],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                    <textarea
                      rows={2}
                      value={(form as any)[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      className="input w-full"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Census count</label>
                <input
                  type="number"
                  min="0"
                  value={form.census_count}
                  onChange={(e) => setForm({ ...form, census_count: e.target.value })}
                  className="input w-40"
                />
              </div>

              {/* SBAR patients */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">Patient SBAR (watch / critical)</h3>
                  <button type="button" onClick={addSbarRow} className="text-sm text-skyglow-700 hover:underline">
                    + Add patient
                  </button>
                </div>
                {sbarPatients.length === 0 && (
                  <p className="text-sm text-gray-500">No patient rows yet. Add any who need focused handoff.</p>
                )}
                <div className="space-y-4">
                  {sbarPatients.map((row, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-xl p-4 space-y-3">
                      <div className="flex flex-wrap gap-3 items-end">
                        <div className="flex-1 min-w-[140px]">
                          <label className="block text-xs font-medium text-gray-500 mb-1">Patient</label>
                          {patientOptions.length > 0 ? (
                            <select
                              value={row.patient_id || ''}
                              onChange={(e) => {
                                const id = Number(e.target.value);
                                const opt = patientOptions.find((o: any) => o.id === id);
                                updateSbar(idx, {
                                  patient_id: id,
                                  patient_name: opt?.name,
                                  session_id: opt?.session_id,
                                });
                              }}
                              className="input w-full"
                            >
                              <option value="">Select…</option>
                              {patientOptions.map((o: any) => (
                                <option key={o.id} value={o.id}>{o.name}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="number"
                              placeholder="Patient ID"
                              value={row.patient_id || ''}
                              onChange={(e) => updateSbar(idx, { patient_id: Number(e.target.value) })}
                              className="input w-full"
                            />
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Acuity</label>
                          <select
                            value={row.acuity}
                            onChange={(e) => updateSbar(idx, { acuity: e.target.value as any })}
                            className="input"
                          >
                            <option value="stable">Stable</option>
                            <option value="watch">Watch</option>
                            <option value="critical">Critical</option>
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSbar(idx)}
                          className="p-2 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(
                          [
                            ['situation', 'Situation'],
                            ['background', 'Background'],
                            ['assessment', 'Assessment'],
                            ['recommendation', 'Recommendation'],
                          ] as const
                        ).map(([key, label]) => (
                          <div key={key}>
                            <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                            <textarea
                              rows={2}
                              value={row[key]}
                              onChange={(e) => updateSbar(idx, { [key]: e.target.value })}
                              className="input w-full text-sm"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex flex-wrap justify-end gap-3 sticky bottom-0 bg-white">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary" disabled={saving}>
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSave(false)}
                className="btn-secondary"
                disabled={saving}
              >
                Save draft
              </button>
              <button
                type="button"
                onClick={() => handleSave(true)}
                className="btn-primary flex items-center"
                disabled={saving}
              >
                <Send className="h-4 w-4 mr-1" />
                {saving ? 'Saving…' : 'Submit handoff'}
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default ShiftHandoff;
