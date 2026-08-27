import crypto from 'crypto';
import { db, auraDocuments, portfolioItems } from '@capabilio/db';
import { eq, and } from 'drizzle-orm';

export interface EvidenceRecordInput {
  userId: string;
  roleId: string;
  roleSlug: string;
  missionId: string;
  scenarioTitle: string;
  scenarioFamily: string;
  difficulty: string;
  score: number;
  passed: boolean;
  eloBefore: number;
  eloDelta: number;
  eloAfter: number;
  subscores: any;
  skillsDemonstrated: Array<{ name: string; score?: number }>;
  deliverables: {
    sql?: string;
    summary?: string;
    recommendation?: string;
    executionResults?: any;
  };
  mentorFeedback: string;
  hintsUsedCount: number;
  startedAt?: Date;
  completedAt?: Date;
}

export interface MintedEvidenceProof {
  proofId: string;
  verificationHash: string;
  timestamp: string;
  evidenceSummary: string;
  vaultDocumentId?: string;
  portfolioItemId?: string;
}

export function generateVerificationHash(input: EvidenceRecordInput): string {
  const payload = [
    input.userId,
    input.missionId,
    input.roleSlug,
    input.score.toString(),
    input.eloDelta.toString(),
    input.deliverables.sql || '',
    input.deliverables.summary || '',
    Date.now().toString(),
  ].join('::');

  return `sha256:${crypto.createHash('sha256').update(payload).digest('hex')}`;
}

export async function mintAndSyncEvidence(input: EvidenceRecordInput): Promise<MintedEvidenceProof> {
  const verificationHash = generateVerificationHash(input);
  const now = new Date();

  // 1. Synchronize to Aura Vault
  const vaultDoc = await db.insert(auraDocuments).values({
    userId: input.userId as any,
    category: 'arena_proof',
    title: `${input.roleSlug === 'database-administrator' ? 'DBA Incident Audit' : 'Analytics Task Proof'}: ${input.scenarioTitle} (${input.score}/100)`,
    description: input.passed
      ? `Capability demonstrated. Score: ${input.score}/100. ELO: ${input.eloBefore} → ${input.eloAfter} (+${input.eloDelta}). Verified SHA-256 Proof.`
      : `Performance below baseline. Score: ${input.score}/100. ELO: ${input.eloBefore} → ${input.eloAfter} (${input.eloDelta}). Skill regression recorded.`,
    fileName: `proof_${input.missionId.slice(0, 12)}_${now.getTime()}.json`,
    fileSizeBytes: 4096,
    mimeType: 'application/json',
    verified: input.passed,
    verificationHash,
  }).returning();

  let portfolioItemId: string | undefined = undefined;

  // 2. Synchronize to public Portfolio (Passing attempts become featured public items)
  if (input.passed && input.roleId) {
    const portItem = await db.insert(portfolioItems).values({
      userId: input.userId as any,
      roleId: input.roleId as any,
      title: input.scenarioTitle,
      description: `Solved real-world production workstation scenario. Score: ${input.score}/100 (+${input.eloDelta} ELO). Cryptographically verified.`,
      missionTitle: input.scenarioTitle,
      difficulty: input.difficulty,
      score: input.score,
      skills: input.skillsDemonstrated.map(s => ({ skillId: s.name.toLowerCase().replace(/[^a-z0-9]/g, '-'), skillName: s.name })),
      artifactIds: [],
      visibility: 'public',
      isFeatured: true,
    }).returning();
    if (portItem && portItem[0]) {
      portfolioItemId = portItem[0].id;
    }
  }

  return {
    proofId: vaultDoc[0]?.id || `proof_${Date.now()}`,
    verificationHash,
    timestamp: now.toISOString(),
    evidenceSummary: input.passed
      ? `Verified demonstrated capability in ${input.skillsDemonstrated.map(s => s.name).join(', ')}`
      : `Identified growth area in ${input.skillsDemonstrated.map(s => s.name).join(', ')}`,
    vaultDocumentId: vaultDoc[0]?.id,
    portfolioItemId,
  };
}
