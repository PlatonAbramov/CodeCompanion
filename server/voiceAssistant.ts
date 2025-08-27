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
  materials: ['материалы', 'материал', 'стройматериалы', 'двери', 'окна', 'плитка', 'краска', 'цемент', 'песок', 'кирпич', 'трубы', 'провода', 'кабель'],
  labor: ['работа', 'работы', 'монтаж', 'установка', 'ремонт', 'услуги', 'мастер', 'рабочие', 'зарплата'],
  transport: ['транспорт', 'доставка', 'перевозка', 'такси', 'бензин', 'топливо', 'машина', 'грузовик'],
  equipment: ['оборудование', 'инструменты', 'инструмент', 'техника', 'станок', 'оборудование'],
  other: ['прочее', 'другое', 'разное']
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
        inputWords.some(iw => 
          pw.startsWith(iw) || iw.startsWith(pw) || 
          (pw.length > 3 && iw.length > 3 && (
            pw.includes(iw.slice(0, -1)) || 
            iw.includes(pw.slice(0, -1))
          ))
        )
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
    
    const systemPrompt = `Ты помощник для внесения расходов в систему учета строительных проектов.
    
Доступные проекты:
${projectList}

${currentProject ? `Текущий активный проект: "${currentProject.name}"` : ''}

Категории расходов:
- materials (материалы): стройматериалы, двери, окна, плитка, краска и т.д.
- labor (работа): оплата труда, услуги мастеров, монтаж, установка
- transport (транспорт): доставка, перевозка, такси, топливо
- equipment (оборудование): инструменты, техника, станки
- other (прочее): все остальное

Твоя задача - извлечь из текста:
1. Название проекта (если не указан явно, используй текущий проект)
2. Сумму расхода в числовом формате
3. Категорию расхода
4. Описание (что именно было куплено/оплачено)
5. От кого расход (если упоминается имя человека: Влад, Платон и т.д.)

Ответ должен быть в формате JSON.`;

    const userPrompt = `Распознай расход из следующего текста: "${transcript}"
    
Верни JSON объект с полями:
{
  "projectName": "название проекта",
  "amount": числовая сумма,
  "category": "одна из категорий (materials/labor/transport/equipment/other)",
  "description": "описание расхода",
  "personName": "имя человека если упоминается",
  "confidence": число от 0 до 1 (насколько ты уверен в правильности распознавания)
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
    
    // Валидация полученных данных
    if (!parsedData.projectName || !parsedData.amount) {
      return {
        success: false,
        message: "Не удалось определить проект или сумму расхода"
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