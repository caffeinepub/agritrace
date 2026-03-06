import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Leaf, ShieldCheck } from "lucide-react";
import { Loader2 } from "lucide-react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

interface AppHeaderProps {
  showAdminLink?: boolean;
}

export default function AppHeader({ showAdminLink = true }: AppHeaderProps) {
  const { login, clear, loginStatus, identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  const isAuthenticated = !!identity;
  const isLoggingIn = loginStatus === "logging-in";

  const handleAuth = async () => {
    if (isAuthenticated) {
      await clear();
      queryClient.clear();
    } else {
      try {
        await login();
      } catch (error: unknown) {
        const err = error as Error;
        if (err.message === "User is already authenticated") {
          await clear();
          setTimeout(() => login(), 300);
        }
      }
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/90 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo + Brand */}
        <Link
          to="/"
          data-ocid="nav.link"
          className="flex items-center gap-2.5 group"
        >
          <div className="w-9 h-9 rounded-xl hero-gradient flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-display text-base font-bold text-foreground tracking-tight">
              AgriTrace
            </span>
            <span className="text-xs text-muted-foreground font-sans -mt-0.5">
              GeoTag
            </span>
          </div>
        </Link>

        {/* Nav Actions */}
        <nav className="flex items-center gap-2">
          {showAdminLink && isAuthenticated && (
            <Link to="/admin" data-ocid="nav.admin.link">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <ShieldCheck className="w-4 h-4" />
                <span className="hidden sm:inline">Admin</span>
              </Button>
            </Link>
          )}

          <Button
            data-ocid="nav.auth.button"
            onClick={handleAuth}
            disabled={isLoggingIn}
            size="sm"
            variant={isAuthenticated ? "outline" : "default"}
            className={
              isAuthenticated
                ? ""
                : "hero-gradient border-0 text-white hover:opacity-90"
            }
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Logging in…
              </>
            ) : isAuthenticated ? (
              "Logout"
            ) : (
              "Login"
            )}
          </Button>
        </nav>
      </div>
    </header>
  );
}
