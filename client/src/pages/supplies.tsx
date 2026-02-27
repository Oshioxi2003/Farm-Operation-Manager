import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Plus, Warehouse, AlertTriangle, Search, PackagePlus, ArrowDownToLine, ArrowUpFromLine,
} from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Supply, SupplyTransaction, Season } from "@shared/schema";

const statusConfig: Record<string, { label: string; color: string }> = {
  ok: { label: "Du", color: "bg-chart-2/15 text-chart-2" },
  low: { label: "Sap het", color: "bg-chart-3/15 text-chart-3" },
  out: { label: "Het", color: "bg-destructive/15 text-destructive" },
};

export default function Supplies() {
  const [openAdd, setOpenAdd] = useState(false);
  const [openTx, setOpenTx] = useState(false);
  const [search, setSearch] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const { toast } = useToast();

  const { data: supplies, isLoading } = useQuery<Supply[]>({ queryKey: ["/api/supplies"] });
  const { data: transactions } = useQuery<SupplyTransaction[]>({ queryKey: ["/api/supply-transactions"] });
  const { data: seasons } = useQuery<Season[]>({ queryKey: ["/api/seasons"] });

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/supplies", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supplies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setOpenAdd(false);
      toast({ title: "Thanh cong", description: "Da them vat tu" });
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
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setOpenTx(false);
      toast({ title: "Thanh cong", description: "Da cap nhat kho" });
    },
  });

  const filtered = supplies?.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.category?.toLowerCase().includes(search.toLowerCase());
    const matchLow = !lowOnly || s.status === "low" || s.status === "out";
    return matchSearch && matchLow;
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
      type: fd.get("type") as string,
      quantity: parseFloat(fd.get("quantity") as string),
      note: fd.get("note") as string,
    });
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Kho vat tu</h1>
            <p className="text-sm text-muted-foreground mt-1">Quan ly vat tu va theo doi ton kho</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Dialog open={openTx} onOpenChange={setOpenTx}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="button-add-transaction">
                  <PackagePlus className="mr-1 h-4 w-4" /> Nhap/Xuat kho
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nhap/Xuat kho</DialogTitle></DialogHeader>
                <form onSubmit={handleTxSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Vat tu *</Label>
                    <Select name="supplyId" required>
                      <SelectTrigger data-testid="select-tx-supply"><SelectValue placeholder="Chon vat tu" /></SelectTrigger>
                      <SelectContent>
                        {supplies?.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.currentStock} {s.unit})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Loai</Label>
                      <Select name="type" defaultValue="import">
                        <SelectTrigger data-testid="select-tx-type"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="import">Nhap kho</SelectItem>
                          <SelectItem value="export">Xuat kho</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="quantity">So luong *</Label>
                      <Input id="quantity" name="quantity" type="number" step="0.1" required data-testid="input-tx-quantity" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Mua vu (neu co)</Label>
                    <Select name="seasonId">
                      <SelectTrigger data-testid="select-tx-season"><SelectValue placeholder="Chon" /></SelectTrigger>
                      <SelectContent>
                        {seasons?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="note">Ghi chu</Label>
                    <Input id="note" name="note" data-testid="input-tx-note" />
                  </div>
                  <Button type="submit" className="w-full" disabled={txMutation.isPending} data-testid="button-submit-tx">
                    {txMutation.isPending ? "Dang xu ly..." : "Xac nhan"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
            <Dialog open={openAdd} onOpenChange={setOpenAdd}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-supply"><Plus className="mr-1 h-4 w-4" /> Them vat tu</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Them vat tu moi</DialogTitle></DialogHeader>
                <form onSubmit={handleAddSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="name">Ten *</Label>
                      <Input id="name" name="name" required data-testid="input-supply-name" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="category">Phan loai</Label>
                      <Input id="category" name="category" data-testid="input-supply-category" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="unit">Don vi *</Label>
                      <Input id="unit" name="unit" required placeholder="kg, goi, lit" data-testid="input-supply-unit" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="currentStock">Ton kho</Label>
                      <Input id="currentStock" name="currentStock" type="number" step="0.1" defaultValue="0" data-testid="input-supply-stock" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="minThreshold">Nguong thap</Label>
                      <Input id="minThreshold" name="minThreshold" type="number" step="0.1" defaultValue="0" data-testid="input-supply-threshold" />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-supply">
                    {createMutation.isPending ? "Dang luu..." : "Them vat tu"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tim kiem vat tu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search-supplies"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={lowOnly}
              onCheckedChange={setLowOnly}
              data-testid="switch-low-stock"
            />
            <Label className="text-sm cursor-pointer" onClick={() => setLowOnly(!lowOnly)}>Chi hien sap het</Label>
          </div>
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
                      <TableHead>Ten vat tu</TableHead>
                      <TableHead>Phan loai</TableHead>
                      <TableHead className="text-right">Ton kho</TableHead>
                      <TableHead className="text-right">Nguong</TableHead>
                      <TableHead>Trang thai</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((supply) => {
                      const cfg = statusConfig[supply.status || "ok"];
                      return (
                        <TableRow key={supply.id} data-testid={`row-supply-${supply.id}`}>
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
                        </TableRow>
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
            <p className="text-muted-foreground">Khong co vat tu nao</p>
          </div>
        )}

        {transactions && transactions.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Lich su nhap/xuat kho</h2>
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
                            {tx.type === "import" ? "Nhap" : "Xuat"} {tx.quantity} {supply?.unit} - {supply?.name}
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
    </ScrollArea>
  );
}
