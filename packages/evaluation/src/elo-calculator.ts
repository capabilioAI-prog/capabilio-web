// Capabilio ELO system
// Based on standard ELO with modifications for:
// - Difficulty weighting
// - Pass/fail outcomes (not win/loss)
// - Score-based K-factor adjustment

export interface EloCalculationInput {
  currentElo: number;
  difficulty: 'entry' | 'mid' | 'senior' | 'lead';
  passed: boolean;
  score: number; // 0-100
}

export interface EloCalculationResult {
  newElo: number;
  delta: number;
  reason: string;
}

// Difficulty rating for the "opponent" (mission)
const DIFFICULTY_RATINGS: Record<string, number> = {
  entry: 1000,
  mid: 1200,
  senior: 1500,
  lead: 1800,
};

// K-factor: how much a single result affects ELO
const K_FACTOR = 32;

function expectedScore(playerRating: number, opponentRating: number): number {
  return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
}

export function calculateEloDelta(input: EloCalculationInput): EloCalculationResult {
  const { currentElo, difficulty, passed, score } = input;
  const difficultyRating = DIFFICULTY_RATINGS[difficulty] ?? 1200;

  // Actual score: 1 for pass, 0 for fail, with partial credit based on score
  const actualScore = passed
    ? 0.5 + (score / 200) // 0.5 to 1.0 based on score
    : score / 200;        // 0 to 0.5 based on score

  const expected = expectedScore(currentElo, difficultyRating);
  const delta = Math.round(K_FACTOR * (actualScore - expected));
  const newElo = Math.max(0, currentElo + delta);

  const reason = passed
    ? `Passed ${difficulty} mission with score ${score}/100`
    : `Did not pass ${difficulty} mission (score ${score}/100)`;

  return { newElo, delta, reason };
}
