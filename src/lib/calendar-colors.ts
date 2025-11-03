// Google Calendar color palette
export const GOOGLE_CALENDAR_COLORS = {
  tomato: { bg: 'bg-[#d50000]', border: 'border-[#d50000]', text: 'text-white', hex: '#d50000' },
  flamingo: { bg: 'bg-[#e67c73]', border: 'border-[#e67c73]', text: 'text-white', hex: '#e67c73' },
  tangerine: { bg: 'bg-[#f4511e]', border: 'border-[#f4511e]', text: 'text-white', hex: '#f4511e' },
  banana: { bg: 'bg-[#f6bf26]', border: 'border-[#f6bf26]', text: 'text-gray-900', hex: '#f6bf26' },
  sage: { bg: 'bg-[#33b679]', border: 'border-[#33b679]', text: 'text-white', hex: '#33b679' },
  basil: { bg: 'bg-[#0b8043]', border: 'border-[#0b8043]', text: 'text-white', hex: '#0b8043' },
  peacock: { bg: 'bg-[#039be5]', border: 'border-[#039be5]', text: 'text-white', hex: '#039be5' },
  blueberry: { bg: 'bg-[#3f51b5]', border: 'border-[#3f51b5]', text: 'text-white', hex: '#3f51b5' },
  lavender: { bg: 'bg-[#7986cb]', border: 'border-[#7986cb]', text: 'text-white', hex: '#7986cb' },
  grape: { bg: 'bg-[#8e24aa]', border: 'border-[#8e24aa]', text: 'text-white', hex: '#8e24aa' },
  graphite: { bg: 'bg-[#616161]', border: 'border-[#616161]', text: 'text-white', hex: '#616161' },
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
