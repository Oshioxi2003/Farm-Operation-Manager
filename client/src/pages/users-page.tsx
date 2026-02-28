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
import { Plus, Users, Phone, KeyRound, Lock, Unlock } from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

const roleLabels: Record<string, string> = {
  manager: "Quản lý",
  farmer: "Nông dân",
};

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
              <Card key={user.id} className="hover-elevate" data-testid={`card-user-${user.id}`}>
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
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-8 text-xs"
                      onClick={() => openChangePw(user.id)}
                      data-testid={`button-change-pw-${user.id}`}
                    >
                      <KeyRound className="mr-1 h-3 w-3" /> Đổi mật khẩu
                    </Button>
                    <Button
                      size="sm"
                      variant={user.isLocked ? "default" : "destructive"}
                      className="flex-1 h-8 text-xs"
                      onClick={() => toggleLock(user)}
                      disabled={updateMutation.isPending}
                      data-testid={`button-lock-${user.id}`}
                    >
                      {user.isLocked ? (
                        <><Unlock className="mr-1 h-3 w-3" /> Mở khóa</>
                      ) : (
                        <><Lock className="mr-1 h-3 w-3" /> Khóa TK</>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
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
