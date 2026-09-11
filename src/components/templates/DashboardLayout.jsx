import { useState } from "react";
import Button from "../atoms/Button";
import Icon from "../atoms/Icon";
import Sidebar from "../organisms/Sidebar";

const items = [
  { id: "ringkasan", label: "Ringkasan", icon: "grid" },
  { id: "incomes", label: "Income", icon: "down" },
  { id: "expenses", label: "Expense", icon: "up" },
  { id: "transfers", label: "Transfer", icon: "arrows" },
];

export default function DashboardLayout({
  children,
  user,
  onLogout,
  loggingOut = false,
  navigation = items,
  selectedId,
  onSelect,
}) {
  const [activeId, setActiveId] = useState("ringkasan");
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="min-h-dvh lg:pl-64">
      <a
        href="#konten"
        className="sr-only z-50 rounded-lg bg-white p-3 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Lewati ke konten
      </a>
      <Sidebar
        items={navigation}
        activeId={selectedId ?? activeId}
        onNavigate={onSelect || setActiveId}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />
      <header className="flex min-h-20 items-center justify-between gap-4 border-b border-primary/10 px-5 sm:px-8 lg:px-10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            className="lg:hidden"
            aria-label="Buka menu navigasi"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <Icon name="menu" />
          </Button>
          <span className="text-sm text-muted">
            Pembukuan <span className="mx-2 text-primary/30">/</span>{" "}
            <span className="font-medium text-primary">Dashboard</span>
          </span>
        </div>
        {user ? (
          <div className="flex min-w-0 items-center gap-2">
            <span className="hidden max-w-40 truncate text-xs text-muted sm:block">
              {user.name}
            </span>
            <span className="rounded-full bg-white/50 px-3 py-1.5 text-xs">
              {user.role === "admin" ? "Admin" : "Akses baca"}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={onLogout}
              loading={loggingOut}
            >
              Keluar
            </Button>
          </div>
        ) : (
          <span className="flex shrink-0 items-center gap-2 rounded-full border border-primary/10 bg-white/50 px-3 py-1.5 text-xs">
            <span className="size-1.5 rounded-full bg-secondary" />
            Akses baca
          </span>
        )}
      </header>
      <main
        id="konten"
        tabIndex={-1}
        className="mx-auto max-w-360 px-5 py-8 sm:px-8 lg:px-10 lg:py-10"
      >
        {children}
      </main>
      <footer className="mx-5 flex flex-wrap justify-between gap-2 border-t border-primary/10 py-6 text-xs text-muted sm:mx-8 lg:mx-10">
        <span>© 2026 LaporanKu</span>
        <span>IQ + ketenangan.</span>
      </footer>
    </div>
  );
}
