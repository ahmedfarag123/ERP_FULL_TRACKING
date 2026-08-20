import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";
import type { DateRangeValue } from "../lib/date-range";

type SetUrlState<T> = (nextValue: T | ((currentValue: T) => T)) => void;

function applyNextValue<T>(currentValue: T, nextValue: T | ((currentValue: T) => T)) {
  return typeof nextValue === "function"
    ? (nextValue as (currentValue: T) => T)(currentValue)
    : nextValue;
}

function parseDateParam(value: string | null) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
}

function formatDateParam(value: Date | null) {
  if (!value || Number.isNaN(value.getTime())) return null;
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function useUrlStringParam<T extends string = string>(
  key: string,
  defaultValue: T = "" as T,
): [T, SetUrlState<T>] {
  const [searchParams, setSearchParams] = useSearchParams();
  const value = (searchParams.get(key) ?? defaultValue) as T;

  const setValue = useCallback<SetUrlState<T>>(
    (nextValue) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          const currentValue = (next.get(key) ?? defaultValue) as T;
          const resolvedValue = applyNextValue(currentValue, nextValue);
          const serialized = resolvedValue.trim();

          if (!serialized || serialized === defaultValue) {
            next.delete(key);
          } else {
            next.set(key, serialized);
          }

          return next;
        },
        { replace: true },
      );
    },
    [defaultValue, key, setSearchParams],
  );

  return [value, setValue];
}

export function useUrlEnumParam<T extends string>(
  key: string,
  allowedValues: readonly T[],
  defaultValue: T,
): [T, SetUrlState<T>] {
  const [searchParams, setSearchParams] = useSearchParams();
  const allowed = useMemo(() => new Set<T>(allowedValues), [allowedValues]);
  const rawValue = searchParams.get(key) as T | null;
  const value = rawValue && allowed.has(rawValue) ? rawValue : defaultValue;

  const setValue = useCallback<SetUrlState<T>>(
    (nextValue) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          const rawCurrentValue = next.get(key) as T | null;
          const currentValue = rawCurrentValue && allowed.has(rawCurrentValue) ? rawCurrentValue : defaultValue;
          const resolvedValue = applyNextValue(currentValue, nextValue);

          if (resolvedValue === defaultValue) {
            next.delete(key);
          } else {
            next.set(key, resolvedValue);
          }

          return next;
        },
        { replace: true },
      );
    },
    [allowed, defaultValue, key, setSearchParams],
  );

  return [value, setValue];
}

export function useUrlIntParam(key: string, defaultValue = 1, minValue = 1): [number, SetUrlState<number>] {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawValue = Number(searchParams.get(key));
  const value = Number.isInteger(rawValue) && rawValue >= minValue ? rawValue : defaultValue;

  const setValue = useCallback<SetUrlState<number>>(
    (nextValue) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          const rawCurrentValue = Number(next.get(key));
          const currentValue =
            Number.isInteger(rawCurrentValue) && rawCurrentValue >= minValue ? rawCurrentValue : defaultValue;
          const resolvedValue = Math.max(minValue, Math.trunc(applyNextValue(currentValue, nextValue)));

          if (resolvedValue === defaultValue) {
            next.delete(key);
          } else {
            next.set(key, String(resolvedValue));
          }

          return next;
        },
        { replace: true },
      );
    },
    [defaultValue, key, minValue, setSearchParams],
  );

  return [value, setValue];
}

export function useUrlDateRangeParam(
  startKey = "from",
  endKey = "to",
): [DateRangeValue, SetUrlState<DateRangeValue>] {
  const [searchParams, setSearchParams] = useSearchParams();
  const value = useMemo<DateRangeValue>(
    () => [parseDateParam(searchParams.get(startKey)), parseDateParam(searchParams.get(endKey))],
    [endKey, searchParams, startKey],
  );

  const setValue = useCallback<SetUrlState<DateRangeValue>>(
    (nextValue) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          const currentValue: DateRangeValue = [parseDateParam(next.get(startKey)), parseDateParam(next.get(endKey))];
          const [start, end] = applyNextValue(currentValue, nextValue);
          const serializedStart = formatDateParam(start);
          const serializedEnd = formatDateParam(end);

          if (serializedStart) {
            next.set(startKey, serializedStart);
          } else {
            next.delete(startKey);
          }

          if (serializedEnd) {
            next.set(endKey, serializedEnd);
          } else {
            next.delete(endKey);
          }

          return next;
        },
        { replace: true },
      );
    },
    [endKey, setSearchParams, startKey],
  );

  return [value, setValue];
}
