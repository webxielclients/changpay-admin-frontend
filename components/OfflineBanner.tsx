'use client';

import { useEffect, useState } from 'react';

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!window.navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  if (!offline) return null;
  return (
    <div role="status" className="fixed inset-x-0 top-0 z-[100] bg-amber-100 px-4 py-2 text-center text-sm font-semibold text-amber-900">
      You are offline. Some data is hidden until your connection is restored.
    </div>
  );
}
