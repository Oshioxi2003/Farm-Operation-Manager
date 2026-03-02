import { useLocation, Link } from "wouter";
import {
  LayoutDashboard, Sprout, CalendarDays, ClipboardList,
  Warehouse, CloudSun, Users, ChevronDown, LogOut, BookOpen,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, SidebarMenuSub, SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";

export function AppSidebar() {
  const [location] = useLocation();
  const { user, isManager, logout } = useAuth();

  const initials = user?.fullName
    ?.split(" ")
    .map(w => w[0])
    .slice(-2)
    .join("")
    .toUpperCase() || "??";

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Sprout className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold" data-testid="text-app-name">SmartFarm</p>
            <p className="text-xs text-muted-foreground">Quản lý nông nghiệp</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild data-active={location === "/"} data-testid="nav-dashboard">
                  <Link href="/">
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Tổng quan</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild data-active={location === "/crops" || location.startsWith("/crops/")} data-testid="nav-crops">
                  <Link href="/crops">
                    <Sprout className="h-4 w-4" />
                    <span>Cây trồng</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <Collapsible defaultOpen className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton data-testid="nav-seasons-group">
                      <CalendarDays className="h-4 w-4" />
                      <span>Mùa vụ</span>
                      <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild data-active={location === "/seasons"} data-testid="nav-seasons">
                          <Link href="/seasons">Danh sách mùa vụ</Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild data-active={location === "/seasons/progress"} data-testid="nav-seasons-progress">
                          <Link href="/seasons/progress">Tiến độ giai đoạn</Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              <Collapsible defaultOpen className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton data-testid="nav-tasks-group">
                      <ClipboardList className="h-4 w-4" />
                      <span>Công việc</span>
                      <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild data-active={location === "/tasks"} data-testid="nav-tasks">
                          <Link href="/tasks">Bảng công việc</Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild data-active={location === "/work-logs"} data-testid="nav-work-logs">
                          <Link href="/work-logs">Nhật ký sản xuất</Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              <SidebarMenuItem>
                <SidebarMenuButton asChild data-active={location === "/supplies" || location.startsWith("/supplies/")} data-testid="nav-supplies">
                  <Link href="/supplies">
                    <Warehouse className="h-4 w-4" />
                    <span>Kho vật tư</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild data-active={location === "/climate" || location.startsWith("/climate/")} data-testid="nav-climate">
                  <Link href="/climate">
                    <CloudSun className="h-4 w-4" />
                    <span>Khí hậu</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {isManager && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild data-active={location === "/users" || location.startsWith("/users/")} data-testid="nav-users">
                    <Link href="/users">
                      <Users className="h-4 w-4" />
                      <span>Người dùng</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-medium shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" data-testid="text-current-user">{user?.fullName}</p>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {isManager ? "Quản lý" : "Nông dân"}
            </Badge>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 shrink-0"
            onClick={logout}
            data-testid="button-logout"
            title="Đăng xuất"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
