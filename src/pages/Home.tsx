import EpubReader from "@/components/EpubReader";
import { Button } from "@/components/ui/button";
import { useReaderStore } from "@/stores/useReaderStore";
import { useEffect } from "react";

export function HomePage() {
  const { openBook } = useReaderStore();

  useEffect(() => {
    if (!openBook) return;
    console.log("openBookopenBook", openBook);
  }, [openBook]);

  return (
    <div>
      <Button
        onClick={async () => {
          try {
            console.log("supppp");
            // Lazy import the db so we can see the error only on demand and avoid
            // crashing the whole renderer at module-load time.
            const { db } = await import("@/db");
            const { books } = await import("@/db/schema");

            const res = await db
              .insert(books)
              .values({ title: "SOme test book title", author: "Jimmy Dunn" });
            const query = await db.select().from(books);

            console.log("querrry", query);
          } catch (err) {
            // Print the full error; paste this into the chat.
            console.error("DB import/operation failed:", err);
            alert("DB operation failed — see console for details.");
          }
        }}
      >
        Test DBbb
      </Button>

      {openBook?.book && <EpubReader epub={openBook?.book} />}
    </div>
  );
}
