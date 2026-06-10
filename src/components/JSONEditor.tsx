import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  Play,
  Trash2,
  Copy,
  Download,
  FileUp,
  History,
  Search,
  Check,
  AlertTriangle,
  FolderTree,
  FileJson,
  Braces,
  Globe,
  Code2,
  Table,
  FileText,
  Loader2,
  Settings,
  Sparkles,
  Info,
  Printer,
  Gauge,
  Database,
  Network,
  Layers,
  Timer,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { JSONTreeView } from "./JSONTreeView";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Kbd } from "@/components/ui/kbd";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { jsonToXml, jsonToCsv, jsonToYaml } from "@/lib/converters";

interface JSONEditorProps {
  mode: "formatter" | "validator" | "minifier";
}

interface HistoryItem {
  timestamp: number;
  input: string;
  size: number;
  mode: string;
}

const SAMPLE_JSON = `{
  "store": {
    "name": "DevJSON Sandbox Store",
    "active": true,
    "established": 2026,
    "categories": ["utilities", "dev-tools", "offline-first"],
    "books": [
      {
        "category": "reference",
        "author": "Nigel Rees",
        "title": "Sayings of the Century",
        "price": 8.95
      },
      {
        "category": "fiction",
        "author": "Evelyn Waugh",
        "title": "Sword of Honour",
        "price": 12.99
      }
    ],
    "owner": null
  }
}`;

export const JSONEditor: React.FC<JSONEditorProps> = ({ mode }) => {
  const [inputText, setInputText] = useState<string>("");
  const [outputText, setOutputText] = useState<string>("");
  const [parsedData, setParsedData] = useState<any>(null);

  // Layout states
  const [outputMode, setOutputMode] = useState<"json" | "xml" | "csv" | "yaml">("json");
  const [activeTab, setActiveTab] = useState<string>("tree");

  // Format settings
  const [indentSize, setIndentSize] = useState<string>("2");
  const [liveValidation, setLiveValidation] = useState<boolean>(true);
  const [saveHistory, setSaveHistory] = useState<boolean>(true);
  const [bigNumSupport, setBigNumSupport] = useState<boolean>(false);

  // Error handling & diagnostics
  const [error, setError] = useState<{ msg: string; line: number; col: number } | null>(null);
  const [validationStatus, setValidationStatus] = useState<"idle" | "valid" | "invalid">("idle");

  // Tree View actions
  const [treeSearch, setTreeSearch] = useState<string>("");
  const [expandAllFlag, setExpandAllFlag] = useState<boolean>(false);
  const [collapseAllFlag, setCollapseAllFlag] = useState<boolean>(false);

  // Local history
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);

  // URI Fetching States
  const [isUriOpen, setIsUriOpen] = useState<boolean>(false);
  const [uriInput, setUriInput] = useState<string>("");
  const [uriLoading, setUriLoading] = useState<boolean>(false);
  const [uriError, setUriError] = useState<string | null>(null);

  // Drag-and-drop feedback
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Collapsible panels
  const [hudExpanded, setHudExpanded] = useState<boolean>(true);
  const [prefsExpanded, setPrefsExpanded] = useState<boolean>(false);

  // Synced Scroll Ref for Line Numbers Gutter
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  // Generate line numbers count
  const lineCount = inputText.split("\n").length || 1;
  const lineNumbers = Array.from({ length: Math.max(lineCount, 1) }, (_, i) => i + 1);

  // Sync scroll positions
  const handleScroll = () => {
    if (textareaRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Enter or Cmd+Enter to Trigger Page Mode Primary Action
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        triggerPrimaryAction();
      }
      // Esc to clear input when focused inside textarea
      if (e.key === "Escape" && document.activeElement === textareaRef.current) {
        e.preventDefault();
        handleClear();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [inputText, mode, indentSize, saveHistory, historyList]);

  // Load configuration and history on mount
  useEffect(() => {
    const savedConfig = localStorage.getItem("devjson_indent");
    if (savedConfig) setIndentSize(savedConfig);

    const savedLiveVal = localStorage.getItem("devjson_live_val");
    if (savedLiveVal) setLiveValidation(savedLiveVal === "true");

    const savedSaveHistory = localStorage.getItem("devjson_save_history");
    if (savedSaveHistory) setSaveHistory(savedSaveHistory === "true");

    const savedBigNum = localStorage.getItem("devjson_bignum");
    if (savedBigNum) setBigNumSupport(savedBigNum === "true");

    const savedHistory = localStorage.getItem("devjson_history");
    if (savedHistory) {
      try {
        setHistoryList(JSON.parse(savedHistory));
      } catch (e) {
        console.error(e);
      }
    }

    // Load sample json initially
    setInputText(SAMPLE_JSON);
  }, []);

  // Run live validation / formatting when input changes
  useEffect(() => {
    if (inputText.trim() !== "") {
      if (liveValidation) {
        runProcessing(false, "json"); // don't save to history during live typing
      } else {
        // Just validate syntax silently
        try {
          JSON.parse(inputText);
          setError(null);
          setValidationStatus("valid");
        } catch (e: any) {
          const details = getJSONErrorDetails(e, inputText);
          setError(details);
          setValidationStatus("invalid");
        }
      }
    } else {
      setError(null);
      setOutputText("");
      setParsedData(null);
      setValidationStatus("idle");
    }
  }, [inputText, liveValidation, indentSize]);

  // Scroll to line when error banner or gutter is clicked (DX feature)
  const goToErrorLine = () => {
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
  };

  // Parse error extractor helper
  const getJSONErrorDetails = (err: Error, text: string) => {
    const msg = err.message;
    let line = 1;
    let col = 1;
    let position = -1;

    // Search for position string in browser standard error message
    const posMatch = msg.match(/at position (\d+)/i) || msg.match(/char (\d+)/i) || msg.match(/column (\d+)/i);
    if (posMatch) {
      position = parseInt(posMatch[1], 10);
    }

    if (position !== -1) {
      const lines = text.slice(0, position).split("\n");
      line = lines.length;
      col = lines[lines.length - 1].length + 1;
    } else {
      // Chrome V8 error check: e.g. "Expected ',' or '}' after property value in JSON at line 3 column 10"
      const lineColMatch = msg.match(/line (\d+) column (\d+)/i);
      if (lineColMatch) {
        line = parseInt(lineColMatch[1], 10);
        col = parseInt(lineColMatch[2], 10);
      }
    }

    return { msg, line, col };
  };

  // Main utility processor
  const runProcessing = (shouldSaveHistory = true, targetFormat: "json" | "xml" | "csv" | "yaml" | "minify" = "json") => {
    if (!inputText.trim()) return;

    try {
      // Clean JSON parsing
      const parsed = JSON.parse(inputText);
      setParsedData(parsed);
      setError(null);
      setValidationStatus("valid");

      // Format based on action
      if (targetFormat === "minify") {
        const minified = JSON.stringify(parsed);
        setOutputText(minified);
        setOutputMode("json");
      } else if (targetFormat === "json") {
        const spacer = indentSize === "tab" ? "\t" : parseInt(indentSize, 10);
        const pretty = JSON.stringify(parsed, null, spacer);
        setOutputText(pretty);
        setOutputMode("json");
      } else if (targetFormat === "xml") {
        const spacer = indentSize === "tab" ? "\t" : " ".repeat(parseInt(indentSize, 10));
        const xml = jsonToXml(parsed, spacer);
        setOutputText(xml);
        setOutputMode("xml");
        setActiveTab("text"); // XML is viewable as plain text
      } else if (targetFormat === "csv") {
        const csv = jsonToCsv(parsed);
        setOutputText(csv);
        setOutputMode("csv");
        setActiveTab("text"); // CSV is viewable as plain text
      } else if (targetFormat === "yaml") {
        const spacerNum = indentSize === "tab" ? 4 : parseInt(indentSize, 10);
        const yaml = jsonToYaml(parsed, spacerNum);
        setOutputText(yaml);
        setOutputMode("yaml");
        setActiveTab("text"); // YAML is viewable as plain text
      }

      // Save to history if requested
      if (shouldSaveHistory && saveHistory) {
        addToHistory(inputText);
      }
    } catch (e: any) {
      const details = getJSONErrorDetails(e, inputText);
      setError(details);
      setValidationStatus("invalid");
      setOutputText("");
      setParsedData(null);
    }
  };

  const triggerPrimaryAction = () => {
    if (mode === "minifier") {
      runProcessing(true, "minify");
      setActiveTab("text");
    } else if (mode === "validator") {
      runProcessing(true, "json");
      // Highlights error or valid state
    } else {
      // Default formatter
      runProcessing(true, "json");
      setActiveTab("tree");
    }
  };

  const addToHistory = (input: string) => {
    const newItem: HistoryItem = {
      timestamp: Date.now(),
      input,
      size: new Blob([input]).size,
      mode: mode,
    };

    const filtered = historyList.filter(item => item.input.trim() !== input.trim());
    const updated = [newItem, ...filtered].slice(0, 10); // Keep last 10

    setHistoryList(updated);
    localStorage.setItem("devjson_history", JSON.stringify(updated));
  };

  const clearHistory = () => {
    setHistoryList([]);
    localStorage.removeItem("devjson_history");
  };

  // Clipboard Copiers
  const [copiedInput, setCopiedInput] = useState(false);
  const copyInput = () => {
    navigator.clipboard.writeText(inputText);
    setCopiedInput(true);
    setTimeout(() => setCopiedInput(false), 1500);
  };

  const [copiedOutput, setCopiedOutput] = useState(false);
  const copyOutput = () => {
    navigator.clipboard.writeText(outputText || inputText);
    setCopiedOutput(true);
    setTimeout(() => setCopiedOutput(false), 1500);
  };

  const loadSample = () => {
    setInputText(SAMPLE_JSON);
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Print JSON</title>
          <style>
            body { font-family: monospace; white-space: pre-wrap; padding: 20px; font-size: 13px; }
          </style>
        </head>
        <body>\${inputText || SAMPLE_JSON}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  // Clear Action
  const handleClear = () => {
    setInputText("");
    setOutputText("");
    setParsedData(null);
    setError(null);
    setValidationStatus("idle");
    if (textareaRef.current) textareaRef.current.focus();
  };

  // File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processUploadedFile(file);
    e.target.value = ""; // reset input
  };

  const processUploadedFile = (file: File) => {
    if (file.type !== "application/json" && !file.name.endsWith(".json")) {
      alert("Please upload a valid .json file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === "string") {
        setInputText(text);
      }
    };
    reader.readAsText(file);
  };

  // Drag and drop event handlers
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

  // URI Fetching Action
  const handleFetchUri = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uriInput.trim()) return;

    setUriLoading(true);
    setUriError(null);
    try {
      const response = await fetch(uriInput);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setInputText(JSON.stringify(data, null, 2));
      setIsUriOpen(false);
      setUriInput("");
    } catch (err: any) {
      setUriError(
        err.message?.includes("Failed to fetch")
          ? "CORS restriction or network error. Verify that target server permits cross-origin requests."
          : err.message || "Failed to load URL JSON data."
      );
    } finally {
      setUriLoading(false);
    }
  };

  // Download Output File
  const downloadOutput = () => {
    const content = outputText || inputText;
    if (!content) return;
    const extension = outputMode;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `devjson-${mode}-${Date.now()}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Expand / Collapse
  const triggerExpandAll = () => {
    setExpandAllFlag(true);
    setTimeout(() => setExpandAllFlag(false), 100);
  };

  const triggerCollapseAll = () => {
    setCollapseAllFlag(true);
    setTimeout(() => setCollapseAllFlag(false), 100);
  };

  // Save specific configurations
  const handleIndentChange = (size: string) => {
    setIndentSize(size);
    localStorage.setItem("devjson_indent", size);
  };

  const toggleLiveVal = (checked: boolean) => {
    setLiveValidation(checked);
    localStorage.setItem("devjson_live_val", String(checked));
  };

  const toggleHistorySave = (checked: boolean) => {
    setSaveHistory(checked);
    localStorage.setItem("devjson_save_history", String(checked));
  };

  const toggleBigNum = (checked: boolean) => {
    setBigNumSupport(checked);
    localStorage.setItem("devjson_bignum", String(checked));
  };

  // Formatting size numbers
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Real-time structural JSON metrics engine
  const metrics = React.useMemo(() => {
    const sizeBytes = new Blob([inputText]).size;
    const charCount = inputText.length;
    const lineCount = inputText.trim() === "" ? 0 : inputText.split("\n").length;

    let depth = 0;
    let nodeCount = 0;
    let parseTimeMs = 0;

    if (inputText.trim() !== "") {
      try {
        const startTime = performance.now();
        const parsed = JSON.parse(inputText);
        const endTime = performance.now();
        parseTimeMs = endTime - startTime;

        const calculateDepth = (val: any): number => {
          if (typeof val !== "object" || val === null) return 0;
          let maxSubDepth = 0;
          if (Array.isArray(val)) {
            for (let i = 0; i < val.length; i++) {
              maxSubDepth = Math.max(maxSubDepth, calculateDepth(val[i]));
            }
          } else {
            for (const k in val) {
              if (Object.prototype.hasOwnProperty.call(val, k)) {
                maxSubDepth = Math.max(maxSubDepth, calculateDepth(val[k]));
              }
            }
          }
          return maxSubDepth + 1;
        };

        const calculateNodes = (val: any): number => {
          if (typeof val !== "object" || val === null) return 1;
          let count = 1; // Count container node itself
          if (Array.isArray(val)) {
            for (let i = 0; i < val.length; i++) {
              count += calculateNodes(val[i]);
            }
          } else {
            for (const k in val) {
              if (Object.prototype.hasOwnProperty.call(val, k)) {
                count += calculateNodes(val[k]);
              }
            }
          }
          return count;
        };

        depth = calculateDepth(parsed);
        nodeCount = calculateNodes(parsed);
      } catch (e) {
        // Invalid JSON - keep default values
      }
    }

    return {
      sizeBytes,
      charCount,
      lineCount,
      depth,
      nodeCount,
      parseTimeMs,
    };
  }, [inputText]);

  const outputSize = new Blob([outputText]).size;

  return (
    <TooltipProvider>
      <div className="w-full flex-1 flex flex-col gap-6">

        {/* Workspace 3-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px_1fr] gap-6 flex-1 min-h-[600px]">

          {/* COLUMN 1: Accessible Input Panel */}
          <Card
            className={cn(
              "py-0 border-border bg-card flex flex-col h-full transition-all duration-300 relative overflow-hidden focus-within:ring-1 focus-within:ring-primary/40",
              isDragging ? "border-primary bg-primary/5 scale-[0.995]" : ""
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
                className="w-12 bg-secondary/10 text-muted-foreground/35 text-right select-none pr-3.5 pl-1 py-4 text-[11px] font-mono overflow-hidden border-r border-border/30 leading-6 shrink-0"
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
                className="flex-1 resize-none bg-transparent py-4 px-4 text-xs font-mono leading-6 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 select-text overflow-y-auto whitespace-pre h-full rounded-none outline-none"
              />

              {/* Error Detail Floating Banner (Click to jump to error) */}
              {error && (
                <button
                  onClick={goToErrorLine}
                  className="absolute bottom-0 left-0 right-0 bg-destructive hover:bg-destructive/95 text-destructive-foreground px-4 py-3 text-left flex items-start gap-2.5 text-xs border-t border-destructive/50 z-20 transition-colors cursor-pointer animate-in slide-in-from-bottom-3 duration-300"
                  title="Click to locate syntax error inside input editor"
                >
                  <AlertTriangle size={15} className="shrink-0 mt-0.5 animate-pulse" />
                  <div className="flex-1">
                    <p className="font-semibold font-sans flex items-center gap-1.5">
                      Syntax Error (Line {error.line}, Col {error.col})
                      <span className="text-[10px] underline font-light tracking-wide opacity-80">(Click to jump)</span>
                    </p>
                    <p className="opacity-90 font-mono text-[10px] mt-0.5 tracking-wide break-words">{error.msg}</p>
                  </div>
                </button>
              )}
            </CardContent>
          </Card>

          {/* COLUMN 2: Accessible Central Control Deck */}
          <div className="flex flex-col gap-5 justify-start shrink-0 lg:sticky lg:top-[5.5rem] self-start">

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
                      <span className="uppercase">
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
                      disabled={!inputText.trim() || !!error}
                      className="h-8.5 text-[11px] justify-start px-3 gap-2 text-left cursor-pointer hover:bg-secondary/60 border-border/85"
                    >
                      <Code2 size={12} className="text-indigo-400" />
                      <span>Convert JSON to XML</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => runProcessing(true, "csv")}
                      disabled={!inputText.trim() || !!error}
                      className="h-8.5 text-[11px] justify-start px-3 gap-2 text-left cursor-pointer hover:bg-secondary/60 border-border/85"
                    >
                      <Table size={12} className="text-cyan-400" />
                      <span>Convert JSON to CSV</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => runProcessing(true, "yaml")}
                      disabled={!inputText.trim() || !!error}
                      className="h-8.5 text-[11px] justify-start px-3 gap-2 text-left cursor-pointer hover:bg-secondary/60 border-border/85"
                    >
                      <FileText size={12} className="text-emerald-400" />
                      <span>Convert JSON to YAML</span>
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
                    <div className="flex items-center gap-1.5 text-[9px] font-sans text-muted-foreground">
                      <Database size={11} className="text-muted-foreground/85" />
                      <span>File Size</span>
                    </div>
                    <span className="text-xs font-semibold text-card-foreground">
                      {formatBytes(metrics.sizeBytes)}
                    </span>
                  </div>

                  {/* Nodes Metric */}
                  <div className="flex flex-col gap-1 p-2 bg-secondary/20 rounded border border-border/40 hover:bg-secondary/45 hover:border-primary/20 transition-all">
                    <div className="flex items-center gap-1.5 text-[9px] font-sans text-muted-foreground">
                      <Network size={11} className="text-muted-foreground/85" />
                      <span>Total Nodes</span>
                    </div>
                    <span className="text-xs font-semibold text-card-foreground">
                      {validationStatus === "valid" && metrics.nodeCount > 0 ? metrics.nodeCount.toLocaleString() : "—"}
                    </span>
                  </div>

                  {/* Depth Metric */}
                  <div className="flex flex-col gap-1 p-2 bg-secondary/20 rounded border border-border/40 hover:bg-secondary/45 hover:border-primary/20 transition-all">
                    <div className="flex items-center gap-1.5 text-[9px] font-sans text-muted-foreground">
                      <Layers size={11} className="text-muted-foreground/85" />
                      <span>Nesting Depth</span>
                    </div>
                    <span className="text-xs font-semibold text-card-foreground">
                      {validationStatus === "valid" && metrics.depth > 0 ? `${metrics.depth} levels` : "—"}
                    </span>
                  </div>

                  {/* Parse Speed Metric */}
                  <div className="flex flex-col gap-1 p-2 bg-secondary/20 rounded border border-border/40 hover:bg-secondary/45 hover:border-primary/20 transition-all">
                    <div className="flex items-center gap-1.5 text-[9px] font-sans text-muted-foreground">
                      <Timer size={11} className="text-muted-foreground/85" />
                      <span>Parse Time</span>
                    </div>
                    <span className={cn(
                      "text-xs font-semibold",
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

          {/* COLUMN 3: Accessible Output Inspector */}
          <Card className="py-0 border-border bg-card flex flex-col  h-full overflow-hidden focus-within:ring-1 focus-within:ring-primary/40">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col  min-h-0">

              <div className="h-12 border-b  flex flex-row items-center justify-between px-4 gap-2 shrink-0">
                <TabsList className="bg-secondary/50 border ">
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
                  </ButtonGroup>
                </div>
              </div>

              {/* Tab: Collapsible Tree Visualizer */}
              <TabsContent value="tree" className="flex-1 flex flex-col min-h-0 m-0 border-0 outline-none">
                {error ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center h-full">
                    <div className="max-w-md w-full bg-destructive/5 border border-destructive/20 rounded-lg p-5 flex flex-col items-center shadow-sm animate-in fade-in zoom-in-95 duration-200">
                      <div className="p-3 bg-destructive/15 text-destructive rounded-full mb-3">
                        <AlertTriangle size={24} className="animate-pulse" />
                      </div>
                      <h3 className="font-heading font-bold text-sm text-foreground mb-1">JSON Validation Failed</h3>
                      <p className="text-xs text-muted-foreground mb-4 font-mono font-semibold">
                        Line {error.line}, Column {error.col}
                      </p>

                      <div className="w-full bg-secondary/35 rounded border border-border/50 p-3 text-left mb-4 font-mono text-[11px] leading-relaxed break-words text-card-foreground select-text">
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

                      {/* ButtonGroup for Expand/Collapse */}
                      <ButtonGroup className="border border-border/80 h-7.5 rounded overflow-hidden">
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
                    <div className="max-w-md w-full bg-destructive/5 border border-destructive/20  p-5 flex flex-col items-center shadow-sm animate-in fade-in zoom-in-95 duration-200">
                      <div className="p-3 bg-destructive/15 text-destructive rounded-full mb-3">
                        <AlertTriangle size={24} className="animate-pulse" />
                      </div>
                      <h3 className="font-heading font-bold text-sm text-foreground mb-1">JSON Validation Failed</h3>
                      <p className="text-xs text-muted-foreground mb-4 font-mono font-semibold">
                        Line {error.line}, Column {error.col}
                      </p>

                      <div className="w-full bg-secondary/35  border border-border/50 p-3 text-left mb-4 font-mono text-[11px] leading-relaxed break-words text-card-foreground select-text">
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
                    <pre className="p-4 text-xs font-mono overflow-y-auto select-text leading-6 h-full block bg-transparent text-foreground whitespace-pre">
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

        </div>
      </div>
    </TooltipProvider>
  );
};
