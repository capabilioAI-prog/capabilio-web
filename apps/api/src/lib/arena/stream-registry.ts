export interface StreamChallenge {
  id: string;
  streamSlug: string;
  title: string;
  category: string;
  difficulty: 'beginner' | 'foundation' | 'intermediate' | 'advanced';
  estimatedMinutes: number;
  ratingReward: number;
  problemStatement: string;
  constraints: string[];
  exampleInput: string;
  exampleOutput: string;
  starterCode: string;
  expectedComplexity: string;
  solutionHint: string;
}

export interface StreamDefinition {
  slug: string;
  streamName: string;
  shortCode: string;
  description: string;
  categories: string[];
  challenges: StreamChallenge[];
}

export const STREAM_REGISTRY: Record<string, StreamDefinition> = {
  cse: {
    slug: 'cse',
    streamName: 'Computer Science & Engineering',
    shortCode: 'CSE',
    description: 'Build the algorithmic and problem-solving foundation behind your engineering discipline.',
    categories: ['DSA', 'Algorithms', 'Data Structures', 'Problem Solving', 'Competitive Programming', 'Debugging', 'Complexity Analysis'],
    challenges: [
      {
        id: 'cse_dsa_01',
        streamSlug: 'cse',
        title: 'Optimize Duplicate Transaction Detection to O(N)',
        category: 'Algorithms & Hash Maps',
        difficulty: 'foundation',
        estimatedMinutes: 20,
        ratingReward: 12,
        problemStatement: 'Given an array of integer transaction IDs, determine if the log contains duplicate transaction IDs. You must optimize your solution to run in O(N) time complexity rather than brute force O(N²).',
        constraints: ['1 <= transactions.length <= 10^5', '-10^9 <= transactions[i] <= 10^9'],
        exampleInput: '[1024, 2048, 4096, 1024, 8192]',
        exampleOutput: 'true (Duplicate: 1024)',
        starterCode: `function hasDuplicateTransactions(transactions: number[]): boolean {
  // TODO: Implement O(N) duplicate detection using Set / Hash Map
  const seen = new Set<number>();
  for (const id of transactions) {
    if (seen.has(id)) return true;
    seen.add(id);
  }
  return false;
}`,
        expectedComplexity: 'Time: O(N), Space: O(N)',
        solutionHint: 'Use a Set to track visited elements in O(1) average lookup time.',
      },
      {
        id: 'cse_dsa_02',
        streamSlug: 'cse',
        title: 'Search in Rotated Sorted Array in O(log N)',
        category: 'Binary Search',
        difficulty: 'intermediate',
        estimatedMinutes: 25,
        ratingReward: 16,
        problemStatement: 'An integer array sorted in ascending order was rotated at an unknown pivot. Given the array and a target value, return the index of the target in O(log N) time, or -1 if not present.',
        constraints: ['1 <= nums.length <= 5000', 'All values in nums are unique'],
        exampleInput: 'nums = [4, 5, 6, 7, 0, 1, 2], target = 0',
        exampleOutput: '4',
        starterCode: `function searchRotated(nums: number[], target: number): number {
  let left = 0, right = nums.length - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (nums[mid] === target) return mid;
    // Check which half is normally sorted
    if (nums[left] <= nums[mid]) {
      if (nums[left] <= target && target < nums[mid]) right = mid - 1;
      else left = mid + 1;
    } else {
      if (nums[mid] < target && target <= nums[right]) left = mid + 1;
      else right = mid - 1;
    }
  }
  return -1;
}`,
        expectedComplexity: 'Time: O(log N), Space: O(1)',
        solutionHint: 'Identify which half is strictly increasing and determine if target lies in that range.',
      }
    ]
  },
  it: {
    slug: 'it',
    streamName: 'Information Technology',
    shortCode: 'IT',
    description: 'Master systems programming, networking architectures, and enterprise full-stack design.',
    categories: ['Programming', 'DSA', 'Web Development', 'Databases', 'Networking', 'Operating Systems'],
    challenges: [
      {
        id: 'it_sys_01',
        streamSlug: 'it',
        title: 'LRU Cache Design with O(1) Eviction',
        category: 'Data Structures & OS',
        difficulty: 'intermediate',
        estimatedMinutes: 30,
        ratingReward: 18,
        problemStatement: 'Design a Least Recently Used (LRU) Cache data structure supporting get(key) and put(key, value) in O(1) time complexity.',
        constraints: ['capacity >= 1', 'Operations called up to 10^5 times'],
        exampleInput: 'LRUCache(2) -> put(1, 1), put(2, 2), get(1), put(3, 3) [evicts 2]',
        exampleOutput: 'get(2) returns -1',
        starterCode: `class LRUCache {
  private capacity: number;
  private cache: Map<number, number>;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.cache = new Map();
  }

  get(key: number): number {
    if (!this.cache.has(key)) return -1;
    const val = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, val);
    return val;
  }

  put(key: number, value: number): void {
    if (this.cache.has(key)) this.cache.delete(key);
    else if (this.cache.size >= this.capacity) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) this.cache.delete(oldestKey);
    }
    this.cache.set(key, value);
  }
}`,
        expectedComplexity: 'O(1) Get and Put',
        solutionHint: 'Combine a doubly linked list with a hash map, or leverage JavaScript Map iteration order.',
      }
    ]
  },
  ai_ml: {
    slug: 'ai_ml',
    streamName: 'Artificial Intelligence & Machine Learning',
    shortCode: 'AI & ML',
    description: 'Solve core ML engineering, feature engineering, and predictive modeling challenges.',
    categories: ['Python', 'NumPy', 'Pandas', 'Statistics', 'Machine Learning', 'Model Evaluation'],
    challenges: [
      {
        id: 'aiml_eval_01',
        streamSlug: 'ai_ml',
        title: 'Diagnose Imbalanced Classification with F1 & Precision-Recall',
        category: 'Model Evaluation',
        difficulty: 'foundation',
        estimatedMinutes: 20,
        ratingReward: 14,
        problemStatement: 'A fraud detection model has 99.2% accuracy but fails in production because fraud accounts for only 0.1% of transactions. Implement F1 Score, Precision, and Recall computation from a confusion matrix.',
        constraints: ['TP, FP, FN, TN >= 0'],
        exampleInput: 'TP = 80, FP = 20, FN = 120, TN = 9780',
        exampleOutput: 'Precision: 80.0%, Recall: 40.0%, F1: 53.33%',
        starterCode: `function computeMetrics(tp: number, fp: number, fn: number, tn: number) {
  const precision = tp / (tp + fp);
  const recall = tp / (tp + fn);
  const f1 = (2 * precision * recall) / (precision + recall);
  return { precision: Number((precision * 100).toFixed(2)), recall: Number((recall * 100).toFixed(2)), f1: Number((f1 * 100).toFixed(2)) };
}`,
        expectedComplexity: 'Time: O(1)',
        solutionHint: 'F1 is the harmonic mean of precision and recall: 2 * (P * R) / (P + R).',
      }
    ]
  },
  ece: {
    slug: 'ece',
    streamName: 'Electronics & Communication',
    shortCode: 'ECE',
    description: 'Analyze digital logic, embedded systems, microcontrollers, and communication protocols.',
    categories: ['Digital Electronics', 'Analog Electronics', 'Embedded Systems', 'Signals', 'Microcontrollers'],
    challenges: [
      {
        id: 'ece_dig_01',
        streamSlug: 'ece',
        title: 'Design Moore State Machine for 1011 Sequence Detector',
        category: 'Digital Logic & FSM',
        difficulty: 'foundation',
        estimatedMinutes: 25,
        ratingReward: 15,
        problemStatement: 'Given a continuous serial bit stream, design a Moore finite state machine transition table that asserts output HIGH when the overlapping sequence "1011" is detected.',
        constraints: ['Overlapping detection enabled'],
        exampleInput: 'Bitstream: "11011011"',
        exampleOutput: 'Detections at index 4 and index 7',
        starterCode: `function detectSequence(bits: string): number[] {
  const detections: number[] = [];
  let state = 0; // S0: Init, S1: '1', S2: '10', S3: '101', S4: '1011'
  for (let i = 0; i < bits.length; i++) {
    const bit = bits[i];
    if (state === 0) state = bit === '1' ? 1 : 0;
    else if (state === 1) state = bit === '0' ? 2 : 1;
    else if (state === 2) state = bit === '1' ? 3 : 0;
    else if (state === 3) {
      if (bit === '1') { state = 1; detections.push(i); }
      else state = 2;
    }
  }
  return detections;
}`,
        expectedComplexity: 'O(N) Time, O(1) Space',
        solutionHint: 'Ensure state resets to S1 (for trailing 1) upon successful sequence detection.',
      }
    ]
  },
  mechanical: {
    slug: 'mechanical',
    streamName: 'Mechanical Engineering',
    shortCode: 'MECH',
    description: 'Solve thermodynamic cycles, stress-strain analysis, and fluid mechanics problems.',
    categories: ['Thermodynamics', 'Mechanics', 'Fluid Dynamics', 'CAD', 'Machine Design'],
    challenges: [
      {
        id: 'mech_thermo_01',
        streamSlug: 'mechanical',
        title: 'Calculate Thermal Efficiency of Ideal Brayton Cycle',
        category: 'Thermodynamics',
        difficulty: 'foundation',
        estimatedMinutes: 20,
        ratingReward: 12,
        problemStatement: 'Given the pressure ratio (r_p) and specific heat ratio (gamma = 1.4 for air), calculate the thermal efficiency of an ideal gas turbine Brayton cycle.',
        constraints: ['r_p > 1', 'gamma = 1.4'],
        exampleInput: 'r_p = 8.0, gamma = 1.4',
        exampleOutput: 'Efficiency: 44.8%',
        starterCode: `function braytonEfficiency(rp: number, gamma = 1.4): number {
  const exponent = (gamma - 1) / gamma;
  const eta = 1 - (1 / Math.pow(rp, exponent));
  return Number((eta * 100).toFixed(2));
}`,
        expectedComplexity: 'O(1) Time',
        solutionHint: 'Formula: eta = 1 - (1 / rp^((gamma - 1)/gamma)).',
      }
    ]
  },
  civil: {
    slug: 'civil',
    streamName: 'Civil Engineering',
    shortCode: 'CIVIL',
    description: 'Analyze structural loads, concrete mix ratios, and geotechnical stability.',
    categories: ['Structural Engineering', 'Surveying', 'Geotechnical', 'Concrete Tech'],
    challenges: [
      {
        id: 'civil_struct_01',
        streamSlug: 'civil',
        title: 'Calculate Maximum Bending Moment for Simply Supported Beam',
        category: 'Structural Mechanics',
        difficulty: 'foundation',
        estimatedMinutes: 20,
        ratingReward: 12,
        problemStatement: 'Given a simply supported beam of length L carrying a uniformly distributed load w (kN/m), calculate the maximum bending moment occurring at midspan (M_max = w * L^2 / 8).',
        constraints: ['L > 0', 'w > 0'],
        exampleInput: 'w = 12 kN/m, L = 6 m',
        exampleOutput: 'M_max = 54.0 kN·m',
        starterCode: `function maxBendingMoment(w: number, L: number): number {
  return Number(((w * L * L) / 8).toFixed(2));
}`,
        expectedComplexity: 'O(1) Time',
        solutionHint: 'Midspan moment is w * L^2 / 8.',
      }
    ]
  },
  cybersecurity: {
    slug: 'cybersecurity',
    streamName: 'Cyber Security',
    shortCode: 'CYBER',
    description: 'Triage SOC alerts, investigate log anomalies, and detect security vulnerabilities.',
    categories: ['SOC Analysis', 'Log Triage', 'Incident Response', 'Threat Detection', 'SIEM'],
    challenges: [
      {
        id: 'cyber_soc_01',
        streamSlug: 'cybersecurity',
        title: 'Detect Distributed Brute-Force SSH Ingestion in Auth Logs',
        category: 'SIEM Log Analysis',
        difficulty: 'intermediate',
        estimatedMinutes: 25,
        ratingReward: 16,
        problemStatement: 'Given a series of authentication log entries, detect IP addresses that generated more than 5 failed login attempts within a 60-second window.',
        constraints: ['1 <= logs.length <= 10^4'],
        exampleInput: 'Logs with 12 failures from 192.168.1.100 within 30s',
        exampleOutput: 'Flagged IP: 192.168.1.100 (Threshold Exceeded: 12 attempts)',
        starterCode: `interface AuthLog { ip: string; timestamp: number; success: boolean; }
function detectBruteForce(logs: AuthLog[]): string[] {
  const flagged = new Set<string>();
  const ipFailures = new Map<string, number[]>();
  for (const log of logs) {
    if (!log.success) {
      if (!ipFailures.has(log.ip)) ipFailures.set(log.ip, []);
      const times = ipFailures.get(log.ip)!;
      times.push(log.timestamp);
      // Sliding window 60s (60000ms)
      const recent = times.filter(t => log.timestamp - t <= 60000);
      ipFailures.set(log.ip, recent);
      if (recent.length >= 5) flagged.add(log.ip);
    }
  }
  return Array.from(flagged);
}`,
        expectedComplexity: 'O(N) Time',
        solutionHint: 'Maintain a timestamp queue per IP address and filter entries older than 60 seconds.',
      }
    ]
  }
};

export function getStreamDefinition(streamSlugOrName?: string | null): StreamDefinition {
  if (!streamSlugOrName) return STREAM_REGISTRY.cse!;
  const s = streamSlugOrName.toLowerCase();
  if (s.includes('cse') || s.includes('computer') || s.includes('software')) return STREAM_REGISTRY.cse!;
  if (s.includes('it') || s.includes('information')) return STREAM_REGISTRY.it!;
  if (s.includes('ai') || s.includes('ml') || s.includes('machine')) return STREAM_REGISTRY.ai_ml!;
  if (s.includes('ece') || s.includes('electronics') || s.includes('communication')) return STREAM_REGISTRY.ece!;
  if (s.includes('mech')) return STREAM_REGISTRY.mechanical!;
  if (s.includes('civil')) return STREAM_REGISTRY.civil!;
  if (s.includes('cyber') || s.includes('security')) return STREAM_REGISTRY.cybersecurity!;
  return STREAM_REGISTRY.cse!;
}
