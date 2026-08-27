'use client';

import React, { useEffect, useState } from 'react';
import { 
  FolderLock, 
  FileText, 
  ShieldCheck, 
  Download, 
  Trash2, 
  Plus, 
  Upload, 
  Award, 
  ExternalLink,
  CheckCircle2,
  Lock,
  FileCode
} from 'lucide-react';

export function AuraVaultTab() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [isUploading, setIsUploading] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('project');
  const [newFileName, setNewFileName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocs();
  }, []);

  async function fetchDocs() {
    try {
      const res = await fetch('http://localhost:3001/api/aura/vault', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setDocuments(data.data.documents || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddDocument(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() || !newFileName.trim()) return;

    try {
      const res = await fetch('http://localhost:3001/api/aura/vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: newTitle.trim(),
          category: newCategory,
          fileName: newFileName.trim(),
          description: newDesc.trim() || undefined,
          verified: false,
          verificationHash: `sha256:usr_${Date.now().toString(16)}`,
          fileSizeBytes: 2048,
          mimeType: 'application/pdf',
        }),
      });
      const data = await res.json();
      if (data.success && data.data.document) {
        setDocuments([data.data.document, ...documents]);
        setIsUploading(false);
        setNewTitle('');
        setNewFileName('');
        setNewDesc('');
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`http://localhost:3001/api/aura/vault/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      setDocuments(documents.filter(d => d.id !== id));
    } catch (e) {
      console.error(e);
    }
  }

  const filteredDocs = activeCategory === 'all'
    ? documents
    : documents.filter(d => d.category === activeCategory);

  const CATEGORIES = [
    { id: 'all', label: 'All Artifacts' },
    { id: 'arena_proof', label: 'Arena Proof Records' },
    { id: 'interview_report', label: 'AI Interview Reports' },
    { id: 'resume', label: 'Resumes' },
    { id: 'project', label: 'Projects & Repos' },
    { id: 'certificate', label: 'Certificates' },
  ];

  return (
    <div className="space-y-8 font-sans">
      {/* Vault Header Card */}
      <div className="p-6 sm:p-8 rounded-2xl border border-border bg-card shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <FolderLock className="w-5 h-5 text-brand" />
              <span>Career & Evidence Vault</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Your cryptographic career evidence repository. Securely store and share verified Arena test logs, interview evaluations, and project artifacts.
            </p>
          </div>

          <button
            onClick={() => setIsUploading(!isUploading)}
            className="px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Artifact</span>
          </button>
        </div>

        {/* Upload Form Modal/Box */}
        {isUploading && (
          <form onSubmit={handleAddDocument} className="p-4 bg-muted/30 rounded-xl border border-border space-y-3 pt-4">
            <div className="font-semibold text-xs text-foreground font-mono uppercase">
              Upload New Career Artifact
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Artifact Title (e.g. Distributed Rate Limiter Benchmark)"
                required
                className="px-3 py-2 bg-card border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-hidden"
              />
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="px-3 py-2 bg-card border border-border rounded-xl text-xs text-foreground focus:border-brand focus:outline-hidden"
              >
                <option value="project">Project / Case Study</option>
                <option value="resume">Resume PDF</option>
                <option value="certificate">Certification</option>
                <option value="portfolio_artifact">Portfolio Work Sample</option>
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <input
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="File Name (e.g. rate_limiter_spec.pdf)"
                required
                className="px-3 py-2 bg-card border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-hidden"
              />
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Short description / notes..."
                className="px-3 py-2 bg-card border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-hidden"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsUploading(false)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-brand hover:bg-brand-hover text-white text-xs font-semibold"
              >
                Save to Vault
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar text-xs">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={
              activeCategory === cat.id
                ? 'px-3.5 py-2 rounded-xl bg-foreground text-background font-semibold whitespace-nowrap shadow-2xs transition-colors'
                : 'px-3.5 py-2 rounded-xl bg-muted/60 text-muted-foreground hover:text-foreground whitespace-nowrap border border-border/50 transition-colors'
            }
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Vault Items Grid */}
      {filteredDocs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map(doc => (
            <div
              key={doc.id}
              className="p-5 rounded-2xl border border-border bg-card shadow-2xs hover:border-brand/40 space-y-3 transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground">
                    {doc.category.replace('_', ' ')}
                  </span>
                  {doc.verified && (
                    <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-600 font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Verified</span>
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="font-bold text-sm text-foreground">
                    {doc.title}
                  </h4>
                  {doc.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {doc.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-border/80">
                <div className="text-[11px] font-mono text-muted-foreground flex items-center justify-between">
                  <span>{doc.fileName}</span>
                  {doc.verificationHash && (
                    <span className="text-brand font-bold">{doc.verificationHash.slice(0, 14)}...</span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="p-1 text-muted-foreground hover:text-red-500 transition-colors"
                      title="Delete from Vault"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center rounded-2xl border border-border bg-card space-y-3">
          <FolderLock className="w-8 h-8 text-muted-foreground mx-auto" />
          <div className="font-bold text-sm text-foreground">No artifacts in this category</div>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Complete Arena tickets, conduct AI interviews, or upload personal project documentation to populate your Vault.
          </p>
        </div>
      )}
    </div>
  );
}
