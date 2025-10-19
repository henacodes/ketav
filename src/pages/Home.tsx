import EpubReader from "@/components/EpubReader";
import { useReaderStore } from "@/stores/useReaderStore";
import { Link } from "react-router";
import { BookAlert, MoveRight } from "lucide-react";

export function HomePage() {
  const { openBook } = useReaderStore();

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
