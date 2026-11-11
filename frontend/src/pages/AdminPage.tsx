import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { AdminEvent, AdminUser, BugReport, SystemStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { format, parseISO } from 'date-fns';
import {
  Shield,
  Power,
  Users,
  Calendar,
  Bug,
  Trash2,
  RefreshCw,
  Terminal,
  Activity,
} from 'lucide-react';

export const AdminPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [bugReports, setBugReports] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'system' | 'events' | 'users' | 'bugs'>('system');

  const loadAll = async () => {
    setLoading(true);
    try {
      const [st, uList, eList, bList] = await Promise.all([
        api.getAdminStatus(),
        api.listAdminUsers(),
        api.listAdminEvents(),
        api.listBugReports(),
      ]);
      setStatus(st);
      setUsers(uList);
      setEvents(eList);
      setBugReports(bList);
    } catch (err: any) {
      showToast(err.message || 'Admin authentication failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleTogglePower = async () => {
    if (!status) return;
    const newPower = status.status !== 'online';
    try {
      const res = await api.togglePower(newPower);
      showToast(res.message, 'info');
      loadAll();
    } catch (err: any) {
      showToast(err.message || 'Failed to toggle system power', 'error');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm('Delete this user account?')) return;
    try {
      await api.deleteAdminUser(userId);
      showToast('User account deleted', 'success');
      loadAll();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete user', 'error');
    }
  };

  const handleDeleteEvent = async (eventId: number) => {
    if (!window.confirm('Delete this event?')) return;
    try {
      await api.deleteAdminEvent(eventId);
      showToast('Event removed', 'success');
      loadAll();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete event', 'error');
    }
  };

  if (!user?.is_admin) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-3">
        <Shield className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-white">Access Denied</h2>
        <p className="text-xs text-slate-400">Admin privileges required to view this celestial console.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-cosmic-purple/20 text-cosmic-purple flex items-center justify-center">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Admin Console</h1>
            <p className="text-xs text-slate-400 mt-0.5">Host & Service Management · UC-6</p>
          </div>
        </div>

        <button
          onClick={loadAll}
          className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold flex items-center space-x-1.5 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
        <button
          onClick={() => setActiveTab('system')}
          className={`px-4 py-2 rounded-2xl text-xs font-semibold transition-all ${
            activeTab === 'system' ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          System Health
        </button>
        <button
          onClick={() => setActiveTab('events')}
          className={`px-4 py-2 rounded-2xl text-xs font-semibold transition-all ${
            activeTab === 'events' ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          All Events ({events.length})
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-2xl text-xs font-semibold transition-all ${
            activeTab === 'users' ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          Accounts ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('bugs')}
          className={`px-4 py-2 rounded-2xl text-xs font-semibold transition-all ${
            activeTab === 'bugs' ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          Bug Reports ({bugReports.length})
        </button>
      </div>

      {/* Tab: System Health (Wireframe p. 43) */}
      {activeTab === 'system' && status && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="glass-panel p-5 rounded-3xl border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Server Status</span>
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    status.status === 'online' ? 'bg-emerald-400 shadow-glow-sm' : 'bg-amber-400'
                  }`}
                />
              </div>
              <div className="text-xl font-extrabold text-white capitalize mt-2">{status.status}</div>
              <button
                onClick={handleTogglePower}
                className="mt-3 text-[11px] text-cosmic-cyan hover:underline flex items-center space-x-1"
              >
                <Power className="w-3 h-3" />
                <span>Toggle Maintenance Mode</span>
              </button>
            </div>

            <div className="glass-panel p-5 rounded-3xl border border-white/10">
              <span className="text-xs text-slate-400">Total Users</span>
              <div className="text-xl font-extrabold text-white mt-2">{status.total_users}</div>
            </div>

            <div className="glass-panel p-5 rounded-3xl border border-white/10">
              <span className="text-xs text-slate-400">Total Events</span>
              <div className="text-xl font-extrabold text-white mt-2">{status.total_events}</div>
            </div>

            <div className="glass-panel p-5 rounded-3xl border border-white/10">
              <span className="text-xs text-slate-400">Total RSVPs</span>
              <div className="text-xl font-extrabold text-white mt-2">{status.total_rsvps}</div>
            </div>
          </div>

          {/* Terminal Box (Wireframe p. 43) */}
          <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-3 font-mono text-xs">
            <div className="flex items-center space-x-2 text-slate-400 border-b border-white/10 pb-2">
              <Terminal className="w-4 h-4 text-cosmic-purple" />
              <span>Diagnostic System Telemetry</span>
            </div>
            <div className="text-slate-300 space-y-1">
              <div>Log session: Online since {format(parseISO(status.uptime_since), 'MMM d, yyyy HH:mm:ss')} UTC</div>
              <div>Database target: {status.db_path}</div>
              <div>Active connections: {status.active_connections}</div>
              <div>Host engine: Python 3.12 + FastAPI + SQLite (PRAGMA foreign_keys = ON)</div>
              <div>Encryption: Fernet 256-bit at rest + deterministic SHA256 phone hash</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Events */}
      {activeTab === 'events' && (
        <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 border-b border-white/10 text-slate-400 uppercase text-[10px] font-semibold">
              <tr>
                <th className="py-3 px-6">ID</th>
                <th className="py-3 px-4">Event Title</th>
                <th className="py-3 px-4">Creator</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {events.map((e) => (
                <tr key={e.id} className="hover:bg-white/[0.02]">
                  <td className="py-3 px-6 font-mono text-slate-500">#{e.id}</td>
                  <td className="py-3 px-4 font-bold text-white">{e.title}</td>
                  <td className="py-3 px-4 text-slate-300">{e.creator_name}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-white/5 border border-white/10 text-slate-300">
                      {e.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleDeleteEvent(e.id)}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Remove Event"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Users */}
      {activeTab === 'users' && (
        <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 border-b border-white/10 text-slate-400 uppercase text-[10px] font-semibold">
              <tr>
                <th className="py-3 px-6">ID</th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Encrypted Phone</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-white/[0.02]">
                  <td className="py-3 px-6 font-mono text-slate-500">#{u.id}</td>
                  <td className="py-3 px-4 font-bold text-white">{u.name}</td>
                  <td className="py-3 px-4 font-mono text-slate-400">{u.phone_masked}</td>
                  <td className="py-3 px-4">
                    {u.is_admin ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-cosmic-purple/20 text-purple-300 border border-purple-500/30">
                        Admin
                      </span>
                    ) : (
                      <span className="text-slate-500">Host</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {!u.is_admin && (
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Remove Account"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Bug Reports */}
      {activeTab === 'bugs' && (
        <div className="space-y-3">
          {bugReports.length === 0 ? (
            <div className="p-8 glass-panel rounded-3xl text-center text-xs text-slate-500">
              No bugs filed yet. System is stable.
            </div>
          ) : (
            bugReports.map((b) => (
              <div key={b.id} className="p-5 glass-panel rounded-3xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">{b.user_name || 'Anonymous User'}</span>
                  <span className="text-slate-500 font-mono text-[10px]">
                    {format(parseISO(b.created_at), 'MMM d, yyyy · h:mm a')}
                  </span>
                </div>
                <p className="text-xs text-slate-300">{b.description}</p>
                {b.page_url && (
                  <div className="text-[11px] text-cosmic-cyan font-mono">Page: {b.page_url}</div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
