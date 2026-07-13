import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import smEliteLogo from "@/assets/sm-elite-hajj-logo.jpeg";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full min-w-0">
        <AppSidebar />
        <SidebarInset className="min-w-0 flex-1 overflow-x-hidden bg-background">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
            <SidebarTrigger className="h-9 w-9 shrink-0" />
            <img
              src={smEliteLogo}
              alt="SM Elite Hajj"
              className="h-8 w-8 rounded-lg object-cover shrink-0"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">S M Invoice</p>
              <p className="truncate text-[11px] text-muted-foreground">Invoice Software</p>
            </div>
          </header>
          <main className="min-w-0 flex-1 overflow-x-hidden">
            <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-4 sm:py-6 lg:px-8">
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
