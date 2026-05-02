import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/components/LanguageProvider";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useLocation } from "wouter";
import { useEffect, lazy, Suspense } from "react";
import Login from "@/pages/Login";
import NotFound from "@/pages/not-found";
import { PageFallback } from "@/components/skeletons";

// Lazy-загружаемые страницы — каждая попадает в отдельный chunk
const DirectorDashboard = lazy(() => import("@/pages/DirectorDashboard"));
const MasterDashboard = lazy(() => import("@/pages/MasterDashboard"));
const ProjectDetail = lazy(() => import("@/pages/ProjectDetail"));
const AddExpense = lazy(() => import("@/pages/AddExpense"));
const AddAdvance = lazy(() => import("@/pages/AddAdvance"));
const AddCustomerAdvance = lazy(() => import("@/pages/AddCustomerAdvance"));
const AdvancesList = lazy(() => import("@/pages/AdvancesList"));
const CustomerAdvancesList = lazy(() => import("@/pages/CustomerAdvancesList"));
const AddRevenue = lazy(() => import("@/pages/AddRevenue"));
const RevenuesList = lazy(() => import("@/pages/RevenuesList"));
const EditRevenue = lazy(() => import("@/pages/EditRevenue"));
const EditAdvance = lazy(() => import("@/pages/EditAdvance"));
const EditCustomerAdvance = lazy(() => import("@/pages/EditCustomerAdvance"));
const EditExpense = lazy(() => import("@/pages/EditExpense"));
const ExpensesList = lazy(() => import("@/pages/ExpensesList"));
const MyExpenses = lazy(() => import("@/pages/MyExpenses"));
const CategoryExpenses = lazy(() => import("@/pages/CategoryExpenses"));
const EmployeeManagement = lazy(() => import("@/pages/EmployeeManagement"));
const OwnerInvestmentsList = lazy(() => import("@/pages/OwnerInvestmentsList"));
const AddOwnerInvestment = lazy(() => import("@/pages/AddOwnerInvestment"));
const EditOwnerInvestment = lazy(() => import("@/pages/EditOwnerInvestment"));
const Contractors = lazy(() => import("@/pages/Contractors"));
const ContractorDetail = lazy(() => import("@/pages/ContractorDetail"));
const EditContractorProject = lazy(() => import("@/pages/EditContractorProject"));
const Clients = lazy(() => import("@/pages/Clients"));
const ClientDetail = lazy(() => import("@/pages/ClientDetail"));
const Tools = lazy(() => import("@/pages/Tools"));
const AdminPanel = lazy(() => import("@/pages/AdminPanel"));
const PermissionsAndAccess = lazy(() => import("@/pages/PermissionsAndAccess"));
const ImplementationSheets = lazy(() => import("@/pages/ImplementationSheets"));
const ImplementationSheetView = lazy(() => import("@/pages/ImplementationSheetView"));
const Analytics = lazy(() => import("@/pages/Analytics"));
const History = lazy(() => import("@/pages/History"));
const ArchivedProjects = lazy(() => import("@/pages/ArchivedProjects"));
const MobileProjectsList = lazy(() => import("@/pages/MobileProjectsList"));
const Vehicles = lazy(() => import("@/pages/Vehicles"));
const VehicleDetail = lazy(() => import("@/pages/VehicleDetail"));
const PhotoControl = lazy(() => import("@/pages/PhotoControl"));
const TestClient = lazy(() => import("@/pages/TestClient"));
const ClientProjects = lazy(() => import("@/pages/ClientProjects"));
const WorkerDashboard = lazy(() => import("@/pages/WorkerDashboard"));
// Named exports — оборачиваем через .then
const Personnel = lazy(() =>
  import("@/pages/Personnel").then((m) => ({ default: m.Personnel })),
);
const PersonnelDetail = lazy(() =>
  import("@/pages/PersonnelDetail").then((m) => ({ default: m.PersonnelDetail })),
);

function AuthenticatedApp() {
  const { user, isLoading } = useAuth();
  const { hasAny, isLoading: permsLoading } = usePermissions();
  const [location, setLocation] = useLocation();
  // Для admin/director/master доступ к авто гарантирован ролью —
  // не ждём загрузки прав. Для worker/client — ждём, иначе редирект-эффект
  // успеет «выкинуть» с /vehicles до того, как придут эффективные права.
  const canAccessVehicles = !!user && (
    user.role === 'admin' || user.role === 'director' || user.role === 'master' ||
    hasAny('vehicles.view', 'vehicles.manage', 'vehicles.photo_control', 'vehicles.audit_log')
  );
  const canAccessPersonnel = !!user && (user.role === 'admin' || user.role === 'director' || hasAny('personnel.view', 'personnel.manage'));
  const canAccessExpensesPage = !!user && (
    user.role === 'admin' || user.role === 'director' || user.role === 'master' ||
    hasAny('expenses.view_all', 'expenses.view_own', 'expenses.create')
  );
  const permsReadyForVehicles =
    !user ||
    user.role === 'admin' || user.role === 'director' || user.role === 'master' ||
    !permsLoading;

  useEffect(() => {
    if (isLoading) return;
    // Не дёргаем редиректы, пока не подгрузились права (для worker/client),
    // иначе попытка зайти на /vehicles по прямой ссылке схлопнется в /worker.
    if (!permsReadyForVehicles) return;

    if (!user) {
      // User not authenticated, redirect to login only if not already there
      if (location !== '/login' && location !== '/') {
        setLocation('/login');
      }
      return;
    }

    // User is authenticated - redirect from root/login/invalid pages
    if (location === '/' || (location === '/login' && user)) {
      if (user.role === 'admin' || user.role === 'director') {
        setLocation('/director');
      } else if (user.role === 'master') {
        setLocation('/master');
      } else if (user.role === 'worker') {
        setLocation('/worker');
      } else if (user.role === 'client') {
        console.log('Redirecting client from', location, 'to /client-projects');
        setLocation('/client-projects');
      }
    }
    
    // For clients, allow access to implementation sheets, projects and vehicles
    // (vehicles only when admin granted vehicles.* override).
    if (user?.role === 'client' && 
        !location.startsWith('/client-projects') && 
        !location.startsWith('/projects/') && 
        !location.startsWith('/implementation-sheets/') &&
        !(canAccessVehicles && location.startsWith('/vehicles')) &&
        location !== '/' && 
        location !== '/login') {
      console.log('Redirecting client from', location, 'to /client-projects');
      setLocation('/client-projects');
    }

    // Для роли «Рабочий»: разрешено только список проектов, карточка проекта,
    // листы реализации, автомобили и расходы — если admin выдал
    // соответствующие персональные оверрайды (vehicles.*, personnel.view,
    // expenses.*). Без оверрайдов — редирект на /worker.
    if (user?.role === 'worker' &&
        location !== '/worker' &&
        !location.startsWith('/projects/') &&
        !location.startsWith('/implementation-sheets/') &&
        !(canAccessVehicles && location.startsWith('/vehicles')) &&
        !(canAccessPersonnel && location.startsWith('/personnel')) &&
        !(canAccessExpensesPage && (location === '/expenses' || location.startsWith('/add-expense') || location.startsWith('/edit-expense'))) &&
        location !== '/' &&
        location !== '/login') {
      console.log('Redirecting worker from', location, 'to /worker');
      setLocation('/worker');
    }
  }, [user, isLoading, location, setLocation, canAccessVehicles, permsReadyForVehicles]);

  if (isLoading) {
    return <div className="min-h-screen bg-slate-50" />;
  }

  if (!user) {
    return <Login />;
  }

  console.log('Current user:', user);
  console.log('Current location:', location);

  return (
    <Suspense fallback={<PageFallback />}>
      <Switch>
        <Route path="/client-projects" component={ClientProjects} />
        <Route path="/director" component={(user.role === 'admin' || user.role === 'director') ? DirectorDashboard : NotFound} />
        <Route path="/master" component={user.role === 'master' ? MasterDashboard : NotFound} />
        <Route path="/projects/:id">
          {user.role ? <ProjectDetail /> : <NotFound />}
        </Route>
        <Route path="/add-expense" component={AddExpense} />
        <Route path="/add-advance/:projectId" component={(user.role === 'admin' || user.role === 'director') ? AddAdvance : NotFound} />
        <Route path="/add-customer-advance/:projectId" component={(user.role === 'admin' || user.role === 'director') ? AddCustomerAdvance : NotFound} />
        <Route path="/advances/:projectId" component={AdvancesList} />
        <Route path="/customer-advances/:projectId" component={CustomerAdvancesList} />
        <Route path="/add-revenue" component={(user.role === 'admin' || user.role === 'director') ? AddRevenue : NotFound} />
        <Route path="/revenues/:projectId" component={RevenuesList} />
        <Route path="/edit-revenue/:projectId/:revenueId" component={(user.role === 'admin' || user.role === 'director') ? EditRevenue : NotFound} />
        <Route path="/edit-advance/:projectId/:advanceId" component={(user.role === 'admin' || user.role === 'director') ? EditAdvance : NotFound} />
        <Route path="/edit-customer-advance/:projectId/:advanceId" component={(user.role === 'admin' || user.role === 'director') ? EditCustomerAdvance : NotFound} />
        <Route path="/edit-expense/:projectId/:expenseId" component={EditExpense} />
        <Route path="/expenses" component={canAccessExpensesPage ? MyExpenses : NotFound} />
        <Route path="/expenses/:projectId" component={ExpensesList} />
        <Route path="/expenses/:projectId/:category" component={CategoryExpenses} />
        <Route path="/owner-investments/:projectId" component={OwnerInvestmentsList} />
        <Route path="/add-owner-investment/:projectId" component={(user.role === 'admin' || user.role === 'director') ? AddOwnerInvestment : NotFound} />
        <Route path="/edit-owner-investment/:id" component={(user.role === 'admin' || user.role === 'director') ? EditOwnerInvestment : NotFound} />
        <Route path="/employees" component={(user.role === 'admin' || user.role === 'director') ? EmployeeManagement : NotFound} />
        <Route path="/contractors" component={(user.role === 'admin' || user.role === 'director') ? Contractors : NotFound} />
        <Route path="/contractor/:id" component={(user.role === 'admin' || user.role === 'director') ? ContractorDetail : NotFound} />
        <Route path="/contractor/:contractorId/project/:assignmentId" component={(user.role === 'admin' || user.role === 'director') ? EditContractorProject : NotFound} />
        <Route path="/clients" component={(user.role === 'admin' || user.role === 'director') ? Clients : NotFound} />
        <Route path="/test-client" component={TestClient} />
        <Route path="/clients/:id" component={(user.role === 'admin' || user.role === 'director') ? ClientDetail : NotFound} />
        <Route path="/tools" component={(user.role === 'admin' || user.role === 'director' || user.role === 'master') ? Tools : NotFound} />
        <Route path="/personnel" component={canAccessPersonnel ? Personnel : NotFound} />
        <Route path="/personnel/:id" component={canAccessPersonnel ? PersonnelDetail : NotFound} />
        <Route path="/admin" component={user.role === 'admin' ? AdminPanel : NotFound} />
        <Route path="/permissions" component={user.role === 'admin' ? PermissionsAndAccess : NotFound} />
        <Route path="/projects/:projectId/implementation-sheets" component={ImplementationSheets} />
        <Route path="/implementation-sheets/:sheetId" component={ImplementationSheetView} />
        <Route path="/analytics" component={(user.role === 'admin' || user.role === 'director') ? Analytics : NotFound} />
        <Route path="/history/:projectId" component={(user.role === 'admin' || user.role === 'director') ? History : NotFound} />
        <Route path="/archived-projects" component={(user.role === 'admin' || user.role === 'director') ? ArchivedProjects : NotFound} />
        <Route path="/projects-list" component={(user.role === 'admin' || user.role === 'director') ? MobileProjectsList : NotFound} />
        <Route path="/vehicles" component={canAccessVehicles ? Vehicles : NotFound} />
        <Route path="/vehicles/:id/photo-control" component={canAccessVehicles ? PhotoControl : NotFound} />
        <Route path="/vehicles/:id" component={canAccessVehicles ? VehicleDetail : NotFound} />
        <Route path="/worker" component={user.role === 'worker' ? WorkerDashboard : NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
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
