import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useStatsStore } from "@/stores/useStatsStore";
import Heatmap from "../Heatmap"; // your heatmap component
import { formatMinutesToTime } from "@/lib/helpers/time";
import { useEffect, useRef } from "react";

export default function BookSummaryDialog() {
  const { bookStatsSummary, closeBookStatsDialog } = useStatsStore(
    (store) => store
  );

  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate total reading time from heatmap data
  const totalMinutes =
    bookStatsSummary.heatmap?.reduce((sum, day) => sum + day.minutesRead, 0) ||
    0;

  // Map heatmap data for the heatmap component
  const heatmapData =
    bookStatsSummary.heatmap?.map((day) => ({
      date: day.day, // YYYY-MM-DD
      count: day.minutesRead, // count will be used for coloring
    })) || [];

  if (!bookStatsSummary.book) return null;

  return (
    <Dialog
      open={bookStatsSummary.dialog}
      onOpenChange={(open) => {
        if (!open) closeBookStatsDialog();
      }}
    >
      <DialogContent className="">
        <DialogHeader>
          <DialogTitle>{bookStatsSummary.book.title} </DialogTitle>
          <DialogDescription>
            This is a summary of your reading stats for this book.
          </DialogDescription>
        </DialogHeader>

        {/* Total reading time */}
        <div className="mt-4 text-sm text-muted-foreground">
          Total reading time: {formatMinutesToTime(totalMinutes)}
        </div>

        {/* Heatmap */}
        {heatmapData.length > 0 && (
          <div
            ref={containerRef}
            className="mt-6 overflow-x-auto scrollbar-hide"
            style={{ WebkitOverflowScrolling: "touch" }} // smooth scrolling on iOS
          >
            <Heatmap
              endDate={new Date().toISOString().split("T")[0]}
              data={heatmapData}
              maxCount={60}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
