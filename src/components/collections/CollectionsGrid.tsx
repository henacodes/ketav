import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Trash2 } from "lucide-react";

interface Collection {
  id: number;
  name: string;
  description: string | null;
  books?: any[];
}

interface CollectionsGridProps {
  collections: Collection[];
  onDeleteCollection: (id: number) => void;
  onViewCollection: (collectionId: number) => void;
}

export function CollectionsGrid({
  collections,
  onDeleteCollection,
  onViewCollection,
}: CollectionsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {collections.map((collection) => (
        <Card
          key={collection.id}
          className="overflow-hidden bg-card border-border hover:border-primary/50 transition-colors p-6"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">
                  {collection.name}
                </h3>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDeleteCollection(collection.id)}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          {collection.description && (
            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
              {collection.description}
            </p>
          )}

          <Button
            onClick={() => onViewCollection(collection.id)}
            variant="outline"
            size="sm"
            className="w-full border-border text-foreground hover:bg-muted bg-transparent"
          >
            View Collection
          </Button>
        </Card>
      ))}
    </div>
  );
}
