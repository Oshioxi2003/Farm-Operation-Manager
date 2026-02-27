import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CalendarDays, ClipboardList, AlertTriangle, CloudRain,
  ArrowRight, CheckCircle2, Clock, Sprout,
} from "lucide-react";
import { Link } from "wouter";
import type { Task, Alert, ClimateReading } from "@shared/schema";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from "recharts";

const statusColors: Record<string, string> = {
  todo: "bg-muted text-muted-foreground",
  doing: "bg-chart-1/15 text-chart-1",
  done: "bg-chart-2/15 text-chart-2",
  overdue: "bg-destructive/15 text-destructive",
};

const statusLabels: Record<string, string> = {
  todo: "Cho lam",
  doing: "Dang lam",
  done: "Hoan thanh",
  overdue: "Qua han",
};

const priorityLabels: Record<string, string> = {
  high: "Cao",
  medium: "TB",
  low: "Thap",
};

const severityColors: Record<string, string> = {
  critical: "bg-destructive/10 text-destructive border-destructive/20",
  warning: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  info: "bg-chart-1/10 text-chart-1 border-chart-1/20",
};

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<{
    activeSeasons: number;
    todayTasks: number;
    lowStockCount: number;
    unreadAlerts: number;
  }>({ queryKey: ["/api/dashboard/stats"] });

  const { data: todayTasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks/today"],
  });

  const { data: alerts } = useQuery<Alert[]>({
    queryKey: ["/api/alerts/unread"],
  });

  const { data: climate } = useQuery<ClimateReading[]>({
    queryKey: ["/api/climate"],
  });

  const climateChartData = climate?.slice(0, 24).reverse().map((r, i) => ({
    time: `${i}h`,
    temp: r.temperature ? Math.round(r.temperature * 10) / 10 : 0,
    humidity: r.humidity ? Math.round(r.humidity) : 0,
    rainfall: r.rainfall ? Math.round(r.rainfall * 10) / 10 : 0,
  })) || [];

  const taskStatusCounts = {
    todo: todayTasks?.filter(t => t.status === "todo").length || 0,
    doing: todayTasks?.filter(t => t.status === "doing").length || 0,
    overdue: todayTasks?.filter(t => t.status === "overdue").length || 0,
  };

  const kpiCards = [
    { label: "Mua vu dang chay", value: stats?.activeSeasons || 0, icon: CalendarDays, color: "text-chart-2", bg: "bg-chart-2/10" },
    { label: "Viec hom nay", value: stats?.todayTasks || 0, icon: ClipboardList, color: "text-chart-1", bg: "bg-chart-1/10" },
    { label: "Vat tu sap het", value: stats?.lowStockCount || 0, icon: AlertTriangle, color: "text-chart-3", bg: "bg-chart-3/10" },
    { label: "Canh bao", value: stats?.unreadAlerts || 0, icon: CloudRain, color: "text-destructive", bg: "bg-destructive/10" },
  ];

  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Tong quan</h1>
          <p className="text-muted-foreground text-sm mt-1">Xin chao, Nguyen Van Minh. Tong quan hoat dong hom nay.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {statsLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
              ))
            : kpiCards.map((kpi) => (
                <Card key={kpi.label}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${kpi.bg}`}>
                        <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                      </div>
                      <div>
                        <p className="text-2xl font-bold" data-testid={`text-kpi-${kpi.label.replace(/ /g, "-")}`}>{kpi.value}</p>
                        <p className="text-xs text-muted-foreground">{kpi.label}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-base font-semibold">Viec can lam hom nay</CardTitle>
                <Link href="/tasks">
                  <Button variant="ghost" size="sm" data-testid="link-view-all-tasks">
                    Xem tat ca <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3 mb-4 flex-wrap">
                  <Badge variant="secondary" className="no-default-active-elevate">
                    <Clock className="mr-1 h-3 w-3" /> Cho lam: {taskStatusCounts.todo}
                  </Badge>
                  <Badge variant="secondary" className="no-default-active-elevate">
                    <Sprout className="mr-1 h-3 w-3" /> Dang lam: {taskStatusCounts.doing}
                  </Badge>
                  {taskStatusCounts.overdue > 0 && (
                    <Badge variant="destructive" className="no-default-active-elevate">
                      <AlertTriangle className="mr-1 h-3 w-3" /> Qua han: {taskStatusCounts.overdue}
                    </Badge>
                  )}
                </div>
                {tasksLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
                  </div>
                ) : todayTasks && todayTasks.length > 0 ? (
                  <div className="space-y-2">
                    {todayTasks.slice(0, 6).map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center gap-3 rounded-md p-3 bg-muted/30 hover-elevate cursor-pointer"
                        data-testid={`task-item-${task.id}`}
                      >
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${statusColors[task.status]}`}>
                          {task.status === "done" ? <CheckCircle2 className="h-4 w-4" /> : <ClipboardList className="h-4 w-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{task.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{task.description}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {task.priority === "high" && (
                            <Badge variant="destructive" className="text-[10px] no-default-active-elevate">{priorityLabels[task.priority]}</Badge>
                          )}
                          <Badge variant="outline" className={`text-[10px] no-default-active-elevate ${statusColors[task.status]}`}>
                            {statusLabels[task.status]}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Khong co viec can lam hom nay</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Nhiet do & Do am (24h)</CardTitle>
              </CardHeader>
              <CardContent>
                {climateChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={climateChartData}>
                      <defs>
                        <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--chart-5))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--chart-5))" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="humidGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "6px",
                          fontSize: "12px",
                        }}
                      />
                      <Area type="monotone" dataKey="temp" stroke="hsl(var(--chart-5))" fill="url(#tempGrad)" name="Nhiet do (C)" />
                      <Area type="monotone" dataKey="humidity" stroke="hsl(var(--chart-1))" fill="url(#humidGrad)" name="Do am (%)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <Skeleton className="h-[200px] w-full" />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Luong mua (24h)</CardTitle>
              </CardHeader>
              <CardContent>
                {climateChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={150}>
                    <BarChart data={climateChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "6px",
                          fontSize: "12px",
                        }}
                      />
                      <Bar dataKey="rainfall" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} name="Mua (mm)" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Skeleton className="h-[150px] w-full" />
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Canh bao
                </CardTitle>
              </CardHeader>
              <CardContent>
                {alerts && alerts.length > 0 ? (
                  <div className="space-y-2">
                    {alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={`rounded-md border p-3 ${severityColors[alert.severity]}`}
                        data-testid={`alert-item-${alert.id}`}
                      >
                        <p className="text-sm font-medium">{alert.title}</p>
                        <p className="text-xs mt-1 opacity-80">{alert.message}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Khong co canh bao moi</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-base font-semibold">Kho vat tu</CardTitle>
                <Link href="/supplies">
                  <Button variant="ghost" size="sm" data-testid="link-view-supplies">
                    Chi tiet <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {stats?.lowStockCount ? (
                  <div className="text-center py-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-chart-3/10 mx-auto mb-2">
                      <AlertTriangle className="h-6 w-6 text-chart-3" />
                    </div>
                    <p className="text-sm font-medium">{stats.lowStockCount} vat tu can nhap them</p>
                    <p className="text-xs text-muted-foreground mt-1">Bam de xem chi tiet va nhap kho</p>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Kho vat tu du dung</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
