"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Bookmark, Type } from "lucide-react";

export function HomePage() {
  const [fontSize, setFontSize] = useState(18);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-8 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
          >
            <Type className="w-4 h-4 mr-2" />
            Font Size
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 bg-transparent"
              onClick={() => setFontSize(Math.max(14, fontSize - 2))}
            >
              -
            </Button>
            <span className="text-sm text-muted-foreground w-8 text-center">
              {fontSize}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 bg-transparent"
              onClick={() => setFontSize(Math.min(24, fontSize + 2))}
            >
              +
            </Button>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="text-primary hover:text-primary/80"
        >
          <Bookmark className="w-4 h-4 mr-2" />
          Bookmark
        </Button>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto px-8 py-12">
          <h1 className="font-serif text-4xl font-bold mb-2 text-foreground">
            The Art of Reading
          </h1>
          <p className="text-primary text-sm mb-8">Chapter 1</p>

          <div
            className="font-serif leading-relaxed space-y-6 text-foreground"
            style={{ fontSize: `${fontSize}px` }}
          >
            <p className="first-letter:text-6xl first-letter:font-bold first-letter:text-primary first-letter:mr-2 first-letter:float-left">
              In the quiet hours of the evening, when the world settles into a
              gentle rhythm, there exists a sacred space between the reader and
              the page. This space is not merely physical, but a realm of
              infinite possibility where words transform into worlds, and
              sentences become doorways to understanding.
            </p>

            <p>
              The act of reading is, at its core, an intimate conversation
              across time and space. An author, perhaps long departed, speaks
              directly to you through carefully chosen words. Each sentence is a
              gift, wrapped in the delicate paper of language, waiting to be
              unwrapped by an attentive mind.
            </p>

            <p>
              Consider the weight of a book in your hands—not just its physical
              mass, but the accumulated wisdom, imagination, and effort it
              represents. Thousands of hours of thought, revision, and craft
              have been distilled into these pages. The reader's task is to
              honor this effort with presence and attention.
            </p>

            <p>
              In our modern age of constant distraction, the simple act of
              sustained reading becomes almost revolutionary. To sit with a book
              for an hour, to follow a single thread of thought without
              interruption, is to reclaim a piece of our humanity that
              technology threatens to fragment.
            </p>

            <p>
              The best readers are not passive consumers but active participants
              in the creation of meaning. They bring their own experiences,
              questions, and insights to the text, creating a unique
              interpretation that belongs to them alone. No two people read the
              same book in quite the same way.
            </p>

            <p>
              This is the magic of reading: it is both solitary and communal,
              ancient and ever-new. Each time we open a book, we join a
              conversation that spans centuries, connecting us to minds both
              familiar and foreign, challenging us to grow beyond the boundaries
              of our own experience.
            </p>
          </div>

          <div className="flex items-center justify-between mt-16 pt-8 border-t border-border">
            <Button
              variant="ghost"
              className="text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">Page 1 of 247</span>
            <Button
              variant="ghost"
              className="text-muted-foreground hover:text-foreground"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
