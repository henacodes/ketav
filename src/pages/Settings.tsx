import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Moon, Bell, Eye, Download, FolderOpen } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import useSettingsStore from "@/stores/useSettingsStore";
import { documentDir, normalize, join } from "@tauri-apps/api/path";

export function SettingsPage() {
  const [selectedDir, setSelectedDir] = useState<string | null>(null);
  const { settings, fetchSettings, updateLibraryFolderPath } =
    useSettingsStore();
  const [fullLibraryPath, setFullLibraryPath] = useState<string | null>(null);

  async function handleSelectDirectory() {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Select a directory for storing offline books",
    });

    if (typeof selected !== "string") return;

    const docs = await documentDir();
    if (!docs) return;

    const normalizedDocs = await normalize(docs);
    const normalizedSelected = await normalize(selected);

    // Check if selected folder is inside Documents
    if (!normalizedSelected.startsWith(normalizedDocs)) {
      console.error("Selected folder must be inside Documents");
      return;
    }

    let subfolder = normalizedSelected.slice(normalizedDocs.length);
    // Remove leading separators
    subfolder = subfolder.replace(/^[/\\]+/, "");

    // Update store with the subfolder
    await updateLibraryFolderPath(subfolder);

    // Compute full path for UX display
    const fullPath = await join(normalizedDocs, subfolder);
    setFullLibraryPath(fullPath);

    // Optionally update local state if needed
    setSelectedDir(subfolder);
  }
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    async function updateFullPath() {
      if (settings?.libraryFolderPath) {
        console.log("settingssss", settings);
        const docs = await documentDir();
        const fullPath = await join(docs, settings.libraryFolderPath);
        setFullLibraryPath(fullPath);
      }
    }

    updateFullPath();
  }, [settings]);
  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2 text-foreground">Settings</h1>
      <p className="text-muted-foreground mb-8">
        Customize your reading experience
      </p>

      <div className="space-y-6">
        {/* Appearance */}
        <Card className="p-6 bg-card border-border">
          <h2 className="text-xl font-semibold mb-4 text-foreground">
            Appearance
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Moon className="w-5 h-5 text-primary" />
                <div>
                  <Label className="text-foreground">Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Always enabled for comfortable reading
                  </p>
                </div>
              </div>
              <Switch checked disabled />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5 text-primary" />
                <div>
                  <Label className="text-foreground">Reading Focus Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Minimize distractions while reading
                  </p>
                </div>
              </div>
              <Switch />
            </div>
          </div>
        </Card>

        {/* Notifications */}
        <Card className="p-6 bg-card border-border">
          <h2 className="text-xl font-semibold mb-4 text-foreground">
            Notifications
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-primary" />
                <div>
                  <Label className="text-foreground">Reading Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified to maintain your streak
                  </p>
                </div>
              </div>
              <Switch />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-primary" />
                <div>
                  <Label className="text-foreground">
                    New Book Recommendations
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Discover books based on your interests
                  </p>
                </div>
              </div>
              <Switch />
            </div>
          </div>
        </Card>

        {/* Data & Storage */}
        <Card className="p-6 bg-card border-border">
          <h2 className="text-xl font-semibold mb-4 text-foreground">
            Data & Storage
          </h2>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Download className="w-5 h-5 text-primary" />
                <div>
                  <Label className="text-foreground">Offline Reading</Label>
                  <p className="text-sm text-muted-foreground">
                    Download books for offline access
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                Manage
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FolderOpen className="w-5 h-5 text-primary" />
                <div>
                  <Label className="text-foreground">Storage Location</Label>
                  <p className="text-sm text-muted-foreground">
                    Choose where your downloaded books are stored
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectDirectory}
              >
                Select Folder
              </Button>
            </div>

            {settings?.libraryFolderPath && (
              <div className="ml-8 mt-2">
                <p className="text-sm text-muted-foreground truncate max-w-md">
                  📁 {fullLibraryPath}
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
