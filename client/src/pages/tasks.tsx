import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Plus, ClipboardList, CheckCircle2, Clock, AlertTriangle,
  Play, MoreVertical, Pencil, Trash2, Camera, Image, Weight,
  Filter, X, Search, CalendarDays, Upload,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useRef } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Task, Season, User, Crop } from "@shared/schema";
import { useAuth } from "@/lib/auth-context";

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  todo: { label: "Chờ làm", color: "bg-muted/50 text-muted-foreground", icon: Clock },
  doing: { label: "Đang làm", color: "bg-chart-1/15 text-chart-1", icon: Play },
  done: { label: "Hoàn thành", color: "bg-chart-2/15 text-chart-2", icon: CheckCircle2 },
  overdue: { label: "Quá hạn", color: "bg-destructive/15 text-destructive", icon: AlertTriangle },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  high: { label: "Cao", color: "bg-destructive/15 text-destructive" },
  medium: { label: "TB", color: "bg-chart-3/15 text-chart-3" },
  low: { label: "Thấp", color: "bg-muted text-muted-foreground" },
};

const stageLabels: Record<string, string> = {
  preparation: "Chuẩn bị",
  planting: "Gieo trồng",
  caring: "Chăm sóc",
  harvesting: "Thu hoạch",
};

export default function Tasks() {
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  // Complete task dialog states (matching season-progress style)
  const [completingTask, setCompletingTask] = useState<Task | null>(null);
  const [completeDescription, setCompleteDescription] = useState("");
  const [completeGrowthNotes, setCompleteGrowthNotes] = useState("");
  const [completeHarvestYield, setCompleteHarvestYield] = useState("");
  const [completeImageFiles, setCompleteImageFiles] = useState<File[]>([]);
  const [completeImagePreviews, setCompleteImagePreviews] = useState<string[]>([]);
  const [isSubmittingComplete, setIsSubmittingComplete] = useState(false);
  const completeFileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [tab, setTab] = useState("all");
  const [filterSeason, setFilterSeason] = useState<string>("all");
  const [filterCrop, setFilterCrop] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStage, setFilterStage] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");
  const { toast } = useToast();
  const { isManager, isFarmer, user: authUser } = useAuth();

  // Đếm số bộ lọc đang áp dụng
  const activeFilterCount = [filterSeason, filterCrop, filterPriority, filterStage]
    .filter(v => v !== "all").length
    + (filterDateFrom ? 1 : 0)
    + (filterDateTo ? 1 : 0);

  const clearAllFilters = () => {
    setFilterSeason("all");
    setFilterCrop("all");
    setFilterPriority("all");
    setFilterStage("all");
    setFilterDateFrom("");
    setFilterDateTo("");
  };

  const { data: tasks, isLoading } = useQuery<Task[]>({ queryKey: ["/api/tasks"] });
  const { data: seasons } = useQuery<Season[]>({ queryKey: ["/api/seasons"] });
  const { data: users } = useQuery<User[]>({ queryKey: ["/api/users"] });
  const { data: crops } = useQuery<Crop[]>({ queryKey: ["/api/crops"] });

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/tasks", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      setOpen(false);
      toast({ title: "Thành công", description: "Đã tạo công việc mới" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/tasks/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/seasons"] });
      setEditOpen(false);
      setEditTask(null);
      setCompleteOpen(false);
      setCompleteTaskId(null);
      setProofUrl("");
      setHarvestYield("");
      toast({ title: "Cập nhật thành công" });
    },
    onError: (error: Error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Thành công", description: "Đã xóa công việc" });
    },
    onError: (error: Error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  // Apply filters
  const filteredTasks = tasks?.filter(t => {
    // Lọc theo tìm kiếm text
    if (search) {
      const q = search.toLowerCase();
      const assignee = users?.find(u => u.id === t.assigneeId);
      const season = seasons?.find(s => s.id === t.seasonId);
      const matchesTitle = t.title.toLowerCase().includes(q);
      const matchesDesc = t.description?.toLowerCase().includes(q);
      const matchesAssignee = assignee?.fullName.toLowerCase().includes(q);
      const matchesSeason = season?.name.toLowerCase().includes(q);
      if (!matchesTitle && !matchesDesc && !matchesAssignee && !matchesSeason) return false;
    }
    if (tab !== "all" && t.status !== tab) return false;
    if (filterSeason !== "all" && t.seasonId !== filterSeason) return false;
    if (filterCrop !== "all") {
      const season = seasons?.find(s => s.id === t.seasonId);
      if (!season || season.cropId !== filterCrop) return false;
    }
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    if (filterStage !== "all" && t.stage !== filterStage) return false;
    // Lọc theo thời gian (dueDate)
    if (filterDateFrom && t.dueDate) {
      if (String(t.dueDate) < filterDateFrom) return false;
    }
    if (filterDateTo && t.dueDate) {
      if (String(t.dueDate) > filterDateTo) return false;
    }
    // Nếu có bộ lọc ngày nhưng task không có dueDate thì ẩn
    if ((filterDateFrom || filterDateTo) && !t.dueDate) return false;
    return true;
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createMutation.mutate({
      title: fd.get("title") as string,
      description: fd.get("description") as string,
      seasonId: fd.get("seasonId") as string || null,
      assigneeId: fd.get("assigneeId") as string || null,
      priority: fd.get("priority") as string || "medium",
      stage: fd.get("stage") as string || null,
      dueDate: fd.get("dueDate") as string || null,
      status: "todo",
    });
  };

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editTask) return;
    const fd = new FormData(e.currentTarget);
    updateMutation.mutate({
      id: editTask.id,
      data: {
        title: fd.get("title") as string,
        description: fd.get("description") as string,
        seasonId: fd.get("seasonId") as string || null,
        assigneeId: fd.get("assigneeId") as string || null,
        priority: fd.get("priority") as string || "medium",
        stage: fd.get("stage") as string || null,
        dueDate: fd.get("dueDate") as string || null,
      },
    });
  };

  const handleCompleteImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles: File[] = [];
    const validPreviews: string[] = [];
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "Lỗi", description: `${file.name} vượt quá 5MB`, variant: "destructive" });
        continue;
      }
      validFiles.push(file);
      validPreviews.push(URL.createObjectURL(file));
    }
    if (validFiles.length > 0) {
      setCompleteImageFiles(prev => [...prev, ...validFiles]);
      setCompleteImagePreviews(prev => [...prev, ...validPreviews]);
    }
    e.target.value = "";
  };

  const removeCompleteImage = (index: number) => {
    setCompleteImageFiles(prev => prev.filter((_, i) => i !== index));
    setCompleteImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleComplete = async () => {
    if (!completingTask) return;
    setIsSubmittingComplete(true);
    try {
      const imageUrls: string[] = [];

      // Upload all images
      for (const file of completeImageFiles) {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        const uploadRes = await apiRequest("POST", "/api/upload/work-logs", {
          base64,
          filename: file.name,
        });
        const uploadData = await uploadRes.json();
        imageUrls.push(uploadData.url);
      }

      // Build complete data
      const completeData: Record<string, unknown> = {
        status: "done",
        proofImage: imageUrls[0] || null,
      };
      if (completingTask.stage === "harvesting" && completeHarvestYield) {
        completeData.harvestYield = parseFloat(completeHarvestYield);
      }

      await apiRequest("PATCH", `/api/tasks/${completingTask.id}`, completeData);

      // Build work log content
      const season = seasons?.find(s => s.id === completingTask.seasonId);
      const stageLabel = completingTask.stage ? stageLabels[completingTask.stage] || completingTask.stage : "";
      const parts: string[] = [];
      parts.push(`Hoàn thành công việc: ${completingTask.title}`);
      if (completeDescription.trim()) parts.push(`Mô tả: ${completeDescription.trim()}`);
      if (stageLabel) parts.push(`Giai đoạn: ${stageLabel}`);
      if (season) parts.push(`Mùa vụ: ${season.name}`);
      if (completeGrowthNotes.trim()) parts.push(`Ghi chú sinh trưởng: ${completeGrowthNotes.trim()}`);
      if (completeHarvestYield.trim()) parts.push(`Sản lượng thu hoạch: ${completeHarvestYield.trim()} kg`);
      for (const url of imageUrls) {
        parts.push(`📷 Ảnh minh chứng: ${url}`);
      }

      await apiRequest("POST", "/api/work-logs", {
        content: parts.join("\n"),
        taskId: completingTask.id,
        seasonId: completingTask.seasonId || null,
        userId: authUser?.id || null,
        hoursWorked: null,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/seasons"] });

      toast({ title: "Thành công", description: `Đã hoàn thành: ${completingTask.title} và ghi nhật ký sản xuất` });
      setCompletingTask(null);
    } catch (error: any) {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmittingComplete(false);
    }
  };

  const openEdit = (task: Task) => {
    setEditTask(task);
    setEditOpen(true);
  };

  const openComplete = (task: Task) => {
    setCompletingTask(task);
    setCompleteDescription("");
    setCompleteGrowthNotes("");
    setCompleteHarvestYield("");
    setCompleteImageFiles([]);
    setCompleteImagePreviews([]);
  };

  const counts = {
    all: tasks?.length || 0,
    todo: tasks?.filter(t => t.status === "todo").length || 0,
    doing: tasks?.filter(t => t.status === "doing").length || 0,
    done: tasks?.filter(t => t.status === "done").length || 0,
    overdue: tasks?.filter(t => t.status === "overdue").length || 0,
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Công việc</h1>
            <p className="text-sm text-muted-foreground mt-1">Quản lý và phân công công việc</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            {isManager && <DialogTrigger asChild>
              <Button data-testid="button-add-task"><Plus className="mr-1 h-4 w-4" /> Thêm việc</Button>
            </DialogTrigger>}
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Thêm công việc mới</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="title">Tiêu đề *</Label>
                  <Input id="title" name="title" required data-testid="input-task-title" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="description">Mô tả</Label>
                  <Textarea id="description" name="description" data-testid="input-task-description" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Mùa vụ</Label>
                    <Select name="seasonId">
                      <SelectTrigger data-testid="select-task-season"><SelectValue placeholder="Chọn" /></SelectTrigger>
                      <SelectContent>
                        {seasons?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Phân công</Label>
                    <Select name="assigneeId">
                      <SelectTrigger data-testid="select-task-assignee"><SelectValue placeholder="Chọn" /></SelectTrigger>
                      <SelectContent>
                        {users?.map(u => <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label>Ưu tiên</Label>
                    <Select name="priority" defaultValue="medium">
                      <SelectTrigger data-testid="select-task-priority"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Thấp</SelectItem>
                        <SelectItem value="medium">Trung bình</SelectItem>
                        <SelectItem value="high">Cao</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Giai đoạn</Label>
                    <Select name="stage">
                      <SelectTrigger data-testid="select-task-stage"><SelectValue placeholder="Chọn" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="preparation">Chuẩn bị</SelectItem>
                        <SelectItem value="planting">Gieo trồng</SelectItem>
                        <SelectItem value="caring">Chăm sóc</SelectItem>
                        <SelectItem value="harvesting">Thu hoạch</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dueDate">Hạn</Label>
                    <Input id="dueDate" name="dueDate" type="date" data-testid="input-task-due" />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-task">
                  {createMutation.isPending ? "Đang lưu..." : "Tạo công việc"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search + Filter bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative max-w-sm flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm công việc..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search-tasks"
            />
          </div>

          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="relative shrink-0"
                data-testid="button-filter-tasks"
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

                {/* Mùa vụ */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Mùa vụ</Label>
                  <Select value={filterSeason} onValueChange={setFilterSeason}>
                    <SelectTrigger className="h-8 text-xs" data-testid="filter-task-season">
                      <SelectValue placeholder="Tất cả" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả mùa vụ</SelectItem>
                      {seasons?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Cây trồng */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Cây trồng</Label>
                  <Select value={filterCrop} onValueChange={setFilterCrop}>
                    <SelectTrigger className="h-8 text-xs" data-testid="filter-task-crop">
                      <SelectValue placeholder="Tất cả" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả cây trồng</SelectItem>
                      {crops?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Ưu tiên */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Ưu tiên</Label>
                  <Select value={filterPriority} onValueChange={setFilterPriority}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Tất cả" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="high">Cao</SelectItem>
                      <SelectItem value="medium">Trung bình</SelectItem>
                      <SelectItem value="low">Thấp</SelectItem>
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

                {/* Thời gian */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Thời gian (theo hạn)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Từ ngày</Label>
                      <Input
                        type="date"
                        value={filterDateFrom}
                        onChange={(e) => setFilterDateFrom(e.target.value)}
                        className="h-8 text-xs"
                        data-testid="filter-task-date-from"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Đến ngày</Label>
                      <Input
                        type="date"
                        value={filterDateTo}
                        onChange={(e) => setFilterDateTo(e.target.value)}
                        className="h-8 text-xs"
                        data-testid="filter-task-date-to"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Hiển thị badge bộ lọc đang áp dụng */}
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {filterSeason !== "all" && (
                <Badge variant="secondary" className="text-xs gap-1 pl-2 pr-1 py-0.5">
                  {seasons?.find(s => s.id === filterSeason)?.name || "Mùa vụ"}
                  <button onClick={() => setFilterSeason("all")} className="ml-0.5 hover:text-destructive">
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
              {filterPriority !== "all" && (
                <Badge variant="secondary" className="text-xs gap-1 pl-2 pr-1 py-0.5">
                  {priorityConfig[filterPriority]?.label || filterPriority}
                  <button onClick={() => setFilterPriority("all")} className="ml-0.5 hover:text-destructive">
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
              {(filterDateFrom || filterDateTo) && (
                <Badge variant="secondary" className="text-xs gap-1 pl-2 pr-1 py-0.5">
                  <CalendarDays className="h-3 w-3" />
                  {filterDateFrom && filterDateTo
                    ? `${filterDateFrom} → ${filterDateTo}`
                    : filterDateFrom
                      ? `Từ ${filterDateFrom}`
                      : `Đến ${filterDateTo}`}
                  <button onClick={() => { setFilterDateFrom(""); setFilterDateTo(""); }} className="ml-0.5 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList data-testid="tabs-task-status">
            <TabsTrigger value="all">Tất cả ({counts.all})</TabsTrigger>
            <TabsTrigger value="todo">Chờ làm ({counts.todo})</TabsTrigger>
            <TabsTrigger value="doing">Đang làm ({counts.doing})</TabsTrigger>
            <TabsTrigger value="done">Xong ({counts.done})</TabsTrigger>
            <TabsTrigger value="overdue">Quá hạn ({counts.overdue})</TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="mt-4">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : filteredTasks && filteredTasks.length > 0 ? (
              <div className="space-y-2">
                {filteredTasks.map((task) => {
                  const cfg = statusConfig[task.status];
                  const pri = priorityConfig[task.priority || "medium"];
                  const assignee = users?.find(u => u.id === task.assigneeId);
                  const season = seasons?.find(s => s.id === task.seasonId);
                  const StatusIcon = cfg.icon;
                  const isAssignedToMe = isFarmer && task.assigneeId === authUser?.id;

                  return (
                    <Card key={task.id} className="hover-elevate" data-testid={`card-task-${task.id}`}>
                      <CardContent className="p-3 md:p-4">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${cfg.color}`}>
                            <StatusIcon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium truncate">{task.title}</p>
                              <Badge variant="outline" className={`text-[10px] shrink-0 no-default-active-elevate ${pri.color}`}>
                                {pri.label}
                              </Badge>
                              {task.stage && (
                                <Badge variant="outline" className="text-[10px] shrink-0 no-default-active-elevate">
                                  {stageLabels[task.stage] || task.stage}
                                </Badge>
                              )}
                              {task.proofImage && (
                                <Badge variant="outline" className="text-[10px] shrink-0 no-default-active-elevate">
                                  <Image className="mr-0.5 h-2.5 w-2.5" /> Có ảnh
                                </Badge>
                              )}
                              {(task as any).harvestYield && (
                                <Badge variant="outline" className="text-[10px] shrink-0 no-default-active-elevate bg-chart-2/10">
                                  <Weight className="mr-0.5 h-2.5 w-2.5" /> {(task as any).harvestYield} tấn
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                              {assignee && <span>{assignee.fullName}</span>}
                              {season && <span>{season.name}</span>}
                              {task.dueDate && <span>Hạn: {String(task.dueDate)}</span>}
                              {task.completedAt && <span>Xong: {new Date(task.completedAt).toLocaleDateString("vi-VN")}</span>}
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" data-testid={`button-task-menu-${task.id}`}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {(isManager || isAssignedToMe) && task.status !== "doing" && task.status !== "done" && (
                                <DropdownMenuItem onClick={() => updateMutation.mutate({ id: task.id, data: { status: "doing" } })}>
                                  Bắt đầu làm
                                </DropdownMenuItem>
                              )}
                              {/* Only assigned farmer can mark done */}
                              {isAssignedToMe && task.status !== "done" && (
                                <DropdownMenuItem onClick={() => openComplete(task)}>
                                  <Camera className="mr-1 h-3.5 w-3.5" /> Hoàn thành
                                </DropdownMenuItem>
                              )}

                              {/* Edit only when todo, manager only */}
                              {isManager && task.status === "todo" && (
                                <DropdownMenuItem onClick={() => openEdit(task)}>
                                  <Pencil className="mr-1 h-3.5 w-3.5" /> Chỉnh sửa
                                </DropdownMenuItem>
                              )}
                              {/* Delete only when todo, manager only */}
                              {isManager && task.status === "todo" && (
                                <DropdownMenuItem
                                  onClick={() => deleteMutation.mutate(task.id)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="mr-1 h-3.5 w-3.5" /> Xóa
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16">
                <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">Không có công việc</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit task dialog */}
      <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) setEditTask(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa công việc</DialogTitle>
          </DialogHeader>
          {editTask && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-title">Tiêu đề *</Label>
                <Input id="edit-title" name="title" required defaultValue={editTask.title} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-description">Mô tả</Label>
                <Textarea id="edit-description" name="description" defaultValue={editTask.description || ""} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Mùa vụ</Label>
                  <Select name="seasonId" defaultValue={editTask.seasonId || undefined}>
                    <SelectTrigger><SelectValue placeholder="Chọn" /></SelectTrigger>
                    <SelectContent>
                      {seasons?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Phân công</Label>
                  <Select name="assigneeId" defaultValue={editTask.assigneeId || undefined}>
                    <SelectTrigger><SelectValue placeholder="Chọn" /></SelectTrigger>
                    <SelectContent>
                      {users?.map(u => <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Ưu tiên</Label>
                  <Select name="priority" defaultValue={editTask.priority || "medium"}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Thấp</SelectItem>
                      <SelectItem value="medium">Trung bình</SelectItem>
                      <SelectItem value="high">Cao</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Giai đoạn</Label>
                  <Select name="stage" defaultValue={editTask.stage || undefined}>
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
                  <Label htmlFor="edit-dueDate">Hạn</Label>
                  <Input id="edit-dueDate" name="dueDate" type="date" defaultValue={editTask.dueDate ? String(editTask.dueDate) : ""} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Đang lưu..." : "Cập nhật"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Complete task dialog - matching season-progress style */}
      <Dialog open={!!completingTask} onOpenChange={(o) => { if (!o) setCompletingTask(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Xác nhận hoàn thành</DialogTitle>
            {completingTask && (
              <p className="text-sm text-muted-foreground">{completingTask.title}</p>
            )}
          </DialogHeader>
          {completingTask && (
            <div className="space-y-5 pt-2">
              {/* Image upload */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Ảnh minh chứng</label>
                <input
                  ref={completeFileInputRef}
                  type="file"
                  accept="image/png,image/jpg,image/jpeg"
                  multiple
                  className="hidden"
                  onChange={handleCompleteImageChange}
                />
                {completeImagePreviews.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {completeImagePreviews.map((preview, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={preview}
                          alt={`Ảnh ${idx + 1}`}
                          className="w-20 h-20 object-cover rounded-lg border"
                        />
                        <button
                          type="button"
                          onClick={() => removeCompleteImage(idx)}
                          className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors"
                  onClick={() => completeFileInputRef.current?.click()}
                >
                  <Upload className="h-7 w-7 text-gray-400 mb-1.5" />
                  <p className="text-sm text-gray-500 font-medium">Click để tải lên file</p>
                  <p className="text-xs text-gray-400 mt-0.5">PNG, JPG, JPEG (tối đa 5MB/ảnh)</p>
                </div>
              </div>

              {/* Work description */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Mô tả công việc</label>
                <Textarea
                  placeholder="Nhập mô tả công việc đã thực hiện..."
                  value={completeDescription}
                  onChange={(e) => setCompleteDescription(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Growth notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Ghi chú sinh trưởng</label>
                <Textarea
                  placeholder="Nhập ghi chú về sinh trưởng của cây trồng..."
                  value={completeGrowthNotes}
                  onChange={(e) => setCompleteGrowthNotes(e.target.value)}
                  rows={4}
                />
              </div>

              {/* Harvest yield */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Sản lượng thu hoạch (kg)</label>
                <Input
                  type="text"
                  placeholder="Nhập sản lượng thực tế (nếu có)"
                  value={completeHarvestYield}
                  onChange={(e) => setCompleteHarvestYield(e.target.value)}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setCompletingTask(null)}
                  disabled={isSubmittingComplete}
                >
                  Hủy
                </Button>
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleComplete}
                  disabled={isSubmittingComplete}
                >
                  {isSubmittingComplete ? "Đang xử lý..." : "Xác nhận"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </ScrollArea>
  );
}
