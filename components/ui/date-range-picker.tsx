"use client";

import * as React from "react";
import { DayPicker, DateRange, useDayPicker } from "react-day-picker";
import { format, startOfMonth, subDays, type Locale } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";

export interface DateRangePickerProps {
  value: { from: Date | null; to: Date | null } | null;
  onChange: (range: { from: Date | null; to: Date | null } | null) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  locale?: Locale;
  minDate?: Date;
  maxDate?: Date;
}

const PRESETS = [
  {
    label: "Hoje",
    getValue: () => {
      const today = new Date();
      return {
        from: today,
        to: today,
      };
    },
  },
  {
    label: "Últimos 7 Dias",
    getValue: () => {
      const today = new Date();
      return {
        from: subDays(today, 6),
        to: today,
      };
    },
  },
  {
    label: "Últimos 30 Dias",
    getValue: () => {
      const today = new Date();
      return {
        from: subDays(today, 29),
        to: today,
      };
    },
  },
  {
    label: "Dia 1 até Agora",
    getValue: () => {
      const today = new Date();
      return {
        from: startOfMonth(today),
        to: today,
      };
    },
  },
];

const WEEKDAY_FORMATTER_EN_US = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
});

function formatWeekdayEnUS(date: Date) {
  // "Sun" -> "Su", "Thu" -> "Th"
  return WEEKDAY_FORMATTER_EN_US.format(date).slice(0, 2);
}

function CustomMonthCaption({
  displayMonth,
  locale,
  isFirstMonth,
  isLastMonth,
  displayIndex,
}: {
  displayMonth: Date;
  locale: Locale;
  isFirstMonth: boolean;
  isLastMonth: boolean;
  displayIndex: number;
}) {
  const { goToMonth, previousMonth, nextMonth } = useDayPicker();
  const monthLabel = format(displayMonth, "MMMM yyyy", { locale });

  return (
    <div className="flex items-center justify-center gap-1.5 mb-1.5">
      {isFirstMonth && (
        <button
          type="button"
          onClick={() => previousMonth && goToMonth(previousMonth)}
          disabled={!previousMonth}
          className={cn(
            "h-6 w-6 flex items-center justify-center rounded",
            "hover:bg-muted transition-colors text-muted-foreground",
            "disabled:opacity-30 disabled:cursor-not-allowed"
          )}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
      )}
      <span className="text-xs font-medium text-foreground min-w-[120px] text-center">
        {monthLabel}
      </span>
      {isLastMonth && displayIndex === 1 && (
        <button
          type="button"
          onClick={() => nextMonth && goToMonth(nextMonth)}
          disabled={!nextMonth}
          className={cn(
            "h-6 w-6 flex items-center justify-center rounded",
            "hover:bg-muted transition-colors text-muted-foreground",
            "disabled:opacity-30 disabled:cursor-not-allowed"
          )}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export function DateRangePicker({
  value,
  onChange,
  disabled,
  placeholder = "Selecione um período",
  className,
  locale = ptBR,
  minDate,
  maxDate,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);

  const displayValue = React.useMemo(() => {
    if (!value?.from) return placeholder;
    if (value.from && !value.to) {
      return format(value.from, "dd/MM/yyyy", { locale });
    }
    return `${format(value.from, "dd/MM/yyyy", { locale })} - ${format(
      value.to!,
      "dd/MM/yyyy",
      { locale }
    )}`;
  }, [value, placeholder, locale]);

  const handlePresetClick = (preset: (typeof PRESETS)[number]) => {
    const range = preset.getValue();
    onChange(range);
  };

  const handleRangeChange = (range: DateRange | undefined) => {
    onChange(range ? { from: range.from || null, to: range.to || null } : null);
  };

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-10 items-center gap-2 w-full rounded-md border border-input bg-background px-3 py-2",
            "text-xs text-foreground transition-colors",
            "hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            !value?.from && "text-muted-foreground",
            className
          )}
        >
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="flex-1 text-left">{displayValue}</span>
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          className={cn(
            "z-50 w-auto rounded-lg border border-border bg-popover p-2 shadow-sm",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[side=bottom]:slide-in-from-top-2"
          )}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {/* Presets at top */}
          <div className="flex gap-1 mb-2 pb-2 border-b border-border">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handlePresetClick(preset)}
                className={cn(
                  "px-2.5 py-1 rounded text-xs",
                  "text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
                  "font-normal"
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Calendar with 2 months */}
          <DayPicker
            mode="range"
            selected={value as DateRange}
            onSelect={handleRangeChange}
            numberOfMonths={2}
            locale={locale}
            formatters={{
              formatWeekdayName: (date) => formatWeekdayEnUS(date),
            }}
            disabled={disabled}
            fromDate={minDate}
            toDate={maxDate}
            classNames={{
              months: "flex gap-1",
              month: "space-y-1",
              caption: "hidden",
              caption_label: "text-xs font-medium text-foreground",
              nav: "hidden",
              nav_button: "hidden",
              nav_button_previous: "hidden",
              nav_button_next: "hidden",
              table: "w-full border-collapse",
              head_row: "flex",
              head_cell: "text-muted-foreground rounded w-7 font-normal",
              row: "flex w-full mt-0.5",
              cell: cn(
                "h-7 w-7 text-center text-xs p-0 relative",
                "[&:has([aria-selected].rdp-day_range_end)]:rounded-r-full",
                "[&:has([aria-selected].rdp-day_outside)]:bg-muted/30",
                "first:[&:has([aria-selected])]:rounded-l-full",
                "last:[&:has([aria-selected])]:rounded-r-full",
                "focus-within:relative focus-within:z-20"
              ),
              day: cn(
                "h-7 w-7 p-0 font-normal text-xs",
                "rounded-full transition-colors"
              ),
              day_range_start: "",
              day_range_end: "",
              day_selected: "",
              day_today: "",
              day_outside: "",
              day_disabled: "",
              day_range_middle: "",
              day_hidden: "invisible",
            }}
            components={{
              MonthCaption: (props) => {
                const displayMonth = props.calendarMonth.date;
                const isFirstMonth = props.displayIndex === 0;
                const isLastMonth = props.displayIndex === 1;

                return (
                  <CustomMonthCaption
                    displayMonth={displayMonth}
                    locale={locale}
                    isFirstMonth={isFirstMonth}
                    isLastMonth={isLastMonth}
                    displayIndex={props.displayIndex}
                  />
                );
              },
            }}
          />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
