import React from "react";
import {
  Settings,
  Globe,
  Sparkles,
  Play,
  FileJson,
  Check,
  Code2,
  Table,
  FileText,
  Download,
  Trash2,
  Gauge,
  ChevronDown,
  ChevronRight,
  Database,
  Network,
  Layers,
  Timer,
  History,
  Info,
  Loader2,
  AlertTriangle,
  FileUp,
  Braces
} from "lucide-react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Kbd } from "@/components/ui/kbd";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { HistoryItem } from "./useJSONEditorState";

interface ControlDeckProps {
  mode: "formatter" | "validator" | "minifier";
  validationStatus: "idle" | "valid" | "invalid";
  inputText: string;
  outputText: string;
  outputMode: "json" | "xml" | "csv" | "yaml" | "typescript";
  setActiveTab: (val: string) => void;
  // History dialog states & methods
  historyList: HistoryItem[];
  isHistoryOpen: boolean;
  setIsHistoryOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setInputText: (val: string) => void;
  clearHistory: () => void;
  // URL load dialog states & methods
  isUriOpen: boolean;
  setIsUriOpen: React.Dispatch<React.SetStateAction<boolean>>;
  uriInput: string;
  setUriInput: (val: string) => void;
  uriLoading: boolean;
  uriError: string | null;
  handleFetchUri: (e: React.FormEvent) => void;
  setUriError: (val: string | null) => void;
  // Upload helper
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  // Actions
  triggerPrimaryAction: () => void;
  runProcessing: (shouldSaveHistory?: boolean, targetFormat?: "json" | "xml" | "csv" | "yaml" | "minify" | "typescript") => void;
  downloadOutput: () => void;
  handleClear: () => void;
  // Diagnostics
  hudExpanded: boolean;
  setHudExpanded: (val: boolean) => void;
  metrics: {
    lineCount: number;
    charCount: number;
    sizeBytes: number;
    depth: number;
    nodeCount: number;
    parseTimeMs: number;
  };
  formatBytes: (bytes: number) => string;
  // Preferences
  prefsExpanded: boolean;
  setPrefsExpanded: (val: boolean) => void;
  indentSize: string;
  handleIndentChange: (val: string) => void;
  liveValidation: boolean;
  toggleLiveVal: (val: boolean) => void;
  saveHistory: boolean;
  toggleHistorySave: (val: boolean) => void;
  bigNumSupport: boolean;
  toggleBigNum: (val: boolean) => void;
}

export const ControlDeck: React.FC<ControlDeckProps> = ({
  mode,
  validationStatus,
  inputText,
  outputText,
  outputMode,
  setActiveTab,
  historyList,
  isHistoryOpen,
  setIsHistoryOpen,
  setInputText,
  clearHistory,
  isUriOpen,
  setIsUriOpen,
  uriInput,
  setUriInput,
  uriLoading,
  uriError,
  handleFetchUri,
  setUriError,
  handleFileUpload,
  triggerPrimaryAction,
  runProcessing,
  downloadOutput,
  handleClear,
  hudExpanded,
  setHudExpanded,
  metrics,
  formatBytes,
  prefsExpanded,
  setPrefsExpanded,
  indentSize,
  handleIndentChange,
  liveValidation,
  toggleLiveVal,
  saveHistory,
  toggleHistorySave,
  bigNumSupport,
  toggleBigNum
}) => {
  return (
    <TooltipProvider>
      <div className="flex flex-col gap-5 justify-start shrink-0 lg:sticky lg:top-[5.5rem] self-start w-full">
        {/* Control Panel Card */}
        <Card className="py-0 border-border bg-card flex flex-col shadow-lg overflow-hidden shrink-0">
          <div className="h-12 bg-secondary/15 border-b border-border flex flex-row items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-2">
              <Settings size={15} className="text-muted-foreground" />
              <CardTitle className="text-xs font-semibold font-sans tracking-wide">CONTROLS DECK</CardTitle>
            </div>

            {/* Live validation status badge */}
            <div className="flex items-center">
              {validationStatus === "valid" && (
                <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-sans font-bold uppercase tracking-wider select-none animate-in fade-in duration-200">
                  <span className="flex h-1.5 w-1.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  <span>Valid JSON</span>
                </span>
              )}
              {validationStatus === "invalid" && (
                <span className="inline-flex items-center gap-1.5 bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-sans font-bold uppercase tracking-wider select-none animate-in fade-in duration-200">
                  <span className="flex h-1.5 w-1.5 relative">
                    <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                  </span>
                  <span>Invalid JSON</span>
                </span>
              )}
              {validationStatus === "idle" && (
                <span className="inline-flex items-center gap-1.5 bg-secondary text-muted-foreground border border-border px-2.5 py-0.5 rounded-full text-[10px] font-sans font-bold uppercase tracking-wider select-none animate-in fade-in duration-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30"></span>
                  <span>Idle</span>
                </span>
              )}
            </div>
          </div>

          <CardContent className="p-4 flex flex-col gap-4 text-xs font-sans">
            {/* Import/Data Actions */}
            <div className="flex flex-col gap-2">
              <span className="text-[9px] font-bold text-muted-foreground/75 tracking-wider uppercase mb-1">Data Inputs</span>
              <div className="grid grid-cols-2 gap-2">
                {/* File Upload Button */}
                <label className="h-8.5 rounded-none border border-border/80 hover:bg-secondary/60 flex items-center justify-center gap-1.5 text-[11px] cursor-pointer transition-colors font-medium">
                  <FileUp size={11} className="text-muted-foreground" />
                  <span>Upload File</span>
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileUpload}
                    className="hidden"
                    aria-label="Upload JSON File"
                  />
                </label>

                {/* URL Load Trigger */}
                <Dialog open={isUriOpen} onOpenChange={setIsUriOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8.5 text-[11px] justify-center gap-1.5 cursor-pointer border-border/80"
                    >
                      <Globe size={11} className="text-muted-foreground" />
                      <span>Load URL</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border sm:max-w-md font-sans">
                    <DialogHeader>
                      <DialogTitle className="font-heading">Load JSON from URL</DialogTitle>
                      <DialogDescription className="text-xs">
                        Fetch JSON data from a remote endpoint directly.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleFetchUri} className="space-y-4 my-2">
                      <label htmlFor="url-input" className="sr-only">Target JSON URL</label>
                      <Input
                        id="url-input"
                        type="url"
                        required
                        value={uriInput}
                        onChange={(e) => setUriInput(e.target.value)}
                        placeholder="https://api.example.com/data.json"
                        className="bg-secondary border-border/80 focus-visible:ring-1 focus-visible:ring-primary font-mono text-xs h-9"
                      />
                      {uriError && (
                        <p className="text-[10px] text-destructive bg-destructive/10 border border-destructive/20 p-2.5 rounded flex items-start gap-1.5 leading-relaxed font-sans">
                          <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                          <span>{uriError}</span>
                        </p>
                      )}
                      <DialogFooter className="gap-2 sm:gap-0 mt-4">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => { setIsUriOpen(false); setUriError(null); }}
                          className="text-xs h-9 cursor-pointer"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={uriLoading}
                          className="text-xs h-9 bg-primary text-primary-foreground hover:bg-primary/95 cursor-pointer"
                        >
                          {uriLoading ? (
                            <>
                              <Loader2 size={12} className="animate-spin" />
                              <span>Fetching...</span>
                            </>
                          ) : (
                            "Fetch JSON"
                          )}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <Separator className="bg-border/60" />

            {/* Contextual Primary Action Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={triggerPrimaryAction}
                  disabled={!inputText.trim()}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/10 h-10 gap-2 font-semibold tracking-wide cursor-pointer transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                >
                  <Sparkles size={14} className="animate-pulse" />
                  <span className="uppercase font-heading font-bold">
                    {mode === "minifier" ? "Minify JSON" : mode === "validator" ? "Validate JSON" : "Format / Beautify"}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="flex items-center gap-1 bg-popover text-popover-foreground border border-border text-[10px] py-1">
                <span>Trigger Primary Action</span>
                <Kbd className="bg-muted text-muted-foreground">Ctrl</Kbd>
                <span>+</span>
                <Kbd className="bg-muted text-muted-foreground">Enter</Kbd>
              </TooltipContent>
            </Tooltip>

            <Separator className="bg-border/60" />

            {/* Operations Section */}
            <div className="flex flex-col gap-2">
              <span className="text-[9px] font-bold text-muted-foreground/75 tracking-wider uppercase mb-1">Standard Actions</span>

              {/* Format & Minify utilities */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { runProcessing(true, "json"); setActiveTab("tree"); }}
                  disabled={!inputText.trim()}
                  className="h-8.5 text-[11px] justify-center gap-1.5 cursor-pointer hover:bg-secondary/60 text-card-foreground border-border/80"
                >
                  <Play size={11} className="text-emerald-500" />
                  <span>Format</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { runProcessing(true, "minify"); setActiveTab("text"); }}
                  disabled={!inputText.trim()}
                  className="h-8.5 text-[11px] justify-center gap-1.5 cursor-pointer hover:bg-secondary/60 text-card-foreground border-border/80"
                >
                  <FileJson size={11} className="text-sky-500" />
                  <span>Minify</span>
                </Button>
              </div>

              {/* Validate button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => runProcessing(true, "json")}
                disabled={!inputText.trim()}
                className="h-8.5 text-[11px] justify-center gap-1.5 cursor-pointer hover:bg-secondary/60 text-card-foreground border-border/80 w-full"
              >
                <Check size={12} className="text-amber-500" />
                <span>Validate JSON</span>
              </Button>
            </div>

            {/* Converters Section */}
            <div className="flex flex-col gap-2">
              <span className="text-[9px] font-bold text-muted-foreground/75 tracking-wider uppercase mb-1">Format Converters</span>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => runProcessing(true, "xml")}
                  disabled={!inputText.trim() || validationStatus === "invalid"}
                  className="h-8.5 text-[11px] justify-start px-3 gap-2 text-left cursor-pointer hover:bg-secondary/60 border-border/85"
                >
                  <Code2 size={12} className="text-indigo-400" />
                  <span>Convert JSON to XML</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => runProcessing(true, "csv")}
                  disabled={!inputText.trim() || validationStatus === "invalid"}
                  className="h-8.5 text-[11px] justify-start px-3 gap-2 text-left cursor-pointer hover:bg-secondary/60 border-border/85"
                >
                  <Table size={12} className="text-cyan-400" />
                  <span>Convert JSON to CSV</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => runProcessing(true, "yaml")}
                  disabled={!inputText.trim() || validationStatus === "invalid"}
                  className="h-8.5 text-[11px] justify-start px-3 gap-2 text-left cursor-pointer hover:bg-secondary/60 border-border/85"
                >
                  <FileText size={12} className="text-emerald-400" />
                  <span>Convert JSON to YAML</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => runProcessing(true, "typescript")}
                  disabled={!inputText.trim() || validationStatus === "invalid"}
                  className="h-8.5 text-[11px] justify-start px-3 gap-2 text-left cursor-pointer hover:bg-secondary/60 border-border/85"
                >
                  <Braces size={12} className="text-blue-400" />
                  <span>Convert JSON to TypeScript</span>
                </Button>
              </div>
            </div>

            {/* Operations Section */}
            <div className="grid grid-cols-2 gap-2 mt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={downloadOutput}
                disabled={!outputText && !inputText}
                className="h-8.5 text-[11px] justify-center gap-1.5 cursor-pointer hover:bg-secondary/60 text-card-foreground border-border/80"
              >
                <Download size={11} className="text-muted-foreground" />
                <span>Download</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
                className="h-8.5 text-[11px] justify-center gap-1.5 cursor-pointer hover:text-red-400 hover:bg-red-500/10 text-card-foreground border-border/80"
              >
                <Trash2 size={11} className="text-red-400" />
                <span>Clear All</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Diagnostics HUD Card */}
        <Card className="py-0 border-border bg-card flex flex-col shadow-lg overflow-hidden shrink-0">
          <button
            type="button"
            onClick={() => setHudExpanded(!hudExpanded)}
            className="h-10 px-4 bg-secondary/15 border-b border-border flex flex-row items-center justify-between shrink-0 cursor-pointer w-full hover:bg-secondary/20 transition-all text-left outline-none"
          >
            <div className="flex items-center gap-2">
              <Gauge size={13} className="text-primary animate-pulse" />
              <CardTitle className="text-[10px] font-bold font-sans tracking-wide text-muted-foreground uppercase">JSON Diagnostics HUD</CardTitle>
            </div>
            {hudExpanded ? <ChevronDown size={12} className="text-muted-foreground" /> : <ChevronRight size={12} className="text-muted-foreground" />}
          </button>
          {hudExpanded && (
            <CardContent className="p-3.5 grid grid-cols-2 gap-2 text-xs font-mono animate-in fade-in slide-in-from-top-1 duration-150">
              {/* Size Metric */}
              <div className="flex flex-col gap-1 p-2 bg-secondary/20 rounded border border-border/40 hover:bg-secondary/45 hover:border-primary/20 transition-all">
                <div className="flex items-center gap-1.5 text-[9px] font-sans text-muted-foreground ui-hud-lbl">
                  <Database size={11} className="text-muted-foreground/85" />
                  <span>File Size</span>
                </div>
                <span className="text-xs font-semibold text-card-foreground ui-hud-val">
                  {formatBytes(metrics.sizeBytes)}
                </span>
              </div>

              {/* Nodes Metric */}
              <div className="flex flex-col gap-1 p-2 bg-secondary/20 rounded border border-border/40 hover:bg-secondary/45 hover:border-primary/20 transition-all">
                <div className="flex items-center gap-1.5 text-[9px] font-sans text-muted-foreground ui-hud-lbl">
                  <Network size={11} className="text-muted-foreground/85" />
                  <span>Total Nodes</span>
                </div>
                <span className="text-xs font-semibold text-card-foreground ui-hud-val">
                  {validationStatus === "valid" && metrics.nodeCount > 0 ? metrics.nodeCount.toLocaleString() : "—"}
                </span>
              </div>

              {/* Depth Metric */}
              <div className="flex flex-col gap-1 p-2 bg-secondary/20 rounded border border-border/40 hover:bg-secondary/45 hover:border-primary/20 transition-all">
                <div className="flex items-center gap-1.5 text-[9px] font-sans text-muted-foreground ui-hud-lbl">
                  <Layers size={11} className="text-muted-foreground/85" />
                  <span>Nesting Depth</span>
                </div>
                <span className="text-xs font-semibold text-card-foreground ui-hud-val">
                  {validationStatus === "valid" && metrics.depth > 0 ? `${metrics.depth} levels` : "—"}
                </span>
              </div>

              {/* Parse Speed Metric */}
              <div className="flex flex-col gap-1 p-2 bg-secondary/20 rounded border border-border/40 hover:bg-secondary/45 hover:border-primary/20 transition-all">
                <div className="flex items-center gap-1.5 text-[9px] font-sans text-muted-foreground ui-hud-lbl">
                  <Timer size={11} className="text-muted-foreground/85" />
                  <span>Parse Time</span>
                </div>
                <span className={cn(
                  "text-xs font-semibold ui-hud-val",
                  validationStatus === "valid" ? "text-emerald-500 dark:text-emerald-400" : "text-card-foreground"
                )}>
                  {validationStatus === "valid" ? `${metrics.parseTimeMs.toFixed(2)} ms` : "—"}
                </span>
              </div>

              {/* Line Count & Characters HUD row span */}
              <div className="col-span-2 flex justify-between items-center px-2 py-1.5 bg-secondary/10 border-t border-border/20 text-[10px] text-muted-foreground font-sans mt-1">
                <span>Lines: <strong className="font-mono text-card-foreground/95 font-semibold">{metrics.lineCount}</strong></span>
                <span className="text-muted-foreground/30">•</span>
                <span>Chars: <strong className="font-mono text-card-foreground/95 font-semibold">{metrics.charCount.toLocaleString()}</strong></span>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Config Panel Card */}
        <Card className="py-0 border-border bg-card shadow-lg overflow-hidden shrink-0">
          <div
            onClick={() => setPrefsExpanded(!prefsExpanded)}
            className="h-10 px-4 bg-secondary/10 border-b border-border flex flex-row items-center justify-between shrink-0 cursor-pointer w-full hover:bg-secondary/15 transition-all select-none"
          >
            <CardTitle className="text-[10px] font-bold font-sans tracking-wide text-muted-foreground">PREFERENCES</CardTitle>

            <div className="flex items-center gap-2">
              {/* Local History Modal Trigger */}
              <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); setIsHistoryOpen(true); }}
                    className="h-6 px-2 text-[10px] font-sans hover:bg-secondary/80 gap-1.5 cursor-pointer"
                  >
                    <History size={11} />
                    <span>History</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[480px] bg-card text-foreground border-border font-sans">
                  <DialogHeader>
                    <DialogTitle className="font-heading">Local Cache History</DialogTitle>
                    <DialogDescription className="text-xs">
                      Your last 10 formatting runs cached locally.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="max-h-[280px] overflow-y-auto space-y-2 my-3 pr-1">
                    {historyList.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-xs font-mono">
                        No query history cached.
                      </div>
                    ) : (
                      historyList.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 rounded border border-border bg-secondary/20 hover:bg-secondary/50 transition-all text-xs"
                        >
                          <div className="flex flex-col gap-0.5 font-mono">
                            <span className="text-[9px] text-muted-foreground">
                              {new Date(item.timestamp).toLocaleString()}
                            </span>
                            <span className="text-primary font-semibold font-sans text-[11px]">
                              {item.mode.toUpperCase()} • {(item.size / 1024).toFixed(2)} KB
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInputText(item.input);
                              setIsHistoryOpen(false);
                            }}
                            className="h-7 text-[10px] cursor-pointer"
                          >
                            Load
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-border/50">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); clearHistory(); }}
                      disabled={historyList.length === 0}
                      className="text-red-500 hover:text-red-600 hover:bg-red-500/10 text-xs gap-1.5 cursor-pointer"
                    >
                      <Trash2 size={11} />
                      Clear History
                    </Button>
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setIsHistoryOpen(false); }} className="text-xs cursor-pointer">
                      Close
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              {prefsExpanded ? <ChevronDown size={12} className="text-muted-foreground" /> : <ChevronRight size={12} className="text-muted-foreground" />}
            </div>
          </div>

          {prefsExpanded && (
            <CardContent className="p-3.5 flex flex-col gap-3.5 text-xs animate-in fade-in slide-in-from-top-1 duration-150">
              {/* Indent Selector */}
              {outputMode === "json" && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[11px] text-muted-foreground font-medium">Tab Indentation</span>
                  <Select value={indentSize} onValueChange={handleIndentChange}>
                    <SelectTrigger className="h-7.5 w-[115px] bg-secondary/60 text-foreground text-xs rounded border border-border font-mono cursor-pointer">
                      <SelectValue placeholder="Indent" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover text-popover-foreground border-border font-mono">
                      <SelectItem value="2">2 Spaces</SelectItem>
                      <SelectItem value="4">4 Spaces</SelectItem>
                      <SelectItem value="8">8 Spaces</SelectItem>
                      <SelectItem value="tab">Tab</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Auto Format Switch */}
              <div className="flex items-center justify-between gap-4">
                <label htmlFor="live-val-switch" className="text-[11px] text-muted-foreground font-medium select-none cursor-pointer">
                  Live Auto-Format
                </label>
                <Switch
                  id="live-val-switch"
                  checked={liveValidation}
                  onCheckedChange={toggleLiveVal}
                />
              </div>

              {/* Save Cache Switch */}
              <div className="flex items-center justify-between gap-4">
                <label htmlFor="save-history-switch" className="text-[11px] text-muted-foreground font-medium select-none cursor-pointer">
                  Cache Local History
                </label>
                <Switch
                  id="save-history-switch"
                  checked={saveHistory}
                  onCheckedChange={toggleHistorySave}
                />
              </div>

              {/* Big Number Switch */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-1">
                  <label htmlFor="bignum-switch" className="text-[11px] text-muted-foreground font-medium select-none cursor-pointer">
                    BigInt Support
                  </label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="text-muted-foreground/60 hover:text-foreground cursor-help p-0.5" onClick={(e) => e.stopPropagation()}>
                        <Info size={11} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[200px] bg-popover text-popover-foreground border border-border text-[10px] p-2 leading-relaxed">
                      Prevents precision loss on large integers when stringifying.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Switch
                  id="bignum-switch"
                  checked={bigNumSupport}
                  onCheckedChange={toggleBigNum}
                />
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </TooltipProvider>
  );
};
