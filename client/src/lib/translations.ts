export type Language = 'ru' | 'en';

export const translations = {
  ru: {
    // Common
    loading: 'Загрузка...',
    save: 'Сохранить',
    cancel: 'Отмена',
    delete: 'Удалить',
    edit: 'Редактировать',
    create: 'Создать',
    back: 'Назад',
    
    // Auth
    login: 'Войти',
    logout: 'Выйти',
    username: 'Логин',
    password: 'Пароль',
    loginTitle: 'СтройТрекер',
    loginSubtitle: 'Система управления проектами',
    loginError: 'Неверный логин или пароль',
    
    // Navigation
    home: 'Главная',
    projects: 'Проекты',
    employees: 'Сотрудники',
    reports: 'Отчеты',
    expenses: 'Расходы',
    add: 'Добавить',
    
    // Roles
    director: 'Директор',
    master: 'Мастер',
    
    // Projects
    activeProjects: 'Активных проектов',
    totalProfit: 'Общая прибыль',
    createProject: 'Создать проект',
    projectName: 'Название проекта',
    projectLocation: 'Адрес',
    totalCost: 'Общая стоимость',
    startDate: 'Дата начала',
    endDate: 'Срок завершения',
    status: 'Статус',
    active: 'В работе',
    completed: 'Завершен',
    paused: 'Приостановлен',
    
    // Financial
    revenue: 'Доход',
    advance: 'Аванс',
    profit: 'Прибыль',
    financialSummary: 'Финансовая сводка',
    exportPDF: 'Экспорт в PDF',
    
    // Expenses
    addExpense: 'Добавить расход',
    myExpenses: 'Мои расходы',
    recentExpenses: 'Последние расходы',
    amount: 'Сумма',
    category: 'Категория',
    description: 'Описание',
    receipt: 'Чек',
    materials: 'Материалы',
    tools: 'Инструменты',
    transport: 'Транспорт',
    services: 'Услуги',
    other: 'Прочее',
    receiptRequired: 'Чек или документ',
    attachFile: 'Добавить файл',
    
    // Documents
    documents: 'Документы',
    addDocument: 'Добавить',
    
    // Employees
    addEmployee: 'Добавить сотрудника',
    employeeName: 'Имя сотрудника',
    role: 'Роль',
    lastLogin: 'Последний вход',
    
    // Messages
    loginSuccess: 'Вход выполнен успешно',
    logoutSuccess: 'Выход выполнен успешно',
    projectCreated: 'Проект создан',
    expenseAdded: 'Расход добавлен',
    employeeCreated: 'Сотрудник добавлен',
    error: 'Произошла ошибка',
  },
  en: {
    // Common
    loading: 'Loading...',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    create: 'Create',
    back: 'Back',
    
    // Auth
    login: 'Login',
    logout: 'Logout',
    username: 'Username',
    password: 'Password',
    loginTitle: 'ConstructionTracker',
    loginSubtitle: 'Project Management System',
    loginError: 'Invalid username or password',
    
    // Navigation
    home: 'Home',
    projects: 'Projects',
    employees: 'Employees',
    reports: 'Reports',
    expenses: 'Expenses',
    add: 'Add',
    
    // Roles
    director: 'Director',
    master: 'Master',
    
    // Projects
    activeProjects: 'Active Projects',
    totalProfit: 'Total Profit',
    createProject: 'Create Project',
    projectName: 'Project Name',
    projectLocation: 'Location',
    totalCost: 'Total Cost',
    startDate: 'Start Date',
    endDate: 'End Date',
    status: 'Status',
    active: 'Active',
    completed: 'Completed',
    paused: 'Paused',
    
    // Financial
    revenue: 'Revenue',
    advance: 'Advance',
    profit: 'Profit',
    financialSummary: 'Financial Summary',
    exportPDF: 'Export to PDF',
    
    // Expenses
    addExpense: 'Add Expense',
    myExpenses: 'My Expenses',
    recentExpenses: 'Recent Expenses',
    amount: 'Amount',
    category: 'Category',
    description: 'Description',
    receipt: 'Receipt',
    materials: 'Materials',
    tools: 'Tools',
    transport: 'Transport',
    services: 'Services',
    other: 'Other',
    receiptRequired: 'Receipt or Document',
    attachFile: 'Attach File',
    
    // Documents
    documents: 'Documents',
    addDocument: 'Add',
    
    // Employees
    addEmployee: 'Add Employee',
    employeeName: 'Employee Name',
    role: 'Role',
    lastLogin: 'Last Login',
    
    // Messages
    loginSuccess: 'Login successful',
    logoutSuccess: 'Logout successful',
    projectCreated: 'Project created',
    expenseAdded: 'Expense added',
    employeeCreated: 'Employee created',
    error: 'An error occurred',
  },
};
