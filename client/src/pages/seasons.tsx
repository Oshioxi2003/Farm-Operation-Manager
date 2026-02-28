import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import {
  Plus, CalendarDays, Sprout, Leaf, Sun, Copy, ChevronDown,
  Clock, Play, CheckCircle2, AlertTriangle, MapPin, TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Season, Crop, Task } from "@shared/schema";
import { useAuth } from "@/lib/auth-context";

const statusLabels: Record<string, string> = {
  planning: "Kế hoạch",
  active: "Đang chạy",
  completed: "Hoàn thành",
};

const statusBadgeVariant: Record<string, "default" | "secondary" | "outline"> = {
  planning: "outline",
  active: "default",
  completed: "secondary",
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

const taskStatusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  todo: { label: "Chờ làm", color: "bg-muted/50 text-muted-foreground", icon: Clock },
  doing: { label: "Đang làm", color: "bg-chart-1/15 text-chart-1", icon: Play },
  done: { label: "Hoàn thành", color: "bg-chart-2/15 text-chart-2", icon: CheckCircle2 },
  overdue: { label: "Quá hạn", color: "bg-destructive/15 text-destructive", icon: AlertTriangle },
};

export default function Seasons() {
  const [open, setOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCrop, setFilterCrop] = useState<string>("all");
  const [expandedSeason, setExpandedSeason] = useState<string | null>(null);
  const { toast } = useToast();
  const { isManager } = useAuth();

  const { data: seasons, isLoading } = useQuery<Season[]>({ queryKey: ["/api/seasons"] });
  const { data: crops } = useQuery<Crop[]>({ queryKey: ["/api/crops"] });

  const { data: seasonTasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks/season", expandedSeason],
    queryFn: async () => {
      if (!expandedSeason) return [];
      const res = await fetch(`/api/tasks/season/${expandedSeason}`, { credentials: "include" });
      return res.json();
    },
    enabled: !!expandedSeason,
  });

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/seasons", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seasons"] });
      setOpen(false);
      toast({ title: "Thành công", description: "Đã tạo mùa vụ mới" });
    },
  });

  const copyMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/seasons/${id}/copy`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seasons"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Thành công", description: "Đã sao chép mùa vụ" });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createMutation.mutate({
      name: fd.get("name") as string,
      cropId: fd.get("cropId") as string,
      status: "planning",
      currentStage: "planting",
      startDate: fd.get("startDate") as string,
      endDate: fd.get("endDate") as string,
      area: parseFloat(fd.get("area") as string) || null,
      areaUnit: "ha",
      notes: fd.get("notes") as string,
      progress: 0,
      estimatedYield: parseFloat(fd.get("estimatedYield") as string) || null,
      cultivationZone: fd.get("cultivationZone") as string || null,
    });
  };

  // Filter logic
  const filteredSeasons = seasons?.filter(s => {
    if (filterStatus !== "all" && s.status !== filterStatus) return false;
    if (filterCrop !== "all" && s.cropId !== filterCrop) return false;
    return true;
  });

  const toggleExpand = (id: string) => {
    setExpandedSeason(prev => prev === id ? null : id);
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Mùa vụ</h1>
            <p className="text-sm text-muted-foreground mt-1">Quản lý các mùa vụ gieo trồng</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            {isManager && <DialogTrigger asChild>
              <Button data-testid="button-add-season"><Plus className="mr-1 h-4 w-4" /> Tạo mùa vụ</Button>
            </DialogTrigger>}
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tạo mùa vụ mới</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Tên mùa vụ *</Label>
                  <Input id="name" name="name" required data-testid="input-season-name" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cropId">Cây trồng</Label>
                  <Select name="cropId">
                    <SelectTrigger data-testid="select-season-crop">
                      <SelectValue placeholder="Chọn cây trồng" />
                    </SelectTrigger>
                    <SelectContent>
                      {crops?.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name} {c.variety ? `- ${c.variety}` : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="startDate">Ngày bắt đầu</Label>
                    <Input id="startDate" name="startDate" type="date" data-testid="input-season-start" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="endDate">Ngày kết thúc</Label>
                    <Input id="endDate" name="endDate" type="date" data-testid="input-season-end" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="area">Diện tích (ha)</Label>
                    <Input id="area" name="area" type="number" step="0.1" data-testid="input-season-area" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="estimatedYield">Sản lượng ước tính (tấn)</Label>
                    <Input id="estimatedYield" name="estimatedYield" type="number" step="0.1" data-testid="input-season-yield" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cultivationZone">Vùng canh tác</Label>
                  <Input id="cultivationZone" name="cultivationZone" placeholder="VD: Khu A, Cánh đồng 3..." data-testid="input-season-zone" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="notes">Ghi chú</Label>
                  <Textarea id="notes" name="notes" data-testid="input-season-notes" />
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-season">
                  {createMutation.isPending ? "Đang lưu..." : "Tạo mùa vụ"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filter bar */}
        <div className="flex gap-3 flex-wrap">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px]" data-testid="filter-season-status">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="planning">Kế hoạch</SelectItem>
              <SelectItem value="active">Đang chạy</SelectItem>
              <SelectItem value="completed">Hoàn thành</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCrop} onValueChange={setFilterCrop}>
            <SelectTrigger className="w-[200px]" data-testid="filter-season-crop">
              <SelectValue placeholder="Cây trồng" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả cây trồng</SelectItem>
              {crops?.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}><CardContent className="p-4"><Skeleton className="h-28 w-full" /></CardContent></Card>
            ))}
          </div>
        ) : filteredSeasons && filteredSeasons.length > 0 ? (
          <div className="space-y-4">
            {filteredSeasons.map((season) => {
              const crop = crops?.find(c => c.id === season.cropId);
              const StageIcon = season.currentStage ? stageIcons[season.currentStage] : CalendarDays;
              const isExpanded = expandedSeason === season.id;
              return (
                <Card key={season.id} className="hover-elevate" data-testid={`card-season-${season.id}`}>
                  <CardContent className="p-4 md:p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-primary/10">
                        <StageIcon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div>
                            <h3 className="font-semibold text-base">{season.name}</h3>
                            {crop && <p className="text-sm text-muted-foreground">{crop.name} {crop.variety ? `(${crop.variety})` : ""}</p>}
                          </div>
                          <div className="flex gap-2 flex-wrap items-center">
                            <Badge variant={statusBadgeVariant[season.status]} className="no-default-active-elevate">
                              {statusLabels[season.status]}
                            </Badge>
                            {season.currentStage && (
                              <Badge variant="outline" className="no-default-active-elevate">
                                {stageLabels[season.currentStage]}
                              </Badge>
                            )}
                            {isManager && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => copyMutation.mutate(season.id)}
                                disabled={copyMutation.isPending}
                                data-testid={`button-copy-season-${season.id}`}
                              >
                                <Copy className="mr-1 h-3 w-3" /> Sao chép
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Tiến độ</span>
                            <span>{season.progress || 0}%</span>
                          </div>
                          <Progress value={season.progress || 0} className="h-2" />
                        </div>

                        <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
                          {season.startDate && <span>Bắt đầu: {String(season.startDate)}</span>}
                          {season.endDate && <span>Kết thúc: {String(season.endDate)}</span>}
                          {season.area && <span>Diện tích: {season.area} {season.areaUnit}</span>}
                        </div>

                        {/* New detail fields - always show when active */}
                        {(season.status === "active" || season.estimatedYield || season.cultivationZone) && (
                          <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
                            {season.estimatedYield && (
                              <span className="flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" /> Sản lượng ước tính: {season.estimatedYield} tấn
                              </span>
                            )}
                            {season.cultivationZone && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> Vùng: {season.cultivationZone}
                              </span>
                            )}
                          </div>
                        )}

                        {season.notes && (
                          <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded-md">{season.notes}</p>
                        )}

                        {/* Collapsible tasks dropdown */}
                        <Collapsible open={isExpanded} onOpenChange={() => toggleExpand(season.id)}>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 text-xs w-full justify-start" data-testid={`button-expand-season-${season.id}`}>
                              <ChevronDown className={`mr-1 h-3 w-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                              Danh sách công việc
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="mt-2 space-y-1.5 pl-1">
                              {isExpanded && seasonTasks && seasonTasks.length > 0 ? (
                                seasonTasks.map(task => {
                                  const cfg = taskStatusConfig[task.status];
                                  const TaskIcon = cfg.icon;
                                  return (
                                    <div key={task.id} className={`flex items-center gap-2 p-2 rounded-md text-xs ${cfg.color}`}>
                                      <TaskIcon className="h-3.5 w-3.5 shrink-0" />
                                      <span className="flex-1 truncate">{task.title}</span>
                                      <Badge variant="outline" className="text-[10px] no-default-active-elevate">{cfg.label}</Badge>
                                    </div>
                                  );
                                })
                              ) : isExpanded ? (
                                <p className="text-xs text-muted-foreground py-2 text-center">Chưa có công việc nào</p>
                              ) : null}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Chưa có mùa vụ nào</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
