/**
 * arena/simulations/digitalForensicsLab.js — the Cybersecurity "Digital
 * Forensics Lab" micro-simulation. A set of file artifacts recovered
 * from a disk image, correlated by content hash and ordered by
 * timestamp — exact grouping/sorting over real artifact metadata, not a
 * live event stream (that's soc_incident_room's domain). Distinct object
 * set (files, hashes, created/modified/accessed timestamps, deletion
 * flags) and interaction (search by name, sort the timeline, correlate
 * by hash) from every other registered simulation.
 */

export const SIMULATION_TYPE = "digital_forensics_lab"

/** Artifacts sharing the same content hash under DIFFERENT filenames —
 *  the classic "renamed to evade detection" forensic signature. */
export function findRenamedDuplicates(artifacts) {
  const byHash = new Map()
  for (const a of artifacts) {
    if (!byHash.has(a.hash)) byHash.set(a.hash, [])
    byHash.get(a.hash).push(a)
  }
  return [...byHash.entries()]
    .filter(([, group]) => new Set(group.map((a) => a.filename)).size > 1)
    .map(([hash, group]) => ({ hash, artifacts: group }))
}

/** The artifact list sorted by one timestamp field (createdAt/modifiedAt/accessedAt). */
export function timelineSortedBy(artifacts, field) {
  return artifacts.slice().sort((a, b) => a[field] - b[field])
}

/** Case-insensitive filename/path substring search. */
export function searchArtifacts(artifacts, query) {
  const q = query.toLowerCase()
  return artifacts.filter((a) => a.filename.toLowerCase().includes(q) || a.path.toLowerCase().includes(q))
}

function hashIndex(artifacts) {
  const counts = new Map()
  for (const a of artifacts) counts.set(a.hash, (counts.get(a.hash) || 0) + 1)
  return [...counts.entries()].map(([hash, artifactCount]) => ({ hash, artifactCount }))
}

/**
 * @param {object} recipe — hidden, server-only (verification_definition.simulation).
 *   { artifacts: [{id, filename, path, createdAt, modifiedAt, accessedAt, sizeBytes, isDeleted, hash}] }
 * @returns {object} PUBLIC simulation state: every recovered artifact
 *   (given, public — the disk image's own readable contents) plus a hash
 *   index (count of artifacts per content hash) so the student can spot a
 *   reused hash worth pivoting into, without pre-computing the answer.
 */
export function generateDigitalForensicsState(recipe) {
  const { artifacts } = recipe
  return {
    simulationType: SIMULATION_TYPE,
    artifacts,
    hashIndex: hashIndex(artifacts),
  }
}
