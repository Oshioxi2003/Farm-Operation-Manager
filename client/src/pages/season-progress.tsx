import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Sprout, Leaf, Sun, CheckCircle2, Circle,
  CalendarDays, MapPin, ChevronRight, Clock, ClipboardList, AlertTriangle, Upload,
} from "lucide-react";
import { useState, useRef } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import type { Season, Crop, Task, Supply, WorkLog, User } from "@shared/schema";

const stages = [
  { key: "preparation", label: "Chuẩn bị", icon: ClipboardList, color: "text-chart-4" },
  { key: "planting", label: "Gieo trồng", icon: Sprout, color: "text-chart-2" },
  { key: "caring", label: "Chăm sóc", icon: Leaf, color: "text-chart-1" },
  { key: "harvesting", label: "Thu hoạch", icon: Sun, color: "text-chart-3" },
];

const stageIndex: Record<string, number> = { preparation: 0, planting: 1, caring: 2, harvesting: 3 };

const stageBadgeConfig: Record<string, { label: string; color: string }> = {
  preparation: { label: "Chuẩn bị", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" },
  planting: { label: "Gieo trồng", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" },
  caring: { label: "Chăm sóc", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  harvesting: { label: "Thu hoạch", color: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" },
};

const statusLabels: Record<string, { label: string; color: string }> = {
  planning: { label: "Kế hoạch", color: "bg-gray-100 text-gray-700" },
  active: { label: "Đang diễn ra", color: "bg-blue-100 text-blue-700" },
  completed: { label: "Hoàn thành", color: "bg-emerald-100 text-emerald-700" },
};

export default function SeasonProgress() {
  const { toast } = useToast();
  const { isFarmer, isManager, user } = useAuth();
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("tasks");
  const [selectedWorkLog, setSelectedWorkLog] = useState<WorkLog | null>(null);

  // Complete task dialog states
  const [completingTask, setCompletingTask] = useState<Task | null>(null);
  const [completeDescription, setCompleteDescription] = useState("");
  const [completeGrowthNotes, setCompleteGrowthNotes] = useState("");
  const [completeHarvestYield, setCompleteHarvestYield] = useState("");
  const [completeImageFiles, setCompleteImageFiles] = useState<File[]>([]);
  const [completeImagePreviews, setCompleteImagePreviews] = useState<string[]>([]);
  const [isSubmittingComplete, setIsSubmittingComplete] = useState(false);
  const completeFileInputRef = useRef<HTMLInputElement>(null);

  // Filter states
  const [filterSeasonId, setFilterSeasonId] = useState<string>("all");
  const [filterCropId, setFilterCropId] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<string>("");

  const { data: seasons, isLoading } = useQuery<Season[]>({ queryKey: ["/api/seasons"] });
  const { data: crops } = useQuery<Crop[]>({ queryKey: ["/api/crops"] });
  const { data: allTasks } = useQuery<Task[]>({ queryKey: ["/api/tasks"] });
  const { data: users } = useQuery<User[]>({ queryKey: ["/api/users"] });
  const { data: supplies } = useQuery<Supply[]>({ queryKey: ["/api/supplies"] });

  // Fetch work logs for selected season
  const { data: seasonWorkLogs } = useQuery<WorkLog[]>({
    queryKey: ["/api/work-logs/season", selectedSeasonId],
    queryFn: async () => {
      if (!selectedSeasonId) return [];
      const res = await fetch(`/api/work-logs/season/${selectedSeasonId}`, { credentials: "include" });
      return res.json();
    },
    enabled: !!selectedSeasonId,
  });

  const taskUpdateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/tasks/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const activeSeasons = seasons?.filter(s => s.status === "active" || s.status === "planning") || [];

  // Auto-select first season
  if (activeSeasons.length > 0 && !selectedSeasonId) {
    setSelectedSeasonId(activeSeasons[0].id);
  }

  const selectedSeason = seasons?.find(s => s.id === selectedSeasonId);
  const selectedCrop = selectedSeason ? crops?.find(c => c.id === selectedSeason.cropId) : null;

  // Get all tasks, then filter
  const allSeasonTasks = allTasks?.filter(t => {
    // Filter by selected season (from tab context) OR by filter dropdown
    if (filterSeasonId !== "all") {
      if (t.seasonId !== filterSeasonId) return false;
    } else if (selectedSeasonId) {
      if (t.seasonId !== selectedSeasonId) return false;
    }

    // Filter by crop
    if (filterCropId !== "all") {
      const taskSeason = seasons?.find(s => s.id === t.seasonId);
      if (!taskSeason || taskSeason.cropId !== filterCropId) return false;
    }

    // Filter by date
    if (filterDate) {
      const taskDate = t.dueDate ? String(t.dueDate).split("T")[0] : null;
      if (!taskDate || taskDate > filterDate) return false;
    }

    return true;
  }) || [];

  // Open complete task dialog
  const openCompleteDialog = (task: Task) => {
    setCompletingTask(task);
    setCompleteDescription("");
    setCompleteGrowthNotes("");
    setCompleteHarvestYield("");
    setCompleteImageFiles([]);
    setCompleteImagePreviews([]);
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
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  const removeCompleteImage = (index: number) => {
    setCompleteImageFiles(prev => prev.filter((_, i) => i !== index));
    setCompleteImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Handle complete task - with dialog form data
  const handleCompleteTask = async () => {
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
          data: base64,
          filename: file.name,
        });
        const uploadData = await uploadRes.json();
        imageUrls.push(uploadData.url);
      }

      await taskUpdateMutation.mutateAsync({ id: completingTask.id, data: { status: "done" } });

      // Build work log content
      const season = seasons?.find(s => s.id === completingTask.seasonId);
      const stageLabel = completingTask.stage ? stages.find(s => s.key === completingTask.stage)?.label || completingTask.stage : "";
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
        seasonId: completingTask.seasonId,
        userId: user?.id || null,
        taskId: completingTask.id,
        hoursWorked: null,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/work-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-logs/season", selectedSeasonId] });
      queryClient.invalidateQueries({ queryKey: ["/api/seasons"] });

      toast({ title: "Thành công", description: `Đã hoàn thành: ${completingTask.title} và ghi nhật ký sản xuất` });
      setCompletingTask(null);
    } catch {
      toast({ title: "Lỗi", description: "Không thể cập nhật", variant: "destructive" });
    } finally {
      setIsSubmittingComplete(false);
    }
  };

  return (
    <>
      <ScrollArea className="h-full">
        <div className="p-4 md:p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Tiến độ giai đoạn</h1>
            <p className="text-sm text-muted-foreground mt-1">Theo dõi tiến độ các mùa vụ đang hoạt động</p>
          </div>

          {/* Season selector if multiple */}
          {activeSeasons.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {activeSeasons.map(s => (
                <Button
                  key={s.id}
                  variant={selectedSeasonId === s.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedSeasonId(s.id)}
                  className="text-sm"
                >
                  {s.name}
                </Button>
              ))}
            </div>
          )}

          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <Card key={i}><CardContent className="p-4"><Skeleton className="h-40 w-full" /></CardContent></Card>
              ))}
            </div>
          ) : selectedSeason ? (
            <div className="space-y-5">
              {/* Season Header */}
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold">{selectedSeason.name}</h2>
                  <div className="flex items-center gap-3 mt-1.5 text-sm text-muted-foreground flex-wrap">
                    {selectedCrop && (
                      <span className="flex items-center gap-1">
                        <Sprout className="h-3.5 w-3.5" /> {selectedCrop.name}
                      </span>
                    )}
                    {selectedSeason.cultivationZone && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" /> {selectedSeason.cultivationZone}
                      </span>
                    )}
                    {selectedSeason.startDate && (
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {String(selectedSeason.startDate).split("T")[0]}
                        {selectedSeason.endDate && ` - ${String(selectedSeason.endDate).split("T")[0]}`}
                      </span>
                    )}
                    <Badge className={`${statusLabels[selectedSeason.status]?.color || ""} border-0 text-xs font-medium`}>
                      {statusLabels[selectedSeason.status]?.label || selectedSeason.status}
                    </Badge>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Tiến độ</span>
                    <span className="font-semibold text-emerald-600">{selectedSeason.progress || 0}%</span>
                  </div>
                  <Progress value={selectedSeason.progress || 0} className="h-2.5" />
                </div>
              </div>

              {/* Tabs: Công việc / Nhật ký */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="bg-transparent border-b rounded-none p-0 h-auto w-full justify-start gap-0">
                  <TabsTrigger
                    value="tasks"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-2 pt-1 text-sm font-medium"
                  >
                    Công việc <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[11px]">{allSeasonTasks.length}</Badge>
                  </TabsTrigger>
                  <TabsTrigger
                    value="diary"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-2 pt-1 text-sm font-medium"
                  >
                    Nhật ký <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[11px]">{seasonWorkLogs?.length || 0}</Badge>
                  </TabsTrigger>
                </TabsList>

                {/* === CÔNG VIỆC TAB === */}
                <TabsContent value="tasks" className="space-y-4 mt-0">
                  {/* Filter bar */}
                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <ClipboardList className="h-4 w-4" /> Bộ lọc
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">Mùa vụ</label>
                          <Select value={filterSeasonId} onValueChange={setFilterSeasonId}>
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue placeholder="Tất cả" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Tất cả</SelectItem>
                              {seasons?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">Cây trồng</label>
                          <Select value={filterCropId} onValueChange={setFilterCropId}>
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue placeholder="Tất cả" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Tất cả</SelectItem>
                              {crops?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">Thời gian</label>
                          <Input
                            type="date"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            className="h-9 text-sm"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Task list */}
                  {allSeasonTasks.length > 0 ? allSeasonTasks.map(task => {
                    const season = seasons?.find(s => s.id === task.seasonId);
                    const crop = season ? crops?.find(c => c.id === season.cropId) : null;
                    const stgCfg = stageBadgeConfig[task.stage || "planting"] || stageBadgeConfig.planting;
                    const stageLabel = stages.find(s => s.key === task.stage)?.label || task.stage || "";
                    const isDone = task.status === "done";
                    const isTodo = task.status === "todo";
                    const isMyTask = !task.assigneeId || task.assigneeId === user?.id;

                    return (
                      <Card
                        key={task.id}
                        className={`overflow-hidden border-l-4 ${isDone ? "border-l-emerald-500" : "border-l-emerald-400"} hover:shadow-md transition-shadow`}
                      >
                        <CardContent className="p-4 space-y-3">
                          {/* Row 1: Title + Stage label */}
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-bold text-base">{task.title}</h4>
                            <span className="text-sm font-medium text-emerald-600 shrink-0">{stageLabel}</span>
                          </div>

                          {/* Row 2: Status badge */}
                          {isDone ? (
                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 border-0 text-xs font-medium gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Đã hoàn thành
                            </Badge>
                          ) : (
                            <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300 border-0 text-xs font-medium gap-1">
                              <AlertTriangle className="h-3 w-3" /> Chưa thực hiện
                            </Badge>
                          )}

                          {/* Row 3: Meta info */}
                          <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                            {task.dueDate && (
                              <span className="flex items-center gap-1">
                                <CalendarDays className="h-3 w-3" /> {String(task.dueDate).split("T")[0]}
                              </span>
                            )}
                            {season && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" /> {season.name}
                              </span>
                            )}
                            {crop && (
                              <span className="flex items-center gap-1">
                                <Sprout className="h-3 w-3" /> {crop.name}
                              </span>
                            )}
                            {season?.cultivationZone && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> {season.cultivationZone}
                              </span>
                            )}
                          </div>

                          {/* Row 4: Complete button (farmer only, assigned to me, not done) */}
                          {isFarmer && !isDone && isMyTask && (
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-6"
                              onClick={() => openCompleteDialog(task)}
                              disabled={taskUpdateMutation.isPending}
                            >
                              Hoàn thành
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  }) : (
                    <div className="text-center py-10">
                      <Circle className="h-10 w-10 mx-auto text-muted-foreground/20 mb-2" />
                      <p className="text-sm text-muted-foreground">Chưa có công việc nào</p>
                    </div>
                  )}
                </TabsContent>

                {/* === NHẬT KÝ TAB === */}
                <TabsContent value="diary" className="space-y-3 mt-0">
                  {seasonWorkLogs && seasonWorkLogs.length > 0 ? seasonWorkLogs.map(log => {
                    const logDate = log.createdAt ? new Date(log.createdAt) : null;
                    const logUser = users?.find(u => u.id === log.userId);
                    // Try to find related task
                    const relatedTask = log.taskId ? allTasks?.find(t => t.id === log.taskId) : null;
                    const taskStage = relatedTask?.stage ? stageBadgeConfig[relatedTask.stage] : null;

                    // Check if content has an image URL
                    const imageMatch = log.content.match(/📷.*?:\s*(https?:\/\/\S+|\/media\/\S+)/);
                    const imageUrl = imageMatch ? imageMatch[1] : null;
                    const displayContent = log.content.replace(/📷.*?:\s*(https?:\/\/\S+|\/media\/\S+)/, "").trim();

                    return (
                      <Card key={log.id} className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedWorkLog(log)}>
                        <CardContent className="p-4 space-y-3">
                          {/* Log header */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap text-xs">
                              {logDate && (
                                <span className="flex items-center gap-1 font-medium text-foreground">
                                  <CalendarDays className="h-3 w-3 text-amber-500" />
                                  {logDate.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
                                </span>
                              )}
                              {relatedTask && (
                                <span className="text-muted-foreground">• {relatedTask.title}</span>
                              )}
                              {taskStage && (
                                <Badge className={`${taskStage.color} border-0 text-[11px] font-medium px-2 py-0`}>
                                  {taskStage.label}
                                </Badge>
                              )}
                            </div>
                            <Button variant="ghost" size="sm" className="text-xs text-primary h-6 gap-1 shrink-0 px-2" onClick={(e) => { e.stopPropagation(); setSelectedWorkLog(log); }}>
                              Xem chi tiết <ChevronRight className="h-3 w-3" />
                            </Button>
                          </div>

                          {/* Image */}
                          {imageUrl && (
                            <div className="space-y-1.5">
                              <p className="text-xs font-medium text-muted-foreground">Ảnh minh chứng</p>
                              <img
                                src={imageUrl}
                                alt="Ảnh nhật ký"
                                className="max-w-[280px] max-h-[160px] rounded-lg border object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            </div>
                          )}

                          {/* Content */}
                          {displayContent && (
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-muted-foreground">Mô tả</p>
                              <p className="text-sm text-muted-foreground">{displayContent}</p>
                            </div>
                          )}

                          {/* Supply info */}
                          {log.supplyId && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 p-2 rounded-md">
                              📦 Vật tư sử dụng: {log.supplyQuantity} đơn vị
                            </div>
                          )}

                          {/* User */}
                          {logUser && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[9px] font-semibold text-primary shrink-0">
                                {logUser.fullName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                              </span>
                              {logUser.fullName}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  }) : (
                    <div className="text-center py-10">
                      <CalendarDays className="h-10 w-10 mx-auto text-muted-foreground/20 mb-2" />
                      <p className="text-sm text-muted-foreground">Chưa có nhật ký nào</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="text-center py-16">
              <Sprout className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">Không có mùa vụ đang hoạt động</p>
            </div>
          )}
        </div>

      </ScrollArea>

      {/* Work log detail dialog */}
      <Dialog open={!!selectedWorkLog} onOpenChange={(o) => { if (!o) setSelectedWorkLog(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="sr-only">Chi tiết nhật ký</DialogTitle></DialogHeader>
          {selectedWorkLog && (() => {
            const wl = selectedWorkLog;
            const task = wl.taskId ? allTasks?.find(t => t.id === wl.taskId) : null;
            const logUser = users?.find(u => u.id === wl.userId);
            const logDate = wl.createdAt ? new Date(wl.createdAt) : null;
            const title = task ? task.title : wl.content.split("\n")[0].replace(/^📷|^📦/, "").trim();
            const isCompleted = task?.status === "done";
            const logSupply = wl.supplyId ? supplies?.find(s => s.id === wl.supplyId) : null;

            // Parse URLs from content
            const urlPattern = /(https?:\/\/\S+|\/media\/\S+)/g;
            const foundUrls = wl.content.match(urlPattern) || [];
            const imgExt = /\.(jpg|jpeg|png|gif|webp|bmp)/i;
            const imgUrls = foundUrls.filter(u => imgExt.test(u));
            const taskImg = task?.proofImage ? [task.proofImage] : [];
            const allImgs = Array.from(new Set([...taskImg, ...imgUrls]));

            return (
              <div className="space-y-5">
                {/* Header */}
                <div className="flex items-start gap-3">
                  <CheckCircle2 className={`h-6 w-6 mt-0.5 shrink-0 ${isCompleted ? "text-emerald-500" : "text-emerald-400"}`} />
                  <div>
                    <h3 className="text-lg font-bold">{title}</h3>
                    {logDate && (
                      <p className="text-sm text-muted-foreground">
                        {logDate.toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                        {" • "}
                        {logDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Trạng thái</p>
                  <Badge className={`${isCompleted ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" : "bg-blue-100 text-blue-700"} border-0 text-xs font-medium`}>
                    {isCompleted ? "Hoàn thành" : task?.status === "doing" ? "Đang thực hiện" : "Ghi nhận"}
                  </Badge>
                </div>

                {/* Season */}
                {selectedSeason && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Vụ mùa</p>
                    <p className="text-sm font-medium">
                      {selectedSeason.name}
                      {selectedSeason.startDate && selectedSeason.endDate && (
                        <span className="text-muted-foreground font-normal"> ({new Date(selectedSeason.startDate as string).toLocaleDateString("vi-VN", { month: "long" })} - {new Date(selectedSeason.endDate as string).toLocaleDateString("vi-VN", { month: "long" })})</span>
                      )}
                    </p>
                  </div>
                )}

                {/* Stage */}
                {task?.stage && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Giai đoạn</p>
                    <p className="text-sm font-medium">{stages.find(s => s.key === task.stage)?.label || task.stage}</p>
                  </div>
                )}

                {/* User */}
                {logUser && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Người thực hiện</p>
                    <p className="text-sm font-medium">{logUser.fullName}</p>
                  </div>
                )}

                {/* Task description */}
                {task?.description && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Mô tả công việc</p>
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-sm text-muted-foreground leading-relaxed">{task.description}</p>
                    </div>
                  </div>
                )}

                {/* Growth notes with links */}
                {wl.content && (() => {
                  // Strip image proof lines
                  const cleanContent = wl.content
                    .split("\n")
                    .filter((line: string) => !line.match(/^📷\s*Ảnh minh chứng/))
                    .join("\n")
                    .trim();
                  if (!cleanContent) return null;

                  const urlRx = /(https?:\/\/\S+)/g;
                  const parts = cleanContent.split(urlRx);
                  return (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ghi chú sinh trưởng</p>
                      <div className="text-sm leading-relaxed">
                        {parts.map((part: string, i: number) =>
                          urlRx.test(part) ? (
                            <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">{part}</a>
                          ) : (
                            <span key={i}>{part}</span>
                          )
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Supply */}
                {logSupply && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Vật tư sử dụng</p>
                    <p className="text-sm">{logSupply.name}: <span className="font-medium">{wl.supplyQuantity} {logSupply.unit}</span></p>
                  </div>
                )}

                {/* Harvest yield */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sản lượng thu hoạch (kg)</p>
                  <div className="border rounded-lg px-3 py-2">
                    <p className="text-sm text-muted-foreground">
                      {(task as any)?.harvestYield ? `${(task as any).harvestYield} tấn` : "Chưa thu hoạch"}
                    </p>
                  </div>
                </div>

                {/* Images */}
                {allImgs.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ảnh minh chứng ({allImgs.length})</p>
                    <div className="flex gap-2 flex-wrap">
                      {allImgs.map((url, i) => (
                        <img key={i} src={url} alt={`Ảnh ${i + 1}`} className="max-w-[160px] max-h-[120px] rounded-lg border object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Close */}
                <div className="flex justify-end pt-2">
                  <Button variant="outline" onClick={() => setSelectedWorkLog(null)}>Đóng</Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Complete task confirmation dialog */}
      <Dialog open={!!completingTask} onOpenChange={(o) => { if (!o) setCompletingTask(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Xác nhận hoàn thành</DialogTitle>
            {completingTask && (
              <p className="text-sm text-muted-foreground">{user?.fullName || ""}</p>
            )}
          </DialogHeader>
          {completingTask && (
            <div className="space-y-5 pt-2">
              {/* Image upload */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Ảnh minh chứng
                </label>
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
                  onClick={handleCompleteTask}
                  disabled={isSubmittingComplete}
                >
                  {isSubmittingComplete ? "Đang xử lý..." : "Xác nhận"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
