# Capabilio

**AI-powered Career Operating System**

Capabilio helps students and professionals build measurable skills through real-world work simulation — not traditional education.

> "I didn't just learn this skill. I actually performed the work."

## Products

| Product | Description |
|---------|-------------|
| **AURA** | Career intelligence and personal dashboard |
| **ARENA** | Real-world professional work simulation |
| **SKILL STUDIO** | Skill development and guided improvement |
| **LAUNCHPAD** | Career opportunities and skill-based matching |
| **PULSE** | Professional knowledge and industry feed |
| **CODE DNA** | Technical capability and coding intelligence |
| **VAULT** | Career evidence, documents and artifacts |

## Repository Structure

```
capabilio/
├── apps/
│   ├── web/          # Next.js 14 frontend
│   └── api/          # Next.js API (Route Handlers)
├── packages/
│   ├── ui/           # Design system
│   ├── types/        # Shared TypeScript types
│   ├── config/       # Shared configs
│   ├── db/           # Database schema + migrations
│   ├── ai/           # AI service + provider adapters
│   ├── evaluation/   # Deterministic evaluation engine
│   └── workspaces/   # Workspace type system
```

## Getting Started

```bash
# Install dependencies
pnpm install

# Set up environment
cp .env.example .env.local
# Fill in your Supabase + AI provider credentials

# Push database schema
pnpm db:push

# Seed initial data
pnpm db:seed

# Start development
pnpm dev
```

## Tech Stack

- **Monorepo**: Turborepo + pnpm workspaces
- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Next.js Route Handlers
- **Database**: Supabase Postgres + Drizzle ORM
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage
- **AI**: Provider-agnostic (OpenAI / Anthropic / Gemini)
- **Code Execution**: Piston API (sandboxed)
- **Editor**: Monaco Editor