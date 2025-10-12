import React, { useMemo } from "react";
import { parseISO, subDays, format, isSameDay } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatMinutesToTime } from "@/lib/helpers/time";

interface HeatmapProps {
  endDate: string;
  data: { date: string; count: number }[];
  maxLevel?: number; // how many color levels, default 4
  maxCount?: number; // the brightest level threshold, default 60
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Heatmap({
  endDate,
  data,
  maxLevel = 4,
  maxCount = 60,
}: HeatmapProps) {
  const days = useMemo(() => {
    const end = parseISO(endDate);
    const start = subDays(end, 364);
    const allDays = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = format(d, "yyyy-MM-dd");
      const existing = data.find((x) => isSameDay(parseISO(x.date), d));
      allDays.push({
        date: dateStr,
        count: existing ? existing.count : 0,
        weekday: d.getDay(), // 0 = Sun, 6 = Sat
      });
    }
    return allDays;
  }, [endDate, data]);

  // Chunk by weeks (7 days each)
  const weeks = useMemo(() => {
    const chunked: { date: string; count: number; weekday: number }[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      chunked.push(days.slice(i, i + 7));
    }
    return chunked;
  }, [days]);

  const getLevelClass = (count: number) => {
    if (count <= 0) return "bg-muted";

    const step = maxCount / maxLevel;
    let level = Math.ceil(count / step);

    level = Math.min(level, maxLevel);

    const intensityMap = {
      1: "bg-primary/30",
      2: "bg-primary/50",
      3: "bg-primary/70",
      4: "bg-primary",
    };

    return intensityMap[level as keyof typeof intensityMap] || "bg-primary";
  };
  return (
    <div className="flex gap-2">
      <style>
        {`
          .heatmap-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .heatmap-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}
      </style>
      {/* Weekday labels column */}
      <div className="flex flex-col gap-[3px]  ">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className=" h-3 text-xs text-muted-foreground">
            {label}
          </div>
        ))}
      </div>

      {/* Heatmap weeks */}
      <div className="flex gap-[3px] overflow-x-auto heatmap-scrollbar ">
        {weeks.map((week, i) => (
          <div key={i} className="flex flex-col gap-[3px]">
            {week.map((day) => (
              <Tooltip key={day.date}>
                <TooltipTrigger>
                  <div
                    className={`w-3 h-3 rounded-sm transition-colors duration-200 ${getLevelClass(
                      day.count
                    )}`}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {format(parseISO(day.date), "MMMM d, yyyy")} | Read{" "}
                    {formatMinutesToTime(day.count)}
                  </p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
