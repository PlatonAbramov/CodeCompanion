import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

interface Project {
  id: string;
  name: string;
}

interface ParsedExpenseData {
  projectName: string;
  projectId?: string;
  amount: number;
  category: string;
  description?: string;
  personName?: string;
  confidence: number;
}

const EXPENSE_CATEGORIES = {
  materials: ['материалы', 'материал', 'стройматериалы', 'двери', 'окна', 'плитка', 'краска', 'цемент', 'песок', 'кирпич', 'трубы', 'провода', 'кабель', 'сантехника', 'электрика'],
  labor: ['работа', 'работы', 'монтаж', 'установка', 'ремонт', 'услуги', 'мастер', 'рабочие', 'зарплата', 'оплата'],
  transport: ['транспорт', 'доставка', 'перевозка', 'такси', 'бензин', 'топливо', 'машина', 'грузовик', 'горючее'],
  equipment: ['оборудование', 'инструменты', 'инструмент', 'техника', 'станок', 'аппарат'],
  other: ['прочее', 'другое', 'разное', 'прочие', 'расходы', 'расход', 'траты', 'потратил', 'потрачено']
};

function findBestMatchingProject(projectName: string, projects: Project[]): Project | undefined {
  const normalizedInput = projectName.toLowerCase().trim();
  
  // Сначала ищем точное совпадение
  let bestMatch = projects.find(p => p.name.toLowerCase() === normalizedInput);
  
  if (!bestMatch) {
    // Ищем частичное совпадение
    bestMatch = projects.find(p => 
      p.name.toLowerCase().includes(normalizedInput) || 
      normalizedInput.includes(p.name.toLowerCase())
    );
  }
  
  if (!bestMatch) {
    // Ищем по первым буквам или похожим словам
    bestMatch = projects.find(p => {
      const projectWords = p.name.toLowerCase().split(/\s+/);
      const inputWords = normalizedInput.split(/\s+/);
      
      return projectWords.some(pw => 
        inputWords.some(iw => {
          // Убираем короткие слова и цифры для лучшего поиска
          if (iw.length < 3 || /^\d+$/.test(iw)) return false;
          
          return (
            pw.startsWith(iw) || iw.startsWith(pw) || 
            (pw.length > 3 && (
              pw.includes(iw) || 
              iw.includes(pw) ||
              // Проверяем схожесть (например, Сирения - Сир)
              (pw.length >= 4 && iw.length >= 3 && pw.startsWith(iw.substring(0, 3)))
            ))
          );
        })
      );
    });
  }
  
  return bestMatch;
}

function determineCategory(description: string): string {
  const normalizedDesc = description.toLowerCase();
  
  for (const [category, keywords] of Object.entries(EXPENSE_CATEGORIES)) {
    if (keywords.some(keyword => normalizedDesc.includes(keyword))) {
      return category;
    }
  }
  
  return 'other';
}

function extractAmountFromText(text: string): number {
  // Словарь числительных
  const numberWords: { [key: string]: number } = {
    'ноль': 0, 'нуль': 0,
    'один': 1, 'одна': 1, 'единица': 1,
    'два': 2, 'две': 2, 'двойка': 2,
    'три': 3, 'тройка': 3,
    'четыре': 4, 'четверка': 4,
    'пять': 5, 'пятерка': 5,
    'шесть': 6, 'шестерка': 6,
    'семь': 7, 'семерка': 7,
    'восемь': 8, 'восьмерка': 8,
    'девять': 9, 'девятка': 9,
    'десять': 10, 'десятка': 10,
    'одиннадцать': 11, 'двенадцать': 12, 'тринадцать': 13, 'четырнадцать': 14, 'пятнадцать': 15,
    'шестнадцать': 16, 'семнадцать': 17, 'восемнадцать': 18, 'девятнадцать': 19,
    'двадцать': 20, 'тридцать': 30, 'сорок': 40, 'пятьдесят': 50, 'шестьдесят': 60,
    'семьдесят': 70, 'восемьдесят': 80, 'девяносто': 90,
    'сто': 100, 'сотня': 100, 'двести': 200, 'триста': 300, 'четыреста': 400, 'пятьсот': 500,
    'шестьсот': 600, 'семьсот': 700, 'восемьсот': 800, 'девятьсот': 900,
    'тысяча': 1000, 'тысячи': 1000, 'тысяч': 1000,
    'полтысячи': 500, 'полторы': 1.5, 'полтора': 1.5
  };

  const normalizedText = text.toLowerCase();
  let amount = 0;

  // Ищем числа в тексте
  const numberRegex = /(\d+(?:\.\d+)?)/g;
  const numbers = normalizedText.match(numberRegex);
  
  if (numbers && numbers.length > 0) {
    // Берем самое большое число как сумму
    amount = Math.max(...numbers.map(n => parseFloat(n)));
  }

  // Если числа не найдены, ищем словами
  if (amount === 0) {
    const words = normalizedText.split(/[\s,.-]+/);
    let tempAmount = 0;
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      
      if (numberWords[word]) {
        if (word === 'тысяча' || word === 'тысячи' || word === 'тысяч') {
          if (tempAmount > 0) {
            tempAmount *= 1000;
          } else {
            tempAmount = 1000;
          }
        } else if (numberWords[word] >= 100 && numberWords[word] < 1000) {
          tempAmount += numberWords[word];
        } else if (numberWords[word] >= 10 && numberWords[word] < 100) {
          tempAmount += numberWords[word];
        } else {
          tempAmount += numberWords[word];
        }
      }
    }
    
    if (tempAmount > amount) {
      amount = tempAmount;
    }
  }

  return amount;
}

export async function parseVoiceExpense(
  transcript: string, 
  projects: Project[], 
  currentProjectId?: string
): Promise<{ success: boolean; data?: ParsedExpenseData; message?: string }> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key not configured");
    }

    // Подготавливаем список проектов для контекста
    const projectList = projects.map(p => `- "${p.name}" (ID: ${p.id})`).join('\n');
    const currentProject = currentProjectId ? 
      projects.find(p => p.id === currentProjectId) : null;
    
    const systemPrompt = `Ты эксперт по распознаванию голосовых команд для внесения расходов в строительные проекты.

Доступные проекты:
${projectList}

${currentProject ? `Текущий активный проект: "${currentProject.name}"` : ''}

ВАЖНЫЕ ПРАВИЛА:
1. Распознавай числа в любом формате: "пятьсот", "500", "пять сотен", "полтысячи"
2. Валюты: "рублей", "рубля", "руб", "дирхам", "дирхама", "AED", "₽"
3. Проекты могут называться по-разному: короткие названия, сокращения
4. Если проект не указан явно, используй текущий активный проект
5. Ищи ключевые слова для категорий

Категории расходов:
- materials: материалы, двери, окна, сантехника, электрика, плитка
- labor: работа, монтаж, установка, зарплата, услуги мастера  
- transport: доставка, такси, бензин, транспорт
- equipment: инструменты, оборудование, техника
- other: прочие расходы, если неясно что именно

Примеры команд:
- "Сирения - 405, Расход - 500 дирхам, Влад - из своих, За двери"
- "Проект офис, триста рублей материалы"
- "Потратил 1000 на инструменты для стройки"`;

    const userPrompt = `Распознай расход из голосовой команды: "${transcript}"

ВНИМАТЕЛЬНО извлеки:
1. Название проекта (или используй текущий если не указан)
2. Сумму (преобразуй слова в числа: "пятьсот" = 500)
3. Категорию по ключевым словам
4. Описание того, на что потрачены деньги
5. Имя человека если упомянуто

Верни JSON:
{
  "projectName": "точное название проекта из списка",
  "amount": числовая_сумма_без_валюты,
  "category": "materials/labor/transport/equipment/other",
  "description": "краткое описание расхода",
  "personName": "имя человека или null",
  "confidence": число_от_0_до_1
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 500
    });

    const parsedData = JSON.parse(response.choices[0].message.content || '{}');
    
    // Обработка числительных в сумме (если ИИ не распознал)
    if (!parsedData.amount || parsedData.amount === 0) {
      parsedData.amount = extractAmountFromText(transcript);
    }
    
    // Валидация полученных данных
    if (!parsedData.projectName || !parsedData.amount) {
      return {
        success: false,
        message: "Не удалось определить проект или сумму расхода. Попробуйте сказать четче: 'Проект [название], [сумма] рублей на [описание]'"
      };
    }
    
    // Находим соответствующий проект
    let matchedProject = findBestMatchingProject(parsedData.projectName, projects);
    
    // Если проект не найден и есть текущий проект, используем его
    if (!matchedProject && currentProjectId) {
      matchedProject = projects.find(p => p.id === currentProjectId);
      if (matchedProject) {
        parsedData.projectName = matchedProject.name;
      }
    }
    
    if (!matchedProject) {
      return {
        success: false,
        message: `Проект "${parsedData.projectName}" не найден`
      };
    }
    
    // Если категория не определена ИИ, пытаемся определить по ключевым словам
    if (!parsedData.category || parsedData.category === 'other') {
      parsedData.category = determineCategory(parsedData.description || transcript);
    }
    
    return {
      success: true,
      data: {
        projectName: matchedProject.name,
        projectId: matchedProject.id,
        amount: Math.abs(parsedData.amount), // Убеждаемся что сумма положительная
        category: parsedData.category || 'other',
        description: parsedData.description || '',
        personName: parsedData.personName,
        confidence: parsedData.confidence || 0.8
      }
    };
    
  } catch (error) {
    console.error('Error parsing voice expense:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Ошибка при обработке голосовой команды"
    };
  }
}

// Функция для транскрибации аудио (если потребуется в будущем)
export async function transcribeAudio(audioBuffer: Buffer): Promise<string | null> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key not configured");
    }

    // Создаем файл из буфера
    const file = new File([audioBuffer], "audio.webm", { type: "audio/webm" });
    
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
      language: "ru"
    });
    
    return transcription.text;
  } catch (error) {
    console.error('Error transcribing audio:', error);
    return null;
  }
}