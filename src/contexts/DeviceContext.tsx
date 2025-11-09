import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

const DeviceTypeContext = createContext<DeviceType>('desktop');

function detectDevice(): DeviceType {
  if (typeof window === 'undefined') return 'desktop';
  const w = window.innerWidth;
  if (w < 768) return 'mobile';
  if (w >= 768 && w < 1024) return 'tablet';
  return 'desktop';
}

export const DeviceTypeProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [device, setDevice] = useState<DeviceType>(detectDevice());

  useEffect(() => {
    const update = () => setDevice(detectDevice());
    update();
    window.addEventListener('resize', update, { passive: true });
    return () => window.removeEventListener('resize', update);
  }, []);

  const value = useMemo(() => device, [device]);
  
  return (
    <DeviceTypeContext.Provider value={value}>
      {children}
    </DeviceTypeContext.Provider>
  );
};

export function useDeviceTypeCtx(): DeviceType {
  return useContext(DeviceTypeContext);
}
