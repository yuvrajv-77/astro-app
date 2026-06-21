import React, { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Trash2,
  Copy,
  Check,
  Play,
  AlertTriangle,
  Sparkles,
  GitCompare,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  MinusCircle,
  HelpCircle,
  FileUp,
  Download
} from "lucide-react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { computeDiff } from "@/lib/diff";
import type { DiffLine } from "@/lib/diff";
import { compareObjects, mapPathsToLines } from "@/lib/semanticDiff";
import type { SemanticDiff } from "@/lib/semanticDiff";


const SAMPLE_LEFT = `{
  "store": {
    "name": "DevJSON Sandbox Store",
    "active": true,
    "established": 2026,
    "categories": ["utilities", "dev-tools"]
  }
}`;

const SAMPLE_RIGHT = `{
  "store": {
    "name": "DevJSON Premium Sandbox Store",
    "active": false,
    "categories": ["utilities", "dev-tools", "cloud"],
    "version": "1.0.4"
  }
}`;

export const JSONDiff: React.FC = () => {
  const [leftInput, setLeftInput] = useState<string>(SAMPLE_LEFT);
  const [rightInput, setRightInput] = useState<string>(SAMPLE_RIGHT);

  // Prettified/Aligned Line Diffs
  const [leftDiff, setLeftDiff] = useState<DiffLine[]>([]);
  const [rightDiff, setRightDiff] = useState<DiffLine[]>([]);
  const [diffComputed, setDiffComputed] = useState<boolean>(false);

  // Semantic Diff States
  const [semanticDiffs, setSemanticDiffs] = useState<SemanticDiff[]>([]);
  const [activeDiffIdx, setActiveDiffIdx] = useState<number>(0);
  const [leftPathMap, setLeftPathMap] = useState<Map<string, number>>(new Map());
  const [rightPathMap, setRightPathMap] = useState<Map<string, number>>(new Map());

  // Validation States
  const [leftError, setLeftError] = useState<string | null>(null);
  const [rightError, setRightError] = useState<string | null>(null);

  // Configurations
  const [indentSize, setIndentSize] = useState<string>("2");
  const [autoFormat, setAutoFormat] = useState<boolean>(true);

  // Sync scroll refs
  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<"left" | "right" | null>(null);

  // File upload refs
  const leftFileRef = useRef<HTMLInputElement>(null);
  const rightFileRef = useRef<HTMLInputElement>(null);

  // Copy helpers
  const [copiedLeft, setCopiedLeft] = useState(false);
  const [copiedRight, setCopiedRight] = useState(false);

  const copyLeft = () => {
    navigator.clipboard.writeText(leftInput);
    setCopiedLeft(true);
    setTimeout(() => setCopiedLeft(false), 1500);
  };

  const copyRight = () => {
    navigator.clipboard.writeText(rightInput);
    setCopiedRight(true);
    setTimeout(() => setCopiedRight(false), 1500);
  };

  // Upload/Download helpers
  const handleLeftUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      setLeftInput(content);
      setDiffComputed(false);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleRightUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      setRightInput(content);
      setDiffComputed(false);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleLeftDownload = () => {
    if (!leftInput) return;
    const blob = new Blob([leftInput], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "original.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRightDownload = () => {
    if (!rightInput) return;
    const blob = new Blob([rightInput], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modified.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Synced scroll listener
  const handleScroll = (source: "left" | "right") => {
    if (activeRef.current !== source) return;
    const left = leftScrollRef.current;
    const right = rightScrollRef.current;
    if (left && right) {
      if (source === "left") {
        right.scrollTop = left.scrollTop;
      } else {
        left.scrollTop = right.scrollTop;
      }
    }
  };

  // Prettification / Format helper
  const formatJSON = (input: string, indent: string): { formatted: string; error: string | null } => {
    if (!input.trim()) return { formatted: "", error: null };
    try {
      const parsed = JSON.parse(input);
      const spacer = indent === "tab" ? "\t" : parseInt(indent, 10);
      return { formatted: JSON.stringify(parsed, null, spacer), error: null };
    } catch (err: unknown) {
      return { formatted: input, error: err instanceof Error ? err.message : String(err) };
    }
  };

  // Scroll and highlight active path in side-by-side editor
  const jumpToPath = useCallback((path: string) => {
    const leftLine = leftPathMap.get(path);
    const rightLine = rightPathMap.get(path);

    let targetIndex = -1;
    if (leftLine !== undefined) {
      targetIndex = leftDiff.findIndex(line => line.originalLineNum === leftLine);
    }
    if (targetIndex === -1 && rightLine !== undefined) {
      targetIndex = rightDiff.findIndex(line => line.modifiedLineNum === rightLine);
    }

    if (targetIndex !== -1) {
      const lineHeight = 24; // text-xs leading-6 is 24px height
      const containerHeight = 500; // viewport height
      const scrollTop = Math.max(0, targetIndex * lineHeight - containerHeight / 2 + lineHeight / 2);

      if (leftScrollRef.current) leftScrollRef.current.scrollTop = scrollTop;
      if (rightScrollRef.current) rightScrollRef.current.scrollTop = scrollTop;
    }
  }, [leftDiff, rightDiff, leftPathMap, rightPathMap]);

  // Trigger scroll whenever active diff index changes
  useEffect(() => {
    if (diffComputed && semanticDiffs.length > 0 && semanticDiffs[activeDiffIdx]) {
      jumpToPath(semanticDiffs[activeDiffIdx].path);
    }
  }, [activeDiffIdx, diffComputed, semanticDiffs, jumpToPath]);

  // Trigger Diff Compilation
  const handleCompare = () => {
    // Validate first
    const leftRes = formatJSON(leftInput, indentSize);
    const rightRes = formatJSON(rightInput, indentSize);

    setLeftError(leftRes.error);
    setRightError(rightRes.error);

    if (leftRes.error || rightRes.error) {
      setDiffComputed(false);
      return;
    }

    let leftText = leftInput;
    let rightText = rightInput;

    if (autoFormat) {
      leftText = leftRes.formatted;
      rightText = rightRes.formatted;
      setLeftInput(leftRes.formatted);
      setRightInput(rightRes.formatted);
    }

    // Generate prettified line differences
    const { left, right } = computeDiff(leftText, rightText);
    setLeftDiff(left);
    setRightDiff(right);

    // Compute semantic comparison tree
    try {
      const leftParsed = JSON.parse(leftText);
      const rightParsed = JSON.parse(rightText);
      const semDiffs = compareObjects(leftParsed, rightParsed);
      setSemanticDiffs(semDiffs);
      setActiveDiffIdx(0);

      // Map paths to visual line numbers
      const indentNum = indentSize === "tab" ? 4 : parseInt(indentSize, 10);
      setLeftPathMap(mapPathsToLines(leftText, indentNum));
      setRightPathMap(mapPathsToLines(rightText, indentNum));
    } catch {
      // Safe fallback
      setSemanticDiffs([]);
    }

    setDiffComputed(true);
  };

  // Clear inputs
  const handleClear = () => {
    setLeftInput("");
    setRightInput("");
    setLeftDiff([]);
    setRightDiff([]);
    setSemanticDiffs([]);
    setLeftError(null);
    setRightError(null);
    setDiffComputed(false);
  };

  // Load samples
  const handleLoadSamples = () => {
    setLeftInput(SAMPLE_LEFT);
    setRightInput(SAMPLE_RIGHT);
    setDiffComputed(false);
  };

  // Navigation callbacks
  const nextDiff = () => {
    if (semanticDiffs.length === 0) return;
    setActiveDiffIdx((prev) => (prev + 1) % semanticDiffs.length);
  };

  const prevDiff = () => {
    if (semanticDiffs.length === 0) return;
    setActiveDiffIdx((prev) => (prev - 1 + semanticDiffs.length) % semanticDiffs.length);
  };

  const activePath = semanticDiffs[activeDiffIdx]?.path;
  const activeLeftLine = activePath !== undefined ? leftPathMap.get(activePath) : undefined;
  const activeRightLine = activePath !== undefined ? rightPathMap.get(activePath) : undefined;

  return (
    <TooltipProvider>
      <div className="w-full flex-1 flex flex-col gap-6 ui-scale-container">
        
        {/* Settings Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border border-border bg-card/60 rounded-md">
          <div className="flex items-center gap-2">
            <GitCompare size={18} className="text-primary" />
            <h2 className="text-xs font-bold font-sans tracking-wider uppercase">Semantic JSON Diff</h2>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            {/* Indent option */}
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-medium">Format Indent:</span>
              <Select value={indentSize} onValueChange={setIndentSize}>
                <SelectTrigger className="h-8 w-[100px] bg-secondary/50 text-foreground text-xs rounded border border-border font-mono cursor-pointer">
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

            {/* Auto format toggle */}
            <div className="flex items-center gap-2 select-none">
              <Checkbox
                id="auto-format-diff"
                checked={autoFormat}
                onCheckedChange={(checked) => setAutoFormat(checked === true)}
                className="cursor-pointer"
              />
              <label htmlFor="auto-format-diff" className="text-muted-foreground font-medium cursor-pointer">
                Auto-format inputs
              </label>
            </div>

            {/* Actions deck */}
            <div className="flex flex-wrap items-center gap-3 border-l border-border/60 pl-3">
              <input type="file" ref={leftFileRef} className="hidden" accept=".json" onChange={handleLeftUpload} />
              <input type="file" ref={rightFileRef} className="hidden" accept=".json" onChange={handleRightUpload} />

              <div className="flex items-center gap-1.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={() => leftFileRef.current?.click()} variant="outline" size="sm" className="h-7.5 text-[11px] gap-1 cursor-pointer hover:bg-secondary/45 border border-border/80">
                      <FileUp size={11} className="text-primary" />
                      <span className="hidden sm:inline">Upload Left</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-popover text-popover-foreground border border-border text-[10px] py-1 px-2.5">Upload file to Original panel</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={() => rightFileRef.current?.click()} variant="outline" size="sm" className="h-7.5 text-[11px] gap-1 cursor-pointer hover:bg-secondary/45 border border-border/80">
                      <FileUp size={11} className="text-emerald-500" />
                      <span className="hidden sm:inline">Upload Right</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-popover text-popover-foreground border border-border text-[10px] py-1 px-2.5">Upload file to Modified panel</TooltipContent>
                </Tooltip>
              </div>

              <div className="flex items-center gap-1.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={handleLeftDownload} disabled={!leftInput} variant="outline" size="sm" className="h-7.5 text-[11px] gap-1 cursor-pointer hover:bg-secondary/45 disabled:opacity-40 border border-border/80">
                      <Download size={11} />
                      <span className="hidden sm:inline">Download Left</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-popover text-popover-foreground border border-border text-[10px] py-1 px-2.5">Download Original JSON file</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={handleRightDownload} disabled={!rightInput} variant="outline" size="sm" className="h-7.5 text-[11px] gap-1 cursor-pointer hover:bg-secondary/45 disabled:opacity-40 border border-border/80">
                      <Download size={11} />
                      <span className="hidden sm:inline">Download Right</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-popover text-popover-foreground border border-border text-[10px] py-1 px-2.5">Download Modified JSON file</TooltipContent>
                </Tooltip>
              </div>

              <div className="flex items-center gap-1.5">
                <Button onClick={handleLoadSamples} variant="ghost" size="sm" className="h-7.5 text-[11px] gap-1 cursor-pointer hover:bg-secondary/35">
                  <Sparkles size={11} className="text-amber-500" />
                  <span>Samples</span>
                </Button>
                <Button onClick={handleClear} variant="ghost" size="sm" className="h-7.5 text-[11px] text-red-400 hover:text-red-500 hover:bg-red-500/10 gap-1 cursor-pointer">
                  <Trash2 size={11} />
                  <span>Clear</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Diff Result View (if computed successfully) */}
        {diffComputed ? (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 border border-border bg-card overflow-hidden rounded-md shadow-sm">
            
            {/* COLUMN 1: Aligned side-by-side diff editors */}
            <div className="flex flex-col h-[550px] overflow-hidden">
              <div className="h-10 border-b border-border bg-secondary/15 flex flex-row divide-x divide-border font-sans text-xs font-semibold shrink-0 select-none">
                <div className="flex-1 px-4 flex items-center justify-between">
                  <span className="tracking-wide">ORIGINAL JSON</span>
                  <span className="text-[10px] text-red-500 dark:text-red-400 font-mono font-bold">- deleted</span>
                </div>
                <div className="flex-1 px-4 flex items-center justify-between">
                  <span className="tracking-wide">MODIFIED JSON</span>
                  <span className="text-[10px] text-emerald-500 dark:text-emerald-400 font-mono font-bold">+ added</span>
                </div>
              </div>

              <div 
                className="flex-1 flex flex-row divide-x divide-border overflow-hidden select-text font-mono"
                style={{ fontSize: "var(--json-font-size)" }}
              >
                {/* Left Panel */}
                <div
                  ref={leftScrollRef}
                  onScroll={() => handleScroll("left")}
                  onMouseEnter={() => { activeRef.current = "left"; }}
                  onMouseLeave={() => { activeRef.current = null; }}
                  className="flex-1 overflow-auto whitespace-pre leading-6 py-3 select-text h-full outline-none scrollbar-thin scrollbar-thumb-border"
                >
                  {leftDiff.map((line, idx) => {
                    const isLineHighlighted = line.originalLineNum !== undefined && line.originalLineNum === activeLeftLine;
                    return (
                      <div
                        key={idx}
                        className={cn(
                          "flex flex-row pl-4 pr-2 w-full transition-colors duration-150 border-l-2 border-transparent",
                          line.type === "removed" ? "bg-red-500/10 text-red-500 dark:text-red-400 border-l-red-500" : "",
                          isLineHighlighted ? "bg-primary/20 border-l-primary font-bold shadow-inner" : ""
                        )}
                      >
                        <span 
                          className="w-10 text-right pr-4 text-muted-foreground/35 select-none font-sans"
                          style={{ fontSize: "calc(var(--json-font-size) - 2px)" }}
                        >
                          {line.originalLineNum || ""}
                        </span>
                        <span className="flex-1">{line.value}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Right Panel */}
                <div
                  ref={rightScrollRef}
                  onScroll={() => handleScroll("right")}
                  onMouseEnter={() => { activeRef.current = "right"; }}
                  onMouseLeave={() => { activeRef.current = null; }}
                  className="flex-1 overflow-auto whitespace-pre leading-6 py-3 select-text h-full outline-none scrollbar-thin scrollbar-thumb-border"
                >
                  {rightDiff.map((line, idx) => {
                    const isLineHighlighted = line.modifiedLineNum !== undefined && line.modifiedLineNum === activeRightLine;
                    return (
                      <div
                        key={idx}
                        className={cn(
                          "flex flex-row pl-4 pr-2 w-full transition-colors duration-150 border-l-2 border-transparent",
                          line.type === "added" ? "bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-l-emerald-500" : "",
                          isLineHighlighted ? "bg-primary/20 border-l-primary font-bold shadow-inner" : ""
                        )}
                      >
                        <span 
                          className="w-10 text-right pr-4 text-muted-foreground/35 select-none font-sans"
                          style={{ fontSize: "calc(var(--json-font-size) - 2px)" }}
                        >
                          {line.modifiedLineNum || ""}
                        </span>
                        <span className="flex-1">{line.value}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="h-10 border-t border-border bg-secondary/10 flex items-center justify-between px-4 shrink-0 font-sans text-xs">
                <span className="text-muted-foreground">Scroll synced between panels.</span>
                <Button onClick={() => setDiffComputed(false)} variant="secondary" size="sm" className="h-7 cursor-pointer text-[11px]">
                  Edit Inputs
                </Button>
              </div>
            </div>

            {/* COLUMN 2: Semantic Differences Sidebar */}
            <div className="border-t lg:border-t-0 lg:border-l border-border h-[550px] flex flex-col bg-secondary/5 shrink-0">
              <div className="h-10 border-b border-border bg-secondary/15 flex items-center justify-between px-4 font-sans text-xs font-semibold shrink-0 select-none">
                <span>SEMANTIC DIFFS</span>
                <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-mono">
                  {semanticDiffs.length} total
                </span>
              </div>

              {/* Sidebar Navigation controls */}
              {semanticDiffs.length > 0 && (
                <div className="p-3 border-b border-border bg-secondary/10 flex items-center justify-between gap-2 shrink-0 font-sans text-xs">
                  <div className="flex items-center gap-1.5 select-none font-medium">
                    <span className="text-muted-foreground">Active:</span>
                    <strong className="font-mono">{activeDiffIdx + 1}</strong>
                    <span className="text-muted-foreground">/</span>
                    <strong className="font-mono text-muted-foreground/85">{semanticDiffs.length}</strong>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      onClick={prevDiff}
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0 cursor-pointer"
                      aria-label="Previous difference"
                    >
                      <ChevronLeft size={13} />
                    </Button>
                    <Button
                      onClick={nextDiff}
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0 cursor-pointer"
                      aria-label="Next difference"
                    >
                      <ChevronRight size={13} />
                    </Button>
                  </div>
                </div>
              )}

              {/* Diffs List Scroll Area */}
              <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 min-h-0 select-none">
                {semanticDiffs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-xs font-sans h-full flex flex-col items-center justify-center gap-2">
                    <Sparkles size={20} className="text-emerald-500 animate-pulse" />
                    <p className="font-bold text-foreground/80">No Semantic Differences</p>
                    <p className="max-w-[200px] leading-relaxed text-[11px] opacity-75">
                      Both JSON structures are structurally equivalent.
                    </p>
                  </div>
                ) : (
                  semanticDiffs.map((diff, idx) => {
                    const isActive = idx === activeDiffIdx;
                    return (
                      <button
                        key={idx}
                        onClick={() => setActiveDiffIdx(idx)}
                        className={cn(
                          "w-full text-left p-3 rounded text-xs font-sans transition-all cursor-pointer relative outline-none flex flex-col gap-1.5 border-l-4 border-y border-r",
                          isActive
                            ? cn(
                                "bg-card shadow-md ring-1 ring-primary/30",
                                diff.type === "added" ? "border-l-emerald-500 border-y-primary border-r-primary" :
                                diff.type === "removed" ? "border-l-red-500 border-y-primary border-r-primary" :
                                "border-l-amber-500 border-y-primary border-r-primary"
                              )
                            : cn(
                                "bg-card/75 border-y-border border-r-border hover:bg-card/90",
                                diff.type === "added" ? "border-l-emerald-500/60" :
                                diff.type === "removed" ? "border-l-red-500/60" :
                                "border-l-amber-500/60"
                              )
                        )}
                      >
                        <div className="flex items-center justify-between gap-2 w-full">
                          {/* Path Title */}
                          <span className="font-mono text-xs truncate max-w-[160px] font-bold text-foreground" title={diff.path}>
                            {diff.path || "root"}
                          </span>

                          {/* Action Badge */}
                          {diff.type === "added" && (
                            <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-sm text-[9.5px] uppercase font-bold tracking-wide shrink-0">
                              <PlusCircle size={9.5} />
                              <span>Added</span>
                            </span>
                          )}
                          {diff.type === "removed" && (
                            <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded-sm text-[9.5px] uppercase font-bold tracking-wide shrink-0">
                              <MinusCircle size={9.5} />
                              <span>Removed</span>
                            </span>
                          )}
                          {diff.type === "modified" && (
                            <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded-sm text-[9.5px] uppercase font-bold tracking-wide shrink-0">
                              <HelpCircle size={9.5} />
                              <span>Changed</span>
                            </span>
                          )}
                        </div>

                        {/* Difference explanation message */}
                        <p className="text-xs text-foreground/80 leading-relaxed break-words pr-2 font-medium">
                          {diff.message}
                        </p>
                      </button>
                    );
                  })
                )}
              </div>

            </div>

          </div>
        ) : (
          /* Editor Input Panels */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-[400px]">
            {/* Left Input */}
            <Card className="py-0 border-border bg-card flex flex-col h-[400px] overflow-hidden focus-within:ring-1 focus-within:ring-primary/40 shadow-sm">
              <div className="h-12 border-b border-border flex flex-row items-center justify-between px-4 shrink-0">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xs font-semibold font-sans tracking-wide">ORIGINAL JSON</CardTitle>
                  <span className="text-[10px] text-muted-foreground/60 font-mono hidden sm:inline">({leftInput.split("\n").length} lines)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={() => leftFileRef.current?.click()} variant="ghost" size="sm" className="h-7 w-7 p-0 cursor-pointer text-muted-foreground hover:text-foreground">
                        <FileUp size={12} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-popover text-popover-foreground border border-border text-[10px] py-1 px-2.5">Upload JSON File</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={handleLeftDownload} disabled={!leftInput} variant="ghost" size="sm" className="h-7 w-7 p-0 cursor-pointer text-muted-foreground hover:text-foreground disabled:opacity-40">
                        <Download size={12} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-popover text-popover-foreground border border-border text-[10px] py-1 px-2.5">Download JSON</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={copyLeft} variant="ghost" size="sm" className="h-7 w-7 p-0 cursor-pointer text-muted-foreground hover:text-foreground">
                        {copiedLeft ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-popover text-popover-foreground border border-border text-[10px] py-1 px-2.5">Copy Input</TooltipContent>
                  </Tooltip>
                </div>
              </div>
              <CardContent className="p-0 flex-1 relative overflow-hidden">
                <label htmlFor="left-json-diff" className="sr-only">Original JSON Input</label>
                <Textarea
                  id="left-json-diff"
                  value={leftInput}
                  onChange={(e) => setLeftInput(e.target.value)}
                  placeholder="Paste original JSON structure here..."
                  spellCheck={false}
                  className="w-full h-full resize-none bg-transparent py-4 px-4 font-mono leading-6 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 select-text overflow-y-auto whitespace-pre outline-none"
                  style={{ fontSize: "var(--json-font-size)" }}
                />
                {leftError && (
                  <div className="absolute bottom-0 left-0 right-0 bg-destructive text-destructive-foreground px-4 py-2.5 text-xs border-t border-destructive/50 flex items-start gap-2 select-none">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <p className="font-mono text-[10px] break-words">{leftError}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Right Input */}
            <Card className="py-0 border-border bg-card flex flex-col h-[400px] overflow-hidden focus-within:ring-1 focus-within:ring-primary/40 shadow-sm">
              <div className="h-12 border-b border-border flex flex-row items-center justify-between px-4 shrink-0">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xs font-semibold font-sans tracking-wide">MODIFIED JSON</CardTitle>
                  <span className="text-[10px] text-muted-foreground/60 font-mono hidden sm:inline">({rightInput.split("\n").length} lines)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={() => rightFileRef.current?.click()} variant="ghost" size="sm" className="h-7 w-7 p-0 cursor-pointer text-muted-foreground hover:text-foreground">
                        <FileUp size={12} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-popover text-popover-foreground border border-border text-[10px] py-1 px-2.5">Upload JSON File</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={handleRightDownload} disabled={!rightInput} variant="ghost" size="sm" className="h-7 w-7 p-0 cursor-pointer text-muted-foreground hover:text-foreground disabled:opacity-40">
                        <Download size={12} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-popover text-popover-foreground border border-border text-[10px] py-1 px-2.5">Download JSON</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={copyRight} variant="ghost" size="sm" className="h-7 w-7 p-0 cursor-pointer text-muted-foreground hover:text-foreground">
                        {copiedRight ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-popover text-popover-foreground border border-border text-[10px] py-1 px-2.5">Copy Input</TooltipContent>
                  </Tooltip>
                </div>
              </div>
              <CardContent className="p-0 flex-1 relative overflow-hidden">
                <label htmlFor="right-json-diff" className="sr-only">Modified JSON Input</label>
                <Textarea
                  id="right-json-diff"
                  value={rightInput}
                  onChange={(e) => setRightInput(e.target.value)}
                  placeholder="Paste modified JSON structure here..."
                  spellCheck={false}
                  className="w-full h-full resize-none bg-transparent py-4 px-4 font-mono leading-6 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 select-text overflow-y-auto whitespace-pre outline-none"
                  style={{ fontSize: "var(--json-font-size)" }}
                />
                {rightError && (
                  <div className="absolute bottom-0 left-0 right-0 bg-destructive text-destructive-foreground px-4 py-2.5 text-xs border-t border-destructive/50 flex items-start gap-2 select-none">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <p className="font-mono text-[10px] break-words">{rightError}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Compare Trigger button */}
        {!diffComputed && (
          <Button
            onClick={handleCompare}
            disabled={!leftInput.trim() || !rightInput.trim()}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/10 h-10 gap-2 font-semibold tracking-wide cursor-pointer transition-all duration-200 hover:scale-[1.005] active:scale-[0.995] disabled:opacity-50"
          >
            <Play size={14} />
            <span className="uppercase font-bold">Compare JSON structures</span>
          </Button>
        )}

      </div>
    </TooltipProvider>
  );
};
