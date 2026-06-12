import React, { useEffect, useState } from "react";
import { Type } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const FontSizeSelector: React.FC = () => {
  const [size, setSize] = useState<string>("ui-fs-md");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedSize = localStorage.getItem("ui-font-size") || "ui-fs-md";
    setSize(savedSize);
  }, []);

  const handleSizeChange = (newSize: string) => {
    setSize(newSize);

    const classes = ["ui-fs-sm", "ui-fs-md", "ui-fs-lg"];
    classes.forEach((c) => document.documentElement.classList.remove(c));
    document.documentElement.classList.add(newSize);

    localStorage.setItem("ui-font-size", newSize);
  };

  if (!mounted) {
    return (
      <div className="flex items-center gap-1.5 select-none">
        <Type className="h-4 w-4 text-muted-foreground/60" />
        <div className="h-7 w-24 bg-secondary/50 rounded border border-border animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 select-none">
      <Type className="h-4 w-4 text-muted-foreground" />
      <Select value={size} onValueChange={handleSizeChange}>
        <SelectTrigger 
          size="sm" 
          className="bg-secondary/60 hover:bg-secondary text-foreground text-[11px] rounded border border-border px-2 font-sans cursor-pointer h-7 w-24 flex items-center justify-between"
        >
          <SelectValue placeholder="Font Size" />
        </SelectTrigger>
        <SelectContent className="bg-popover text-popover-foreground border-border font-sans">
          <SelectItem value="ui-fs-sm">Size: Sm</SelectItem>
          <SelectItem value="ui-fs-md">Size: Md</SelectItem>
          <SelectItem value="ui-fs-lg">Size: Lg</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
