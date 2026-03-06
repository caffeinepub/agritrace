import { Heart, Leaf } from "lucide-react";

export default function AppFooter() {
  const year = new Date().getFullYear();
  const hostname = window.location.hostname;

  return (
    <footer className="border-t border-border bg-card mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Leaf className="w-4 h-4 text-primary" />
          <span className="font-display font-semibold text-foreground">
            AgriTrace GeoTag
          </span>
          <span>— Agricultural Traceability Platform</span>
        </div>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          © {year}. Built with{" "}
          <Heart className="w-3 h-3 text-destructive fill-current" /> using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground transition-colors"
          >
            caffeine.ai
          </a>
        </p>
      </div>
    </footer>
  );
}
