-- Скрипт для синхронизации production базы данных с development
-- Добавляем недостающий проект "Sirenia North, 405"

INSERT INTO projects (id, name, location, total_cost, status, start_date, end_date, created_by, created_at, updated_at)
VALUES (
  'e9781e57-27f4-4fff-93d0-7fd0d3763156',
  'Sirenia North, 405',
  null,
  54000.00,
  'active',
  '2025-08-16',
  '2025-09-19',
  '6e8ed9af-d529-433d-8365-4f8bd4994a07',
  '2025-08-16 17:36:22.851',
  '2025-08-16 17:36:22.851'
) ON CONFLICT (id) DO NOTHING;

-- Убедимся что пользователь "Администратор Платон" существует
UPDATE users 
SET name = 'Администратор Платон', 
    role = 'admin'
WHERE username = 'platonabramov90@gmail.com';

-- Проверка результата
SELECT 'Projects after sync:' as info;
SELECT COUNT(*) as total_projects FROM projects;
SELECT name FROM projects ORDER BY name;