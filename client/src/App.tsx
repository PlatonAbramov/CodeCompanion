import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/components/LanguageProvider";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import Login from "@/pages/Login";
import DirectorDashboard from "@/pages/DirectorDashboard";
import MasterDashboard from "@/pages/MasterDashboard";
import ProjectDetail from "@/pages/ProjectDetail";
import AddExpense from "@/pages/AddExpense";
import AddAdvance from "@/pages/AddAdvance";
import AddCustomerAdvance from "@/pages/AddCustomerAdvance";
import AdvancesList from "@/pages/AdvancesList";
import CustomerAdvancesList from "@/pages/CustomerAdvancesList";
import AddRevenue from "@/pages/AddRevenue";
import RevenuesList from "@/pages/RevenuesList";
import EditRevenue from "@/pages/EditRevenue";
import EditAdvance from "@/pages/EditAdvance";
import EditCustomerAdvance from "@/pages/EditCustomerAdvance";
import EditExpense from "@/pages/EditExpense";
import ExpensesList from "@/pages/ExpensesList";
import CategoryExpenses from "@/pages/CategoryExpenses";
import EmployeeManagement from "@/pages/EmployeeManagement";
import OwnerInvestmentsList from "@/pages/OwnerInvestmentsList";
import AddOwnerInvestment from "@/pages/AddOwnerInvestment";
import EditOwnerInvestment from "@/pages/EditOwnerInvestment";
import Contractors from "@/pages/Contractors";
import ContractorDetail from "@/pages/ContractorDetail";
import EditContractorProject from "@/pages/EditContractorProject";
import Clients from "@/pages/Clients";
import ClientDetail from "@/pages/ClientDetail";
import Tools from "@/pages/Tools";
import AdminPanel from "@/pages/AdminPanel";
import NotFound from "@/pages/not-found";

function AuthenticatedApp() {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      // User not authenticated, redirect to login only if not already there
      if (location !== '/login' && location !== '/') {
        setLocation('/login');
      }
      return;
    }

    // User is authenticated - only redirect from root/login if user just loaded the page
    // Don't redirect if already on valid pages (handled by individual auth in useAuth hook)
    if (location === '/' || (location === '/login' && user)) {
      if (user.role === 'director') {
        setLocation('/director');
      } else if (user.role === 'master') {
        setLocation('/master');
      }
    }
  }, [user, isLoading, location, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-500">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <Switch>
      <Route path="/director" component={user.role === 'director' ? DirectorDashboard : () => { setLocation(user.role === 'master' ? '/master' : '/login'); return null; }} />
      <Route path="/master" component={user.role === 'master' ? MasterDashboard : () => { setLocation(user.role === 'director' ? '/director' : '/login'); return null; }} />
      <Route path="/project/:id" component={ProjectDetail} />
      <Route path="/add-expense" component={AddExpense} />
      <Route path="/add-advance/:projectId" component={user.role === 'director' ? AddAdvance : () => { setLocation('/director'); return null; }} />
      <Route path="/add-customer-advance/:projectId" component={user.role === 'director' ? AddCustomerAdvance : () => { setLocation('/director'); return null; }} />
      <Route path="/advances/:projectId" component={AdvancesList} />
      <Route path="/customer-advances/:projectId" component={CustomerAdvancesList} />
      <Route path="/add-revenue" component={user.role === 'director' ? AddRevenue : () => { setLocation('/director'); return null; }} />
      <Route path="/revenues/:projectId" component={RevenuesList} />
      <Route path="/edit-revenue/:projectId/:revenueId" component={user.role === 'director' ? EditRevenue : () => { setLocation('/director'); return null; }} />
      <Route path="/edit-advance/:projectId/:advanceId" component={user.role === 'director' ? EditAdvance : () => { setLocation('/director'); return null; }} />
      <Route path="/edit-customer-advance/:projectId/:advanceId" component={user.role === 'director' ? EditCustomerAdvance : () => { setLocation('/director'); return null; }} />
      <Route path="/edit-expense/:projectId/:expenseId" component={EditExpense} />
      <Route path="/expenses/:projectId" component={ExpensesList} />
      <Route path="/expenses/:projectId/:category" component={CategoryExpenses} />
      <Route path="/owner-investments/:projectId" component={OwnerInvestmentsList} />
      <Route path="/add-owner-investment/:projectId" component={user.role === 'director' ? AddOwnerInvestment : () => { setLocation('/director'); return null; }} />
      <Route path="/edit-owner-investment/:id" component={user.role === 'director' ? EditOwnerInvestment : () => { setLocation('/director'); return null; }} />
      <Route path="/employees" component={user.role === 'director' ? EmployeeManagement : () => { setLocation('/director'); return null; }} />
      <Route path="/contractors" component={user.role === 'director' ? Contractors : () => { setLocation('/director'); return null; }} />
      <Route path="/contractor/:id" component={user.role === 'director' ? ContractorDetail : () => { setLocation('/director'); return null; }} />
      <Route path="/contractor/:contractorId/project/:assignmentId" component={user.role === 'director' ? EditContractorProject : () => { setLocation('/director'); return null; }} />
      <Route path="/clients" component={user.role === 'director' ? Clients : () => { setLocation('/director'); return null; }} />
      <Route path="/clients/:id" component={user.role === 'director' ? ClientDetail : () => { setLocation('/director'); return null; }} />
      <Route path="/tools" component={user.role === 'director' ? Tools : () => { setLocation('/director'); return null; }} />
      <Route path="/admin" component={(user?.email === 'platonabramov90@gmail.com' || user?.username === 'platonabramov90') ? AdminPanel : () => { setLocation('/director'); return null; }} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <Layout>
            <Toaster />
            <AuthenticatedApp />
          </Layout>
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;