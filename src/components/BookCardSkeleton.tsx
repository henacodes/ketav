import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function BookCardSkeleton() {
  return (
    <Card className="overflow-hidden bg-card border-border hover:border-primary/50 transition-colors p-0 ">
      <div className="aspect-[2/3] bg-muted relative">
        <Skeleton className="w-full h-full" />
      </div>

      <div className="p-4 space-y-3">
        {/* Book title */}
        <Skeleton className="h-[20px] w-[70%] rounded-full" />

        {/* Author */}
        <Skeleton className="h-[16px] w-[50%] rounded-full" />

        {/* Progress bar (future feature placeholder) */}
        {/* <Skeleton className="h-2 w-full rounded-full" /> */}

        {/* Button */}
        <Skeleton className="h-[36px] w-full rounded-lg" />
      </div>
    </Card>
  );
}
