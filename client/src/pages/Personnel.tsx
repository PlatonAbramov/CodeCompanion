import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, User, Calendar, Phone, Mail, Briefcase, AlertTriangle } from "lucide-react";
import { format, differenceInDays, differenceInYears, differenceInMonths } from "date-fns";
import { useLanguage } from "@/components/LanguageProvider";
import { useAuth } from "@/hooks/useAuth";
// import { PersonnelForm } from "@/components/PersonnelForm";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface Personnel {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth?: string;
  phone?: string;
  email?: string;
  emiratesId?: string;
  emiratesIdIssueDate?: string;
  emiratesIdExpiryDate?: string;
  specialization: string;
  startDate: string;
  salary?: string;
  status?: string;
  photoUrl?: string;
  documents?: PersonnelDocument[];
}

interface PersonnelDocument {
  id: string;
  documentType: string;
  expiryDate?: string;
}

export function Personnel() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [specializationFilter, setSpecializationFilter] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Personnel | null>(null);
  
  const isAdmin = user?.role === 'admin';
  const canView = user?.role === 'admin' || user?.role === 'director';
  
  // Call all hooks before any conditional returns
  const { data: personnel = [], isLoading } = useQuery<Personnel[]>({
    queryKey: ["/api/personnel"],
    enabled: canView,
  });
  
  // Calculate work experience
  const calculateExperience = (startDate: string) => {
    const start = new Date(startDate);
    const now = new Date();
    const years = differenceInYears(now, start);
    const months = differenceInMonths(now, start) % 12;
    
    if (years > 0) {
      return `${years} ${years === 1 ? 'год' : years < 5 ? 'года' : 'лет'} ${months > 0 ? `${months} мес.` : ''}`;
    }
    return `${months} мес.`;
  };
  
  // Calculate document status
  const getDocumentStatus = (person: Personnel) => {
    if (!person.documents || person.documents.length === 0) {
      return 'normal';
    }
    
    const criticalDocs = ['emirates_id', 'passport', 'visa', 'contract'];
    const now = new Date();
    let minDays = Infinity;
    
    // Check Emirates ID expiry from person data
    if (person.emiratesIdExpiryDate) {
      const days = differenceInDays(new Date(person.emiratesIdExpiryDate), now);
      if (days < minDays) minDays = days;
    }
    
    // Check documents
    person.documents.forEach(doc => {
      if (criticalDocs.includes(doc.documentType) && doc.expiryDate) {
        const days = differenceInDays(new Date(doc.expiryDate), now);
        if (days < minDays) minDays = days;
      }
    });
    
    if (minDays <= 0) return 'expired';
    if (minDays <= 14) return 'critical';
    if (minDays <= 30) return 'warning';
    return 'normal';
  };
  
  // Filter personnel
  const filteredPersonnel = useMemo(() => {
    return personnel.filter(person => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        person.firstName.toLowerCase().includes(searchLower) ||
        person.lastName.toLowerCase().includes(searchLower) ||
        (person.middleName && person.middleName.toLowerCase().includes(searchLower)) ||
        (person.emiratesId && person.emiratesId.toLowerCase().includes(searchLower));
      
      // Status filter
      const matchesStatus = statusFilter === 'all' || person.status === statusFilter;
      
      // Specialization filter
      const matchesSpecialization = specializationFilter === 'all' || 
        person.specialization === specializationFilter;
      
      return matchesSearch && matchesStatus && matchesSpecialization;
    });
  }, [personnel, searchQuery, statusFilter, specializationFilter]);
  
  // Get unique specializations
  const specializations = useMemo(() => {
    const specs = new Set(personnel.map(p => p.specialization));
    return Array.from(specs).sort();
  }, [personnel]);
  
  const handleEdit = (person: Personnel) => {
    // TODO: Implement personnel edit form
    console.log('Edit personnel form not yet implemented for:', person);
  };
  
  const handleCreate = () => {
    setSelectedPerson(null);
    setShowForm(true);
  };
  
  // Check access after all hooks
  if (!canView) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">Нет доступа к разделу "Персонал"</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Загрузка...</p>
      </div>
    );
  }
  
  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Персонал</h1>
        {isAdmin && (
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Добавить сотрудника
          </Button>
        )}
      </div>
      
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по ФИО, Emirates ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            {/* Status filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="active">Активен</SelectItem>
                <SelectItem value="dismissed">Уволен</SelectItem>
                <SelectItem value="vacation">Отпуск</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Specialization filter */}
            <Select value={specializationFilter} onValueChange={setSpecializationFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Специализация" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все специализации</SelectItem>
                {specializations.map(spec => (
                  <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Stats */}
            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">Всего:</span>
              <span className="font-medium">{filteredPersonnel.length}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Personnel Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPersonnel.map(person => {
          const docStatus = getDocumentStatus(person);
          const experience = calculateExperience(person.startDate);
          
          return (
            <Link key={person.id} href={`/personnel/${person.id}`}>
              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {person.photoUrl ? (
                        <img 
                          src={`/objects/${person.photoUrl.split('/').slice(-2).join('/')}`}
                          alt={`${person.lastName} ${person.firstName}`}
                          className="w-12 h-12 rounded-full object-cover"
                          onError={(e) => {
                            // Hide image and show placeholder on error
                            const target = e.currentTarget as HTMLImageElement;
                            target.style.display = 'none';
                            const nextElement = target.nextElementSibling as HTMLElement;
                            if (nextElement) {
                              nextElement.style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}
                      <div className={`w-12 h-12 rounded-full bg-muted flex items-center justify-center ${person.photoUrl ? 'hidden' : ''}`}>
                        <User className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="font-semibold">
                          {person.lastName} {person.firstName}
                          {person.middleName && ` ${person.middleName}`}
                        </h3>
                        <p className="text-sm text-muted-foreground">{person.specialization}</p>
                      </div>
                    </div>
                    {/* Document status indicator */}
                    {docStatus !== 'normal' && (
                      <Badge 
                        variant={docStatus === 'expired' ? 'destructive' : 'default'}
                        className={docStatus === 'warning' ? 'bg-yellow-500' : ''}
                      >
                        {docStatus === 'expired' && <AlertTriangle className="w-3 h-3 mr-1" />}
                        {docStatus === 'expired' ? 'Истёк' : 
                         docStatus === 'critical' ? '≤14 дней' : '≤30 дней'}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {/* Emirates ID */}
                  {person.emiratesId && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="font-medium">Emirates ID:</span>
                      <span>{person.emiratesId}</span>
                    </div>
                  )}
                  
                  {/* Emirates ID dates */}
                  {person.emiratesIdExpiryDate && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {person.emiratesIdIssueDate && 
                          `${format(new Date(person.emiratesIdIssueDate), 'dd.MM.yyyy')} - `}
                        {format(new Date(person.emiratesIdExpiryDate), 'dd.MM.yyyy')}
                      </span>
                    </div>
                  )}
                  
                  {/* Experience */}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Briefcase className="w-3 h-3" />
                    <span>Стаж: {experience}</span>
                  </div>
                  
                  {/* Salary */}
                  {person.salary && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">AED {parseFloat(person.salary).toLocaleString()}</span>
                    </div>
                  )}
                  
                  {/* Status */}
                  {person.status && person.status !== 'active' && (
                    <Badge variant={person.status === 'dismissed' ? 'destructive' : 'secondary'}>
                      {person.status === 'dismissed' ? 'Уволен' : 
                       person.status === 'vacation' ? 'Отпуск' : person.status}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
      
      {/* Empty state */}
      {filteredPersonnel.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              {searchQuery || statusFilter !== 'all' || specializationFilter !== 'all' 
                ? 'Сотрудники не найдены по заданным критериям'
                : 'Нет добавленных сотрудников'}
            </p>
          </CardContent>
        </Card>
      )}
      
      {/* Form Sheet */}
      {showForm && (
        <PersonnelForm
          person={selectedPerson}
          open={showForm}
          onClose={() => {
            setShowForm(false);
            setSelectedPerson(null);
          }}
          onSuccess={() => {
            setShowForm(false);
            setSelectedPerson(null);
            queryClient.invalidateQueries({ queryKey: ["/api/personnel"] });
          }}
        />
      )}
    </div>
  );
}