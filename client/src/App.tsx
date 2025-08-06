import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/components/LanguageProvider";
import { Layout } from "@/components/Layout";
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
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/login" component={Login} />
      <Route path="/director" component={DirectorDashboard} />
      <Route path="/master" component={MasterDashboard} />
      <Route path="/project/:id" component={ProjectDetail} />
      <Route path="/add-expense" component={AddExpense} />
      <Route path="/add-advance/:projectId" component={AddAdvance} />
      <Route path="/add-customer-advance/:projectId" component={AddCustomerAdvance} />
      <Route path="/advances/:projectId" component={AdvancesList} />
      <Route path="/customer-advances/:projectId" component={CustomerAdvancesList} />
      <Route path="/add-revenue" component={AddRevenue} />
      <Route path="/revenues/:projectId" component={RevenuesList} />
      <Route path="/edit-revenue/:projectId/:revenueId" component={EditRevenue} />
      <Route path="/edit-advance/:projectId/:advanceId" component={EditAdvance} />
      <Route path="/edit-customer-advance/:projectId/:advanceId" component={EditCustomerAdvance} />
      <Route path="/edit-expense/:projectId/:expenseId" component={EditExpense} />
      <Route path="/expenses/:projectId" component={ExpensesList} />
      <Route path="/expenses/:projectId/:category" component={CategoryExpenses} />
      <Route path="/employees" component={EmployeeManagement} />
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
            <Router />
          </Layout>
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
