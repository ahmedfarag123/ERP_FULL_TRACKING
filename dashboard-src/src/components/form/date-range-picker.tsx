import { useEffect, useRef } from "react";
import flatpickr from "flatpickr";
import type { Instance as FlatpickrInstance } from "flatpickr/dist/types/instance";
import "flatpickr/dist/flatpickr.css";
import Label from "./Label";
import { CalenderIcon } from "../../icons";
import type { DateRangeValue } from "../../lib/date-range";

interface DateRangePickerProps {
  id?: string;
  label?: string;
  placeholder?: string;
  value: DateRangeValue;
  onChange: (nextValue: DateRangeValue) => void;
}

function getFlatpickrValue(value: DateRangeValue) {
  return value.filter((item): item is Date => item instanceof Date);
}

export default function DateRangePicker({
  id,
  label,
  placeholder = "Select date range",
  value,
  onChange,
}: DateRangePickerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const instanceRef = useRef<FlatpickrInstance | null>(null);

  useEffect(() => {
    if (!inputRef.current) return;

    const instance = flatpickr(inputRef.current, {
      mode: "range",
      static: false,
      disableMobile: true,
      allowInput: false,
      monthSelectorType: "static",
      dateFormat: "d/m/Y",
      onChange: (selectedDates) => {
        onChange([selectedDates[0] ?? null, selectedDates[1] ?? null]);
      },
      onReady: (_selectedDates, _dateStr, currentInstance) => {
        currentInstance.input.placeholder = placeholder;
        currentInstance.input.readOnly = true;
      },
    });

    instanceRef.current = Array.isArray(instance) ? null : instance;

    return () => {
      instanceRef.current?.destroy();
      instanceRef.current = null;
    };
  }, [id, onChange, placeholder]);

  useEffect(() => {
    const instance = instanceRef.current;
    if (!instance) return;

    const nextValue = getFlatpickrValue(value);
    instance.setDate(nextValue, false);
    instance.input.placeholder = placeholder;
  }, [placeholder, value]);

  return (
    <div className="w-full">
      {label ? <Label htmlFor={id}>{label}</Label> : null}

      <div className="flatpickr-wrapper relative">
        <input
          ref={inputRef}
          id={id ?? "date-range-picker"}
          placeholder={placeholder}
          className="datepicker h-11 w-full rounded-lg border border-gray-300 bg-transparent py-2.5 pr-4 pl-11 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
          readOnly
        />
        <div className="pointer-events-none absolute inset-y-0 left-4 z-10 flex items-center text-gray-500 dark:text-gray-400">
          <CalenderIcon className="size-5" />
        </div>
      </div>
    </div>
  );
}
