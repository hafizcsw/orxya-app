// Google Calendar color palette with gradients
export const GOOGLE_CALENDAR_COLORS = {
  tomato: { 
    bg: 'bg-gradient-to-br from-[#d50000] to-[#ff1744]', 
    border: 'border-[#d50000]', 
    text: 'text-white', 
    hex: '#d50000',
    shadow: 'shadow-[#d50000]/20'
  },
  flamingo: { 
    bg: 'bg-gradient-to-br from-[#e67c73] to-[#ff8a80]', 
    border: 'border-[#e67c73]', 
    text: 'text-white', 
    hex: '#e67c73',
    shadow: 'shadow-[#e67c73]/20'
  },
  tangerine: { 
    bg: 'bg-gradient-to-br from-[#f4511e] to-[#ff6e40]', 
    border: 'border-[#f4511e]', 
    text: 'text-white', 
    hex: '#f4511e',
    shadow: 'shadow-[#f4511e]/20'
  },
  banana: { 
    bg: 'bg-gradient-to-br from-[#f6bf26] to-[#ffd54f]', 
    border: 'border-[#f6bf26]', 
    text: 'text-gray-900', 
    hex: '#f6bf26',
    shadow: 'shadow-[#f6bf26]/20'
  },
  sage: { 
    bg: 'bg-gradient-to-br from-[#33b679] to-[#69f0ae]', 
    border: 'border-[#33b679]', 
    text: 'text-white', 
    hex: '#33b679',
    shadow: 'shadow-[#33b679]/20'
  },
  basil: { 
    bg: 'bg-gradient-to-br from-[#0b8043] to-[#00c853]', 
    border: 'border-[#0b8043]', 
    text: 'text-white', 
    hex: '#0b8043',
    shadow: 'shadow-[#0b8043]/20'
  },
  peacock: { 
    bg: 'bg-gradient-to-br from-[#039be5] to-[#40c4ff]', 
    border: 'border-[#039be5]', 
    text: 'text-white', 
    hex: '#039be5',
    shadow: 'shadow-[#039be5]/20'
  },
  blueberry: { 
    bg: 'bg-gradient-to-br from-[#3f51b5] to-[#5c6bc0]', 
    border: 'border-[#3f51b5]', 
    text: 'text-white', 
    hex: '#3f51b5',
    shadow: 'shadow-[#3f51b5]/20'
  },
  lavender: { 
    bg: 'bg-gradient-to-br from-[#7986cb] to-[#9fa8da]', 
    border: 'border-[#7986cb]', 
    text: 'text-white', 
    hex: '#7986cb',
    shadow: 'shadow-[#7986cb]/20'
  },
  grape: { 
    bg: 'bg-gradient-to-br from-[#8e24aa] to-[#ab47bc]', 
    border: 'border-[#8e24aa]', 
    text: 'text-white', 
    hex: '#8e24aa',
    shadow: 'shadow-[#8e24aa]/20'
  },
  graphite: { 
    bg: 'bg-gradient-to-br from-[#616161] to-[#757575]', 
    border: 'border-[#616161]', 
    text: 'text-white', 
    hex: '#616161',
    shadow: 'shadow-[#616161]/20'
  },
};

export type CalendarColor = keyof typeof GOOGLE_CALENDAR_COLORS;

export const DEFAULT_CALENDAR_COLOR: CalendarColor = 'peacock';

export function getColorForEvent(source?: string, color?: string | null): CalendarColor {
  if (color && color in GOOGLE_CALENDAR_COLORS) {
    return color as CalendarColor;
  }
  if (source === 'google') return 'peacock';
  return DEFAULT_CALENDAR_COLOR;
}
