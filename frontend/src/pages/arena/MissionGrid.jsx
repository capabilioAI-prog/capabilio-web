import MissionCard from "./MissionCard"

/** MissionGrid — two-column on desktop/tablet, single column on mobile
 *  (spec §10, §36). Pure layout; all visual identity lives in MissionCard. */
export default function MissionGrid({ missions, onOpenMission }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: 16,
      }}
    >
      {missions.map((m) => (
        <MissionCard key={m.id} mission={m} onOpen={onOpenMission} />
      ))}
    </div>
  )
}
