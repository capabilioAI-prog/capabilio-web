'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Heart, 
  MessageSquare, 
  Bookmark, 
  Share2, 
  MoreHorizontal, 
  CheckCircle2, 
  Copy, 
  Check, 
  ExternalLink, 
  ShieldCheck, 
  Code2, 
  ArrowRight,
  Sparkles,
  Zap,
  Flame,
  Radio,
  Send
} from 'lucide-react';

interface PulsePostCardProps {
  post: any;
  currentUserId?: string;
  isFollowingAuthor: boolean;
  onToggleFollow: (type: 'user' | 'company' | 'topic', id: string, name: string) => void;
  onToggleLike: (postId: string) => void;
  onToggleSave: (postId: string) => void;
}

export function PulsePostCard({
  post,
  currentUserId,
  isFollowingAuthor,
  onToggleFollow,
  onToggleLike,
  onToggleSave,
}: PulsePostCardProps) {
  const [isLiked, setIsLiked] = useState(!!post.isLiked);
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  const [isSaved, setIsSaved] = useState(!!post.isSaved);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>(post.comments || []);
  const [commentInput, setCommentInput] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  function handleLike() {
    setIsLiked(!isLiked);
    setLikesCount(isLiked ? Math.max(0, likesCount - 1) : likesCount + 1);
    onToggleLike(post.id);
  }

  function handleSave() {
    setIsSaved(!isSaved);
    onToggleSave(post.id);
  }

  function handleCopyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.origin + '/pulse?post=' + post.id);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentInput.trim()) return;

    setIsSubmittingComment(true);
    try {
      const res = await fetch(`http://localhost:3001/api/pulse/posts/${post.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: commentInput.trim() }),
      });
      const data = await res.json();
      if (data.success && data.data?.comment) {
        setComments([data.data.comment, ...comments]);
        setCommentInput('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingComment(false);
    }
  }

  const isEvidence = post.category === 'evidence_share' || post.evidenceData;

  return (
    <article className={
      isEvidence
        ? 'p-5 sm:p-6 rounded-2xl border-2 border-brand/50 bg-card shadow-lg space-y-4 relative overflow-hidden transition-all'
        : 'p-5 sm:p-6 rounded-2xl border border-border bg-card shadow-2xs hover:border-border/90 space-y-4 transition-all'
    }>
      {/* Subtle Proof Glow */}
      {isEvidence && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 rounded-full blur-2xl pointer-events-none" />
      )}

      {/* Signal Banner */}
      {post.signalType && (
        <div className="flex items-center justify-between text-[11px] font-mono pb-2 border-b border-border/60">
          <div className="flex items-center gap-1.5 text-brand font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
            <span className="uppercase">{post.signalType.replace('_', ' ')}</span>
          </div>
          {post.signalNote && (
            <span className="text-muted-foreground text-[11px]">
              Why: <span className="text-foreground">{post.signalNote}</span>
            </span>
          )}
        </div>
      )}

      {/* Author Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-muted text-foreground flex items-center justify-center font-bold text-xs font-mono border border-border">
            {post.authorName ? post.authorName[0] : 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-foreground">
                {post.authorName}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground border border-border">
                {post.authorRole || 'Engineer'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-1">
              {post.authorHeadline}
            </p>
          </div>
        </div>

        {/* Follow / Save Top Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onToggleFollow('user', post.userId || post.authorName, post.authorName)}
            className={
              isFollowingAuthor
                ? 'px-2.5 py-1 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 text-[11px] font-semibold transition-colors'
                : 'px-2.5 py-1 rounded-lg bg-brand/10 text-brand hover:bg-brand/20 text-[11px] font-semibold transition-colors'
            }
          >
            {isFollowingAuthor ? 'Following' : '+ Follow'}
          </button>
        </div>
      </div>

      {/* Post Title */}
      {post.title && (
        <h3 className="text-base font-bold text-foreground leading-snug">
          {post.title}
        </h3>
      )}

      {/* Post Content */}
      <div className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
        {post.content}
      </div>

      {/* Capabilio Proof Card */}
      {post.evidenceData && (
        <div className="p-4 rounded-xl bg-brand/5 border border-brand/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-brand text-white flex items-center justify-center shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-mono font-bold text-foreground">
                CAPABILIO VERIFIED PROOF
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-brand bg-brand/10 px-2 py-0.5 rounded">
              +{post.evidenceData.eloDelta} ELO REWARD
            </span>
          </div>

          <div className="space-y-1">
            <div className="font-semibold text-xs text-foreground">
              {post.evidenceData.missionTitle}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground font-mono">
              <span className="text-emerald-600 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Score: {post.evidenceData.score}/100 (Pass)
              </span>
              <span>•</span>
              <span>Skill: {post.evidenceData.skillName}</span>
              {post.evidenceData.proofHash && (
                <>
                  <span>•</span>
                  <span className="text-muted-foreground">{post.evidenceData.proofHash}</span>
                </>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-brand/15 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              Deterministic verification log deposited into Vault.
            </span>
            <Link
              href="/vault"
              className="text-xs font-semibold text-brand hover:underline flex items-center gap-1"
            >
              <span>Inspect Vault Proof</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}

      {/* Code Snippet */}
      {post.codeSnippet && (
        <div className="rounded-xl overflow-hidden border border-graphite-800 bg-graphite-950 font-mono text-xs">
          <div className="bg-graphite-900 px-3.5 py-1.5 border-b border-graphite-800 flex items-center justify-between text-[11px] text-graphite-400">
            <span>{post.codeSnippet.filename || `snippet.${post.codeSnippet.language}`}</span>
            <button
              onClick={() => handleCopyCode(post.codeSnippet.code)}
              className="flex items-center gap-1 hover:text-white transition-colors"
            >
              {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedCode ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <pre className="p-4 text-emerald-400 overflow-x-auto text-[11px] leading-relaxed">
            <code>{post.codeSnippet.code}</code>
          </pre>
        </div>
      )}

      {/* Action Prompt Bridge (Arena / Skill Studio / Launchpad) */}
      {post.actionPrompt && (
        <div className="p-3.5 rounded-xl bg-muted/40 border border-border/80 flex items-center justify-between gap-3 text-xs">
          <div>
            <div className="font-semibold text-foreground">
              {post.actionPrompt.label}
            </div>
            {post.actionPrompt.badgeText && (
              <span className="text-[10px] font-mono text-muted-foreground">
                {post.actionPrompt.badgeText}
              </span>
            )}
          </div>
          <Link
            href={post.actionPrompt.linkUrl}
            className="px-3.5 py-1.5 rounded-lg bg-brand hover:bg-brand-hover text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-1 shrink-0"
          >
            <span>Practice</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* Tag List */}
      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {post.tags.map((tag: string) => (
            <span key={tag} className="text-[11px] font-mono px-2 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/50">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Action Bar */}
      <div className="flex items-center justify-between pt-3 border-t border-border text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <button
            onClick={handleLike}
            className={
              isLiked
                ? 'flex items-center gap-1.5 text-brand font-semibold transition-colors'
                : 'flex items-center gap-1.5 hover:text-foreground transition-colors'
            }
          >
            <Heart className={isLiked ? 'w-4 h-4 fill-current text-brand' : 'w-4 h-4'} />
            <span>{likesCount}</span>
          </button>

          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            <span>{comments.length}</span>
          </button>

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            {copiedShare ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
            <span>{copiedShare ? 'Link Copied' : 'Share'}</span>
          </button>
        </div>

        <button
          onClick={handleSave}
          className={
            isSaved
              ? 'p-1 rounded text-brand font-semibold'
              : 'p-1 rounded hover:text-foreground'
          }
          title={isSaved ? 'Remove from Saved' : 'Save post'}
        >
          <Bookmark className={isSaved ? 'w-4 h-4 fill-current text-brand' : 'w-4 h-4'} />
        </button>
      </div>

      {/* Inline Comments Section */}
      {showComments && (
        <div className="pt-3 border-t border-border space-y-3">
          {/* Add Comment Input */}
          <form onSubmit={handleAddComment} className="flex items-center gap-2">
            <input
              type="text"
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              placeholder="Write a technical response or observation..."
              className="flex-1 px-3 py-1.5 bg-muted/40 border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-hidden"
            />
            <button
              type="submit"
              disabled={isSubmittingComment || !commentInput.trim()}
              className="px-3 py-1.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Comment List */}
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {comments.map((comment, idx) => (
              <div key={comment.id || idx} className="p-3 bg-muted/20 rounded-xl border border-border/60 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground text-[11px]">
                    {comment.authorName}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {comment.authorHeadline || 'Engineer'}
                  </span>
                </div>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  {comment.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
