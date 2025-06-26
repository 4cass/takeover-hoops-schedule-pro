
import { Calendar, Users, MapPin, UserCheck, BookOpen, ClipboardList, Home } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const menuItems = [
  {
    title: "Dashboard",
    icon: Home,
    value: "overview"
  },
  {
    title: "Sessions",
    icon: Calendar,
    value: "sessions"
  },
  {
    title: "Attendance",
    icon: UserCheck,
    value: "attendance"
  },
  {
    title: "Students",
    icon: Users,
    value: "students"
  },
  {
    title: "Coaches",
    icon: BookOpen,
    value: "coaches"
  },
  {
    title: "Branches",
    icon: MapPin,
    value: "branches"
  },
  {
    title: "Reports",
    icon: ClipboardList,
    value: "reports"
  }
];

interface AppSidebarProps {
  activeTab: string;
  onTabChange: (value: string) => void;
}

export function AppSidebar({ activeTab, onTabChange }: AppSidebarProps) {
  return (
    <Sidebar>
      <SidebarHeader className="p-6">
        <div className="flex flex-col">
          <h2 className="text-lg font-bold text-sidebar-foreground">Takeover Basketball</h2>
          <p className="text-sm text-sidebar-foreground/70">Management System</p>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.value}>
                  <SidebarMenuButton 
                    onClick={() => onTabChange(item.value)}
                    isActive={activeTab === item.value}
                    className="w-full justify-start"
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
