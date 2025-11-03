// Google Calendar color palette
export const GOOGLE_CALENDAR_COLORS = {
  tomato: { bg: 'bg-[#d50000]/10', border: 'border-[#d50000]', text: 'text-[#d50000]', hex: '#d50000' },
  flamingo: { bg: 'bg-[#e67c73]/10', border: 'border-[#e67c73]', text: 'text-[#e67c73]', hex: '#e67c73' },
  tangerine: { bg: 'bg-[#f4511e]/10', border: 'border-[#f4511e]', text: 'text-[#f4511e]', hex: '#f4511e' },
  banana: { bg: 'bg-[#f6bf26]/10', border: 'border-[#f6bf26]', text: 'text-[#f6bf26]', hex: '#f6bf26' },
  sage: { bg: 'bg-[#33b679]/10', border: 'border-[#33b679]', text: 'text-[#33b679]', hex: '#33b679' },
  basil: { bg: 'bg-[#0b8043]/10', border: 'border-[#0b8043]', text: 'text-[#0b8043]', hex: '#0b8043' },
  peacock: { bg: 'bg-[#039be5]/10', border: 'border-[#039be5]', text: 'text-[#039be5]', hex: '#039be5' },
  blueberry: { bg: 'bg-[#3f51b5]/10', border: 'border-[#3f51b5]', text: 'text-[#3f51b5]', hex: '#3f51b5' },
  lavender: { bg: 'bg-[#7986cb]/10', border: 'border-[#7986cb]', text: 'text-[#7986cb]', hex: '#7986cb' },
  grape: { bg: 'bg-[#8e24aa]/10', border: 'border-[#8e24aa]', text: 'text-[#8e24aa]', hex: '#8e24aa' },
  graphite: { bg: 'bg-[#616161]/10', border: 'border-[#616161]', text: 'text-[#616161]', hex: '#616161' },
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
