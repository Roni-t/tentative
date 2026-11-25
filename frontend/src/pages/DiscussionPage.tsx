import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { Comment, Event } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { format, parseISO } from 'date-fns';
import {
  MessageSquare,
  HelpCircle,
  CornerDownRight,
  Send,
  ArrowLeft,
  ShieldCheck,
  Filter,
} from 'lucide-react';

export const DiscussionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [event, setEvent] = useState<Event | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  // New comment form
  const [authorName, setAuthorName] = useState(user?.name || '');
  const [content, setContent] = useState('');
  const [isQuestion, setIsQuestion] = useState(false);
  const [posting, setPosting] = useState(false);

  // Filter
  const [filterMode, setFilterMode] = useState<'all' | 'questions'>('all');

  // Reply state
  const [activeReplyId, setActiveReplyId] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState('');

  const loadData = async () => {
    if (!id) return;
    try {
      const [ev, coms] = await Promise.all([api.getEvent(id), api.getComments(id)]);
      setEvent(ev);
      setComments(coms);
    } catch (err: any) {
      showToast(err.message || 'Error loading comments', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    if (user?.name && !authorName) {
      setAuthorName(user.name);
    }
  }, [user]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !content.trim() || !authorName.trim()) return;

    setPosting(true);
    try {
      await api.addComment(id, authorName.trim(), content.trim(), isQuestion);
      showToast('Comment posted to discussion', 'success');
      setContent('');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to post comment', 'error');
    } finally {
      setPosting(false);
    }
  };

  const handlePostReply = async (parentId: number) => {
    if (!id || !replyContent.trim()) return;
    try {
      const replierName = user?.name || 'Host';
      await api.addComment(id, replierName, replyContent.trim(), false, parentId);
      showToast('Reply sent', 'success');
      setReplyContent('');
      setActiveReplyId(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to post reply', 'error');
    }
  };

  if (loading || !event) {
    return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-slate-500 animate-pulse">Loading discussion thread...</div>;
  }

  const isHost = event.is_host || event.is_cohost;
  const filtered = filterMode === 'questions' ? comments.filter((c) => c.is_question) : comments;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      {/* Top Header */}
      <div>
        <Link
          to={`/events/${event.id}`}
          className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white mb-2 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to event</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Event Discussion</h1>
        <p className="text-xs text-slate-400 mt-0.5">{event.title}</p>
      </div>

      {/* Post Box (matches Wireframe p. 49) */}
      <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
        <div className="text-xs font-bold text-white uppercase tracking-wider text-cosmic-cyan">
          Ask a Question or Leave a Comment
        </div>

        <form onSubmit={handlePostComment} className="space-y-3">
          <div className="max-w-xs">
            <input
              type="text"
              required
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Your Name (e.g. Alex Morgan)"
              className="w-full px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-white text-xs focus:border-cosmic-purple"
            />
          </div>

          <textarea
            rows={3}
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type your message, inquiry, or question here..."
            className="w-full px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-slate-600 text-xs focus:border-cosmic-purple transition-all custom-scrollbar"
          />

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setIsQuestion(true)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                  isQuestion
                    ? 'bg-cosmic-cyan/20 text-cyan-300 border border-cosmic-cyan/40'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Question</span>
              </button>

              <button
                type="button"
                onClick={() => setIsQuestion(false)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                  !isQuestion
                    ? 'bg-cosmic-purple/20 text-zinc-200 border border-cosmic-purple/40'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Comment</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={posting}
              className="px-6 py-2 rounded-full text-xs font-bold bg-white text-black hover:bg-zinc-200 flex items-center space-x-1.5 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 text-black" />
              <span>{posting ? 'Posting...' : 'Post Message'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Discussion List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-slate-300">
            Discussion ({comments.length})
          </div>

          <div className="flex items-center space-x-1 text-xs">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1 rounded-xl text-[11px] font-semibold transition-colors ${
                filterMode === 'all' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Messages
            </button>
            <button
              onClick={() => setFilterMode('questions')}
              className={`px-3 py-1 rounded-xl text-[11px] font-semibold transition-colors ${
                filterMode === 'questions' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Questions Only
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-8 rounded-3xl glass-panel text-center text-xs text-slate-500">
            No discussion messages yet. Be the first to start the conversation!
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((c) => (
              <div key={c.id} className="p-5 rounded-3xl glass-panel border border-white/10 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-white">{c.author_name}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        c.is_question
                          ? 'bg-cosmic-cyan/20 text-cyan-300 border border-cosmic-cyan/30'
                          : 'bg-white/5 text-slate-400 border border-white/10'
                      }`}
                    >
                      {c.is_question ? 'Question' : 'Comment'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {format(parseISO(c.created_at), 'MMM d, h:mm a')}
                  </span>
                </div>

                <p className="text-xs text-slate-200 leading-relaxed">{c.content}</p>

                {/* Threaded Replies */}
                {c.replies.length > 0 && (
                  <div className="pl-4 border-l border-white/10 space-y-2.5 pt-2">
                    {c.replies.map((rep) => (
                      <div key={rep.id} className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-bold text-white">{rep.author_name}</span>
                            {rep.is_host_reply && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-cosmic-purple/30 text-zinc-200 border border-cosmic-purple/40">
                                Host Reply
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {format(parseISO(rep.created_at), 'MMM d, h:mm a')}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300">{rep.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Button */}
                {isHost && activeReplyId !== c.id && (
                  <button
                    onClick={() => setActiveReplyId(c.id)}
                    className="text-[11px] font-semibold text-cosmic-purple hover:text-cosmic-cyan flex items-center space-x-1 pt-1 transition-colors"
                  >
                    <CornerDownRight className="w-3 h-3" />
                    <span>Reply as Host</span>
                  </button>
                )}

                {/* Reply Form */}
                {activeReplyId === c.id && (
                  <div className="pt-2 pl-4 border-l border-cosmic-purple space-y-2">
                    <textarea
                      rows={2}
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="Write your host response..."
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
                    />
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => {
                          setActiveReplyId(null);
                          setReplyContent('');
                        }}
                        className="px-3 py-1 rounded-xl text-xs text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handlePostReply(c.id)}
                        className="px-4 py-1.5 rounded-xl text-xs font-bold bg-cosmic-purple hover:bg-cosmic-purple/80 text-white"
                      >
                        Send Reply
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
