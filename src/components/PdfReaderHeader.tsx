import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

type PdfHeaderProps = {
  currentPage: number;
  numPages: number;
  zoom: number;
  onPrev: () => void;
  onNext: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onGoToPage: (page: number) => void; // new callback
};

export function PdfHeader({
  currentPage,
  numPages,
  zoom,
  onPrev,
  onNext,
  onZoomIn,
  onZoomOut,
  onGoToPage,
}: PdfHeaderProps) {
  const [inputPage, setInputPage] = useState(currentPage);

  // Sync input with currentPage changes
  useEffect(() => {
    setInputPage(currentPage);
  }, [currentPage]);

  const handlePageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ""); // remove non-digits
    setInputPage(Number(value));
  };

  const handlePageSubmit = () => {
    if (inputPage < 1) onGoToPage(1);
    else if (inputPage > numPages) onGoToPage(numPages);
    else onGoToPage(inputPage);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handlePageSubmit();
  };

  const handleBlur = () => handlePageSubmit();

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        padding: "8px 16px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 10,
      }}
      className="bg-card"
    >
      <Button variant={"ghost"} onClick={onPrev} disabled={currentPage <= 1}>
        Prev
      </Button>

      <input
        type="text"
        value={inputPage}
        onChange={handlePageChange}
        onKeyDown={handleKeyPress}
        onBlur={handleBlur}
        className="w-12 text-center border rounded-md px-1"
      />
      <span>/ {numPages}</span>

      <Button
        variant={"ghost"}
        onClick={onNext}
        disabled={currentPage >= numPages}
      >
        Next
      </Button>

      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 bg-transparent"
        onClick={onZoomOut}
        disabled={zoom <= 0.25}
      >
        -
      </Button>

      <span>{(zoom * 100).toFixed(0)}%</span>

      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 bg-transparent"
        onClick={onZoomIn}
        disabled={zoom >= 3}
      >
        +
      </Button>
    </div>
  );
}
