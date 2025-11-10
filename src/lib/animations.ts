// Centralized animation configurations for consistent animations across the app

export const ringAnimations = {
  // Staggered entrance animation
  stagger: (index: number) => ({
    initial: { opacity: 0, y: 20, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: { 
      delay: index * 0.1,
      type: "spring" as const,
      stiffness: 100,
      damping: 15
    }
  }),
  
  // Excellent status - continuous pulse
  excellent: {
    animate: { 
      scale: [1, 1.05, 1],
      boxShadow: [
        '0 0 20px rgba(34, 197, 94, 0.5)',
        '0 0 30px rgba(34, 197, 94, 0.8)',
        '0 0 20px rgba(34, 197, 94, 0.5)',
      ]
    },
    transition: { repeat: Infinity, duration: 2, ease: "easeInOut" }
  },
  
  // Poor status - shake animation
  poor: {
    animate: { x: [-2, 2, -2, 2, 0] },
    transition: { repeat: 2, duration: 0.4 }
  },
  
  // Card hover lift effect
  cardHover: {
    whileHover: { 
      y: -4, 
      scale: 1.02,
      transition: { type: "spring", stiffness: 300, damping: 20 }
    }
  },
  
  // Section entrance animation
  sectionFadeIn: (delay = 0) => ({
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.5, ease: "easeOut" }
  }),
  
  // Ring-specific animations
  ringProgress: (delay = 0) => ({
    initial: { pathLength: 0, opacity: 0 },
    animate: { 
      pathLength: 1, 
      opacity: 1,
      transition: {
        pathLength: { delay: delay + 0.2, duration: 1.2, ease: "easeOut" },
        opacity: { delay, duration: 0.3 }
      }
    }
  }),
  
  ringIcon: (delay = 0) => ({
    initial: { scale: 0, opacity: 0, rotate: -180 },
    animate: { 
      scale: 1, 
      opacity: 1, 
      rotate: 0,
      transition: {
        delay: delay + 0.3,
        type: "spring",
        stiffness: 200,
        damping: 15
      }
    }
  }),
  
  ringText: (delay = 0) => ({
    initial: { opacity: 0, y: 10 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: {
        delay: delay + 0.5,
        duration: 0.4,
        ease: "easeOut"
      }
    }
  }),
  
  ringLabel: (delay = 0) => ({
    initial: { opacity: 0, y: 5 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: {
        delay: delay + 0.6,
        duration: 0.3,
        ease: "easeOut"
      }
    }
  })
};

// Get glow intensity based on status
export const getGlowIntensity = (status?: 'excellent' | 'good' | 'fair' | 'poor'): string => {
  if (!status) return '12px';
  switch(status) {
    case 'excellent': return '20px'; // Strong glow
    case 'good': return '16px';
    case 'fair': return '12px';
    case 'poor': return '8px'; // Weak glow
    default: return '12px';
  }
};

// Convert HSL to RGBA for drop-shadow compatibility
export const hslToRgba = (hsl: string, alpha = 1): string => {
  // Extract HSL values from string like "hsl(142, 76%, 36%)"
  const match = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match) return `rgba(59, 130, 246, ${alpha})`; // fallback blue
  
  const h = parseInt(match[1]) / 360;
  const s = parseInt(match[2]) / 100;
  const l = parseInt(match[3]) / 100;
  
  let r, g, b;
  
  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${alpha})`;
};
