import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  BarChart3, TrendingUp, Users, Droplets, Filter
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart
} from 'recharts';
import StatCard from '../components/StatCard';

const Reports: React.FC = () => {
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    start_date: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchStats();
  }, [dateRange]);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/reports/dialysis-stats', {
        params: dateRange
      });
      setStats(response.data);
    } catch (err: any) {
      console.error('Failed to fetch stats:', err);
      setError(err.response?.data?.error || 'Failed to load reports. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#3a3a3a', '#242424', '#8a8a8a', '#5a5a5a', '#7a7a7a'];

  const sessionStatusData = stats.reduce((acc: any, day: any) => {
    acc.completed = (acc.completed || 0) + (day.completed || 0);
    acc.cancelled = (acc.cancelled || 0) + (day.cancelled || 0);
    acc.missed = (acc.missed || 0) + (day.missed || 0);
    return acc;
  }, {});

  const pieData = [
    { name: 'Completed', value: sessionStatusData.completed || 0 },
    { name: 'Cancelled', value: sessionStatusData.cancelled || 0 },
    { name: 'Missed', value: sessionStatusData.missed || 0 },
  ].filter(d => d.value > 0);

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
          <h1 className="text-2xl sm:text-3xl font-display font-semibold text-gray-900 tracking-tight">Reports & Analytics</h1>
          <p className="text-gray-500">Dialysis session statistics and trends</p>
        </div>
      </div>

      {error && (
        <div className="card bg-red-50 border border-red-200 text-red-700 px-4 py-3">
          {error}
        </div>
      )}

      {/* Date Filter */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div>
            <label className="label">Start Date</label>
            <input
              type="date"
              value={dateRange.start_date}
              onChange={(e) => setDateRange({...dateRange, start_date: e.target.value})}
              className="input-field"
            />
          </div>
          <div>
            <label className="label">End Date</label>
            <input
              type="date"
              value={dateRange.end_date}
              onChange={(e) => setDateRange({...dateRange, end_date: e.target.value})}
              className="input-field"
            />
          </div>
          <button
            onClick={fetchStats}
            className="btn-primary flex items-center"
          >
            <Filter className="h-4 w-4 mr-2" />
            Apply Filter
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          index={0}
          label="Total Sessions"
          value={stats.reduce((sum, d) => sum + (d.total_sessions || 0), 0)}
          icon={Droplets}
          accent="blue"
        />
        <StatCard
          index={1}
          label="Completed"
          value={stats.reduce((sum, d) => sum + (d.completed || 0), 0)}
          icon={TrendingUp}
          accent="green"
        />
        <StatCard
          index={2}
          label="Avg Fluid Removed"
          value={stats.reduce((sum, d) => sum + (d.avg_fluid_removed || 0), 0) / (stats.length || 1)}
          icon={BarChart3}
          accent="purple"
          suffix=" L"
          decimals={2}
        />
        <StatCard
          index={3}
          label="Avg Kt/V"
          value={stats.reduce((sum, d) => sum + (d.avg_ktv || 0), 0) / (stats.length || 1)}
          icon={Users}
          accent="yellow"
          decimals={2}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Sessions</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats}>
              
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
              <XAxis dataKey="scheduled_date" tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} tick={{ fontSize: 12, fill: '#8a8a8a' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#8a8a8a' }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: 'rgba(60,60,60,0.06)' }} />
              <Legend iconType="circle" />
              <Bar dataKey="total_sessions" fill="#5a5a5a" name="Total" radius={[6, 6, 0, 0]} />
              <Bar dataKey="completed" fill="#a0a0a0" name="Completed" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                innerRadius={50}
                outerRadius={100}
                paddingAngle={3}
                cornerRadius={6}
                dataKey="value"
              >
                {pieData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Average Kt/V Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={stats}>
              <defs>
                <linearGradient id="ktvGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5a5a5a" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#5a5a5a" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="urrGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a0a0a0" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#a0a0a0" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
              <XAxis dataKey="scheduled_date" tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} tick={{ fontSize: 12, fill: '#8a8a8a' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 2]} tick={{ fontSize: 12, fill: '#8a8a8a' }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Legend iconType="circle" />
              <Area type="monotone" dataKey="avg_ktv" stroke="#5a5a5a" strokeWidth={2.5} fill="url(#ktvGradient)" name="Avg Kt/V" dot={{ r: 3, fill: '#5a5a5a', strokeWidth: 0 }} activeDot={{ r: 5 }} />
              <Area type="monotone" dataKey="avg_urr" stroke="#a0a0a0" strokeWidth={2.5} fill="url(#urrGradient)" name="Avg URR (%)" dot={{ r: 3, fill: '#a0a0a0', strokeWidth: 0 }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Fluid Removal Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={stats}>
              <defs>
                <linearGradient id="fluidGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7a7a7a" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#7a7a7a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
              <XAxis dataKey="scheduled_date" tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} tick={{ fontSize: 12, fill: '#8a8a8a' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#8a8a8a' }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Legend iconType="circle" />
              <Area type="monotone" dataKey="avg_fluid_removed" stroke="#7a7a7a" strokeWidth={2.5} fill="url(#fluidGradient)" name="Avg Fluid Removed (L)" dot={{ r: 3, fill: '#7a7a7a', strokeWidth: 0 }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Reports;
