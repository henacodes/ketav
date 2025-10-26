import { LibraryEpub } from "@/lib/types/epub";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useReaderStore } from "@/stores/useReaderStore";
import { useNavigate } from "react-router";
import { Book } from "@/db/schema";
import { trimBookTitle } from "@/lib/helpers/epub";
import { getFileExtension } from "@/lib/helpers/fs";
import { Badge } from "./ui/badge";
import { STORE_KEYS } from "@/lib/constants";

export default function BookCard({
  book,
  index,
  imgSrc,
}: {
  book: Book;
  index: number;
  imgSrc?: string;
}) {
  const closeBook = useReaderStore((state) => state.closeBook);
  const navigate = useNavigate();

  function handleOpenBook(fileName: string) {
    closeBook();
    localStorage.setItem(STORE_KEYS.lastOpenedBook, fileName);
    navigate("/");
  }

  return (
    <Card
      key={index}
      className="overflow-hidden bg-card border-border hover:border-primary/50 transition-colors p-0"
    >
      <div className="aspect-2/3 bg-muted relative">
        {/* Badge positioned absolutely */}
        <div className="absolute top-5 left-5 z-20 ">
          <Badge
            variant="secondary"
            className="px-3 py-1 flex items-center gap-1"
          >
            <img
              src={`/${getFileExtension(book.fileName)}.svg`}
              className="w-3"
            />
            <small>
              {getFileExtension(book.fileName)}{" "}
              {book.pages && `| ${book.pages} pages`}
            </small>
          </Badge>
        </div>

        {imgSrc ? (
          <img
            src={imgSrc}
            alt={book.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <img
            src="/epub.svg"
            alt="No cover"
            className="w-24 h-24 object-contain opacity-50 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          />
        )}
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-foreground mb-1">
          <span>{trimBookTitle(book.title)}</span>
        </h3>
        <p className="text-sm text-muted-foreground mb-3">{book.author}</p>

        <Button
          onClick={() => handleOpenBook(book.fileName)}
          variant="outline"
          size="sm"
          className="w-full"
        >
          Open
        </Button>
      </div>
    </Card>
  );
}
