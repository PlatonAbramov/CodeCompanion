export type Language = 'ru' | 'en' | 'hi';

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
    advances: 'Авансы',
    profit: 'Прибыль',
    totalExpenses: 'Общие расходы',
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
    confirmDelete: 'Вы уверены, что хотите удалить этот документ?',
    success: 'Успешно',
    documentUploaded: 'Документ загружен успешно',
    documentDeleted: 'Документ удален успешно',
    uploadFailed: 'Не удалось загрузить документ',
    deleteFailed: 'Не удалось удалить документ',
    
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
    
    // Language
    language: 'Язык',
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
    advances: 'Advances',
    profit: 'Profit',
    totalExpenses: 'Total Expenses',
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
    confirmDelete: 'Are you sure you want to delete this document?',
    success: 'Success',
    documentUploaded: 'Document uploaded successfully',
    documentDeleted: 'Document deleted successfully',
    uploadFailed: 'Failed to upload document',
    deleteFailed: 'Failed to delete document',
    
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
    
    // Language
    language: 'Language',
  },
  hi: {
    // Common
    loading: 'लोड हो रहा है...',
    save: 'सहेजें',
    cancel: 'रद्द करें',
    delete: 'हटाएं',
    edit: 'संपादित करें',
    create: 'बनाएं',
    back: 'वापस',

    // Auth
    login: 'लॉगिन',
    logout: 'लॉगआउट',
    username: 'उपयोगकर्ता नाम',
    password: 'पासवर्ड',
    loginTitle: 'कंस्ट्रक्शन ट्रैकर',
    loginSubtitle: 'परियोजना प्रबंधन प्रणाली',
    loginError: 'गलत उपयोगकर्ता नाम या पासवर्ड',

    // Navigation
    home: 'मुख्य पृष्ठ',
    projects: 'परियोजनाएं',
    employees: 'कर्मचारी',
    reports: 'रिपोर्ट',
    expenses: 'खर्च',
    add: 'जोड़ें',

    // Roles
    director: 'निदेशक',
    master: 'मास्टर',

    // Projects
    activeProjects: 'सक्रिय परियोजनाएं',
    totalProfit: 'कुल लाभ',
    createProject: 'नई परियोजना बनाएं',
    projectName: 'परियोजना का नाम',
    projectLocation: 'पता',
    totalCost: 'कुल लागत',
    startDate: 'आरंभ तिथि',
    endDate: 'समाप्ति तिथि',
    status: 'स्थिति',
    active: 'चालू',
    completed: 'पूर्ण',
    paused: 'रोका गया',

    // Financial
    revenue: 'आय',
    advance: 'अग्रिम',
    advances: 'अग्रिम भुगतान',
    profit: 'लाभ',
    totalExpenses: 'कुल खर्च',
    financialSummary: 'वित्तीय सारांश',
    exportPDF: 'PDF में निर्यात करें',

    // Expenses
    addExpense: 'खर्च जोड़ें',
    myExpenses: 'मेरे खर्च',
    recentExpenses: 'हाल के खर्च',
    amount: 'राशि',
    category: 'श्रेणी',
    description: 'विवरण',
    receipt: 'रसीद',
    materials: 'सामग्री',
    tools: 'औज़ार',
    transport: 'परिवहन',
    services: 'सेवाएं',
    other: 'अन्य',
    receiptRequired: 'रसीद या दस्तावेज़',
    attachFile: 'फ़ाइल संलग्न करें',

    // Documents
    documents: 'दस्तावेज़',
    addDocument: 'जोड़ें',
    confirmDelete: 'क्या आप वाकई इस दस्तावेज़ को हटाना चाहते हैं?',
    success: 'सफल',
    documentUploaded: 'दस्तावेज़ सफलतापूर्वक अपलोड किया गया',
    documentDeleted: 'दस्तावेज़ सफलतापूर्वक हटाया गया',
    uploadFailed: 'दस्तावेज़ अपलोड नहीं हो सका',
    deleteFailed: 'दस्तावेज़ हटाया नहीं जा सका',

    // Employees
    addEmployee: 'कर्मचारी जोड़ें',
    employeeName: 'कर्मचारी का नाम',
    role: 'भूमिका',
    lastLogin: 'अंतिम लॉगिन',

    // Messages
    loginSuccess: 'सफलतापूर्वक लॉगिन हुआ',
    logoutSuccess: 'सफलतापूर्वक लॉगआउट हुआ',
    projectCreated: 'परियोजना बनाई गई',
    expenseAdded: 'खर्च जोड़ा गया',
    employeeCreated: 'कर्मचारी जोड़ा गया',
    error: 'एक त्रुटि हुई',

    // Language
    language: 'भाषा',
  },
};
