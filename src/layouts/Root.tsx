import BookSummaryDialog from "@/components/dialogs/BookSummaryDialog";
import { ThemeProvider } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useHistoryStore } from "@/stores/useHistoryStore";
import useSettingsStore from "@/stores/useSettingsStore";
import {
  BookOpen,
  BookOpenText,
  Flame,
  Library,
  Menu,
  Settings,
  Target,
  TestTubeDiagonal,
} from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router";

export default function RootLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const menuItems = [
    { path: "/", label: "Home", icon: BookOpen },
    { path: "/library", label: "Library", icon: BookOpenText },
    { path: "/collections", label: "Collections", icon: Library },
    { path: "/streak", label: "Streak", icon: Flame },
    { path: "/goals", label: "Goals", icon: Target },
    { path: "/settings", label: "Settings", icon: Settings },
  ];

  const fetchSettings = useSettingsStore((store) => store.fetchSettings);
  const loadHistory = useHistoryStore((s) => s.loadHistory);

  useEffect(() => {}, []);

  useEffect(() => {
    async function init() {
      await fetchSettings();
      await loadHistory();
    }

    init();
  }, []);
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <main className="flex-1 flex flex-col">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-300 ease-in-out",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-6 border-b border-sidebar-border">
              <div className="flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-primary" />
                <h1 className="text-xl font-semibold text-sidebar-foreground">
                  Ketav
                </h1>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(false)}
                className="text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <Menu className="w-5 h-5" />
              </Button>
            </div>

            <nav className="flex-1 p-4 space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink to={item.path}>
                    <button
                      key={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left",
                        location.pathname === item.path
                          ? "bg-sidebar-accent-foreground  text-primary-foreground font-medium"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </button>
                  </NavLink>
                );
              })}
            </nav>

            <div className="p-4 border-t border-sidebar-border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TestTubeDiagonal size={20} />
                <span>Beta Version</span>
              </div>
            </div>
          </div>
        </aside>
        {/* Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <header className="flex h-[7vh] items-center justify-between px-6 py-4 border-b border-border bg-card">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            className="text-foreground hover:bg-muted"
          >
            <Menu className="w-5 h-5" />
          </Button>
          {/* 
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">
              {menuItems.find((item) => item.id === currentPage)?.label}
            </span>
          </div> */}

          <div className="w-10" />
        </header>

        <BookSummaryDialog />

        <Outlet />
      </main>
    </ThemeProvider>
  );
}
