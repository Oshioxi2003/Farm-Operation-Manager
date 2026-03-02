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
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Plus, CalendarDays, Sprout, Leaf, Sun, Copy, ChevronDown,
  Clock, Play, CheckCircle2, AlertTriangle, MapPin, TrendingUp, Trash2, Pencil,
  Filter, X, Search, Info, ClipboardList,
} from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Season, Crop, Task, User, WorkLog } from "@shared/schema";
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
  preparation: "Chuẩn bị",
  planting: "Gieo trồng",
  caring: "Chăm sóc",
  harvesting: "Thu hoạch",
};

const stageIcons: Record<string, typeof Sprout> = {
  preparation: ClipboardList,
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
  durationDays: string;
  assigneeId: string;
}

export default function Seasons() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCrop, setFilterCrop] = useState<string>("all");
  const [filterStage, setFilterStage] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [expandedSeason, setExpandedSeason] = useState<string | null>(null);
  const [templateSeasonId, setTemplateSeasonId] = useState<string>("");
  const [templateTasks, setTemplateTasks] = useState<TemplateTask[]>([]);
  const [detailTaskIndex, setDetailTaskIndex] = useState<number | null>(null);
  const [seasonTab, setSeasonTab] = useState<string>("tasks");
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

  // Đếm số bộ lọc đang áp dụng
  const activeFilterCount = [
    filterStatus, filterCrop, filterStage,
  ].filter(v => v !== "all").length
    + (filterDateFrom ? 1 : 0)
    + (filterDateTo ? 1 : 0);

  const clearAllFilters = () => {
    setFilterStatus("all");
    setFilterCrop("all");
    setFilterStage("all");
    setFilterDateFrom("");
    setFilterDateTo("");
  };

  const { data: seasons, isLoading } = useQuery<Season[]>({ queryKey: ["/api/seasons"] });
  const { data: crops } = useQuery<Crop[]>({ queryKey: ["/api/crops"] });
  const { data: users } = useQuery<User[]>({ queryKey: ["/api/users"] });
  const { data: allTasks } = useQuery<Task[]>({ queryKey: ["/api/tasks"] });

  const { data: seasonTasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks/season", expandedSeason],
    queryFn: async () => {
      if (!expandedSeason) return [];
      const res = await fetch(`/api/tasks/season/${expandedSeason}`, { credentials: "include" });
      return res.json();
    },
    enabled: !!expandedSeason,
  });

  const { data: seasonWorkLogs } = useQuery<WorkLog[]>({
    queryKey: ["/api/work-logs/season", expandedSeason],
    queryFn: async () => {
      if (!expandedSeason) return [];
      const res = await fetch(`/api/work-logs/season/${expandedSeason}`, { credentials: "include" });
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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/seasons/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seasons"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Thành công", description: "Đã xóa mùa vụ" });
    },
    onError: (error: Error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormName(""); setFormCropId(""); setFormStartDate(""); setFormEndDate("");
    setFormArea(""); setFormEstimatedYield(""); setFormCultivationZone(""); setFormNotes("");
    setTemplateSeasonId(""); setTemplateTasks([]); setDetailTaskIndex(null);
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
      stage: t.stage || "preparation",
      priority: t.priority || "medium",
      durationDays: "",
      assigneeId: t.assigneeId || "",
    }))
    : templateTasks;

  if (templateSeasonId && templateSeasonTasks && templateTasks.length === 0 && templateSeasonTasks.length > 0) {
    // Set initial template tasks on first load
    setTimeout(() => {
      setTemplateTasks(templateSeasonTasks.map(t => ({
        title: t.title,
        description: t.description || "",
        stage: t.stage || "preparation",
        priority: t.priority || "medium",
        durationDays: "",
        assigneeId: t.assigneeId || "",
      })));
    }, 0);
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate ngày kết thúc phải >= ngày bắt đầu
    if (formStartDate && formEndDate && formEndDate < formStartDate) {
      toast({ title: "Lỗi", description: "Ngày kết thúc không được nhỏ hơn ngày bắt đầu", variant: "destructive" });
      return;
    }

    const seasonData = {
      name: formName,
      cropId: formCropId || null,
      status: "planning",
      currentStage: "preparation",
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
      // Tự tính dueDate từ startDate + số ngày cộng dồn
      let cumulativeDays = 0;
      for (const task of tasksToCreate) {
        const days = parseInt(task.durationDays) || 0;
        cumulativeDays += days;
        let computedDueDate: Date | null = null;
        if (formStartDate && days > 0) {
          computedDueDate = new Date(formStartDate);
          computedDueDate.setDate(computedDueDate.getDate() + cumulativeDays);
        }
        await apiRequest("POST", "/api/tasks", {
          title: task.title,
          description: task.description,
          seasonId: newSeason.id,
          stage: task.stage,
          priority: task.priority,
          status: "todo",
          dueDate: computedDueDate,
          assigneeId: task.assigneeId || null,
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

  const addTemplateTask = () => {
    const updated = [...(currentTemplateTasks.length > 0 ? currentTemplateTasks : templateTasks)];
    updated.push({
      title: "",
      description: "",
      stage: "preparation",
      priority: "medium",
      durationDays: "",
      assigneeId: "",
    });
    setTemplateTasks(updated);
  };

  // Filter logic
  const filteredSeasons = seasons?.filter(s => {
    // Lọc theo tìm kiếm text
    if (search) {
      const q = search.toLowerCase();
      const crop = crops?.find(c => c.id === s.cropId);
      const matchesName = s.name.toLowerCase().includes(q);
      const matchesCrop = crop?.name.toLowerCase().includes(q);
      const matchesZone = s.cultivationZone?.toLowerCase().includes(q);
      if (!matchesName && !matchesCrop && !matchesZone) return false;
    }
    if (filterStatus !== "all" && s.status !== filterStatus) return false;
    if (filterCrop !== "all" && s.cropId !== filterCrop) return false;
    if (filterStage !== "all" && s.currentStage !== filterStage) return false;
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
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
              <DialogHeader className="px-6 pt-6 pb-0">
                <DialogTitle className="text-xl font-bold">Tạo Mùa vụ mới</DialogTitle>
                <p className="text-sm text-muted-foreground">Vui lòng điền thông tin chi tiết để bắt đầu mùa vụ canh tác mới</p>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-5 px-6 pb-6">
                {/* SAO CHÉP TỪ MÙA VỤ TRƯỚC */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900 shrink-0">
                    <Copy className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wide">Sao chép từ mùa vụ trước</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">Tiết kiệm thời gian bằng cách kế thừa dữ liệu từ các mùa vụ đã có</p>
                  </div>
                  <div className="w-52 shrink-0">
                    <Select value={templateSeasonId} onValueChange={handleTemplateChange}>
                      <SelectTrigger className="h-9 text-sm bg-white dark:bg-background" data-testid="select-season-template">
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
                </div>

                {/* THÔNG TIN CƠ BẢN */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">Thông tin cơ bản</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="text-xs text-muted-foreground">Tên mùa vụ</Label>
                      <Input id="name" name="name" required placeholder="VD: Lúa Hè Thu 2024" value={formName} onChange={(e) => setFormName(e.target.value)} data-testid="input-season-name" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="cropId" className="text-xs text-muted-foreground">Loại cây trồng</Label>
                      <Select name="cropId" value={formCropId} onValueChange={setFormCropId}>
                        <SelectTrigger data-testid="select-season-crop">
                          <SelectValue placeholder="Chọn loại cây" />
                        </SelectTrigger>
                        <SelectContent>
                          {crops?.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name} {c.variety ? `- ${c.variety}` : ""}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="cultivationZone" className="text-xs text-muted-foreground">Khu vực canh tác</Label>
                      <Input id="cultivationZone" name="cultivationZone" placeholder="Nhập tên cánh đồng/lô" value={formCultivationZone} onChange={(e) => setFormCultivationZone(e.target.value)} data-testid="input-season-zone" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Ngày bắt đầu - Kết thúc</Label>
                      <div className="flex items-center gap-2">
                        <Input id="startDate" name="startDate" type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} data-testid="input-season-start" className="flex-1" />
                        <span className="text-muted-foreground text-sm shrink-0">-</span>
                        <Input id="endDate" name="endDate" type="date" value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)} data-testid="input-season-end" className="flex-1" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="area" className="text-xs text-muted-foreground">Diện tích (ha)</Label>
                        <Input id="area" name="area" type="number" step="0.1" placeholder="0.0" value={formArea} onChange={(e) => setFormArea(e.target.value)} data-testid="input-season-area" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="estimatedYield" className="text-xs text-muted-foreground">Sản lượng ước tính (tấn)</Label>
                        <Input id="estimatedYield" name="estimatedYield" type="number" step="0.1" placeholder="Sản lượng ước tính (tấn)" value={formEstimatedYield} onChange={(e) => setFormEstimatedYield(e.target.value)} data-testid="input-season-yield" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* QUY TRÌNH MÙA VỤ */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold">Quy trình Mùa vụ{formName ? ` ${formName}` : ""}</span>
                    </div>
                    <Button type="button" variant="ghost" size="sm" className="text-xs text-primary h-7 gap-1" onClick={addTemplateTask}>
                      <Plus className="h-3.5 w-3.5" /> Thêm công việc
                    </Button>
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="w-12 text-center text-xs font-semibold">STT</TableHead>
                          <TableHead className="text-xs font-semibold">TÊN CÔNG VIỆC</TableHead>
                          <TableHead className="text-xs font-semibold">NGƯỜI PHỤ TRÁCH</TableHead>
                          <TableHead className="text-xs font-semibold">GIAI ĐOẠN</TableHead>
                          <TableHead className="text-xs font-semibold">SỐ NGÀY</TableHead>
                          <TableHead className="w-20 text-center text-xs font-semibold">HÀNH ĐỘNG</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentTemplateTasks.length > 0 ? currentTemplateTasks.map((task, idx) => {
                          const assignee = users?.find(u => u.id === task.assigneeId);
                          const stageConfig: Record<string, { label: string; color: string }> = {
                            preparation: { label: "Chuẩn bị", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" },
                            planting: { label: "Gieo trồng", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" },
                            caring: { label: "Chăm sóc", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
                            harvesting: { label: "Thu hoạch", color: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" },
                          };
                          const stage = stageConfig[task.stage] || stageConfig.preparation;
                          const initials = assignee ? assignee.fullName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "";

                          return (
                            <TableRow key={idx} className="hover:bg-transparent">
                              <TableCell className="text-center text-sm font-medium text-muted-foreground">
                                {String(idx + 1).padStart(2, "0")}
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={task.title}
                                  onChange={(e) => updateTemplateTask(idx, "title", e.target.value)}
                                  className="h-8 text-sm border-0 shadow-none px-0 focus-visible:ring-0"
                                  placeholder="Nhập tên công việc..."
                                />
                              </TableCell>
                              <TableCell>
                                <Select value={task.assigneeId || "unassigned"} onValueChange={(v) => updateTemplateTask(idx, "assigneeId", v === "unassigned" ? "" : v)}>
                                  <SelectTrigger className="h-8 text-xs border-0 shadow-none px-0 gap-1.5 focus:ring-0">
                                    {assignee ? (
                                      <div className="flex items-center gap-1.5">
                                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary shrink-0">
                                          {initials}
                                        </span>
                                        <span className="text-xs truncate">{assignee.fullName}</span>
                                      </div>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">Chọn người...</span>
                                    )}
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="unassigned">-- Chưa phân công --</SelectItem>
                                    {users?.map(u => (
                                      <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Select value={task.stage} onValueChange={(v) => updateTemplateTask(idx, "stage", v)}>
                                  <SelectTrigger className="h-7 text-xs border-0 shadow-none px-0 gap-1 focus:ring-0 w-fit">
                                    <Badge className={`${stage.color} text-[11px] font-medium border-0 px-2.5 py-0.5`}>
                                      {stage.label}
                                    </Badge>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="preparation">Chuẩn bị</SelectItem>
                                    <SelectItem value="planting">Gieo trồng</SelectItem>
                                    <SelectItem value="caring">Chăm sóc</SelectItem>
                                    <SelectItem value="harvesting">Thu hoạch</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="number"
                                    min={1}
                                    value={task.durationDays}
                                    onChange={(e) => updateTemplateTask(idx, "durationDays", e.target.value)}
                                    className="h-8 text-xs border-0 shadow-none px-0 focus-visible:ring-0 w-[70px]"
                                    placeholder="0"
                                  />
                                  <span className="text-xs text-muted-foreground shrink-0">ngày</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-0.5">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                    onClick={() => setDetailTaskIndex(idx)}
                                    title="Sửa chi tiết"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => removeTemplateTask(idx)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        }) : (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                              <ClipboardList className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                              Chưa có công việc nào. Nhấn "+ Thêm công việc" để bắt đầu.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Footer buttons */}
                <div className="flex items-center justify-center gap-3 pt-2">
                  <Button type="button" variant="outline" className="px-8" onClick={() => { setOpen(false); resetForm(); }}>
                    Hủy bỏ
                  </Button>
                  <Button type="submit" className="px-8 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={createMutation.isPending} data-testid="button-submit-season">
                    {createMutation.isPending ? "Đang lưu..." : "Lưu"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Detail/edit dialog for template task */}
          <Dialog open={detailTaskIndex !== null} onOpenChange={(o) => { if (!o) setDetailTaskIndex(null); }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Chi tiết công việc</DialogTitle>
              </DialogHeader>
              {detailTaskIndex !== null && currentTemplateTasks[detailTaskIndex] && (() => {
                const task = currentTemplateTasks[detailTaskIndex];
                return (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="detail-title">Tiêu đề *</Label>
                      <Input
                        id="detail-title"
                        value={task.title}
                        onChange={(e) => updateTemplateTask(detailTaskIndex, "title", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="detail-description">Mô tả</Label>
                      <Textarea
                        id="detail-description"
                        value={task.description}
                        onChange={(e) => updateTemplateTask(detailTaskIndex, "description", e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Giai đoạn</Label>
                        <Select value={task.stage} onValueChange={(v) => updateTemplateTask(detailTaskIndex, "stage", v)}>
                          <SelectTrigger><SelectValue placeholder="Chọn" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="preparation">Chuẩn bị</SelectItem>
                            <SelectItem value="planting">Gieo trồng</SelectItem>
                            <SelectItem value="caring">Chăm sóc</SelectItem>
                            <SelectItem value="harvesting">Thu hoạch</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Ưu tiên</Label>
                        <Select value={task.priority} onValueChange={(v) => updateTemplateTask(detailTaskIndex, "priority", v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Thấp</SelectItem>
                            <SelectItem value="medium">Trung bình</SelectItem>
                            <SelectItem value="high">Cao</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="detail-durationDays">Số ngày</Label>
                        <Input
                          id="detail-durationDays"
                          type="number"
                          min={1}
                          placeholder="Nhập số ngày"
                          value={task.durationDays}
                          onChange={(e) => updateTemplateTask(detailTaskIndex, "durationDays", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Phân công</Label>
                        <Select value={task.assigneeId || "unassigned"} onValueChange={(v) => updateTemplateTask(detailTaskIndex, "assigneeId", v === "unassigned" ? "" : v)}>
                          <SelectTrigger><SelectValue placeholder="Chọn" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">-- Chưa phân công --</SelectItem>
                            {users?.map(u => (
                              <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button type="button" className="w-full" onClick={() => setDetailTaskIndex(null)}>
                      Đóng
                    </Button>
                  </div>
                );
              })()}
            </DialogContent>
          </Dialog>
        </div>

        {/* Search + Filter bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative max-w-sm flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm mùa vụ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search-seasons"
            />
          </div>

          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="relative shrink-0"
                data-testid="button-filter-seasons"
              >
                <Filter className="h-4 w-4" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">Bộ lọc</h4>
                  {activeFilterCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground hover:text-foreground"
                      onClick={clearAllFilters}
                    >
                      <X className="mr-1 h-3 w-3" /> Xóa bộ lọc
                    </Button>
                  )}
                </div>

                {/* Trạng thái */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Trạng thái</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="h-8 text-xs" data-testid="filter-season-status">
                      <SelectValue placeholder="Tất cả" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả trạng thái</SelectItem>
                      <SelectItem value="planning">Kế hoạch</SelectItem>
                      <SelectItem value="active">Đang chạy</SelectItem>
                      <SelectItem value="completed">Hoàn thành</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Cây trồng */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Cây trồng</Label>
                  <Select value={filterCrop} onValueChange={setFilterCrop}>
                    <SelectTrigger className="h-8 text-xs" data-testid="filter-season-crop">
                      <SelectValue placeholder="Tất cả" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả cây trồng</SelectItem>
                      {crops?.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Giai đoạn */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Giai đoạn</Label>
                  <Select value={filterStage} onValueChange={setFilterStage}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Tất cả" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả giai đoạn</SelectItem>
                      <SelectItem value="preparation">Chuẩn bị</SelectItem>
                      <SelectItem value="planting">Gieo trồng</SelectItem>
                      <SelectItem value="caring">Chăm sóc</SelectItem>
                      <SelectItem value="harvesting">Thu hoạch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Ngày */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Từ ngày</Label>
                    <Input
                      type="date"
                      value={filterDateFrom}
                      onChange={(e) => setFilterDateFrom(e.target.value)}
                      className="h-8 text-xs"
                      data-testid="filter-season-from"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Đến ngày</Label>
                    <Input
                      type="date"
                      value={filterDateTo}
                      onChange={(e) => setFilterDateTo(e.target.value)}
                      className="h-8 text-xs"
                      data-testid="filter-season-to"
                    />
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Hiển thị badge bộ lọc đang áp dụng */}
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {filterStatus !== "all" && (
                <Badge variant="secondary" className="text-xs gap-1 pl-2 pr-1 py-0.5">
                  {statusLabels[filterStatus]}
                  <button onClick={() => setFilterStatus("all")} className="ml-0.5 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filterCrop !== "all" && (
                <Badge variant="secondary" className="text-xs gap-1 pl-2 pr-1 py-0.5">
                  {crops?.find(c => c.id === filterCrop)?.name || "Cây trồng"}
                  <button onClick={() => setFilterCrop("all")} className="ml-0.5 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filterStage !== "all" && (
                <Badge variant="secondary" className="text-xs gap-1 pl-2 pr-1 py-0.5">
                  {stageLabels[filterStage]}
                  <button onClick={() => setFilterStage("all")} className="ml-0.5 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filterDateFrom && (
                <Badge variant="secondary" className="text-xs gap-1 pl-2 pr-1 py-0.5">
                  Từ: {filterDateFrom}
                  <button onClick={() => setFilterDateFrom("")} className="ml-0.5 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filterDateTo && (
                <Badge variant="secondary" className="text-xs gap-1 pl-2 pr-1 py-0.5">
                  Đến: {filterDateTo}
                  <button onClick={() => setFilterDateTo("")} className="ml-0.5 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}
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
              const isExpanded = expandedSeason === season.id;
              const sTasksForSeason = isExpanded ? seasonTasks : allTasks?.filter(t => t.seasonId === season.id);
              const taskCount = allTasks?.filter(t => t.seasonId === season.id).length || 0;

              const statusConfig: Record<string, { label: string; color: string }> = {
                planning: { label: "Kế hoạch", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
                active: { label: "Đang diễn ra", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
                completed: { label: "Hoàn thành", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" },
              };

              const stageBadgeConfig: Record<string, { label: string; color: string }> = {
                preparation: { label: "Chuẩn bị", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" },
                planting: { label: "Gieo trồng", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" },
                caring: { label: "Chăm sóc", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
                harvesting: { label: "Thu hoạch", color: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" },
              };

              const sts = statusConfig[season.status] || statusConfig.planning;

              return (
                <Card key={season.id} className="overflow-hidden" data-testid={`card-season-${season.id}`}>
                  <CardContent className="p-5 space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5 min-w-0">
                        <h3
                          className="font-bold text-base cursor-pointer hover:text-primary transition-colors"
                          onClick={() => toggleExpand(season.id)}
                        >
                          {season.name}
                        </h3>
                        <div className="flex items-center gap-2.5 text-xs text-muted-foreground flex-wrap">
                          {crop && (
                            <span className="flex items-center gap-1">
                              <Sprout className="h-3 w-3" /> {crop.name}
                            </span>
                          )}
                          {season.cultivationZone && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {season.cultivationZone}
                            </span>
                          )}
                          {season.startDate && (
                            <span className="flex items-center gap-1">
                              <CalendarDays className="h-3 w-3" />
                              {String(season.startDate).split("T")[0]}
                              {season.endDate && ` - ${String(season.endDate).split("T")[0]}`}
                            </span>
                          )}
                          <Badge className={`${sts.color} border-0 text-[11px] font-medium px-2 py-0`}>
                            {sts.label}
                          </Badge>
                        </div>
                      </div>
                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
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
                        {isManager && season.status === "planning" && (!season.progress || season.progress === 0) && !(allTasks?.some(t => t.seasonId === season.id && t.status !== "todo")) && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                                data-testid={`button-delete-season-${season.id}`}
                              >
                                <Trash2 className="mr-1 h-3 w-3" /> Xóa
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Xóa mùa vụ</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Bạn có chắc muốn xóa mùa vụ <strong>"{season.name}"</strong>? Tất cả công việc liên quan cũng sẽ bị xóa.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Hủy</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(season.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Xóa mùa vụ
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Tiến độ</span>
                        <span className="font-semibold text-emerald-600">{season.progress || 0}%</span>
                      </div>
                      <Progress value={season.progress || 0} className="h-2" />
                    </div>

                    {/* Extra info row */}
                    {(season.estimatedYield || season.area) && (
                      <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
                        {season.area && (
                          <span>Diện tích: {season.area} {season.areaUnit}</span>
                        )}
                        {season.estimatedYield && (
                          <span className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" /> Sản lượng: {season.estimatedYield} tấn/ha
                          </span>
                        )}
                      </div>
                    )}

                    {/* Expandable tabs */}
                    <Collapsible open={isExpanded} onOpenChange={() => toggleExpand(season.id)}>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 text-xs w-full justify-start gap-1.5 px-0 hover:bg-transparent" data-testid={`button-expand-season-${season.id}`}>
                          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                          Xem chi tiết ({taskCount} công việc)
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <Tabs value={seasonTab} onValueChange={setSeasonTab} className="mt-3">
                          <TabsList className="bg-transparent border-b rounded-none p-0 h-auto w-full justify-start gap-0">
                            <TabsTrigger
                              value="tasks"
                              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-2 pt-1 text-xs font-medium"
                            >
                              Công việc <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">{seasonTasks?.length || 0}</Badge>
                            </TabsTrigger>
                            <TabsTrigger
                              value="diary"
                              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-2 pt-1 text-xs font-medium"
                            >
                              Nhật ký <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">{seasonWorkLogs?.length || 0}</Badge>
                            </TabsTrigger>
                          </TabsList>

                          {/* Công việc tab */}
                          <TabsContent value="tasks" className="space-y-2 mt-3">
                            {seasonTasks && seasonTasks.length > 0 ? seasonTasks.map(task => {
                              const assignee = users?.find(u => u.id === task.assigneeId);
                              const stgCfg = stageBadgeConfig[task.stage || "planting"] || stageBadgeConfig.planting;

                              return (
                                <div key={task.id} className="p-3 border rounded-lg space-y-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="space-y-1 min-w-0">
                                      <p className="font-medium text-sm">{task.title}</p>
                                      <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                                        <Badge className={`${stgCfg.color} border-0 text-[10px] font-medium px-2 py-0`}>
                                          {stgCfg.label}
                                        </Badge>
                                        {task.dueDate && (
                                          <span>Dự kiến: {String(task.dueDate).split("T")[0]}</span>
                                        )}
                                        {task.completedAt && (
                                          <span className="text-emerald-600">Hoàn thành: {String(task.completedAt).split("T")[0]}</span>
                                        )}
                                      </div>
                                    </div>
                                    {task.status === "done" ? (
                                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 border-0 text-[10px] shrink-0 gap-1">
                                        <CheckCircle2 className="h-3 w-3" /> Hoàn thành
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-[10px] shrink-0">{taskStatusConfig[task.status]?.label || task.status}</Badge>
                                    )}
                                  </div>

                                  {task.proofImage && (
                                    <div className="space-y-1">
                                      <p className="text-[11px] font-medium text-muted-foreground">Ảnh minh chứng</p>
                                      <img
                                        src={task.proofImage} alt="Ảnh minh chứng"
                                        className="max-w-[200px] max-h-[120px] rounded-md border object-cover"
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                      />
                                    </div>
                                  )}

                                  {task.description && (
                                    <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded-md">{task.description}</p>
                                  )}

                                  {assignee && (
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[9px] font-semibold text-primary shrink-0">
                                        {assignee.fullName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                                      </span>
                                      {assignee.fullName}
                                    </div>
                                  )}
                                </div>
                              );
                            }) : (
                              <p className="text-xs text-muted-foreground py-4 text-center">Chưa có công việc nào</p>
                            )}
                          </TabsContent>

                          {/* Nhật ký tab */}
                          <TabsContent value="diary" className="space-y-2 mt-3">
                            {seasonWorkLogs && seasonWorkLogs.length > 0 ? seasonWorkLogs.map(log => {
                              const logDate = log.createdAt ? new Date(log.createdAt) : null;
                              const logUser = users?.find(u => u.id === log.userId);
                              const imageMatch = log.content.match(/📷.*?:\s*(https?:\/\/\S+|\/media\/\S+)/);
                              const imageUrl = imageMatch ? imageMatch[1] : null;
                              const displayContent = log.content.replace(/📷.*?:\s*(https?:\/\/\S+|\/media\/\S+)/, "").trim();

                              return (
                                <div key={log.id} className="p-3 border rounded-lg space-y-2">
                                  <div className="flex items-center gap-2 text-xs flex-wrap">
                                    {logDate && (
                                      <span className="font-medium flex items-center gap-1">
                                        <CalendarDays className="h-3 w-3 text-amber-500" />
                                        {logDate.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
                                      </span>
                                    )}
                                    {logUser && (
                                      <span className="text-muted-foreground">• {logUser.fullName}</span>
                                    )}
                                  </div>
                                  {imageUrl && (
                                    <img
                                      src={imageUrl} alt="Ảnh nhật ký"
                                      className="max-w-[200px] max-h-[120px] rounded-md border object-cover"
                                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                    />
                                  )}
                                  {displayContent && (
                                    <p className="text-xs text-muted-foreground">{displayContent}</p>
                                  )}
                                </div>
                              );
                            }) : (
                              <p className="text-xs text-muted-foreground py-4 text-center">Chưa có nhật ký nào</p>
                            )}
                          </TabsContent>
                        </Tabs>
                      </CollapsibleContent>
                    </Collapsible>
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
