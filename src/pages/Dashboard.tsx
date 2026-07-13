import { useNavigate } from "react-router-dom";
import { DollarSign, AlertCircle, FileText, TrendingUp, CheckCircle, Clock, Percent, Loader2, Users, Building2, PieChart } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { CompanyRevenueItem } from "@/components/dashboard/CompanyRevenueItem";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { InvoiceStatusPieChart } from "@/components/dashboard/InvoiceStatusPieChart";
import { TopClientsChart } from "@/components/dashboard/TopClientsChart";
import { WeeklyTrendChart } from "@/components/dashboard/WeeklyTrendChart";
import { CompanyComparisonChart } from "@/components/dashboard/CompanyComparisonChart";
import { useCompanies } from "@/hooks/useCompanies";
import { useInvoices } from "@/hooks/useInvoices";
import { useMemo } from "react";

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: companies = [], isLoading: companiesLoading } = useCompanies();
  const { data: invoices = [], isLoading: invoicesLoading } = useInvoices();

  const isLoading = companiesLoading || invoicesLoading;

  const stats = useMemo(() => {
    const totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.paid_amount), 0);
    const totalDue = invoices.reduce((sum, inv) => sum + Number(inv.due_amount), 0);
    const totalInvoices = invoices.length;

    // Company revenue breakdown
    const companyRevenue = companies.map((company) => {
      const companyInvoices = invoices.filter((inv) => inv.company_id === company.id);
      const revenue = companyInvoices.reduce((sum, inv) => sum + Number(inv.paid_amount), 0);
      return {
        companyId: company.id,
        companyName: company.name,
        revenue,
      };
    }).filter((c) => c.revenue > 0);

    // Monthly revenue
    const monthlyData: { [key: string]: number } = {};
    invoices.forEach((inv) => {
      if (inv.installments) {
        inv.installments.forEach((inst) => {
          const date = new Date(inst.paid_date);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
          monthlyData[monthKey] = (monthlyData[monthKey] || 0) + Number(inst.amount);
        });
      }
    });

    const monthlyRevenue = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, revenue]) => ({
        month: new Date(month + "-01").toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        revenue,
      }));

    // Top clients by revenue
    const clientRevenue: { [key: string]: number } = {};
    invoices.forEach((inv) => {
      clientRevenue[inv.client_name] = (clientRevenue[inv.client_name] || 0) + Number(inv.paid_amount);
    });
    const topClients = Object.entries(clientRevenue)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, revenue]) => ({ name, revenue }));

    // Weekly trend (last 8 weeks)
    const weeklyData: { [key: string]: { revenue: number; invoices: number } } = {};
    const now = new Date();
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (i * 7));
      const weekKey = `W${8 - i}`;
      weeklyData[weekKey] = { revenue: 0, invoices: 0 };
    }
    
    invoices.forEach((inv) => {
      if (inv.installments) {
        inv.installments.forEach((inst) => {
          const instDate = new Date(inst.paid_date);
          const weeksAgo = Math.floor((now.getTime() - instDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
          if (weeksAgo >= 0 && weeksAgo < 8) {
            const weekKey = `W${8 - weeksAgo}`;
            if (weeklyData[weekKey]) {
              weeklyData[weekKey].revenue += Number(inst.amount);
            }
          }
        });
      }
    });

    const weeklyTrend = Object.entries(weeklyData).map(([week, data]) => ({
      week,
      revenue: data.revenue,
      invoices: data.invoices,
    }));

    // Company comparison data
    const companyComparison = companies.map((company) => {
      const companyInvoices = invoices.filter((inv) => inv.company_id === company.id);
      const paid = companyInvoices.reduce((sum, inv) => sum + Number(inv.paid_amount), 0);
      const due = companyInvoices.reduce((sum, inv) => sum + Number(inv.due_amount), 0);
      return {
        name: company.name,
        paid,
        due,
      };
    }).filter((c) => c.paid > 0 || c.due > 0);

    return { 
      totalRevenue, 
      totalDue, 
      totalInvoices, 
      companyRevenue, 
      monthlyRevenue,
      topClients,
      weeklyTrend,
      companyComparison,
    };
  }, [companies, invoices]);

  // Calculate additional metrics
  const paidInvoices = invoices.filter((inv) => inv.status === "paid").length;
  const partialInvoices = invoices.filter((inv) => inv.status === "partial").length;
  const unpaidInvoices = invoices.filter((inv) => inv.status === "unpaid").length;
  const collectionRate = stats.totalRevenue + stats.totalDue > 0 
    ? (stats.totalRevenue / (stats.totalRevenue + stats.totalDue)) * 100 
    : 0;
  const avgInvoiceValue = invoices.length > 0
    ? invoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0) / invoices.length
    : 0;

  const formatCurrency = (amount: number) => {
    return `৳${new Intl.NumberFormat("en-BD", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)}`;
  };

  const handleCompanyClick = (companyId: string) => {
    navigate(`/invoices?company=${companyId}`);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Overview of your invoice management
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 stagger-children">
          <StatCard
            title="Total Revenue"
            value={formatCurrency(stats.totalRevenue)}
            subtitle="From paid installments"
            icon={<DollarSign className="h-6 w-6" />}
            variant="revenue"
          />
          <StatCard
            title="Total Due"
            value={formatCurrency(stats.totalDue)}
            subtitle="Pending payments"
            icon={<AlertCircle className="h-6 w-6" />}
            variant="due"
          />
          <StatCard
            title="Total Invoices"
            value={stats.totalInvoices}
            subtitle="All time"
            icon={<FileText className="h-6 w-6" />}
            variant="invoices"
          />
        </div>

        {/* Revenue Summary Widget */}
        <div className="card-elevated p-6">
          <div className="flex items-center gap-2 mb-6">
            <DollarSign className="h-5 w-5 text-accent" />
            <h2 className="text-lg font-semibold text-foreground">
              Revenue Summary
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Percent className="h-4 w-4" />
                Collection Rate
              </div>
              <p className="text-2xl font-bold text-foreground">{collectionRate.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">Of total invoiced amount</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                Avg. Invoice Value
              </div>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(avgInvoiceValue)}</p>
              <p className="text-xs text-muted-foreground">Per invoice</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Paid Invoices
              </div>
              <p className="text-2xl font-bold text-green-600">{paidInvoices}</p>
              <p className="text-xs text-muted-foreground">Fully settled</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4 text-yellow-500" />
                Pending
              </div>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-2">
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-yellow-600">{partialInvoices}</p>
                  <span className="text-sm text-muted-foreground">partial</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-red-600">{unpaidInvoices}</p>
                  <span className="text-sm text-muted-foreground">unpaid</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Monthly Revenue Chart */}
          <div className="card-elevated p-6">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="h-5 w-5 text-accent" />
              <h2 className="text-lg font-semibold text-foreground">
                Monthly Revenue
              </h2>
            </div>
            <RevenueChart data={stats.monthlyRevenue} />
          </div>

          {/* Invoice Status Pie Chart */}
          <div className="card-elevated p-6">
            <div className="flex items-center gap-2 mb-6">
              <PieChart className="h-5 w-5 text-accent" />
              <h2 className="text-lg font-semibold text-foreground">
                Invoice Status Distribution
              </h2>
            </div>
            <InvoiceStatusPieChart 
              paid={paidInvoices} 
              partial={partialInvoices} 
              unpaid={unpaidInvoices} 
            />
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Top Clients Chart */}
          <div className="card-elevated p-6">
            <div className="flex items-center gap-2 mb-6">
              <Users className="h-5 w-5 text-accent" />
              <h2 className="text-lg font-semibold text-foreground">
                Top Clients by Revenue
              </h2>
            </div>
            <TopClientsChart data={stats.topClients} />
          </div>

          {/* Weekly Trend Chart */}
          <div className="card-elevated p-6">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="h-5 w-5 text-accent" />
              <h2 className="text-lg font-semibold text-foreground">
                Weekly Payment Trend
              </h2>
            </div>
            <WeeklyTrendChart data={stats.weeklyTrend} />
          </div>
        </div>

        {/* Charts Row 3 */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Company Comparison Chart */}
          <div className="card-elevated p-6">
            <div className="flex items-center gap-2 mb-6">
              <Building2 className="h-5 w-5 text-accent" />
              <h2 className="text-lg font-semibold text-foreground">
                Company Revenue Comparison
              </h2>
            </div>
            <CompanyComparisonChart data={stats.companyComparison} />
          </div>

          {/* Company Revenue Breakdown */}
          <div className="card-elevated p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-foreground">
                Company Revenue
              </h2>
              <p className="text-sm text-muted-foreground">
                Click to view income statement
              </p>
            </div>
            <div className="space-y-3">
              {stats.companyRevenue.length > 0 ? (
                stats.companyRevenue.map((company) => (
                  <CompanyRevenueItem
                    key={company.companyId}
                    name={company.companyName}
                    revenue={company.revenue}
                    percentage={
                      stats.totalRevenue > 0
                        ? (company.revenue / stats.totalRevenue) * 100
                        : 0
                    }
                    onClick={() => handleCompanyClick(company.companyId)}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No revenue data yet. Create invoices and record payments to see revenue breakdown.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
