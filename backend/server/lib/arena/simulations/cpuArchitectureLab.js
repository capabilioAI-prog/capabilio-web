/**
 * arena/simulations/cpuArchitectureLab.js — the CSE "CPU / Architecture
 * Lab" micro-simulation. A classic 5-stage pipeline (IF/ID/EX/MEM/WB) fed
 * a fixed instruction stream, plus a direct-mapped cache fed a fixed
 * address trace — the standard textbook hazard/cache models, computed
 * exactly, not a physics-style curve. Distinct object set (instructions,
 * registers, pipeline stages, cache blocks) and interaction (step through
 * the stage timeline, toggle forwarding, inspect cache trace) from every
 * other registered simulation.
 */

export const SIMULATION_TYPE = "cpu_architecture_lab"

const STAGES = ["IF", "ID", "EX", "MEM", "WB"]

/** Classic RAW-hazard stall model for a single-issue in-order 5-stage
 *  pipeline. `k` = instructions between producer and this consumer.
 *  No forwarding: full 3-cycle penalty unless enough instructions
 *  separate them. With forwarding: 0 stalls except the 1-cycle
 *  load-use hazard forwarding cannot eliminate. */
export function computeStalls(instructions, forwardingEnabled) {
  const writerIndex = new Map()
  const perInstrStalls = []
  let totalStalls = 0

  instructions.forEach((instr, i) => {
    let stall = 0
    for (const src of instr.srcs || []) {
      if (!writerIndex.has(src)) continue
      const producerIdx = writerIndex.get(src)
      const k = i - producerIdx - 1
      if (!forwardingEnabled) {
        stall = Math.max(stall, Math.max(0, 3 - k))
      } else {
        const producerIsLoad = instructions[producerIdx].op === "LOAD"
        if (producerIsLoad && k === 0) stall = Math.max(stall, 1)
      }
    }
    perInstrStalls.push(stall)
    totalStalls += stall
    if (instr.dest) writerIndex.set(instr.dest, i)
  })

  return { totalStalls, perInstrStalls }
}

/** A per-cycle stage-occupancy timeline for rendering the pipeline
 *  diagram: timeline[i] = the cycle number each of instruction i's 5
 *  stages occupies, accounting for the stall cycles ahead of it. */
export function computeTimeline(instructions, forwardingEnabled) {
  const { perInstrStalls } = computeStalls(instructions, forwardingEnabled)
  let cursor = 1
  const timeline = []
  instructions.forEach((instr, i) => {
    cursor += perInstrStalls[i]
    const ifCycle = cursor
    timeline.push({ id: instr.id, op: instr.op, stallCyclesBefore: perInstrStalls[i], stages: STAGES.map((s, si) => ({ stage: s, cycle: ifCycle + si })) })
    cursor += 1
  })
  return timeline
}

/** Direct-mapped cache: index = blockNumber % sizeBlocks, hit iff the
 *  currently-cached tag at that index equals this access's block number. */
export function simulateCache(addresses, sizeBlocks, blockSize) {
  const slots = new Map()
  let hitCount = 0
  const trace = addresses.map((address) => {
    const blockNumber = Math.floor(address / blockSize)
    const index = blockNumber % sizeBlocks
    const hit = slots.get(index) === blockNumber
    if (hit) hitCount++
    slots.set(index, blockNumber)
    return { address, blockNumber, index, hit }
  })
  return { trace, hitCount, hitRatePct: addresses.length ? Math.round((1000 * hitCount) / addresses.length) / 10 : 0 }
}

/**
 * @param {object} recipe — hidden, server-only (verification_definition.simulation).
 *   { instructions: [{id, op, dest?, srcs?}], cache: { sizeBlocks, blockSize, addresses } }
 * @returns {object} PUBLIC simulation state: both forwarding-off and
 *   forwarding-on stage timelines (the student toggles between them) plus
 *   the full cache access trace with per-access hit/miss.
 */
export function generateCpuArchitectureState(recipe) {
  const { instructions, cache } = recipe
  const timelineNoForwarding = computeTimeline(instructions, false)
  const timelineForwarding = computeTimeline(instructions, true)
  const { totalStalls: totalStallsNoForwarding } = computeStalls(instructions, false)
  const { totalStalls: totalStallsForwarding } = computeStalls(instructions, true)
  const { trace, hitCount, hitRatePct } = simulateCache(cache.addresses, cache.sizeBlocks, cache.blockSize)

  return {
    simulationType: SIMULATION_TYPE,
    instructions: instructions.map((i) => ({ id: i.id, op: i.op, dest: i.dest || null, srcs: i.srcs || [] })),
    timelineNoForwarding, timelineForwarding,
    totalStallsNoForwarding, totalStallsForwarding,
    cache: { sizeBlocks: cache.sizeBlocks, blockSize: cache.blockSize, trace, hitCount, hitRatePct },
  }
}
