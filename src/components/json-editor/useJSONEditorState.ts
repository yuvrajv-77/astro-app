import { useState, useEffect, useMemo, useCallback } from "react";
import { jsonToXml, jsonToCsv, jsonToYaml } from "@/lib/converters";
import { SAMPLE_JSON } from "./constants";

export interface HistoryItem {
  timestamp: number;
  input: string;
  size: number;
  mode: string;
}

export interface UseJSONEditorStateProps {
  mode: "formatter" | "validator" | "minifier";
}

export const useJSONEditorState = ({ mode }: UseJSONEditorStateProps) => {
  const [inputText, setInputText] = useState<string>(SAMPLE_JSON);
  const [outputText, setOutputText] = useState<string>("");
  const [parsedData, setParsedData] = useState<unknown>(null);

  // Layout states
  const [outputMode, setOutputMode] = useState<"json" | "xml" | "csv" | "yaml">("json");
  const [activeTab, setActiveTab] = useState<string>("tree");

  // Format settings
  const [indentSize, setIndentSize] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("devjson_indent") || "2";
    }
    return "2";
  });
  const [liveValidation, setLiveValidation] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const val = localStorage.getItem("devjson_live_val");
      return val !== null ? val === "true" : true;
    }
    return true;
  });
  const [saveHistory, setSaveHistory] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const val = localStorage.getItem("devjson_save_history");
      return val !== null ? val === "true" : true;
    }
    return true;
  });
  const [bigNumSupport, setBigNumSupport] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const val = localStorage.getItem("devjson_bignum");
      return val !== null ? val === "true" : false;
    }
    return false;
  });

  // Error handling & diagnostics
  const [error, setError] = useState<{ msg: string; line: number; col: number } | null>(null);
  const [validationStatus, setValidationStatus] = useState<"idle" | "valid" | "invalid">("idle");
  const [parseTimeMs, setParseTimeMs] = useState<number>(0);

  // Tree View actions
  const [treeSearch, setTreeSearch] = useState<string>("");
  const [expandAllFlag, setExpandAllFlag] = useState<boolean>(false);
  const [collapseAllFlag, setCollapseAllFlag] = useState<boolean>(false);
  const [showBadges, setShowBadges] = useState<boolean>(true);

  // Local history
  const [historyList, setHistoryList] = useState<HistoryItem[]>(() => {
    if (typeof window !== "undefined") {
      const val = localStorage.getItem("devjson_history");
      if (val) {
        try {
          return JSON.parse(val);
        } catch {
          // ignore
        }
      }
    }
    return [];
  });
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

  // Fullscreen state
  const [fullscreenPanel, setFullscreenPanel] = useState<"none" | "input" | "output">("none");

  // Parse error extractor helper
  const getJSONErrorDetails = useCallback((err: Error, text: string) => {
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
  }, []);

  const addToHistory = useCallback((input: string) => {
    const newItem: HistoryItem = {
      timestamp: Date.now(),
      input,
      size: new Blob([input]).size,
      mode: mode,
    };

    setHistoryList((prevList) => {
      const filtered = prevList.filter((item) => item.input.trim() !== input.trim());
      const updated = [newItem, ...filtered].slice(0, 10); // Keep last 10
      localStorage.setItem("devjson_history", JSON.stringify(updated));
      return updated;
    });
  }, [mode]);

  // Main utility processor
  const runProcessing = useCallback((shouldSaveHistory = true, targetFormat: "json" | "xml" | "csv" | "yaml" | "minify" = "json") => {
    if (!inputText.trim()) return;

    try {
      // Clean JSON parsing
      const startTime = performance.now();
      const parsed = JSON.parse(inputText);
      const endTime = performance.now();
      setParseTimeMs(endTime - startTime);
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
    } catch (e: unknown) {
      const details = getJSONErrorDetails(e as Error, inputText);
      setError(details);
      setValidationStatus("invalid");
      setOutputText("");
      setParsedData(null);
    }
  }, [inputText, indentSize, saveHistory, addToHistory, getJSONErrorDetails]);

  // Run live validation / formatting when input changes
  useEffect(() => {
    if (inputText.trim() !== "") {
      if (liveValidation) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        runProcessing(false, "json"); // don't save to history during live typing
      } else {
        // Just validate syntax silently
        try {
          const startTime = performance.now();
          JSON.parse(inputText);
          const endTime = performance.now();
          setParseTimeMs(endTime - startTime);
          setError(null);
          setValidationStatus("valid");
        } catch (e: unknown) {
          const details = getJSONErrorDetails(e as Error, inputText);
          setError(details);
          setValidationStatus("invalid");
        }
      }
    } else {
      setError(null);
      setOutputText("");
      setParsedData(null);
      setValidationStatus("idle");
      setParseTimeMs(0);
    }
  }, [inputText, liveValidation, indentSize, runProcessing, getJSONErrorDetails]);

  const triggerPrimaryAction = useCallback(() => {
    if (mode === "minifier") {
      runProcessing(true, "minify");
      setActiveTab("text");
    } else if (mode === "validator") {
      runProcessing(true, "json");
    } else {
      // Default formatter
      runProcessing(true, "json");
      setActiveTab("tree");
    }
  }, [mode, runProcessing]);

  const clearHistory = useCallback(() => {
    setHistoryList([]);
    localStorage.removeItem("devjson_history");
  }, []);

  // Clipboard Copiers
  const [copiedInput, setCopiedInput] = useState(false);
  const copyInput = useCallback(() => {
    navigator.clipboard.writeText(inputText);
    setCopiedInput(true);
    setTimeout(() => setCopiedInput(false), 1500);
  }, [inputText]);

  const [copiedOutput, setCopiedOutput] = useState(false);
  const copyOutput = useCallback(() => {
    navigator.clipboard.writeText(outputText || inputText);
    setCopiedOutput(true);
    setTimeout(() => setCopiedOutput(false), 1500);
  }, [outputText, inputText]);

  const loadSample = useCallback(() => {
    setInputText(SAMPLE_JSON);
  }, []);

  const handlePrint = useCallback(() => {
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
        <body>${inputText || SAMPLE_JSON}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }, [inputText]);

  // Clear Action
  const handleClear = useCallback(() => {
    setInputText("");
    setOutputText("");
    setParsedData(null);
    setError(null);
    setValidationStatus("idle");
  }, []);

  const processUploadedFile = useCallback((file: File) => {
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
  }, []);

  // File Upload
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processUploadedFile(file);
    e.target.value = ""; // reset input
  }, [processUploadedFile]);

  // URI Fetching Action
  const handleFetchUri = useCallback(async (e: React.FormEvent) => {
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setUriError(
        msg.includes("Failed to fetch")
          ? "CORS restriction or network error. Verify that target server permits cross-origin requests."
          : msg || "Failed to load URL JSON data."
      );
    } finally {
      setUriLoading(false);
    }
  }, [uriInput]);

  // Download Output File
  const downloadOutput = useCallback(() => {
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
  }, [outputText, inputText, outputMode, mode]);

  // Expand / Collapse
  const triggerExpandAll = useCallback(() => {
    setExpandAllFlag(true);
    setTimeout(() => setExpandAllFlag(false), 100);
  }, []);

  const triggerCollapseAll = useCallback(() => {
    setCollapseAllFlag(true);
    setTimeout(() => setCollapseAllFlag(false), 100);
  }, []);

  // Save specific configurations
  const handleIndentChange = useCallback((size: string) => {
    setIndentSize(size);
    localStorage.setItem("devjson_indent", size);
  }, []);

  const toggleLiveVal = useCallback((checked: boolean) => {
    setLiveValidation(checked);
    localStorage.setItem("devjson_live_val", String(checked));
  }, []);

  const toggleHistorySave = useCallback((checked: boolean) => {
    setSaveHistory(checked);
    localStorage.setItem("devjson_save_history", String(checked));
  }, []);

  const toggleBigNum = useCallback((checked: boolean) => {
    setBigNumSupport(checked);
    localStorage.setItem("devjson_bignum", String(checked));
  }, []);

  // Formatting size numbers
  const formatBytes = useCallback((bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }, []);

  // Real-time structural JSON metrics engine
  const metrics = useMemo(() => {
    const sizeBytes = new Blob([inputText]).size;
    const charCount = inputText.length;
    const lineCount = inputText.trim() === "" ? 0 : inputText.split("\n").length;

    let depth = 0;
    let nodeCount = 0;

    if (parsedData && validationStatus === "valid") {
      const calculateDepth = (val: unknown): number => {
        if (typeof val !== "object" || val === null) return 0;
        let maxSubDepth = 0;
        if (Array.isArray(val)) {
          for (let i = 0; i < val.length; i++) {
            maxSubDepth = Math.max(maxSubDepth, calculateDepth(val[i]));
          }
        } else {
          const record = val as Record<string, unknown>;
          for (const k in record) {
            if (Object.prototype.hasOwnProperty.call(record, k)) {
              maxSubDepth = Math.max(maxSubDepth, calculateDepth(record[k]));
            }
          }
        }
        return maxSubDepth + 1;
      };

      const calculateNodes = (val: unknown): number => {
        if (typeof val !== "object" || val === null) return 1;
        let count = 1; // Count container node itself
        if (Array.isArray(val)) {
          for (let i = 0; i < val.length; i++) {
            count += calculateNodes(val[i]);
          }
        } else {
          const record = val as Record<string, unknown>;
          for (const k in record) {
            if (Object.prototype.hasOwnProperty.call(record, k)) {
              count += calculateNodes(record[k]);
            }
          }
        }
        return count;
      };

      depth = calculateDepth(parsedData);
      nodeCount = calculateNodes(parsedData);
    }

    return {
      sizeBytes,
      charCount,
      lineCount,
      depth,
      nodeCount,
      parseTimeMs,
    };
  }, [inputText, parsedData, validationStatus, parseTimeMs]);

  const outputSize = useMemo(() => new Blob([outputText]).size, [outputText]);

  return {
    inputText,
    setInputText,
    outputText,
    setOutputText,
    parsedData,
    setParsedData,
    outputMode,
    setOutputMode,
    activeTab,
    setActiveTab,
    indentSize,
    setIndentSize,
    liveValidation,
    setLiveValidation,
    saveHistory,
    setSaveHistory,
    bigNumSupport,
    setBigNumSupport,
    error,
    setError,
    validationStatus,
    setValidationStatus,
    treeSearch,
    setTreeSearch,
    expandAllFlag,
    collapseAllFlag,
    showBadges,
    setShowBadges,
    historyList,
    setHistoryList,
    isHistoryOpen,
    setIsHistoryOpen,
    isUriOpen,
    setIsUriOpen,
    uriInput,
    setUriInput,
    uriLoading,
    setUriLoading,
    uriError,
    setUriError,
    isDragging,
    setIsDragging,
    hudExpanded,
    setHudExpanded,
    prefsExpanded,
    setPrefsExpanded,
    fullscreenPanel,
    setFullscreenPanel,
    runProcessing,
    triggerPrimaryAction,
    addToHistory,
    clearHistory,
    copiedInput,
    copyInput,
    copiedOutput,
    copyOutput,
    loadSample,
    handlePrint,
    handleClear,
    processUploadedFile,
    handleFileUpload,
    handleFetchUri,
    downloadOutput,
    triggerExpandAll,
    triggerCollapseAll,
    handleIndentChange,
    toggleLiveVal,
    toggleHistorySave,
    toggleBigNum,
    formatBytes,
    metrics,
    outputSize,
  };
};
