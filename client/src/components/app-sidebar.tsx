import { useLocation, Link } from "wouter";
import {
  LayoutDashboard, Sprout, CalendarDays, ClipboardList,
  Warehouse, CloudSun, Users, ChevronDown, LogOut,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, SidebarMenuSub, SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";

const mainNav = [
  { title: "Tổng quan", url: "/", icon: LayoutDashboard },
  { title: "Cây trồng", url: "/crops", icon: Sprout },
];

const seasonNav = {
  title: "Mùa vụ",
  icon: CalendarDays,
  items: [
    { title: "Danh sách mùa vụ", url: "/seasons" },
    { title: "Tiến độ giai đoạn", url: "/seasons/progress" },
  ],
};

const taskNav = {
  title: "Công việc",
  icon: ClipboardList,
  items: [
    { title: "Bảng công việc", url: "/tasks" },
    { title: "Nhật ký sản xuất", url: "/work-logs" },
  ],
};

export function AppSidebar() {
  const [location] = useLocation();
  const { user, isManager, logout } = useAuth();

  const otherNav = [
    { title: "Kho vật tư", url: "/supplies", icon: Warehouse },
    { title: "Khí hậu", url: "/climate", icon: CloudSun },
    ...(isManager ? [{ title: "Người dùng", url: "/users", icon: Users }] : []),
  ];

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
            <p className="text-sm font-semibold" data-testid="text-app-name">AgroManager</p>
            <p className="text-xs text-muted-foreground">Quản lý nông nghiệp</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Chính</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild data-active={location === item.url} data-testid={`nav-${item.url.replace("/", "") || "dashboard"}`}>
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              <Collapsible defaultOpen className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton data-testid="nav-seasons-group">
                      <seasonNav.icon className="h-4 w-4" />
                      <span>{seasonNav.title}</span>
                      <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {seasonNav.items.map((item) => (
                        <SidebarMenuSubItem key={item.url}>
                          <SidebarMenuSubButton asChild data-active={location === item.url} data-testid={`nav-${item.url.replace("/", "").replace("/", "-")}`}>
                            <Link href={item.url}>{item.title}</Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              <Collapsible defaultOpen className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton data-testid="nav-tasks-group">
                      <taskNav.icon className="h-4 w-4" />
                      <span>{taskNav.title}</span>
                      <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {taskNav.items.map((item) => (
                        <SidebarMenuSubItem key={item.url}>
                          <SidebarMenuSubButton asChild data-active={location === item.url} data-testid={`nav-${item.url.replace("/", "").replace("/", "-")}`}>
                            <Link href={item.url}>{item.title}</Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Hệ thống</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {otherNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild data-active={location === item.url || location.startsWith(item.url + "/")} data-testid={`nav-${item.url.replace("/", "")}`}>
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
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
