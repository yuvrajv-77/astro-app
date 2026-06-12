import React, { useState, useEffect } from "react";
import { ChevronRight, ChevronDown, Copy, Eye, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface TreeViewProps {
  data: any;
  searchQuery?: string;
  expandAll?: boolean;
  collapseAll?: boolean;
  showBadges?: boolean;
}

export const JSONTreeView: React.FC<TreeViewProps> = ({
  data,
  searchQuery = "",
  expandAll = false,
  collapseAll = false,
  showBadges = true,
}) => {
  const [hoveredPath, setHoveredPath] = useState<string>("");
  const [copiedSegment, setCopiedSegment] = useState<string | null>(null);

  const handleCopySegment = (pathSegment: string) => {
    navigator.clipboard.writeText(pathSegment);
    setCopiedSegment(pathSegment);
    setTimeout(() => setCopiedSegment(null), 1200);
  };

  const renderBreadcrumbs = () => {
    if (!hoveredPath) {
      return (
        <span className="text-muted-foreground/40 italic select-none">
          Hover over nodes to inspect JSON path...
        </span>
      );
    }

    const parts: { name: string; fullPath: string }[] = [];
    let currentPath = "";
    
    // Parse using regex to split by '.' or '[index]'
    const regex = /([^.\[\]]+|\[\d+\])/g;
    const matches = hoveredPath.match(regex);
    
    if (matches) {
      matches.forEach((token, index) => {
        if (index === 0) {
          currentPath = token;
        } else if (token.startsWith("[")) {
          currentPath += token;
        } else {
          currentPath += `.${token}`;
        }
        parts.push({
          name: token,
          fullPath: currentPath === "root" ? "root" : currentPath.replace(/^root\./, ""),
        });
      });
    }

    return (
      <div className="flex items-center gap-1 flex-wrap">
        {parts.map((part, index) => (
          <React.Fragment key={index}>
            {index > 0 && <span className="text-muted-foreground/35 select-none">›</span>}
            <button
              onClick={() => handleCopySegment(part.fullPath)}
              className={cn(
                "hover:text-primary hover:underline transition-colors px-1 py-0.5 rounded cursor-pointer max-w-[120px] truncate",
                copiedSegment === part.fullPath
                  ? "text-emerald-500 font-bold bg-emerald-500/10 text-[10px]"
                  : "text-muted-foreground hover:bg-secondary/45"
              )}
              title={`Click to copy path: ${part.fullPath}`}
            >
              {part.name}
            </button>
          </React.Fragment>
        ))}
        {copiedSegment && (
          <span className="text-[9px] text-emerald-400 ml-2 animate-in fade-in select-none font-sans font-semibold">
            Copied!
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full relative" onMouseLeave={() => setHoveredPath("")}>
      {/* Scrollable Tree Area */}
      <div className="flex-1 overflow-y-auto select-text p-4 leading-relaxed font-mono text-xs min-h-0">
        <TreeNode
          name="root"
          value={data}
          path=""
          searchQuery={searchQuery}
          expandAll={expandAll}
          collapseAll={collapseAll}
          isLast={true}
          onHover={setHoveredPath}
          showBadges={showBadges}
        />
      </div>

      {/* Sticky Interactive Breadcrumbs Status Bar */}
      <div className="sticky bottom-0 left-0 right-0 border-t border-border bg-card px-3.5 py-1.5 h-8 flex items-center justify-between text-[10px] font-mono shrink-0 select-text z-10">
        <div className="flex-1 overflow-x-auto no-scrollbar scroll-smooth">
          {renderBreadcrumbs()}
        </div>
      </div>
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
  onHover: (path: string) => void;
  showBadges?: boolean;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  name,
  value,
  path,
  searchQuery,
  expandAll,
  collapseAll,
  isLast,
  onHover,
  showBadges = true,
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
    const cleanPath = path || "root";
    const userPath = cleanPath === "root" ? "root" : cleanPath.replace(/^root\./, "");
    navigator.clipboard.writeText(userPath);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 1000);
  };

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

  const renderTypeBadge = (t: string, isValNull: boolean) => {
    let label = t;
    let badgeClass = "";
    
    if (isValNull) {
      label = "null";
      badgeClass = "bg-red-500/10 text-red-500 border-red-500/20";
    } else if (isArray) {
      label = "array";
      badgeClass = "bg-indigo-500/10 text-indigo-500 border-indigo-500/20";
    } else if (isObject) {
      label = "object";
      badgeClass = "bg-purple-500/10 text-purple-500 dark:text-purple-400 border-purple-500/20";
    } else {
      switch (t) {
        case "string":
          label = "str";
          badgeClass = "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
          break;
        case "number":
          label = "num";
          badgeClass = "bg-blue-500/10 text-blue-500 dark:text-sky-400 border-blue-500/20";
          break;
        case "boolean":
          label = "bool";
          badgeClass = "bg-amber-500/10 text-amber-500 border-amber-500/20";
          break;
        default:
          badgeClass = "bg-muted text-muted-foreground border-border";
      }
    }

    return (
      <span className={cn("text-[9.5px] font-sans font-medium px-1.5 py-0.5 rounded border uppercase tracking-wider inline-block select-none", badgeClass)}>
        {label}
      </span>
    );
  };

  // Render bracket structures
  const renderHeader = () => {
    const keyLabel = typeof name === "string" ? `"${name}"` : name;
    
    const handleMouseEnter = (e: React.MouseEvent) => {
      e.stopPropagation();
      onHover(path || "root");
    };

    return (
      <div 
        onMouseEnter={handleMouseEnter}
        className="group/node inline-flex items-center gap-1.5 py-0.5 hover:bg-muted/30 px-1 rounded transition-colors w-full"
      >
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

        {/* Type Badge */}
        {showBadges && renderTypeBadge(type, isNull)}

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
      case "string": {
        const valStr = String(val);
        const isLink = valStr.startsWith("http://") || valStr.startsWith("https://");
        if (isLink) {
          const isImage = /\.(jpeg|jpg|gif|png|webp|svg|bmp)(?:\?.*)?$/i.test(valStr);
          return (
            <StringLink
              val={valStr}
              isImage={isImage}
              searchQuery={searchQuery}
              highlightText={highlightText}
            />
          );
        }
        return (
          <span className="text-emerald-600 dark:text-emerald-400 select-all break-all">
            "{highlightText(valStr, searchQuery)}"
          </span>
        );
      }
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
                  onHover={onHover}
                  showBadges={showBadges}
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
                  onHover={onHover}
                  showBadges={showBadges}
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

// Clickable link and hover preview component
interface StringLinkProps {
  val: string;
  isImage: boolean;
  searchQuery: string;
  highlightText: (text: string, highlight: string) => React.ReactNode;
}

const StringLink: React.FC<StringLinkProps> = ({ val, isImage, searchQuery, highlightText }) => {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <span className="inline-flex items-center gap-1.5 relative group/link select-all">
      <a
        href={val}
        target="_blank"
        rel="noopener noreferrer"
        className="text-emerald-600 dark:text-emerald-400 hover:text-primary dark:hover:text-primary underline cursor-pointer break-all transition-colors"
      >
        "{highlightText(val, searchQuery)}"
      </a>
      
      {isImage ? (
        <span className="relative inline-flex items-center">
          <button
            onMouseEnter={() => setShowPreview(true)}
            onMouseLeave={() => setShowPreview(false)}
            className="p-0.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            aria-label="Preview image"
          >
            <Eye size={11} />
          </button>
          
          {showPreview && (
            <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-popover border border-border rounded-lg shadow-xl animate-in fade-in zoom-in-95 duration-150 max-w-[200px] pointer-events-none">
              <img
                src={val}
                alt="Preview"
                className="max-h-[140px] max-w-[180px] object-contain rounded border border-border bg-secondary/35"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
              <div className="text-[8px] text-muted-foreground text-center mt-1 truncate max-w-[160px]">
                {val.split("/").pop() || "Image Preview"}
              </div>
            </div>
          )}
        </span>
      ) : (
        <a
          href={val}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground p-0.5 hover:bg-secondary rounded transition-colors inline-flex items-center"
          title="Open link in new tab"
        >
          <ExternalLink size={10} />
        </a>
      )}
    </span>
  );
};
