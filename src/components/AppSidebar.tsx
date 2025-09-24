import { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  MessageSquare, 
  BookOpen, 
  Activity, 
  LogOut, 
  User,
  Home,
  Settings,
  Trophy
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

type SkillLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

interface Profile {
  full_name: string | null;
  skill_level: SkillLevel;
  email: string;
}

const navigationItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Start Conversation", url: "#conversation", icon: MessageSquare },
  { title: "Practice List", url: "#practice", icon: BookOpen },
  { title: "Recent Activity", url: "#activity", icon: Activity },
  { title: "Progress", url: "#progress", icon: Trophy },
  { title: "Settings", url: "#settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      
      setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
  };

  const getSkillLevelColor = (level: SkillLevel) => {
    const colors = {
      A1: "bg-destructive",
      A2: "bg-orange-500",
      B1: "bg-yellow-500",
      B2: "bg-green-500",
      C1: "bg-blue-500",
      C2: "bg-purple-500"
    };
    return colors[level];
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'space-x-3'} p-4`}>
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {profile && getInitials(profile.full_name, profile.email)}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1">
              <p className="text-sm font-medium truncate">
                {profile?.full_name || "Learner"}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Badge 
                  className={`${profile ? getSkillLevelColor(profile.skill_level) : ''} text-white text-xs`}
                >
                  {profile?.skill_level || "B1"}
                </Badge>
              </div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                const isActive = location.pathname === item.url || 
                               (item.url.startsWith('#') && location.pathname === '/dashboard');
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild
                      className={isActive ? "bg-secondary" : ""}
                    >
                      <a 
                        href={item.url}
                        className="flex items-center gap-3 cursor-pointer"
                      >
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <Button 
          variant="ghost" 
          onClick={handleLogout}
          className="w-full justify-start"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-3">Logout</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}