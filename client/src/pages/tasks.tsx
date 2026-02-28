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
import {
  Plus, ClipboardList, CheckCircle2, Clock, AlertTriangle,
  Play, MoreVertical, Pencil, Trash2, Camera, Image, Weight,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
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
  planting: "Gieo trồng",
  caring: "Chăm bón",
  harvesting: "Thu hoạch",
};

export default function Tasks() {
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completeTaskId, setCompleteTaskId] = useState<string | null>(null);
  const [proofUrl, setProofUrl] = useState("");
  const [harvestYield, setHarvestYield] = useState("");
  const [tab, setTab] = useState("all");
  const [filterSeason, setFilterSeason] = useState<string>("all");
  const [filterCrop, setFilterCrop] = useState<string>("all");
  const { toast } = useToast();
  const { isManager, isFarmer, user: authUser } = useAuth();

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
    if (tab !== "all" && t.status !== tab) return false;
    if (filterSeason !== "all" && t.seasonId !== filterSeason) return false;
    if (filterCrop !== "all") {
      const season = seasons?.find(s => s.id === t.seasonId);
      if (!season || season.cropId !== filterCrop) return false;
    }
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

  const handleComplete = async () => {
    if (!completeTaskId) return;
    const completeTask = tasks?.find(t => t.id === completeTaskId);
    const completeData: Record<string, unknown> = {
      status: "done",
      proofImage: proofUrl || null,
    };
    // Add harvestYield for harvest tasks
    if (completeTask?.stage === "harvesting" && harvestYield) {
      completeData.harvestYield = parseFloat(harvestYield);
    }

    try {
      await apiRequest("PATCH", `/api/tasks/${completeTaskId}`, completeData);

      // Auto-create work log entry
      const logContent = completeTask
        ? `Hoàn thành: ${completeTask.title}${completeTask.stage === "harvesting" && harvestYield ? ` - Sản lượng: ${harvestYield} tấn` : ""}`
        : "Hoàn thành công việc";

      await apiRequest("POST", "/api/work-logs", {
        content: logContent,
        taskId: completeTaskId,
        seasonId: completeTask?.seasonId || null,
        userId: authUser?.id || null,
        hoursWorked: null,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-logs"] });
      setCompleteOpen(false);
      setCompleteTaskId(null);
      setProofUrl("");
      setHarvestYield("");
      toast({ title: "Cập nhật thành công", description: "Công việc đã được hoàn thành và ghi nhật ký" });
    } catch (error: any) {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    }
  };

  const openEdit = (task: Task) => {
    setEditTask(task);
    setEditOpen(true);
  };

  const openComplete = (taskId: string) => {
    setCompleteTaskId(taskId);
    setProofUrl("");
    setHarvestYield("");
    setCompleteOpen(true);
  };

  const completeTask = tasks?.find(t => t.id === completeTaskId);
  const isHarvestTask = completeTask?.stage === "harvesting";

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
                        <SelectItem value="planting">Gieo trồng</SelectItem>
                        <SelectItem value="caring">Chăm bón</SelectItem>
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

        {/* Filter bar */}
        <div className="flex gap-3 flex-wrap">
          <Select value={filterSeason} onValueChange={setFilterSeason}>
            <SelectTrigger className="w-[180px]" data-testid="filter-task-season">
              <SelectValue placeholder="Mùa vụ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả mùa vụ</SelectItem>
              {seasons?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterCrop} onValueChange={setFilterCrop}>
            <SelectTrigger className="w-[180px]" data-testid="filter-task-crop">
              <SelectValue placeholder="Cây trồng" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả cây trồng</SelectItem>
              {crops?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
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
                              {task.status !== "doing" && (
                                <DropdownMenuItem onClick={() => updateMutation.mutate({ id: task.id, data: { status: "doing" } })}>
                                  Bắt đầu làm
                                </DropdownMenuItem>
                              )}
                              {/* Only farmer can mark done */}
                              {isFarmer && task.status !== "done" && (
                                <DropdownMenuItem onClick={() => openComplete(task.id)}>
                                  <Camera className="mr-1 h-3.5 w-3.5" /> Hoàn thành
                                </DropdownMenuItem>
                              )}
                              {task.status === "done" && (
                                <DropdownMenuItem onClick={() => updateMutation.mutate({ id: task.id, data: { status: "todo" } })}>
                                  Mở lại
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
                      <SelectItem value="planting">Gieo trồng</SelectItem>
                      <SelectItem value="caring">Chăm bón</SelectItem>
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

      {/* Complete with proof dialog */}
      <Dialog open={completeOpen} onOpenChange={(o) => { setCompleteOpen(o); if (!o) { setCompleteTaskId(null); setProofUrl(""); setHarvestYield(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hoàn thành công việc</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Bạn có thể đính kèm link ảnh minh chứng (không bắt buộc).
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="proofUrl">Link ảnh minh chứng</Label>
              <Input
                id="proofUrl"
                value={proofUrl}
                onChange={(e) => setProofUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                data-testid="input-proof-url"
              />
            </div>
            {/* Harvest yield input - only for harvesting tasks */}
            {isHarvestTask && (
              <div className="space-y-1.5">
                <Label htmlFor="harvestYield" className="flex items-center gap-1">
                  <Weight className="h-3.5 w-3.5" /> Sản lượng thu hoạch (tấn)
                </Label>
                <Input
                  id="harvestYield"
                  type="number"
                  step="0.1"
                  value={harvestYield}
                  onChange={(e) => setHarvestYield(e.target.value)}
                  placeholder="VD: 5.5"
                  data-testid="input-harvest-yield"
                />
                <p className="text-xs text-muted-foreground">Nhập sản lượng thực tế thu hoạch được</p>
              </div>
            )}
            <Button onClick={handleComplete} className="w-full" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Đang lưu..." : "Xác nhận hoàn thành"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ScrollArea>
  );
}
