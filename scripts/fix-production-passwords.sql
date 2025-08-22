-- Исправление паролей в продакшн базе данных
-- Проблема: пароли хранились в открытом виде вместо хэшированного

-- 1. Обновляем существующего админа с правильным хэшем для пароля "123456"
UPDATE users 
SET password = '$2b$10$mD6qqq7/b/93p/YRzzY.sOV5LXAU/ub6frN/AN6LQMc71NBn5/0BW'
WHERE username = 'platonabramov90@gmail.com';

-- 2. Если есть другие пользователи с открытыми паролями, обновляем их
-- (Замените на актуальные usernames если нужно)
-- UPDATE users 
-- SET password = '$2b$10$mD6qqq7/b/93p/YRzzY.sOV5LXAU/ub6frN/AN6LQMc71NBn5/0BW'
-- WHERE password = '123456'; -- только если пароль хранится в открытом виде

-- 3. Проверяем результат
SELECT username, 
       LEFT(password, 20) as password_hash_start,
       name, 
       role,
       is_active 
FROM users 
ORDER BY created_at;

-- Объяснение:
-- $2b$10$mD6qqq7/b/93p/YRzzY.sOV5LXAU/ub6frN/AN6LQMc71NBn5/0BW = хэш для пароля "123456"
-- Bcrypt создает разные хэши для одного пароля, но все они валидны