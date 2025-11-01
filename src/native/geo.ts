export async function getDeviceLocation(): Promise<{lat: number; lon: number} | null> {
  try {
    // Capacitor Geolocation إن متاح
    const Cap = (window as any).Capacitor;
    if (Cap?.isNativePlatform?.()) {
      const { Geolocation } = await import('@capacitor/geolocation');
      const { coords } = await Geolocation.getCurrentPosition();
      return { lat: coords.latitude, lon: coords.longitude };
    }
    
    // Browser fallback
    if ("geolocation" in navigator) {
      return await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
          _ => resolve(null),
          { enableHighAccuracy: true, timeout: 8000 }
        );
      });
    }
  } catch (err) {
    console.error('Error getting device location:', err);
  }
  return null;
}
