import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    ArrowLeft, Sprout, Thermometer, Droplets, Clock, Pencil, Trash2,
    CalendarDays, Leaf, FlaskConical, BookOpen, ImageIcon, MapPin,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import type { Crop, Season } from "@shared/schema";

const stageLabels: Record<string, string> = {
    preparation: "Chuẩn bị",
    planting: "Gieo trồng",
    caring: "Chăm sóc",
    harvesting: "Thu hoạch",
};

const statusLabels: Record<string, string> = {
    planning: "Kế hoạch",
    active: "Đang hoạt động",
    completed: "Hoàn thành",
};

const statusColors: Record<string, string> = {
    planning: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    completed: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
};

export default function CropDetail() {
    const [, params] = useRoute("/crops/:id");
    const [, navigate] = useLocation();
    const { toast } = useToast();
    const { isManager } = useAuth();
    const cropId = params?.id;

    const { data: crop, isLoading } = useQuery<Crop>({
        queryKey: [`/api/crops/${cropId}`],
        enabled: !!cropId,
    });

    const { data: seasons } = useQuery<Season[]>({
        queryKey: ["/api/seasons"],
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiRequest("DELETE", `/api/crops/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/crops"] });
            toast({ title: "Thành công", description: "Đã xóa cây trồng" });
            navigate("/crops");
        },
        onError: (error: Error) => {
            toast({ title: "Lỗi", description: error.message, variant: "destructive" });
        },
    });

    // Lọc mùa vụ liên quan đến cây trồng này
    const relatedSeasons = seasons?.filter((s) => s.cropId === cropId) || [];

    if (isLoading) {
        return (
            <ScrollArea className="h-full">
                <div className="p-4 md:p-6 space-y-6">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-64 w-full rounded-xl" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Skeleton className="h-32" />
                        <Skeleton className="h-32" />
                        <Skeleton className="h-32" />
                    </div>
                </div>
            </ScrollArea>
        );
    }

    if (!crop) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <Sprout className="h-16 w-16 text-muted-foreground/30" />
                <p className="text-lg text-muted-foreground">Không tìm thấy cây trồng</p>
                <Button variant="outline" onClick={() => navigate("/crops")}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại danh sách
                </Button>
            </div>
        );
    }

    return (
        <ScrollArea className="h-full">
            <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate("/crops")}
                            data-testid="button-back-crops"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold" data-testid="text-crop-name">{crop.name}</h1>
                            {crop.variety && (
                                <p className="text-sm text-muted-foreground">Giống: {crop.variety}</p>
                            )}
                        </div>
                    </div>
                    {isManager && (
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate("/crops")}
                                data-testid="button-edit-from-detail"
                            >
                                <Pencil className="mr-1 h-3.5 w-3.5" /> Chỉnh sửa
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm" data-testid="button-delete-from-detail">
                                        <Trash2 className="mr-1 h-3.5 w-3.5" /> Xóa
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

                {/* Hero Image */}
                {crop.image && (
                    <div className="relative w-full rounded-xl overflow-hidden bg-muted aspect-[21/9]">
                        <img
                            src={crop.image}
                            alt={crop.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                            }}
                        />
                    </div>
                )}

                {/* Description */}
                {crop.description && (
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <BookOpen className="h-4 w-4 text-primary" />
                                Mô tả
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                                {crop.description}
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* Environment Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {crop.growthDuration && (
                        <Card className="border-l-4 border-l-chart-1">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 text-chart-1 mb-1">
                                    <Clock className="h-4 w-4" />
                                    <span className="text-xs font-medium">Sinh trưởng</span>
                                </div>
                                <p className="text-xl font-bold">{crop.growthDuration}</p>
                                <p className="text-xs text-muted-foreground">ngày</p>
                            </CardContent>
                        </Card>
                    )}
                    {crop.optimalTemp && (
                        <Card className="border-l-4 border-l-orange-500">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 text-orange-500 mb-1">
                                    <Thermometer className="h-4 w-4" />
                                    <span className="text-xs font-medium">Nhiệt độ</span>
                                </div>
                                <p className="text-xl font-bold">{crop.optimalTemp}</p>
                                <p className="text-xs text-muted-foreground">°C lý tưởng</p>
                            </CardContent>
                        </Card>
                    )}
                    {crop.optimalHumidity && (
                        <Card className="border-l-4 border-l-blue-500">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 text-blue-500 mb-1">
                                    <Droplets className="h-4 w-4" />
                                    <span className="text-xs font-medium">Độ ẩm</span>
                                </div>
                                <p className="text-xl font-bold">{crop.optimalHumidity}</p>
                                <p className="text-xs text-muted-foreground">% lý tưởng</p>
                            </CardContent>
                        </Card>
                    )}
                    {crop.optimalPh && (
                        <Card className="border-l-4 border-l-emerald-500">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 text-emerald-500 mb-1">
                                    <FlaskConical className="h-4 w-4" />
                                    <span className="text-xs font-medium">pH đất</span>
                                </div>
                                <p className="text-xl font-bold">{crop.optimalPh}</p>
                                <p className="text-xs text-muted-foreground">lý tưởng</p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Care Instructions */}
                {crop.careInstructions && (
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Leaf className="h-4 w-4 text-chart-2" />
                                Hướng dẫn chăm sóc
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="bg-chart-2/5 rounded-lg p-4 border border-chart-2/10">
                                <p className="text-sm leading-relaxed whitespace-pre-line">
                                    {crop.careInstructions}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Related Seasons */}
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                                <CalendarDays className="h-4 w-4 text-chart-4" />
                                Mùa vụ liên quan
                            </CardTitle>
                            <Badge variant="secondary" className="text-xs">
                                {relatedSeasons.length} mùa vụ
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {relatedSeasons.length > 0 ? (
                            <div className="space-y-3">
                                {relatedSeasons.map((season) => (
                                    <div
                                        key={season.id}
                                        className="flex items-center justify-between gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                                        onClick={() => navigate("/seasons")}
                                        data-testid={`season-link-${season.id}`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-chart-4/10">
                                                <CalendarDays className="h-4 w-4 text-chart-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium truncate">{season.name}</p>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                                    {season.startDate && (
                                                        <span>{String(season.startDate).split("T")[0]}</span>
                                                    )}
                                                    {season.startDate && season.endDate && <span>→</span>}
                                                    {season.endDate && (
                                                        <span>{String(season.endDate).split("T")[0]}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {season.currentStage && (
                                                <Badge variant="outline" className="text-xs">
                                                    {stageLabels[season.currentStage] || season.currentStage}
                                                </Badge>
                                            )}
                                            <Badge className={`text-xs ${statusColors[season.status] || ""}`}>
                                                {statusLabels[season.status] || season.status}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <CalendarDays className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
                                <p className="text-sm text-muted-foreground">
                                    Chưa có mùa vụ nào sử dụng cây trồng này
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </ScrollArea>
    );
}
