-- Создание администратора в продакшене
-- Выполните этот SQL в консоли базы данных

INSERT INTO users (
  id, 
  username, 
  name, 
  password, 
  role, 
  is_active, 
  is_blocked, 
  temp_password,
  must_change_password,
  created_at,
  created_by
) VALUES (
  gen_random_uuid(),
  'platonabramov90@gmail.com',
  'Администратор Платон', 
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'admin',
  true,
  false,
  NULL,
  false,
  NOW(),
  NULL
) ON CONFLICT (username) DO NOTHING;

-- Проверка создания пользователя
SELECT username, name, role, is_active FROM users WHERE username = 'platonabramov90@gmail.com';