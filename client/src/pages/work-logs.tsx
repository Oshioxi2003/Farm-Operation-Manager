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
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, BookOpen, Clock, Package, Image, CheckCircle2, CalendarDays, Filter, X, Search } from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { WorkLog, Season, Task, User, Supply } from "@shared/schema";

const stageLabels: Record<string, string> = {
  planting: "Gieo trồng",
  caring: "Chăm bón",
  harvesting: "Thu hoạch",
};

export default function WorkLogs() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterSeason, setFilterSeason] = useState<string>("all");
  const [filterStage, setFilterStage] = useState<string>("all");
  const [filterUser, setFilterUser] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const { toast } = useToast();

  // Đếm số bộ lọc đang áp dụng
  const activeFilterCount = [
    filterSeason, filterStage, filterUser,
  ].filter(v => v !== "all").length
    + (filterDateFrom ? 1 : 0)
    + (filterDateTo ? 1 : 0);

  const clearAllFilters = () => {
    setFilterSeason("all");
    setFilterStage("all");
    setFilterUser("all");
    setFilterDateFrom("");
    setFilterDateTo("");
  };

  const { data: logs, isLoading } = useQuery<WorkLog[]>({ queryKey: ["/api/work-logs"] });
  const { data: seasons } = useQuery<Season[]>({ queryKey: ["/api/seasons"] });
  const { data: tasks } = useQuery<Task[]>({ queryKey: ["/api/tasks"] });
  const { data: users } = useQuery<User[]>({ queryKey: ["/api/users"] });
  const { data: supplies } = useQuery<Supply[]>({ queryKey: ["/api/supplies"] });

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/work-logs", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-logs"] });
      setOpen(false);
      toast({ title: "Thành công", description: "Đã ghi nhật ký" });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createMutation.mutate({
      content: fd.get("content") as string,
      taskId: fd.get("taskId") as string || null,
      seasonId: fd.get("seasonId") as string || null,
      userId: fd.get("userId") as string || null,
      hoursWorked: parseFloat(fd.get("hoursWorked") as string) || null,
      supplyId: fd.get("supplyId") as string || null,
      supplyQuantity: parseFloat(fd.get("supplyQuantity") as string) || null,
    });
  };

  // Filter logs
  const filteredLogs = logs?.filter(log => {
    // Lọc theo tìm kiếm text
    if (search) {
      const q = search.toLowerCase();
      const user = users?.find(u => u.id === log.userId);
      const task = tasks?.find(t => t.id === log.taskId);
      const season = seasons?.find(s => s.id === log.seasonId);
      const matchesContent = log.content.toLowerCase().includes(q);
      const matchesUser = user?.fullName.toLowerCase().includes(q);
      const matchesTask = task?.title.toLowerCase().includes(q);
      const matchesSeason = season?.name.toLowerCase().includes(q);
      if (!matchesContent && !matchesUser && !matchesTask && !matchesSeason) return false;
    }

    // Filter by season
    if (filterSeason !== "all" && log.seasonId !== filterSeason) return false;

    // Filter by stage (via linked task)
    if (filterStage !== "all") {
      const task = tasks?.find(t => t.id === log.taskId);
      if (!task || task.stage !== filterStage) return false;
    }

    // Filter by user
    if (filterUser !== "all" && log.userId !== filterUser) return false;

    // Filter by date range
    if (filterDateFrom || filterDateTo) {
      const logDate = log.createdAt ? new Date(log.createdAt).toISOString().split("T")[0] : null;
      if (!logDate) return false;
      if (filterDateFrom && logDate < filterDateFrom) return false;
      if (filterDateTo && logDate > filterDateTo) return false;
    }

    return true;
  });

  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Nhật ký sản xuất</h1>
            <p className="text-sm text-muted-foreground mt-1">Ghi chép hoạt động sản xuất hằng ngày</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-log"><Plus className="mr-1 h-4 w-4" /> Ghi nhật ký</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Ghi nhật ký mới</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="content">Nội dung *</Label>
                  <Textarea id="content" name="content" required rows={4} data-testid="input-log-content" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Mùa vụ</Label>
                    <Select name="seasonId">
                      <SelectTrigger data-testid="select-log-season"><SelectValue placeholder="Chọn" /></SelectTrigger>
                      <SelectContent>
                        {seasons?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Công việc</Label>
                    <Select name="taskId">
                      <SelectTrigger data-testid="select-log-task"><SelectValue placeholder="Chọn" /></SelectTrigger>
                      <SelectContent>
                        {tasks?.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Người thực hiện</Label>
                    <Select name="userId">
                      <SelectTrigger data-testid="select-log-user"><SelectValue placeholder="Chọn" /></SelectTrigger>
                      <SelectContent>
                        {users?.map(u => <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="hoursWorked">Số giờ làm</Label>
                    <Input id="hoursWorked" name="hoursWorked" type="number" step="0.5" data-testid="input-log-hours" />
                  </div>
                </div>
                {/* Supply usage section */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Vật tư sử dụng</Label>
                    <Select name="supplyId">
                      <SelectTrigger data-testid="select-log-supply"><SelectValue placeholder="Chọn vật tư" /></SelectTrigger>
                      <SelectContent>
                        {supplies?.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name} ({s.currentStock} {s.unit})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="supplyQuantity">Số lượng sử dụng</Label>
                    <Input id="supplyQuantity" name="supplyQuantity" type="number" step="0.1" data-testid="input-log-supply-qty" />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-log">
                  {createMutation.isPending ? "Đang lưu..." : "Lưu nhật ký"}
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
              placeholder="Tìm kiếm nhật ký..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search-logs"
            />
          </div>

          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="relative shrink-0"
                data-testid="button-filter-logs"
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
                    <SelectTrigger className="h-8 text-xs" data-testid="filter-log-season">
                      <SelectValue placeholder="Tất cả" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả mùa vụ</SelectItem>
                      {seasons?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Giai đoạn */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Giai đoạn</Label>
                  <Select value={filterStage} onValueChange={setFilterStage}>
                    <SelectTrigger className="h-8 text-xs" data-testid="filter-log-stage">
                      <SelectValue placeholder="Tất cả" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả giai đoạn</SelectItem>
                      <SelectItem value="planting">Gieo trồng</SelectItem>
                      <SelectItem value="caring">Chăm bón</SelectItem>
                      <SelectItem value="harvesting">Thu hoạch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Người thực hiện */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Người thực hiện</Label>
                  <Select value={filterUser} onValueChange={setFilterUser}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Tất cả" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      {users?.map(u => <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>)}
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
                      data-testid="filter-log-from"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Đến ngày</Label>
                    <Input
                      type="date"
                      value={filterDateTo}
                      onChange={(e) => setFilterDateTo(e.target.value)}
                      className="h-8 text-xs"
                      data-testid="filter-log-to"
                    />
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Badge bộ lọc */}
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
              {filterStage !== "all" && (
                <Badge variant="secondary" className="text-xs gap-1 pl-2 pr-1 py-0.5">
                  {stageLabels[filterStage]}
                  <button onClick={() => setFilterStage("all")} className="ml-0.5 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filterUser !== "all" && (
                <Badge variant="secondary" className="text-xs gap-1 pl-2 pr-1 py-0.5">
                  {users?.find(u => u.id === filterUser)?.fullName || "Người dùng"}
                  <button onClick={() => setFilterUser("all")} className="ml-0.5 hover:text-destructive">
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
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : filteredLogs && filteredLogs.length > 0 ? (
          <div className="space-y-3">
            {filteredLogs.map((log) => {
              const user = users?.find(u => u.id === log.userId);
              const task = tasks?.find(t => t.id === log.taskId);
              const season = seasons?.find(s => s.id === log.seasonId);
              const supply = supplies?.find(s => s.id === log.supplyId);
              const isCompletedTask = task?.status === "done";
              return (
                <Card key={log.id} data-testid={`card-log-${log.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${isCompletedTask ? 'bg-chart-2/10' : 'bg-chart-4/10'}`}>
                        {isCompletedTask ? (
                          <CheckCircle2 className="h-4 w-4 text-chart-2" />
                        ) : (
                          <BookOpen className="h-4 w-4 text-chart-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{log.content}</p>

                        {/* Show task details for completed tasks */}
                        {task && isCompletedTask && (
                          <div className="mt-2 p-2 bg-chart-2/5 rounded-md border border-chart-2/10 space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-[10px] bg-chart-2/10 text-chart-2 no-default-active-elevate">
                                <CheckCircle2 className="mr-0.5 h-2.5 w-2.5" /> Hoàn thành
                              </Badge>
                              {task.stage && (
                                <Badge variant="outline" className="text-[10px] no-default-active-elevate">
                                  {stageLabels[task.stage] || task.stage}
                                </Badge>
                              )}
                              {task.completedAt && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                  <CalendarDays className="h-2.5 w-2.5" />
                                  {new Date(task.completedAt).toLocaleString("vi-VN")}
                                </span>
                              )}
                            </div>
                            {task.description && (
                              <p className="text-xs text-muted-foreground">{task.description}</p>
                            )}
                            {task.proofImage && (
                              <div className="mt-1">
                                <a href={task.proofImage} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                                  <Image className="h-3 w-3" /> Xem ảnh minh chứng
                                </a>
                                <div className="mt-1">
                                  <img
                                    src={task.proofImage}
                                    alt="Ảnh minh chứng"
                                    className="max-w-[200px] max-h-[120px] rounded-md border object-cover"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                  />
                                </div>
                              </div>
                            )}
                            {(task as any).harvestYield && (
                              <p className="text-xs font-medium text-chart-2">
                                Sản lượng thu hoạch: {(task as any).harvestYield} tấn
                              </p>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2 flex-wrap">
                          {user && <span>{user.fullName}</span>}
                          {task && !isCompletedTask && <span>CV: {task.title}</span>}
                          {season && <span>{season.name}</span>}
                          {log.hoursWorked && (
                            <span className="flex items-center gap-0.5">
                              <Clock className="h-3 w-3" /> {log.hoursWorked}h
                            </span>
                          )}
                          {supply && (
                            <span className="flex items-center gap-0.5">
                              <Package className="h-3 w-3" /> {supply.name}: {log.supplyQuantity} {supply.unit}
                            </span>
                          )}
                          {log.createdAt && (
                            <span>{new Date(log.createdAt).toLocaleDateString("vi-VN")}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Chưa có nhật ký nào</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
