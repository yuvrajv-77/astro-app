import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { 
  Play, 
  Trash2, 
  Copy, 
  Download, 
  FileUp, 
  History, 
  Info, 
  Search, 
  Check, 
  AlertTriangle,
  FolderTree,
  FileJson,
  Braces
} from "lucide-react";
import { JSONTreeView } from "./JSONTreeView";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  
  // Format settings
  const [indentSize, setIndentSize] = useState<string>("2");
  const [liveValidation, setLiveValidation] = useState<boolean>(true);
  const [saveHistory, setSaveHistory] = useState<boolean>(true);
  
  // Error handling
  const [error, setError] = useState<{ msg: string; line: number; col: number } | null>(null);
  
  // Tree View actions
  const [treeSearch, setTreeSearch] = useState<string>("");
  const [expandAllFlag, setExpandAllFlag] = useState<boolean>(false);
  const [collapseAllFlag, setCollapseAllFlag] = useState<boolean>(false);
  
  // Local history
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);

  // Synced Scroll Ref for Line Numbers Gutter
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  // Generate line numbers count
  const lineCount = inputText.split("\n").length || 1;
  const lineNumbers = Array.from({ length: lengthOfLines(lineCount) }, (_, i) => i + 1);

  function lengthOfLines(cnt: number) {
    return cnt > 0 ? cnt : 1;
  }

  // Sync scroll positions
  const handleScroll = () => {
    if (textareaRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Enter or Cmd+Enter to Format
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        runProcessing(true);
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
    if (liveValidation && inputText.trim() !== "") {
      runProcessing(false); // don't save to history during live typing
    } else if (inputText.trim() === "") {
      setError(null);
      setOutputText("");
      setParsedData(null);
    }
  }, [inputText, liveValidation, indentSize]);

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
  const runProcessing = (shouldSaveHistory = true) => {
    if (!inputText.trim()) return;

    try {
      const parsed = JSON.parse(inputText);
      setParsedData(parsed);
      setError(null);

      // Perform formatting or minification based on active mode
      if (mode === "minifier") {
        const minified = JSON.stringify(parsed);
        setOutputText(minified);
      } else {
        // default formatted
        const spacer = indentSize === "tab" ? "\t" : parseInt(indentSize, 10);
        const pretty = JSON.stringify(parsed, null, spacer);
        setOutputText(pretty);
      }

      // Save to history if requested
      if (shouldSaveHistory && saveHistory) {
        addToHistory(inputText);
      }
    } catch (e: any) {
      const details = getJSONErrorDetails(e, inputText);
      setError(details);
      setOutputText("");
      setParsedData(null);
    }
  };

  const addToHistory = (input: string) => {
    const newItem: HistoryItem = {
      timestamp: Date.now(),
      input,
      size: new Blob([input]).size,
      mode: mode,
    };
    
    // De-duplicate: remove older entry with same contents
    const filtered = historyList.filter(item => item.input.trim() !== input.trim());
    const updated = [newItem, ...filtered].slice(0, 10); // Keep last 10
    
    setHistoryList(updated);
    localStorage.setItem("devjson_history", JSON.stringify(updated));
  };

  const clearHistory = () => {
    setHistoryList([]);
    localStorage.removeItem("devjson_history");
  };

  // Action: Copy to clipboard
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

  // Action: Clear editor
  const handleClear = () => {
    setInputText("");
    setOutputText("");
    setParsedData(null);
    setError(null);
    if (textareaRef.current) textareaRef.current.focus();
  };

  // Action: File upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === "string") {
        setInputText(text);
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // reset input
  };

  // Action: Download Output File
  const downloadJSON = () => {
    const content = outputText || inputText;
    if (!content) return;
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `devjson-${mode}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Action: Load Sample
  const loadSample = () => {
    setInputText(SAMPLE_JSON);
  };

  // Action: Trigger Expand / Collapse
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

  return (
    <TooltipProvider>
      <div className="w-full flex flex-col gap-4">
        {/* Editor Settings & Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-card p-3 rounded-lg border border-border">
          <div className="flex flex-wrap items-center gap-3">
            {/* Indent Selector */}
            {mode !== "minifier" && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-sans">Indent:</span>
                <Select value={indentSize} onValueChange={handleIndentChange}>
                  <SelectTrigger className="h-8 w-[110px] bg-secondary text-secondary-foreground text-xs rounded border border-border font-mono cursor-pointer">
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

            {mode !== "minifier" && (
              <Separator orientation="vertical" className="h-4 hidden sm:block" />
            )}

            {/* Config toggles */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch 
                  id="live-val"
                  checked={liveValidation}
                  onCheckedChange={toggleLiveVal}
                />
                <label htmlFor="live-val" className="text-xs text-muted-foreground font-sans select-none cursor-pointer">
                  Auto-Format
                </label>
              </div>
              
              <div className="flex items-center gap-2">
                <Switch 
                  id="save-history"
                  checked={saveHistory}
                  onCheckedChange={toggleHistorySave}
                />
                <label htmlFor="save-history" className="text-xs text-muted-foreground font-sans select-none cursor-pointer">
                  Save Local History
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* History Modal Trigger */}
            <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs font-sans h-9 cursor-pointer">
                  <History size={14} />
                  <span>History</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] bg-card text-foreground border-border font-sans">
                <DialogHeader>
                  <DialogTitle className="font-heading">Local Query History</DialogTitle>
                  <DialogDescription className="text-xs">
                    Your last 10 formatting runs are cached locally in your browser.
                  </DialogDescription>
                </DialogHeader>
                <div className="max-h-[300px] overflow-y-auto space-y-2 my-4 pr-1">
                  {historyList.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-xs font-mono">
                      No query history found.
                    </div>
                  ) : (
                    historyList.map((item, idx) => (
                      <div 
                        key={idx} 
                        className="flex items-center justify-between p-2.5 rounded border border-border bg-secondary/30 hover:bg-secondary/70 transition-all text-xs"
                      >
                        <div className="flex flex-col gap-1 font-mono">
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(item.timestamp).toLocaleString()}
                          </span>
                          <span className="text-primary font-semibold font-sans">
                            {item.mode.toUpperCase()} • {(item.size / 1024).toFixed(2)} KB
                          </span>
                        </div>
                        <Button 
                          size="sm" 
                          variant="secondary"
                          onClick={() => {
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
                <div className="flex justify-between items-center mt-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearHistory}
                    disabled={historyList.length === 0}
                    className="text-red-500 hover:text-red-600 hover:bg-red-500/10 text-xs gap-1.5 cursor-pointer"
                  >
                    <Trash2 size={12} />
                    Clear History
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setIsHistoryOpen(false)} className="text-xs cursor-pointer">
                    Close
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Run Button with Kbd shortcut */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={() => runProcessing(true)} 
                  size="sm" 
                  className="gap-1.5 text-xs font-sans h-9 bg-primary text-primary-foreground hover:bg-primary/95 cursor-pointer"
                >
                  <Play size={14} />
                  <span>Format JSON</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="flex items-center gap-1 bg-popover text-popover-foreground border border-border text-[10px] py-1 px-2">
                <span>Trigger Format</span>
                <Kbd className="bg-muted text-muted-foreground">Ctrl</Kbd>
                <span>+</span>
                <Kbd className="bg-muted text-muted-foreground">Enter</Kbd>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Dual Editor Panel Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
          
          {/* LEFT PANEL: Input Editor */}
          <Card className="border-border bg-card flex flex-col min-h-[500px]">
            <CardHeader className="p-3 border-b border-border flex flex-row items-center justify-between space-y-0 gap-2">
              <div className="flex items-center gap-2">
                <Braces size={16} className="text-primary" />
                <CardTitle className="text-sm font-semibold font-sans">Input JSON</CardTitle>
              </div>
              <div className="flex items-center gap-1.5">
                <Button 
                  onClick={loadSample}
                  variant="ghost" 
                  size="sm" 
                  className="h-8 text-[11px] font-sans text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Load Sample
                </Button>
                
                <Separator orientation="vertical" className="h-4" />
                
                {/* File Upload Hidden */}
                <label className="h-8 px-2.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 text-[11px] cursor-pointer transition-colors font-sans">
                  <FileUp size={12} />
                  <span>Upload</span>
                  <input 
                    type="file" 
                    accept=".json,application/json" 
                    onChange={handleFileUpload} 
                    className="hidden" 
                  />
                </label>

                <Separator orientation="vertical" className="h-4" />

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      onClick={copyInput} 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {copiedInput ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-popover text-popover-foreground border border-border text-[10px] py-1">Copy raw input</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      onClick={handleClear} 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10 cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="flex items-center gap-1 bg-popover text-popover-foreground border border-border text-[10px] py-1">
                    <span>Clear Editor</span>
                    <Kbd className="bg-muted text-muted-foreground">Esc</Kbd>
                  </TooltipContent>
                </Tooltip>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex overflow-hidden min-h-0 relative">
              {/* Line Gutter */}
              <div 
                ref={gutterRef}
                className="w-12 bg-secondary/20 text-muted-foreground/40 text-right select-none pr-3 pl-1 py-4 text-xs font-mono overflow-hidden border-r border-border/40 leading-6"
              >
                {lineNumbers.map((num) => (
                  <div key={num} className={cn(error && error.line === num ? "text-red-500 bg-red-500/10 font-bold" : "")}>
                    {num}
                  </div>
                ))}
              </div>

              {/* Input Area */}
              <Textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onScroll={handleScroll}
                placeholder="Paste or type raw JSON here..."
                spellCheck={false}
                className="flex-1 resize-none bg-transparent py-4 px-4 text-xs font-mono leading-6 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 select-text overflow-y-auto whitespace-pre h-full rounded-none"
              />

              {/* Floating Error Bar */}
              {error && (
                <div className="absolute bottom-0 left-0 right-0 bg-red-500/90 text-white backdrop-blur-md px-4 py-3 flex items-start gap-2 text-xs border-t border-red-600 z-10 animate-in slide-in-from-bottom-2">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold font-sans">JSON Syntax Error (Line {error.line}, Column {error.col})</p>
                    <p className="opacity-90 font-mono text-[11px] mt-1">{error.msg}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* RIGHT PANEL: Output Inspector */}
          <Card className="border-border bg-card flex flex-col min-h-[500px]">
            <Tabs defaultValue="tree" className="flex-1 flex flex-col">
              <CardHeader className="p-3 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-0 gap-2 pb-2.5 sm:pb-3 shrink-0">
                <TabsList className="bg-secondary/60 h-8 self-start">
                  <TabsTrigger value="tree" className="text-xs gap-1.5 h-7">
                    <FolderTree size={12} />
                    <span>Tree Viewer</span>
                  </TabsTrigger>
                  <TabsTrigger value="text" className="text-xs gap-1.5 h-7">
                    <FileJson size={12} />
                    <span>Plain Text</span>
                  </TabsTrigger>
                </TabsList>
                
                {/* ButtonGroup for Output Actions */}
                <ButtonGroup className="bg-secondary/20 border border-border h-8 rounded overflow-hidden">
                  <Button 
                    onClick={copyOutput} 
                    disabled={!outputText && !inputText}
                    variant="ghost" 
                    size="sm" 
                    className="h-full text-[11px] font-sans text-muted-foreground hover:text-foreground gap-1.5 cursor-pointer border-0 rounded-none hover:bg-secondary/40"
                  >
                    {copiedOutput ? (
                      <>
                        <Check size={12} className="text-emerald-500" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span>Copy Output</span>
                      </>
                    )}
                  </Button>
                  <Button 
                    onClick={downloadJSON} 
                    disabled={!outputText && !inputText}
                    variant="ghost" 
                    size="sm" 
                    className="h-full text-[11px] font-sans text-muted-foreground hover:text-foreground gap-1.5 cursor-pointer border-l border-border rounded-none hover:bg-secondary/40"
                  >
                    <Download size={12} />
                    <span>Download</span>
                  </Button>
                </ButtonGroup>
              </CardHeader>
              
              {/* Tab: Collapsible Tree Visualizer */}
              <TabsContent value="tree" className="flex-1 flex flex-col min-h-0 m-0 border-0 outline-none">
                {parsedData ? (
                  <>
                    {/* Tree toolbar search & collapse controls */}
                    <div className="flex items-center gap-2 p-2 border-b border-border/40 bg-secondary/10 shrink-0">
                      <div className="relative flex-1">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Search keys or values..."
                          value={treeSearch}
                          onChange={(e) => setTreeSearch(e.target.value)}
                          className="w-full bg-secondary text-foreground text-xs rounded pl-8 pr-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary font-sans border border-border"
                        />
                      </div>
                      
                      {/* ButtonGroup for Expand/Collapse */}
                      <ButtonGroup className="border border-border h-7 rounded overflow-hidden">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={triggerExpandAll} 
                          className="h-full text-[10px] font-sans cursor-pointer hover:bg-secondary/40 border-0 rounded-none"
                        >
                          Expand All
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={triggerCollapseAll} 
                          className="h-full text-[10px] font-sans cursor-pointer hover:bg-secondary/40 border-l border-border rounded-none"
                        >
                          Collapse All
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
                    <FolderTree size={36} className="text-muted-foreground/30 mb-2" />
                    <p className="text-xs font-sans">No valid JSON parsed yet.</p>
                    <p className="text-[10px] opacity-75 mt-0.5 font-sans">Valid input will construct the interactive tree here.</p>
                  </div>
                )}
              </TabsContent>
              
              {/* Tab: Formatted Plain Text */}
              <TabsContent value="text" className="flex-1 flex flex-col min-h-0 m-0 border-0 outline-none">
                {outputText || inputText ? (
                  <div className="flex-1 relative overflow-hidden min-h-0">
                    <pre className="p-4 text-xs font-mono overflow-y-auto select-text leading-6 h-full block bg-transparent text-foreground whitespace-pre">
                      {outputText || inputText}
                    </pre>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
                    <FileJson size={36} className="text-muted-foreground/30 mb-2" />
                    <p className="text-xs font-sans">No output generated.</p>
                    <p className="text-[10px] opacity-75 mt-0.5 font-sans">Beautified/Formatted raw text JSON outputs here.</p>
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
