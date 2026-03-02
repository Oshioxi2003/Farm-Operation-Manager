import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Sprout, Leaf, Sun, CheckCircle2, Circle, ArrowRight, Image,
  Plus, Trash2, CalendarDays, MapPin, ChevronRight, Clock, Upload, ClipboardList,
} from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import type { Season, Crop, Task, Supply, WorkLog, User } from "@shared/schema";

interface SupplyUsage {
  supplyId: string;
  quantity: number;
}

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
  const [diaryOpen, setDiaryOpen] = useState(false);
  const [diaryContent, setDiaryContent] = useState("");
  const [diaryImages, setDiaryImages] = useState<string[]>([]);
  const [pendingSeason, setPendingSeason] = useState<Season | null>(null);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("tasks");
  const [selectedWorkLog, setSelectedWorkLog] = useState<WorkLog | null>(null);
  const [uploadingDiaryImage, setUploadingDiaryImage] = useState(false);

  const handleDiaryImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingDiaryImage(true);
    const uploaded: string[] = [];
    for (const file of Array.from(files)) {
      try {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        const res = await apiRequest("POST", "/api/upload/work-logs", { base64, filename: file.name });
        const data = await res.json();
        if (data.url) uploaded.push(data.url);
      } catch {
        toast({ title: "Lỗi", description: `Không thể tải ${file.name}`, variant: "destructive" });
      }
    }
    setDiaryImages(prev => [...prev, ...uploaded]);
    setUploadingDiaryImage(false);
    e.target.value = "";
  };

  const { data: seasons, isLoading } = useQuery<Season[]>({ queryKey: ["/api/seasons"] });
  const { data: crops } = useQuery<Crop[]>({ queryKey: ["/api/crops"] });
  const { data: allTasks } = useQuery<Task[]>({ queryKey: ["/api/tasks"] });
  const { data: users } = useQuery<User[]>({ queryKey: ["/api/users"] });
  const { data: supplies } = useQuery<Supply[]>({ queryKey: ["/api/supplies"] });
  const [supplyUsages, setSupplyUsages] = useState<SupplyUsage[]>([]);

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

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/seasons/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seasons"] });
    },
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
  const seasonTasks = allTasks?.filter(t => t.seasonId === selectedSeasonId) || [];

  // Open diary dialog before advancing
  const openAdvanceDialog = (season: Season) => {
    setPendingSeason(season);
    setDiaryContent("");
    setDiaryImages([]);
    setSupplyUsages([]);
    setDiaryOpen(true);
  };

  const addSupplyUsage = () => {
    setSupplyUsages(prev => [...prev, { supplyId: "", quantity: 0 }]);
  };

  const updateSupplyUsage = (index: number, field: keyof SupplyUsage, value: string | number) => {
    setSupplyUsages(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const removeSupplyUsage = (index: number) => {
    setSupplyUsages(prev => prev.filter((_, i) => i !== index));
  };

  // Actually advance stage + create work log
  const confirmAdvance = async () => {
    if (!pendingSeason) return;
    const idx = pendingSeason.currentStage ? stageIndex[pendingSeason.currentStage] : 0;
    const currentStageName = stages[idx]?.label || pendingSeason.currentStage;

    try {
      const sTasks = allTasks?.filter(t => t.seasonId === pendingSeason.id) || [];
      const currentStageKey = stages[idx]?.key;

      const currentStageTasks = sTasks.filter(t => t.stage === currentStageKey && t.status !== "done");
      for (const task of currentStageTasks) {
        await apiRequest("PATCH", `/api/tasks/${task.id}`, { status: "done" });
      }

      if (idx < 3) {
        const nextStage = stages[idx + 1].key as "preparation" | "planting" | "caring" | "harvesting";
        const progress = Math.min(100, (pendingSeason.progress || 0) + 15);
        await updateMutation.mutateAsync({ id: pendingSeason.id, data: { currentStage: nextStage, progress, status: "active" } });

        const nextStageTasks = sTasks.filter(t => t.stage === nextStage && t.status === "todo");
        for (const task of nextStageTasks) {
          await apiRequest("PATCH", `/api/tasks/${task.id}`, { status: "doing" });
        }
      } else {
        const remainingTasks = sTasks.filter(t => t.status !== "done");
        for (const task of remainingTasks) {
          await apiRequest("PATCH", `/api/tasks/${task.id}`, { status: "done" });
        }
        await updateMutation.mutateAsync({ id: pendingSeason.id, data: { status: "completed", progress: 100 } });
      }

      let logContent = diaryContent || `Hoàn thành giai đoạn: ${currentStageName} - ${pendingSeason.name}`;
      // Gom tất cả ảnh vào cùng 1 nhật ký
      for (const imgUrl of diaryImages) {
        logContent += `\n📷 Ảnh minh chứng: ${imgUrl}`;
      }
      const logData: Record<string, unknown> = {
        content: logContent,
        seasonId: pendingSeason.id,
        userId: user?.id || null,
        hoursWorked: null,
      };
      await apiRequest("POST", "/api/work-logs", logData);

      const validUsages = supplyUsages.filter(u => u.supplyId && u.quantity > 0);
      for (const usage of validUsages) {
        const supply = supplies?.find(s => s.id === usage.supplyId);
        await apiRequest("POST", "/api/supply-transactions", {
          supplyId: usage.supplyId,
          seasonId: pendingSeason.id,
          type: "export",
          quantity: usage.quantity,
          note: `Sử dụng cho giai đoạn ${currentStageName} - ${pendingSeason.name}`,
        });
        await apiRequest("POST", "/api/work-logs", {
          content: `📦 Sử dụng vật tư: ${supply?.name || ""} - ${usage.quantity} ${supply?.unit || ""}`,
          seasonId: pendingSeason.id,
          userId: user?.id || null,
          supplyId: usage.supplyId,
          supplyQuantity: usage.quantity,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/work-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-logs/season", selectedSeasonId] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/supplies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/supply-transactions"] });
      toast({ title: "Thành công", description: `Đã chuyển giai đoạn và ghi nhật ký${validUsages.length > 0 ? ` (đã trừ ${validUsages.length} vật tư)` : ""}` });
    } catch {
      toast({ title: "Lỗi", description: "Không thể cập nhật", variant: "destructive" });
    }

    setDiaryOpen(false);
    setPendingSeason(null);
  };

  const handleCompleteTask = async (task: Task) => {
    try {
      await taskUpdateMutation.mutateAsync({ id: task.id, data: { status: "done" } });
      toast({ title: "Thành công", description: `Đã hoàn thành: ${task.title}` });
    } catch {
      toast({ title: "Lỗi", description: "Không thể cập nhật", variant: "destructive" });
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
                    Công việc <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[11px]">{seasonTasks.length}</Badge>
                  </TabsTrigger>
                  <TabsTrigger
                    value="diary"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-2 pt-1 text-sm font-medium"
                  >
                    Nhật ký <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[11px]">{seasonWorkLogs?.length || 0}</Badge>
                  </TabsTrigger>
                </TabsList>

                {/* === CÔNG VIỆC TAB === */}
                <TabsContent value="tasks" className="space-y-3 mt-0">
                  {seasonTasks.length > 0 ? seasonTasks.map(task => {
                    const assignee = users?.find(u => u.id === task.assigneeId);
                    const stgCfg = stageBadgeConfig[task.stage || "planting"] || stageBadgeConfig.planting;

                    return (
                      <Card key={task.id} className="overflow-hidden hover:shadow-md transition-shadow">
                        <CardContent className="p-4 space-y-3">
                          {/* Task header */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1">
                              <h4 className="font-semibold text-sm">{task.title}</h4>
                              <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                                <Badge className={`${stgCfg.color} border-0 text-[11px] font-medium px-2 py-0`}>
                                  {stgCfg.label}
                                </Badge>
                                {task.dueDate && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" /> Dự kiến: {String(task.dueDate).split("T")[0]}
                                  </span>
                                )}
                                {task.completedAt && (
                                  <span className="flex items-center gap-1 text-emerald-600">
                                    <CheckCircle2 className="h-3 w-3" /> Hoàn thành: {String(task.completedAt).split("T")[0]}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Action button */}
                            {task.status === "done" ? (
                              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 border-0 text-xs shrink-0 gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Hoàn thành
                              </Badge>
                            ) : isFarmer && task.status !== "todo" ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-7 shrink-0 gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                onClick={() => handleCompleteTask(task)}
                                disabled={taskUpdateMutation.isPending}
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                {task.stage === "harvesting" ? "Chưa thực hiện" : "Hoàn thành"}
                              </Button>
                            ) : isFarmer && task.status === "todo" ? (
                              <Badge variant="outline" className="text-xs shrink-0 gap-1">
                                <Clock className="h-3 w-3" /> Chờ thực hiện
                              </Badge>
                            ) : null}
                          </div>

                          {/* Proof image */}
                          {task.proofImage && (
                            <div className="space-y-1.5">
                              <p className="text-xs font-medium text-muted-foreground">Ảnh minh chứng</p>
                              <img
                                src={task.proofImage}
                                alt="Ảnh minh chứng"
                                className="max-w-[280px] max-h-[160px] rounded-lg border object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            </div>
                          )}

                          {/* Description / notes */}
                          {task.description && (
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-muted-foreground">Ghi chú</p>
                              <p className="text-sm text-muted-foreground bg-muted/30 p-2.5 rounded-md">{task.description}</p>
                            </div>
                          )}

                          {/* Assignee */}
                          {assignee && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[9px] font-semibold text-primary shrink-0">
                                {assignee.fullName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                              </span>
                              {assignee.fullName}
                            </div>
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

                  {/* Advance stage button */}
                  {selectedSeason.status !== "completed" && isFarmer && (
                    <div className="pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openAdvanceDialog(selectedSeason)}
                        disabled={updateMutation.isPending}
                        data-testid={`button-advance-${selectedSeason.id}`}
                        className="w-full justify-center"
                      >
                        {(selectedSeason.currentStage ? stageIndex[selectedSeason.currentStage] : 0) < 3 ? (
                          <>Chuyển sang {stages[(selectedSeason.currentStage ? stageIndex[selectedSeason.currentStage] : 0) + 1].label} <ArrowRight className="ml-1 h-3 w-3" /></>
                        ) : (
                          <>Hoàn thành mùa vụ <CheckCircle2 className="ml-1 h-3 w-3" /></>
                        )}
                      </Button>
                    </div>
                  )}

                  {selectedSeason.status !== "completed" && !isFarmer && (
                    <p className="text-xs text-muted-foreground italic text-center pt-2">
                      Chỉ nông dân được giao mới có thể chuyển giai đoạn
                    </p>
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

        {/* Diary entry dialog when advancing stage */}
        <Dialog open={diaryOpen} onOpenChange={(o) => { setDiaryOpen(o); if (!o) setPendingSeason(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Ghi nhật ký giai đoạn
                {pendingSeason && ` - ${pendingSeason.name}`}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {pendingSeason && (
                <div className="p-3 bg-muted/30 rounded-md text-sm">
                  <p>Giai đoạn hiện tại: <strong>{stages[stageIndex[pendingSeason.currentStage || "planting"]]?.label}</strong></p>
                  <p className="text-muted-foreground">
                    {(stageIndex[pendingSeason.currentStage || "planting"] || 0) < 2
                      ? `→ Chuyển sang: ${stages[(stageIndex[pendingSeason.currentStage || "planting"] || 0) + 1]?.label}`
                      : "→ Hoàn thành mùa vụ"}
                  </p>
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="diary-content">Nội dung nhật ký</Label>
                <Textarea
                  id="diary-content"
                  placeholder="Mô tả công việc đã làm, kết quả, ghi chú..."
                  rows={4}
                  value={diaryContent}
                  onChange={(e) => setDiaryContent(e.target.value)}
                  data-testid="input-diary-content"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1">
                  <Image className="h-3.5 w-3.5" /> Ảnh minh chứng
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="diary-image"
                    placeholder="Dán URL ảnh..."
                    className="flex-1"
                    data-testid="input-diary-image"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = (e.target as HTMLInputElement).value.trim();
                        if (val) { setDiaryImages(prev => [...prev, val]); (e.target as HTMLInputElement).value = ''; }
                      }
                    }}
                  />
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-md text-xs font-medium cursor-pointer hover:bg-muted transition-colors shrink-0">
                    <Upload className="h-3.5 w-3.5" />
                    {uploadingDiaryImage ? "Đang tải..." : "Tải ảnh"}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleDiaryImageUpload}
                      disabled={uploadingDiaryImage}
                    />
                  </label>
                </div>
                {diaryImages.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {diaryImages.map((url, i) => (
                      <div key={i} className="relative inline-block">
                        <img
                          src={url}
                          alt={`Preview ${i + 1}`}
                          className="w-[80px] h-[60px] rounded-md border object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                        <button
                          type="button"
                          onClick={() => setDiaryImages(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full h-4 w-4 flex items-center justify-center text-[10px]"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Supply usage section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Vật tư sử dụng</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addSupplyUsage} className="h-7 text-xs">
                    <Plus className="mr-1 h-3 w-3" /> Thêm vật tư
                  </Button>
                </div>
                {supplyUsages.length > 0 ? (
                  <div className="space-y-2">
                    {supplyUsages.map((usage, index) => {
                      const selectedSupply = supplies?.find(s => s.id === usage.supplyId);
                      return (
                        <div key={index} className="flex items-center gap-2 p-2 rounded-md bg-muted/30">
                          <div className="flex-1">
                            <Select value={usage.supplyId} onValueChange={(v) => updateSupplyUsage(index, "supplyId", v)}>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Chọn vật tư..." />
                              </SelectTrigger>
                              <SelectContent>
                                {supplies?.filter(s => s.currentStock > 0).map(s => (
                                  <SelectItem key={s.id} value={s.id}>
                                    {s.name} (tồn: {s.currentStock} {s.unit})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="w-24">
                            <Input
                              type="number"
                              min={0}
                              max={selectedSupply?.currentStock || 999}
                              step={0.1}
                              placeholder="SL"
                              className="h-8 text-xs"
                              value={usage.quantity || ""}
                              onChange={(e) => updateSupplyUsage(index, "quantity", parseFloat(e.target.value) || 0)}
                            />
                          </div>
                          {selectedSupply && (
                            <span className="text-[10px] text-muted-foreground w-8">{selectedSupply.unit}</span>
                          )}
                          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => removeSupplyUsage(index)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Chưa có vật tư nào được chọn</p>
                )}
              </div>

              <Button
                className="w-full"
                onClick={confirmAdvance}
                disabled={updateMutation.isPending}
                data-testid="button-confirm-advance"
              >
                {updateMutation.isPending ? "Đang xử lý..." : "Xác nhận & Ghi nhật ký"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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

            // Split content for link rendering
            const contentParts = wl.content.split(urlPattern);

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
    </>
  );
}
