import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Apple,
  ArrowLeft,
  BarChart3,
  Edit,
  Leaf,
  LogIn,
  MapIcon,
  MapPin,
  Monitor,
  QrCode,
  RefreshCcw,
  ScanLine,
  Search,
  ShieldCheck,
  ShieldX,
  Smartphone,
  Users,
} from "lucide-react";
import { motion } from "motion/react";
import { Suspense, lazy, useState } from "react";
import { toast } from "sonner";
import type { FarmRecord } from "../backend.d";
import AppFooter from "../components/AppFooter";
import AppHeader from "../components/AppHeader";
import { QRCodeSVG } from "../components/QRCode";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAssignSelfAsAdmin,
  useGetAllFarmRecords,
  useGetAllFarmRecordsWithIds,
  useGetAllScanStats,
  useGetQrLogoUrl,
  useIsCallerAdmin,
  useSetFarmAreaCode,
  useSetQrLogoUrl,
} from "../hooks/useQueries";

// Lazy-load the map to avoid SSR issues
const AdminMap = lazy(() => import("../components/AdminMap"));

function detectDevice(userAgent: string): "iPhone" | "Android" | "PC" {
  if (/iPhone|iPad|iPod/.test(userAgent)) return "iPhone";
  if (/Android/.test(userAgent)) return "Android";
  return "PC";
}

function formatBigintDate(ts: bigint): string {
  return new Date(Number(ts)).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
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

function DeviceIcon({ device }: { device: "iPhone" | "Android" | "PC" }) {
  if (device === "iPhone")
    return <Apple className="w-4 h-4 text-muted-foreground" />;
  if (device === "Android")
    return <Smartphone className="w-4 h-4 text-muted-foreground" />;
  return <Monitor className="w-4 h-4 text-muted-foreground" />;
}

export default function AdminDashboardPage() {
  const { data: isAdmin, isLoading: adminCheckLoading } = useIsCallerAdmin();
  const { identity, login, loginStatus } = useInternetIdentity();
  const queryClient = useQueryClient();
  const assignSelfAsAdmin = useAssignSelfAsAdmin();

  const isAuthenticated = !!identity;
  const isLoggingIn = loginStatus === "logging-in";

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["allFarmRecords"] });
    queryClient.invalidateQueries({ queryKey: ["allFarmRecordsWithIds"] });
    queryClient.invalidateQueries({ queryKey: ["allScanStats"] });
    queryClient.invalidateQueries({ queryKey: ["isCallerAdmin"] });
    toast.success("Data refreshed");
  };

  const handleSelfRegisterAdmin = async () => {
    try {
      await assignSelfAsAdmin.mutateAsync();
      toast.success("Berhasil! Kamu sekarang adalah admin.");
      queryClient.invalidateQueries({ queryKey: ["isCallerAdmin"] });
    } catch {
      toast.error(
        "Gagal mendaftarkan sebagai admin. Mungkin sudah ada admin terdaftar.",
      );
    }
  };

  // Loading admin check
  if (adminCheckLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <AppHeader />
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-10">
          <div data-ocid="admin.loading_state" className="space-y-4">
            <Skeleton className="h-12 w-1/3" />
            <Skeleton className="h-48 w-full" />
          </div>
        </main>
        <AppFooter />
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <AppHeader />
        <main className="flex-1 flex items-center justify-center px-4 py-10">
          <Card
            className="max-w-sm w-full shadow-md"
            data-ocid="admin.error_state"
          >
            <CardContent className="pt-8 pb-8 text-center">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <ShieldX className="w-7 h-7 text-muted-foreground" />
              </div>
              <h2 className="font-display text-xl font-bold mb-2">
                Login Required
              </h2>
              <p className="text-muted-foreground font-sans text-sm mb-6">
                You must be logged in to access the admin dashboard.
              </p>
              <Button
                data-ocid="admin.login.button"
                onClick={login}
                disabled={isLoggingIn}
                className="w-full font-sans hero-gradient border-0 text-white"
              >
                <LogIn className="mr-2 h-4 w-4" />
                {isLoggingIn ? "Logging in…" : "Login with Internet Identity"}
              </Button>
            </CardContent>
          </Card>
        </main>
        <AppFooter />
      </div>
    );
  }

  // Not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <AppHeader />
        <main className="flex-1 flex items-center justify-center px-4 py-10">
          <Card
            className="max-w-sm w-full shadow-md"
            data-ocid="admin.error_state"
          >
            <CardContent className="pt-8 pb-8 text-center">
              <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <ShieldX className="w-7 h-7 text-destructive" />
              </div>
              <h2 className="font-display text-xl font-bold mb-2">
                Access Denied
              </h2>
              <p className="text-muted-foreground font-sans text-sm mb-6">
                Akun kamu belum terdaftar sebagai admin.
              </p>
              <Button
                data-ocid="admin.self_register.button"
                onClick={handleSelfRegisterAdmin}
                disabled={assignSelfAsAdmin.isPending}
                className="w-full font-sans hero-gradient border-0 text-white mb-3"
              >
                {assignSelfAsAdmin.isPending
                  ? "Mendaftarkan…"
                  : "Jadikan Saya Admin"}
              </Button>
              <Link to="/">
                <Button
                  variant="outline"
                  className="w-full font-sans"
                  data-ocid="admin.home.link"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Kembali ke Beranda
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
      <AppHeader />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              AgriTrace Control Center
            </h1>
            <p className="text-muted-foreground font-sans text-sm mt-0.5">
              Farm management and traceability dashboard
            </p>
          </div>
          <Button
            data-ocid="admin.refresh.button"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="font-sans gap-1.5"
          >
            <RefreshCcw className="w-4 h-4" />
            Refresh
          </Button>
        </div>

        <Tabs defaultValue="records">
          <TabsList
            className="w-full sm:w-auto mb-6 font-sans"
            data-ocid="admin.tabs.tab"
          >
            <TabsTrigger
              value="records"
              data-ocid="admin.records.tab"
              className="flex items-center gap-1.5"
            >
              <Users className="w-4 h-4" />
              <span>Farm Records</span>
            </TabsTrigger>
            <TabsTrigger
              value="map"
              data-ocid="admin.map.tab"
              className="flex items-center gap-1.5"
            >
              <MapIcon className="w-4 h-4" />
              <span>Map View</span>
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              data-ocid="admin.analytics.tab"
              className="flex items-center gap-1.5"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Scan Analytics</span>
            </TabsTrigger>
            <TabsTrigger
              value="qrlogo"
              data-ocid="admin.qrlogo.tab"
              className="flex items-center gap-1.5"
            >
              <QrCode className="w-4 h-4" />
              <span>QR Logo</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="records">
            <FarmRecordsTab />
          </TabsContent>

          <TabsContent value="map">
            <MapTab />
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsTab />
          </TabsContent>
          <TabsContent value="qrlogo">
            <QrLogoTab />
          </TabsContent>
        </Tabs>
      </main>

      <AppFooter />
    </div>
  );
}

/* ─── SetAreaCodeForm ─────────────────────────────────────────────── */
function SetAreaCodeForm({
  farmId,
  currentCode,
}: { farmId: string; currentCode: string | null }) {
  const [code, setCode] = useState(currentCode ?? "");
  const setFarmAreaCode = useSetFarmAreaCode();
  const queryClient = useQueryClient();

  const handleSave = async () => {
    try {
      await setFarmAreaCode.mutateAsync({ farmId, code: code.toUpperCase() });
      toast.success("Kode area berhasil disimpan!");
      queryClient.invalidateQueries({ queryKey: ["allFarmRecordsWithIds"] });
    } catch {
      toast.error("Gagal menyimpan kode area.");
    }
  };

  return (
    <div className="space-y-4 py-2">
      <div className="space-y-2">
        <Label>Kode Area (1 huruf, contoh: D)</Label>
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.slice(0, 1))}
          placeholder="D"
          maxLength={1}
          className="font-mono text-center text-2xl uppercase"
          data-ocid="admin.areacode.input"
        />
      </div>
      <Button
        onClick={handleSave}
        disabled={!code || setFarmAreaCode.isPending}
        className="w-full"
        data-ocid="admin.areacode.save_button"
      >
        {setFarmAreaCode.isPending ? "Menyimpan..." : "Simpan"}
      </Button>
    </div>
  );
}

/* ─── Tab 1: Farm Records ─────────────────────────────────────────── */
function FarmRecordsTab() {
  const {
    data: farmsWithIds,
    isLoading,
    isError,
  } = useGetAllFarmRecordsWithIds();
  const [search, setSearch] = useState("");
  const [selectedFarm, setSelectedFarm] = useState<
    (FarmRecord & { _farmId: string }) | null
  >(null);

  const filteredFarms = (farmsWithIds ?? []).filter(([, farm]) =>
    [farm.farmerName, farm.commodity, farm.grade, farm.adminArea]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  if (isLoading) {
    return (
      <div data-ocid="admin.records.loading_state" className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton items
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div
        data-ocid="admin.records.error_state"
        className="text-center py-10 text-destructive font-sans text-sm"
      >
        Failed to load farm records. Please refresh.
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          data-ocid="admin.records.search_input"
          placeholder="Search farms…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 font-sans"
        />
      </div>

      {/* Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table data-ocid="admin.records.table">
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="font-display font-semibold">
                    Farmer Name
                  </TableHead>
                  <TableHead className="font-display font-semibold">
                    Nomor Anggota
                  </TableHead>
                  <TableHead className="font-display font-semibold">
                    Commodity
                  </TableHead>
                  <TableHead className="font-display font-semibold">
                    Grade
                  </TableHead>
                  <TableHead className="font-display font-semibold hidden sm:table-cell">
                    Admin Area
                  </TableHead>
                  <TableHead className="font-display font-semibold hidden md:table-cell">
                    Coordinates
                  </TableHead>
                  <TableHead className="font-display font-semibold hidden lg:table-cell">
                    Registered
                  </TableHead>
                  <TableHead className="font-display font-semibold text-right">
                    QR / Kode
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFarms.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-10 text-muted-foreground font-sans"
                      data-ocid="admin.records.empty_state"
                    >
                      <Leaf className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      No farm records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFarms.map(([farmId, farm], idx) => (
                    <TableRow
                      key={`${farmId}-${Number(farm.createdAt)}`}
                      data-ocid={`admin.records.row.${idx + 1}`}
                      className="hover:bg-muted/30 font-sans"
                    >
                      <TableCell className="font-medium">
                        {farm.farmerName}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono font-bold text-sm text-primary">
                          {formatMemberNumber(
                            farm.sequenceNumber,
                            farm.areaCode,
                          )}
                        </span>
                      </TableCell>
                      <TableCell>{farm.commodity}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="font-semibold text-xs"
                        >
                          {farm.grade.includes(" — ")
                            ? farm.grade.split(" — ")[0]
                            : farm.grade}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                        {farm.adminArea}
                      </TableCell>
                      <TableCell className="hidden md:table-cell font-mono text-xs text-muted-foreground">
                        {farm.latitude.toFixed(4)}, {farm.longitude.toFixed(4)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {formatBigintDate(farm.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Set Area Code Dialog */}
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                data-ocid={`admin.records.areacode.${idx + 1}`}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-xs">
                              <DialogHeader>
                                <DialogTitle>Set Kode Area</DialogTitle>
                              </DialogHeader>
                              <SetAreaCodeForm
                                farmId={farmId}
                                currentCode={farm.areaCode}
                              />
                            </DialogContent>
                          </Dialog>

                          {/* QR Code Dialog */}
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                data-ocid={`admin.records.qr.${idx + 1}`}
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedFarm({ ...farm, _farmId: farmId });
                                }}
                              >
                                <QrCode className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent
                              className="max-w-sm"
                              data-ocid="admin.records.qr.dialog"
                            >
                              <DialogHeader>
                                <DialogTitle className="font-display">
                                  QR Code
                                </DialogTitle>
                              </DialogHeader>
                              {selectedFarm && <QRModal farm={selectedFarm} />}
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function QRModal({ farm }: { farm: FarmRecord & { _farmId: string } }) {
  const qrValue = `${window.location.origin}/trace/${farm._farmId}`;
  return (
    <div className="flex flex-col items-center gap-3 py-2">
      <div className="flex flex-col text-center gap-0.5 font-sans text-sm">
        <p className="font-semibold text-foreground">{farm.farmerName}</p>
        <p className="text-muted-foreground">
          {farm.commodity} — Grade {farm.grade}
        </p>
      </div>
      <div className="p-4 bg-white rounded-xl border border-border shadow-sm">
        <QRCodeSVG value={qrValue} size={160} level="H" />
      </div>
      <p className="text-xs font-mono text-muted-foreground break-all text-center">
        {qrValue}
      </p>
    </div>
  );
}

/* ─── Tab 2: Map View ─────────────────────────────────────────────── */
function MapTab() {
  const { data: farms, isLoading } = useGetAllFarmRecords();

  if (isLoading) {
    return (
      <div data-ocid="admin.map.loading_state">
        <Skeleton className="h-[500px] w-full rounded-xl" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Card className="shadow-sm overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Farm Locations
            <Badge variant="secondary" className="font-sans text-xs ml-auto">
              {farms?.length ?? 0} farms
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Suspense
            fallback={
              <Skeleton
                className="h-[450px] w-full"
                data-ocid="admin.map.loading_state"
              />
            }
          >
            <AdminMap farms={farms ?? []} />
          </Suspense>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ─── Tab 3: Scan Analytics ─────────────────────────────────────────── */
function AnalyticsTab() {
  const { data: scanEvents, isLoading, isError } = useGetAllScanStats();
  const { data: farms } = useGetAllFarmRecords();

  const totalScans = scanEvents?.length ?? 0;
  const totalFarms = farms?.length ?? 0;

  const deviceCounts = (scanEvents ?? []).reduce(
    (acc, ev) => {
      const device = detectDevice(ev.userAgent);
      acc[device] = (acc[device] ?? 0) + 1;
      return acc;
    },
    {} as Partial<Record<"iPhone" | "Android" | "PC", number>>,
  );

  if (isLoading) {
    return (
      <div data-ocid="admin.analytics.loading_state" className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {(["a", "b", "c", "d"] as const).map((k) => (
            <Skeleton key={k} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (isError) {
    return (
      <div
        data-ocid="admin.analytics.error_state"
        className="text-center py-10 text-destructive font-sans text-sm"
      >
        Failed to load scan analytics. Please refresh.
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total Scans"
          value={totalScans}
          icon={<ScanLine className="w-5 h-5 text-primary" />}
          ocid="admin.analytics.total_scans.card"
        />
        <StatCard
          label="Farms Registered"
          value={totalFarms}
          icon={<Leaf className="w-5 h-5 text-primary" />}
          ocid="admin.analytics.total_farms.card"
        />
        <StatCard
          label="Mobile Scans"
          value={(deviceCounts.iPhone ?? 0) + (deviceCounts.Android ?? 0)}
          icon={<Smartphone className="w-5 h-5 text-primary" />}
          ocid="admin.analytics.mobile_scans.card"
        />
        <StatCard
          label="Desktop Scans"
          value={deviceCounts.PC ?? 0}
          icon={<Monitor className="w-5 h-5 text-primary" />}
          ocid="admin.analytics.desktop_scans.card"
        />
      </div>

      {/* Scan Events Table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            All Scan Events
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table data-ocid="admin.analytics.table">
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="font-display font-semibold">
                    Farm ID
                  </TableHead>
                  <TableHead className="font-display font-semibold">
                    Device
                  </TableHead>
                  <TableHead className="font-display font-semibold hidden sm:table-cell">
                    User Agent
                  </TableHead>
                  <TableHead className="font-display font-semibold">
                    Timestamp
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(scanEvents ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center py-10 text-muted-foreground font-sans"
                      data-ocid="admin.analytics.empty_state"
                    >
                      <ScanLine className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      No scan events recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  (scanEvents ?? []).map((ev, idx) => {
                    const device = detectDevice(ev.userAgent);
                    return (
                      <TableRow
                        key={`${ev.farmId}-${Number(ev.timestamp)}-${idx}`}
                        data-ocid={`admin.analytics.row.${idx + 1}`}
                        className="font-sans hover:bg-muted/30"
                      >
                        <TableCell>
                          <Link
                            to="/trace/$farmId"
                            params={{ farmId: ev.farmId }}
                            data-ocid={`admin.analytics.trace.link.${idx + 1}`}
                            className="font-mono text-xs text-primary hover:underline"
                          >
                            {ev.farmId.slice(0, 16)}…
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm">
                            <DeviceIcon device={device} />
                            <span className="text-muted-foreground">
                              {device}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {ev.userAgent}
                          </p>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatBigintDate(ev.timestamp)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function StatCard({
  label,
  value,
  icon,
  ocid,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  ocid: string;
}) {
  return (
    <Card data-ocid={ocid} className="shadow-sm">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-2xl font-display font-bold text-foreground">
              {value}
            </p>
            <p className="text-xs text-muted-foreground font-sans mt-0.5">
              {label}
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── QR Logo Tab ─────────────────────────────────────────────────── */
function QrLogoTab() {
  const { data: currentLogoUrl = "", isLoading } = useGetQrLogoUrl();
  const setQrLogoUrl = useSetQrLogoUrl();
  const [inputUrl, setInputUrl] = useState(currentLogoUrl);
  const [previewUrl, setPreviewUrl] = useState(currentLogoUrl);

  // Sync input when data loads
  if (!isLoading && inputUrl === "" && currentLogoUrl !== "") {
    setInputUrl(currentLogoUrl);
    setPreviewUrl(currentLogoUrl);
  }

  const handleSave = async () => {
    try {
      await setQrLogoUrl.mutateAsync(inputUrl);
      setPreviewUrl(inputUrl);
      toast.success("Logo QR berhasil disimpan!");
    } catch {
      toast.error("Gagal menyimpan logo. Pastikan kamu adalah admin.");
    }
  };

  const handleClear = async () => {
    try {
      await setQrLogoUrl.mutateAsync("");
      setInputUrl("");
      setPreviewUrl("");
      toast.success("Logo QR berhasil dihapus.");
    } catch {
      toast.error("Gagal menghapus logo.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <QrCode className="w-5 h-5" />
          Pengaturan Logo QR Code
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div data-ocid="admin.qrlogo.loading_state" className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-32" />
          </div>
        ) : (
          <>
            {/* Current logo preview */}
            {previewUrl && (
              <div className="space-y-2">
                <p className="text-sm font-medium font-sans text-muted-foreground">
                  Preview Logo Saat Ini
                </p>
                <div className="inline-flex items-center justify-center p-4 bg-white rounded-xl border border-border shadow-sm">
                  <img
                    src={previewUrl}
                    alt="QR Logo"
                    className="w-20 h-20 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              </div>
            )}

            {/* URL input */}
            <div className="space-y-2">
              <label
                className="text-sm font-medium font-sans"
                htmlFor="qr-logo-url"
              >
                URL Logo
              </label>
              <Input
                id="qr-logo-url"
                data-ocid="admin.qrlogo.input"
                type="url"
                placeholder="https://contoh.com/logo.png"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                className="font-sans"
              />
              <p className="text-xs text-muted-foreground font-sans">
                Masukkan URL gambar logo yang akan ditampilkan di tengah QR
                code. Gunakan gambar dengan latar belakang transparan (PNG)
                untuk hasil terbaik.
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <Button
                data-ocid="admin.qrlogo.save_button"
                onClick={handleSave}
                disabled={setQrLogoUrl.isPending}
                className="font-sans"
              >
                {setQrLogoUrl.isPending ? "Menyimpan..." : "Simpan Logo"}
              </Button>
              {previewUrl && (
                <Button
                  data-ocid="admin.qrlogo.delete_button"
                  onClick={handleClear}
                  variant="outline"
                  disabled={setQrLogoUrl.isPending}
                  className="font-sans text-destructive border-destructive/30 hover:bg-destructive/10"
                >
                  Hapus Logo
                </Button>
              )}
            </div>

            {setQrLogoUrl.isSuccess && (
              <p
                data-ocid="admin.qrlogo.success_state"
                className="text-sm text-green-600 font-sans"
              >
                ✓ Logo berhasil diperbarui
              </p>
            )}
            {setQrLogoUrl.isError && (
              <p
                data-ocid="admin.qrlogo.error_state"
                className="text-sm text-destructive font-sans"
              >
                Gagal menyimpan. Pastikan kamu memiliki hak akses admin.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
