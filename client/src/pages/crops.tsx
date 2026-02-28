import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Plus, Sprout, Thermometer, Droplets, Search, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Crop } from "@shared/schema";
import { useAuth } from "@/lib/auth-context";

export default function Crops() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editCrop, setEditCrop] = useState<Crop | null>(null);
  const { toast } = useToast();
  const { isManager } = useAuth();

  const { data: crops, isLoading } = useQuery<Crop[]>({ queryKey: ["/api/crops"] });

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      const res = await apiRequest("POST", "/api/crops", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crops"] });
      setOpen(false);
      toast({ title: "Thành công", description: "Đã thêm cây trồng mới" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/crops/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crops"] });
      setEditOpen(false);
      setEditCrop(null);
      toast({ title: "Thành công", description: "Đã cập nhật cây trồng" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/crops/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crops"] });
      toast({ title: "Thành công", description: "Đã xóa cây trồng" });
    },
  });

  const filtered = crops?.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.variety?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createMutation.mutate({
      name: fd.get("name") as string,
      variety: fd.get("variety") as string,
      description: fd.get("description") as string,
      growthDuration: fd.get("growthDuration") as string,
      optimalTemp: fd.get("optimalTemp") as string,
      optimalHumidity: fd.get("optimalHumidity") as string,
      optimalPh: fd.get("optimalPh") as string,
      careInstructions: fd.get("careInstructions") as string,
    });
  };

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editCrop) return;
    const fd = new FormData(e.currentTarget);
    updateMutation.mutate({
      id: editCrop.id,
      data: {
        name: fd.get("name") as string,
        variety: fd.get("variety") as string,
        description: fd.get("description") as string,
        growthDuration: parseInt(fd.get("growthDuration") as string) || null,
        optimalTemp: fd.get("optimalTemp") as string,
        optimalHumidity: fd.get("optimalHumidity") as string,
        optimalPh: fd.get("optimalPh") as string,
        careInstructions: fd.get("careInstructions") as string,
      },
    });
  };

  const openEdit = (crop: Crop) => {
    setEditCrop(crop);
    setEditOpen(true);
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Cây trồng</h1>
            <p className="text-sm text-muted-foreground mt-1">Quản lý danh sách cây trồng và hướng dẫn chăm sóc</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            {isManager && <DialogTrigger asChild>
              <Button data-testid="button-add-crop"><Plus className="mr-1 h-4 w-4" /> Thêm cây</Button>
            </DialogTrigger>}
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Thêm cây trồng mới</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Tên cây *</Label>
                    <Input id="name" name="name" required data-testid="input-crop-name" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="variety">Giống</Label>
                    <Input id="variety" name="variety" data-testid="input-crop-variety" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="description">Mô tả</Label>
                  <Textarea id="description" name="description" data-testid="input-crop-description" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="growthDuration">Thời gian sinh trưởng (ngày)</Label>
                    <Input id="growthDuration" name="growthDuration" type="number" data-testid="input-crop-growth" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="optimalTemp">Nhiệt độ lý tưởng</Label>
                    <Input id="optimalTemp" name="optimalTemp" placeholder="25-32" data-testid="input-crop-temp" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="optimalHumidity">Độ ẩm lý tưởng</Label>
                    <Input id="optimalHumidity" name="optimalHumidity" placeholder="70-85" data-testid="input-crop-humidity" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="optimalPh">pH lý tưởng</Label>
                    <Input id="optimalPh" name="optimalPh" placeholder="5.5-7.0" data-testid="input-crop-ph" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="careInstructions">Hướng dẫn chăm sóc</Label>
                  <Textarea id="careInstructions" name="careInstructions" data-testid="input-crop-care" />
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-crop">
                  {createMutation.isPending ? "Đang lưu..." : "Lưu"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm cây trồng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-crops"
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}><CardContent className="p-4"><Skeleton className="h-32 w-full" /></CardContent></Card>
            ))}
          </div>
        ) : filtered && filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((crop) => (
              <Card key={crop.id} className="hover-elevate" data-testid={`card-crop-${crop.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-chart-2/10">
                      <Sprout className="h-5 w-5 text-chart-2" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base truncate">{crop.name}</CardTitle>
                      {crop.variety && <p className="text-xs text-muted-foreground">{crop.variety}</p>}
                    </div>
                    {isManager && (
                      <div className="flex gap-1 shrink-0">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(crop)} data-testid={`button-edit-crop-${crop.id}`}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" data-testid={`button-delete-crop-${crop.id}`}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Xóa cây trồng</AlertDialogTitle>
                              <AlertDialogDescription>
                                Bạn có chắc muốn xóa "{crop.name}"? Thao tác này không thể hoàn tác.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Hủy</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(crop.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Xóa
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {crop.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{crop.description}</p>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    {crop.growthDuration && (
                      <Badge variant="outline" className="no-default-active-elevate text-xs">
                        {crop.growthDuration} ngày
                      </Badge>
                    )}
                    {crop.optimalTemp && (
                      <Badge variant="outline" className="no-default-active-elevate text-xs">
                        <Thermometer className="mr-1 h-3 w-3" /> {crop.optimalTemp}°C
                      </Badge>
                    )}
                    {crop.optimalHumidity && (
                      <Badge variant="outline" className="no-default-active-elevate text-xs">
                        <Droplets className="mr-1 h-3 w-3" /> {crop.optimalHumidity}%
                      </Badge>
                    )}
                  </div>
                  {crop.careInstructions && (
                    <p className="text-xs text-muted-foreground line-clamp-3 bg-muted/30 p-2 rounded-md">
                      {crop.careInstructions}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Sprout className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Chưa có cây trồng nào</p>
          </div>
        )}
      </div>

      {/* Edit crop dialog */}
      <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) setEditCrop(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa cây trồng</DialogTitle>
          </DialogHeader>
          {editCrop && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-name">Tên cây *</Label>
                  <Input id="edit-name" name="name" required defaultValue={editCrop.name} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-variety">Giống</Label>
                  <Input id="edit-variety" name="variety" defaultValue={editCrop.variety || ""} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-description">Mô tả</Label>
                <Textarea id="edit-description" name="description" defaultValue={editCrop.description || ""} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-growthDuration">Thời gian sinh trưởng (ngày)</Label>
                  <Input id="edit-growthDuration" name="growthDuration" type="number" defaultValue={editCrop.growthDuration || ""} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-optimalTemp">Nhiệt độ lý tưởng</Label>
                  <Input id="edit-optimalTemp" name="optimalTemp" defaultValue={editCrop.optimalTemp || ""} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-optimalHumidity">Độ ẩm lý tưởng</Label>
                  <Input id="edit-optimalHumidity" name="optimalHumidity" defaultValue={editCrop.optimalHumidity || ""} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-optimalPh">pH lý tưởng</Label>
                  <Input id="edit-optimalPh" name="optimalPh" defaultValue={editCrop.optimalPh || ""} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-careInstructions">Hướng dẫn chăm sóc</Label>
                <Textarea id="edit-careInstructions" name="careInstructions" defaultValue={editCrop.careInstructions || ""} />
              </div>
              <Button type="submit" className="w-full" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Đang lưu..." : "Cập nhật"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </ScrollArea>
  );
}
