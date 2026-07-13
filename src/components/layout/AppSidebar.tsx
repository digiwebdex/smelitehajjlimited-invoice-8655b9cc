import { useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { Home, Building2, FileText, Menu, LogOut, Shield, Download, LayoutTemplate } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import smEliteLogo from "@/assets/sm-elite-hajj-logo.jpeg";
import { generateBrochurePdf } from "@/lib/generateBrochurePdf";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const baseNavItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Companies", url: "/companies", icon: Building2 },
  { title: "Invoices", url: "/invoices", icon: FileText },
];

const adminNavItems = [
  { title: "Admin Panel", url: "/admin", icon: Shield },
  { title: "Invoice Layout", url: "/admin/invoice-layout", icon: LayoutTemplate },
];

export function AppSidebar() {
  const location = useLocation();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const { user, logout } = useAuth();
  const { isAdmin } = useAdmin();
  const isCollapsed = state === "collapsed";

  const navItems = isAdmin ? [...baseNavItems, ...adminNavItems] : baseNavItems;

  useEffect(() => {
    if (isMobile) setOpenMobile(false);
  }, [location.pathname, isMobile, setOpenMobile]);

  return (
    <Sidebar
      className={cn(
        "border-r-0 transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
      collapsible="icon"
    >
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <img
            src={smEliteLogo}
            alt="SM Elite Hajj Logo"
            className="h-9 w-9 rounded-lg object-cover shrink-0"
          />
          {!isCollapsed && (
            <div className="animate-fade-in min-w-0">
              <h1 className="text-base font-semibold text-sidebar-accent-foreground truncate">
                S M Invoice
              </h1>
              <p className="text-xs text-sidebar-foreground truncate">Invoice Software</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="p-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className={cn(
                        "h-11 rounded-lg transition-all duration-200",
                        isActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <Link to={item.url} className="flex items-center gap-3">
                        <item.icon className="h-5 w-5 shrink-0" />
                        {!isCollapsed && <span className="font-medium">{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <div className="mt-auto border-t border-sidebar-border p-3 space-y-2">
        <button
          onClick={generateBrochurePdf}
          className={cn(
            "flex items-center gap-2 h-10 w-full rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors",
            isCollapsed ? "justify-center" : "px-3"
          )}
          title="Download Software Brochure"
        >
          <Download className="h-4 w-4 shrink-0" />
          {!isCollapsed && <span className="text-sm font-medium">Download Brochure</span>}
        </button>

        {user && (
          <div
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded-lg bg-sidebar-accent/50",
              isCollapsed && "justify-center"
            )}
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground text-xs font-semibold shrink-0">
              {(user.full_name || user.email || "U").charAt(0).toUpperCase()}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-sidebar-accent-foreground truncate">
                  {user.full_name || "User"}
                </p>
                <p className="text-[10px] text-sidebar-foreground truncate">{user.email}</p>
              </div>
            )}
          </div>
        )}

        <button
          onClick={logout}
          className={cn(
            "flex items-center gap-2 h-10 w-full rounded-lg text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive transition-colors",
            isCollapsed ? "justify-center" : "px-3"
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!isCollapsed && <span className="text-sm font-medium">Sign Out</span>}
        </button>

        <SidebarTrigger className="hidden md:flex h-10 w-full justify-center rounded-lg bg-sidebar-accent text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
          <Menu className="h-5 w-5" />
          {!isCollapsed && <span className="ml-2">Collapse</span>}
        </SidebarTrigger>
      </div>
    </Sidebar>
  );
}
