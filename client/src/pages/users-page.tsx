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
import { Plus, Users, Phone } from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

const roleLabels: Record<string, string> = {
  manager: "Quan ly",
  farmer: "Nong dan",
};

export default function UsersPage() {
  const [open, setOpen] = useState(false);
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
      toast({ title: "Thanh cong", description: "Da them nguoi dung" });
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

  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Nguoi dung & Phan quyen</h1>
            <p className="text-sm text-muted-foreground mt-1">Quan ly tai khoan va phan quyen he thong</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-user"><Plus className="mr-1 h-4 w-4" /> Them nguoi dung</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Them nguoi dung moi</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">Ho ten *</Label>
                  <Input id="fullName" name="fullName" required data-testid="input-user-fullname" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="username">Ten dang nhap *</Label>
                    <Input id="username" name="username" required data-testid="input-user-username" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password">Mat khau *</Label>
                    <Input id="password" name="password" type="password" required data-testid="input-user-password" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Vai tro</Label>
                    <Select name="role" defaultValue="farmer">
                      <SelectTrigger data-testid="select-user-role"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="farmer">Nong dan</SelectItem>
                        <SelectItem value="manager">Quan ly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">So dien thoai</Label>
                    <Input id="phone" name="phone" data-testid="input-user-phone" />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-user">
                  {createMutation.isPending ? "Dang luu..." : "Them nguoi dung"}
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
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground font-medium">
                      {user.fullName.split(" ").map(w => w[0]).slice(-2).join("").toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{user.fullName}</p>
                      <p className="text-sm text-muted-foreground">@{user.username}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge
                          variant={user.role === "manager" ? "default" : "secondary"}
                          className="text-xs no-default-active-elevate"
                        >
                          {roleLabels[user.role]}
                        </Badge>
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
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Chua co nguoi dung nao</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
