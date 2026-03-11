import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Coffee,
  ExternalLink,
  Gauge,
  Leaf,
  MapIcon,
  MapPin,
  Mountain,
  Phone,
  ShieldCheck,
  Sprout,
  Star,
  Trees,
  User,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect } from "react";
import AppFooter from "../components/AppFooter";
import { QRCodeSVG } from "../components/QRCode";
import {
  useGetFarmRecord,
  useGetQrLogoUrl,
  useLogScan,
} from "../hooks/useQueries";

function formatDate(bigintMs: bigint): string {
  const ms = Number(bigintMs);
  return new Date(ms).toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMemberNumber(
  sequenceNumber: bigint | number,
  areaCode: string | null,
): string {
  const seq = String(Number(sequenceNumber)).padStart(4, "0");
  if (areaCode) return `${areaCode.toUpperCase()}${seq}`;
  return `--${seq}`;
}

const GRADE_COLORS: Record<string, string> = {
  Specialty: "bg-purple-100 text-purple-800 border-purple-200",
  Premium: "bg-amber-100 text-amber-800 border-amber-200",
  Commercial: "bg-blue-100 text-blue-800 border-blue-200",
  Standard: "bg-slate-100 text-slate-700 border-slate-200",
};

function parseGrade(raw: string): { gradeName: string; scoring: string } {
  const idx = raw.indexOf(" \u2014 ");
  if (idx !== -1) {
    return { gradeName: raw.slice(0, idx), scoring: raw.slice(idx + 3) };
  }
  return { gradeName: raw, scoring: "" };
}

function parseAdminArea(raw: string): { adminArea: string; mount: string } {
  const idx = raw.indexOf(" | ");
  if (idx !== -1) {
    return { adminArea: raw.slice(0, idx), mount: raw.slice(idx + 3) };
  }
  return { adminArea: raw, mount: "" };
}

function parseVarieties(raw: string): Array<{ name: string; pct: string }> {
  if (!raw) return [];
  return raw.split("|").map((part) => {
    const colonIdx = part.lastIndexOf(":");
    if (colonIdx !== -1) {
      return { name: part.slice(0, colonIdx), pct: part.slice(colonIdx + 1) };
    }
    return { name: part, pct: "" };
  });
}

export default function TraceabilityPage() {
  const { farmId } = useParams({ from: "/trace/$farmId" });
  const { data: farm, isLoading, isError } = useGetFarmRecord(farmId);
  const logScan = useLogScan();
  const { data: qrLogoUrl = "" } = useGetQrLogoUrl();
  const logScanMutate = logScan.mutate;

  useEffect(() => {
    if (farmId) {
      logScanMutate({ farmId, userAgent: navigator.userAgent });
    }
  }, [farmId, logScanMutate]);

  const qrValue = `${window.location.origin}/trace/${farmId}`;
  const mapsUrl = farm
    ? `https://www.google.com/maps?q=${farm.latitude},${farm.longitude}`
    : "#";

  const { gradeName, scoring } = farm
    ? parseGrade(farm.grade)
    : { gradeName: "", scoring: "" };
  const { adminArea, mount } = farm
    ? parseAdminArea(farm.adminArea)
    : { adminArea: "", mount: "" };
  const varieties = farm ? parseVarieties(farm.varieties ?? "") : [];

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <TraceHeader />
        <main className="flex-1 max-w-xl mx-auto w-full px-4 py-10 space-y-4">
          <Skeleton
            className="h-48 w-full rounded-xl"
            data-ocid="trace.loading_state"
          />
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </main>
        <AppFooter />
      </div>
    );
  }

  if (isError || !farm) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <TraceHeader />
        <main className="flex-1 max-w-xl mx-auto w-full px-4 py-10">
          <Card className="border-destructive/30" data-ocid="trace.error_state">
            <CardContent className="pt-8 pb-8 text-center">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <Leaf className="w-6 h-6 text-destructive" />
              </div>
              <h2 className="font-display text-lg font-bold mb-2">
                Record Not Found
              </h2>
              <p className="text-muted-foreground font-sans text-sm mb-4">
                This farm record does not exist or may have been removed.
              </p>
              <Link to="/">
                <Button
                  variant="outline"
                  className="font-sans"
                  data-ocid="trace.home.link"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Go to Homepage
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>
        <AppFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TraceHeader />

      <main className="flex-1 max-w-xl mx-auto w-full px-4 py-10 space-y-5">
        {/* Verified banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-lg px-4 py-3 bg-primary/10 border border-primary/20"
        >
          <ShieldCheck className="w-5 h-5 text-primary flex-shrink-0" />
          <p className="text-sm font-sans text-foreground">
            <span className="font-semibold">
              This product has been traced and verified by AgriTrace.
            </span>
          </p>
        </motion.div>

        {/* Farm Details Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="font-display text-xl">
                    {farm.farmerName}
                  </CardTitle>
                  <p className="text-sm font-mono font-bold text-primary mt-0.5">
                    {formatMemberNumber(farm.sequenceNumber, farm.areaCode)}
                  </p>
                  <p className="text-muted-foreground font-sans text-sm mt-0.5">
                    {adminArea}
                  </p>
                </div>
                <Badge
                  className={`font-semibold text-sm border ${
                    GRADE_COLORS[gradeName] ?? "bg-muted text-foreground"
                  }`}
                >
                  {gradeName}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InfoRow
                  icon={<User className="w-4 h-4" />}
                  label="Farmer"
                  value={farm.farmerName}
                  ocid="trace.farmer.card"
                />
                {farm.corporateName && (
                  <InfoRow
                    icon={<Building2 className="w-4 h-4" />}
                    label="Corporate"
                    value={farm.corporateName}
                    ocid="trace.corporate.card"
                  />
                )}
                {farm.phoneNumber && (
                  <InfoRow
                    icon={<Phone className="w-4 h-4" />}
                    label="Phone"
                    value={farm.phoneNumber}
                    ocid="trace.phone.card"
                  />
                )}
                <InfoRow
                  icon={<Coffee className="w-4 h-4" />}
                  label="Coffee Species"
                  value={farm.commodity}
                  ocid="trace.commodity.card"
                />
                <InfoRow
                  icon={<Star className="w-4 h-4" />}
                  label="Grade"
                  value={gradeName}
                  ocid="trace.grade.card"
                />
                {scoring && (
                  <InfoRow
                    icon={<Gauge className="w-4 h-4" />}
                    label="Scoring"
                    value={scoring}
                    ocid="trace.scoring.card"
                  />
                )}
                <InfoRow
                  icon={<MapIcon className="w-4 h-4" />}
                  label="Region"
                  value={adminArea}
                  ocid="trace.region.card"
                />
                {mount && (
                  <InfoRow
                    icon={<Mountain className="w-4 h-4" />}
                    label="Mount"
                    value={mount}
                    ocid="trace.mount.card"
                  />
                )}
                {farm.farmSize && (
                  <InfoRow
                    icon={<Trees className="w-4 h-4" />}
                    label="Farm Size"
                    value={`${farm.farmSize} ha`}
                    ocid="trace.farmSize.card"
                  />
                )}
                {farm.coffeeTreeCount && (
                  <InfoRow
                    icon={<Sprout className="w-4 h-4" />}
                    label="Coffee Trees"
                    value={`${farm.coffeeTreeCount} pcs`}
                    ocid="trace.coffeeTreeCount.card"
                  />
                )}
                {farm.shadeTreePct && (
                  <InfoRow
                    icon={<Trees className="w-4 h-4" />}
                    label="Shade Trees"
                    value={`${farm.shadeTreePct}%`}
                    ocid="trace.shadeTreePct.card"
                  />
                )}
              </div>

              {/* Varieties */}
              {varieties.length > 0 && (
                <div className="border-t border-border pt-4">
                  <p className="text-xs text-muted-foreground font-sans mb-2 flex items-center gap-1.5">
                    <Sprout className="w-3.5 h-3.5" /> Variety Composition
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {varieties.map((v, i) => (
                      <div
                        // biome-ignore lint/suspicious/noArrayIndexKey: stable order
                        key={i}
                        className="rounded-md bg-secondary/50 px-3 py-2 text-center"
                        data-ocid={`trace.variety.card.${i + 1}`}
                      >
                        <p className="font-semibold text-sm font-sans">
                          {v.name}
                        </p>
                        {v.pct && (
                          <p className="text-xs text-muted-foreground font-sans">
                            {v.pct}%
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-sans">
                  <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">Location:</span>
                  <span className="font-mono font-medium text-foreground">
                    {farm.latitude.toFixed(6)}, {farm.longitude.toFixed(6)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm font-sans">
                  <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">Registered:</span>
                  <span className="font-medium text-foreground">
                    {formatDate(farm.createdAt)}
                  </span>
                </div>
              </div>

              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-ocid="trace.maps.button"
              >
                <Button
                  className="w-full font-sans hero-gradient border-0 text-white hover:opacity-90"
                  size="lg"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View on Google Maps
                </Button>
              </a>
            </CardContent>
          </Card>
        </motion.div>

        {/* QR Code Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="shadow-sm">
            <CardContent className="pt-6 flex flex-col items-center gap-3">
              <p className="text-sm font-sans text-muted-foreground">
                Scan to share this record
              </p>
              <div className="p-4 bg-white rounded-xl shadow-sm border border-border">
                <QRCodeSVG
                  value={qrValue}
                  size={160}
                  level="H"
                  {...(qrLogoUrl
                    ? {
                        imageSettings: {
                          src: qrLogoUrl,
                          height: 56,
                          width: 56,
                          excavate: true,
                        },
                      }
                    : {})}
                />
              </div>
              <p className="text-xs font-mono text-muted-foreground break-all text-center px-4">
                {qrValue}
              </p>
              {/* Member Number below QR */}
              <div
                className="flex flex-col items-center gap-0.5"
                data-ocid="trace.member_number.card"
              >
                <p className="text-xs text-muted-foreground font-sans">
                  Nomor Anggota
                </p>
                <p className="text-xl font-display font-bold tracking-widest text-foreground">
                  {formatMemberNumber(farm.sequenceNumber, farm.areaCode)}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <p className="text-xs text-muted-foreground font-sans text-center">
          Farm ID: <span className="font-mono">{farmId}</span>
        </p>
      </main>

      <AppFooter />
    </div>
  );
}

function TraceHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/90 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center gap-3">
        <Link to="/" data-ocid="trace.home.link">
          <Button variant="ghost" size="sm" className="font-sans gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            Home
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Leaf className="w-4 h-4 text-primary" />
          <span className="font-display font-bold text-sm">
            AgriTrace GeoTag
          </span>
        </div>
        <Badge variant="secondary" className="ml-auto font-sans text-xs">
          <ShieldCheck className="w-3 h-3 mr-1" />
          Verified Record
        </Badge>
      </div>
    </header>
  );
}

function InfoRow({
  icon,
  label,
  value,
  ocid,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  ocid: string;
}) {
  return (
    <div data-ocid={ocid} className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-sans">
        <span className="text-muted-foreground">{icon}</span>
        {label}
      </div>
      <p className="font-semibold font-sans text-sm text-foreground">{value}</p>
    </div>
  );
}
