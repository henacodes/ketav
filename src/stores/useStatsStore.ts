import { Book, DailyBookRecord } from "@/db/schema";
import { create } from "zustand";

interface StatsStore {
  bookStatsSummary: {
    dialog: boolean;
    book: Book | null;

    heatmap: DailyBookRecord[] | null; // all the days in which a book has been read
  };

  openBookStatsDialog: ({
    book,
    heatmap,
  }: {
    book: Book;
    heatmap: DailyBookRecord[];
  }) => void;

  closeBookStatsDialog: () => void;
}

export const useStatsStore = create<StatsStore>((set) => ({
  bookStatsSummary: {
    dialog: false,
    book: null,
    heatmap: null,
  },
  openBookStatsDialog({ book, heatmap }) {
    set({
      bookStatsSummary: {
        dialog: true,
        book,
        heatmap,
      },
    });
  },

  closeBookStatsDialog() {
    set({
      bookStatsSummary: {
        dialog: false,
        book: null,
        heatmap: null,
      },
    });
  },
}));
