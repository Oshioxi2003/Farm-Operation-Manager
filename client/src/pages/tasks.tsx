import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, ClipboardList, CheckCircle2, Clock, AlertTriangle,
  Play, MoreVertical,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Task, Season, User } from "@shared/schema";

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  todo: { label: "Cho lam", color: "bg-muted/50 text-muted-foreground", icon: Clock },
  doing: { label: "Dang lam", color: "bg-chart-1/15 text-chart-1", icon: Play },
  done: { label: "Hoan thanh", color: "bg-chart-2/15 text-chart-2", icon: CheckCircle2 },
  overdue: { label: "Qua han", color: "bg-destructive/15 text-destructive", icon: AlertTriangle },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  high: { label: "Cao", color: "bg-destructive/15 text-destructive" },
  medium: { label: "TB", color: "bg-chart-3/15 text-chart-3" },
  low: { label: "Thap", color: "bg-muted text-muted-foreground" },
};

export default function Tasks() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("all");
  const { toast } = useToast();

  const { data: tasks, isLoading } = useQuery<Task[]>({ queryKey: ["/api/tasks"] });
  const { data: seasons } = useQuery<Season[]>({ queryKey: ["/api/seasons"] });
  const { data: users } = useQuery<User[]>({ queryKey: ["/api/users"] });

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/tasks", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setOpen(false);
      toast({ title: "Thanh cong", description: "Da tao cong viec moi" });
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
      toast({ title: "Cap nhat thanh cong" });
    },
  });

  const filteredTasks = tab === "all" ? tasks : tasks?.filter(t => t.status === tab);

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
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Cong viec</h1>
            <p className="text-sm text-muted-foreground mt-1">Quan ly va phan cong cong viec</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-task"><Plus className="mr-1 h-4 w-4" /> Them viec</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Them cong viec moi</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="title">Tieu de *</Label>
                  <Input id="title" name="title" required data-testid="input-task-title" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="description">Mo ta</Label>
                  <Textarea id="description" name="description" data-testid="input-task-description" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Mua vu</Label>
                    <Select name="seasonId">
                      <SelectTrigger data-testid="select-task-season"><SelectValue placeholder="Chon" /></SelectTrigger>
                      <SelectContent>
                        {seasons?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Phan cong</Label>
                    <Select name="assigneeId">
                      <SelectTrigger data-testid="select-task-assignee"><SelectValue placeholder="Chon" /></SelectTrigger>
                      <SelectContent>
                        {users?.map(u => <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label>Uu tien</Label>
                    <Select name="priority" defaultValue="medium">
                      <SelectTrigger data-testid="select-task-priority"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Thap</SelectItem>
                        <SelectItem value="medium">Trung binh</SelectItem>
                        <SelectItem value="high">Cao</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Giai doan</Label>
                    <Select name="stage">
                      <SelectTrigger data-testid="select-task-stage"><SelectValue placeholder="Chon" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planting">Gieo trong</SelectItem>
                        <SelectItem value="caring">Cham bon</SelectItem>
                        <SelectItem value="harvesting">Thu hoach</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dueDate">Han</Label>
                    <Input id="dueDate" name="dueDate" type="date" data-testid="input-task-due" />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-task">
                  {createMutation.isPending ? "Dang luu..." : "Tao cong viec"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList data-testid="tabs-task-status">
            <TabsTrigger value="all">Tat ca ({counts.all})</TabsTrigger>
            <TabsTrigger value="todo">Cho lam ({counts.todo})</TabsTrigger>
            <TabsTrigger value="doing">Dang lam ({counts.doing})</TabsTrigger>
            <TabsTrigger value="done">Xong ({counts.done})</TabsTrigger>
            <TabsTrigger value="overdue">Qua han ({counts.overdue})</TabsTrigger>
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
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                              {assignee && <span>{assignee.fullName}</span>}
                              {season && <span>{season.name}</span>}
                              {task.dueDate && <span>Han: {task.dueDate}</span>}
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
                                  Bat dau lam
                                </DropdownMenuItem>
                              )}
                              {task.status !== "done" && (
                                <DropdownMenuItem onClick={() => updateMutation.mutate({ id: task.id, data: { status: "done" } })}>
                                  Danh dau hoan thanh
                                </DropdownMenuItem>
                              )}
                              {task.status === "done" && (
                                <DropdownMenuItem onClick={() => updateMutation.mutate({ id: task.id, data: { status: "todo" } })}>
                                  Mo lai
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
                <p className="text-muted-foreground">Khong co cong viec</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  );
}
