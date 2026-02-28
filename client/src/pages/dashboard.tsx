import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  CalendarDays, ClipboardList, AlertTriangle, CloudRain,
  ArrowRight, CheckCircle2, Clock, Sprout, Leaf, Sun, MapPin, TrendingUp,
} from "lucide-react";
import { Link } from "wouter";
import type { Task, Alert, ClimateReading, Season, Crop } from "@shared/schema";
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
  todo: "Chờ làm",
  doing: "Đang làm",
  done: "Hoàn thành",
  overdue: "Quá hạn",
};

const priorityLabels: Record<string, string> = {
  high: "Cao",
  medium: "TB",
  low: "Thấp",
};

const severityColors: Record<string, string> = {
  critical: "bg-destructive/10 text-destructive border-destructive/20",
  warning: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  info: "bg-chart-1/10 text-chart-1 border-chart-1/20",
};

const stageLabels: Record<string, string> = {
  planting: "Gieo trồng",
  caring: "Chăm bón",
  harvesting: "Thu hoạch",
};

const stageIcons: Record<string, typeof Sprout> = {
  planting: Sprout,
  caring: Leaf,
  harvesting: Sun,
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

  const { data: seasons } = useQuery<Season[]>({
    queryKey: ["/api/seasons"],
  });

  const { data: crops } = useQuery<Crop[]>({
    queryKey: ["/api/crops"],
  });

  const activeSeasons = seasons?.filter(s => s.status === "active") || [];

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
    { label: "Mùa vụ đang chạy", value: stats?.activeSeasons || 0, icon: CalendarDays, color: "text-chart-2", bg: "bg-chart-2/10" },
    { label: "Việc hôm nay", value: stats?.todayTasks || 0, icon: ClipboardList, color: "text-chart-1", bg: "bg-chart-1/10" },
    { label: "Vật tư sắp hết", value: stats?.lowStockCount || 0, icon: AlertTriangle, color: "text-chart-3", bg: "bg-chart-3/10" },
    { label: "Cảnh báo", value: stats?.unreadAlerts || 0, icon: CloudRain, color: "text-destructive", bg: "bg-destructive/10" },
  ];

  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Tổng quan</h1>
          <p className="text-muted-foreground text-sm mt-1">Xin chào. Tổng quan hoạt động hôm nay.</p>
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

        {/* Active Seasons Section */}
        {activeSeasons.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-chart-2" />
                Mùa vụ đang diễn ra
              </CardTitle>
              <Link href="/seasons">
                <Button variant="ghost" size="sm" data-testid="link-view-seasons">
                  Xem tất cả <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {activeSeasons.map((season) => {
                  const crop = crops?.find(c => c.id === season.cropId);
                  const StageIcon = season.currentStage ? stageIcons[season.currentStage] : CalendarDays;
                  return (
                    <div
                      key={season.id}
                      className="rounded-lg border p-3 space-y-2 hover-elevate"
                      data-testid={`active-season-${season.id}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                          <StageIcon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{season.name}</p>
                          {crop && <p className="text-xs text-muted-foreground">{crop.name} {crop.variety ? `(${crop.variety})` : ""}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {season.currentStage && (
                          <Badge variant="outline" className="text-[10px] no-default-active-elevate">
                            {stageLabels[season.currentStage]}
                          </Badge>
                        )}
                        <Badge variant="default" className="text-[10px] no-default-active-elevate">
                          {season.progress || 0}%
                        </Badge>
                      </div>
                      <Progress value={season.progress || 0} className="h-1.5" />
                      <div className="flex gap-3 text-[10px] text-muted-foreground flex-wrap">
                        {season.area && <span>Diện tích: {season.area} {season.areaUnit}</span>}
                        {season.startDate && <span>Bắt đầu: {String(season.startDate)}</span>}
                        {season.endDate && <span>Kết thúc: {String(season.endDate)}</span>}
                      </div>
                      <div className="flex gap-3 text-[10px] text-muted-foreground flex-wrap">
                        {season.estimatedYield && (
                          <span className="flex items-center gap-0.5">
                            <TrendingUp className="h-2.5 w-2.5" /> {season.estimatedYield} tấn/ha
                          </span>
                        )}
                        {season.cultivationZone && (
                          <span className="flex items-center gap-0.5">
                            <MapPin className="h-2.5 w-2.5" /> {season.cultivationZone}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-base font-semibold">Việc cần làm hôm nay</CardTitle>
                <Link href="/tasks">
                  <Button variant="ghost" size="sm" data-testid="link-view-all-tasks">
                    Xem tất cả <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3 mb-4 flex-wrap">
                  <Badge variant="secondary" className="no-default-active-elevate">
                    <Clock className="mr-1 h-3 w-3" /> Chờ làm: {taskStatusCounts.todo}
                  </Badge>
                  <Badge variant="secondary" className="no-default-active-elevate">
                    <Sprout className="mr-1 h-3 w-3" /> Đang làm: {taskStatusCounts.doing}
                  </Badge>
                  {taskStatusCounts.overdue > 0 && (
                    <Badge variant="destructive" className="no-default-active-elevate">
                      <AlertTriangle className="mr-1 h-3 w-3" /> Quá hạn: {taskStatusCounts.overdue}
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
                    <p className="text-sm">Không có việc cần làm hôm nay</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Nhiệt độ & Độ ẩm (24h)</CardTitle>
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
                      <Area type="monotone" dataKey="temp" stroke="hsl(var(--chart-5))" fill="url(#tempGrad)" name="Nhiệt độ (C)" />
                      <Area type="monotone" dataKey="humidity" stroke="hsl(var(--chart-1))" fill="url(#humidGrad)" name="Độ ẩm (%)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <Skeleton className="h-[200px] w-full" />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Lượng mưa (24h)</CardTitle>
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
                      <Bar dataKey="rainfall" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} name="Mưa (mm)" />
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
                  Cảnh báo
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
                  <p className="text-sm text-muted-foreground text-center py-4">Không có cảnh báo mới</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-base font-semibold">Kho vật tư</CardTitle>
                <Link href="/supplies">
                  <Button variant="ghost" size="sm" data-testid="link-view-supplies">
                    Chi tiết <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {stats?.lowStockCount ? (
                  <div className="text-center py-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-chart-3/10 mx-auto mb-2">
                      <AlertTriangle className="h-6 w-6 text-chart-3" />
                    </div>
                    <p className="text-sm font-medium">{stats.lowStockCount} vật tư cần nhập thêm</p>
                    <p className="text-xs text-muted-foreground mt-1">Bấm để xem chi tiết và nhập kho</p>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Kho vật tư đủ dùng</p>
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
