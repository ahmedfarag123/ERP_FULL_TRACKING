export type DateRangeValue = [Date | null, Date | null];

function startOfLocalDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 0, 0, 0, 0);
}

function endOfLocalDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 23, 59, 59, 999);
}

export function getDateRangeBounds(range: DateRangeValue) {
  const [start, end] = range;

  return {
    start,
    end,
    startIso: start ? startOfLocalDay(start).toISOString() : null,
    endIso: end ? endOfLocalDay(end).toISOString() : null,
  };
}

export function isDateWithinRange(value: Date, range: DateRangeValue) {
  const { start, end } = getDateRangeBounds(range);

  if (start && value < startOfLocalDay(start)) {
    return false;
  }

  if (end && value > endOfLocalDay(end)) {
    return false;
  }

  return true;
}
