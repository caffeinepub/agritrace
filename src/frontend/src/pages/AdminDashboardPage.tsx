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
import { QRCodeSVG } from "qrcode.react";
import { Suspense, lazy, useState } from "react";
import { toast } from "sonner";
import type { FarmRecord } from "../backend.d";
import AppFooter from "../components/AppFooter";
import AppHeader from "../components/AppHeader";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAssignSelfAsAdmin,
  useGetAllFarmRecords,
  useGetAllScanStats,
  useIsCallerAdmin,
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
                onClick={() => login()}
                disabled={isLoggingIn}
                className="w-full font-sans hero-gradient border-0 text-white hover:opacity-90"
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

  // Access denied
  if (isAdmin === false) {
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
                Akses Ditolak
              </h2>
              <p className="text-muted-foreground font-sans text-sm mb-4">
                Akun kamu belum terdaftar sebagai admin. Jika kamu adalah
                pemilik aplikasi ini, klik tombol di bawah untuk mendaftarkan
                diri sebagai admin pertama.
              </p>
              <Button
                data-ocid="admin.self_register.button"
                onClick={handleSelfRegisterAdmin}
                disabled={assignSelfAsAdmin.isPending}
                className="w-full font-sans hero-gradient border-0 text-white hover:opacity-90 mb-3"
              >
                <ShieldCheck className="mr-2 h-4 w-4" />
                {assignSelfAsAdmin.isPending
                  ? "Mendaftarkan…"
                  : "Jadikan Saya Admin"}
              </Button>
              <Link to="/" data-ocid="admin.home.link">
                <Button variant="outline" className="w-full font-sans">
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

      {/* Admin Hero */}
      <section className="hero-gradient text-white py-8 px-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-5 h-5 text-white/80" />
              <Badge className="bg-white/20 text-white border-white/30 text-xs font-sans">
                Admin Dashboard
              </Badge>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold">
              AgriTrace Control Center
            </h1>
            <p className="text-white/70 text-sm font-sans mt-1">
              Manage farms, monitor locations, and view analytics
            </p>
          </div>
          <Button
            data-ocid="admin.refresh.button"
            onClick={handleRefresh}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20 font-sans hidden sm:flex"
          >
            <RefreshCcw className="mr-1.5 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </section>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        <Tabs defaultValue="records" className="w-full">
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
        </Tabs>
      </main>

      <AppFooter />
    </div>
  );
}

/* ─── Tab 1: Farm Records ─────────────────────────────────────────── */
function FarmRecordsTab() {
  const { data: farms, isLoading, isError } = useGetAllFarmRecords();
  const [search, setSearch] = useState("");
  const [selectedFarm, setSelectedFarm] = useState<
    (FarmRecord & { _farmId: string }) | null
  >(null);

  // We have to store farmId alongside the record for QR generation
  // getAllFarmRecords() returns Array<FarmRecord> — we'll use index as key reference
  const filteredFarms = (farms ?? []).filter((f) =>
    [f.farmerName, f.commodity, f.grade, f.adminArea]
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
                    QR
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFarms.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-10 text-muted-foreground font-sans"
                      data-ocid="admin.records.empty_state"
                    >
                      <Leaf className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      No farm records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFarms.map((farm, idx) => (
                    <TableRow
                      key={`${farm.farmerName}-${Number(farm.createdAt)}`}
                      data-ocid={`admin.records.row.${idx + 1}`}
                      className="hover:bg-muted/30 font-sans"
                    >
                      <TableCell className="font-medium">
                        {farm.farmerName}
                      </TableCell>
                      <TableCell>{farm.commodity}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="font-semibold text-xs"
                        >
                          {farm.grade}
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
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              data-ocid={`admin.records.qr.${idx + 1}`}
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                // Use a generated farmId from the record's creation time + index as stable key
                                const farmId = `farm-${Number(farm.createdAt)}-${idx}`;
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
