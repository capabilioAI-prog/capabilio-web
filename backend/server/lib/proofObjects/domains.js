/**
 * proofObjects/domains.js — shared domain-label taxonomy for grouping Proof
 * Objects in the "Engineering Proofs" portfolio tab. Used by both the live
 * Arena V2 builder and the legacy backfill builder so grouping is consistent
 * across data sources.
 */
export const DOMAIN_LABELS = {
  ece: "ECE", // acronym — the title-case fallback below would otherwise render "Ece"
  sql: "SQL",
  embedded_systems: "Embedded Systems",
  digital_electronics: "Digital Electronics",
  rtos: "RTOS",
  pcb_design: "PCB Design",
  swe: "Software Engineering",
  dsa: "Data Structures & Algorithms",
  cybersecurity: "Cybersecurity",
  data_science: "Data Science",
  mechanical: "Mechanical Engineering",
  civil: "Civil Engineering",
  iot: "IoT",
  devops: "DevOps",
}

export function humanizeDomain(raw) {
  if (!raw) return "General"
  const key = String(raw).toLowerCase().trim().replace(/\s+/g, "_")
  if (DOMAIN_LABELS[key]) return DOMAIN_LABELS[key]
  return String(raw).replace(/[_-]+/g, " ").replace(/\b\w/g, c => c.toUpperCase())
}
