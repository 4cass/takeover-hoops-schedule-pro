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
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Dashboard", icon: Home, value: "overview" },
  { title: "Calendar", icon: Calendar, value: "calendar" },
  { title: "Sessions", icon: ClipboardList, value: "sessions" },
  { title: "Attendance", icon: UserCheck, value: "attendance" },
  { title: "Players", icon: Users, value: "students" },
  { title: "Coaches", icon: BookOpen, value: "coaches" },
  { title: "Branches", icon: MapPin, value: "branches" },
];

interface AppSidebarProps {
  activeTab: string;
  onTabChange: (value: string) => void;
}

export function AppSidebar({ activeTab, onTabChange }: AppSidebarProps) {
  const { setOpen, isMobile } = useSidebar();

  const handleTabChange = (value: string) => {
    onTabChange(value);
    if (isMobile) {
      setOpen(false);
    }
  };

  return (
    <Sidebar className="border-r" style={{ backgroundColor: "#272828", color: "#272828" }}>
      <SidebarHeader className="p-6 border-b" style={{ backgroundColor: "#272828" }}>
        <div className="flex items-center gap-3">
          <div className="w-30 h-30  rounded-lg flex items-center justify-center">
            <img src="/1.png" alt="Logo" className="h-20 w-20 object-contain" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-xl font-bold tracking-tight text-white">Takeover Basketball</h2>
            <p className="text-sm text-white/80">Management System</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="pt-4">
        <SidebarGroup>
          <SidebarGroupLabel className="px-6 text-xs font-bold uppercase tracking-wider" style={{ color: "#757a86" }}>
            Navigation
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.value} className="mb-2">
                  <SidebarMenuButton
                    onClick={() => handleTabChange(item.value)}
                    isActive={activeTab === item.value}
                    className={`w-full justify-start py-3 px-6 rounded-lg transition-all duration-200 ${
                      activeTab === item.value
                        ? "bg-[#f97316] text-[#ececec] font-medium"
                        : "text-[#757a86] hover:bg-[#f97316] hover:text-[#ececec]"
                    }`}
                  >
                    <item.icon className="w-5 h-5 mr-3" />
                    <span className="text-sm">{item.title}</span>
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
