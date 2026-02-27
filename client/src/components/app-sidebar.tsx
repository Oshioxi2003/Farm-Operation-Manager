import { useLocation, Link } from "wouter";
import {
  LayoutDashboard, Sprout, CalendarDays, ClipboardList,
  Warehouse, CloudSun, Users, ChevronDown,
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

const mainNav = [
  { title: "Tong quan", url: "/", icon: LayoutDashboard },
  { title: "Cay trong", url: "/crops", icon: Sprout },
];

const seasonNav = {
  title: "Mua vu",
  icon: CalendarDays,
  items: [
    { title: "Danh sach mua vu", url: "/seasons" },
    { title: "Tien do giai doan", url: "/seasons/progress" },
  ],
};

const taskNav = {
  title: "Cong viec",
  icon: ClipboardList,
  items: [
    { title: "Bang cong viec", url: "/tasks" },
    { title: "Nhat ky san xuat", url: "/work-logs" },
  ],
};

const otherNav = [
  { title: "Kho vat tu", url: "/supplies", icon: Warehouse },
  { title: "Khi hau", url: "/climate", icon: CloudSun },
  { title: "Nguoi dung", url: "/users", icon: Users },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Sprout className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold" data-testid="text-app-name">AgroManager</p>
            <p className="text-xs text-muted-foreground">Quan ly nong nghiep</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Chinh</SidebarGroupLabel>
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
          <SidebarGroupLabel>He thong</SidebarGroupLabel>
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
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-medium">
            NM
          </div>
          <div>
            <p className="text-sm font-medium" data-testid="text-current-user">Nguyen Van Minh</p>
            <p className="text-xs text-muted-foreground">Quan ly</p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
