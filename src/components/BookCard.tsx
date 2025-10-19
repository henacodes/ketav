import { LibraryEpub } from "@/lib/types/epub";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useReaderStore } from "@/stores/useReaderStore";
import { useNavigate } from "react-router";
import { Book } from "@/db/schema";
import { trimBookTitle } from "@/lib/helpers/epub";

export default function BookCard({
  book,
  index,
  imgSrc,
}: {
  book: Book;
  index: number;
  imgSrc?: string;
}) {
  const setOpenBook = useReaderStore((state) => state.setOpenBook);
  const navigate = useNavigate();

  function handleOpenBook(epubMetadata: LibraryEpub) {
    setOpenBook(epubMetadata);
    navigate("/");
  }

  return (
    <Card
      key={index}
      className="overflow-hidden bg-card border-border hover:border-primary/50 transition-colors p-0 "
    >
      <div className="aspect-[2/3] bg-muted relative">
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

        {/* Progress / completed badge commented for now */}
        {/*
                {book.progress === 100 && (
                  <div className="absolute top-2 right-2 bg-primary/90 rounded-full p-1">
                    <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
                */}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-foreground mb-1 ">
          {trimBookTitle(book.title)}
        </h3>
        <p className="text-sm text-muted-foreground mb-3">{book.author}</p>

        {/* Progress bar commented for now */}
        {/*
                {book.progress > 0 && book.progress < 100 && (
                  <>
                    <div className="w-full bg-muted rounded-full h-2 mb-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${book.progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      {book.progress}% complete
                    </p>
                  </>
                )}
                */}

        <Button
          onClick={() => handleOpenBook(book)}
          variant="outline"
          size="sm"
          className="w-full"
        >
          {/* Progress / reading status commented for now */}
          {/*
                  {book.progress === 100 ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Completed
                    </>
                  ) : book.progress > 0 ? (
                    <>
                      <BookOpen className="w-4 h-4 mr-2" />
                      Continue Reading
                    </>
                  ) : (
                    <>
                      <Clock className="w-4 h-4 mr-2" />
                      Start Reading
                    </>
                  )}
                  */}
          Open
        </Button>
      </div>
    </Card>
  );
}
