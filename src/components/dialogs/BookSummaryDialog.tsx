import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useStatsStore } from "@/stores/useStatsStore";
import Heatmap from "../Heatmap"; // your heatmap component
import { formatMinutesToTime, today } from "@/lib/helpers/time";
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
          <p>
            Author:{" "}
            <b className=" text-primary ">{bookStatsSummary.book.author}</b>
          </p>
          <p>
            Total reading time:{" "}
            <b className=" text-primary ">
              {formatMinutesToTime(totalMinutes)}
            </b>
          </p>
          <p>
            Last Read:{" "}
            <b className=" text-primary ">
              {" "}
              {new Date(
                (bookStatsSummary.heatmap &&
                  bookStatsSummary.heatmap[bookStatsSummary.heatmap.length - 1]
                    .lastActive) ||
                  ""
              ).toLocaleString()}
            </b>
          </p>
        </div>

        {/* Heatmap */}
        {heatmapData.length > 0 && (
          <div
            ref={containerRef}
            className="mt-6 overflow-x-auto scrollbar-hide"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <small className=" text-muted-foreground  ">
              Scroll to the right to see the whole thing
            </small>
            <Heatmap endDate={today()} data={heatmapData} maxCount={60} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
