import type { FarmRecord } from "../backend.d";

interface AdminMapProps {
  farms: FarmRecord[];
}

// Default center: Indonesia roughly
const DEFAULT_CENTER: [number, number] = [-2.5, 118.0];

export default function AdminMap({ farms }: AdminMapProps) {
  // Calculate center based on farms if any
  const center: [number, number] =
    farms.length > 0
      ? [
          farms.reduce((sum, f) => sum + f.latitude, 0) / farms.length,
          farms.reduce((sum, f) => sum + f.longitude, 0) / farms.length,
        ]
      : DEFAULT_CENTER;

  // Build OpenStreetMap embed URL with markers
  // OSM doesn't support multiple markers in iframe, so we show the center
  // For a richer experience, build a link to OSM with all farm pins
  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${center[1] - 2},${center[0] - 2},${center[1] + 2},${center[0] + 2}&layer=mapnik&marker=${center[0]},${center[1]}`;

  return (
    <div
      style={{ height: "450px", width: "100%", position: "relative" }}
      data-ocid="admin.map.canvas_target"
    >
      <iframe
        title="Farm Locations Map"
        src={osmEmbedUrl}
        style={{ width: "100%", height: "100%", border: "none" }}
        allowFullScreen
      />
      {/* Farm pins overlay list */}
      {farms.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            background: "rgba(255,255,255,0.97)",
            borderRadius: 8,
            padding: "10px 14px",
            maxHeight: 220,
            overflowY: "auto",
            boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
            fontSize: 12,
            minWidth: 160,
            zIndex: 1000,
          }}
        >
          <p
            style={{
              fontWeight: 700,
              marginBottom: 8,
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "#555",
            }}
          >
            {farms.length} Farm{farms.length !== 1 ? "s" : ""}
          </p>
          {farms.map((farm, idx) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: no unique farm id in record
              key={idx}
              style={{
                paddingBottom: 8,
                marginBottom: 8,
                borderBottom:
                  idx < farms.length - 1 ? "1px solid #eee" : "none",
              }}
            >
              <p style={{ fontWeight: 600, color: "#111", marginBottom: 2 }}>
                {farm.farmerName}
              </p>
              <p style={{ color: "#666", fontSize: 11 }}>
                {farm.commodity} · {farm.adminArea.split(" | ")[0]}
              </p>
              <p
                style={{ color: "#888", fontSize: 10, fontFamily: "monospace" }}
              >
                {farm.latitude.toFixed(4)}, {farm.longitude.toFixed(4)}
              </p>
              <a
                href={`https://www.google.com/maps?q=${farm.latitude},${farm.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "#2563eb",
                  fontSize: 11,
                  textDecoration: "none",
                }}
                data-ocid={`admin.map.marker.${idx + 1}`}
              >
                View on Maps →
              </a>
            </div>
          ))}
        </div>
      )}

      {farms.length === 0 && (
        <div
          style={{
            position: "absolute",
            bottom: 16,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(255,255,255,0.95)",
            borderRadius: 8,
            padding: "8px 16px",
            fontSize: 12,
            color: "#666",
            zIndex: 1000,
            whiteSpace: "nowrap",
          }}
        >
          No farms registered yet
        </div>
      )}
    </div>
  );
}
