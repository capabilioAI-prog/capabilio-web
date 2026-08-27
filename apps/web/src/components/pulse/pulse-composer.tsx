'use client';

import React, { useState } from 'react';
import { 
  Send, 
  Code2, 
  Sparkles, 
  HelpCircle, 
  Trophy, 
  ShieldCheck, 
  Plus, 
  X,
  FileCode,
  CheckCircle2
} from 'lucide-react';

interface PulseComposerProps {
  onPostCreated: (post: any) => void;
  userDomain: string;
}

export function PulseComposer({ onPostCreated, userDomain }: PulseComposerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [postType, setPostType] = useState<'insight' | 'code' | 'question' | 'incident' | 'evidence'>('insight');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [codeSnippet, setCodeSnippet] = useState('');
  const [codeLanguage, setCodeLanguage] = useState('typescript');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(['SoftwareEngineering']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleAddTag(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const cleaned = tagInput.trim().replace(/^#/, '');
      if (cleaned && !tags.includes(cleaned)) {
        setTags([...tags, cleaned]);
        setTagInput('');
      }
    }
  }

  function handleRemoveTag(tagToRemove: string) {
    setTags(tags.filter(t => t !== tagToRemove));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    setError(null);

    let category = 'insight';
    if (postType === 'code') category = 'architecture';
    if (postType === 'question') category = 'question';
    if (postType === 'incident') category = 'incident';
    if (postType === 'evidence') category = 'evidence_share';

    const payload: any = {
      title: title.trim() || undefined,
      content: content.trim(),
      category,
      tags,
      domain: userDomain,
      signalType: postType === 'evidence' ? 'career_signal' : 'tech_signal',
      signalNote: postType === 'evidence' ? 'Engineering Proof Share' : 'Technical Development in your Track',
    };

    if (postType === 'code' && codeSnippet.trim()) {
      payload.codeSnippet = {
        language: codeLanguage,
        code: codeSnippet.trim(),
        filename: `snippet.${codeLanguage === 'typescript' ? 'ts' : codeLanguage === 'python' ? 'py' : 'sql'}`
      };
    }

    try {
      const res = await fetch('http://localhost:3001/api/pulse/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success && data.data?.post) {
        onPostCreated(data.data.post);
        setTitle('');
        setContent('');
        setCodeSnippet('');
        setIsOpen(false);
      } else {
        setError(data.error?.message || 'Failed to submit post');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) {
    return (
      <div 
        onClick={() => setIsOpen(true)}
        className="p-4 rounded-2xl border border-border bg-card shadow-2xs hover:border-brand/40 transition-all cursor-pointer space-y-3"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-brand/10 text-brand flex items-center justify-center font-bold text-xs font-mono">
            P
          </div>
          <div className="flex-1 py-2 px-3.5 bg-muted/40 rounded-xl text-xs text-muted-foreground font-medium">
            Share technical insights, sprint RCA, or evidence with your track...
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-border/80 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 hover:text-foreground">
              <Code2 className="w-3.5 h-3.5 text-blue-500" />
              <span>Code Snippet</span>
            </span>
            <span className="flex items-center gap-1.5 hover:text-foreground">
              <ShieldCheck className="w-3.5 h-3.5 text-brand" />
              <span>Capabilio Proof</span>
            </span>
            <span className="flex items-center gap-1.5 hover:text-foreground">
              <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
              <span>Question</span>
            </span>
          </div>
          <span className="text-[11px] font-mono text-brand font-semibold">
            Create Post →
          </span>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-5 sm:p-6 rounded-2xl border-2 border-brand/40 bg-card shadow-xl space-y-4 font-sans">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand" />
          <span className="font-bold text-xs text-foreground uppercase tracking-wider font-mono">
            Compose Career Intelligence Post
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="p-2.5 rounded-lg bg-red-500/10 text-red-600 text-xs font-medium">
          {error}
        </div>
      )}

      {/* Post Type Selector */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {[
          { id: 'insight', label: 'Technical Insight', icon: Sparkles },
          { id: 'code', label: 'Architecture & Code', icon: Code2 },
          { id: 'incident', label: 'Incident Post-Mortem', icon: FileCode },
          { id: 'question', label: 'Engineering Question', icon: HelpCircle },
          { id: 'evidence', label: 'Capabilio Proof', icon: ShieldCheck },
        ].map(type => {
          const Icon = type.icon;
          const isSelected = postType === type.id;
          return (
            <button
              key={type.id}
              type="button"
              onClick={() => setPostType(type.id as any)}
              className={
                isSelected
                  ? 'px-3 py-1.5 rounded-lg bg-brand text-white font-semibold flex items-center gap-1.5 shadow-xs transition-colors'
                  : 'px-3 py-1.5 rounded-lg bg-muted text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors'
              }
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{type.label}</span>
            </button>
          );
        })}
      </div>

      {/* Title Input */}
      <div>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title / Key takeaway (e.g. Why Token-Bucket Rate Limiting Prevents 500 Cascades)"
          className="w-full px-3.5 py-2 rounded-xl bg-muted/30 border border-border focus:border-brand focus:outline-hidden text-xs font-semibold text-foreground placeholder:text-muted-foreground"
        />
      </div>

      {/* Body Content */}
      <div>
        <textarea
          rows={4}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Describe the engineering context, root cause, architectural decision, or question..."
          required
          className="w-full px-3.5 py-2.5 rounded-xl bg-muted/30 border border-border focus:border-brand focus:outline-hidden text-xs text-foreground placeholder:text-muted-foreground leading-relaxed resize-y"
        />
      </div>

      {/* Code Snippet Box (if Code or Incident) */}
      {(postType === 'code' || postType === 'incident') && (
        <div className="space-y-2 p-3 bg-graphite-950 rounded-xl border border-graphite-800 text-xs">
          <div className="flex items-center justify-between text-[11px] font-mono text-graphite-400">
            <span>Code Snippet</span>
            <select
              value={codeLanguage}
              onChange={(e) => setCodeLanguage(e.target.value)}
              className="bg-graphite-900 border border-graphite-700 text-graphite-200 rounded px-2 py-0.5"
            >
              <option value="typescript">TypeScript</option>
              <option value="python">Python</option>
              <option value="sql">SQL</option>
              <option value="rust">Rust</option>
            </select>
          </div>
          <textarea
            rows={4}
            value={codeSnippet}
            onChange={(e) => setCodeSnippet(e.target.value)}
            placeholder="// Paste snippet or reproduction test code..."
            className="w-full bg-transparent font-mono text-xs text-emerald-400 placeholder:text-graphite-600 focus:outline-hidden resize-y"
          />
        </div>
      )}

      {/* Tag Chips Input */}
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {tags.map(tag => (
            <span key={tag} className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-muted text-foreground border border-border">
              #{tag}
              <button type="button" onClick={() => handleRemoveTag(tag)} className="hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleAddTag}
            placeholder="Add tag + press Enter..."
            className="px-2 py-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden"
          />
        </div>
      </div>

      {/* Bottom Submit Controls */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <span className="text-[11px] font-mono text-muted-foreground">
          Target Domain: <strong className="text-foreground capitalize">{userDomain.replace(/_/g, ' ')}</strong>
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !content.trim()}
            className="px-5 py-2 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Publishing...' : 'Publish Post'}</span>
          </button>
        </div>
      </div>
    </form>
  );
}
