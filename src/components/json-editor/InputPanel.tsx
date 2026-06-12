import React, { useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Maximize2,
  Minimize2,
  Sparkles,
  Printer,
  Copy,
  Check,
  Trash2,
  FileUp,
  Braces,
  AlertTriangle
} from "lucide-react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface InputPanelProps {
  inputText: string;
  setInputText: (val: string) => void;
  error: { msg: string; line: number; col: number } | null;
  metrics: {
    lineCount: number;
    charCount: number;
    sizeBytes: number;
    depth: number;
    nodeCount: number;
    parseTimeMs: number;
  };
  fullscreenPanel: "none" | "input" | "output";
  setFullscreenPanel: React.Dispatch<React.SetStateAction<"none" | "input" | "output">>;
  isDragging: boolean;
  setIsDragging: (val: boolean) => void;
  processUploadedFile: (file: File) => void;
  loadSample: () => void;
  handlePrint: () => void;
  copyInput: () => void;
  copiedInput: boolean;
  handleClear: () => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

export const InputPanel: React.FC<InputPanelProps> = ({
  inputText,
  setInputText,
  error,
  metrics,
  fullscreenPanel,
  setFullscreenPanel,
  isDragging,
  setIsDragging,
  processUploadedFile,
  loadSample,
  handlePrint,
  copyInput,
  copiedInput,
  handleClear,
  textareaRef
}) => {
  const gutterRef = useRef<HTMLDivElement>(null);

  // Sync scroll positions
  const handleScroll = useCallback(() => {
    if (textareaRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, [textareaRef]);

  // Generate line numbers count
  const lineCount = inputText.split("\n").length || 1;
  const lineNumbers = Array.from({ length: Math.max(lineCount, 1) }, (_, i) => i + 1);

  // Scroll to line when error banner or gutter is clicked (DX feature)
  const goToErrorLine = useCallback(() => {
    if (!error || !textareaRef.current) return;
    const text = inputText;
    const lines = text.split("\n");
    let targetIndex = 0;

    for (let i = 0; i < Math.min(error.line - 1, lines.length); i++) {
      targetIndex += lines[i].length + 1; // +1 for the newline character
    }

    textareaRef.current.focus();
    textareaRef.current.setSelectionRange(targetIndex, targetIndex + (lines[error.line - 1]?.length || 0));

    const lineHeight = 24; // text-xs leading-6 is 24px line height
    textareaRef.current.scrollTop = Math.max(0, (error.line - 1) * lineHeight - 100);
  }, [error, inputText, textareaRef]);

  // Handle local drop event
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  return (
    <TooltipProvider>
      <Card
        className={cn(
          "py-0 border-border bg-card flex flex-col h-full transition-all duration-300 relative overflow-hidden focus-within:ring-1 focus-within:ring-primary/40 lg:sticky lg:top-[5.5rem] self-start lg:h-[calc(100vh-7.5rem)] w-full",
          isDragging ? "border-primary bg-primary/5 scale-[0.995]" : "",
          fullscreenPanel === "input" ? "fixed inset-0 z-50 w-screen h-screen m-0 rounded-none bg-card p-0" : ""
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag and drop glass overlay */}
        {isDragging && (
          <div className="absolute inset-0 bg-background/95 z-30 flex flex-col items-center justify-center border-2 border-dashed border-primary m-1 rounded-[calc(var(--radius)-4px)] pointer-events-none animate-in fade-in zoom-in-95">
            <FileUp className="w-10 h-10 text-primary mb-2 animate-bounce" />
            <p className="text-sm font-heading font-medium text-foreground">Drop JSON File Here</p>
            <p className="text-[10px] text-muted-foreground mt-1">Upload and format automatically</p>
          </div>
        )}

        <div className="h-12 border-b border-border flex flex-row items-center justify-between px-4 gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <Braces size={16} className="text-primary" />
            <CardTitle className="text-xs font-semibold font-sans tracking-wide">INPUT JSON</CardTitle>
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground/60 ml-2">
              <span>({metrics.lineCount} lines)</span>
            </div>
          </div>

          {/* Header Actions Deck */}
          <div className="flex items-center gap-1">
            {/* Fullscreen Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => setFullscreenPanel(prev => prev === "input" ? "none" : "input")}
                  variant="ghost"
                  size="sm"
                  className="h-7.5 w-7.5 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                  aria-label={fullscreenPanel === "input" ? "Exit Fullscreen" : "Fullscreen Input"}
                >
                  {fullscreenPanel === "input" ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-popover text-popover-foreground border border-border text-[9px] py-0.5 px-1.5">
                {fullscreenPanel === "input" ? "Exit Fullscreen" : "Fullscreen Input"}
              </TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="h-4 mx-1" />

            {/* Sample JSON Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={loadSample}
                  variant="ghost"
                  size="sm"
                  className="h-7.5 px-2 text-[11px] font-sans text-muted-foreground hover:text-foreground cursor-pointer gap-1"
                  aria-label="Load Sample JSON"
                >
                  <Sparkles size={11} className="text-amber-500" />
                  <span className="hidden md:inline">Sample JSON</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-popover text-popover-foreground border border-border text-[9px] py-0.5 px-1.5">Load Sample JSON</TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="h-4 mx-1" />

            {/* Print Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handlePrint}
                  variant="ghost"
                  size="sm"
                  className="h-7.5 w-7.5 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                  aria-label="Print raw JSON"
                >
                  <Printer size={12} />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-popover text-popover-foreground border border-border text-[9px] py-0.5 px-1.5">Print Input</TooltipContent>
            </Tooltip>

            {/* Copy Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={copyInput}
                  variant="ghost"
                  size="sm"
                  className="h-7.5 w-7.5 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                  aria-label="Copy input raw JSON"
                >
                  {copiedInput ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-popover text-popover-foreground border border-border text-[9px] py-0.5 px-1.5">Copy Input</TooltipContent>
            </Tooltip>

            {/* Clear Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleClear}
                  variant="ghost"
                  size="sm"
                  className="h-7.5 w-7.5 p-0 text-red-400 hover:text-red-500 hover:bg-red-500/10 cursor-pointer animate-in fade-in"
                  aria-label="Clear editor contents"
                >
                  <Trash2 size={12} />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-popover text-popover-foreground border border-border text-[9px] py-0.5 px-1.5">Clear Editor</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <CardContent className="p-0 flex-1 flex overflow-hidden min-h-0 relative">
          {/* Line Gutter */}
          <div
            ref={gutterRef}
            className="w-12 bg-secondary/10 text-muted-foreground/35 text-right select-none pr-3.5 pl-1 py-4 font-mono overflow-hidden border-r border-border/30 leading-6 shrink-0"
            style={{ fontSize: "var(--json-font-size)" }}
          >
            {lineNumbers.map((num) => (
              <div
                key={num}
                onClick={error && error.line === num ? goToErrorLine : undefined}
                className={cn(
                  "transition-all",
                  error && error.line === num
                    ? "text-red-400 bg-red-500/15 font-bold cursor-pointer hover:bg-red-500/20 rounded-sm"
                    : ""
                )}
                title={error && error.line === num ? `Error: ${error.msg}` : undefined}
              >
                {num}
              </div>
            ))}
          </div>

          {/* Text Area */}
          <label htmlFor="json-input-area" className="sr-only">Paste raw JSON code</label>
          <Textarea
            id="json-input-area"
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onScroll={handleScroll}
            placeholder="Paste or drag-and-drop raw JSON here..."
            spellCheck={false}
            aria-label="JSON Input Area"
            className="flex-1 resize-none bg-transparent py-4 px-4 font-mono leading-6 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 select-text overflow-y-auto whitespace-pre h-full rounded-none outline-none"
            style={{ fontSize: "var(--json-font-size)" }}
          />

          {/* Error Detail Floating Banner (Click to jump to error) */}
          {error && (
            <button
              onClick={goToErrorLine}
              className="absolute bottom-0 left-0 right-0 bg-destructive hover:bg-destructive/95 text-destructive-foreground px-4 py-3 text-left flex items-start gap-2.5 text-xs border-t border-destructive/50 z-20 transition-colors cursor-pointer animate-in slide-in-from-bottom-3 duration-300 w-full"
              title="Click to locate syntax error inside input editor"
            >
              <AlertTriangle size={15} className="shrink-0 mt-0.5 animate-pulse" />
              <div className="flex-1">
                <p className="font-semibold font-sans flex items-center gap-1.5 text-left">
                  Syntax Error (Line {error.line}, Col {error.col})
                  <span className="text-[10px] underline font-light tracking-wide opacity-80">(Click to jump)</span>
                </p>
                <p className="opacity-90 font-mono text-[10px] mt-0.5 tracking-wide break-words text-left">{error.msg}</p>
              </div>
            </button>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};
