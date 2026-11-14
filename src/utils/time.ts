/**
 * Formats a departure time (HH:mm) with an added number of minutes.
 * Returns formatted 12-hour/24-hour time and whether it arrives on a subsequent day.
 */
export function calculateEta(departureTime: string, durationMinutes: number): {
  formatted24: string;
  formatted12: string;
  dayOffset: number;
  dayLabel: string;
} {
  const [hoursStr, minutesStr] = departureTime.split(':');
  const depHours = parseInt(hoursStr || '8', 10);
  const depMinutes = parseInt(minutesStr || '0', 10);

  const totalMinutes = depHours * 60 + depMinutes + Math.max(0, durationMinutes);

  const dayOffset = Math.floor(totalMinutes / (24 * 60));
  const remainingMinutes = totalMinutes % (24 * 60);

  const arrHours = Math.floor(remainingMinutes / 60);
  const arrMinutes = remainingMinutes % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  const formatted24 = `${pad(arrHours)}:${pad(arrMinutes)}`;

  const period = arrHours >= 12 ? 'PM' : 'AM';
  const hour12 = arrHours % 12 === 0 ? 12 : arrHours % 12;
  const formatted12 = `${pad(hour12)}:${pad(arrMinutes)} ${period}`;

  let dayLabel = '';
  if (dayOffset === 1) {
    dayLabel = '+1 day';
  } else if (dayOffset > 1) {
    dayLabel = `+${dayOffset} days`;
  }

  return {
    formatted24,
    formatted12,
    dayOffset,
    dayLabel,
  };
}

/**
 * Formats duration in minutes to human readable string (e.g., 5h 20m or 45m)
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}
