import EpubReader from "@/components/EpubReader";
import { useReaderStore } from "@/stores/useReaderStore";
import { useEffect } from "react";
import { Link } from "react-router";
import { BookAlert, ArrowRight } from "lucide-react";
import { db } from "@/db/";
import { generateBookId } from "@/lib/helpers/epub";
import { Epub } from "epubix";
import { books } from "@/db/schema";
import { eq } from "drizzle-orm";
import TestReader from "@/components/TestReader";

export function HomePage() {
  const { openBook } = useReaderStore();

  useEffect(() => {
    if (!openBook) return;
    console.log("openBookopenBook", openBook);

    async function saveBookToDb(b: Epub) {
      const bookId = generateBookId(b);

      const exists = await db
        .select()
        .from(books)
        .where(eq(books.bookId, bookId));
      if (!exists.length) {
        const { metadata } = b;
        await db.insert(books).values({
          bookId,
          title: metadata?.title || "Untitled",
          author: metadata?.author || "John Doe",
        });
      }
      console.log("ALREADY SAVED TO DB", bookId, exists);
    }

    saveBookToDb(openBook.book);
  }, [openBook]);

  if (openBook?.book) {
    return <EpubReader epub={openBook?.book} />;
  } else {
    return (
      <div className=" bg-card h-[93vh] flex items-center justify-center    ">
        <div>
          <div className=" flex items-center justify-center my-3   ">
            <BookAlert size={100} />
          </div>
          <div className=" flex items-center">
            You dont have any open book. Please go over to
            <Link
              className=" mx-2 text-accent flex items-center  border-b border-accent  "
              to={"/library"}
            >
              <span>Library</span>
              <ArrowRight size={15} />
            </Link>
            to open one
          </div>
        </div>
      </div>
    );
  }
}
