'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { 
  Radio, 
  Search, 
  Sparkles, 
  TrendingUp, 
  Flame, 
  Users, 
  Code2, 
  Briefcase, 
  Building2, 
  Bookmark, 
  Filter, 
  SlidersHorizontal,
  RefreshCw,
  Compass,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

import { PulseSidebar } from '@/components/pulse/pulse-sidebar';
import { PulseComposer } from '@/components/pulse/pulse-composer';
import { PulsePostCard } from '@/components/pulse/pulse-post-card';
import { PulseIntelligencePanel } from '@/components/pulse/pulse-intelligence-panel';

export default function PulsePage() {
  const [activeTab, setActiveTab] = useState('for-you');
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [posts, setPosts] = useState<any[]>([]);
  const [trendingData, setTrendingData] = useState<any>(null);
  const [userState, setUserState] = useState<{
    followedTargetIds: string[];
    savedPostIds: string[];
    likedPostIds: string[];
  }>({
    followedTargetIds: [],
    savedPostIds: [],
    likedPostIds: [],
  });
  const [userRole, setUserRole] = useState('Software Engineer');
  const [userDomain, setUserDomain] = useState('software_engineering');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch user state (likes, follows, saved)
  const fetchUserState = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:3001/api/pulse/user-state', {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success && data.data) {
        setUserState(data.data);
      }
    } catch (e) {
      console.error('Fetch user state error:', e);
    }
  }, []);

  // Fetch trending & domain intelligence
  const fetchTrending = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:3001/api/pulse/trending', {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success && data.data) {
        setTrendingData(data.data);
        if (data.data.userRole) setUserRole(data.data.userRole);
        if (data.data.userDomain) setUserDomain(data.data.userDomain);
      }
    } catch (e) {
      console.error('Fetch trending error:', e);
    }
  }, []);

  // Fetch feed posts based on tab and category
  const fetchPosts = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      let url = `http://localhost:3001/api/pulse/feed?tab=${activeTab}`;
      if (activeCategory !== 'all') {
        url += `&category=${activeCategory}`;
      }
      const res = await fetch(url, { credentials: 'include' });
      const data = await res.json();
      if (data.success && data.data) {
        setPosts(data.data.posts || []);
        if (data.data.meta?.userRole) setUserRole(data.data.meta.userRole);
        if (data.data.meta?.userDomain) setUserDomain(data.data.meta.userDomain);
      }
    } catch (e) {
      console.error('Fetch feed error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, activeCategory]);

  useEffect(() => {
    fetchUserState();
    fetchTrending();
  }, [fetchUserState, fetchTrending]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Actions
  async function handleToggleFollow(type: 'user' | 'company' | 'topic', id: string, name: string) {
    try {
      const isCurrentlyFollowing = userState.followedTargetIds.includes(id);
      const newFollowed = isCurrentlyFollowing
        ? userState.followedTargetIds.filter(x => x !== id)
        : [...userState.followedTargetIds, id];

      setUserState(prev => ({ ...prev, followedTargetIds: newFollowed }));

      await fetch('http://localhost:3001/api/pulse/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ targetType: type, targetId: id, targetName: name }),
      });
    } catch (e) {
      console.error('Toggle follow error:', e);
    }
  }

  async function handleToggleLike(postId: string) {
    try {
      const isCurrentlyLiked = userState.likedPostIds.includes(postId);
      const newLiked = isCurrentlyLiked
        ? userState.likedPostIds.filter(x => x !== postId)
        : [...userState.likedPostIds, postId];

      setUserState(prev => ({ ...prev, likedPostIds: newLiked }));

      await fetch(`http://localhost:3001/api/pulse/posts/${postId}/like`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (e) {
      console.error('Toggle like error:', e);
    }
  }

  async function handleToggleSave(postId: string) {
    try {
      const isCurrentlySaved = userState.savedPostIds.includes(postId);
      const newSaved = isCurrentlySaved
        ? userState.savedPostIds.filter(x => x !== postId)
        : [...userState.savedPostIds, postId];

      setUserState(prev => ({ ...prev, savedPostIds: newSaved }));

      await fetch('http://localhost:3001/api/pulse/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ postId }),
      });
    } catch (e) {
      console.error('Toggle save error:', e);
    }
  }

  function handlePostCreated(newPost: any) {
    setPosts([newPost, ...posts]);
  }

  // Filter posts by search query if present
  const displayedPosts = searchQuery.trim()
    ? posts.filter(p => 
        (p.title && p.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        p.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.authorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.tags && p.tags.some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase())))
      )
    : posts;

  const CATEGORIES = [
    { id: 'all', label: 'All Developments' },
    { id: 'architecture', label: 'Architecture & Code' },
    { id: 'incident', label: 'Incident Post-Mortems' },
    { id: 'evidence_share', label: 'Capabilio Proof' },
    { id: 'question', label: 'Questions & Discussions' },
    { id: 'insight', label: 'Technical Insights' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-brand selection:text-white pb-16">
      {/* Top Header Bar */}
      <div className="sticky top-0 z-20 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          {/* Pulse Title & Domain Badge */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-brand text-white flex items-center justify-center font-mono font-bold text-xs shadow-xs">
              P
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-foreground tracking-tight">
                  Capabilio Pulse
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand/10 text-brand font-semibold hidden sm:inline-block">
                  Career Intelligence Feed
                </span>
              </div>
            </div>
          </div>

          {/* Search Input */}
          <div className="flex-1 max-w-md relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${userRole} topics, code, posts, or evidence...`}
              className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-muted/40 border border-border text-xs text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-hidden transition-colors"
            />
          </div>

          {/* Refresh Action */}
          <button
            onClick={() => fetchPosts(true)}
            disabled={refreshing}
            className="p-2 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            title="Refresh feed"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-brand' : ''}`} />
          </button>
        </div>
      </div>

      {/* 3-Column Layout Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Navigation & Topics */}
          <div className="lg:col-span-3 hidden lg:block sticky top-20">
            <PulseSidebar
              activeTab={activeTab}
              onTabChange={(tab) => {
                setActiveTab(tab);
                setActiveCategory('all');
              }}
              userDomain={userDomain}
              userRole={userRole}
              topics={trendingData?.topics || []}
              followedTargetIds={userState.followedTargetIds}
              onToggleFollow={handleToggleFollow}
              savedCount={userState.savedPostIds.length}
            />
          </div>

          {/* Center Column: Feed Experience */}
          <main className="lg:col-span-6 space-y-6">
            {/* Contextual Greeting Banner */}
            <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-2xs space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-mono text-brand font-semibold">
                <Radio className="w-3 h-3 animate-pulse" />
                <span>INTELLIGENCE RADAR</span>
              </div>
              <h2 className="text-base font-bold text-foreground">
                Developments worth knowing for {userRole}.
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Prioritizing technical architecture, verified evidence, and production sprint tickets in your domain.
              </p>
            </div>

            {/* Mobile Tab Scroller */}
            <div className="lg:hidden flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
              {[
                { id: 'for-you', label: 'For You' },
                { id: 'following', label: 'Following' },
                { id: 'trending', label: 'Trending' },
                { id: 'technical', label: 'Technical' },
                { id: 'career', label: 'Career' },
                { id: 'saved', label: 'Saved' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={
                    activeTab === tab.id
                      ? 'px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold whitespace-nowrap shadow-xs'
                      : 'px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-medium whitespace-nowrap'
                  }
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Post Composer */}
            <PulseComposer
              onPostCreated={handlePostCreated}
              userDomain={userDomain}
            />

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={
                    activeCategory === cat.id
                      ? 'px-3 py-1 rounded-lg bg-foreground text-background font-semibold whitespace-nowrap transition-colors'
                      : 'px-3 py-1 rounded-lg bg-muted/60 text-muted-foreground hover:text-foreground whitespace-nowrap border border-border/50 transition-colors'
                  }
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Feed Stream */}
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="p-6 rounded-2xl border border-border bg-card animate-pulse space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-muted" />
                      <div className="space-y-2 flex-1">
                        <div className="h-3 bg-muted rounded w-1/4" />
                        <div className="h-2 bg-muted rounded w-1/3" />
                      </div>
                    </div>
                    <div className="h-16 bg-muted rounded-xl" />
                  </div>
                ))}
              </div>
            ) : displayedPosts.length > 0 ? (
              <div className="space-y-4">
                {displayedPosts.map(post => (
                  <PulsePostCard
                    key={post.id}
                    post={post}
                    isFollowingAuthor={
                      userState.followedTargetIds.includes(post.userId) ||
                      userState.followedTargetIds.includes(post.authorName)
                    }
                    onToggleFollow={handleToggleFollow}
                    onToggleLike={handleToggleLike}
                    onToggleSave={handleToggleSave}
                  />
                ))}
              </div>
            ) : (
              /* Intelligent Empty State */
              <div className="p-8 text-center rounded-2xl border border-border bg-card shadow-2xs space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-brand/10 text-brand flex items-center justify-center mx-auto">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-foreground">
                    {activeTab === 'saved'
                      ? 'No saved items yet'
                      : activeTab === 'following'
                      ? 'You are not following anyone yet'
                      : 'Your Pulse is still learning what matters to you'}
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                    {activeTab === 'saved'
                      ? 'Bookmark technical architecture posts, incident RCAs, and evidence cards to review them anytime.'
                      : 'Follow 3 topics or complete an Arena sprint ticket to calibrate your personalized feed.'}
                  </p>
                </div>
                <div className="pt-2 flex items-center justify-center gap-3">
                  <Link
                    href="/arena"
                    className="px-4 py-2 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <span>Practice in Arena</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <button
                    onClick={() => setActiveTab('for-you')}
                    className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-xs font-semibold text-foreground transition-colors"
                  >
                    Explore For You
                  </button>
                </div>
              </div>
            )}
          </main>

          {/* Right Column: Intelligence Panel */}
          <div className="lg:col-span-3 hidden lg:block sticky top-20">
            <PulseIntelligencePanel
              userDomain={userDomain}
              userRole={userRole}
              trendingData={trendingData}
              followedTargetIds={userState.followedTargetIds}
              onToggleFollow={handleToggleFollow}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
