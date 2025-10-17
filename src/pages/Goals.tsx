"use client";

import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

type Goal = {
  id: string | number;
  minutesToRead: number;
  associatedBook?: Book;
  startDate: string;
  endDate?: string;
  todayProgress: number; // minutes read today
};

export function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [availableBooks, setAvailableBooks] = useState<Book[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newGoal, setNewGoal] = useState({
    minutesToRead: "",
    associatedBook: "",
    startDate: today(),
    endDate: "",
  });
  const associatedBooks = useMemo(
    () => goals.map((goal) => goal.associatedBook).filter(Boolean) as Book[],
    [goals]
  );

  const coverImages = useBookCovers(associatedBooks, "image/jpeg");

  // Load books and goals/progress from DB
  useEffect(() => {
    console.log("uperload");
    async function loadData() {
      console.log("loadd");
      const [booksRes, allGoals, todayProgress] = await Promise.all([
        fetchAllDbBooks(),
        fetchAllGoals(),
        fetchProgressForToday(),
      ]);
      setAvailableBooks(booksRes);

      // Map goal id to today's progress
      const progressMap: Record<string | number, number> = {};
      todayProgress.forEach((p: any) => {
        progressMap[p.goalId] = p.minutesRead;
      });

      // Compose final array
      const combinedGoals: Goal[] = allGoals.map((goal: any) => ({
        ...goal,
        associatedBook: goal.associatedBook
          ? booksRes.find((b: Book) => b.bookId === goal.associatedBook)
          : undefined,
        todayProgress: progressMap[goal.id] || 0,
      }));
      setGoals(combinedGoals);
    }
    loadData();
  }, []);

  // Create new goal using service function
  const handleCreateGoal = async () => {
    if (!newGoal.minutesToRead) return;

    let associatedBookId = "";
    if (newGoal.associatedBook && newGoal.associatedBook !== "none") {
      associatedBookId = newGoal.associatedBook;
    }

    await createDailyReadingGoal({
      minutesToRead: Number.parseInt(newGoal.minutesToRead),
      associatedBook: associatedBookId ? associatedBookId : null,
      startDate: newGoal.startDate,
      endDate: newGoal.endDate || undefined,
    });

    // Reload goals after creating
    const allGoals = await fetchAllGoals();
    const todayProgress = await fetchProgressForToday();
    const progressMap: Record<string | number, number> = {};
    todayProgress.forEach((p: any) => {
      progressMap[p.goalId] = p.minutesRead;
    });
    const combinedGoals: Goal[] = allGoals.map((goal: any) => ({
      ...goal,
      associatedBook: goal.associatedBook
        ? availableBooks.find((b: Book) => b.bookId === goal.associatedBook)
        : undefined,
      todayProgress: progressMap[goal.id] || 0,
    }));
    setGoals(combinedGoals);

    setDialogOpen(false);
    setNewGoal({
      minutesToRead: "",
      associatedBook: "",
      startDate: today(),
      endDate: "",
    });
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getProgressPercentage = (progress: number, target: number) => {
    return Math.min((progress / target) * 100, 100);
  };

  return (
    <div className=" max-w-7xl  mx-auto   p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-foreground">
            Reading Goals
          </h1>
          <p className="text-muted-foreground">
            Track your daily reading progress
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="minutes" className="text-foreground">
                  Daily Reading Target (minutes)
                </Label>
                <Input
                  id="minutes"
                  type="number"
                  placeholder="30"
                  value={newGoal.minutesToRead}
                  onChange={(e) =>
                    setNewGoal({ ...newGoal, minutesToRead: e.target.value })
                  }
                  className="bg-background border-border text-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="book" className="text-foreground">
                  Associated Book (Optional)
                </Label>
                <Select
                  value={newGoal.associatedBook}
                  onValueChange={(value) =>
                    setNewGoal({ ...newGoal, associatedBook: value })
                  }
                >
                  <SelectTrigger className="bg-background border-border text-foreground">
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
                      >
                        {book.title}
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
                  value={newGoal.startDate}
                  onChange={(e) =>
                    setNewGoal({ ...newGoal, startDate: e.target.value })
                  }
                  className="bg-background border-border text-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate" className="text-foreground">
                  End Date (Optional)
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={newGoal.endDate}
                  onChange={(e) =>
                    setNewGoal({ ...newGoal, endDate: e.target.value })
                  }
                  className="bg-background border-border text-foreground"
                />
              </div>
            </div>

            <Button onClick={handleCreateGoal} className="w-full">
              Create Goal
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      {goals.length === 0 ? (
        <Card className="p-12 text-center bg-card border-border  ">
          <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2 text-foreground">
            No goals yet
          </h3>
          <p className="text-muted-foreground mb-4">
            Create your first reading goal to start tracking progress
          </p>
          <Button
            onClick={() => {
              console.log("Hello goal");
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
            const progressPercentage = getProgressPercentage(
              goal.todayProgress,
              goal.minutesToRead
            );

            const book = goal.associatedBook;

            if (book) {
              const bookIndex = associatedBooks.findIndex(
                (b) => b.bookId === book.bookId
              );
              if (coverImages[bookIndex]) {
                coverSrc = coverImages[bookIndex];
              }
            }
            const isCompleted = goal.todayProgress >= goal.minutesToRead;

            return (
              <Card
                key={goal.id}
                className="p-6 bg-card border-border hover:border-primary/30 transition-colors min-w-3xl  "
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
                        <h3 className="font-semibold text-foreground mb-1">
                          {goal.associatedBook
                            ? goal.associatedBook.title
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
                                ` - ${new Date(
                                  goal.endDate
                                ).toLocaleDateString()}`}
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
          })}
        </div>
      )}
    </div>
  );
}
