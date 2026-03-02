import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Plus, Users, Phone, KeyRound, Lock, Unlock,
  ClipboardList, BookOpen, CheckCircle2, Clock, AlertTriangle, Circle,
} from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User, Task, WorkLog, Season } from "@shared/schema";

const roleLabels: Record<string, string> = {
  manager: "Quản lý",
  farmer: "Nông dân",
};

const statusLabels: Record<string, string> = {
  todo: "Chờ làm",
  doing: "Đang làm",
  done: "Hoàn thành",
  overdue: "Quá hạn",
};

const statusIcons: Record<string, React.ReactNode> = {
  todo: <Circle className="h-3.5 w-3.5 text-muted-foreground" />,
  doing: <Clock className="h-3.5 w-3.5 text-chart-1" />,
  done: <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />,
  overdue: <AlertTriangle className="h-3.5 w-3.5 text-destructive" />,
};

function UserDetailDialog({ user, onChangePassword, onToggleLock, isUpdating }: {
  user: User;
  onChangePassword: (userId: string) => void;
  onToggleLock: (user: User) => void;
  isUpdating: boolean;
}) {
  const [open, setOpen] = useState(false);

  const { data: allTasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    enabled: open,
  });

  const { data: allWorkLogs } = useQuery<WorkLog[]>({
    queryKey: ["/api/work-logs"],
    enabled: open,
  });

  const { data: allSeasons } = useQuery<Season[]>({
    queryKey: ["/api/seasons"],
    enabled: open,
  });

  const userTasks = allTasks?.filter((t) => t.assigneeId === user.id) || [];
  const userWorkLogs = allWorkLogs?.filter((l) => l.userId === user.id) || [];

  const seasonMap = new Map<string, string>();
  allSeasons?.forEach((s) => seasonMap.set(s.id, s.name as string));

  const taskStats = {
    total: userTasks.length,
    done: userTasks.filter((t) => t.status === "done").length,
    doing: userTasks.filter((t) => t.status === "doing").length,
    overdue: userTasks.filter((t) => t.status === "overdue").length,
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Card
          className="hover-elevate cursor-pointer transition-all hover:ring-2 hover:ring-primary/20"
          data-testid={`card-user-${user.id}`}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-medium ${user.isLocked ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
                {user.isLocked ? (
                  <Lock className="h-5 w-5" />
                ) : (
                  user.fullName.split(" ").map(w => w[0]).slice(-2).join("").toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-medium truncate ${user.isLocked ? "line-through text-muted-foreground" : ""}`}>{user.fullName}</p>
                <p className="text-sm text-muted-foreground">@{user.username}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge
                    variant={user.role === "manager" ? "default" : "secondary"}
                    className="text-xs no-default-active-elevate"
                  >
                    {roleLabels[user.role]}
                  </Badge>
                  {user.isLocked && (
                    <Badge variant="destructive" className="text-xs no-default-active-elevate">
                      Đã khóa
                    </Badge>
                  )}
                  {user.phone && (
                    <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                      <Phone className="h-3 w-3" /> {user.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Chi tiết người dùng</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-5 pb-2">
            {/* ── Profile Section ── */}
            <div className="flex items-center gap-4">
              <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-lg font-semibold ${user.isLocked ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                {user.isLocked ? (
                  <Lock className="h-7 w-7" />
                ) : (
                  user.fullName.split(" ").map(w => w[0]).slice(-2).join("").toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`text-lg font-semibold ${user.isLocked ? "line-through text-muted-foreground" : ""}`}>
                  {user.fullName}
                </h3>
                <p className="text-sm text-muted-foreground">@{user.username}</p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <Badge variant={user.role === "manager" ? "default" : "secondary"}>
                    {roleLabels[user.role]}
                  </Badge>
                  {user.isLocked && <Badge variant="destructive">Đã khóa</Badge>}
                </div>
              </div>
            </div>

            {/* Phone info */}
            {user.phone && (
              <div className="flex items-center gap-2 text-sm bg-muted/50 rounded-lg px-3 py-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{user.phone}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-9"
                onClick={() => { setOpen(false); setTimeout(() => onChangePassword(user.id), 150); }}
                data-testid={`button-detail-change-pw-${user.id}`}
              >
                <KeyRound className="mr-1.5 h-3.5 w-3.5" /> Đổi mật khẩu
              </Button>
              <Button
                size="sm"
                variant={user.isLocked ? "default" : "destructive"}
                className="flex-1 h-9"
                onClick={() => onToggleLock(user)}
                disabled={isUpdating}
                data-testid={`button-detail-lock-${user.id}`}
              >
                {user.isLocked ? (
                  <><Unlock className="mr-1.5 h-3.5 w-3.5" /> Mở khóa</>
                ) : (
                  <><Lock className="mr-1.5 h-3.5 w-3.5" /> Khóa TK</>
                )}
              </Button>
            </div>

            <Separator />

            {/* ── Task Stats ── */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ClipboardList className="h-4 w-4 text-primary" />
                <h4 className="font-semibold text-sm">Công việc được giao</h4>
                <Badge variant="outline" className="ml-auto text-xs">{taskStats.total}</Badge>
              </div>

              {taskStats.total > 0 ? (
                <>
                  {/* Summary chips */}
                  <div className="flex gap-2 mb-3 flex-wrap">
                    {taskStats.done > 0 && (
                      <div className="flex items-center gap-1 text-xs bg-green-500/10 text-green-600 rounded-full px-2.5 py-1">
                        <CheckCircle2 className="h-3 w-3" /> {taskStats.done} hoàn thành
                      </div>
                    )}
                    {taskStats.doing > 0 && (
                      <div className="flex items-center gap-1 text-xs bg-chart-1/10 text-chart-1 rounded-full px-2.5 py-1">
                        <Clock className="h-3 w-3" /> {taskStats.doing} đang làm
                      </div>
                    )}
                    {taskStats.overdue > 0 && (
                      <div className="flex items-center gap-1 text-xs bg-destructive/10 text-destructive rounded-full px-2.5 py-1">
                        <AlertTriangle className="h-3 w-3" /> {taskStats.overdue} quá hạn
                      </div>
                    )}
                  </div>

                  {/* Task list (latest 5) */}
                  <div className="space-y-1.5">
                    {userTasks.slice(0, 5).map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center gap-2 text-sm bg-muted/40 rounded-md px-3 py-2"
                      >
                        {statusIcons[task.status]}
                        <span className="flex-1 truncate">{task.title}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {statusLabels[task.status]}
                        </span>
                      </div>
                    ))}
                    {userTasks.length > 5 && (
                      <p className="text-xs text-muted-foreground text-center pt-1">
                        ... và {userTasks.length - 5} công việc khác
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-3">
                  Chưa có công việc nào được giao
                </p>
              )}
            </div>

            <Separator />

            {/* ── Work Logs ── */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="h-4 w-4 text-primary" />
                <h4 className="font-semibold text-sm">Nhật ký hoạt động</h4>
                <Badge variant="outline" className="ml-auto text-xs">{userWorkLogs.length}</Badge>
              </div>

              {userWorkLogs.length > 0 ? (
                <div className="space-y-1.5">
                  {userWorkLogs.slice(0, 5).map((log) => (
                    <div
                      key={log.id}
                      className="text-sm bg-muted/40 rounded-md px-3 py-2"
                    >
                      <p className="truncate">{log.content}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        {log.createdAt && (
                          <span>{new Date(log.createdAt).toLocaleDateString("vi-VN")}</span>
                        )}
                        {log.seasonId && seasonMap.get(log.seasonId) && (
                          <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                            {seasonMap.get(log.seasonId)}
                          </Badge>
                        )}
                        {log.hoursWorked != null && (
                          <span>{log.hoursWorked}h</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {userWorkLogs.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center pt-1">
                      ... và {userWorkLogs.length - 5} nhật ký khác
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-3">
                  Chưa có nhật ký nào
                </p>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export default function UsersPage() {
  const [open, setOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [pwUserId, setPwUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const { toast } = useToast();

  const { data: users, isLoading } = useQuery<User[]>({ queryKey: ["/api/users"] });

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/users", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setOpen(false);
      toast({ title: "Thành công", description: "Đã thêm người dùng" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/users/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setPwOpen(false);
      setPwUserId(null);
      setNewPassword("");
      toast({ title: "Thành công", description: "Đã cập nhật" });
    },
    onError: (error: Error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createMutation.mutate({
      username: fd.get("username") as string,
      password: fd.get("password") as string,
      fullName: fd.get("fullName") as string,
      role: fd.get("role") as string,
      phone: fd.get("phone") as string,
    });
  };

  const handleChangePassword = () => {
    if (!pwUserId || !newPassword) return;
    updateMutation.mutate({ id: pwUserId, data: { password: newPassword } });
  };

  const toggleLock = (user: User) => {
    updateMutation.mutate({ id: user.id, data: { isLocked: !user.isLocked } });
  };

  const openChangePw = (userId: string) => {
    setPwUserId(userId);
    setNewPassword("");
    setPwOpen(true);
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Người dùng & Phân quyền</h1>
            <p className="text-sm text-muted-foreground mt-1">Quản lý tài khoản và phân quyền hệ thống</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-user"><Plus className="mr-1 h-4 w-4" /> Thêm người dùng</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Thêm người dùng mới</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">Họ tên *</Label>
                  <Input id="fullName" name="fullName" required data-testid="input-user-fullname" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="username">Tên đăng nhập *</Label>
                    <Input id="username" name="username" required data-testid="input-user-username" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password">Mật khẩu *</Label>
                    <Input id="password" name="password" type="password" required data-testid="input-user-password" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Vai trò</Label>
                    <Select name="role" defaultValue="farmer">
                      <SelectTrigger data-testid="select-user-role"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="farmer">Nông dân</SelectItem>
                        <SelectItem value="manager">Quản lý</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Số điện thoại</Label>
                    <Input id="phone" name="phone" data-testid="input-user-phone" />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-user">
                  {createMutation.isPending ? "Đang lưu..." : "Thêm người dùng"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardContent className="p-4"><Skeleton className="h-24 w-full" /></CardContent></Card>
            ))}
          </div>
        ) : users && users.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map((user) => (
              <UserDetailDialog
                key={user.id}
                user={user}
                onChangePassword={openChangePw}
                onToggleLock={toggleLock}
                isUpdating={updateMutation.isPending}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Chưa có người dùng nào</p>
          </div>
        )}
      </div>

      {/* Change password dialog */}
      <Dialog open={pwOpen} onOpenChange={(o) => { setPwOpen(o); if (!o) { setPwUserId(null); setNewPassword(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đổi mật khẩu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="newPassword">Mật khẩu mới *</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                data-testid="input-new-password"
              />
            </div>
            <Button
              onClick={handleChangePassword}
              className="w-full"
              disabled={!newPassword || updateMutation.isPending}
            >
              {updateMutation.isPending ? "Đang lưu..." : "Cập nhật mật khẩu"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ScrollArea>
  );
}
