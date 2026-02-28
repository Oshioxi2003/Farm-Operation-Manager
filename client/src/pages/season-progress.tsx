import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Sprout, Leaf, Sun, CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Season, Crop, Task } from "@shared/schema";

const stages = [
  { key: "planting", label: "Gieo trồng", icon: Sprout, color: "text-chart-2" },
  { key: "caring", label: "Chăm bón", icon: Leaf, color: "text-chart-1" },
  { key: "harvesting", label: "Thu hoạch", icon: Sun, color: "text-chart-3" },
];

const stageIndex: Record<string, number> = { planting: 0, caring: 1, harvesting: 2 };

export default function SeasonProgress() {
  const { toast } = useToast();
  const { data: seasons, isLoading } = useQuery<Season[]>({ queryKey: ["/api/seasons"] });
  const { data: crops } = useQuery<Crop[]>({ queryKey: ["/api/crops"] });
  const { data: allTasks } = useQuery<Task[]>({ queryKey: ["/api/tasks"] });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/seasons/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seasons"] });
      toast({ title: "Cập nhật thành công" });
    },
  });

  const activeSeasons = seasons?.filter(s => s.status === "active" || s.status === "planning") || [];

  const advanceStage = (season: Season) => {
    const idx = season.currentStage ? stageIndex[season.currentStage] : 0;
    if (idx < 2) {
      const nextStage = stages[idx + 1].key as "planting" | "caring" | "harvesting";
      const progress = Math.min(100, (season.progress || 0) + 20);
      updateMutation.mutate({ id: season.id, data: { currentStage: nextStage, progress, status: "active" } });
    } else {
      updateMutation.mutate({ id: season.id, data: { status: "completed", progress: 100 } });
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Tiến độ giai đoạn</h1>
          <p className="text-sm text-muted-foreground mt-1">Theo dõi tiến độ các mùa vụ đang hoạt động</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i}><CardContent className="p-4"><Skeleton className="h-40 w-full" /></CardContent></Card>
            ))}
          </div>
        ) : activeSeasons.length > 0 ? (
          <div className="space-y-6">
            {activeSeasons.map((season) => {
              const crop = crops?.find(c => c.id === season.cropId);
              const currentIdx = season.currentStage ? stageIndex[season.currentStage] : 0;
              const seasonTasks = allTasks?.filter(t => t.seasonId === season.id) || [];

              return (
                <Card key={season.id} data-testid={`card-season-progress-${season.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <CardTitle className="text-lg">{season.name}</CardTitle>
                        {crop && <p className="text-sm text-muted-foreground mt-0.5">{crop.name}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{season.progress || 0}%</span>
                        <Progress value={season.progress || 0} className="w-24 h-2" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="flex items-center gap-2 md:gap-0">
                      {stages.map((stage, i) => {
                        const isCompleted = i < currentIdx;
                        const isCurrent = i === currentIdx;
                        const stageTasks = seasonTasks.filter(t => t.stage === stage.key);
                        const doneTasks = stageTasks.filter(t => t.status === "done").length;

                        return (
                          <div key={stage.key} className="flex-1 flex flex-col items-center relative">
                            {i > 0 && (
                              <div className={`absolute top-5 -left-1/2 w-full h-0.5 ${isCompleted || isCurrent ? "bg-primary" : "bg-muted"}`} />
                            )}
                            <div className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 ${isCompleted ? "bg-primary border-primary text-primary-foreground" :
                                isCurrent ? "border-primary bg-background text-primary" :
                                  "border-muted bg-background text-muted-foreground"
                              }`}>
                              {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <stage.icon className="h-5 w-5" />}
                            </div>
                            <p className={`text-xs font-medium mt-2 ${isCurrent ? "text-primary" : "text-muted-foreground"}`}>
                              {stage.label}
                            </p>
                            {stageTasks.length > 0 && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {doneTasks}/{stageTasks.length} việc
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Công việc giai đoạn hiện tại
                      </p>
                      {seasonTasks.filter(t => t.stage === season.currentStage).length > 0 ? (
                        <div className="space-y-1.5">
                          {seasonTasks.filter(t => t.stage === season.currentStage).map(task => (
                            <div key={task.id} className="flex items-center gap-2 text-sm p-2 rounded-md bg-muted/30">
                              {task.status === "done" ? (
                                <CheckCircle2 className="h-4 w-4 text-chart-2 shrink-0" />
                              ) : (
                                <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                              )}
                              <span className={task.status === "done" ? "line-through text-muted-foreground" : ""}>{task.title}</span>
                              {task.status === "overdue" && (
                                <Badge variant="destructive" className="ml-auto text-[10px] no-default-active-elevate">Quá hạn</Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Chưa có công việc cho giai đoạn này</p>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => advanceStage(season)}
                      disabled={updateMutation.isPending}
                      data-testid={`button-advance-${season.id}`}
                    >
                      {currentIdx < 2 ? (
                        <>Chuyển sang {stages[currentIdx + 1].label} <ArrowRight className="ml-1 h-3 w-3" /></>
                      ) : (
                        <>Hoàn thành mùa vụ <CheckCircle2 className="ml-1 h-3 w-3" /></>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <Sprout className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Không có mùa vụ đang hoạt động</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
