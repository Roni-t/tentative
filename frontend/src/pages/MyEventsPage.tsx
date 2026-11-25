import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api/client';
import { Event } from '../types';
import { useAuth } from '../context/AuthContext';
import { PlusCircle, Calendar, Users, Sparkles, ArrowUpRight } from 'lucide-react';

export const MyEventsPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'hosted' | 'cohosted'>('hosted');

  useEffect(() => {
    if (authLoading) return; // wait until we know whether someone is logged in
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
  }, [user, authLoading, navigate]);

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
        <motion.div whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.96 }}>
          <Link
            to="/create"
            className="px-5 py-2.5 rounded-full text-xs font-bold bg-white text-black hover:bg-zinc-200 flex items-center space-x-2 transition-all self-start sm:self-auto cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-black" />
            <span>New Orbit</span>
          </Link>
        </motion.div>
      </div>

      {/* Tabs with animated layout pill */}
      <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
        <button
          onClick={() => setActiveTab('hosted')}
          className={`relative px-4 py-2 rounded-2xl text-xs font-semibold transition-colors z-10 cursor-pointer ${
            activeTab === 'hosted' ? 'text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          {activeTab === 'hosted' && (
            <motion.div
              layoutId="events-tab-pill"
              className="absolute inset-0 bg-white/15 rounded-2xl border border-white/20 shadow-sm -z-10"
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            />
          )}
          <span>Hosted by You ({hostedEvents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('cohosted')}
          className={`relative px-4 py-2 rounded-2xl text-xs font-semibold transition-colors z-10 cursor-pointer ${
            activeTab === 'cohosted' ? 'text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          {activeTab === 'cohosted' && (
            <motion.div
              layoutId="events-tab-pill"
              className="absolute inset-0 bg-white/15 rounded-2xl border border-white/20 shadow-sm -z-10"
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            />
          )}
          <span>Co-Hosted ({cohostedEvents.length})</span>
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
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel p-12 rounded-3xl text-center space-y-4 max-w-md mx-auto"
        >
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
        </motion.div>
      ) : (
        <motion.div
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <AnimatePresence>
            {displayedEvents.map((ev, idx) => (
              <motion.div
                key={ev.id}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                whileHover={{ y: -5, scale: 1.015 }}
                className="glass-panel p-6 rounded-3xl border border-zinc-800 hover:border-zinc-500 transition-colors flex flex-col justify-between group cursor-default"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        ev.status === 'finalized'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : ev.status === 'canceled'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-zinc-900 text-zinc-300 border border-zinc-700'
                      }`}
                    >
                      {ev.status}
                    </span>
                    <span className="text-[11px] text-zinc-500 font-mono">
                      {ev.candidate_dates?.length || 0} candidate days
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-zinc-300 transition-colors">
                      {ev.title}
                    </h3>
                    <p className="text-xs text-zinc-400 line-clamp-2 mt-1">
                      {ev.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-zinc-800/80 space-y-1.5 text-xs text-zinc-400">
                    <div className="flex items-center space-x-2">
                      <Users className="w-3.5 h-3.5 text-white" />
                      <span>{ev.respondents_count} {ev.respondents_count === 1 ? 'participant' : 'participants'} responded</span>
                    </div>
                    {ev.location && (
                      <div className="truncate text-zinc-500">
                        {ev.location}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                  <Link
                    to={`/events/${ev.id}`}
                    className="text-xs font-semibold text-white hover:text-zinc-300 flex items-center space-x-1 transition-colors"
                  >
                    <span>Manage Orbit</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                  {ev.active_token && (
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Link
                        to={`/share/${ev.active_token}/heatmap`}
                        className="px-3 py-1.5 rounded-xl bg-white text-black hover:bg-zinc-200 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-black" />
                        <span>Timetable Heatmap</span>
                      </Link>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
};
