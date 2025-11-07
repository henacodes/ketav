"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CollectionsGrid } from "@/components/collections/CollectionsGrid";
import { CollectionsHeader } from "@/components/collections/CollectionsHeader";
import { CollectionDetailView } from "@/components/collections/CollectionDetail";
import { ChevronLeft } from "lucide-react";
import {
  createCollection,
  deleteCollection,
  addBookToCollection,
  removeBookFromCollection,
  getCollections,
  getCollectionWithBooks,
} from "@/db/services/collections.services"; // adjust import path if needed

interface Book {
  id: number;
  title: string;
  author: string;
  cover: string;
}
interface Collection {
  id: number;
  name: string;
  description: string | null;
  books: Book[];
}

export function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] =
    useState<Collection | null>(null);

  useEffect(() => {
    async function loadCollections() {
      const data = await getCollections();
      setCollections(data);
    }
    loadCollections();
  }, []);

  async function handleCreateCollection(name: string, description: string) {
    const newCollection = await createCollection({ name, description });
    console.log("new collectionsss", newCollection);
    setCollections((prev) => [...prev, { ...newCollection, books: [] }]);
  }

  async function handleDeleteCollection(id: number) {
    await deleteCollection(id);
    setCollections((prev) => prev.filter((c) => c.id !== id));
    if (selectedCollection?.id === id) setSelectedCollection(null);
  }

  async function handleViewCollection(collectionId: number) {
    const fullCollection = await getCollectionWithBooks(collectionId);
    if (fullCollection) setSelectedCollection(fullCollection);
  }

  async function handleAddBookToCollection(bookId: number) {
    if (!selectedCollection) return;
    await addBookToCollection({
      collectionId: selectedCollection.id,
      bookId,
    });
    const updated = await getCollectionWithBooks(selectedCollection.id);
    if (updated) setSelectedCollection(updated);
  }

  async function handleRemoveBookFromCollection(bookId: number) {
    if (!selectedCollection) return;
    await removeBookFromCollection(selectedCollection.id, bookId);
    const updated = await getCollectionWithBooks(selectedCollection.id);
    if (updated) setSelectedCollection(updated);
  }

  if (selectedCollection) {
    return (
      <div className="max-w-6xl mx-auto p-8">
        <Button
          variant="ghost"
          onClick={() => setSelectedCollection(null)}
          className="mb-6 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Collections
        </Button>

        <CollectionDetailView
          collection={selectedCollection}
          onAddBook={handleAddBookToCollection}
          onRemoveBook={handleRemoveBookFromCollection}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      <CollectionsHeader onCreateCollection={handleCreateCollection} />

      <CollectionsGrid
        collections={collections}
        onDeleteCollection={handleDeleteCollection}
        onViewCollection={handleViewCollection}
      />

      {collections.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            No collections yet. Create one to organize your books!
          </p>
        </div>
      )}
    </div>
  );
}
