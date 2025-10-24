import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Moon, Bell, FolderOpen, Terminal } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import useSettingsStore from "@/stores/useSettingsStore";
import { documentDir, normalize, join } from "@tauri-apps/api/path";
import { Theme, useTheme } from "@/components/theme-provider";
import { THEME_STORAGE_KEY } from "@/lib/constants";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function SettingsPage() {
  const [_, setSelectedDir] = useState<string | null>(null);
  const { setTheme } = useTheme();

  const { settings, fetchSettings, updateSetting } = useSettingsStore();
  const [fullLibraryPath, setFullLibraryPath] = useState<string | null>(null);
  const [currentTheme, setCurrentTheme] = useState<Theme>("light");

  const [error, setError] = useState<{
    title: string;
    description?: string;
  } | null>(null);

  async function handleSelectDirectory() {
    setError(null);
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
      setError({
        title: "Invalid Folder",
        description:
          "You can only select a folder nested inside Documents folder",
      });

      return;
    }

    let subfolder = normalizedSelected.slice(normalizedDocs.length);
    // Remove leading separators
    subfolder = subfolder.replace(/^[/\\]+/, "");

    // Update store with the subfolder
    await updateSetting("libraryFolderPath", subfolder);

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

  useEffect(() => {
    const theme = localStorage.getItem(THEME_STORAGE_KEY);
    if (theme == "dark") {
      setCurrentTheme("dark");
    } else {
      setCurrentTheme("light");
    }
  }, []);
  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2 text-foreground">Settings</h1>
      <p className="text-muted-foreground mb-8">
        Customize your reading experience
      </p>

      <div className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <Terminal />
            <AlertTitle>{error.title}</AlertTitle>
            <AlertDescription>{error.description}</AlertDescription>
          </Alert>
        )}
        {/* Appearance */}
        <Card className="p-6 bg-card border-border">
          <h2 className="text-xl font-semibold mb-4 text-foreground">
            Appearance
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-11  ">
              <div className="flex items-center gap-3">
                <Moon className="w-5 h-5 text-primary" />
                <div>
                  <Label className="text-foreground">Dark Mode</Label>
                </div>
              </div>
              <Switch
                checked={currentTheme === "dark"}
                onCheckedChange={(checked) => {
                  let theme: Theme = checked ? "dark" : "light";
                  setTheme(theme);
                  setCurrentTheme(theme);
                }}
              />
            </div>
          </div>
        </Card>

        {/* Notifications */}
        <Card className="p-6 bg-card border-border  ">
          <h2 className="text-xl font-semibold mb-4 text-foreground">
            Notifications
          </h2>
          <div className="space-y-4  ">
            <div className="flex items-center justify-between gap-11  ">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-foreground   " />
                <div>
                  <Label className="text-foreground  ">
                    Reading Reminders (working on it yet)
                  </Label>
                  <p className="text-sm text-muted-foreground my-1 ">
                    Get notified to maintain your streak
                  </p>
                </div>
              </div>
              <Switch disabled={true} />
            </div>
          </div>
        </Card>

        {/* Data & Storage */}
        <Card className="p-6 bg-card border-border">
          <h2 className="text-xl font-semibold mb-4 text-foreground">
            Data & Storage
          </h2>
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-11  ">
              <div className="flex items-center gap-3 ">
                <FolderOpen className="w-5 h-5 text-primary" />
                <div>
                  <Label className="text-foreground">Storage Location</Label>
                  <p className="text-sm text-muted-foreground my-1 ">
                    Select the folder you store your EPub files ( should be
                    inside Documents folder )
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="  "
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
