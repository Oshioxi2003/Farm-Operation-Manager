import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sprout, LogIn, Loader2 } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
    } catch (err: any) {
      // apiRequest throws Error("statusCode: responseText")
      const msg = err?.message || "Đăng nhập thất bại";
      try {
        const parsed = JSON.parse(msg.substring(msg.indexOf("{")));
        setError(parsed.message || msg);
      } catch {
        setError(msg.includes(":") ? msg.split(": ").slice(1).join(": ") : msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-green-950 dark:via-emerald-950 dark:to-teal-950 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Sprout className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Hệ thống Quản lý Nông trại</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Đăng nhập để tiếp tục
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Tên đăng nhập</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập tên đăng nhập"
                required
                autoFocus
                data-testid="input-username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                required
                data-testid="input-password"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md p-2 text-center" data-testid="text-login-error">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading} data-testid="button-login">
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="mr-2 h-4 w-4" />
              )}
              Đăng nhập
            </Button>
          </form>

          <div className="mt-6 border-t pt-4">
            <p className="text-xs text-muted-foreground text-center mb-3">Tài khoản demo</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                className="rounded-md border p-2 text-left hover:bg-muted transition-colors"
                onClick={() => { setUsername("admin"); setPassword("admin123"); }}
                data-testid="button-demo-manager"
              >
                <p className="font-medium">👨‍💼 Quản lý</p>
                <p className="text-muted-foreground">admin / admin123</p>
              </button>
              <button
                type="button"
                className="rounded-md border p-2 text-left hover:bg-muted transition-colors"
                onClick={() => { setUsername("farmer1"); setPassword("farmer123"); }}
                data-testid="button-demo-farmer"
              >
                <p className="font-medium">👨‍🌾 Nông dân</p>
                <p className="text-muted-foreground">farmer1 / farmer123</p>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
