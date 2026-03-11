import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  CheckCircle2,
  Coffee,
  Download,
  Gauge,
  Leaf,
  Loader2,
  MapIcon,
  MapPin,
  Mountain,
  Phone,
  QrCode,
  RotateCcw,
  Sprout,
  Trees,
  User,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { FarmRecord } from "../backend.d";
import AppFooter from "../components/AppFooter";
import AppHeader from "../components/AppHeader";
import { QRCodeSVG } from "../components/QRCode";
import { useAddFarmRecord, useGetQrLogoUrl } from "../hooks/useQueries";

interface FormState {
  farmerName: string;
  corporateName: string;
  phoneNumber: string;
  commodity: string;
  variety1Name: string;
  variety1Pct: string;
  variety2Name: string;
  variety2Pct: string;
  variety3Name: string;
  variety3Pct: string;
  grade: string;
  scoring: string;
  adminArea: string;
  mount: string;
  location: string;
  farmSize: string;
  coffeeTreeCount: string;
  shadeTreePct: string;
}

const INITIAL_FORM: FormState = {
  farmerName: "",
  corporateName: "",
  phoneNumber: "",
  commodity: "",
  variety1Name: "",
  variety1Pct: "",
  variety2Name: "",
  variety2Pct: "",
  variety3Name: "",
  variety3Pct: "",
  grade: "",
  scoring: "",
  adminArea: "",
  mount: "",
  location: "",
  farmSize: "",
  coffeeTreeCount: "",
  shadeTreePct: "",
};

const COFFEE_SPECIES = ["Arabica", "Robusta", "Liberica", "Excelsa"];
const COFFEE_GRADES = ["Specialty", "Premium", "Commercial", "Standard"];

function formatMemberNumber(
  sequenceNumber: bigint | number,
  areaCode: string | null,
): string {
  const seq = String(Number(sequenceNumber)).padStart(4, "0");
  if (areaCode) return `${areaCode.toUpperCase()}${seq}`;
  return `--${seq}`;
}

/**
 * Parse DMS component like 7°13'00.15"S → signed decimal degrees
 */
function parseDMSPart(str: string): number | null {
  const match = str
    .trim()
    .match(/^(\d+)[°\s](\d+)['\'\s](\d+(?:\.\d+)?)[""\s]*([NSEWnsew])$/);
  if (!match) return null;
  const deg = Number.parseFloat(match[1]);
  const min = Number.parseFloat(match[2]);
  const sec = Number.parseFloat(match[3]);
  const dir = match[4].toUpperCase();
  const decimal = deg + min / 60 + sec / 3600;
  return dir === "S" || dir === "W" ? -decimal : decimal;
}

function parseDMS(
  location: string,
): { latitude: number; longitude: number } | null {
  const dmsPattern =
    /^(\d+[°\s]\d+['\'\s]\d+(?:\.\d+)?[""\s]*[NSns])\s+(\d+[°\s]\d+['\'\s]\d+(?:\.\d+)?[""\s]*[EWew])$/;
  const m = location.trim().match(dmsPattern);
  if (!m) return null;
  const lat = parseDMSPart(m[1]);
  const lng = parseDMSPart(m[2]);
  if (lat === null || lng === null) return null;
  return { latitude: lat, longitude: lng };
}

function parseDecimal(
  location: string,
): { latitude: number; longitude: number } | null {
  const parts = location.split(",").map((s) => s.trim());
  if (parts.length !== 2) return null;
  const lat = Number.parseFloat(parts[0]);
  const lng = Number.parseFloat(parts[1]);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { latitude: lat, longitude: lng };
}

function parseLocation(
  location: string,
): { latitude: number; longitude: number } | null {
  return parseDMS(location) ?? parseDecimal(location);
}

function encodeVarieties(form: FormState): string {
  const parts: string[] = [];
  if (form.variety1Name.trim()) {
    parts.push(`${form.variety1Name.trim()}:${form.variety1Pct.trim() || "0"}`);
  }
  if (form.variety2Name.trim()) {
    parts.push(`${form.variety2Name.trim()}:${form.variety2Pct.trim() || "0"}`);
  }
  if (form.variety3Name.trim()) {
    parts.push(`${form.variety3Name.trim()}:${form.variety3Pct.trim() || "0"}`);
  }
  return parts.join("|");
}

export default function FarmerRegistrationPage() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [geoLoading, setGeoLoading] = useState(false);
  const [submittedFarmId, setSubmittedFarmId] = useState<string | null>(null);
  const [submittedSeqNum, setSubmittedSeqNum] = useState<bigint | null>(null);

  const addFarmRecord = useAddFarmRecord();
  const { data: qrLogoUrl = "" } = useGetQrLogoUrl();

  const handleCapture = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        setForm((prev) => ({
          ...prev,
          location: `${lat}, ${lng}`,
        }));
        setGeoLoading(false);
        toast.success("Location captured!");
      },
      (err) => {
        setGeoLoading(false);
        toast.error(
          `Could not get location: ${err.message}. Please enter coordinates manually.`,
        );
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const coords = parseLocation(form.location);
    if (!coords) {
      toast.error(
        "Format koordinat tidak valid. Gunakan DMS (7°13'00.15\"S 107°37'20.15\"E) atau desimal (-7.216710, 107.622270).",
      );
      return;
    }

    if (!form.commodity) {
      toast.error("Pilih Coffee Species terlebih dahulu.");
      return;
    }
    if (!form.grade) {
      toast.error("Pilih Grade terlebih dahulu.");
      return;
    }

    const farmId = `farm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const gradeValue = form.scoring
      ? `${form.grade} \u2014 ${form.scoring}`
      : form.grade;
    const adminAreaValue = form.mount
      ? `${form.adminArea} | ${form.mount}`
      : form.adminArea;

    const record: FarmRecord = {
      farmerName: form.farmerName,
      corporateName: form.corporateName,
      phoneNumber: form.phoneNumber,
      commodity: form.commodity,
      varieties: encodeVarieties(form) || null,
      grade: gradeValue,
      adminArea: adminAreaValue,
      latitude: coords.latitude,
      longitude: coords.longitude,
      createdAt: BigInt(Date.now()),
      farmSize: form.farmSize || null,
      coffeeTreeCount: form.coffeeTreeCount || null,
      shadeTreePct: form.shadeTreePct || null,
      sequenceNumber: BigInt(0),
      areaCode: null,
    };

    try {
      const seqNum = await addFarmRecord.mutateAsync({ farmId, record });
      setSubmittedFarmId(farmId);
      setSubmittedSeqNum(seqNum);
      toast.success("Farm registered successfully!");
    } catch (err: unknown) {
      toast.error("Failed to register farm record. Please try again.");
      console.error(err);
    }
  };

  const handleDownloadQR = async () => {
    if (!submittedFarmId) return;
    try {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrValue)}&ecc=H`;
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `agritrace-${submittedFarmId.slice(0, 8)}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("QR code downloaded!");
    } catch {
      toast.error("Failed to download QR code. Please try again.");
    }
  };

  const handleReset = () => {
    setForm(INITIAL_FORM);
    setSubmittedFarmId(null);
    setSubmittedSeqNum(null);
  };

  const qrValue = submittedFarmId
    ? `${window.location.origin}/trace/${submittedFarmId}`
    : "";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />

      {/* Hero Banner */}
      <section className="hero-gradient text-white py-12 px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {Array.from({ length: 12 }).map((_, i) => (
            <Sprout
              // biome-ignore lint/suspicious/noArrayIndexKey: decorative items with no state
              key={i}
              className="absolute"
              style={{
                left: `${(i * 17 + 5) % 100}%`,
                top: `${(i * 23 + 10) % 100}%`,
                width: `${20 + (i % 3) * 10}px`,
                height: `${20 + (i % 3) * 10}px`,
                transform: `rotate(${i * 30}deg)`,
              }}
            />
          ))}
        </div>
        <div className="relative max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge className="mb-4 bg-white/20 text-white border-white/30 font-sans text-xs uppercase tracking-widest">
              Agricultural Traceability
            </Badge>
            <h1 className="font-display text-3xl sm:text-4xl font-bold mb-3">
              Register Your Farm
            </h1>
            <p className="text-white/80 text-base sm:text-lg max-w-xl mx-auto font-sans">
              Geotag your farm location and generate a QR code for full
              traceability of your agricultural products.
            </p>
          </motion.div>
        </div>
      </section>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-10">
        <AnimatePresence mode="wait">
          {!submittedFarmId ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="shadow-md border-border">
                <CardHeader className="pb-4">
                  <CardTitle className="font-display text-xl flex items-center gap-2">
                    <Leaf className="w-5 h-5 text-primary" />
                    Farm Registration Form
                  </CardTitle>
                  <CardDescription className="font-sans">
                    Fill in your farm details to generate a traceable QR code.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Farmer Name */}
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="farmerName"
                        className="flex items-center gap-1.5 font-sans font-medium"
                      >
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                        Farmer Name
                      </Label>
                      <Input
                        id="farmerName"
                        data-ocid="registration.farmerName.input"
                        placeholder="e.g. Budi Santoso"
                        value={form.farmerName}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, farmerName: e.target.value }))
                        }
                        required
                        className="font-sans"
                      />
                    </div>

                    {/* Corporate Name */}
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="corporateName"
                        className="flex items-center gap-1.5 font-sans font-medium"
                      >
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                        Corporate Name
                      </Label>
                      <Input
                        id="corporateName"
                        data-ocid="registration.corporateName.input"
                        placeholder="e.g. PT Kopi Nusantara"
                        value={form.corporateName}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            corporateName: e.target.value,
                          }))
                        }
                        className="font-sans"
                      />
                    </div>

                    {/* Phone Number */}
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="phoneNumber"
                        className="flex items-center gap-1.5 font-sans font-medium"
                      >
                        <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                        Phone Number
                      </Label>
                      <Input
                        id="phoneNumber"
                        data-ocid="registration.phoneNumber.input"
                        placeholder="e.g. +62 812-3456-7890"
                        value={form.phoneNumber}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            phoneNumber: e.target.value,
                          }))
                        }
                        className="font-sans"
                      />
                    </div>

                    {/* Coffee Species */}
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1.5 font-sans font-medium">
                        <Coffee className="w-3.5 h-3.5 text-muted-foreground" />
                        Coffee Species
                      </Label>
                      <Select
                        value={form.commodity}
                        onValueChange={(v) =>
                          setForm((p) => ({
                            ...p,
                            commodity: v,
                            grade: "",
                            scoring: "",
                          }))
                        }
                      >
                        <SelectTrigger
                          data-ocid="registration.commodity.select"
                          className="font-sans"
                        >
                          <SelectValue placeholder="Select coffee species" />
                        </SelectTrigger>
                        <SelectContent>
                          {COFFEE_SPECIES.map((s) => (
                            <SelectItem key={s} value={s} className="font-sans">
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Varieties - shown after species selected */}
                    {form.commodity && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="space-y-3 rounded-lg border border-border p-4 bg-secondary/20"
                      >
                        <Label className="flex items-center gap-1.5 font-sans font-medium text-sm">
                          <Sprout className="w-3.5 h-3.5 text-muted-foreground" />
                          Coffee Variety Composition
                        </Label>
                        <p className="text-xs text-muted-foreground font-sans">
                          Enter up to 3 varieties and their percentage
                          composition.
                        </p>
                        {/* Variety 1 */}
                        <div className="grid grid-cols-3 gap-2 items-end">
                          <div className="col-span-2 space-y-1">
                            <Label className="text-xs font-sans text-muted-foreground">
                              Variety 1
                            </Label>
                            <Input
                              data-ocid="registration.variety1Name.input"
                              placeholder="e.g. Typica"
                              value={form.variety1Name}
                              onChange={(e) =>
                                setForm((p) => ({
                                  ...p,
                                  variety1Name: e.target.value,
                                }))
                              }
                              className="font-sans text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-sans text-muted-foreground">
                              %
                            </Label>
                            <Input
                              data-ocid="registration.variety1Pct.input"
                              placeholder="e.g. 60"
                              type="number"
                              min="0"
                              max="100"
                              value={form.variety1Pct}
                              onChange={(e) =>
                                setForm((p) => ({
                                  ...p,
                                  variety1Pct: e.target.value,
                                }))
                              }
                              className="font-sans text-sm"
                            />
                          </div>
                        </div>
                        {/* Variety 2 */}
                        <div className="grid grid-cols-3 gap-2 items-end">
                          <div className="col-span-2 space-y-1">
                            <Label className="text-xs font-sans text-muted-foreground">
                              Variety 2
                            </Label>
                            <Input
                              data-ocid="registration.variety2Name.input"
                              placeholder="e.g. Bourbon"
                              value={form.variety2Name}
                              onChange={(e) =>
                                setForm((p) => ({
                                  ...p,
                                  variety2Name: e.target.value,
                                }))
                              }
                              className="font-sans text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-sans text-muted-foreground">
                              %
                            </Label>
                            <Input
                              data-ocid="registration.variety2Pct.input"
                              placeholder="e.g. 30"
                              type="number"
                              min="0"
                              max="100"
                              value={form.variety2Pct}
                              onChange={(e) =>
                                setForm((p) => ({
                                  ...p,
                                  variety2Pct: e.target.value,
                                }))
                              }
                              className="font-sans text-sm"
                            />
                          </div>
                        </div>
                        {/* Variety 3 */}
                        <div className="grid grid-cols-3 gap-2 items-end">
                          <div className="col-span-2 space-y-1">
                            <Label className="text-xs font-sans text-muted-foreground">
                              Variety 3
                            </Label>
                            <Input
                              data-ocid="registration.variety3Name.input"
                              placeholder="e.g. Catimor"
                              value={form.variety3Name}
                              onChange={(e) =>
                                setForm((p) => ({
                                  ...p,
                                  variety3Name: e.target.value,
                                }))
                              }
                              className="font-sans text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-sans text-muted-foreground">
                              %
                            </Label>
                            <Input
                              data-ocid="registration.variety3Pct.input"
                              placeholder="e.g. 10"
                              type="number"
                              min="0"
                              max="100"
                              value={form.variety3Pct}
                              onChange={(e) =>
                                setForm((p) => ({
                                  ...p,
                                  variety3Pct: e.target.value,
                                }))
                              }
                              className="font-sans text-sm"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Grade - shown after species selected */}
                    {form.commodity && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="space-y-1.5"
                      >
                        <Label className="flex items-center gap-1.5 font-sans font-medium">
                          <Gauge className="w-3.5 h-3.5 text-muted-foreground" />
                          Grade
                        </Label>
                        <Select
                          value={form.grade}
                          onValueChange={(v) =>
                            setForm((p) => ({ ...p, grade: v, scoring: "" }))
                          }
                        >
                          <SelectTrigger
                            data-ocid="registration.grade.select"
                            className="font-sans"
                          >
                            <SelectValue placeholder="Select grade" />
                          </SelectTrigger>
                          <SelectContent>
                            {COFFEE_GRADES.map((g) => (
                              <SelectItem
                                key={g}
                                value={g}
                                className="font-sans"
                              >
                                {g}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </motion.div>
                    )}

                    {/* Scoring - shown after grade selected */}
                    {form.grade && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="space-y-1.5"
                      >
                        <Label
                          htmlFor="scoring"
                          className="flex items-center gap-1.5 font-sans font-medium"
                        >
                          <Gauge className="w-3.5 h-3.5 text-muted-foreground" />
                          Scoring
                        </Label>
                        <Input
                          id="scoring"
                          data-ocid="registration.scoring.input"
                          placeholder="e.g. 87.5"
                          value={form.scoring}
                          onChange={(e) =>
                            setForm((p) => ({
                              ...p,
                              scoring: e.target.value,
                            }))
                          }
                          className="font-sans"
                        />
                      </motion.div>
                    )}

                    {/* Administrative Area */}
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="adminArea"
                        className="flex items-center gap-1.5 font-sans font-medium"
                      >
                        <MapIcon className="w-3.5 h-3.5 text-muted-foreground" />
                        Administrative Area
                      </Label>
                      <Input
                        id="adminArea"
                        data-ocid="registration.adminArea.input"
                        placeholder="e.g. North Region, Mindanao, Luzon"
                        value={form.adminArea}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, adminArea: e.target.value }))
                        }
                        required
                        className="font-sans"
                      />
                    </div>

                    {/* Mount */}
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="mount"
                        className="flex items-center gap-1.5 font-sans font-medium"
                      >
                        <Mountain className="w-3.5 h-3.5 text-muted-foreground" />
                        Mount
                      </Label>
                      <Input
                        id="mount"
                        data-ocid="registration.mount.input"
                        placeholder="e.g. Mount Gayo, Mount Kerinci"
                        value={form.mount}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, mount: e.target.value }))
                        }
                        className="font-sans"
                      />
                    </div>

                    {/* Farm Size & Tree Info */}
                    <div className="space-y-3 rounded-lg border border-border p-4 bg-secondary/20">
                      <Label className="flex items-center gap-1.5 font-sans font-medium text-sm">
                        <Trees className="w-3.5 h-3.5 text-muted-foreground" />
                        Farm & Tree Information
                      </Label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                          <Label
                            htmlFor="farmSize"
                            className="text-xs font-sans text-muted-foreground"
                          >
                            Farm Size (ha)
                          </Label>
                          <Input
                            id="farmSize"
                            data-ocid="registration.farmSize.input"
                            placeholder="e.g. 5"
                            value={form.farmSize}
                            onChange={(e) =>
                              setForm((p) => ({
                                ...p,
                                farmSize: e.target.value,
                              }))
                            }
                            className="font-sans text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label
                            htmlFor="coffeeTreeCount"
                            className="text-xs font-sans text-muted-foreground"
                          >
                            Coffee Trees (pcs)
                          </Label>
                          <Input
                            id="coffeeTreeCount"
                            data-ocid="registration.coffeeTreeCount.input"
                            placeholder="e.g. 1000"
                            type="number"
                            min="0"
                            value={form.coffeeTreeCount}
                            onChange={(e) =>
                              setForm((p) => ({
                                ...p,
                                coffeeTreeCount: e.target.value,
                              }))
                            }
                            className="font-sans text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label
                            htmlFor="shadeTreePct"
                            className="text-xs font-sans text-muted-foreground"
                          >
                            Shade Trees (%)
                          </Label>
                          <Input
                            id="shadeTreePct"
                            data-ocid="registration.shadeTreePct.input"
                            placeholder="e.g. 30"
                            type="number"
                            min="0"
                            max="100"
                            value={form.shadeTreePct}
                            onChange={(e) =>
                              setForm((p) => ({
                                ...p,
                                shadeTreePct: e.target.value,
                              }))
                            }
                            className="font-sans text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Farm Location */}
                    <div className="space-y-2">
                      <Label
                        htmlFor="location"
                        className="flex items-center gap-1.5 font-sans font-medium"
                      >
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                        Farm Location
                      </Label>

                      <Input
                        id="location"
                        data-ocid="registration.location.input"
                        placeholder={`e.g. 7°13'00.15"S 107°37'20.15"E`}
                        value={form.location}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, location: e.target.value }))
                        }
                        className="font-sans text-sm font-mono"
                      />

                      <p className="text-xs text-muted-foreground font-sans">
                        Format DMS:{" "}
                        <span className="font-mono">
                          7°13'00.15&quot;S 107°37'20.15&quot;E
                        </span>
                        &nbsp;atau desimal:&nbsp;
                        <span className="font-mono">-7.216710, 107.622270</span>
                      </p>

                      <Button
                        type="button"
                        data-ocid="registration.location.button"
                        variant="outline"
                        onClick={handleCapture}
                        disabled={geoLoading}
                        className="w-full font-sans border-dashed text-sm"
                      >
                        {geoLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Mendeteksi lokasi…
                          </>
                        ) : form.location ? (
                          <>
                            <CheckCircle2 className="mr-2 h-4 w-4 text-primary" />
                            Isi ulang dari GPS
                          </>
                        ) : (
                          <>
                            <MapPin className="mr-2 h-4 w-4" />
                            Isi otomatis dari GPS (opsional)
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Submit */}
                    <Button
                      type="submit"
                      data-ocid="registration.submit.button"
                      disabled={addFarmRecord.isPending}
                      className="w-full font-sans font-semibold hero-gradient border-0 text-white hover:opacity-90 mt-2"
                      size="lg"
                    >
                      {addFarmRecord.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Registering…
                        </>
                      ) : (
                        <>
                          <QrCode className="mr-2 h-4 w-4" />
                          Register & Generate QR Code
                        </>
                      )}
                    </Button>

                    {addFarmRecord.isError && (
                      <p
                        data-ocid="registration.error_state"
                        className="text-destructive text-sm font-sans text-center"
                      >
                        Registration failed. Please try again.
                      </p>
                    )}
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="shadow-md border-border">
                <CardHeader className="pb-4 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.2 }}
                    className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3"
                  >
                    <CheckCircle2 className="w-8 h-8 text-primary" />
                  </motion.div>
                  <CardTitle
                    className="font-display text-xl"
                    data-ocid="registration.success_state"
                  >
                    Farm Registered Successfully!
                  </CardTitle>
                  <CardDescription className="font-sans">
                    Scan or share this QR code for product traceability
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-5">
                  {/* Farm summary */}
                  <div className="w-full rounded-lg bg-secondary/50 p-4 grid grid-cols-2 gap-3 text-sm font-sans">
                    <div>
                      <p className="text-muted-foreground text-xs">Farmer</p>
                      <p className="font-semibold text-foreground">
                        {form.farmerName}
                      </p>
                    </div>
                    {form.corporateName && (
                      <div>
                        <p className="text-muted-foreground text-xs">
                          Corporate
                        </p>
                        <p className="font-semibold text-foreground">
                          {form.corporateName}
                        </p>
                      </div>
                    )}
                    {form.phoneNumber && (
                      <div>
                        <p className="text-muted-foreground text-xs">Phone</p>
                        <p className="font-semibold text-foreground">
                          {form.phoneNumber}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-muted-foreground text-xs">
                        Coffee Species
                      </p>
                      <p className="font-semibold text-foreground">
                        {form.commodity}
                      </p>
                    </div>
                    {form.variety1Name && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground text-xs">
                          Varieties
                        </p>
                        <p className="font-semibold text-foreground">
                          {[
                            form.variety1Name &&
                              `${form.variety1Name} ${form.variety1Pct ? `(${form.variety1Pct}%)` : ""}`,
                            form.variety2Name &&
                              `${form.variety2Name} ${form.variety2Pct ? `(${form.variety2Pct}%)` : ""}`,
                            form.variety3Name &&
                              `${form.variety3Name} ${form.variety3Pct ? `(${form.variety3Pct}%)` : ""}`,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-muted-foreground text-xs">Grade</p>
                      <Badge
                        variant="secondary"
                        className="font-semibold text-xs"
                      >
                        {form.grade}
                      </Badge>
                    </div>
                    {form.scoring && (
                      <div>
                        <p className="text-muted-foreground text-xs">Scoring</p>
                        <p className="font-semibold text-foreground">
                          {form.scoring}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-muted-foreground text-xs">Region</p>
                      <p className="font-semibold text-foreground">
                        {form.adminArea}
                      </p>
                    </div>
                    {form.mount && (
                      <div>
                        <p className="text-muted-foreground text-xs">Mount</p>
                        <p className="font-semibold text-foreground">
                          {form.mount}
                        </p>
                      </div>
                    )}
                    {form.farmSize && (
                      <div>
                        <p className="text-muted-foreground text-xs">
                          Farm Size
                        </p>
                        <p className="font-semibold text-foreground">
                          {form.farmSize} ha
                        </p>
                      </div>
                    )}
                    {form.coffeeTreeCount && (
                      <div>
                        <p className="text-muted-foreground text-xs">
                          Coffee Trees
                        </p>
                        <p className="font-semibold text-foreground">
                          {form.coffeeTreeCount} pcs
                        </p>
                      </div>
                    )}
                    {form.shadeTreePct && (
                      <div>
                        <p className="text-muted-foreground text-xs">
                          Shade Trees
                        </p>
                        <p className="font-semibold text-foreground">
                          {form.shadeTreePct}%
                        </p>
                      </div>
                    )}
                  </div>

                  {/* QR Code */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3, type: "spring" }}
                    className="p-5 bg-white rounded-2xl shadow-md border border-border"
                  >
                    <QRCodeSVG
                      value={qrValue}
                      size={200}
                      level="H"
                      {...(qrLogoUrl
                        ? {
                            imageSettings: {
                              src: qrLogoUrl,
                              height: 70,
                              width: 70,
                              excavate: true,
                            },
                          }
                        : {})}
                    />
                  </motion.div>

                  {/* Member Number */}
                  <div
                    className="flex flex-col items-center gap-1"
                    data-ocid="registration.member_number.card"
                  >
                    <p className="text-xs text-muted-foreground font-sans">
                      Nomor Anggota
                    </p>
                    <p className="text-2xl font-display font-bold tracking-widest text-foreground">
                      {formatMemberNumber(submittedSeqNum ?? BigInt(0), null)}
                    </p>
                    <p className="text-xs text-muted-foreground font-sans text-center max-w-xs">
                      Kode area akan ditetapkan oleh admin setelah verifikasi
                    </p>
                  </div>

                  <p className="text-xs text-muted-foreground font-sans text-center max-w-xs">
                    Scan this code to view the farm traceability record.
                  </p>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-3 w-full">
                    <Button
                      data-ocid="registration.qr_download.button"
                      onClick={handleDownloadQR}
                      variant="outline"
                      className="flex-1 font-sans"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download QR Code
                    </Button>
                    <Button
                      data-ocid="registration.register_another.button"
                      onClick={handleReset}
                      className="flex-1 font-sans hero-gradient border-0 text-white hover:opacity-90"
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Register Another
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AppFooter />
    </div>
  );
}
