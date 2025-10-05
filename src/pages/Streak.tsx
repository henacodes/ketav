import { Card } from "@/components/ui/card";
import { Flame, Calendar, Target, TrendingUp } from "lucide-react";

export function StreakPage() {
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const streakData = [true, true, true, true, false, true, true];

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2 text-foreground">
        Reading Streak
      </h1>
      <p className="text-muted-foreground mb-8">Keep your momentum going</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6 bg-card border-border">
          <div className="flex items-center gap-3 mb-2">
            <Flame className="w-6 h-6 text-primary" />
            <h3 className="text-sm font-medium text-muted-foreground">
              Current Streak
            </h3>
          </div>
          <p className="text-4xl font-bold text-foreground">23 days</p>
        </Card>

        <Card className="p-6 bg-card border-border">
          <div className="flex items-center gap-3 mb-2">
            <Target className="w-6 h-6 text-primary" />
            <h3 className="text-sm font-medium text-muted-foreground">
              Longest Streak
            </h3>
          </div>
          <p className="text-4xl font-bold text-foreground">45 days</p>
        </Card>

        <Card className="p-6 bg-card border-border">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-6 h-6 text-primary" />
            <h3 className="text-sm font-medium text-muted-foreground">
              Total Days
            </h3>
          </div>
          <p className="text-4xl font-bold text-foreground">127 days</p>
        </Card>
      </div>

      <Card className="p-6 bg-card border-border">
        <div className="flex items-center gap-3 mb-6">
          <Calendar className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">This Week</h2>
        </div>

        <div className="grid grid-cols-7 gap-4">
          {weekDays.map((day, index) => (
            <div key={day} className="flex flex-col items-center gap-2">
              <span className="text-sm text-muted-foreground">{day}</span>
              <div
                className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  streakData[index]
                    ? "bg-primary/20 border-2 border-primary"
                    : "bg-muted border-2 border-border"
                }`}
              >
                {streakData[index] && (
                  <Flame className="w-6 h-6 text-primary" />
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 p-4 bg-muted rounded-lg">
          <p className="text-sm text-foreground">
            <span className="font-semibold text-primary">Keep it up!</span>{" "}
            You've read for 23 days in a row. Just 22 more days to beat your
            personal record.
          </p>
        </div>
      </Card>
    </div>
  );
}
