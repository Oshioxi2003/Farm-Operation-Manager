import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, BookOpen, Clock } from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { WorkLog, Season, Task, User } from "@shared/schema";

export default function WorkLogs() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { data: logs, isLoading } = useQuery<WorkLog[]>({ queryKey: ["/api/work-logs"] });
  const { data: seasons } = useQuery<Season[]>({ queryKey: ["/api/seasons"] });
  const { data: tasks } = useQuery<Task[]>({ queryKey: ["/api/tasks"] });
  const { data: users } = useQuery<User[]>({ queryKey: ["/api/users"] });

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
    });
  };

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
                <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-log">
                  {createMutation.isPending ? "Đang lưu..." : "Lưu nhật ký"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : logs && logs.length > 0 ? (
          <div className="space-y-3">
            {logs.map((log) => {
              const user = users?.find(u => u.id === log.userId);
              const task = tasks?.find(t => t.id === log.taskId);
              const season = seasons?.find(s => s.id === log.seasonId);
              return (
                <Card key={log.id} data-testid={`card-log-${log.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-chart-4/10">
                        <BookOpen className="h-4 w-4 text-chart-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{log.content}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2 flex-wrap">
                          {user && <span>{user.fullName}</span>}
                          {task && <span>CV: {task.title}</span>}
                          {season && <span>{season.name}</span>}
                          {log.hoursWorked && (
                            <span className="flex items-center gap-0.5">
                              <Clock className="h-3 w-3" /> {log.hoursWorked}h
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
