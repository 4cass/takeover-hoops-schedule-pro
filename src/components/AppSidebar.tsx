
import { Calendar, Users, MapPin, UserCheck, BookOpen, ClipboardList, Home, LogOut } from "lucide-react";
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
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const menuItems = [
  { title: "Dashboard", icon: Home, value: "overview", roles: ['admin', 'coach'] },
  { title: "Calendar", icon: Calendar, value: "calendar", roles: ['admin', 'coach'] },
  { title: "Sessions", icon: ClipboardList, value: "sessions", roles: ['admin', 'coach'] },
  { title: "Attendance", icon: UserCheck, value: "attendance", roles: ['admin', 'coach'] },
  { title: "Players", icon: Users, value: "students", roles: ['admin', 'coach'] },
  { title: "Coaches", icon: BookOpen, value: "coaches", roles: ['admin'] }, // Admin only
  { title: "Branches", icon: MapPin, value: "branches", roles: ['admin'] }, // Admin only
];

interface AppSidebarProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  userRole?: 'admin' | 'coach' | null;
}

export function AppSidebar({ activeTab, onTabChange, userRole }: AppSidebarProps) {
  const { setOpen, isMobile } = useSidebar();
  const navigate = useNavigate();

  console.log("AppSidebar - userRole:", userRole); // Debug log
  console.log("AppSidebar - all menu items:", menuItems); // Debug log

  // Filter menu items based on user role
  const filteredMenuItems = menuItems.filter(item => {
    const hasAccess = userRole && item.roles.includes(userRole);
    console.log(`Menu item ${item.title} - userRole: ${userRole}, item.roles: ${item.roles}, hasAccess: ${hasAccess}`);
    return hasAccess;
  });

  console.log("AppSidebar - filtered menu items:", filteredMenuItems); // Debug log

  const handleTabChange = (value: string) => {
    onTabChange(value);
    if (isMobile) {
      setOpen(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error("Error signing out: " + error.message);
      } else {
        toast.success("Signed out successfully");
        navigate("/");
      }
    } catch (error) {
      toast.error("Unexpected error occurred");
    }
  };

  return (
    <Sidebar className="border-r" style={{ backgroundColor: "#272828", color: "#272828" }}>
      <SidebarHeader className="p-6 border-b" style={{ backgroundColor: "#272828" }}>
        <div className="flex items-center gap-3">
          <div className="w-30 h-30 rounded-lg flex items-center justify-center">
            <img src="/1.png" alt="Logo" className="h-20 w-20 object-contain" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-xl font-bold tracking-tight text-white">Takeover Basketball</h2>
            <p className="text-sm text-white/80">Management System</p>
            {userRole && (
              <p className="text-xs text-white/60 mt-1">Role: {userRole}</p>
            )}
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
              {filteredMenuItems.length === 0 && (
                <div className="px-6 py-4 text-white/60 text-sm">
                  No menu items available for role: {userRole || 'none'}
                </div>
              )}
              {filteredMenuItems.map((item) => (
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

      <SidebarFooter className="p-4 border-t" style={{ backgroundColor: "#272828" }}>
        <Button
          onClick={handleSignOut}
          variant="outline"
          className="w-full justify-start text-[#757a86] border-[#757a86] hover:bg-[#f97316] hover:text-[#ececec] hover:border-[#f97316]"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
