import React from 'react';

export default function TestClient() {
  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Тест клиента</h1>
        <p>Если вы видите эту страницу, роутинг работает правильно.</p>
        <div className="mt-4 p-4 bg-white rounded-lg shadow">
          <h2 className="text-lg font-semibold">Информация для отладки:</h2>
          <p>URL: /test-client</p>
          <p>Эта страница создана для проверки роутинга.</p>
        </div>
      </div>
    </div>
  );
}