'use client';

import React, { useState } from 'react';
import { X, Check, Sparkles, GraduationCap, Briefcase } from 'lucide-react';

interface AuraEditProfileModalProps {
  overviewData: any;
  onClose: () => void;
  onProfileUpdated: () => void;
}

export function AuraEditProfileModal({ overviewData, onClose, onProfileUpdated }: AuraEditProfileModalProps) {
  const [displayName, setDisplayName] = useState(overviewData?.profile?.displayName || '');
  const [headline, setHeadline] = useState(overviewData?.profile?.headline || '');
  const [collegeName, setCollegeName] = useState(overviewData?.profile?.collegeName || '');
  const [universityName, setUniversityName] = useState(overviewData?.profile?.universityName || '');
  const [department, setDepartment] = useState(overviewData?.profile?.department || '');
  const [stream, setStream] = useState(overviewData?.profile?.stream || 'CSE');
  const [graduationYear, setGraduationYear] = useState(overviewData?.profile?.graduationYear || '2026');
  const [targetRoleSlug, setTargetRoleSlug] = useState(overviewData?.activeRole?.slug || 'data-analyst');
  const [currentLevel, setCurrentLevel] = useState(overviewData?.activeRole?.level || 'student');
  const [timeline, setTimeline] = useState(overviewData?.activeRole?.timeline || 'immediate');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const STREAMS = [
    'CSE',
    'IT',
    'AI & ML',
    'AI & Data Science',
    'ECE',
    'EEE',
    'Mechanical',
    'Civil',
    'Cyber Security',
    'MBA',
    'MCA'
  ];

  const ROLES = [
    { slug: 'data-analyst', name: 'Data Analyst' },
    { slug: 'database-administrator', name: 'Database Administrator' },
    { slug: 'software-engineer', name: 'Software Engineer' },
    { slug: 'frontend-developer', name: 'Frontend Developer' },
    { slug: 'backend-developer', name: 'Backend Developer' },
    { slug: 'fullstack-developer', name: 'Full Stack Developer' },
    { slug: 'ml-ai-engineer', name: 'ML / AI Engineer' },
    { slug: 'cybersecurity-analyst', name: 'Cybersecurity Analyst' },
    { slug: 'devops-engineer', name: 'DevOps Engineer' },
    { slug: 'civil-engineer', name: 'Civil Engineer' },
    { slug: 'mechanical-engineer', name: 'Mechanical Engineer' },
    { slug: 'product-manager', name: 'Product Manager (MBA)' },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch('http://localhost:3001/api/aura/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          displayName: displayName.trim(),
          headline: headline.trim(),
          collegeName: collegeName.trim(),
          universityName: universityName.trim(),
          department: department.trim(),
          stream: stream.trim(),
          graduationYear: graduationYear.trim(),
          targetRoleSlug,
          currentLevel,
          timeline,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onProfileUpdated();
        onClose();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-xl bg-card border border-border rounded-2xl p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand" />
            <h3 className="text-base font-bold text-foreground font-mono uppercase">
              Edit Career Profile & Target Role
            </h3>
          </div>
          <button onClick={onClose} data-testid="close-edit-profile" className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Personal Info */}
          <div className="space-y-3">
            <h4 className="font-mono text-2xs font-bold text-brand uppercase tracking-wider">Candidate Identity</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Full Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  data-testid="input-display-name"
                  className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl text-xs text-foreground focus:border-brand focus:outline-hidden"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Headline / Professional Bio</label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g. CSE Student @ BITS Pilani"
                  className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl text-xs text-foreground focus:border-brand focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Academic Profile */}
          <div className="space-y-3 pt-2 border-t border-border/80">
            <h4 className="font-mono text-2xs font-bold text-brand uppercase tracking-wider flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Academic Institution & Stream</span>
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">College / University Name</label>
                <input
                  type="text"
                  value={collegeName}
                  onChange={(e) => setCollegeName(e.target.value)}
                  placeholder="e.g. BITS Pilani"
                  required
                  data-testid="input-college-name"
                  className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl text-xs text-foreground focus:border-brand focus:outline-hidden"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Academic Stream / Branch</label>
                <select
                  value={stream}
                  onChange={(e) => setStream(e.target.value)}
                  data-testid="select-stream"
                  className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl text-xs text-foreground focus:border-brand focus:outline-hidden"
                >
                  {STREAMS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Department (Optional)</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Computer Science Engineering"
                  className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl text-xs text-foreground focus:border-brand focus:outline-hidden"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Graduation Year</label>
                <input
                  type="text"
                  value={graduationYear}
                  onChange={(e) => setGraduationYear(e.target.value)}
                  placeholder="2026"
                  className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl text-xs text-foreground focus:border-brand focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Target Role & Career Goal */}
          <div className="space-y-3 pt-2 border-t border-border/80">
            <h4 className="font-mono text-2xs font-bold text-brand uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5" />
              <span>Target Role & Career Level</span>
            </h4>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Active Target Role (Recalibrates Career OS)</label>
              <select
                value={targetRoleSlug}
                onChange={(e) => setTargetRoleSlug(e.target.value)}
                data-testid="select-target-role"
                className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl text-xs text-foreground focus:border-brand focus:outline-hidden font-bold"
              >
                {ROLES.map(r => (
                  <option key={r.slug} value={r.slug}>{r.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Current Level</label>
                <select
                  value={currentLevel}
                  onChange={(e) => setCurrentLevel(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl text-xs text-foreground focus:border-brand focus:outline-hidden"
                >
                  <option value="student">Student / Fresher</option>
                  <option value="entry">Entry-Level</option>
                  <option value="mid">Mid-Level</option>
                  <option value="senior">Senior</option>
                  <option value="lead">Lead / Staff</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Career Timeline</label>
                <select
                  value={timeline}
                  onChange={(e) => setTimeline(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl text-xs text-foreground focus:border-brand focus:outline-hidden"
                >
                  <option value="immediate">Immediate</option>
                  <option value="3_months">Next 3 Months</option>
                  <option value="6_months">Next 6 Months</option>
                  <option value="1_year">Within 1 Year</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-border flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              data-testid="save-profile-btn"
              className="px-5 py-2 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-semibold shadow-xs"
            >
              {isSubmitting ? 'Saving...' : 'Save & Recalibrate OS'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
