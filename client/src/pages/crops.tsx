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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Sprout, Thermometer, Droplets, Search, Pencil, Trash2, Upload, Link, ImageIcon, Filter, X } from "lucide-react";
import { useState, useRef, useMemo } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Crop } from "@shared/schema";
import { useAuth } from "@/lib/auth-context";

function ImageUploadField({
  value,
  onChange,
  label = "Hình ảnh",
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}) {
  const [mode, setMode] = useState<"url" | "upload">("upload");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const res = await apiRequest("POST", "/api/upload/crops", {
          base64,
          filename: file.name,
        });
        const data = await res.json();
        onChange(data.url);
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Tabs value={mode} onValueChange={(v) => setMode(v as "url" | "upload")} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-8">
          <TabsTrigger value="upload" className="text-xs h-6">
            <Upload className="mr-1 h-3 w-3" /> Tải ảnh lên
          </TabsTrigger>
          <TabsTrigger value="url" className="text-xs h-6">
            <Link className="mr-1 h-3 w-3" /> Nhập URL
          </TabsTrigger>
        </TabsList>
        <TabsContent value="upload" className="mt-2">
          <div
            className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            {value && !value.startsWith("http") ? (
              <img src={value} alt="Preview" className="max-h-32 mx-auto rounded-md object-cover" />
            ) : (
              <>
                <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                <p className="text-xs text-muted-foreground">
                  {uploading ? "Đang tải lên..." : "Nhấp để chọn ảnh"}
                </p>
              </>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
          />
        </TabsContent>
        <TabsContent value="url" className="mt-2">
          <Input
            placeholder="https://example.com/image.jpg"
            value={value.startsWith("/media") ? "" : value}
            onChange={(e) => onChange(e.target.value)}
          />
        </TabsContent>
      </Tabs>
      {value && (
        <div className="relative">
          <img
            src={value}
            alt="Preview"
            className="max-h-24 rounded-md object-cover border"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <Button
            type="button"
            size="sm"
            variant="destructive"
            className="absolute top-1 right-1 h-5 text-[10px] px-1.5"
            onClick={() => onChange("")}
          >
            Xóa
          </Button>
        </div>
      )}
    </div>
  );
}

export default function Crops() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editCrop, setEditCrop] = useState<Crop | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterVariety, setFilterVariety] = useState<string>("all");
  const [filterGrowthRange, setFilterGrowthRange] = useState<string>("all");
  const [filterHasTemp, setFilterHasTemp] = useState<string>("all");
  const [filterHasCare, setFilterHasCare] = useState<string>("all");
  const { toast } = useToast();
  const { isManager } = useAuth();

  const { data: crops, isLoading } = useQuery<Crop[]>({ queryKey: ["/api/crops"] });

  // Lấy danh sách giống duy nhất từ dữ liệu
  const varieties = useMemo(() => {
    if (!crops) return [];
    const set = new Set(crops.map(c => c.variety).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [crops]);

  // Đếm số bộ lọc đang áp dụng
  const activeFilterCount = [filterVariety, filterGrowthRange, filterHasTemp, filterHasCare]
    .filter(v => v !== "all").length;

  const clearAllFilters = () => {
    setFilterVariety("all");
    setFilterGrowthRange("all");
    setFilterHasTemp("all");
    setFilterHasCare("all");
  };

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/crops", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crops"] });
      setOpen(false);
      setImageUrl("");
      toast({ title: "Thành công", description: "Đã thêm cây trồng mới" });
    },
    onError: (error: Error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
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
      setEditImageUrl("");
      toast({ title: "Thành công", description: "Đã cập nhật cây trồng" });
    },
    onError: (error: Error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
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

  const filtered = crops?.filter(c => {
    // Lọc theo tìm kiếm text
    const matchesSearch = search === "" ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.variety?.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    // Lọc theo giống
    if (filterVariety !== "all" && c.variety !== filterVariety) return false;

    // Lọc theo thời gian sinh trưởng
    if (filterGrowthRange !== "all") {
      const gd = c.growthDuration;
      if (filterGrowthRange === "none" && gd) return false;
      if (filterGrowthRange === "none" && !gd) { /* pass */ }
      else if (filterGrowthRange === "lt30" && (!gd || gd >= 30)) return false;
      else if (filterGrowthRange === "30to60" && (!gd || gd < 30 || gd > 60)) return false;
      else if (filterGrowthRange === "60to90" && (!gd || gd < 60 || gd > 90)) return false;
      else if (filterGrowthRange === "gt90" && (!gd || gd <= 90)) return false;
    }

    // Lọc theo có thông tin nhiệt độ
    if (filterHasTemp === "yes" && !c.optimalTemp) return false;
    if (filterHasTemp === "no" && c.optimalTemp) return false;

    // Lọc theo có hướng dẫn chăm sóc
    if (filterHasCare === "yes" && !c.careInstructions) return false;
    if (filterHasCare === "no" && c.careInstructions) return false;

    return true;
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const gd = fd.get("growthDuration") as string;
    createMutation.mutate({
      name: fd.get("name") as string,
      variety: fd.get("variety") as string || null,
      description: fd.get("description") as string || null,
      growthDuration: gd ? parseInt(gd) : null,
      optimalTemp: fd.get("optimalTemp") as string || null,
      optimalHumidity: fd.get("optimalHumidity") as string || null,
      optimalPh: fd.get("optimalPh") as string || null,
      careInstructions: fd.get("careInstructions") as string || null,
      image: imageUrl || null,
    });
  };

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editCrop) return;
    const fd = new FormData(e.currentTarget);
    const gd = fd.get("growthDuration") as string;
    updateMutation.mutate({
      id: editCrop.id,
      data: {
        name: fd.get("name") as string,
        variety: fd.get("variety") as string || null,
        description: fd.get("description") as string || null,
        growthDuration: gd ? parseInt(gd) : null,
        optimalTemp: fd.get("optimalTemp") as string || null,
        optimalHumidity: fd.get("optimalHumidity") as string || null,
        optimalPh: fd.get("optimalPh") as string || null,
        careInstructions: fd.get("careInstructions") as string || null,
        image: editImageUrl || null,
      },
    });
  };

  const openEdit = (crop: Crop) => {
    setEditCrop(crop);
    setEditImageUrl(crop.image || "");
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
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setImageUrl(""); }}>
            {isManager && <DialogTrigger asChild>
              <Button data-testid="button-add-crop"><Plus className="mr-1 h-4 w-4" /> Thêm cây</Button>
            </DialogTrigger>}
            <DialogContent className="max-h-[90vh] overflow-y-auto">
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
                <ImageUploadField value={imageUrl} onChange={setImageUrl} />
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

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative max-w-sm flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm cây trồng..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search-crops"
            />
          </div>

          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="relative shrink-0"
                data-testid="button-filter-crops"
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

                {/* Lọc theo giống */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Giống cây</Label>
                  <Select value={filterVariety} onValueChange={setFilterVariety}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Tất cả" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      {varieties.map(v => (
                        <SelectItem key={v} value={v}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Lọc theo thời gian sinh trưởng */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Thời gian sinh trưởng</Label>
                  <Select value={filterGrowthRange} onValueChange={setFilterGrowthRange}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Tất cả" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="lt30">&lt; 30 ngày</SelectItem>
                      <SelectItem value="30to60">30 - 60 ngày</SelectItem>
                      <SelectItem value="60to90">60 - 90 ngày</SelectItem>
                      <SelectItem value="gt90">&gt; 90 ngày</SelectItem>
                      <SelectItem value="none">Chưa có thông tin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Lọc theo nhiệt độ */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Nhiệt độ lý tưởng</Label>
                  <Select value={filterHasTemp} onValueChange={setFilterHasTemp}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Tất cả" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="yes">Có thông tin</SelectItem>
                      <SelectItem value="no">Chưa có thông tin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Lọc theo hướng dẫn chăm sóc */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Hướng dẫn chăm sóc</Label>
                  <Select value={filterHasCare} onValueChange={setFilterHasCare}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Tất cả" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="yes">Có hướng dẫn</SelectItem>
                      <SelectItem value="no">Chưa có hướng dẫn</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Hiển thị badge bộ lọc đang áp dụng */}
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {filterVariety !== "all" && (
                <Badge variant="secondary" className="text-xs gap-1 pl-2 pr-1 py-0.5">
                  Giống: {filterVariety}
                  <button onClick={() => setFilterVariety("all")} className="ml-0.5 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filterGrowthRange !== "all" && (
                <Badge variant="secondary" className="text-xs gap-1 pl-2 pr-1 py-0.5">
                  Sinh trưởng: {{
                    lt30: "< 30 ngày",
                    "30to60": "30-60 ngày",
                    "60to90": "60-90 ngày",
                    gt90: "> 90 ngày",
                    none: "Chưa có",
                  }[filterGrowthRange]}
                  <button onClick={() => setFilterGrowthRange("all")} className="ml-0.5 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filterHasTemp !== "all" && (
                <Badge variant="secondary" className="text-xs gap-1 pl-2 pr-1 py-0.5">
                  Nhiệt độ: {filterHasTemp === "yes" ? "Có" : "Không"}
                  <button onClick={() => setFilterHasTemp("all")} className="ml-0.5 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filterHasCare !== "all" && (
                <Badge variant="secondary" className="text-xs gap-1 pl-2 pr-1 py-0.5">
                  Chăm sóc: {filterHasCare === "yes" ? "Có" : "Không"}
                  <button onClick={() => setFilterHasCare("all")} className="ml-0.5 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}
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
              <Card key={crop.id} className="hover-elevate overflow-hidden" data-testid={`card-crop-${crop.id}`}>
                {/* Show crop image if available */}
                {crop.image && (
                  <div className="aspect-video w-full overflow-hidden bg-muted">
                    <img
                      src={crop.image}
                      alt={crop.name}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  </div>
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-chart-2/10">
                      {crop.image ? (
                        <ImageIcon className="h-5 w-5 text-chart-2" />
                      ) : (
                        <Sprout className="h-5 w-5 text-chart-2" />
                      )}
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
      <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) { setEditCrop(null); setEditImageUrl(""); } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
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
              <ImageUploadField value={editImageUrl} onChange={setEditImageUrl} />
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
