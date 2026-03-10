import { Outlet, useLocation, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Home, Sparkles, ShoppingCart, Wallet, LogOut } from "lucide-react";
import { useCurrentUserStore } from "@/shared/hooks/useCurrentUser";
import { Button } from "@/shared/ui";
import { ThemeToggle } from "@/shared/ui/theme-toggle";
import { cn } from "@/shared/lib/utils";
import type { LucideIcon } from "lucide-react";

const TAB_ITEMS: {
  key: string;
  path: string;
  icon: LucideIcon;
  labelKey: string;
}[] = [
  {
    key: "dashboard",
    path: "/dashboard",
    icon: Home,
    labelKey: "dashboard.title",
  },
  {
    key: "cleaning",
    path: "/cleaning",
    icon: Sparkles,
    labelKey: "cleaning.title",
  },
  {
    key: "shopping",
    path: "/shopping",
    icon: ShoppingCart,
    labelKey: "shopping.title",
  },
  { key: "finance", path: "/finance", icon: Wallet, labelKey: "finance.title" },
];

export function TabLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = useCurrentUserStore((s) => s.currentUser);
  const clearCurrentUser = useCurrentUserStore((s) => s.clearCurrentUser);

  const handleSwitchUser = () => {
    clearCurrentUser();
    navigate("/");
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background flex flex-col transition-colors">
      {/* Desktop top navigation (hidden on mobile) */}
      <header className="hidden sm:block bg-card border-b border-border shadow-elevation-2">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between h-14">
          <nav className="flex items-center gap-1" role="tablist">
            {TAB_ITEMS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  role="tab"
                  aria-selected={isActive(tab.path)}
                  onClick={() => navigate(tab.path)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive(tab.path)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span>{t(tab.labelKey)}</span>
                </button>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {currentUser?.name}
            </span>
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSwitchUser}
              className="gap-1.5"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden md:inline">
                {t("dashboard.switchUser")}
              </span>
            </Button>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 pb-20 sm:pb-0">
        <Outlet />
      </main>

      {/* Mobile bottom tab bar (hidden on desktop) */}
      <nav
        className="sm:hidden fixed bottom-0 inset-x-0 bg-card border-t border-border z-50 shadow-elevation-2"
        role="tablist"
      >
        <div className="flex items-center justify-around h-16">
          {TAB_ITEMS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                role="tab"
                aria-selected={isActive(tab.path)}
                onClick={() => navigate(tab.path)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors",
                  isActive(tab.path) ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="text-xs font-medium">{t(tab.labelKey)}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
