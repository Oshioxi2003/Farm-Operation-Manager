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
  Clock, Play, CheckCircle2, AlertTriangle, MapPin, TrendingUp, Trash2,
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

interface TemplateTask {
  title: string;
  description: string;
  stage: string;
  priority: string;
}

export default function Seasons() {
  const [open, setOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCrop, setFilterCrop] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [expandedSeason, setExpandedSeason] = useState<string | null>(null);
  const [templateSeasonId, setTemplateSeasonId] = useState<string>("");
  const [templateTasks, setTemplateTasks] = useState<TemplateTask[]>([]);
  // Controlled form fields
  const [formName, setFormName] = useState("");
  const [formCropId, setFormCropId] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formArea, setFormArea] = useState("");
  const [formEstimatedYield, setFormEstimatedYield] = useState("");
  const [formCultivationZone, setFormCultivationZone] = useState("");
  const [formNotes, setFormNotes] = useState("");
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

  // Fetch tasks for selected template season
  const { data: templateSeasonTasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks/season", templateSeasonId],
    queryFn: async () => {
      if (!templateSeasonId) return [];
      const res = await fetch(`/api/tasks/season/${templateSeasonId}`, { credentials: "include" });
      return res.json();
    },
    enabled: !!templateSeasonId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/seasons", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seasons"] });
      setOpen(false);
      setTemplateSeasonId("");
      setTemplateTasks([]);
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

  const resetForm = () => {
    setFormName(""); setFormCropId(""); setFormStartDate(""); setFormEndDate("");
    setFormArea(""); setFormEstimatedYield(""); setFormCultivationZone(""); setFormNotes("");
    setTemplateSeasonId(""); setTemplateTasks([]);
  };

  const handleTemplateChange = (seasonId: string) => {
    if (seasonId === "none" || !seasonId) {
      resetForm();
      return;
    }
    setTemplateSeasonId(seasonId);
    setTemplateTasks([]);
    // Auto-fill form fields from selected season
    const selected = seasons?.find(s => s.id === seasonId);
    if (selected) {
      setFormName(selected.name ? `${selected.name} (Mới)` : "");
      setFormCropId(selected.cropId || "");
      setFormStartDate(selected.startDate ? String(selected.startDate).split("T")[0] : "");
      setFormEndDate(selected.endDate ? String(selected.endDate).split("T")[0] : "");
      setFormArea(selected.area ? String(selected.area) : "");
      setFormEstimatedYield(selected.estimatedYield ? String(selected.estimatedYield) : "");
      setFormCultivationZone(selected.cultivationZone || "");
      setFormNotes(selected.notes || "");
    }
  };

  // When template tasks load, populate the editable list
  const currentTemplateTasks = templateSeasonId && templateSeasonTasks && templateTasks.length === 0 && templateSeasonTasks.length > 0
    ? templateSeasonTasks.map(t => ({
        title: t.title,
        description: t.description || "",
        stage: t.stage || "planting",
        priority: t.priority || "medium",
      }))
    : templateTasks;

  if (templateSeasonId && templateSeasonTasks && templateTasks.length === 0 && templateSeasonTasks.length > 0) {
    // Set initial template tasks on first load
    setTimeout(() => {
      setTemplateTasks(templateSeasonTasks.map(t => ({
        title: t.title,
        description: t.description || "",
        stage: t.stage || "planting",
        priority: t.priority || "medium",
      })));
    }, 0);
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const seasonData = {
      name: formName,
      cropId: formCropId || null,
      status: "planning",
      currentStage: "planting",
      startDate: formStartDate || null,
      endDate: formEndDate || null,
      area: parseFloat(formArea) || null,
      areaUnit: "ha",
      notes: formNotes || null,
      progress: 0,
      estimatedYield: parseFloat(formEstimatedYield) || null,
      cultivationZone: formCultivationZone || null,
    };

    try {
      const res = await apiRequest("POST", "/api/seasons", seasonData);
      const newSeason = await res.json();

      // Create template tasks if any
      const tasksToCreate = currentTemplateTasks.length > 0 ? currentTemplateTasks : [];
      for (const task of tasksToCreate) {
        await apiRequest("POST", "/api/tasks", {
          title: task.title,
          description: task.description,
          seasonId: newSeason.id,
          stage: task.stage,
          priority: task.priority,
          status: "todo",
        });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/seasons"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setOpen(false);
      resetForm();
      toast({ title: "Thành công", description: `Đã tạo mùa vụ mới${tasksToCreate.length > 0 ? ` với ${tasksToCreate.length} công việc` : ""}` });
    } catch (error) {
      toast({ title: "Lỗi", description: "Không thể tạo mùa vụ", variant: "destructive" });
    }
  };

  const updateTemplateTask = (index: number, field: keyof TemplateTask, value: string) => {
    const updated = [...(currentTemplateTasks.length > 0 ? currentTemplateTasks : templateTasks)];
    updated[index] = { ...updated[index], [field]: value };
    setTemplateTasks(updated);
  };

  const removeTemplateTask = (index: number) => {
    const updated = [...(currentTemplateTasks.length > 0 ? currentTemplateTasks : templateTasks)];
    updated.splice(index, 1);
    setTemplateTasks(updated);
  };

  // Filter logic
  const filteredSeasons = seasons?.filter(s => {
    if (filterStatus !== "all" && s.status !== filterStatus) return false;
    if (filterCrop !== "all" && s.cropId !== filterCrop) return false;
    if (filterDateFrom && s.startDate && String(s.startDate) < filterDateFrom) return false;
    if (filterDateTo && s.startDate && String(s.startDate) > filterDateTo) return false;
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
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
            {isManager && <DialogTrigger asChild>
              <Button data-testid="button-add-season"><Plus className="mr-1 h-4 w-4" /> Tạo mùa vụ</Button>
            </DialogTrigger>}
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Tạo mùa vụ mới</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Template selection */}
                <div className="space-y-1.5">
                  <Label>Sao chép từ mùa vụ (tùy chọn)</Label>
                  <Select value={templateSeasonId} onValueChange={handleTemplateChange}>
                    <SelectTrigger data-testid="select-season-template">
                      <SelectValue placeholder="Chọn mùa vụ mẫu..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Không sao chép --</SelectItem>
                      {seasons?.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="name">Tên mùa vụ *</Label>
                  <Input id="name" name="name" required value={formName} onChange={(e) => setFormName(e.target.value)} data-testid="input-season-name" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cropId">Cây trồng</Label>
                  <Select name="cropId" value={formCropId} onValueChange={setFormCropId}>
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
                    <Input id="startDate" name="startDate" type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} data-testid="input-season-start" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="endDate">Ngày kết thúc</Label>
                    <Input id="endDate" name="endDate" type="date" value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)} data-testid="input-season-end" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="area">Diện tích (ha)</Label>
                    <Input id="area" name="area" type="number" step="0.1" value={formArea} onChange={(e) => setFormArea(e.target.value)} data-testid="input-season-area" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="estimatedYield">Sản lượng ước tính (tấn/ha)</Label>
                    <Input id="estimatedYield" name="estimatedYield" type="number" step="0.1" value={formEstimatedYield} onChange={(e) => setFormEstimatedYield(e.target.value)} data-testid="input-season-yield" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cultivationZone">Vùng canh tác</Label>
                  <Input id="cultivationZone" name="cultivationZone" placeholder="VD: Khu A, Cánh đồng 3..." value={formCultivationZone} onChange={(e) => setFormCultivationZone(e.target.value)} data-testid="input-season-zone" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="notes">Ghi chú</Label>
                  <Textarea id="notes" name="notes" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} data-testid="input-season-notes" />
                </div>

                {/* Template tasks editor */}
                {currentTemplateTasks.length > 0 && (
                  <div className="space-y-3 border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold">Công việc từ mùa vụ mẫu ({currentTemplateTasks.length})</Label>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {currentTemplateTasks.map((task, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 bg-muted/30 rounded-md">
                          <div className="flex-1 min-w-0 space-y-1">
                            <Input
                              value={task.title}
                              onChange={(e) => updateTemplateTask(idx, "title", e.target.value)}
                              className="h-7 text-xs"
                              placeholder="Tên công việc"
                            />
                            <div className="flex gap-1">
                              <Select value={task.stage} onValueChange={(v) => updateTemplateTask(idx, "stage", v)}>
                                <SelectTrigger className="h-6 text-[10px] w-24"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="planting">Gieo trồng</SelectItem>
                                  <SelectItem value="caring">Chăm bón</SelectItem>
                                  <SelectItem value="harvesting">Thu hoạch</SelectItem>
                                </SelectContent>
                              </Select>
                              <Select value={task.priority} onValueChange={(v) => updateTemplateTask(idx, "priority", v)}>
                                <SelectTrigger className="h-6 text-[10px] w-20"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="low">Thấp</SelectItem>
                                  <SelectItem value="medium">TB</SelectItem>
                                  <SelectItem value="high">Cao</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            onClick={() => removeTemplateTask(idx)}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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
          <div className="flex items-center gap-1.5">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">Từ ngày</Label>
            <Input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="w-[140px] h-9"
              data-testid="filter-season-from"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">Đến ngày</Label>
            <Input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="w-[140px] h-9"
              data-testid="filter-season-to"
            />
          </div>
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
                                <TrendingUp className="h-3 w-3" /> Sản lượng ước tính: {season.estimatedYield} tấn/ha
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
