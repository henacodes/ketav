import EpubReader from "@/components/EpubReader";
import { useReaderStore } from "@/stores/useReaderStore";
import { useEffect } from "react";
import { Link } from "react-router";
import { BookAlert, ArrowRight, MoveRight } from "lucide-react";
import { db } from "@/db/";
import { generateBookId } from "@/lib/helpers/epub";
import { Epub } from "epubix";
import { books } from "@/db/schema";
import { eq } from "drizzle-orm";
import TestReader from "@/components/TestReader";

import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
// when using `"withGlobalTauri": true`, you may use
// const { isPermissionGranted, requestPermission, sendNotification, } = window.__TAURI__.notification;

export function HomePage() {
  const { openBook } = useReaderStore();

  useEffect(() => {
    async function sendNotif() {
      // Do you have permission to send a notification?
      let permissionGranted = await isPermissionGranted();

      // If not we need to request it
      if (!permissionGranted) {
        const permission = await requestPermission();
        permissionGranted = permission === "granted";
      }

      // Once permission has been granted we can send the notification
      if (permissionGranted) {
        sendNotification({ title: "Tauri", body: "Tauri is awesome!" });
      }
    }

    sendNotif();
  });

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
              className=" mx-2 text-primary flex items-center   hover:border-b border-accent          "
              to={"/library"}
            >
              <span>Library</span>
              <MoveRight size={15} className="mx-2" />
            </Link>
            to open one
          </div>
        </div>
      </div>
    );
  }
}
