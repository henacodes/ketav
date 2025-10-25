import { Button } from "./ui/button";

type PdfHeaderProps = {
  currentPage: number;
  numPages: number;
  zoom: number;
  onPrev: () => void;
  onNext: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
};

export function PdfHeader({
  currentPage,
  numPages,
  zoom,
  onPrev,
  onNext,
  onZoomIn,
  onZoomOut,
}: PdfHeaderProps) {
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
      className=" bg-card "
    >
      <Button variant={"ghost"} onClick={onPrev} disabled={currentPage <= 1}>
        Prev
      </Button>
      <span>
        Page {currentPage} / {numPages}
      </span>
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

      <span> {(zoom * 100).toFixed(0)}%</span>
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
