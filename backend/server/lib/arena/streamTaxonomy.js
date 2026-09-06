/**
 * arena/streamTaxonomy.js — per-stream competency areas and a required-
 * vocabulary allowlist, used by contentValidation.js's deterministic
 * semantic-stream check (spec §39). Keyed by the `streams.slug` values
 * already in the database (see the 2026-09-05 migration's design notes).
 *
 * `vocabulary` is not exhaustive — it's a "does this scenario contain at
 * least one term that could only plausibly appear in this discipline"
 * floor, cheap enough to run on every piece of content (seed or
 * AI-generated) before anything more expensive. It catches the exact
 * failure mode this task calls out: a generic SQL/inventory task with the
 * stream's name pasted into the title contains none of these terms.
 */
export const STREAM_TAXONOMY = {
  cse: {
    name: "Computer Science Engineering",
    competencyAreas: ["Algorithms", "Data Structures", "Databases", "Software Engineering", "Operating Systems", "Networking", "Computer Architecture", "Security Fundamentals", "Systems", "API Design"],
    vocabulary: ["algorithm", "array", "linked list", "stack", "queue", "tree", "graph", "hash", "index", "query", "join", "thread", "process", "deadlock", "mutex", "cache", "latency", "recursion", "complexity", "big o", "concurrency", "api", "endpoint", "buffer", "pointer", "compiler", "runtime"],
  },
  ece: {
    name: "Electronics & Communication",
    competencyAreas: ["Digital Electronics", "Circuits", "Signals", "Embedded Systems", "Microcontrollers", "Sensors", "Communication Systems", "Instrumentation"],
    vocabulary: ["circuit", "voltage", "current", "resistor", "capacitor", "signal", "waveform", "frequency", "amplitude", "gpio", "microcontroller", "sensor", "adc", "dac", "modulation", "bandwidth", "logic gate", "flip-flop", "duty cycle", "oscilloscope", "uart", "i2c", "spi"],
  },
  eee: {
    name: "Electrical & Electronics",
    competencyAreas: ["Circuit Analysis", "Electrical Measurements", "Electrical Machines", "Power Systems", "Control Systems", "Power Electronics", "Transformers", "Motors"],
    vocabulary: ["voltage", "current", "resistance", "impedance", "transformer", "motor", "winding", "torque", "power factor", "relay", "circuit breaker", "load", "generator", "rms", "phasor", "harmonics", "grid", "substation", "pid", "feedback loop", "pole", "transfer function", "closed-loop", "stability", "resonance", "reactance", "inductor", "capacitor"],
  },
  mechanical: {
    name: "Mechanical Engineering",
    competencyAreas: ["Mechanics", "Materials", "Manufacturing", "Machine Design", "Thermal Engineering", "Quality", "Production"],
    vocabulary: ["stress", "strain", "load", "tolerance", "machining", "casting", "welding", "fatigue", "torque", "bearing", "gear", "thermal", "heat transfer", "material", "alloy", "yield strength", "defect", "tolerance stack", "assembly", "lathe", "cnc"],
  },
  civil: {
    name: "Civil Engineering",
    competencyAreas: ["Structural Reasoning", "Construction", "Surveying", "Materials", "Transportation", "Infrastructure", "Geotechnical"],
    vocabulary: ["load", "beam", "column", "foundation", "concrete", "rebar", "soil", "settlement", "survey", "gradient", "slab", "structural", "reinforcement", "aggregate", "curing", "bearing capacity", "drainage", "site"],
  },
  mba: {
    name: "MBA",
    competencyAreas: ["Finance", "Accounting", "Marketing", "Operations", "HR", "Strategy", "Business Analytics"],
    vocabulary: ["revenue", "margin", "roi", "cash flow", "budget", "market share", "segment", "churn", "cac", "ltv", "lifetime value", "supply chain", "inventory turnover", "kpi", "stakeholder", "competitive advantage", "positioning", "attrition", "turnover", "forecast", "p&l", "bottleneck", "throughput", "capacity", "production line", "stage"],
  },
  "ai-ml": {
    name: "AI & Machine Learning",
    competencyAreas: ["Machine Learning", "Statistics", "Data Preparation", "Feature Engineering", "Model Evaluation", "Model Selection", "Responsible AI"],
    vocabulary: ["model", "overfitting", "underfitting", "feature", "label", "training set", "validation", "accuracy", "precision", "recall", "confusion matrix", "hyperparameter", "gradient", "loss function", "bias", "variance", "leakage", "regularization", "cross-validation"],
  },
  "ai-ds": {
    name: "AI & Data Science",
    competencyAreas: ["Data Cleaning", "Statistics", "Exploratory Data Analysis", "Visualization", "Predictive Analysis", "Feature Engineering", "Model Evaluation"],
    vocabulary: ["dataset", "outlier", "missing value", "distribution", "correlation", "mean", "median", "std deviation", "visualization", "histogram", "sampling", "hypothesis", "p-value", "regression", "aggregation", "pivot", "null values"],
  },
  "cyber-security": {
    name: "Cyber Security",
    competencyAreas: ["Authentication", "Authorization", "Logs", "Secure Configuration", "Vulnerability Analysis", "Incident Response", "Security Architecture", "Risk"],
    vocabulary: ["authentication", "authorization", "token", "session", "log", "vulnerability", "exploit", "patch", "firewall", "encryption", "hash", "phishing", "malware", "ransomware", "incident", "breach", "access control", "privilege escalation", "cve", "mitigation", "audit trail", "containment"],
  },
  it: {
    name: "Information Technology",
    competencyAreas: ["Networking", "Systems Administration", "Infrastructure", "Cloud", "Databases", "Web Technologies", "Troubleshooting", "Service Management"],
    vocabulary: ["dns", "dhcp", "vpn", "firewall", "load balancer", "uptime", "latency", "outage", "ticket", "server", "deployment", "container", "cloud", "backup", "failover", "bandwidth", "subnet", "ssl", "certificate"],
  },
  mca: {
    name: "MCA",
    competencyAreas: ["Programming", "Data Structures", "Databases", "Web Development", "APIs", "Software Engineering", "Testing", "Application Architecture"],
    vocabulary: ["function", "class", "api", "endpoint", "database", "query", "test case", "unit test", "framework", "request", "response", "schema", "architecture", "module", "dependency", "authentication", "deployment"],
  },
}

export function getStreamTaxonomy(slug) {
  return STREAM_TAXONOMY[slug] || null
}
