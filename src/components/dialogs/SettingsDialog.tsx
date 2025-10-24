"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AlignmentOptions, FontFamilyOptions } from "@/lib/types/settings";
import useSettingsStore from "@/stores/useSettingsStore";
import { useReaderStore } from "@/stores/useReaderStore";
import { DEFAULT_FONT_FAMILY, DEFAULT_TEXT_ALIGNMENT } from "@/lib/constants";

const ALIGNMENT_OPTIONS: { value: AlignmentOptions; label: string }[] = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "justify", label: "Justify" },
];

const FONT_FAMILY_OPTIONS: { value: FontFamilyOptions; label: string }[] = [
  { value: "Helvetica", label: "Helvetica" },
  { value: "Lexend", label: "Lexend" },
  { value: "SegoeUI", label: "Segoe UI" },
  { value: "Robot", label: "Robot" },
  { value: "RobotoCondensed", label: "Roboto Condensed" },
  { value: "Comfortaa", label: "Comfortaa" },
];

export function SettingsDialog() {
  const { settings, updateSetting } = useSettingsStore();
  const { isSettingsDialogOpen, toggleSettingsDialog } = useReaderStore(
    (store) => store
  );
  const [localSettings, setLocalSettings] = useState({
    textAlignment: settings?.textAlignment ?? DEFAULT_TEXT_ALIGNMENT,
    fontFamily: settings?.fontFamily ?? DEFAULT_FONT_FAMILY,
  });

  useEffect(() => {
    if (settings) {
      setLocalSettings({
        textAlignment: settings.textAlignment,
        fontFamily: settings.fontFamily,
      });
    }
  }, [settings]);

  const handleSave = async () => {
    await updateSetting("textAlignment", localSettings.textAlignment);
    await updateSetting("fontFamily", localSettings.fontFamily);
  };

  const handleReset = () => {
    if (settings) {
      setLocalSettings({
        textAlignment: settings.textAlignment,
        fontFamily: settings.fontFamily,
      });
    }
  };

  return (
    <Dialog open={isSettingsDialogOpen} onOpenChange={toggleSettingsDialog}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            Appearance Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="alignment" className="text-foreground">
              Text Alignment
            </Label>
            <Select
              value={localSettings.textAlignment}
              onValueChange={(value) =>
                setLocalSettings({
                  ...localSettings,
                  textAlignment: value as AlignmentOptions,
                })
              }
            >
              <SelectTrigger
                id="alignment"
                className="bg-background border-border text-foreground"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {ALIGNMENT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Choose how text is aligned in the reader
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="font" className="text-foreground">
              Font Family
            </Label>
            <Select
              value={localSettings.fontFamily}
              onValueChange={(value) =>
                setLocalSettings({
                  ...localSettings,
                  fontFamily: value as FontFamilyOptions,
                })
              }
            >
              <SelectTrigger
                id="font"
                className="bg-background border-border text-foreground"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {FONT_FAMILY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <span style={{ fontFamily: option.value }}>
                      {option.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Select your preferred reading font
            </p>
          </div>

          <div className="space-y-2 p-4 bg-background rounded-lg border border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Preview
            </p>
            <p
              className="text-foreground leading-relaxed"
              style={{
                fontFamily: localSettings.fontFamily,
                textAlign: localSettings.textAlignment as any,
              }}
            >
              The quick brown fox jumps over the lazy dog. This is how your text
              will appear in the reader.
            </p>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={handleReset}
            className="text-foreground bg-transparent"
          >
            Reset
          </Button>
          <Button
            onClick={handleSave}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
