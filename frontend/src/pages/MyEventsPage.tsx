import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Event } from '../types';
import { useAuth } from '../context/AuthContext';
import { formatSlotRange, formatDateHeading } from '../utils/format';
import { PlusCircle, Calendar, Users, Share2, Sparkles, AlertCircle, ArrowUpRight } from 'lucide-react';

export const MyEventsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'hosted' | 'cohosted'>('hosted');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    setLoading(true);
    api
      .listEvents()
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [user, navigate]);

  const hostedEvents = events.filter((e) => e.created_by_id === user?.id);
  const cohostedEvents = events.filter((e) => e.created_by_id !== user?.id);
  const displayedEvents = activeTab === 'hosted' ? hostedEvents : cohostedEvents;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">My Events</h1>
          <p className="text-xs text-slate-400 mt-1">Manage all your active and finalized scheduling orbits</p>
        </div>
        <Link
          to="/create"
          className="px-5 py-2.5 rounded-full text-xs font-bold bg-gradient-to-r from-cosmic-purple to-cosmic-pink text-white shadow-glow-sm hover:shadow-glow-md flex items-center space-x-2 transition-all self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Orbit</span>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
        <button
          onClick={() => setActiveTab('hosted')}
          className={`px-4 py-2 rounded-2xl text-xs font-semibold transition-all ${
            activeTab === 'hosted'
              ? 'bg-white/15 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Hosted by You ({hostedEvents.length})
        </button>
        <button
          onClick={() => setActiveTab('cohosted')}
          className={`px-4 py-2 rounded-2xl text-xs font-semibold transition-all ${
            activeTab === 'cohosted'
              ? 'bg-white/15 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Co-Hosted ({cohostedEvents.length})
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-panel p-6 rounded-3xl h-48 animate-pulse bg-white/5 border border-white/5" />
          ))}
        </div>
      ) : displayedEvents.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl text-center space-y-4 max-w-md mx-auto">
          <Calendar className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">No events found</h3>
          <p className="text-xs text-slate-400">
            {activeTab === 'hosted'
              ? "You haven't created any scheduling orbits yet."
              : "You are not listed as a co-host on any orbits."}
          </p>
          {activeTab === 'hosted' && (
            <Link
              to="/create"
              className="inline-flex px-5 py-2.5 rounded-full text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-colors"
            >
              Host Your First Event
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedEvents.map((ev) => (
            <div
              key={ev.id}
              className="glass-panel p-6 rounded-3xl border border-white/10 hover:border-cosmic-purple/40 transition-all flex flex-col justify-between group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      ev.status === 'finalized'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : ev.status === 'canceled'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-cosmic-purple/20 text-purple-300 border border-purple-500/30'
                    }`}
                  >
                    {ev.status}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {ev.candidate_dates?.length || 0} candidate days
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-cosmic-cyan transition-colors">
                    {ev.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                    {ev.description || 'No description provided.'}
                  </p>
                </div>

                <div className="pt-2 border-t border-white/5 space-y-1.5 text-xs text-slate-400">
                  <div className="flex items-center space-x-2">
                    <Users className="w-3.5 h-3.5 text-cosmic-purple" />
                    <span>{ev.respondents_count} participants responded</span>
                  </div>
                  {ev.location && (
                    <div className="truncate text-slate-500">
                      📍 {ev.location}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between gap-2">
                <Link
                  to={`/events/${ev.id}`}
                  className="text-xs font-semibold text-white hover:text-cosmic-cyan flex items-center space-x-1 transition-colors"
                >
                  <span>Manage Orbit</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
                {ev.active_token && (
                  <Link
                    to={`/share/${ev.active_token}/heatmap`}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-cosmic-cyan border border-white/10 flex items-center space-x-1.5 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Heatmap</span>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
