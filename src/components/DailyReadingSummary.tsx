import { Card } from "@/components/ui/card";
import { BookOpen, Clock } from "lucide-react";
import { Button } from "./ui/button";
import { Book, DailyBookRecord } from "@/db/schema";
import { getBookReadDaysLastYear } from "@/db/services/stats.services";
import { useStatsStore } from "@/stores/useStatsStore";
import { format, isToday, isYesterday, parseISO } from "date-fns";

type BookReadingSession = {
  book: Book;
  stat: DailyBookRecord;
};

export function DailyReadingSummary({
  bookSessions,
  day,
}: {
  day: string;
  bookSessions: BookReadingSession[];
}) {
  const { openBookStatsDialog } = useStatsStore((store) => store);
  const totalMinutes = bookSessions.reduce(
    (sum, session) => sum + session.stat.minutesRead,
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

  async function handleBookStatsSummary(book: Book) {
    const allDays = await getBookReadDaysLastYear(book.bookId);

    openBookStatsDialog({ book, heatmap: allDays });
  }

  function getDayLabel(day: string) {
    const date = parseISO(day);

    if (isToday(date)) return "Today's";
    if (isYesterday(date)) return "Yesterday's";

    return format(date, "yyyy-MM-dd"); // or "MMM d, yyyy" if you want prettier
  }

  return (
    <Card className="p-6 bg-card border-border">
      <div className="flex items-center gap-3 mb-6">
        <BookOpen className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-semibold text-foreground">
          {getDayLabel(day)} Reading Summary
        </h2>
      </div>

      <div className="space-y-4 mb-6">
        {bookSessions.length < 1 && <p>No book has been read this day</p>}
        {bookSessions.map((session, index) => (
          <div
            key={index}
            className="flex items-center justify-between py-3 border-b border-border last:border-0"
          >
            <span className="text-foreground font-medium">
              {session.book.title}
            </span>
            <div className=" flex items-center gap-6   ">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span className="text-sm">
                  {formatTime(session.stat.minutesRead)}
                </span>
              </div>
              <Button
                onClick={() => handleBookStatsSummary(session.book)}
                variant={"ghost"}
              >
                More{" "}
              </Button>
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
