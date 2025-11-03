import { GOOGLE_CALENDAR_COLORS, type CalendarColor } from "@/lib/calendar-colors";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

type Props = {
  value: CalendarColor;
  onChange: (color: CalendarColor) => void;
};

export default function EventColorPicker({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-6 gap-2">
      {(Object.keys(GOOGLE_CALENDAR_COLORS) as CalendarColor[]).map((colorKey) => {
        const color = GOOGLE_CALENDAR_COLORS[colorKey];
        const isSelected = value === colorKey;

        return (
          <button
            key={colorKey}
            onClick={() => onChange(colorKey)}
            className={cn(
              "w-8 h-8 rounded-full transition-all relative",
              "hover:scale-110 hover:shadow-lg",
              isSelected && "ring-2 ring-offset-2 ring-foreground"
            )}
            style={{ backgroundColor: color.hex }}
            title={colorKey}
          >
            {isSelected && (
              <Check className="w-4 h-4 text-white absolute inset-0 m-auto" />
            )}
          </button>
        );
      })}
    </div>
  );
}
