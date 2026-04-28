import React from 'react';
import { useLanguage } from '@/components/LanguageProvider';

export default function TestClient() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">{t('testClientTitle')}</h1>
        <p>{t('testClientRoutingWorks')}</p>
        <div className="mt-4 p-4 bg-white rounded-lg shadow">
          <h2 className="text-lg font-semibold">{t('testClientDebugInfo')}</h2>
          <p>URL: /test-client</p>
          <p>{t('testClientPurpose')}</p>
        </div>
      </div>
    </div>
  );
}
