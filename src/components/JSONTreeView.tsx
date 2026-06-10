import React, { useState, useEffect } from "react";
import { ChevronRight, ChevronDown, Copy } from "lucide-react";

interface TreeViewProps {
  data: any;
  searchQuery?: string;
  expandAll?: boolean;
  collapseAll?: boolean;
}

export const JSONTreeView: React.FC<TreeViewProps> = ({
  data,
  searchQuery = "",
  expandAll = false,
  collapseAll = false,
}) => {
  return (
    <div className="font-mono text-xs select-text overflow-x-auto p-4 leading-relaxed">
      <TreeNode
        name="root"
        value={data}
        path=""
        searchQuery={searchQuery}
        expandAll={expandAll}
        collapseAll={collapseAll}
        isLast={true}
      />
    </div>
  );
};

interface TreeNodeProps {
  name: string | number;
  value: any;
  path: string;
  searchQuery: string;
  expandAll: boolean;
  collapseAll: boolean;
  isLast: boolean;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  name,
  value,
  path,
  searchQuery,
  expandAll,
  collapseAll,
  isLast,
}) => {
  const type = typeof value;
  const isNull = value === null;
  const isArray = Array.isArray(value);
  const isObject = type === "object" && !isNull && !isArray;
  const isCollapsible = isObject || isArray;

  // Track expanded state
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // Sync expanded state with expandAll / collapseAll props
  useEffect(() => {
    if (expandAll) {
      setIsExpanded(true);
    }
  }, [expandAll]);

  useEffect(() => {
    if (collapseAll) {
      setIsExpanded(false);
    }
  }, [collapseAll]);

  // Handle local toggle
  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded((prev) => !prev);
  };

  // Helper to copy path to clipboard
  const [copiedPath, setCopiedPath] = useState(false);
  const handleCopyPath = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(path || "root");
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 1000);
  };

  // matchesSearch unused, removed

  // Automatically expand if parent or children contains matches
  useEffect(() => {
    if (searchQuery && isCollapsible) {
      const containsMatch = (val: any): boolean => {
        if (typeof val !== "object" || val === null) {
          return String(val).toLowerCase().includes(searchQuery.toLowerCase());
        }
        for (const k in val) {
          if (k.toLowerCase().includes(searchQuery.toLowerCase()) || containsMatch(val[k])) {
            return true;
          }
        }
        return false;
      };
      if (containsMatch(value)) {
        setIsExpanded(true);
      }
    }
  }, [searchQuery, value, isCollapsible]);

  // Highlight search text
  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) return <span>{text}</span>;
    const regex = new RegExp(`(${escapeRegExp(highlight)})`, "gi");
    const parts = text.split(regex);
    return (
      <span>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark key={i} className="bg-yellow-400/30 text-yellow-200 px-0.5 rounded">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  };

  // Render bracket structures
  const renderHeader = () => {
    const keyLabel = typeof name === "string" ? `"${name}"` : name;
    
    return (
      <div className="group/node inline-flex items-center gap-1.5 py-0.5 hover:bg-muted/30 px-1 rounded transition-colors w-full">
        {isCollapsible ? (
          <button 
            onClick={toggleExpand}
            className="p-0.5 hover:bg-muted rounded text-muted-foreground transition-colors cursor-pointer"
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="w-5" /> // spacing
        )}

        {/* Key Name */}
        {name !== "root" && (
          <span className="text-purple-600 dark:text-purple-400 font-semibold select-all">
            {highlightText(String(keyLabel), searchQuery)}
            <span className="text-foreground font-normal">: </span>
          </span>
        )}

        {/* Value Details */}
        {isCollapsible ? (
          <span className="text-muted-foreground font-light">
            {isArray ? (
              <span>
                Array[{value.length}]{" "}
                <span className="text-foreground/40 text-[10px]">
                  {isExpanded ? "[" : `[...]${isLast ? "" : ","}`}
                </span>
              </span>
            ) : (
              <span>
                Object{" "}
                <span className="text-foreground/40 text-[10px]">
                  {isExpanded ? "{" : `{...}${isLast ? "" : ","}`}
                </span>
              </span>
            )}
          </span>
        ) : (
          <span className="flex items-center gap-2">
            {renderPrimitiveValue(value, type, isNull)}
            {!isLast && <span className="text-foreground/40">,</span>}
          </span>
        )}

        {/* Quick Action JSON Path Copy */}
        {name !== "root" && (
          <button
            onClick={handleCopyPath}
            title="Copy JSON path"
            className="opacity-0 group-hover/node:opacity-100 p-1 rounded hover:bg-secondary text-[10px] text-muted-foreground hover:text-foreground transition-all flex items-center gap-1 ml-auto cursor-pointer"
          >
            <Copy size={10} />
            <span>{copiedPath ? "Copied!" : "Copy Path"}</span>
          </button>
        )}
      </div>
    );
  };

  const renderPrimitiveValue = (val: any, valType: string, isValNull: boolean) => {
    if (isValNull) {
      return (
        <span className="text-red-500 font-bold select-all">
          {highlightText("null", searchQuery)}
        </span>
      );
    }

    switch (valType) {
      case "string":
        return (
          <span className="text-emerald-600 dark:text-emerald-400 select-all break-all">
            "{highlightText(val, searchQuery)}"
          </span>
        );
      case "number":
        return (
          <span className="text-blue-600 dark:text-sky-400 font-semibold select-all">
            {highlightText(String(val), searchQuery)}
          </span>
        );
      case "boolean":
        return (
          <span className="text-yellow-600 dark:text-amber-400 font-medium select-all">
            {highlightText(String(val), searchQuery)}
          </span>
        );
      default:
        return <span className="select-all">{highlightText(String(val), searchQuery)}</span>;
    }
  };

  return (
    <div className="pl-2">
      {renderHeader()}
      {isCollapsible && isExpanded && (
        <div className="border-l border-border/40 ml-[10px] pl-3 my-0.5">
          {isArray ? (
            (value as any[]).map((item, idx) => {
              const childPath = `${path}[${idx}]`;
              return (
                <TreeNode
                  key={idx}
                  name={idx}
                  value={item}
                  path={childPath}
                  searchQuery={searchQuery}
                  expandAll={expandAll}
                  collapseAll={collapseAll}
                  isLast={idx === value.length - 1}
                />
              );
            })
          ) : (
            Object.keys(value).map((key, idx, keysArray) => {
              const childPath = path ? `${path}.${key}` : key;
              return (
                <TreeNode
                  key={key}
                  name={key}
                  value={value[key]}
                  path={childPath}
                  searchQuery={searchQuery}
                  expandAll={expandAll}
                  collapseAll={collapseAll}
                  isLast={idx === keysArray.length - 1}
                />
              );
            })
          )}
        </div>
      )}
      {isCollapsible && isExpanded && (
        <div className="pl-5 text-foreground/40 text-[10px]">
          {isArray ? `]${isLast ? "" : ","}` : `}${isLast ? "" : ","}`}
        </div>
      )}
    </div>
  );
};
