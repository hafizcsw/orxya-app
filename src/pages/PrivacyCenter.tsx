// Epic 9: Privacy Center Page
import { useState, useEffect } from "react";
import { Shield, Download, Trash2, Clock, Power, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  getPrivacyPrefs, 
  updatePrivacyPrefs, 
  requestExport, 
  requestDelete,
  type PrivacyPrefs 
} from "@/lib/privacyClient";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function PrivacyCenter() {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<PrivacyPrefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadPrefs();
  }, []);

  const loadPrefs = async () => {
    setLoading(true);
    const data = await getPrivacyPrefs();
    if (data) {
      setPrefs(data);
    } else {
      // Initialize with defaults
      const defaults: PrivacyPrefs = {
        health_enabled: true,
        calendar_enabled: true,
        notif_fin_enabled: true,
        location_enabled: true,
        pause_all: false,
        retention_days: 90
      };
      await updatePrivacyPrefs(defaults);
      setPrefs(defaults);
    }
    setLoading(false);
  };

  const handleToggle = async (key: keyof PrivacyPrefs, value: boolean) => {
    if (!prefs) return;
    
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    
    const success = await updatePrivacyPrefs({ [key]: value });
    if (success) {
      toast({
        title: "Updated",
        description: `Privacy setting updated successfully`,
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to update privacy settings",
        variant: "destructive"
      });
      setPrefs(prefs); // Revert
    }
  };

  const handleRetentionChange = async (days: string) => {
    if (!prefs) return;
    
    const retention_days = parseInt(days);
    const updated = { ...prefs, retention_days };
    setPrefs(updated);
    
    const success = await updatePrivacyPrefs({ retention_days });
    if (success) {
      toast({
        title: "Retention Updated",
        description: `Data will be retained for ${retention_days} days`,
      });
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const result = await requestExport();
      if (result.url) {
        window.open(result.url, '_blank');
        toast({
          title: "Export Ready",
          description: `Your data export is ready. Link expires in ${result.expires_in}.`,
        });
      }
    } catch (error) {
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export data",
        variant: "destructive"
      });
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const result = await requestDelete();
      toast({
        title: "Delete Request Submitted",
        description: result.message,
      });
      // Reload prefs to show pause_all = true
      await loadPrefs();
    } catch (error) {
      toast({
        title: "Delete Request Failed",
        description: error instanceof Error ? error.message : "Failed to submit delete request",
        variant: "destructive"
      });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-24 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!prefs) return null;

  const isPaused = prefs.pause_all;

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Privacy Center</h1>
          <p className="text-muted-foreground">Control your data collection and privacy settings</p>
        </div>
      </div>

      {/* Master Control */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Power className="h-5 w-5" />
              <CardTitle>Master Control</CardTitle>
            </div>
            <Switch
              checked={isPaused}
              onCheckedChange={(checked) => handleToggle("pause_all", checked)}
            />
          </div>
          <CardDescription>
            {isPaused 
              ? "All data collection is paused. App will use cached data only."
              : "Data collection is active across all sources."}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Data Sources */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Sources
          </CardTitle>
          <CardDescription>
            Control individual data collection sources
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Health Data</Label>
              <p className="text-sm text-muted-foreground">Steps, sleep, heart rate from Health Connect</p>
            </div>
            <Switch
              checked={prefs.health_enabled && !isPaused}
              disabled={isPaused}
              onCheckedChange={(checked) => handleToggle("health_enabled", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Calendar Events</Label>
              <p className="text-sm text-muted-foreground">Local calendar sync and event tracking</p>
            </div>
            <Switch
              checked={prefs.calendar_enabled && !isPaused}
              disabled={isPaused}
              onCheckedChange={(checked) => handleToggle("calendar_enabled", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Financial Notifications</Label>
              <p className="text-sm text-muted-foreground">Track expenses via notification access</p>
            </div>
            <Switch
              checked={prefs.notif_fin_enabled && !isPaused}
              disabled={isPaused}
              onCheckedChange={(checked) => handleToggle("notif_fin_enabled", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Location Tracking</Label>
              <p className="text-sm text-muted-foreground">Periodic location for prayer times</p>
            </div>
            <Switch
              checked={prefs.location_enabled && !isPaused}
              disabled={isPaused}
              onCheckedChange={(checked) => handleToggle("location_enabled", checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Retention */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Data Retention
          </CardTitle>
          <CardDescription>
            How long to keep your data before automatic deletion
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={String(prefs.retention_days)}
            onValueChange={handleRetentionChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="90">90 days (recommended)</SelectItem>
              <SelectItem value="180">180 days</SelectItem>
              <SelectItem value="365">1 year</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Export & Delete */}
      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
          <CardDescription>
            Export or delete all your data
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button
            onClick={handleExport}
            disabled={exporting}
            variant="outline"
            className="flex-1"
          >
            <Download className="h-4 w-4 mr-2" />
            {exporting ? "Exporting..." : "Export My Data"}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                disabled={deleting}
                variant="destructive"
                className="flex-1"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {deleting ? "Processing..." : "Delete My Data"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will immediately stop all data collection and request permanent deletion of your data.
                  Actual deletion will occur after a 30-day compliance review period.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                  Yes, Delete My Data
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
