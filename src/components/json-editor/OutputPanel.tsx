import React from "react";
import { cn } from "@/lib/utils";
import {
  FolderTree,
  FileJson,
  Check,
  Copy,
  Download,
  Maximize2,
  Minimize2,
  AlertTriangle,
  Search,
  Tag
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { JSONTreeView } from "../JSONTreeView";

interface OutputPanelProps {
  error: { msg: string; line: number; col: number } | null;
  parsedData: unknown;
  outputText: string;
  inputText: string;
  outputMode: "json" | "xml" | "csv" | "yaml";
  outputSize: number;
  activeTab: string;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
  // Actions
  copyOutput: () => void;
  copiedOutput: boolean;
  downloadOutput: () => void;
  fullscreenPanel: "none" | "input" | "output";
  setFullscreenPanel: React.Dispatch<React.SetStateAction<"none" | "input" | "output">>;
  goToErrorLine: () => void;
  formatBytes: (bytes: number) => string;
  // Tree state
  treeSearch: string;
  setTreeSearch: (val: string) => void;
  showBadges: boolean;
  setShowBadges: React.Dispatch<React.SetStateAction<boolean>>;
  expandAllFlag: boolean;
  collapseAllFlag: boolean;
  triggerExpandAll: () => void;
  triggerCollapseAll: () => void;
}

export const OutputPanel: React.FC<OutputPanelProps> = ({
  error,
  parsedData,
  outputText,
  inputText,
  outputMode,
  outputSize,
  activeTab,
  setActiveTab,
  copyOutput,
  copiedOutput,
  downloadOutput,
  fullscreenPanel,
  setFullscreenPanel,
  goToErrorLine,
  formatBytes,
  treeSearch,
  setTreeSearch,
  showBadges,
  setShowBadges,
  expandAllFlag,
  collapseAllFlag,
  triggerExpandAll,
  triggerCollapseAll
}) => {
  return (
    <TooltipProvider>
      <Card
        className={cn(
          "py-0 border-border bg-card flex flex-col h-full overflow-hidden focus-within:ring-1 focus-within:ring-primary/40 lg:sticky lg:top-[5.5rem] self-start lg:h-[calc(100vh-7.5rem)] w-full",
          fullscreenPanel === "output" ? "fixed inset-0 z-50 w-screen h-screen m-0 rounded-none bg-card p-0" : ""
        )}
      >
        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val)} className="flex-1 flex flex-col min-h-0">
          <div className="h-12 border-b flex flex-row items-center justify-between px-4 gap-2 shrink-0">
            <TabsList className="bg-secondary/50 border">
              <TabsTrigger value="tree" disabled={!parsedData && !error} className="text-xs gap-1.5 h-7.5 cursor-pointer">
                <FolderTree size={12} />
                <span>Tree Explorer</span>
              </TabsTrigger>
              <TabsTrigger value="text" className="text-xs gap-1.5 h-7.5 cursor-pointer">
                <FileJson size={12} />
                <span>Plain Text</span>
              </TabsTrigger>
            </TabsList>

            {/* Format Badges and copy controls */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-muted-foreground mr-1">
                {outputSize > 0 ? `${formatBytes(outputSize)}` : ""}
              </span>

              {/* Extension badge */}
              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-mono text-[10px] border border-primary/20 uppercase">
                {outputMode}
              </span>

              <ButtonGroup className="bg-secondary/20 border border-border/80 h-7.5 rounded overflow-hidden">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={copyOutput}
                      disabled={(!outputText && !inputText) || !!error}
                      variant="ghost"
                      size="sm"
                      aria-label="Copy output data"
                      className="h-full text-[11px] font-sans text-muted-foreground hover:text-foreground gap-1.5 cursor-pointer border-0 rounded-none hover:bg-secondary/45"
                    >
                      {copiedOutput ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-popover text-popover-foreground border border-border text-[10px] py-1">Copy output to clipboard</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={downloadOutput}
                      disabled={(!outputText && !inputText) || !!error}
                      variant="ghost"
                      size="sm"
                      aria-label="Download output file"
                      className="h-full text-[11px] font-sans text-muted-foreground hover:text-foreground gap-1.5 cursor-pointer border-l border-border/85 rounded-none hover:bg-secondary/45"
                    >
                      <Download size={12} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-popover text-popover-foreground border border-border text-[10px] py-1">Download as file</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => setFullscreenPanel(prev => prev === "output" ? "none" : "output")}
                      variant="ghost"
                      size="sm"
                      aria-label={fullscreenPanel === "output" ? "Exit Fullscreen" : "Fullscreen Output"}
                      className="h-full text-[11px] font-sans text-muted-foreground hover:text-foreground gap-1.5 cursor-pointer border-l border-border/85 rounded-none hover:bg-secondary/45 px-2"
                    >
                      {fullscreenPanel === "output" ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-popover text-popover-foreground border border-border text-[10px] py-1">
                    {fullscreenPanel === "output" ? "Exit Fullscreen" : "Fullscreen Output"}
                  </TooltipContent>
                </Tooltip>
              </ButtonGroup>
            </div>
          </div>

          <TabsContent value="tree" className="flex-1 flex flex-col min-h-0 m-0 border-0 outline-none">
            {error ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center h-full">
                <div className="sticky top-24 max-w-md w-full bg-destructive/5 border border-destructive/20 p-5 flex flex-col items-center shadow-sm animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-3 bg-destructive/15 text-destructive rounded-full mb-3">
                    <AlertTriangle size={24} className="animate-pulse" />
                  </div>
                  <h3 className="font-heading font-bold text-sm text-foreground mb-1">JSON Validation Failed</h3>
                  <p className="text-xs text-muted-foreground mb-4 font-mono font-semibold">
                    Line {error.line}, Column {error.col}
                  </p>

                  <div className="w-full bg-secondary/35 border border-border/50 p-3 text-left mb-4 font-mono text-[11px] leading-relaxed break-words text-card-foreground select-text">
                    {error.msg}
                  </div>

                  <p className="text-[10px] text-muted-foreground mb-4 leading-relaxed max-w-[280px]">
                    Verify that all strings are wrapped in double quotes, object keys are quoted, and no trailing commas exist.
                  </p>

                  <Button
                    variant="destructive"
                    onClick={goToErrorLine}
                    className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold cursor-pointer h-9 gap-2"
                  >
                    <Search size={13} />
                    <span>Focus Error Line</span>
                  </Button>
                </div>
              </div>
            ) : parsedData ? (
              <>
                {/* Tree toolbar search & collapse controls */}
                <div className="flex items-center gap-2 p-2 border-b border-border/30 bg-secondary/10 shrink-0">
                  <div className="relative flex-1">
                    <label htmlFor="tree-search-input" className="sr-only">Search tree elements</label>
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="tree-search-input"
                      type="text"
                      placeholder="Search keys or values..."
                      value={treeSearch}
                      onChange={(e) => setTreeSearch(e.target.value)}
                      className="pl-8 bg-secondary border-border/80 focus-visible:ring-1 focus-visible:ring-primary text-xs h-8"
                    />
                  </div>

                  {/* Toggle Type Badges Button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => setShowBadges(prev => !prev)}
                        variant={showBadges ? "secondary" : "ghost"}
                        size="sm"
                        className="h-7.5 px-2.5 text-[10px] font-sans gap-1.5 cursor-pointer border border-border/80 rounded-none shrink-0"
                        aria-label="Toggle data type badges"
                      >
                        <Tag size={11} className={showBadges ? "text-primary" : "text-muted-foreground"} />
                        <span>Badges</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-popover text-popover-foreground border border-border text-[9px] py-0.5 px-1.5 rounded-none">
                      {showBadges ? "Hide Type Badges" : "Show Type Badges"}
                    </TooltipContent>
                  </Tooltip>

                  {/* ButtonGroup for Expand/Collapse */}
                  <ButtonGroup className="border border-border/80 h-7.5 rounded-none overflow-hidden">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={triggerExpandAll}
                      className="h-full text-[10px] font-sans cursor-pointer hover:bg-secondary/45 border-0 rounded-none px-2.5"
                    >
                      Expand
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={triggerCollapseAll}
                      className="h-full text-[10px] font-sans cursor-pointer hover:bg-secondary/45 border-l border-border/85 rounded-none px-2.5"
                    >
                      Collapse
                    </Button>
                  </ButtonGroup>
                </div>
                {/* Collapsible Tree Area */}
                <div className="flex-1 overflow-y-auto select-text min-h-0">
                  <JSONTreeView
                    data={parsedData}
                    searchQuery={treeSearch}
                    expandAll={expandAllFlag}
                    collapseAll={collapseAllFlag}
                    showBadges={showBadges}
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
                <FolderTree size={32} className="text-muted-foreground/25 mb-2.5" />
                <p className="text-xs font-sans font-medium text-foreground/80">No Tree Built</p>
                <p className="text-[10px] opacity-70 mt-1 max-w-[200px] leading-relaxed font-sans">
                  Valid input will construct the interactive tree structure here.
                </p>
              </div>
            )}
          </TabsContent>

          {/* Tab: Formatted Plain Text */}
          <TabsContent value="text" className="flex-1 flex flex-col min-h-0 m-0 border-0 outline-none">
            {error ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center h-full">
                <div className="sticky top-24 max-w-md w-full bg-destructive/5 border border-destructive/20 p-5 flex flex-col items-center shadow-sm animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-3 bg-destructive/15 text-destructive rounded-full mb-3">
                    <AlertTriangle size={24} className="animate-pulse" />
                  </div>
                  <h3 className="font-heading font-bold text-sm text-foreground mb-1">JSON Validation Failed</h3>
                  <p className="text-xs text-muted-foreground mb-4 font-mono font-semibold">
                    Line {error.line}, Column {error.col}
                  </p>

                  <div className="w-full bg-secondary/35 border border-border/50 p-3 text-left mb-4 font-mono text-[11px] leading-relaxed break-words text-card-foreground select-text">
                    {error.msg}
                  </div>

                  <p className="text-[10px] text-muted-foreground mb-4 leading-relaxed max-w-[280px]">
                    Verify that all strings are wrapped in double quotes, object keys are quoted, and no trailing commas exist.
                  </p>

                  <Button
                    variant="destructive"
                    onClick={goToErrorLine}
                    className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold cursor-pointer h-9 gap-2"
                  >
                    <Search size={13} />
                    <span>Focus Error Line</span>
                  </Button>
                </div>
              </div>
            ) : outputText || inputText ? (
              <div className="flex-1 relative overflow-hidden min-h-0">
                <pre
                  className="p-4 font-mono overflow-y-auto select-text leading-6 h-full block bg-transparent text-foreground whitespace-pre"
                  style={{ fontSize: "var(--json-font-size)" }}
                >
                  {outputText || inputText}
                </pre>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
                <FileJson size={32} className="text-muted-foreground/25 mb-2.5" />
                <p className="text-xs font-sans font-medium text-foreground/80">No Output Generated</p>
                <p className="text-[10px] opacity-70 mt-1 max-w-[200px] leading-relaxed font-sans">
                  Click Format or Convert to populate plaintext results here.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </Card>
    </TooltipProvider>
  );
};
