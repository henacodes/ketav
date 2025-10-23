import EpubReader from "@/components/EpubReader";
import { useReaderStore } from "@/stores/useReaderStore";
import { Link } from "react-router";
import { BookAlert, MoveRight, AlertTriangle } from "lucide-react";

export function HomePage() {
  const { openBook, error } = useReaderStore();

  if (openBook?.book) {
    return (
      <div className=" h-[87vh]   ">
        <EpubReader epub={openBook.book} />
      </div>
    );
  }

  return (
    <div className="bg-card h-[93vh] flex items-center justify-center">
      <div className="text-center">
        {error ? (
          <>
            <div className="flex justify-center mb-3 text-destructive">
              <AlertTriangle size={80} />
            </div>
            <h2 className="text-xl font-semibold mb-2">Error</h2>
            <p className="text-muted-foreground">{error.message}</p>
            {error.detail && (
              <p className="text-sm text-muted-foreground mt-1 mx-5  ">
                {error.detail}
              </p>
            )}
          </>
        ) : (
          <>
            <div className="flex justify-center mb-3">
              <BookAlert size={100} />
            </div>
            <p className="flex items-center justify-center">
              You don’t have any open book. Please go over to
              <Link
                className="mx-2 text-primary flex items-center hover:border-b border-accent"
                to="/library"
              >
                <span>Library</span>
                <MoveRight size={15} className="mx-2" />
              </Link>
              to open one.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
