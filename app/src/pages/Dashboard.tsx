import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import StatCard from '../components/StatCard';
import DialysisOrb from '../components/DialysisOrb';
import SessionsTrendChart from '../components/SessionsTrendChart';
import {
  Users,
  UserCheck,
  HeartPulse,
  Droplets,
  Calendar,
  Activity,
  Clock,
  ChevronRight,
  FlaskConical,
  Pill,
  Gauge,
  ClipboardList,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { DialysisSession, DashboardStats } from '../types';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

const STATUS_COLORS: Record<string, string> = {
  completed: '#6e6e6e',
  in_progress: '#454545',
  scheduled: '#969696',
  cancelled: '#1c1c1c',
  missed: '#c2c2c2',
};

const ROLE_COLORS = ['#4a4a4a', '#8a8a8a', '#c4c4c4'];

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white px-3 py-2 rounded-xl shadow-premium-lg border border-gray-200 text-xs">
      {label && <p className="font-semibold text-gray-700 mb-1 capitalize">{String(label).replace('_', ' ')}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || p.fill }} className="font-mono font-semibold">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [user?.role]);

  const fetchDashboardData = async () => {
    try {
      let endpoint = '/api/dashboard/stats';
      if (user?.role === 'patient') endpoint = '/api/dashboard/patient';
      else if (user?.role === 'doctor') endpoint = '/api/dashboard/doctor';
      else if (user?.role === 'nurse') endpoint = '/api/dashboard/nurse';

      const response = await axios.get(endpoint);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
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
        <div className="relative h-14 w-14">
          <div className="absolute inset-0 rounded-full border-4 border-skyglow-100"></div>
          <div className="absolute inset-0 rounded-full border-4 border-skyglow-500 border-t-transparent animate-spin"></div>
        </div>
      </div>
    );
  }

  // Admin Dashboard
  if (user?.role === 'admin') {
    const statusChartData = (stats?.todayStatus || []).map((s) => ({
      status: s.status,
      count: s.count,
      fill: STATUS_COLORS[s.status] || '#8a8a8a',
    }));

    const staffData = [
      { name: 'Patients', value: stats?.totalPatients || 0 },
      { name: 'Doctors', value: stats?.totalDoctors || 0 },
      { name: 'Nurses', value: stats?.totalNurses || 0 },
    ];

    return (
      <motion.div initial="hidden" animate="visible" variants={fadeUp} transition={{ duration: 0.4 }} className="space-y-6">
        <div className="page-header">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">Overview of the CKD Management System</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard index={0} label="Total Patients" value={stats?.totalPatients || 0} icon={Users} accent="blue" />
          <StatCard index={1} label="Doctors" value={stats?.totalDoctors || 0} icon={UserCheck} accent="green" />
          <StatCard index={2} label="Nurses" value={stats?.totalNurses || 0} icon={HeartPulse} accent="purple" />
          <StatCard
            index={3}
            label="Today's Sessions"
            value={Number(stats?.todaySessions) || 0}
            icon={Droplets}
            accent="yellow"
            trendValue={stats?.weekOverWeekChange}
            trendLabel="vs last week"
          />
        </div>

        {/* Trend + 3D Clearance Monitor */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card p-5 lg:col-span-2 animate-fade-in-up">
            <div className="flex items-center justify-between mb-1">
              <h3 className="section-title">Session Volume Trend</h3>
              <span
                className={
                  (stats?.weekOverWeekChange || 0) >= 0 ? 'trend-up' : 'trend-down'
                }
              >
                {(stats?.weekOverWeekChange || 0) >= 0 ? '+' : ''}
                {stats?.weekOverWeekChange || 0}% completed sessions
              </span>
            </div>
            <p className="text-sm text-gray-400 mb-2">Daily dialysis session volume, last 14 days</p>
            {stats?.sessionsTrend && stats.sessionsTrend.length > 0 ? (
              <SessionsTrendChart data={stats.sessionsTrend} />
            ) : (
              <p className="text-gray-400 text-center py-10">Not enough recent data to chart a trend yet</p>
            )}
          </div>

          <div className="card p-5 glow-panel animate-fade-in-up" style={{ animationDelay: '80ms' }}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="section-title flex items-center gap-1.5">
                <Gauge className="h-4 w-4 text-skyglow-500" />
                Kt/V Clearance
              </h3>
              <span className={(stats?.avgKtvChange || 0) >= 0 ? 'trend-up' : 'trend-down'}>
                {(stats?.avgKtvChange || 0) >= 0 ? '+' : ''}
                {stats?.avgKtvChange || 0}%
              </span>
            </div>
            <p className="text-sm text-gray-400 mb-1">30-day average dialysis adequacy</p>
            <div className="h-[170px] -mx-2 cursor-grab active:cursor-grabbing">
              <DialysisOrb
                color={(stats?.avgKtv || 0) >= 1.2 ? '#606060' : '#707070'}
                secondaryColor="#686868"
              />
            </div>
            <p className="text-center text-2xl font-semibold text-gray-900 -mt-2">
              {stats?.avgKtv || 0} <span className="text-sm font-normal text-gray-400">avg Kt/V</span>
            </p>
          </div>
        </div>

        {/* Graphs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card p-5 lg:col-span-2 animate-fade-in-up">
            <h3 className="section-title mb-1">Today's Session Status</h3>
            <p className="text-sm text-gray-400 mb-4">Live breakdown of dialysis sessions scheduled today</p>
            {statusChartData.length > 0 ? (
              <div className="[&_.recharts-rectangle]:drop-shadow-[0_6px_10px_rgba(20,20,20,0.10)]">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={statusChartData} barSize={42}>
                    <defs>
                      {statusChartData.map((entry, i) => (
                        <linearGradient key={i} id={`barGrad-${i}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={entry.fill} stopOpacity={1} />
                          <stop offset="100%" stopColor={entry.fill} stopOpacity={0.62} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 6" stroke="#e5e5e5" vertical={false} />
                    <XAxis
                      dataKey="status"
                      tickFormatter={(v) => String(v).replace('_', ' ')}
                      tick={{ fontSize: 12, fill: '#8a8a8a', fontFamily: 'IBM Plex Sans' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#8a8a8a' }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(60,60,60,0.06)' }} content={<ChartTooltip />} />
                    <Bar
                      dataKey="count"
                      name="Sessions"
                      radius={[8, 8, 0, 0]}
                      animationDuration={900}
                      animationEasing="ease-out"
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`url(#barGrad-${index})`} stroke={entry.fill} strokeWidth={1} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-gray-400 text-center py-16">No sessions scheduled for today</p>
            )}
          </div>

          <div className="card p-5 animate-fade-in-up" style={{ animationDelay: '80ms' }}>
            <h3 className="section-title mb-1">Care Team Mix</h3>
            <p className="text-sm text-gray-400 mb-2">Patients vs. clinical staff</p>
            <div className="relative [&_.recharts-sector]:drop-shadow-[0_4px_8px_rgba(20,20,20,0.14)]">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={staffData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    cornerRadius={8}
                    animationDuration={900}
                    animationEasing="ease-out"
                  >
                    {staffData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={ROLE_COLORS[index % ROLE_COLORS.length]} stroke="#fff" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend
                    iconType="circle"
                    formatter={(value) => <span className="text-xs text-gray-600">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center -mt-6">
                <span className="text-2xl font-display font-semibold text-gray-900">
                  {(stats?.totalPatients || 0) + (stats?.totalDoctors || 0) + (stats?.totalNurses || 0)}
                </span>
                <span className="text-[11px] uppercase tracking-wide text-gray-400">People</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Sessions */}
        <div className="card animate-fade-in-up" style={{ animationDelay: '120ms' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title">Recent Dialysis Sessions</h3>
            <Link to="/dialysis" className="text-skyglow-600 hover:text-skyglow-700 text-sm font-semibold flex items-center group">
              View All <ChevronRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr>
                  <th className="table-header">Patient</th>
                  <th className="table-header">Date</th>
                  <th className="table-header">Time</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stats?.recentSessions?.map((session: DialysisSession) => (
                  <tr key={session.id} className="table-row-hover">
                    <td className="table-cell font-semibold text-gray-900">{session.patient_name}</td>
                    <td className="table-cell font-mono">{session.scheduled_date}</td>
                    <td className="table-cell font-mono">{session.scheduled_time}</td>
                    <td className="table-cell">
                      <span className={`badge ${getStatusBadge(session.status)}`}>
                        {session.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="table-cell">
                      <Link to={`/dialysis/${session.id}`} className="text-skyglow-600 hover:text-skyglow-700 font-semibold">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
                {(!stats?.recentSessions || stats.recentSessions.length === 0) && (
                  <tr>
                    <td colSpan={5} className="table-cell text-center text-gray-400 py-8">
                      No recent sessions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    );
  }

  // Doctor Dashboard
  if (user?.role === 'doctor') {
    return (
      <motion.div initial="hidden" animate="visible" variants={fadeUp} transition={{ duration: 0.4 }} className="space-y-6">
        <div className="page-header">
          <div>
            <h1 className="page-title">Doctor Dashboard</h1>
            <p className="page-subtitle">Welcome back, Dr. {user?.full_name}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard index={0} label="My Patients" value={stats?.totalPatients || 0} icon={Users} accent="blue" />
          <StatCard index={1} label="Today's Sessions" value={stats?.todaySessions?.length || 0} icon={Calendar} accent="yellow" />
          <StatCard index={2} label="Pending Reviews" value={stats?.recentLabs?.length || 0} icon={Activity} accent="purple" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card animate-fade-in-up">
            <h3 className="section-title mb-4">Today's Sessions</h3>
            <div className="space-y-3">
              {stats?.todaySessions?.map((session: DialysisSession) => (
                <div key={session.id} className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl hover:bg-skyglow-50/60 transition-colors duration-150">
                  <div>
                    <p className="font-semibold text-gray-900">{session.patient_name}</p>
                    <p className="text-sm text-gray-500 font-mono">{session.scheduled_time} | {session.status}</p>
                  </div>
                  <Link to={`/dialysis/${session.id}`} className="text-skyglow-600 hover:text-skyglow-700 text-sm font-semibold">
                    View
                  </Link>
                </div>
              ))}
              {(!stats?.todaySessions || stats.todaySessions.length === 0) && (
                <p className="text-gray-400 text-center py-4">No sessions scheduled for today</p>
              )}
            </div>
          </div>

          <div className="card animate-fade-in-up" style={{ animationDelay: '80ms' }}>
            <h3 className="section-title mb-4">Recent Lab Results</h3>
            <div className="space-y-3">
              {stats?.recentLabs?.slice(0, 5).map((lab: any) => (
                <div key={lab.id} className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl hover:bg-leaf-50/60 transition-colors duration-150">
                  <div>
                    <p className="font-semibold text-gray-900">{lab.patient_name}</p>
                    <p className="text-sm text-gray-500 font-mono">{lab.test_date}</p>
                  </div>
                  <Link to={`/lab-results`} className="text-skyglow-600 hover:text-skyglow-700 text-sm font-semibold">
                    Review
                  </Link>
                </div>
              ))}
              {(!stats?.recentLabs || stats.recentLabs.length === 0) && (
                <p className="text-gray-400 text-center py-4">No recent lab results</p>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Nurse Dashboard
  if (user?.role === 'nurse') {
    return (
      <motion.div initial="hidden" animate="visible" variants={fadeUp} transition={{ duration: 0.4 }} className="space-y-6">
        <div className="page-header">
          <div>
            <h1 className="page-title">Nurse Dashboard</h1>
            <p className="page-subtitle">Welcome back, {user?.full_name}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StatCard index={0} label="Today's Sessions" value={stats?.todaySessions?.length || 0} icon={Calendar} accent="yellow" />
          <StatCard index={1} label="In Progress" value={stats?.inProgressSessions?.length || 0} icon={Clock} accent="blue" />
        </div>

        <div className="card p-4 border border-leaf-100 bg-leaf-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-leaf-100 flex items-center justify-center shrink-0">
              <ClipboardList className="h-5 w-5 text-leaf-700" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Shift handoff protocol</p>
              <p className="text-sm text-gray-600">Document unit status and patient SBAR before leaving. Acknowledge incoming handoffs at shift start.</p>
            </div>
          </div>
          <Link to="/handoffs" className="btn-primary text-sm whitespace-nowrap self-start sm:self-center">
            Open handoffs
          </Link>
        </div>

        <div className="card animate-fade-in-up">
          <h3 className="section-title mb-4">Today's Assigned Sessions</h3>
          <div className="space-y-3">
            {stats?.todaySessions?.map((session: DialysisSession) => (
              <div key={session.id} className={`flex items-center justify-between p-4 rounded-xl border ${
                session.status === 'in_progress' ? 'border-skyglow-200 bg-skyglow-50/60' : 'border-gray-100 bg-gray-50'
              }`}>
                <div className="flex items-center space-x-4">
                  <div className={`h-3 w-3 rounded-full ${
                    session.status === 'completed' ? 'bg-leaf-500' :
                    session.status === 'in_progress' ? 'bg-skyglow-500' :
                    session.status === 'scheduled' ? 'bg-sunbeam-500' : 'bg-gray-400'
                  }`} />
                  <div>
                    <p className="font-semibold text-gray-900">{session.patient_name}</p>
                    <p className="text-sm text-gray-500 font-mono">{session.scheduled_time} | Machine: {session.machine_id || 'TBD'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`badge ${getStatusBadge(session.status)}`}>
                    {session.status.replace('_', ' ')}
                  </span>
                  <Link to={`/dialysis/${session.id}`} className="btn-primary text-sm py-1.5 px-3">
                    Manage
                  </Link>
                </div>
              </div>
            ))}
            {(!stats?.todaySessions || stats.todaySessions.length === 0) && (
              <p className="text-gray-400 text-center py-4">No sessions assigned for today</p>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // Patient Dashboard
  return (
    <motion.div initial="hidden" animate="visible" variants={fadeUp} transition={{ duration: 0.4 }} className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Dashboard</h1>
          <p className="page-subtitle">Welcome back, {user?.full_name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard index={0} label="Upcoming Sessions" value={stats?.upcomingSessions?.length || 0} icon={Calendar} accent="blue" />
        <StatCard index={1} label="Recent Labs" value={stats?.recentLabs?.length || 0} icon={FlaskConical} accent="green" />
        <StatCard index={2} label="Active Medications" value={stats?.activePrescriptions?.length || 0} icon={Pill} accent="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card animate-fade-in-up">
          <h3 className="section-title mb-4">Upcoming Dialysis Sessions</h3>
          <div className="space-y-3">
            {stats?.upcomingSessions?.map((session: DialysisSession) => (
              <div key={session.id} className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl hover:bg-skyglow-50/60 transition-colors duration-150">
                <div>
                  <p className="font-semibold text-gray-900">{session.scheduled_date}</p>
                  <p className="text-sm text-gray-500 font-mono">{session.scheduled_time} | Duration: {session.duration_minutes} min</p>
                </div>
                <span className={`badge ${getStatusBadge(session.status)}`}>
                  {session.status.replace('_', ' ')}
                </span>
              </div>
            ))}
            {(!stats?.upcomingSessions || stats.upcomingSessions.length === 0) && (
              <p className="text-gray-400 text-center py-4">No upcoming sessions scheduled</p>
            )}
          </div>
        </div>

        <div className="card animate-fade-in-up" style={{ animationDelay: '80ms' }}>
          <h3 className="section-title mb-4">Active Prescriptions</h3>
          <div className="space-y-3">
            {stats?.activePrescriptions?.map((prescription: any) => (
              <div key={prescription.id} className="p-3.5 bg-gray-50 rounded-xl hover:bg-leaf-50/60 transition-colors duration-150">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-gray-900">{prescription.medication_name}</p>
                  <span className="badge-green">{prescription.status}</span>
                </div>
                <p className="text-sm text-gray-500">{prescription.dosage} | {prescription.frequency}</p>
                <p className="text-xs text-gray-400">Prescribed by: {prescription.doctor_name}</p>
              </div>
            ))}
            {(!stats?.activePrescriptions || stats.activePrescriptions.length === 0) && (
              <p className="text-gray-400 text-center py-4">No active prescriptions</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Dashboard;
