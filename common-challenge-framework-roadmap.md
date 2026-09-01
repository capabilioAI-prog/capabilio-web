# Common Challenge Framework — Phased Roadmap

## Why this is a roadmap, not a patch

The spec you shared (Foundation → Master tiers, 10 stream-specific category
taxonomies, per-stream workspace types like Notebook/Terminal/CAD
Viewer/PLC Ladder, plus Hints/Test Cases/Discussion/Explanation panels) is a
new content and product surface, not a styling change to the existing
Academic Workspace. Today the platform has exactly one evaluation path for
College Stream: a rubric-scored free-text answer, run through
`backend/server/lib/collegeStream/`, stored in `experiments` /
`college_submissions`. None of the following exist yet, for any stream:

- A difficulty **progression gate** (Foundation → Core → Applied → Industry
  → Master) — currently all experiments in a stream are flat and
  open-order.
- A **category taxonomy** per stream (e.g. CSE's "Operating Systems" vs
  "System Design") — `units`/`subjects` map to a curriculum syllabus
  structure, not this category system.
- **Challenge types** (Debug, Case Study, Simulation, Design, Data
  Analysis, Optimization, Scenario Response, Report Writing, Viva) — only
  free-text answer exists.
- **Stream-specific workspaces** — Notebook+charts for AI/DS, Terminal+log
  viewer for Cyber Security, CAD viewer for Mechanical, circuit
  diagram/waveform for ECE, PLC ladder for EEE, etc. Building even one of
  these (e.g. a real Jupyter-style Python notebook with dataset viewer and
  chart rendering) is itself a multi-week effort — nine of them is a
  distinct initiative per stream.
- **Hints, Test Cases, Discussion, Explanation panels** — no schema, no
  content, no backing data. Per your own project rules, these can't be
  added as decorative empty tabs; they'd need real content and, for
  Discussion, a real moderated thread system (Capabilio already has one
  workflow-rule against building a second chat/discussion system —
  reuse the existing chat/coordination system if this is pursued).

Given the project's "no duplicate systems," "no fabricated data," and
"small, focused changes" rules, this has to be phased and content has to be
authored per stream before the workspace type for that stream is built.

## Phase 0 — Decisions needed before any schema work

1. **Scope order**: which stream(s) get the full framework first? CSE and
   AI & Data Science are the only two with real curriculum content today
   (per the earlier content audit — `semester_subjects` join table shares
   DSA across ai-ds/ai-ml/cyber-security/mca/cse). Building the framework
   for a stream with zero experiments seeded is wasted UI work.
2. **Relationship to existing curriculum structure**: does the tier
   (Foundation/Core/Applied/Industry/Master) replace the semester-based
   drill-down, or sit alongside it as a second axis? Recommendation: keep
   `semesters`/`subjects`/`units` as the syllabus map (unchanged, still
   used for the "browse by semester" fallback), and add tier as a new,
   independent column on `experiments` — additive, backward-compatible,
   no destructive rename.
3. **Challenge type**: is this a single new `challenge_type` enum column
   on `experiments`, or does each type need its own submission-evaluation
   code path (a Debug challenge is scored differently from a Simulation)?
   The latter is the honest answer — each type needs its own deterministic
   evaluator, mirroring how Domain Role (SQL sandbox) and College Stream
   (rubric) are already two separate, non-shared evaluation branches per
   your architecture rule.
4. **Workspace types**: which ones are real product bets vs. "nice to
   have"? Recommend starting with the two cheapest to build well: Notebook
   (Python + dataset viewer + charts, for AI/DS and AI/ML) and Terminal
   (command execution + log viewer, for Cyber Security and MCA), since
   Capabilio already has a sandboxed execution pattern (`sqlSandbox.js`) to
   extend rather than invent from scratch.

## Phase 1 — Schema (additive only)

```sql
-- New, nullable columns — zero impact on existing rows or the current flat grid.
alter table experiments add column if not exists tier text; -- 'foundation'|'core'|'applied'|'industry'|'master'
alter table experiments add column if not exists challenge_type text; -- 'coding'|'debug'|'case_study'|'simulation'|'design'|'data_analysis'|'optimization'|'scenario_response'|'report_writing'|'viva'
alter table experiments add column if not exists category text; -- stream-specific taxonomy label, e.g. 'Operating Systems'
alter table experiments add column if not exists estimated_minutes int;

-- New table: per-stream category taxonomy, so the UI can render a real
-- filter instead of a hardcoded list per stream.
create table if not exists stream_categories (
  id uuid primary key default gen_random_uuid(),
  stream_id uuid references streams(id) not null,
  name text not null,
  sequence int not null default 0
);

-- New table: per-stream declared workspace type, so the frontend knows
-- which workspace component to mount for a given stream (no per-stream
-- if/else sprawl in the experiment page).
create table if not exists stream_workspace_config (
  stream_id uuid primary key references streams(id),
  workspace_type text not null -- 'notebook'|'terminal'|'cad_viewer'|'circuit_diagram'|'plc_ladder'|'excel_editor'|'text_answer' (current default)
);
```

Existing `experiments` rows get `tier = null`, treated as ungated/legacy —
the frontend falls back to the current flat grid when `tier` is null, so
nothing breaks for streams that haven't been migrated to the new framework
yet. RLS: these are read-mostly reference tables — same public-read /
admin-write policy as `streams`/`subjects` today.

## Phase 2 — Progression gating (backend)

- `GET /streams/:slug/all-experiments` (already built) gets a `locked`
  flag per experiment when `tier` is set: locked until the student has
  passed a minimum count/percentage of the previous tier's experiments in
  that stream. This is a deterministic, server-enforced rule — same
  pattern as the existing quota/lock checks in `arenaDomainRole.js` /
  `arenaCollegeStream.js` (never trust client-side gating alone).
- New submit-time check mirroring the existing lock-after-pass check:
  reject submission with 403 if the experiment's tier is still locked for
  this user.

## Phase 3 — One new workspace type, end to end

Pick Notebook first (highest leverage — covers AI & Data Science and AI &
ML, the two streams that already have real ELO/skill demand per Capabilio's
positioning). Scope:

- Sandboxed Python execution (reuse the existing sandbox-execution
  pattern/infra from `sqlSandbox.js` — new `pythonSandbox.js`, same
  isolation and timeout discipline).
- Dataset viewer (read-only table render — `ResultTable` component already
  exists and can be reused as-is).
- Chart output rendering (matplotlib/plotly figure capture from the
  sandboxed run, returned as an image or JSON spec).
- Deterministic scoring: compare notebook output (values, dataframe shape,
  chart type) against an expected-output spec, same "deterministic
  evaluator, AI adds explanation only" boundary already enforced for SQL
  and rubric evaluation.

This alone — sandboxed Python execution with resource limits, dataset
viewer, and chart capture — is comparable in size to the entire SQL
sandbox system already in the codebase. Budget accordingly before
committing to a timeline.

## Phase 4 — Content authoring

None of this has value without real challenges. Foundation-tier content for
one stream (say 15–20 CSE "Programming" challenges) needs to be authored
and seeded before Phase 2's gating logic has anything real to gate. This is
a content production task, not an engineering one — recommend scoping it
in parallel with Phase 1, not after.

## Phase 5 — Repeat per stream

Each additional stream is: seed `stream_categories`, seed
`stream_workspace_config`, author tier-appropriate content, and — only if
the stream needs a workspace type that doesn't exist yet — build that
workspace type (Phase 3-sized effort each).

## What ships without any of the above

The two changes already implemented today — the duplicate summary card
removed from Academic Workspace, and the LeetCode-style experiment page
restyled with clear Problem Statement / Answer / Result sections and a
metadata sidebar consistent with the Professional Workspace's visual
language — get you a materially more "production" feel on the *existing*
text-answer format, with zero schema risk. That's a reasonable place to
stop and gather stream-by-stream content commitments before Phase 1 starts.
