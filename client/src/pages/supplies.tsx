import { Fragment } from "react";
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
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Plus, Warehouse, AlertTriangle, PackagePlus, ArrowDownToLine, ArrowUpFromLine,
  ChevronDown, PackageOpen,
} from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Supply, SupplyTransaction, Season } from "@shared/schema";
import { useAuth } from "@/lib/auth-context";

const statusConfig: Record<string, { label: string; color: string }> = {
  ok: { label: "Đủ", color: "bg-chart-2/15 text-chart-2" },
  low: { label: "Sắp hết", color: "bg-chart-3/15 text-chart-3" },
  out: { label: "Hết", color: "bg-destructive/15 text-destructive" },
};

export default function Supplies() {
  const [openAdd, setOpenAdd] = useState(false);
  const [openTx, setOpenTx] = useState(false);
  const [openUse, setOpenUse] = useState(false);
  const [useSupplyId, setUseSupplyId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [expandedSupply, setExpandedSupply] = useState<string | null>(null);
  const { toast } = useToast();
  const { isManager, isFarmer } = useAuth();

  const { data: supplies, isLoading } = useQuery<Supply[]>({ queryKey: ["/api/supplies"] });
  const { data: transactions } = useQuery<SupplyTransaction[]>({ queryKey: ["/api/supply-transactions"] });
  const { data: seasons } = useQuery<Season[]>({ queryKey: ["/api/seasons"] });

  // Fetch transactions for expanded supply
  const { data: supplyTransactions } = useQuery<SupplyTransaction[]>({
    queryKey: ["/api/supply-transactions/supply", expandedSupply],
    queryFn: async () => {
      if (!expandedSupply) return [];
      const res = await fetch(`/api/supply-transactions/supply/${expandedSupply}`, { credentials: "include" });
      return res.json();
    },
    enabled: !!expandedSupply,
  });

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/supplies", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supplies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setOpenAdd(false);
      toast({ title: "Thành công", description: "Đã thêm vật tư" });
    },
  });

  const txMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/supply-transactions", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supplies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/supply-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/supply-transactions/supply", expandedSupply] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setOpenTx(false);
      setOpenUse(false);
      setUseSupplyId(null);
      toast({ title: "Thành công", description: "Đã cập nhật kho" });
    },
  });

  // Get unique categories for filter
  const categories = Array.from(new Set(supplies?.map(s => s.category).filter(Boolean) || []));

  const filtered = supplies?.filter(s => {
    if (filterCategory !== "all" && s.category !== filterCategory) return false;
    if (filterStatus !== "all" && s.status !== filterStatus) return false;
    return true;
  });

  const handleAddSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createMutation.mutate({
      name: fd.get("name") as string,
      category: fd.get("category") as string,
      unit: fd.get("unit") as string,
      currentStock: parseFloat(fd.get("currentStock") as string) || 0,
      minThreshold: parseFloat(fd.get("minThreshold") as string) || 0,
      status: "ok",
    });
  };

  const handleTxSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    txMutation.mutate({
      supplyId: fd.get("supplyId") as string,
      seasonId: fd.get("seasonId") as string || null,
      type: "import", // Manager can only import
      quantity: parseFloat(fd.get("quantity") as string),
      note: fd.get("note") as string,
    });
  };

  const handleUseSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    txMutation.mutate({
      supplyId: useSupplyId,
      seasonId: fd.get("seasonId") as string || null,
      type: "export",
      quantity: parseFloat(fd.get("quantity") as string),
      note: fd.get("note") as string,
    });
  };

  const openUseDialog = (supplyId: string) => {
    setUseSupplyId(supplyId);
    setOpenUse(true);
  };

  const useSupply = supplies?.find(s => s.id === useSupplyId);

  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Kho vật tư</h1>
            <p className="text-sm text-muted-foreground mt-1">Quản lý vật tư và theo dõi tồn kho</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {/* Manager: Import only */}
            <Dialog open={openTx} onOpenChange={setOpenTx}>
              {isManager && <DialogTrigger asChild>
                <Button variant="outline" data-testid="button-add-transaction">
                  <PackagePlus className="mr-1 h-4 w-4" /> Nhập kho
                </Button>
              </DialogTrigger>}
              <DialogContent>
                <DialogHeader><DialogTitle>Nhập kho</DialogTitle></DialogHeader>
                <form onSubmit={handleTxSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Vật tư *</Label>
                    <Select name="supplyId" required>
                      <SelectTrigger data-testid="select-tx-supply"><SelectValue placeholder="Chọn vật tư" /></SelectTrigger>
                      <SelectContent>
                        {supplies?.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.currentStock} {s.unit})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="quantity">Số lượng nhập *</Label>
                      <Input id="quantity" name="quantity" type="number" step="0.1" required data-testid="input-tx-quantity" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Mùa vụ (nếu có)</Label>
                      <Select name="seasonId">
                        <SelectTrigger data-testid="select-tx-season"><SelectValue placeholder="Chọn" /></SelectTrigger>
                        <SelectContent>
                          {seasons?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="note">Ghi chú</Label>
                    <Input id="note" name="note" data-testid="input-tx-note" />
                  </div>
                  <Button type="submit" className="w-full" disabled={txMutation.isPending} data-testid="button-submit-tx">
                    {txMutation.isPending ? "Đang xử lý..." : "Xác nhận nhập kho"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            {/* Manager: Add new supply */}
            <Dialog open={openAdd} onOpenChange={setOpenAdd}>
              {isManager && <DialogTrigger asChild>
                <Button data-testid="button-add-supply"><Plus className="mr-1 h-4 w-4" /> Thêm vật tư</Button>
              </DialogTrigger>}
              <DialogContent>
                <DialogHeader><DialogTitle>Thêm vật tư mới</DialogTitle></DialogHeader>
                <form onSubmit={handleAddSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="name">Tên *</Label>
                      <Input id="name" name="name" required data-testid="input-supply-name" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="category">Phân loại</Label>
                      <Input id="category" name="category" data-testid="input-supply-category" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="unit">Đơn vị *</Label>
                      <Input id="unit" name="unit" required placeholder="kg, gói, lít" data-testid="input-supply-unit" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="currentStock">Tồn kho</Label>
                      <Input id="currentStock" name="currentStock" type="number" step="0.1" defaultValue="0" data-testid="input-supply-stock" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="minThreshold">Ngưỡng thấp</Label>
                      <Input id="minThreshold" name="minThreshold" type="number" step="0.1" defaultValue="0" data-testid="input-supply-threshold" />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-supply">
                    {createMutation.isPending ? "Đang lưu..." : "Thêm vật tư"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[180px]" data-testid="filter-supply-category">
              <SelectValue placeholder="Loại vật tư" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả loại</SelectItem>
              {categories.map(c => (
                <SelectItem key={c} value={c!}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px]" data-testid="filter-supply-status">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="ok">Đủ</SelectItem>
              <SelectItem value="low">Sắp hết</SelectItem>
              <SelectItem value="out">Hết</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : filtered && filtered.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên vật tư</TableHead>
                      <TableHead>Phân loại</TableHead>
                      <TableHead className="text-right">Tồn kho</TableHead>
                      <TableHead className="text-right">Ngưỡng</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead className="text-right">Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((supply) => {
                      const cfg = statusConfig[supply.status || "ok"];
                      const isExpanded = expandedSupply === supply.id;
                      return (
                        <Fragment key={supply.id}>
                          <TableRow data-testid={`row-supply-${supply.id}`}>
                            <TableCell className="font-medium">{supply.name}</TableCell>
                            <TableCell className="text-muted-foreground">{supply.category || "-"}</TableCell>
                            <TableCell className="text-right">{supply.currentStock} {supply.unit}</TableCell>
                            <TableCell className="text-right text-muted-foreground">{supply.minThreshold} {supply.unit}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`no-default-active-elevate ${cfg.color}`}>
                                {supply.status === "low" || supply.status === "out" ? (
                                  <AlertTriangle className="mr-1 h-3 w-3" />
                                ) : null}
                                {cfg.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {isFarmer && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs"
                                    onClick={() => openUseDialog(supply.id)}
                                    data-testid={`button-use-supply-${supply.id}`}
                                  >
                                    <PackageOpen className="mr-1 h-3 w-3" /> Sử dụng
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs"
                                  onClick={() => setExpandedSupply(prev => prev === supply.id ? null : supply.id)}
                                  data-testid={`button-history-supply-${supply.id}`}
                                >
                                  <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow key={`history-${supply.id}`}>
                              <TableCell colSpan={6} className="bg-muted/20 p-3">
                                <p className="text-xs font-semibold mb-2">Lịch sử sử dụng vật tư</p>
                                {supplyTransactions && supplyTransactions.length > 0 ? (
                                  <div className="space-y-1.5">
                                    {supplyTransactions.map(tx => {
                                      const season = seasons?.find(s => s.id === tx.seasonId);
                                      return (
                                        <div key={tx.id} className="flex items-center gap-2 text-xs p-1.5 rounded bg-background">
                                          <div className={`flex h-5 w-5 items-center justify-center rounded ${tx.type === "import" ? "bg-chart-2/10" : "bg-chart-5/10"}`}>
                                            {tx.type === "import" ? (
                                              <ArrowDownToLine className="h-3 w-3 text-chart-2" />
                                            ) : (
                                              <ArrowUpFromLine className="h-3 w-3 text-chart-5" />
                                            )}
                                          </div>
                                          <span className="font-medium">
                                            {tx.type === "import" ? "Nhập" : "Xuất"} {tx.quantity} {supply.unit}
                                          </span>
                                          {tx.note && <span className="text-muted-foreground">- {tx.note}</span>}
                                          {season && <span className="text-muted-foreground">({season.name})</span>}
                                          {tx.createdAt && (
                                            <span className="text-muted-foreground ml-auto">
                                              {new Date(tx.createdAt).toLocaleDateString("vi-VN")}
                                            </span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <p className="text-xs text-muted-foreground text-center py-2">Chưa có lịch sử</p>
                                )}
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="text-center py-16">
            <Warehouse className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Không có vật tư nào</p>
          </div>
        )}

        {/* Recent transactions */}
        {transactions && transactions.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Lịch sử nhập/xuất kho gần đây</h2>
            <div className="space-y-2">
              {transactions.slice(0, 10).map((tx) => {
                const supply = supplies?.find(s => s.id === tx.supplyId);
                const season = seasons?.find(s => s.id === tx.seasonId);
                return (
                  <Card key={tx.id} data-testid={`card-tx-${tx.id}`}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${tx.type === "import" ? "bg-chart-2/10" : "bg-chart-5/10"}`}>
                          {tx.type === "import" ? (
                            <ArrowDownToLine className="h-4 w-4 text-chart-2" />
                          ) : (
                            <ArrowUpFromLine className="h-4 w-4 text-chart-5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">
                            {tx.type === "import" ? "Nhập" : "Xuất"} {tx.quantity} {supply?.unit} - {supply?.name}
                          </p>
                          <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
                            {tx.note && <span>{tx.note}</span>}
                            {season && <span>{season.name}</span>}
                            {tx.createdAt && <span>{new Date(tx.createdAt).toLocaleDateString("vi-VN")}</span>}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Farmer: Use supply dialog */}
      <Dialog open={openUse} onOpenChange={(o) => { setOpenUse(o); if (!o) setUseSupplyId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sử dụng vật tư{useSupply ? `: ${useSupply.name}` : ""}</DialogTitle>
          </DialogHeader>
          {useSupply && (
            <form onSubmit={handleUseSubmit} className="space-y-4">
              <div className="p-3 bg-muted/30 rounded-md text-sm">
                <p>Vật tư: <strong>{useSupply.name}</strong></p>
                <p className="text-muted-foreground">Tồn kho: {useSupply.currentStock} {useSupply.unit}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="use-quantity">Số lượng sử dụng *</Label>
                  <Input
                    id="use-quantity"
                    name="quantity"
                    type="number"
                    step="0.1"
                    required
                    max={useSupply.currentStock}
                    data-testid="input-use-quantity"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Mùa vụ</Label>
                  <Select name="seasonId">
                    <SelectTrigger data-testid="select-use-season"><SelectValue placeholder="Chọn" /></SelectTrigger>
                    <SelectContent>
                      {seasons?.filter(s => s.status === "active").map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="use-note">Ghi chú</Label>
                <Textarea id="use-note" name="note" placeholder="Mục đích sử dụng..." data-testid="input-use-note" />
              </div>
              <Button type="submit" className="w-full" disabled={txMutation.isPending} data-testid="button-submit-use">
                {txMutation.isPending ? "Đang xử lý..." : "Xác nhận sử dụng"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </ScrollArea>
  );
}
