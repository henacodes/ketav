import { Card } from "@/components/ui/card";
import { BookOpen, Clock } from "lucide-react";

type BookReadingSession = {
  title: string;
  minutes: number;
};

export function DailyReadingSummary({
  bookSessions,
}: {
  bookSessions: BookReadingSession[];
}) {
  const totalMinutes = bookSessions.reduce(
    (sum, session) => sum + session.minutes,
    0
  );
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const formatTime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0) {
      return `${h}h ${m}m`;
    }
    return `${m}m`;
  };

  return (
    <Card className="p-6 bg-card border-border">
      <div className="flex items-center gap-3 mb-6">
        <BookOpen className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-semibold text-foreground">
          Today's Reading Summary
        </h2>
      </div>

      <div className="space-y-4 mb-6">
        {bookSessions.map((session, index) => (
          <div
            key={index}
            className="flex items-center justify-between py-3 border-b border-border last:border-0"
          >
            <span className="text-foreground font-medium">{session.title}</span>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span className="text-sm">{formatTime(session.minutes)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold text-foreground">
            Total Reading Time
          </span>
          <span className="text-2xl font-bold text-primary">
            {hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          {totalMinutes} minutes across {bookSessions.length}{" "}
          {bookSessions.length === 1 ? "book" : "books"}
        </p>
      </div>
    </Card>
  );
}
