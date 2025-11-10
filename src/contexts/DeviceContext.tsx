import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type DeviceSize = 'small' | 'medium' | 'large' | 'xlarge';
export type ScreenDensity = 'mdpi' | 'hdpi' | 'xhdpi' | 'xxhdpi' | 'xxxhdpi';

export interface DeviceInfo {
  type: DeviceType;
  size: DeviceSize;
  density: ScreenDensity;
  dpr: number; // Device Pixel Ratio
  width: number;
  height: number;
  physicalWidth: number;
}

const DeviceTypeContext = createContext<DeviceType>('desktop');
const DeviceInfoContext = createContext<DeviceInfo>({
  type: 'desktop',
  size: 'medium',
  density: 'mdpi',
  dpr: 1,
  width: 1920,
  height: 1080,
  physicalWidth: 1920,
});

function detectDeviceInfo(): DeviceInfo {
  if (typeof window === 'undefined') {
    return {
      type: 'desktop',
      size: 'medium',
      density: 'mdpi',
      dpr: 1,
      width: 1920,
      height: 1080,
      physicalWidth: 1920,
    };
  }

  const width = window.innerWidth;
  const height = window.innerHeight;
  const dpr = window.devicePixelRatio || 1;
  const physicalWidth = width * dpr;

  // Detect device type
  let type: DeviceType = 'desktop';
  if (width < 768) type = 'mobile';
  else if (width >= 768 && width < 1024) type = 'tablet';

  // Detect device size based on physical pixels
  // S24 Ultra: 1440px × 3.0 DPR = 4320 physical pixels
  // iPhone 15 Pro Max: 430px × 3.0 DPR = 1290 physical pixels
  let size: DeviceSize = 'medium';
  if (physicalWidth >= 4000) size = 'xlarge'; // S24 Ultra, Fold, etc.
  else if (physicalWidth >= 2500) size = 'large'; // iPhone Pro Max, S23 Ultra
  else if (physicalWidth >= 1800) size = 'medium'; // Standard flagship phones
  else size = 'small'; // Budget/older phones

  // Detect screen density
  let density: ScreenDensity = 'mdpi';
  if (dpr >= 4) density = 'xxxhdpi';
  else if (dpr >= 3) density = 'xxhdpi';
  else if (dpr >= 2) density = 'xhdpi';
  else if (dpr >= 1.5) density = 'hdpi';

  return { type, size, density, dpr, width, height, physicalWidth };
}

function detectDevice(): DeviceType {
  return detectDeviceInfo().type;
}

export const DeviceTypeProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [device, setDevice] = useState<DeviceType>(detectDevice());
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(detectDeviceInfo());

  useEffect(() => {
    const update = () => {
      setDevice(detectDevice());
      setDeviceInfo(detectDeviceInfo());
    };
    update();
    window.addEventListener('resize', update, { passive: true });
    return () => window.removeEventListener('resize', update);
  }, []);

  const deviceValue = useMemo(() => device, [device]);
  const infoValue = useMemo(() => deviceInfo, [deviceInfo]);
  
  return (
    <DeviceTypeContext.Provider value={deviceValue}>
      <DeviceInfoContext.Provider value={infoValue}>
        {children}
      </DeviceInfoContext.Provider>
    </DeviceTypeContext.Provider>
  );
};

export function useDeviceTypeCtx(): DeviceType {
  return useContext(DeviceTypeContext);
}

export function useDeviceInfo(): DeviceInfo {
  return useContext(DeviceInfoContext);
}
