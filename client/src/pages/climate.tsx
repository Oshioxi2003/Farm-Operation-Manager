import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Thermometer, Droplets, CloudRain, Sun, Leaf, FlaskConical, AlertTriangle, Wind, MapPin, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Alert } from "@shared/schema";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, LineChart, Line,
} from "recharts";
import { queryClient } from "@/lib/queryClient";

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "6px",
  fontSize: "12px",
};

interface WeatherReading {
  id: string;
  temperature: number | null;
  humidity: number | null;
  rainfall: number | null;
  lightIntensity: number | null;
  soilMoisture: number | null;
  soilPh: number | null;
  windSpeed: number | null;
  recordedAt: string;
  location: string;
}

interface WeatherData {
  current: WeatherReading;
  hourly: WeatherReading[];
}

export default function Climate() {
  const { data: weather, isLoading, dataUpdatedAt } = useQuery<WeatherData>({
    queryKey: ["/api/weather"],
    refetchInterval: 15 * 60 * 1000, // auto-refresh every 15 minutes
  });
  const { data: alerts } = useQuery<Alert[]>({ queryKey: ["/api/alerts/unread"] });

  const weatherAlerts = alerts?.filter(a => a.type === "weather") || [];

  const current = weather?.current;
  const hourlyData = weather?.hourly || [];

  const chartData = hourlyData.map((r) => {
    const date = new Date(r.recordedAt);
    const h = date.getHours();
    const d = date.getDate();
    return {
      time: `${d}/${h.toString().padStart(2, "0")}h`,
      temperature: r.temperature ?? 0,
      humidity: r.humidity ?? 0,
      rainfall: r.rainfall ?? 0,
      lightIntensity: r.lightIntensity ?? 0,
      soilMoisture: r.soilMoisture ?? 0,
      soilPh: r.soilPh ? Math.round(r.soilPh * 10) / 10 : 0,
      windSpeed: r.windSpeed ?? 0,
    };
  });

  const currentMetrics = [
    { label: "Nhiệt độ", value: current?.temperature != null ? `${current.temperature}°C` : "--", icon: Thermometer, color: "text-chart-5", bg: "bg-chart-5/10", safe: "25-32°C" },
    { label: "Độ ẩm", value: current?.humidity != null ? `${current.humidity}%` : "--", icon: Droplets, color: "text-chart-1", bg: "bg-chart-1/10", safe: "65-85%" },
    { label: "Lượng mưa", value: current?.rainfall != null ? `${current.rainfall}mm` : "0mm", icon: CloudRain, color: "text-chart-4", bg: "bg-chart-4/10", safe: "< 20mm/h" },
    { label: "Ánh sáng", value: current?.lightIntensity != null ? `${current.lightIntensity} lux` : "--", icon: Sun, color: "text-chart-3", bg: "bg-chart-3/10", safe: "300-1000 lux" },
    { label: "Gió", value: current?.windSpeed != null ? `${current.windSpeed} km/h` : "--", icon: Wind, color: "text-chart-2", bg: "bg-chart-2/10", safe: "< 40 km/h" },
    { label: "pH đất", value: current?.soilPh != null ? `${Math.round(current.soilPh * 10) / 10}` : "--", icon: FlaskConical, color: "text-chart-1", bg: "bg-chart-1/10", safe: "5.5-7.0" },
  ];

  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString("vi-VN") : "";

  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Khí hậu & Môi trường</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Dữ liệu thời tiết thời gian thực từ Open-Meteo API
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>Hà Nội</span>
            {lastUpdated && <span className="text-xs">· Cập nhật: {lastUpdated}</span>}
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/weather"] })}
              data-testid="button-refresh-weather"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {weatherAlerts.length > 0 && (
          <div className="space-y-2">
            {weatherAlerts.map(alert => (
              <div
                key={alert.id}
                className="flex items-start gap-3 rounded-md border border-chart-3/20 bg-chart-3/5 p-4"
                data-testid={`alert-weather-${alert.id}`}
              >
                <AlertTriangle className="h-5 w-5 text-chart-3 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">{alert.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}><CardContent className="p-3"><Skeleton className="h-16 w-full" /></CardContent></Card>
            ))
          ) : (
            currentMetrics.map((m) => (
              <Card key={m.label}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${m.bg}`}>
                      <m.icon className={`h-4 w-4 ${m.color}`} />
                    </div>
                    <span className="text-xs text-muted-foreground">{m.label}</span>
                  </div>
                  <p className="text-lg font-bold" data-testid={`text-metric-${m.label}`}>{m.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">An toàn: {m.safe}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <Tabs defaultValue="temperature">
          <TabsList className="flex-wrap h-auto" data-testid="tabs-climate">
            <TabsTrigger value="temperature">Nhiệt độ</TabsTrigger>
            <TabsTrigger value="humidity">Độ ẩm</TabsTrigger>
            <TabsTrigger value="rainfall">Lượng mưa</TabsTrigger>
            <TabsTrigger value="wind">Gió</TabsTrigger>
            <TabsTrigger value="light">Ánh sáng</TabsTrigger>
            <TabsTrigger value="ph">pH</TabsTrigger>
          </TabsList>

          <TabsContent value="temperature" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Biến động nhiệt độ (48 giờ)</CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="tempG" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--chart-5))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--chart-5))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" domain={["dataMin - 2", "dataMax + 2"]} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Area type="monotone" dataKey="temperature" stroke="hsl(var(--chart-5))" fill="url(#tempG)" name="°C" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : <Skeleton className="h-[300px] w-full" />}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="humidity" className="mt-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Biến động độ ẩm (48 giờ)</CardTitle></CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="humG" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" domain={[0, 100]} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Area type="monotone" dataKey="humidity" stroke="hsl(var(--chart-1))" fill="url(#humG)" name="%" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : <Skeleton className="h-[300px] w-full" />}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rainfall" className="mt-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Lượng mưa (48 giờ)</CardTitle></CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="rainfall" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} name="mm" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <Skeleton className="h-[300px] w-full" />}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="wind" className="mt-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Tốc độ gió (48 giờ)</CardTitle></CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Line type="monotone" dataKey="windSpeed" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} name="km/h" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <Skeleton className="h-[300px] w-full" />}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="light" className="mt-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Cường độ ánh sáng (48 giờ)</CardTitle></CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Line type="monotone" dataKey="lightIntensity" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} name="lux" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <Skeleton className="h-[300px] w-full" />}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ph" className="mt-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">pH đất (48 giờ)</CardTitle></CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" domain={[4, 9]} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Line type="monotone" dataKey="soilPh" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} name="pH" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <Skeleton className="h-[300px] w-full" />}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span>Nguồn dữ liệu: <strong>Open-Meteo API</strong> · Vị trí: Hà Nội (21.03°N, 105.85°E) · Tự động cập nhật mỗi 15 phút</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
