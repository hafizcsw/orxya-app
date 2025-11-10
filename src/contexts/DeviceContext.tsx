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

  // Enhanced size detection with viewport-based approach
  let size: DeviceSize = 'medium';
  
  // Apple devices detection (based on viewport + DPR)
  if (type === 'mobile' && dpr === 3) {
    // iPhone Pro Max models (430-440px viewport)
    if (width >= 430) {
      size = 'large'; // iPhone 14/15/16 Pro Max
    }
    // iPhone Plus models (428px viewport)  
    else if (width >= 420) {
      size = 'large'; // iPhone Plus series
    }
    // iPhone Pro & Standard models (390-402px viewport)
    else if (width >= 390) {
      size = 'medium'; // iPhone 14/15/16 Pro, Standard
    }
    // Smaller iPhones (375px and below)
    else if (width >= 360) {
      size = 'medium';
    }
    else {
      size = 'small';
    }
  }
  // Samsung & Android flagship detection
  else if (type === 'mobile' && physicalWidth >= 4000) {
    size = 'xlarge'; // S24 Ultra, Fold
  }
  else if (type === 'mobile' && physicalWidth >= 2500) {
    size = 'large'; // S23 Ultra, other large Androids
  }
  else if (type === 'mobile') {
    size = width >= 380 ? 'medium' : 'small';
  }

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
      const newDeviceInfo = detectDeviceInfo();
      setDevice(newDeviceInfo.type);
      setDeviceInfo(newDeviceInfo);
      
      // Debug logging for development
      if (process.env.NODE_ENV === 'development') {
        console.log('📱 Device Info:', {
          type: newDeviceInfo.type,
          size: newDeviceInfo.size,
          density: newDeviceInfo.density,
          viewport: `${newDeviceInfo.width}×${newDeviceInfo.height}`,
          physical: `${newDeviceInfo.physicalWidth}×${newDeviceInfo.height * newDeviceInfo.dpr}`,
          dpr: newDeviceInfo.dpr,
          userAgent: navigator.userAgent.includes('iPhone') ? 'iPhone' : 'Other'
        });
      }
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
