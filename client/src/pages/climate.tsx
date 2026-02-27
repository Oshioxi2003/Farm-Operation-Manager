import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Thermometer, Droplets, CloudRain, Sun, Leaf, FlaskConical, AlertTriangle,
} from "lucide-react";
import type { ClimateReading, Alert } from "@shared/schema";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, LineChart, Line,
} from "recharts";

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "6px",
  fontSize: "12px",
};

export default function Climate() {
  const { data: readings, isLoading } = useQuery<ClimateReading[]>({ queryKey: ["/api/climate"] });
  const { data: alerts } = useQuery<Alert[]>({ queryKey: ["/api/alerts/unread"] });

  const weatherAlerts = alerts?.filter(a => a.type === "weather") || [];

  const chartData = readings?.slice(0, 48).reverse().map((r, i) => ({
    time: `${i}h`,
    temperature: r.temperature ? Math.round(r.temperature * 10) / 10 : 0,
    humidity: r.humidity ? Math.round(r.humidity) : 0,
    rainfall: r.rainfall ? Math.round(r.rainfall * 10) / 10 : 0,
    lightIntensity: r.lightIntensity ? Math.round(r.lightIntensity) : 0,
    soilMoisture: r.soilMoisture ? Math.round(r.soilMoisture) : 0,
    soilPh: r.soilPh ? Math.round(r.soilPh * 10) / 10 : 0,
  })) || [];

  const latest = readings?.[0];

  const currentMetrics = [
    { label: "Nhiet do", value: latest?.temperature ? `${Math.round(latest.temperature * 10) / 10}°C` : "--", icon: Thermometer, color: "text-chart-5", bg: "bg-chart-5/10", safe: "25-32°C" },
    { label: "Do am", value: latest?.humidity ? `${Math.round(latest.humidity)}%` : "--", icon: Droplets, color: "text-chart-1", bg: "bg-chart-1/10", safe: "65-85%" },
    { label: "Luong mua", value: latest?.rainfall ? `${Math.round(latest.rainfall * 10) / 10}mm` : "0mm", icon: CloudRain, color: "text-chart-4", bg: "bg-chart-4/10", safe: "< 20mm/h" },
    { label: "Anh sang", value: latest?.lightIntensity ? `${Math.round(latest.lightIntensity)} lux` : "--", icon: Sun, color: "text-chart-3", bg: "bg-chart-3/10", safe: "300-1000 lux" },
    { label: "Am dat", value: latest?.soilMoisture ? `${Math.round(latest.soilMoisture)}%` : "--", icon: Leaf, color: "text-chart-2", bg: "bg-chart-2/10", safe: "40-70%" },
    { label: "pH dat", value: latest?.soilPh ? `${Math.round(latest.soilPh * 10) / 10}` : "--", icon: FlaskConical, color: "text-chart-1", bg: "bg-chart-1/10", safe: "5.5-7.0" },
  ];

  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Khi hau & Moi truong</h1>
          <p className="text-sm text-muted-foreground mt-1">Theo doi cac chi so khi hau va canh bao thoi tiet</p>
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
                  <p className="text-[10px] text-muted-foreground mt-0.5">An toan: {m.safe}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <Tabs defaultValue="temperature">
          <TabsList className="flex-wrap h-auto" data-testid="tabs-climate">
            <TabsTrigger value="temperature">Nhiet do</TabsTrigger>
            <TabsTrigger value="humidity">Do am</TabsTrigger>
            <TabsTrigger value="rainfall">Luong mua</TabsTrigger>
            <TabsTrigger value="light">Anh sang</TabsTrigger>
            <TabsTrigger value="soil">Am dat</TabsTrigger>
            <TabsTrigger value="ph">pH</TabsTrigger>
          </TabsList>

          <TabsContent value="temperature" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Bien dong nhiet do</CardTitle>
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
                      <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
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
              <CardHeader className="pb-2"><CardTitle className="text-base">Bien dong do am</CardTitle></CardHeader>
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
                      <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
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
              <CardHeader className="pb-2"><CardTitle className="text-base">Luong mua</CardTitle></CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="rainfall" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} name="mm" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <Skeleton className="h-[300px] w-full" />}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="light" className="mt-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Cuong do anh sang</CardTitle></CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Line type="monotone" dataKey="lightIntensity" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} name="lux" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <Skeleton className="h-[300px] w-full" />}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="soil" className="mt-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Do am dat</CardTitle></CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="soilG" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" domain={[0, 100]} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Area type="monotone" dataKey="soilMoisture" stroke="hsl(var(--chart-2))" fill="url(#soilG)" name="%" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : <Skeleton className="h-[300px] w-full" />}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ph" className="mt-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">pH dat</CardTitle></CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
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
      </div>
    </ScrollArea>
  );
}
