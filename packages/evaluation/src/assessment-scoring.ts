// Capabilio Career Calibration Assessment Scoring Engine
// Implements the centralized Capabilio "1/3 Formula" for ELO calibration
//
// 1/3 Formula Details:
// - Starting baseline ELO for students: 400
// - Question Difficulty Weights:
//   * Easy (Foundation Q1-8): Weight = 1/3 (0.333) -> Smallest impact
//   * Applied (Entry Applied Q9-17): Weight = 2/3 (0.667) -> Medium impact
//   * Scenario / Challenging (Q18-25): Weight = 3/3 (1.000) -> Full impact
// - Correct answer: Positive ELO movement
// - Wrong answer: Negative ELO movement
// - Harder questions yield higher potential positive impact for correct answers

export interface AssessmentQuestionScoringInput {
  questionId: string;
  difficulty: 'easy' | 'applied' | 'scenario' | 'challenging';
  skillSlug: string;
  skillName: string;
  isCorrect: boolean;
  timeSpentSeconds?: number;
}

export interface AssessmentEvaluationResult {
  startingElo: number;
  finalElo: number;
  eloChange: number;
  score: number; // total correct
  totalQuestions: number;
  accuracy: number; // percentage
  skillScores: Array<{
    skillSlug: string;
    skillName: string;
    score: number; // 0-100%
    questionsCount: number;
    correctCount: number;
    status: 'Strong' | 'Developing' | 'Needs Work';
  }>;
  strengths: string[];
  weaknesses: string[];
  aiFeedback: {
    summary: string;
    strengthsNote: string;
    weaknessesNote: string;
    nextLearningAction: string;
  };
}

// Configurable Scoring Constants
export const ASSESSMENT_CONFIG = {
  STARTING_ELO: 400,
  BASE_K_FACTOR: 36,
  MIN_ELO_FLOOR: 350,
  MAX_CALIBRATION_CEILING: 750,
  DIFFICULTY_TARGET_RATINGS: {
    easy: 400,
    applied: 500,
    scenario: 600,
    challenging: 700,
  },
  // Capabilio 1/3 Rule multipliers
  DIFFICULTY_WEIGHTS: {
    easy: 1 / 3,        // 0.333
    applied: 2 / 3,     // 0.667
    scenario: 3 / 3,    // 1.000
    challenging: 3 / 3, // 1.000
  }
};

export function calculateExpectedScore(userRating: number, questionRating: number): number {
  return 1 / (1 + Math.pow(10, (questionRating - userRating) / 400));
}

export function evaluateCareerAssessment(
  roleName: string,
  answers: AssessmentQuestionScoringInput[],
  startingElo: number = ASSESSMENT_CONFIG.STARTING_ELO
): AssessmentEvaluationResult {
  let currentElo = startingElo;
  let totalCorrect = 0;
  const totalQuestions = answers.length;

  const skillAccumulator: Record<string, {
    skillName: string;
    total: number;
    correct: number;
  }> = {};

  for (const ans of answers) {
    if (ans.isCorrect) totalCorrect++;

    // Track skill stats
    if (!skillAccumulator[ans.skillSlug]) {
      skillAccumulator[ans.skillSlug] = {
        skillName: ans.skillName,
        total: 0,
        correct: 0,
      };
    }
    skillAccumulator[ans.skillSlug]!.total += 1;
    if (ans.isCorrect) skillAccumulator[ans.skillSlug]!.correct += 1;

    // Apply Capabilio 1/3 Formula per question
    const qRating = ASSESSMENT_CONFIG.DIFFICULTY_TARGET_RATINGS[ans.difficulty] || 500;
    const diffWeight = ASSESSMENT_CONFIG.DIFFICULTY_WEIGHTS[ans.difficulty] || 0.667;
    const expected = calculateExpectedScore(currentElo, qRating);
    const actual = ans.isCorrect ? 1.0 : 0.0;

    // Delta calculation with 1/3 difficulty scaling
    const delta = ASSESSMENT_CONFIG.BASE_K_FACTOR * diffWeight * (actual - expected);
    currentElo = currentElo + delta;
  }

  const finalElo = Math.max(
    ASSESSMENT_CONFIG.MIN_ELO_FLOOR,
    Math.min(ASSESSMENT_CONFIG.MAX_CALIBRATION_CEILING, Math.round(currentElo))
  );
  const eloChange = finalElo - startingElo;
  const accuracy = Math.round((totalCorrect / Math.max(1, totalQuestions)) * 100);

  // Calculate normalized skill scores
  const skillScores = Object.entries(skillAccumulator).map(([slug, data]) => {
    const pct = Math.round((data.correct / Math.max(1, data.total)) * 100);
    const status: 'Strong' | 'Developing' | 'Needs Work' =
      pct >= 75 ? 'Strong' : pct >= 50 ? 'Developing' : 'Needs Work';

    return {
      skillSlug: slug,
      skillName: data.skillName,
      score: pct,
      questionsCount: data.total,
      correctCount: data.correct,
      status,
    };
  });

  // Calculate Strengths & Weaknesses
  const strengths = skillScores
    .filter(s => s.status === 'Strong' || s.score >= 70)
    .map(s => `${s.skillName} (${s.correctCount}/${s.questionsCount} correct — ${s.score}%)`);

  const weaknesses = skillScores
    .filter(s => s.status === 'Needs Work' || s.score < 60)
    .map(s => `${s.skillName} (${s.correctCount}/${s.questionsCount} correct — ${s.score}%)`);

  // Generate role-specific AI feedback
  const topStrength = strengths[0] || 'Core technical foundations';
  const topWeakness = weaknesses[0] || 'Advanced practical edge cases';

  const aiFeedback = {
    summary: `You completed the ${roleName} Career Calibration with an accuracy of ${accuracy}% (${totalCorrect}/${totalQuestions} correct), calibrating your initial Career ELO to ${finalElo}.`,
    strengthsNote: `Demonstrated strong conceptual understanding in ${topStrength}. You have a solid grasp of entry-level principles.`,
    weaknessesNote: `Identified primary growth opportunity in ${topWeakness}. Developing hands-on practical intuition here will maximize your job readiness.`,
    nextLearningAction: `Launch your first Arena sprint workstation ticket to practice ${topWeakness.split(' (')[0]} in a realistic simulated company environment.`,
  };

  return {
    startingElo,
    finalElo,
    eloChange,
    score: totalCorrect,
    totalQuestions,
    accuracy,
    skillScores,
    strengths: strengths.length > 0 ? strengths : ['Core entry-level foundations demonstrated'],
    weaknesses: weaknesses.length > 0 ? weaknesses : ['Continue building hands-on Arena practice depth'],
    aiFeedback,
  };
}
