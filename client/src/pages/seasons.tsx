import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, CalendarDays, Sprout, Leaf, Sun } from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Season, Crop, User } from "@shared/schema";
import { useAuth } from "@/lib/auth-context";

const statusLabels: Record<string, string> = {
  planning: "Kế hoạch",
  active: "Đang chạy",
  completed: "Hoàn thành",
};

const statusBadgeVariant: Record<string, "default" | "secondary" | "outline"> = {
  planning: "outline",
  active: "default",
  completed: "secondary",
};

const stageLabels: Record<string, string> = {
  planting: "Gieo trồng",
  caring: "Chăm bón",
  harvesting: "Thu hoạch",
};

const stageIcons: Record<string, typeof Sprout> = {
  planting: Sprout,
  caring: Leaf,
  harvesting: Sun,
};

export default function Seasons() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { isManager } = useAuth();

  const { data: seasons, isLoading } = useQuery<Season[]>({ queryKey: ["/api/seasons"] });
  const { data: crops } = useQuery<Crop[]>({ queryKey: ["/api/crops"] });

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/seasons", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seasons"] });
      setOpen(false);
      toast({ title: "Thành công", description: "Đã tạo mùa vụ mới" });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createMutation.mutate({
      name: fd.get("name") as string,
      cropId: fd.get("cropId") as string,
      status: "planning",
      currentStage: "planting",
      startDate: fd.get("startDate") as string,
      endDate: fd.get("endDate") as string,
      area: parseFloat(fd.get("area") as string) || null,
      areaUnit: "ha",
      notes: fd.get("notes") as string,
      progress: 0,
    });
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Mùa vụ</h1>
            <p className="text-sm text-muted-foreground mt-1">Quản lý các mùa vụ gieo trồng</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            {isManager && <DialogTrigger asChild>
              <Button data-testid="button-add-season"><Plus className="mr-1 h-4 w-4" /> Tạo mùa vụ</Button>
            </DialogTrigger>}
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tạo mùa vụ mới</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Tên mùa vụ *</Label>
                  <Input id="name" name="name" required data-testid="input-season-name" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cropId">Cây trồng</Label>
                  <Select name="cropId">
                    <SelectTrigger data-testid="select-season-crop">
                      <SelectValue placeholder="Chọn cây trồng" />
                    </SelectTrigger>
                    <SelectContent>
                      {crops?.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name} {c.variety ? `- ${c.variety}` : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="startDate">Ngày bắt đầu</Label>
                    <Input id="startDate" name="startDate" type="date" data-testid="input-season-start" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="endDate">Ngày kết thúc</Label>
                    <Input id="endDate" name="endDate" type="date" data-testid="input-season-end" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="area">Diện tích (ha)</Label>
                  <Input id="area" name="area" type="number" step="0.1" data-testid="input-season-area" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="notes">Ghi chú</Label>
                  <Textarea id="notes" name="notes" data-testid="input-season-notes" />
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-season">
                  {createMutation.isPending ? "Đang lưu..." : "Tạo mùa vụ"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}><CardContent className="p-4"><Skeleton className="h-28 w-full" /></CardContent></Card>
            ))}
          </div>
        ) : seasons && seasons.length > 0 ? (
          <div className="space-y-4">
            {seasons.map((season) => {
              const crop = crops?.find(c => c.id === season.cropId);
              const StageIcon = season.currentStage ? stageIcons[season.currentStage] : CalendarDays;
              return (
                <Card key={season.id} className="hover-elevate cursor-pointer" data-testid={`card-season-${season.id}`}>
                  <CardContent className="p-4 md:p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-primary/10">
                        <StageIcon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div>
                            <h3 className="font-semibold text-base">{season.name}</h3>
                            {crop && <p className="text-sm text-muted-foreground">{crop.name} {crop.variety ? `(${crop.variety})` : ""}</p>}
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <Badge variant={statusBadgeVariant[season.status]} className="no-default-active-elevate">
                              {statusLabels[season.status]}
                            </Badge>
                            {season.currentStage && (
                              <Badge variant="outline" className="no-default-active-elevate">
                                {stageLabels[season.currentStage]}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Tiến độ</span>
                            <span>{season.progress || 0}%</span>
                          </div>
                          <Progress value={season.progress || 0} className="h-2" />
                        </div>

                        <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
                          {season.startDate && <span>Bắt đầu: {String(season.startDate)}</span>}
                          {season.endDate && <span>Kết thúc: {String(season.endDate)}</span>}
                          {season.area && <span>Diện tích: {season.area} {season.areaUnit}</span>}
                        </div>

                        {season.notes && (
                          <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded-md">{season.notes}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Chưa có mùa vụ nào</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
