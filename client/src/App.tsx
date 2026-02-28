import { Switch, Route } from "wouter";
import { queryClient, apiRequest } from "./lib/queryClient";
import { QueryClientProvider, useQuery, useMutation } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Alert, Notification } from "@shared/schema";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Crops from "@/pages/crops";
import Seasons from "@/pages/seasons";
import SeasonProgress from "@/pages/season-progress";
import Tasks from "@/pages/tasks";
import WorkLogs from "@/pages/work-logs";
import Supplies from "@/pages/supplies";
import Climate from "@/pages/climate";
import UsersPage from "@/pages/users-page";

const severityColors: Record<string, string> = {
  critical: "bg-destructive/10 text-destructive",
  warning: "bg-chart-3/10 text-chart-3",
  info: "bg-chart-1/10 text-chart-1",
};

function NotificationBell() {
  const { data: alerts } = useQuery<Alert[]>({ queryKey: ["/api/alerts/unread"] });
  const { data: notifications } = useQuery<Notification[]>({ queryKey: ["/api/notifications/unread"] });

  const alertCount = alerts?.length || 0;
  const notifCount = notifications?.length || 0;
  const totalCount = alertCount + notifCount;

  const markAllRead = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/alerts/read-all");
      await apiRequest("POST", "/api/notifications/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts/unread"] });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
  });

  // Combine both lists for display
  const allItems: { id: string; title: string; message: string; severity: string; type: "alert" | "notification" }[] = [];
  if (alerts) {
    for (const a of alerts) {
      allItems.push({ id: a.id, title: a.title, message: a.message, severity: a.severity, type: "alert" });
    }
  }
  if (notifications) {
    for (const n of notifications) {
      allItems.push({ id: n.id, title: n.title, message: n.message, severity: "info", type: "notification" });
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="relative">
          <Button size="icon" variant="ghost" data-testid="button-notifications">
            <Bell className="h-4 w-4" />
          </Button>
          {totalCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-medium px-1" data-testid="text-notification-count">
              {totalCount}
            </span>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between gap-1 p-3 border-b">
          <p className="text-sm font-semibold">Thông báo ({totalCount})</p>
          {totalCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              data-testid="button-mark-all-read"
            >
              <CheckCheck className="mr-1 h-3 w-3" /> Đọc tất cả
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-64">
          {allItems.length > 0 ? (
            <div className="p-2 space-y-1">
              {allItems.map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  className={`rounded-md p-2.5 text-xs ${severityColors[item.severity] || severityColors.info}`}
                  data-testid={`notification-${item.id}`}
                >
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-0.5 opacity-80">{item.message}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Không có thông báo mới
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

function Router() {
  const { isManager } = useAuth();

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/crops" component={Crops} />
      <Route path="/seasons" component={Seasons} />
      <Route path="/seasons/progress" component={SeasonProgress} />
      <Route path="/tasks" component={Tasks} />
      <Route path="/work-logs" component={WorkLogs} />
      <Route path="/supplies" component={Supplies} />
      <Route path="/climate" component={Climate} />
      {isManager && <Route path="/users" component={UsersPage} />}
      <Route component={NotFound} />
    </Switch>
  );
}

const sidebarStyle = {
  "--sidebar-width": "16rem",
  "--sidebar-width-icon": "3rem",
};

function AuthenticatedApp() {
  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-1 p-2 border-b h-12 shrink-0">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <NotificationBell />
          </header>
          <main className="flex-1 overflow-hidden">
            <Router />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppContent() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Login />;

  return <AuthenticatedApp />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
