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
import { Plus, BookOpen, Clock, Package, Image, CheckCircle2, CalendarDays, Filter, X, Search, Upload, Link } from "lucide-react";
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
  const [selectedLog, setSelectedLog] = useState<WorkLog | null>(null);
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterSeason, setFilterSeason] = useState<string>("all");
  const [filterStage, setFilterStage] = useState<string>("all");
  const [filterUser, setFilterUser] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const { toast } = useToast();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingImage(true);
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
    setImageUrls(prev => [...prev, ...uploaded]);
    setUploadingImage(false);
    // Reset input
    e.target.value = "";
  };

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
    let content = fd.get("content") as string;
    // Append image URL from text input
    const manualUrl = (fd.get("imageUrl") as string || "").trim();
    const allImgUrls = manualUrl ? [manualUrl, ...imageUrls] : [...imageUrls];
    allImgUrls.forEach(url => {
      content += `\n📷 Ảnh minh chứng: ${url}`;
    });
    createMutation.mutate({
      content,
      taskId: fd.get("taskId") as string || null,
      seasonId: fd.get("seasonId") as string || null,
      userId: fd.get("userId") as string || null,
      hoursWorked: parseFloat(fd.get("hoursWorked") as string) || null,
      supplyId: fd.get("supplyId") as string || null,
      supplyQuantity: parseFloat(fd.get("supplyQuantity") as string) || null,
    });
    setImageUrls([]);
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
    <>
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
                <div className="space-y-1.5">
                  <Label>Ảnh minh chứng</Label>
                  <div className="flex gap-2">
                    <Input
                      name="imageUrl"
                      placeholder="Dán URL ảnh..."
                      className="flex-1"
                      data-testid="input-log-image-url"
                    />
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-md text-xs font-medium cursor-pointer hover:bg-muted transition-colors">
                      <Upload className="h-3.5 w-3.5" />
                      {uploadingImage ? "Đang tải..." : "Tải ảnh"}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                      />
                    </label>
                  </div>
                  {imageUrls.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {imageUrls.map((url, i) => (
                        <div key={i} className="relative inline-block">
                          <img
                            src={url}
                            alt={`Preview ${i + 1}`}
                            className="w-[80px] h-[60px] rounded-md border object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                          <button
                            type="button"
                            onClick={() => setImageUrls(prev => prev.filter((_, idx) => idx !== i))}
                            className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full h-4 w-4 flex items-center justify-center text-[10px]"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
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
        ) : filteredLogs && filteredLogs.length > 0 ? (() => {
          // Group logs by date
          const grouped: Record<string, typeof filteredLogs> = {};
          filteredLogs.forEach(log => {
            const dateKey = log.createdAt
              ? new Date(log.createdAt).toISOString().split("T")[0]
              : "unknown";
            if (!grouped[dateKey]) grouped[dateKey] = [];
            grouped[dateKey]!.push(log);
          });

          // Sort dates descending
          const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

          return (
            <div className="space-y-6">
              {sortedDates.map(dateKey => {
                const dateLogs = grouped[dateKey]!;
                const dateObj = dateKey !== "unknown" ? new Date(dateKey) : null;
                const formattedDate = dateObj
                  ? dateObj.toLocaleDateString("vi-VN", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "Không rõ ngày";

                return (
                  <Card key={dateKey} className="overflow-hidden">
                    <CardContent className="p-0">
                      {/* Date header */}
                      <div className="flex items-center gap-2.5 px-5 py-3 border-b bg-muted/20">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-semibold capitalize">{formattedDate}</span>
                      </div>

                      {/* Log entries */}
                      <div className="divide-y">
                        {dateLogs.map(log => {
                          const user = users?.find(u => u.id === log.userId);
                          const task = tasks?.find(t => t.id === log.taskId);
                          const season = seasons?.find(s => s.id === log.seasonId);
                          const supply = supplies?.find(s => s.id === log.supplyId);
                          const isCompletedTask = task?.status === "done";
                          const logTime = log.createdAt
                            ? new Date(log.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
                            : null;

                          // Determine title and description
                          const title = task ? task.title : log.content.split("\n")[0].replace(/^📷|^📦/, "").trim();
                          const description = task ? log.content : (log.content.split("\n").slice(1).join("\n").trim() || null);

                          // Stage badge
                          const stageBadgeConfig: Record<string, { label: string; color: string }> = {
                            planting: { label: "Gieo trồng", color: "border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300" },
                            caring: { label: "Chăm sóc", color: "border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300" },
                            harvesting: { label: "Thu hoạch", color: "border-orange-300 text-orange-700 dark:border-orange-700 dark:text-orange-300" },
                          };
                          const taskStage = task?.stage ? stageBadgeConfig[task.stage] : null;

                          return (
                            <div key={log.id} className="px-5 py-4 hover:bg-muted/10 transition-colors cursor-pointer" data-testid={`card-log-${log.id}`} onClick={() => setSelectedLog(log)}>
                              <div className="flex items-start gap-3">
                                {/* Icon */}
                                <div className="mt-0.5 shrink-0">
                                  <CheckCircle2 className={`h-5 w-5 ${isCompletedTask ? "text-emerald-500" : "text-emerald-400"}`} />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0 space-y-1.5">
                                  <p className="font-semibold text-sm">{title}</p>
                                  {logTime && (
                                    <p className="text-xs text-muted-foreground">{logTime}</p>
                                  )}
                                  {season && (
                                    <p className="text-xs">
                                      <span className="font-medium">Vụ mùa:</span>{" "}
                                      <span className="text-muted-foreground">
                                        {season.name}
                                        {season.startDate && season.endDate && ` (${new Date(season.startDate).toLocaleDateString("vi-VN", { month: "long" })} - ${new Date(season.endDate).toLocaleDateString("vi-VN", { month: "long" })})`}
                                      </span>
                                    </p>
                                  )}
                                  {user && (
                                    <p className="text-xs">
                                      <span className="font-medium">Người thực hiện:</span>{" "}
                                      <span className="text-muted-foreground">{user.fullName}</span>
                                    </p>
                                  )}
                                  {supply && (
                                    <p className="text-xs">
                                      <span className="font-medium">Vật tư:</span>{" "}
                                      <span className="text-muted-foreground">{supply.name}: {log.supplyQuantity} {supply.unit}</span>
                                    </p>
                                  )}
                                  {description && (
                                    <p className="text-xs text-muted-foreground italic leading-relaxed">{description}</p>
                                  )}

                                  {/* Proof image */}
                                  {task?.proofImage && (
                                    <img
                                      src={task.proofImage}
                                      alt="Ảnh minh chứng"
                                      className="max-w-[200px] max-h-[120px] rounded-md border object-cover mt-1"
                                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                    />
                                  )}
                                </div>

                                {/* Stage badge */}
                                {taskStage && (
                                  <Badge variant="outline" className={`shrink-0 text-xs font-medium px-3 py-1 ${taskStage.color}`}>
                                    {taskStage.label}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          );
        })() : (
          <div className="text-center py-16">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Chưa có nhật ký nào</p>
          </div>
        )}
      </div>
    </ScrollArea>

      {/* Detail dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(o) => { if (!o) setSelectedLog(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="sr-only">Chi tiết nhật ký</DialogTitle></DialogHeader>
          {selectedLog && (() => {
            const task = tasks?.find(t => t.id === selectedLog.taskId);
            const season = seasons?.find(s => s.id === selectedLog.seasonId);
            const user = users?.find(u => u.id === selectedLog.userId);
            const supply = supplies?.find(s => s.id === selectedLog.supplyId);
            const logDate = selectedLog.createdAt ? new Date(selectedLog.createdAt) : null;
            const title = task ? task.title : selectedLog.content.split("\n")[0].replace(/^📷|^📦/, "").trim();
            const isCompleted = task?.status === "done";

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
                    {isCompleted ? "Hoàn thành" : task?.status === "doing" ? "Đang thực hiện" : task?.status || "Ghi nhận"}
                  </Badge>
                </div>

                {/* Season */}
                {season && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Vụ mùa</p>
                    <p className="text-sm font-medium">
                      {season.name}
                      {season.startDate && season.endDate && (
                        <span className="text-muted-foreground font-normal"> ({new Date(season.startDate).toLocaleDateString("vi-VN", { month: "long" })} - {new Date(season.endDate).toLocaleDateString("vi-VN", { month: "long" })})</span>
                      )}
                    </p>
                  </div>
                )}

                {/* Stage */}
                {task?.stage && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Giai đoạn</p>
                    <p className="text-sm font-medium">{stageLabels[task.stage] || task.stage}</p>
                  </div>
                )}

                {/* User */}
                {user && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Người thực hiện</p>
                    <p className="text-sm font-medium">{user.fullName}</p>
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

                {/* Log content / growth notes */}
                {selectedLog.content && (() => {
                  // Strip image proof lines from displayed text
                  const cleanContent = selectedLog.content
                    .split("\n")
                    .filter(line => !line.match(/^📷\s*Ảnh minh chứng/))
                    .join("\n")
                    .trim();
                  if (!cleanContent) return null;

                  // Parse URLs for clickable links (non-image URLs only)
                  const urlRegex = /(https?:\/\/\S+)/g;
                  const parts = cleanContent.split(urlRegex);
                  
                  return (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ghi chú sinh trưởng</p>
                      <div className="text-sm leading-relaxed">
                        {parts.map((part, i) => 
                          urlRegex.test(part) ? (
                            <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">{part}</a>
                          ) : (
                            <span key={i}>{part}</span>
                          )
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Supply usage */}
                {supply && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Vật tư sử dụng</p>
                    <p className="text-sm">{supply.name}: <span className="font-medium">{selectedLog.supplyQuantity} {supply.unit}</span></p>
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

                {/* Proof images - from task + extracted from content */}
                {(() => {
                  const urlRegex2 = /(https?:\/\/\S+|\/media\/\S+)/g;
                  const contentUrls2 = selectedLog.content.match(urlRegex2) || [];
                  const imageExtRegex2 = /\.(jpg|jpeg|png|gif|webp|bmp)/i;
                  const contentImages = contentUrls2.filter(u => imageExtRegex2.test(u));
                  const allImages = [
                    ...(task?.proofImage ? [task.proofImage] : []),
                    ...contentImages,
                  ];
                  // Deduplicate
                  const uniqueImages = Array.from(new Set(allImages));
                  if (uniqueImages.length === 0) return null;
                  return (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ảnh minh chứng ({uniqueImages.length})</p>
                      <div className="flex gap-2 flex-wrap">
                        {uniqueImages.map((url, i) => (
                          <img
                            key={i}
                            src={url}
                            alt={`Ảnh minh chứng ${i + 1}`}
                            className="max-w-[160px] max-h-[120px] rounded-lg border object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Close button */}
                <div className="flex justify-end pt-2">
                  <Button variant="outline" onClick={() => setSelectedLog(null)}>Đóng</Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
}
