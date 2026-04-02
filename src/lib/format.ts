const PACIFIC_TIME_ZONE = "America/Vancouver";

function getPacificParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: PACIFIC_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(values.get("year")),
    month: Number(values.get("month")),
    day: Number(values.get("day")),
    hour: Number(values.get("hour")),
    minute: Number(values.get("minute")),
    second: Number(values.get("second")),
  };
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value < 100 ? 2 : 0,
  }).format(value);
}

export function formatSignedMoney(value: number) {
  const formatted = formatMoney(Math.abs(value));

  if (value > 0) {
    return `+${formatted}`;
  }

  if (value < 0) {
    return `-${formatted}`;
  }

  return formatMoney(0);
}

export function formatProbability(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function parsePacificDateTimePartsToIso(dateValue: string, timeValue: string) {
  if (!dateValue || !timeValue) {
    return "";
  }

  const [year, month, day] = dateValue.split("-").map(Number);
  const [hour, minute] = timeValue.split(":").map(Number);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute)
  ) {
    return "";
  }

  let guess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const targetUtcFields = Date.UTC(year, month - 1, day, hour, minute, 0);

  for (let index = 0; index < 4; index += 1) {
    const parts = getPacificParts(new Date(guess));
    const guessAsUtcFields = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      0,
    );
    const delta = targetUtcFields - guessAsUtcFields;

    if (delta === 0) {
      break;
    }

    guess += delta;
  }

  return new Date(guess).toISOString();
}

export function parsePacificDateTimeInputToIso(value: string) {
  if (!value) {
    return "";
  }

  const [dateValue, timeValue = "00:00"] = value.split("T");
  return parsePacificDateTimePartsToIso(dateValue, timeValue);
}

export function normalizeDateTimeToIso(value: string) {
  if (!value) {
    return "";
  }

  if (/([zZ]|[+-]\d{2}:\d{2})$/.test(value)) {
    return new Date(value).toISOString();
  }

  return parsePacificDateTimeInputToIso(value);
}

export function formatPacificDateTimeInputValue(value: string) {
  const parts = getPacificParts(new Date(value));
  const year = String(parts.year);
  const month = String(parts.month).padStart(2, "0");
  const day = String(parts.day).padStart(2, "0");
  const hour = String(parts.hour).padStart(2, "0");
  const minute = String(parts.minute).padStart(2, "0");

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

export function formatChartDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PACIFIC_TIME_ZONE,
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PACIFIC_TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
