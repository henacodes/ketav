"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Target, Plus, BookOpen, Calendar } from "lucide-react";
import { fetchAllDbBooks } from "@/db/services/books.services";
import {
  createDailyReadingGoal,
  fetchAllGoals,
  fetchProgressForToday,
} from "@/db/services/goals.services";
import { today } from "@/lib/helpers/time";
import { Book } from "@/db/schema";
import { useBookCovers } from "@/hooks/useBookCover";
import { trimBookTitle } from "@/lib/helpers/epub";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

type RawGoal = {
  id: string | number;
  minutesToRead: number;
  associatedBook?: string | null;
  startDate: string;
  endDate?: string | null;
};

type Goal = {
  id: string | number;
  minutesToRead: number;
  associatedBook?: Book;
  startDate: string;
  endDate?: string;
  todayProgress: number; // minutes read today
};

type NewGoalForm = {
  minutesToRead: string;
  associatedBook: string;
  startDate: string;
  endDate: string;
};

/**
 * Helper: Combine raw goals + books + today's progress into display Goals
 */
function buildCombinedGoals(
  rawGoals: RawGoal[],
  books: Book[],
  todayProgress: Array<{ goalId: number | null; minutesRead: number }>
): Goal[] {
  const progressMap: Record<string | number, number> = {};
  todayProgress.forEach((p: any) => {
    progressMap[p.goalId] = p.minutesRead;
  });

  return rawGoals.map((g: any) => ({
    ...g,
    associatedBook: g.associatedBook
      ? books.find((b) => b.bookId === g.associatedBook)
      : undefined,
    todayProgress: progressMap[g.id] || 0,
  }));
}

function formatTime(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

function getProgressPercentage(progress: number, target: number) {
  return Math.min((progress / target) * 100, 100);
}

/**
 * Goal creation dialog component (keeps its own internal form state).
 * Calls onCreate with a normalized payload when creating.
 *
 * Displays a shadcn Alert when the creation fails (shows service errors).
 */
function GoalDialog({
  availableBooks,
  open,
  onOpenChange,
  onCreate,
}: {
  availableBooks: Book[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (payload: {
    minutesToRead: number;
    associatedBook?: string | null;
    startDate: string;
    endDate?: string;
  }) => Promise<void>;
}) {
  const [form, setForm] = useState<NewGoalForm>({
    minutesToRead: "",
    associatedBook: "",
    startDate: today(),
    endDate: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      // reset when dialog closes
      setForm({
        minutesToRead: "",
        associatedBook: "",
        startDate: today(),
        endDate: "",
      });
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  const handleCreate = async () => {
    if (!form.minutesToRead) {
      setError("Please enter a daily reading target (minutes).");
      return;
    }
    setSubmitting(true);
    setError(null);

    const associatedBookId =
      form.associatedBook && form.associatedBook !== "none"
        ? form.associatedBook
        : "";

    try {
      await onCreate({
        minutesToRead: Number.parseInt(form.minutesToRead, 10),
        associatedBook: associatedBookId ? associatedBookId : null,
        startDate: form.startDate,
        endDate: form.endDate || undefined,
      });
      // Close dialog on success
      onOpenChange(false);
    } catch (err: any) {
      // Extract a friendly message
      let msg = "Failed to create goal.";
      if (err instanceof Error) msg = err.message;
      else if (typeof err === "string") msg = err;
      else {
        try {
          msg = JSON.stringify(err);
        } catch {
          /* ignore */
        }
      }
      setError(msg);
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          New Goal
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            Create Reading Goal
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="mb-4">
            <Alert variant="destructive" role="alert">
              <AlertTitle className="text-foreground">Error</AlertTitle>
              <AlertDescription className="text-muted-foreground">
                {error}
              </AlertDescription>
            </Alert>
          </div>
        )}

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="minutes" className="text-foreground">
              Daily Reading Target (minutes)
            </Label>
            <Input
              id="minutes"
              type="number"
              placeholder="30"
              value={form.minutesToRead}
              onChange={(e) =>
                setForm((s) => ({ ...s, minutesToRead: e.target.value }))
              }
              className="bg-background border-border text-foreground"
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="book" className="text-foreground">
              Associated Book (Optional)
            </Label>
            <Select
              value={form.associatedBook}
              onValueChange={(value) =>
                setForm((s) => ({ ...s, associatedBook: value }))
              }
            >
              <SelectTrigger
                className="bg-background border-border text-foreground"
                disabled={submitting}
              >
                <SelectValue placeholder="General goal (no specific book)" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="none">
                  General goal (no specific book)
                </SelectItem>
                {availableBooks.map((book) => (
                  <SelectItem
                    key={book.bookId}
                    value={book.bookId.toString()}
                    className="line-clamp-2"
                  >
                    {trimBookTitle(book.title)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="startDate" className="text-foreground">
              Start Date
            </Label>
            <Input
              id="startDate"
              type="date"
              value={form.startDate}
              onChange={(e) =>
                setForm((s) => ({ ...s, startDate: e.target.value }))
              }
              className="bg-background border-border text-foreground"
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate" className="text-foreground">
              End Date (Optional)
            </Label>
            <Input
              id="endDate"
              type="date"
              value={form.endDate}
              onChange={(e) =>
                setForm((s) => ({ ...s, endDate: e.target.value }))
              }
              className="bg-background border-border text-foreground"
              disabled={submitting}
            />
          </div>
        </div>

        <Button onClick={handleCreate} className="w-full" disabled={submitting}>
          {submitting ? "Creating…" : "Create Goal"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Single goal card component
 */
function GoalCard({ goal, coverSrc }: { goal: Goal; coverSrc: string }) {
  const isCompleted = goal.todayProgress >= goal.minutesToRead;
  const progressPercentage = getProgressPercentage(
    goal.todayProgress,
    goal.minutesToRead
  );

  return (
    <Card
      key={goal.id}
      className="p-6 bg-card border-border hover:border-primary/30 transition-colors min-w-3xl"
    >
      <div className="flex items-start gap-4">
        {goal.associatedBook ? (
          <div className="w-16 h-24 rounded overflow-hidden flex-shrink-0 bg-muted">
            <img
              src={coverSrc}
              alt={goal.associatedBook.title}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-16 h-24 rounded bg-muted flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-8 h-8 text-muted-foreground" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-semibold text-foreground mb-1 line-clamp-2 ">
                {goal.associatedBook
                  ? trimBookTitle(goal.associatedBook.title)
                  : "General Reading Goal"}
              </h3>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Target className="w-4 h-4" />
                  <span>{formatTime(goal.minutesToRead)} daily</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {new Date(goal.startDate).toLocaleDateString()}
                    {goal.endDate &&
                      ` - ${new Date(goal.endDate).toLocaleDateString()}`}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-2xl font-bold text-foreground">
                {formatTime(goal.todayProgress)}
              </div>
              <div className="text-sm text-muted-foreground">
                of {formatTime(goal.minutesToRead)}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Progress value={progressPercentage} className="h-2" />
            <div className="flex items-center justify-between text-sm">
              <span
                className={
                  isCompleted
                    ? "text-primary font-medium"
                    : "text-muted-foreground"
                }
              >
                {isCompleted
                  ? "Goal completed today!"
                  : `${Math.round(progressPercentage)}% complete`}
              </span>
              <span className="text-muted-foreground">
                {formatTime(
                  Math.max(0, goal.minutesToRead - goal.todayProgress)
                )}{" "}
                remaining
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

/**
 * Main page: Loads books, goals and renders UI.
 * Repetition removed by extracting buildCombinedGoals and subcomponents.
 */
export function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [availableBooks, setAvailableBooks] = useState<Book[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const associatedBooks = useMemo(
    () => goals.map((g) => g.associatedBook).filter(Boolean) as Book[],
    [goals]
  );
  const coverImages = useBookCovers(associatedBooks, "image/jpeg");

  // Load initial data
  const loadAll = useCallback(async () => {
    const [booksRes, allGoals, todayProgress] = await Promise.all([
      fetchAllDbBooks(),
      fetchAllGoals(),
      fetchProgressForToday(),
    ]);
    setAvailableBooks(booksRes);
    const combined = buildCombinedGoals(allGoals, booksRes, todayProgress);
    setGoals(combined);
  }, []);

  useEffect(() => {
    loadAll().catch((e) => {
      console.error("Failed to load goals & books", e);
    });
  }, [loadAll]);

  // Handler for creating a new goal; reuses loadAll to refresh state
  const handleCreateGoal = useCallback(
    async (payload: {
      minutesToRead: number;
      associatedBook?: string | null;
      startDate: string;
      endDate?: string;
    }) => {
      await createDailyReadingGoal({
        minutesToRead: payload.minutesToRead,
        associatedBook: payload.associatedBook ?? null,
        startDate: payload.startDate,
        endDate: payload.endDate,
      });

      // refresh combined state
      await loadAll();
    },
    [loadAll]
  );

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-foreground">
            Reading Goals
          </h1>
          <p className="text-muted-foreground">
            Track your daily reading progress
          </p>
        </div>

        <GoalDialog
          availableBooks={availableBooks}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onCreate={handleCreateGoal}
        />
      </div>

      {goals.length === 0 ? (
        <Card className="p-12 text-center bg-card border-border">
          <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2 text-foreground">
            No goals yet
          </h3>
          <p className="text-muted-foreground mb-4">
            Create your first reading goal to start tracking progress
          </p>
          <Button
            onClick={() => {
              setDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Goal
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => {
            let coverSrc = "/epub.svg";
            const book = goal.associatedBook;

            if (book) {
              const bookIndex = associatedBooks.findIndex(
                (b) => b.bookId === book.bookId
              );
              if (coverImages[bookIndex]) {
                coverSrc = coverImages[bookIndex];
              }
            }

            return <GoalCard key={goal.id} goal={goal} coverSrc={coverSrc} />;
          })}
        </div>
      )}
    </div>
  );
}
