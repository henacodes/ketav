import EpubReader from "@/components/EpubReader";
import { useReaderStore } from "@/stores/useReaderStore";
import { useEffect } from "react";

export function HomePage() {
  const { openBook, openChapterHref, setOpenChapterHref } = useReaderStore();

  useEffect(() => {
    if (!openBook) return;
    console.log("openBookopenBook", openBook);
  }, [openBook]);

  return <div>{openBook?.book && <EpubReader epub={openBook?.book} />}</div>;
}
