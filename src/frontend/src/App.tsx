import { Toaster } from "@/components/ui/sonner";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import FarmerRegistrationPage from "./pages/FarmerRegistrationPage";
import TraceabilityPage from "./pages/TraceabilityPage";

const rootLayoutRoute = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <Toaster richColors position="top-right" />
    </>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootLayoutRoute,
  path: "/",
  component: FarmerRegistrationPage,
});

const traceRoute = createRoute({
  getParentRoute: () => rootLayoutRoute,
  path: "/trace/$farmId",
  component: TraceabilityPage,
});

const adminRoute = createRoute({
  getParentRoute: () => rootLayoutRoute,
  path: "/admin",
  component: AdminDashboardPage,
});

const routeTree = rootLayoutRoute.addChildren([
  indexRoute,
  traceRoute,
  adminRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return <RouterProvider router={router} />;
}
