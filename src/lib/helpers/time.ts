import { format } from "date-fns";

export function formatMinutesToTime(totalMinutes: number): string {
  if (totalMinutes <= 0) return "0 mins";

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours} hr${hours > 1 ? "s" : ""} ${minutes} min${
      minutes > 1 ? "s" : ""
    }`;
  } else if (hours > 0) {
    return `${hours} hr${hours > 1 ? "s" : ""}`;
  } else {
    return `${minutes} min${minutes > 1 ? "s" : ""}`;
  }
}

export function today() {
  return format(new Date(), "yyyy-MM-dd");
}
