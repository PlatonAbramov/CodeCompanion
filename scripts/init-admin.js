#!/usr/bin/env node

/**
 * Скрипт для создания начального администратора в продакшене
 * Запуск: node scripts/init-admin.js
 */

const bcrypt = require('bcrypt');
const { db } = require('../server/db');
const { users } = require('../shared/schema');

async function createAdmin() {
  try {
    console.log('🔄 Создание администратора...');
    
    // Данные администратора
    const adminData = {
      username: 'platonabramov90@gmail.com',
      name: 'Администратор Платон',
      password: await bcrypt.hash('123456', 10),
      role: 'admin',
      isActive: true,
      isBlocked: false,
      tempPassword: null,
      mustChangePassword: false,
      createdBy: null
    };
    
    // Проверяем, существует ли уже админ
    const existingAdmin = await db
      .select()
      .from(users)
      .where(users.username.eq(adminData.username))
      .limit(1);
    
    if (existingAdmin.length > 0) {
      console.log('✅ Администратор уже существует');
      return;
    }
    
    // Создаем админа
    const [admin] = await db
      .insert(users)
      .values(adminData)
      .returning();
    
    console.log('✅ Администратор создан успешно:');
    console.log(`   Логин: ${admin.username}`);
    console.log(`   Пароль: 123456`);
    console.log(`   Роль: ${admin.role}`);
    
  } catch (error) {
    console.error('❌ Ошибка создания администратора:', error);
    process.exit(1);
  }
}

// Запускаем создание админа
createAdmin().then(() => {
  console.log('🎉 Инициализация завершена');
  process.exit(0);
});