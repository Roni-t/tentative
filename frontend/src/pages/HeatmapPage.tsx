import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Event, HeatmapResponse, HeatmapSlot } from '../types';
import { HeatmapGrid } from '../components/HeatmapGrid';
import { DEMO_TOKEN } from '../utils/demo';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ArrowLeft, RefreshCw, Sparkles, PlusCircle } from 'lucide-react';

export const HeatmapPage: React.FC = () => {
  const { id, token } = useParams<{ id?: string; token?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [event, setEvent] = useState<Event | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<HeatmapSlot | null>(null);

  const loadData = async (force: boolean = false) => {
    try {
      let ev: Event;
      if (token) {
        ev = await api.resolveShareToken(token);
      } else if (id) {
        ev = await api.getEvent(id);
      } else {
        return;
      }
      setEvent(ev);

      const hm = await api.getHeatmap(ev.id, force);
      setHeatmap(hm);
      if (hm.best_slots.length > 0) {
        setSelectedSlot(hm.best_slots[0]);
      }
    } catch (err: any) {
      if (err.status === 410) {
        navigate('/expired');
        return;
      }
      showToast(err.message || 'Error loading heatmap data', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id, token]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  const isDemo = token === DEMO_TOKEN;

  const handleSelectSlotForFinalize = (slot: HeatmapSlot) => {
    if (!event) return;
    navigate(isDemo ? `/share/${DEMO_TOKEN}/finalize` : `/events/${event.id}/finalize`, {
      state: {
        startTime: slot.start_time,
        endTime: slot.end_time,
      },
    });
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center text-slate-500 animate-pulse">
        Calculating alignment matrix and radiant heatmap...
      </div>
    );
  }

  if (!event || !heatmap) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-white">Heatmap data unavailable</h2>
        <Link to="/" className="text-xs text-cosmic-cyan hover:underline">
          Return Home
        </Link>
      </div>
    );
  }

  // In the demo, everyone gets the finalize buttons so they can try it out
  const isHostOrCohost = event.is_host || event.is_cohost || isDemo;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to={token ? `/share/${token}` : `/events/${event.id}`}
            className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to event</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Availability Heatmap
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {event.title} · Timezone: {event.timezone}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-medium flex items-center space-x-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <Link
            to={token ? `/share/${token}/respond` : `/events/${event.id}/respond`}
            className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold flex items-center space-x-1.5 transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5 text-black" />
            <span>Paint My Times</span>
          </Link>
        </div>
      </div>

      {isDemo && (
        <div className="glass-panel rounded-2xl px-5 py-3 text-xs text-zinc-300">
          This is a demo event. Pick a time and finalize it to see what happens. Nothing is saved.
        </div>
      )}

      {/* Heatmap Grid & Inspector Component */}
      <HeatmapGrid
        timezone={event.timezone}
        heatmap={heatmap}
        candidateDates={event.candidate_dates}
        isHostOrCohost={isHostOrCohost}
        onSelectSlot={handleSelectSlotForFinalize}
        selectedSlot={selectedSlot}
      />
    </div>
  );
};
