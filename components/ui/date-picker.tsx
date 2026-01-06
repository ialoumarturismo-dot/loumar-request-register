"use client";

import * as React from "react";
import { DayPicker, useDayPicker } from "react-day-picker";
import { format, type Locale } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";

export interface DatePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  locale?: Locale;
  minDate?: Date;
  maxDate?: Date;
  formatDisplay?: (date: Date) => string;
}

const WEEKDAY_FORMATTER_EN_US = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
});

function formatWeekdayEnUS(date: Date) {
  return WEEKDAY_FORMATTER_EN_US.format(date).slice(0, 2);
}

function CustomMonthCaption({
  displayMonth,
  locale,
}: {
  displayMonth: Date;
  locale: Locale;
}) {
  const { goToMonth, previousMonth, nextMonth } = useDayPicker();
  const monthLabel = format(displayMonth, "MMMM yyyy", { locale });

  return (
    <div className="flex items-center justify-center gap-2 mb-2">
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
      <span className="text-xs font-medium text-foreground min-w-[120px] text-center">
        {monthLabel}
      </span>
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
    </div>
  );
}

export function DatePicker({
  value,
  onChange,
  disabled,
  placeholder = "Selecione uma data",
  className,
  locale = ptBR,
  minDate,
  maxDate,
  formatDisplay,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const displayValue = React.useMemo(() => {
    if (!value) return placeholder;
    if (formatDisplay) return formatDisplay(value);
    return format(value, "dd/MM/yyyy", { locale });
  }, [value, placeholder, locale, formatDisplay]);

  const handleDateSelect = (date: Date | undefined) => {
    onChange(date || null);
    if (date) {
      setOpen(false);
    }
  };

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-9 w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-2",
            "text-xs text-foreground transition-colors",
            "hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            !value && "text-muted-foreground",
            className
          )}
        >
          <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="flex-1 text-left min-w-0">{displayValue}</span>
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          className={cn(
            "z-50 w-auto rounded-lg border border-border bg-popover p-3 shadow-lg",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[side=bottom]:slide-in-from-top-2"
          )}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DayPicker
            mode="single"
            selected={value || undefined}
            onSelect={handleDateSelect}
            numberOfMonths={1}
            locale={locale}
            formatters={{
              formatWeekdayName: (date) => formatWeekdayEnUS(date),
            }}
            disabled={disabled}
            fromDate={minDate}
            toDate={maxDate}
            classNames={{
              months: "flex",
              month: "space-y-2",
              caption: "hidden",
              caption_label: "text-xs font-medium text-foreground",
              nav: "hidden",
              nav_button: "hidden",
              nav_button_previous: "hidden",
              nav_button_next: "hidden",
              table: "w-full border-collapse",
              head_row: "flex",
              head_cell: "text-muted-foreground rounded w-7 font-normal",
              row: "flex w-full mt-1",
              cell: cn(
                "h-7 w-7 text-center text-xs p-0 relative",
                "focus-within:relative focus-within:z-20"
              ),
              day: cn(
                "h-7 w-7 p-0 font-normal text-xs",
                "rounded-full transition-colors"
              ),
              day_selected: "",
              day_today: "",
              day_outside: "",
              day_disabled: "",
              day_hidden: "invisible",
            }}
            components={{
              MonthCaption: (props) => (
                <CustomMonthCaption
                  displayMonth={props.calendarMonth.date}
                  locale={locale}
                />
              ),
            }}
          />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

