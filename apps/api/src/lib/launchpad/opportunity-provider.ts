export interface RequiredSkillSpec {
  name: string;
  requiredProficiency: number; // 0-100
  weight: number; // 1-100
  isCore: boolean;
}

export interface Opportunity {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  companySize: string;
  industry: string;
  location: string;
  workMode: 'remote' | 'hybrid' | 'onsite';
  employmentType: 'internship' | 'entry_level' | 'graduate' | 'full_time' | 'apprenticeship';
  stipendOrSalary: string;
  duration: string;
  experienceRequired: string;
  targetRoleSlug: string;
  isDemo: boolean;
  requiredSkills: RequiredSkillSpec[];
  preferredSkills: string[];
  description: string;
  responsibilities: string[];
  requirements: string[];
  applicationDeadline: string;
  hiringManager: {
    name: string;
    title: string;
  };
}

export const DEMO_OPPORTUNITIES: Opportunity[] = [
  {
    id: 'opp_da_01',
    title: 'Data Analyst Intern — Retention & Cohort Analytics',
    company: 'CRED',
    companySize: '500–1,000 employees',
    industry: 'FinTech & Consumer Tech',
    location: 'Bengaluru / Hybrid',
    workMode: 'hybrid',
    employmentType: 'internship',
    stipendOrSalary: '₹35,000–₹50,000 / month',
    duration: '6 Months (PPO Eligible)',
    experienceRequired: '0–1 Year / Fresher Eligible',
    targetRoleSlug: 'data-analyst',
    isDemo: true,
    requiredSkills: [
      { name: 'SQL & Querying', requiredProficiency: 70, weight: 35, isCore: true },
      { name: 'Business Analytics', requiredProficiency: 70, weight: 25, isCore: true },
      { name: 'Data Visualization', requiredProficiency: 65, weight: 15, isCore: false },
      { name: 'Python & Pandas', requiredProficiency: 60, weight: 15, isCore: false },
      { name: 'Statistics & EDA', requiredProficiency: 70, weight: 10, isCore: true },
    ],
    preferredSkills: ['Cohort Analysis', 'Join Fan-out Prevention', 'PostgreSQL', 'Metabase'],
    description: 'CRED is looking for a high-rigor Data Analyst Intern to join our User Retention and Member Lifecycle team. You will query high-frequency transaction tables, prevent duplication regressions in warehouse pipelines, and deliver weekly retention cohort models.',
    responsibilities: [
      'Write optimized SQL aggregations on multi-million row transaction and subscription events',
      'Investigate cohort churn behaviors and customer-level duplication fan-outs',
      'Design clean executive dashboards tracking member renewal rates and lifetime value',
      'Collaborate with Product and Growth leads to test retention interventions'
    ],
    requirements: [
      'Strong demonstrated proficiency in SQL (joins, window functions, distinct aggregations)',
      'Working knowledge of Python for exploratory data analysis (EDA) and Pandas',
      'Solid analytical foundations and curiosity about consumer financial behaviors',
      'Student or recent graduate in Computer Science, Engineering, Statistics, or related discipline'
    ],
    applicationDeadline: '2026-09-30',
    hiringManager: {
      name: 'Aditi Sharma',
      title: 'Head of Growth Analytics'
    }
  },
  {
    id: 'opp_da_02',
    title: 'Junior Analytics Associate — Payment Operations',
    company: 'Razorpay',
    companySize: '1,000+ employees',
    industry: 'FinTech & Payments',
    location: 'Bengaluru / Remote',
    workMode: 'remote',
    employmentType: 'entry_level',
    stipendOrSalary: '₹8,50,000–₹12,00,000 / year',
    duration: 'Full Time',
    experienceRequired: '0–2 Years',
    targetRoleSlug: 'data-analyst',
    isDemo: true,
    requiredSkills: [
      { name: 'SQL & Querying', requiredProficiency: 75, weight: 35, isCore: true },
      { name: 'Query Optimization', requiredProficiency: 70, weight: 25, isCore: true },
      { name: 'Business Analytics', requiredProficiency: 75, weight: 20, isCore: true },
      { name: 'Python & Pandas', requiredProficiency: 65, weight: 10, isCore: false },
      { name: 'Data Visualization', requiredProficiency: 70, weight: 10, isCore: false },
    ],
    preferredSkills: ['PostgreSQL', 'Query Execution Plans', 'Dispute Resolution Metrics'],
    description: 'Join the Core Payments Operations team at Razorpay to ensure payment settlement pipeline reliability, merchant transaction reconciliation, and high-throughput query performance.',
    responsibilities: [
      'Build and optimize automated reconciliation queries across payment gateway ledgers',
      'Monitor and troubleshoot data pipeline latencies and warehouse bottlenecks',
      'Deliver merchant settlement reports and dispute analytics to executive stakeholders',
      'Partner with platform engineering to validate index tuning and data warehouse tables'
    ],
    requirements: [
      'Proven hands-on SQL query authoring and relational database debugging',
      'Understanding of database joins, indexes, and execution performance trade-offs',
      'Demonstrated structured problem-solving and technical communication'
    ],
    applicationDeadline: '2026-10-15',
    hiringManager: {
      name: 'Rohit Deshmukh',
      title: 'Principal Analytics Lead'
    }
  },
  {
    id: 'opp_da_03',
    title: 'Business Intelligence & Operations Intern',
    company: 'Swiggy',
    companySize: '1,000+ employees',
    industry: 'E-Commerce & Food Delivery',
    location: 'Hyderabad / Hybrid',
    workMode: 'hybrid',
    employmentType: 'internship',
    stipendOrSalary: '₹30,000–₹40,000 / month',
    duration: '6 Months',
    experienceRequired: 'Fresher Eligible',
    targetRoleSlug: 'data-analyst',
    isDemo: true,
    requiredSkills: [
      { name: 'Business Analytics', requiredProficiency: 75, weight: 30, isCore: true },
      { name: 'Data Visualization', requiredProficiency: 75, weight: 25, isCore: true },
      { name: 'SQL & Querying', requiredProficiency: 65, weight: 25, isCore: true },
      { name: 'Statistics & EDA', requiredProficiency: 60, weight: 10, isCore: false },
      { name: 'Python & Pandas', requiredProficiency: 55, weight: 10, isCore: false },
    ],
    preferredSkills: ['Tableau / Power BI', 'Delivery Logistics Metrics', 'Root Cause Analysis'],
    description: 'Swiggy is seeking an energetic BI Intern to support city-level delivery fleet operations and partner merchant throughput dashboards.',
    responsibilities: [
      'Build daily operational tracking dashboards for delivery turnaround times',
      'Analyze merchant surge pricing triggers and consumer delivery satisfaction metrics',
      'Conduct exploratory analysis on supply-demand matching bottlenecks'
    ],
    requirements: [
      'Proficiency in SQL data extraction and chart visualization',
      'Comfortable communicating insights to regional fleet operation managers',
      'Strong logical thinking and structured breakdown of real-world operational problems'
    ],
    applicationDeadline: '2026-09-25',
    hiringManager: {
      name: 'Pooja Iyer',
      title: 'Director of BI & Fleet Intelligence'
    }
  },
  {
    id: 'opp_da_04',
    title: 'Data Modeling & Warehouse Trainee',
    company: 'Fractal AI',
    companySize: '1,000+ employees',
    industry: 'AI & Enterprise Analytics',
    location: 'Mumbai / Hybrid',
    workMode: 'hybrid',
    employmentType: 'graduate',
    stipendOrSalary: '₹7,00,000–₹10,50,000 / year',
    duration: 'Full Time',
    experienceRequired: '0–1 Year',
    targetRoleSlug: 'data-analyst',
    isDemo: true,
    requiredSkills: [
      { name: 'SQL & Querying', requiredProficiency: 75, weight: 35, isCore: true },
      { name: 'Statistics & EDA', requiredProficiency: 75, weight: 25, isCore: true },
      { name: 'Python & Pandas', requiredProficiency: 70, weight: 20, isCore: true },
      { name: 'Business Analytics', requiredProficiency: 65, weight: 10, isCore: false },
      { name: 'Query Optimization', requiredProficiency: 65, weight: 10, isCore: false },
    ],
    preferredSkills: ['Data Warehousing', 'Snowflake / BigQuery', 'Hypothesis Testing'],
    description: 'Fractal AI is hiring Graduate Analytics Trainees for our Global Enterprise Decision Sciences practice. Work with Fortune 500 retail, healthcare, and financial clients.',
    responsibilities: [
      'Cleanse, structure, and model raw enterprise data lakes for analytical consumption',
      'Perform statistical significance testing on campaign outcomes',
      'Deliver automated analytical pipelines and reproducible data transformations'
    ],
    requirements: [
      'Degree in Computer Science, Statistics, Mathematics, or Data Science',
      'Verified SQL and Python coding proficiency',
      'Strong grounding in statistical distributions and hypothesis testing'
    ],
    applicationDeadline: '2026-10-30',
    hiringManager: {
      name: 'Vikram Mehta',
      title: 'Vice President, Enterprise Analytics'
    }
  },
  {
    id: 'opp_da_05',
    title: 'Quantitative Data Analyst Intern',
    company: 'PhonePe',
    companySize: '1,000+ employees',
    industry: 'FinTech & UPI Payments',
    location: 'Bengaluru / Onsite',
    workMode: 'onsite',
    employmentType: 'internship',
    stipendOrSalary: '₹40,000–₹60,000 / month',
    duration: '6 Months',
    experienceRequired: 'Fresher Eligible',
    targetRoleSlug: 'data-analyst',
    isDemo: true,
    requiredSkills: [
      { name: 'SQL & Querying', requiredProficiency: 80, weight: 40, isCore: true },
      { name: 'Business Analytics', requiredProficiency: 75, weight: 25, isCore: true },
      { name: 'Query Optimization', requiredProficiency: 75, weight: 20, isCore: true },
      { name: 'Statistics & EDA', requiredProficiency: 70, weight: 15, isCore: false },
    ],
    preferredSkills: ['UPI Transaction Flow', 'Fraud Anomalies', 'High Concurrency SQL'],
    description: 'Join the Fraud Detection and Merchant Risk team at PhonePe. Help identify suspicious transaction patterns, calculate real-time merchant risk scores, and prevent fraudulent merchant onboarding.',
    responsibilities: [
      'Write high-speed SQL queries on real-time transaction event streams',
      'Identify merchant anomaly signals and flag multi-account collision patterns',
      'Provide daily fraud risk summaries to compliance and risk engineering teams'
    ],
    requirements: [
      'Strong ability to write clean, deterministic SQL with zero join multiplication bugs',
      'Comfortable working with large transactional data schemas',
      'Analytical attention to detail and high integrity'
    ],
    applicationDeadline: '2026-10-05',
    hiringManager: {
      name: 'Nikhil Rathi',
      title: 'Lead Quantitative Risk Manager'
    }
  }
];

export async function getOpportunitiesForRole(roleSlug: string): Promise<Opportunity[]> {
  // Filters matching or related opportunities
  const filtered = DEMO_OPPORTUNITIES.filter(
    opp => opp.targetRoleSlug === roleSlug || opp.targetRoleSlug.includes(roleSlug) || roleSlug.includes(opp.targetRoleSlug)
  );

  return filtered.length > 0 ? filtered : DEMO_OPPORTUNITIES;
}

export async function getOpportunityById(id: string): Promise<Opportunity | null> {
  const opp = DEMO_OPPORTUNITIES.find(o => o.id === id);
  return opp || null;
}
