import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import type { FarmRecord } from "../backend.d";

// Fix leaflet default marker icons
// biome-ignore lint/performance/noDelete: Required to fix Leaflet icon loading issue
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)
  ._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface AdminMapProps {
  farms: FarmRecord[];
}

// Default center: Philippines roughly
const DEFAULT_CENTER: [number, number] = [12.8797, 121.774];
const DEFAULT_ZOOM = 6;

export default function AdminMap({ farms }: AdminMapProps) {
  // Calculate center based on farms if any
  const center: [number, number] =
    farms.length > 0
      ? [
          farms.reduce((sum, f) => sum + f.latitude, 0) / farms.length,
          farms.reduce((sum, f) => sum + f.longitude, 0) / farms.length,
        ]
      : DEFAULT_CENTER;

  return (
    <div
      style={{ height: "450px", width: "100%" }}
      data-ocid="admin.map.canvas_target"
    >
      <MapContainer
        center={center}
        zoom={farms.length > 0 ? 8 : DEFAULT_ZOOM}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {farms.map((farm, idx) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: no unique farm id in record
          <Marker key={idx} position={[farm.latitude, farm.longitude]}>
            <Popup>
              <div className="font-sans text-sm min-w-[160px]">
                <p className="font-bold text-foreground mb-0.5">
                  {farm.farmerName}
                </p>
                <p className="text-muted-foreground text-xs">
                  {farm.commodity}
                </p>
                <p className="text-muted-foreground text-xs mb-2">
                  {farm.adminArea}
                </p>
                <a
                  href={`${window.location.origin}/trace/farm-${Number(farm.createdAt)}-${idx}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary underline"
                  data-ocid={`admin.map.marker.${idx + 1}`}
                >
                  View Trace →
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
