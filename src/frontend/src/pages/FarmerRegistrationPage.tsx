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
  CheckCircle2,
  Download,
  Leaf,
  Loader2,
  MapIcon,
  MapPin,
  QrCode,
  RotateCcw,
  Sprout,
  User,
  Wheat,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import type { FarmRecord } from "../backend.d";
import AppFooter from "../components/AppFooter";
import AppHeader from "../components/AppHeader";
import { useAddFarmRecord } from "../hooks/useQueries";

interface FormState {
  farmerName: string;
  commodity: string;
  grade: string;
  adminArea: string;
  location: string; // format: "lat, lng"
}

const INITIAL_FORM: FormState = {
  farmerName: "",
  commodity: "",
  grade: "",
  adminArea: "",
  location: "",
};

function parseLocation(
  location: string,
): { latitude: number; longitude: number } | null {
  const parts = location.split(",").map((s) => s.trim());
  if (parts.length !== 2) return null;
  const lat = Number.parseFloat(parts[0]);
  const lng = Number.parseFloat(parts[1]);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { latitude: lat, longitude: lng };
}

const COMMODITY_SUGGESTIONS = [
  "Rice",
  "Corn",
  "Coffee",
  "Sugarcane",
  "Coconut",
  "Banana",
  "Cassava",
  "Mango",
];

export default function FarmerRegistrationPage() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [geoLoading, setGeoLoading] = useState(false);
  const [submittedFarmId, setSubmittedFarmId] = useState<string | null>(null);
  const qrRef = useRef<SVGSVGElement>(null);

  const addFarmRecord = useAddFarmRecord();

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
        toast.success("Location captured successfully!");
      },
      (err) => {
        setGeoLoading(false);
        toast.error(`Location error: ${err.message}`);
      },
      { timeout: 10000 },
    );
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.farmerName.trim()) return toast.error("Farmer name is required.");
    if (!form.commodity.trim())
      return toast.error("Commodity type is required.");
    if (!form.grade) return toast.error("Grade is required.");
    if (!form.adminArea.trim())
      return toast.error("Administrative area is required.");
    const coords = parseLocation(form.location);
    if (!coords) {
      return toast.error(
        "Format lokasi tidak valid. Gunakan format: -6.200000, 106.816666",
      );
    }

    const farmId = crypto.randomUUID();
    const record: FarmRecord = {
      farmerName: form.farmerName,
      commodity: form.commodity,
      grade: form.grade,
      adminArea: form.adminArea,
      latitude: coords.latitude,
      longitude: coords.longitude,
      createdAt: BigInt(Date.now()),
    };

    try {
      await addFarmRecord.mutateAsync({ farmId, record });
      setSubmittedFarmId(farmId);
      toast.success("Farm record registered successfully!");
    } catch (err: unknown) {
      toast.error("Failed to register farm record. Please try again.");
      console.error(err);
    }
  };

  const handleDownloadQR = () => {
    if (!qrRef.current || !submittedFarmId) return;
    const svg = qrRef.current;
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agritrace-${submittedFarmId.slice(0, 8)}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("QR code downloaded!");
  };

  const handleReset = () => {
    setForm(INITIAL_FORM);
    setSubmittedFarmId(null);
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
                        placeholder="e.g. Juan dela Cruz"
                        value={form.farmerName}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, farmerName: e.target.value }))
                        }
                        required
                        className="font-sans"
                      />
                    </div>

                    {/* Commodity */}
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="commodity"
                        className="flex items-center gap-1.5 font-sans font-medium"
                      >
                        <Wheat className="w-3.5 h-3.5 text-muted-foreground" />
                        Commodity Type
                      </Label>
                      <Input
                        id="commodity"
                        data-ocid="registration.commodity.input"
                        placeholder="e.g. Rice, Corn, Coffee"
                        value={form.commodity}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, commodity: e.target.value }))
                        }
                        required
                        list="commodity-suggestions"
                        className="font-sans"
                      />
                      <datalist id="commodity-suggestions">
                        {COMMODITY_SUGGESTIONS.map((c) => (
                          <option key={c} value={c} />
                        ))}
                      </datalist>
                    </div>

                    {/* Grade */}
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1.5 font-sans font-medium">
                        Grade
                      </Label>
                      <Select
                        value={form.grade}
                        onValueChange={(val) =>
                          setForm((p) => ({ ...p, grade: val }))
                        }
                      >
                        <SelectTrigger
                          data-ocid="registration.grade.select"
                          className="font-sans"
                        >
                          <SelectValue placeholder="Select a grade" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A">
                            Grade A — Premium Quality
                          </SelectItem>
                          <SelectItem value="B">
                            Grade B — Standard Quality
                          </SelectItem>
                          <SelectItem value="C">
                            Grade C — Economy Quality
                          </SelectItem>
                          <SelectItem value="D">
                            Grade D — Below Standard
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

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

                    {/* Geolocation */}
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
                        placeholder="e.g. -6.200000, 106.816666"
                        value={form.location}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, location: e.target.value }))
                        }
                        className="font-sans text-sm font-mono"
                      />

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
                      <p className="text-xs text-muted-foreground font-sans">
                        Salin koordinat dari Google Maps (klik kanan &gt;
                        "What's here?"), atau gunakan tombol GPS di atas.
                      </p>
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
                    <div>
                      <p className="text-muted-foreground text-xs">Commodity</p>
                      <p className="font-semibold text-foreground">
                        {form.commodity}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Grade</p>
                      <Badge
                        variant="secondary"
                        className="font-semibold text-xs"
                      >
                        Grade {form.grade}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Region</p>
                      <p className="font-semibold text-foreground">
                        {form.adminArea}
                      </p>
                    </div>
                  </div>

                  {/* QR Code */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3, type: "spring" }}
                    className="p-5 bg-white rounded-2xl shadow-md border border-border"
                  >
                    <QRCodeSVG
                      ref={qrRef}
                      value={qrValue}
                      size={200}
                      level="H"
                      imageSettings={{
                        src: "/assets/generated/agritrace-qr-logo-transparent.dim_80x80.png",
                        height: 40,
                        width: 40,
                        excavate: true,
                      }}
                    />
                  </motion.div>

                  <p className="text-xs text-muted-foreground font-sans text-center max-w-xs">
                    Scan this code to view the farm traceability record.
                  </p>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-3 w-full">
                    <Button
                      data-ocid="registration.qr_download.button"
                      onClick={handleDownloadQR}
                      variant="outline"
                      className="flex-1 font-sans qr-download-btn"
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
                      Register Another Farm
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
