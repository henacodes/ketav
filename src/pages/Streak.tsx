import { Card } from "@/components/ui/card";
import {
  getDailyUserStatsForLastDays,
  getStreakSummary,
  seedRandomDailyUserStats,
} from "@/db/services/stats.services";
import { Flame, Calendar, Target, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { format, subDays, parseISO, isSameDay } from "date-fns";

export function StreakPage() {
  const [streaks, setStreaks] = useState<
    { day: string; minutesRead: number; sessionsCount: number }[]
  >([]);
  const [summary, setSummary] = useState({
    currentStreak: 0,
    longestStreak: 0,
    totalDays: 0,
  });
  const [last7Days, setLast7Days] = useState<{ date: string; label: string }[]>(
    []
  );

  useEffect(() => {
    async function fetchData() {
      // Optional for testing
      // await seedRandomDailyUserStats();

      const [res, summaryData] = await Promise.all([
        getDailyUserStatsForLastDays(7),
        getStreakSummary(),
      ]);

      setStreaks(res);
      setSummary(summaryData);

      // Generate the last 7 days (oldest → newest)
      const today = new Date();
      const days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(today, 6 - i);
        return {
          date: format(date, "yyyy-MM-dd"),
          label: format(date, "EEE"),
        };
      });

      setLast7Days(days);
    }

    fetchData();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2 text-foreground">
        Reading Streak
      </h1>
      <p className="text-muted-foreground mb-8">
        Keep your momentum going
      </p>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6 bg-card border-border">
          <div className="flex items-center gap-3 mb-2">
            <Flame className="w-6 h-6 text-primary" />
            <h3 className="text-sm font-medium text-muted-foreground">
              Current Streak
            </h3>
          </div>
          <p className="text-4xl font-bold text-foreground">
            {summary.currentStreak} days
          </p>
        </Card>

        <Card className="p-6 bg-card border-border">
          <div className="flex items-center gap-3 mb-2">
            <Target className="w-6 h-6 text-primary" />
            <h3 className="text-sm font-medium text-muted-foreground">
              Longest Streak
            </h3>
          </div>
          <p className="text-4xl font-bold text-foreground">
            {summary.longestStreak} days
          </p>
        </Card>

        <Card className="p-6 bg-card border-border">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-6 h-6 text-primary" />
            <h3 className="text-sm font-medium text-muted-foreground">
              Total Active Days
            </h3>
          </div>
          <p className="text-4xl font-bold text-foreground">
            {summary.totalDays} days
          </p>
        </Card>
      </div>

      {/* Last 7 Days Visualization */}
      <Card className="p-6 bg-card border-border">
        <div className="flex items-center gap-3 mb-6">
          <Calendar className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">
            Last 7 Days
          </h2>
        </div>

        <div className="grid grid-cols-7 gap-4">
          {last7Days.map((day) => {
            const match = streaks.find((s) =>
              isSameDay(parseISO(s.day), parseISO(day.date))
            );
            const hasRead = match && match.minutesRead > 0;

            return (
              <div key={day.date} className="flex flex-col items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {day.label}
                </span>
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    hasRead
                      ? "bg-primary/20 border-2 border-primary"
                      : "bg-muted border-2 border-border"
                  }`}
                >
                  {hasRead && <Flame className="w-6 h-6 text-primary" />}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 p-4 bg-muted rounded-lg">
          <p className="text-sm text-foreground">
            <span className="font-semibold text-primary">Keep it up!</span>{" "}
            You’ve been active for{" "}
            {streaks.filter((s) => s.minutesRead > 0).length} of the last 7
            days.
          </p>
        </div>
      </Card>
    </div>
  );
}
