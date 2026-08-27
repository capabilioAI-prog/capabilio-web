const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const GLOBAL_SCREENSHOT_DIR = '/Users/venkatagopichandkopuri/.gemini/antigravity/brain/fbd8a493-ef67-4b2c-bc86-93c8a81a979a/screenshots';
if (!fs.existsSync(GLOBAL_SCREENSHOT_DIR)) {
  fs.mkdirSync(GLOBAL_SCREENSHOT_DIR, { recursive: true });
}

async function runDualTrackAcceptance() {
  console.log('================================================================================');
  console.log('CAPABILIO ARENA V1.2 — DUAL TRACK ARENA ACCEPTANCE SUITE (CHROME)');
  console.log('================================================================================\n');

  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();
  const testResults = {};

  try {
    // -------------------------------------------------------------------------
    // 1. REGISTER & AUTHENTICATE STUDENT WITH STREAM (CSE) & CAREER ROLE (Data Analyst)
    // -------------------------------------------------------------------------
    console.log('--- STEP 1: Registration with Stream (CSE) & Career Role (Data Analyst) ---');
    await page.goto('http://localhost:3000/register', { waitUntil: 'networkidle' });
    
    const timestamp = Math.floor(Date.now() / 1000) % 10000;
    const testName = `Aditya CSE ${timestamp}`;
    const testEmail = `cse_arena_${Date.now()}@capabilio.test`;

    await page.fill('input[name="displayName"]', testName);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'CapabilioPass2026!');
    await page.fill('input[name="collegeName"]', 'ABC Engineering College');
        await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);

    // Set career calibration role to Data Analyst
    await page.evaluate(async () => {
      await fetch('http://localhost:3001/api/onboarding/calibration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ roleSlug: 'data-analyst', answers: {} }),
      });
    });

    // -------------------------------------------------------------------------
    // 2. VERIFY DUAL TRACK ARENA CARDS
    // -------------------------------------------------------------------------
    console.log('\n--- STEP 2: Verify Dual Track Arena Cards ---');
    await page.goto('http://localhost:3000/arena', { waitUntil: 'networkidle' });
    await page.waitForSelector('text=CAREER ROLE ARENA', { timeout: 10000 });

    const hasCareerCard = await page.locator('h2:has-text("Data Analyst")').count() > 0;
    const hasStreamCard = await page.locator('h2:has-text("Computer Science & Engineering")').count() > 0;

    console.log('  Career Role Card (Data Analyst): ' + hasCareerCard);
    console.log('  Stream Card (CSE Stream): ' + hasStreamCard);

    await page.screenshot({ path: path.join(GLOBAL_SCREENSHOT_DIR, '71_v12_dual_track_arena_overview.png') });

    testResults['1_dual_track_cards'] = hasCareerCard && hasStreamCard ? 'PASS' : 'FAIL';
    console.log('  [Step 2 Result]: ' + testResults['1_dual_track_cards']);

    // -------------------------------------------------------------------------
    // 3. VERIFY STREAKS TAB
    // -------------------------------------------------------------------------
    console.log('\n--- STEP 3: Verify Streaks Tab ---');
    await page.click('[data-testid="nav-tab-streaks"]');
    await page.waitForSelector('text=Practice Consistency & Streaks', { timeout: 10000 });
    await page.waitForTimeout(500);

    const streakHeader = await page.locator('text=DAY STREAK').count() > 0;
    await page.screenshot({ path: path.join(GLOBAL_SCREENSHOT_DIR, '76_v12_streaks_tracker.png') });

    testResults['2_streaks_tab'] = streakHeader ? 'PASS' : 'FAIL';
    console.log('  [Step 3 Result]: ' + testResults['2_streaks_tab']);

    // -------------------------------------------------------------------------
    // 4. VERIFY LEADERBOARD TAB (CAREER & STREAM TOGGLE)
    // -------------------------------------------------------------------------
    console.log('\n--- STEP 4: Verify Leaderboard Tab ---');
    await page.click('[data-testid="nav-tab-leaderboard"]');
    await page.waitForSelector('text=Verified Capability Leaderboard', { timeout: 10000 });
    await page.waitForTimeout(500);

    const hasCareerLeaderboard = await page.locator('th:has-text("Career ELO")').count() > 0;
    
    // Switch to Stream Leaderboard
    await page.click('button:has-text("Stream (CSE)")');
    await page.waitForTimeout(500);
    const hasStreamLeaderboard = await page.locator('th:has-text("Stream Rating")').count() > 0;

    await page.screenshot({ path: path.join(GLOBAL_SCREENSHOT_DIR, '77_v12_leaderboard_stream.png') });

    testResults['3_leaderboard_tabs'] = hasCareerLeaderboard && hasStreamLeaderboard ? 'PASS' : 'FAIL';
    console.log('  [Step 4 Result]: ' + testResults['3_leaderboard_tabs']);



    // -------------------------------------------------------------------------
    // 6. RETURN TO MISSIONS TAB & COMPLETE CAREER WORKSTATION MISSION
    // -------------------------------------------------------------------------
    console.log('\n--- STEP 6: Complete Career Mission & Verify Locking ---');
    await page.click('[data-testid="nav-tab-missions"]');
    await page.waitForSelector('text=CAREER ROLE ARENA', { timeout: 10000 });
    await page.waitForTimeout(300);

    await page.click('text=Enter Workstation');
    await page.waitForSelector('text=DATA ANALYST WORKSTATION', { timeout: 10000 });

    // Open SQL Editor & Execute real SQL
    await page.click('button:has-text("SQL Editor")');
    await page.waitForTimeout(300);
    await page.fill('textarea[placeholder*="Write your SQL"]', 'SELECT u.plan_tier, COUNT(DISTINCT u.user_id) AS total_users FROM users u GROUP BY 1 ORDER BY 2 DESC;');
    await page.click('button:has-text("Run SQL Query")');
    await page.waitForSelector('text=rows returned', { timeout: 10000 });

    // Fill Executive Deliverables
    await page.click('button:has-text("Executive Summary")');
    await page.waitForTimeout(300);
    await page.fill(
      'textarea[placeholder*="Write your executive summary"]',
      'Q3 cohort retention analysis reveals an acute 48.33% attrition rate in the Pro plan between Week 1 and Week 4, while Enterprise retention remains stable at 96%.'
    );
    await page.fill(
      'textarea[placeholder*="What specific actions"]',
      'Revise the Pro tier onboarding walkthrough and implement automated re-engagement triggers in week 3 before trial renewal.'
    );

    // Navigate to submission panel
    await page.click('button:has-text("Submission Panel")');
    await page.waitForTimeout(300);

    // Submit for evaluation
    await page.click('button:has-text("Submit Complete Work (+18 ELO)")');
    await page.waitForSelector('text=Capability demonstrated.', { timeout: 12000 });

    const evalSuccess = await page.locator('text=+18 ELO').count() > 0;
    console.log('  Career mission evaluated (+18 ELO): ' + evalSuccess);

    await page.screenshot({ path: path.join(GLOBAL_SCREENSHOT_DIR, '72_v12_career_mission_passed.png') });

    // Return to Arena
    await page.click('button:has-text("Return to Arena")');
    await page.waitForTimeout(500);
    await page.goto('http://localhost:3000/arena', { waitUntil: 'networkidle' });
    await page.waitForSelector('text=CAREER ROLE ARENA', { timeout: 10000 });

    // Verify Next Mission is Locked with real timer for Free plan
    const lockedNextCard = (await page.locator('text=NEXT CAREER MISSION').count() > 0) || (await page.locator('text=Unlocks in').count() > 0);
    console.log('  Next Mission Locked with countdown timer: ' + lockedNextCard);

    testResults['5_career_mission_locking'] = evalSuccess && lockedNextCard ? 'PASS' : 'FAIL';
    console.log('  [Step 6 Result]: ' + testResults['5_career_mission_locking']);

    // -------------------------------------------------------------------------
    // 7. ATTEMPT DUPLICATE SUBMISSION OF SAME CAREER MISSION (REJECTED)
    // -------------------------------------------------------------------------
    console.log('\n--- STEP 7: Tamper Test - Resubmit Completed Mission ---');
    const duplicateRes = await page.evaluate(async () => {
      const res = await fetch('http://localhost:3001/api/arena/missions/da_cohort_mission/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ roleSlug: 'data-analyst', sqlCode: 'SELECT 1;' }),
      });
      return { status: res.status, data: await res.json() };
    });

    const isDuplicateBlocked = duplicateRes.status === 400 && (duplicateRes.data.error?.code === 'MISSION_ALREADY_COMPLETED' || duplicateRes.data.error?.message === 'MISSION_ALREADY_COMPLETED');
    console.log('  Duplicate Submission Rejected with MISSION_ALREADY_COMPLETED: ' + isDuplicateBlocked);

    testResults['6_duplicate_rejection'] = isDuplicateBlocked ? 'PASS' : 'FAIL';
    console.log('  [Step 7 Result]: ' + testResults['6_duplicate_rejection']);

    // -------------------------------------------------------------------------
    // 8. SOLVE CSE STREAM ACADEMIC CHALLENGE
    // -------------------------------------------------------------------------
    console.log('\n--- STEP 8: Solve Academic Stream Challenge (CSE) ---');
    await page.click('button:has-text("Solve Challenge")');
    await page.waitForSelector('text=CSE STREAM CHALLENGE', { timeout: 10000 });

    await page.screenshot({ path: path.join(GLOBAL_SCREENSHOT_DIR, '73_v12_stream_challenge_modal.png') });

    // Submit validated solution (+12 Pts)
    await page.click('button:has-text("Submit Validated Solution (+12 Pts)")');
    await page.waitForSelector('text=Challenge Solved & Verified.', { timeout: 10000 });

    const streamRatingDelta = await page.locator('text=+12 PTS').count() > 0;
    console.log('  Stream rating updated (+12 PTS): ' + streamRatingDelta);

    await page.screenshot({ path: path.join(GLOBAL_SCREENSHOT_DIR, '74_v12_stream_challenge_evaluation.png') });

    await page.click('button:has-text("Return to Stream Arena")');
    await page.waitForTimeout(1000);

    testResults['7_stream_challenge_solve'] = streamRatingDelta ? 'PASS' : 'FAIL';
    console.log('  [Step 8 Result]: ' + testResults['7_stream_challenge_solve']);

    // -------------------------------------------------------------------------
    // 9. VERIFY HISTORY TAB & VIEW DETAILS PROOF MODAL
    // -------------------------------------------------------------------------
    console.log('\n--- STEP 9: Verify History Tab & View Details Proof Modal ---');
    await page.click('[data-testid="nav-tab-history"]');
    await page.waitForSelector('h2:has-text("Mission History & Proof Log")', { timeout: 10000 });

    const historyCount = await page.locator('button:has-text("View Details")').count();
    console.log('  History rows rendered: ' + historyCount);

    // Open first details modal
    await page.locator('button:has-text("View Details")').first().click();
    await page.waitForSelector('text=Cryptographic Proof', { timeout: 10000 });
    await page.waitForTimeout(400);

    await page.screenshot({ path: path.join(GLOBAL_SCREENSHOT_DIR, '75_v12_history_proof_modal.png') });

    // Close proof modal
    await page.click('[data-testid="close-proof-modal"]');
    await page.waitForSelector('text=Cryptographic Proof', { state: 'detached', timeout: 5000 });
    await page.waitForTimeout(500);

    testResults['8_history_and_proof'] = historyCount >= 2 ? 'PASS' : 'FAIL';
    console.log('  [Step 9 Result]: ' + testResults['8_history_and_proof']);


    // -------------------------------------------------------------------------
    // 10. VERIFY ACHIEVEMENTS TAB (UNLOCKED POST-MISSIONS)
    // -------------------------------------------------------------------------
    console.log('\n--- STEP 10: Verify Achievements Tab ---');
    await page.click('[data-testid="nav-tab-achievements"]');
    await page.waitForSelector('text=Verified Career Achievements', { timeout: 10000 });
    await page.waitForTimeout(500);

    const unlockedBadges = await page.locator('text=✓ UNLOCKED').count();
    console.log('  Post-mission unlocked achievements count: ' + unlockedBadges);

    await page.screenshot({ path: path.join(GLOBAL_SCREENSHOT_DIR, '78_v12_achievements_unlocked.png') });

    testResults['9_achievements_unlocked'] = unlockedBadges >= 2 ? 'PASS' : 'FAIL';
    console.log('  [Step 10 Result]: ' + testResults['9_achievements_unlocked']);

  } catch (err) {
    console.error('Acceptance suite failed with error:', err);
    await page.screenshot({ path: path.join(GLOBAL_SCREENSHOT_DIR, 'v12_acceptance_error.png') });
  } finally {
    await browser.close();
  }

  console.log('\n================================================================================');
  console.log('ALL V1.2 DUAL-TRACK ACCEPTANCE TESTS EVALUATED:');
  console.log(JSON.stringify(testResults, null, 2));
  console.log('================================================================================');
}

runDualTrackAcceptance();
