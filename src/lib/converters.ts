/**
 * offline-first client-side JSON converters.
 */

/**
 * Converts any JS value/JSON object to a formatted XML string.
 */
export function jsonToXml(obj: any, indent: string = "  "): string {
  const formatXml = (val: any, nodeName: string, level: number): string => {
    const spacer = indent.repeat(level);
    if (val === null) {
      return `${spacer}<${nodeName} nil="true" />`;
    }
    if (Array.isArray(val)) {
      return val.map(item => formatXml(item, nodeName, level)).join("\n");
    }
    if (typeof val === "object") {
      const children = Object.entries(val)
        .map(([k, v]) => {
          // Sanitize key names for valid XML tags
          const xmlKey = k
            .replace(/[^a-zA-Z0-9_-]/g, "_")
            .replace(/^[^a-zA-Z]/, "item_$1");
          return formatXml(v, xmlKey || "item", level + 1);
        })
        .filter(Boolean)
        .join("\n");
      
      if (!children) {
        return `${spacer}<${nodeName} />`;
      }
      return `${spacer}<${nodeName}>\n${children}\n${spacer}</${nodeName}>`;
    }
    // Escape XML special characters
    const escapedStr = String(val)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
    return `${spacer}<${nodeName}>${escapedStr}</${nodeName}>`;
  };

  return `<?xml version="1.0" encoding="UTF-8"?>\n<root>\n${formatXml(obj, "row", 1)}\n</root>`;
}

/**
 * Converts a JSON array of objects to CSV.
 * Flattens nested object structures into dotted notation headers.
 */
export function jsonToCsv(obj: any): string {
  let array: any[] = [];
  if (Array.isArray(obj)) {
    array = obj;
  } else if (typeof obj === "object" && obj !== null) {
    array = [obj];
  } else {
    return "Error: Input must be a valid JSON array or object.";
  }

  if (array.length === 0) {
    return "";
  }

  // Recursive object flattener
  const flattenObject = (ob: any): any => {
    const toReturn: any = {};
    for (const i in ob) {
      if (!Object.prototype.hasOwnProperty.call(ob, i)) continue;
      
      if (typeof ob[i] === "object" && ob[i] !== null && !Array.isArray(ob[i])) {
        const flatObject = flattenObject(ob[i]);
        for (const x in flatObject) {
          if (!Object.prototype.hasOwnProperty.call(flatObject, x)) continue;
          toReturn[i + "." + x] = flatObject[x];
        }
      } else if (Array.isArray(ob[i])) {
        toReturn[i] = JSON.stringify(ob[i]);
      } else {
        toReturn[i] = ob[i];
      }
    }
    return toReturn;
  };

  const flatArray = array.map(item => 
    (typeof item === "object" && item !== null) ? flattenObject(item) : { value: item }
  );

  // Extract all unique headers across all objects
  const headers = Array.from(
    new Set(flatArray.reduce((acc: string[], cur) => acc.concat(Object.keys(cur)), []))
  );

  const escapeCsvValue = (val: any): string => {
    if (val === null || val === undefined) return "";
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvRows = [];
  
  // Header row
  csvRows.push(headers.map(escapeCsvValue).join(","));
  
  // Data rows
  for (const row of flatArray) {
    const values = headers.map(header => escapeCsvValue(row[header]));
    csvRows.push(values.join(","));
  }

  return csvRows.join("\n");
}

/**
 * Converts a JSON object/value into formatted YAML.
 */
export function jsonToYaml(obj: any, indentSize: number = 2): string {
  const formatYaml = (val: any, level: number, isArrayItem: boolean = false): string => {
    const spacer = " ".repeat(level * indentSize);
    
    if (val === null) {
      return "null";
    }
    if (val === undefined) {
      return "";
    }
        if (Array.isArray(val)) {
      if (val.length === 0) return "[]";
      const items = val.map((item) => {
        const prefix = spacer + "- ";
        if (typeof item === "object" && item !== null) {
          const itemStr = formatYaml(item, level + 1, true);
          return prefix + itemStr.trimStart();
        } else {
          return prefix + formatYaml(item, 0);
        }
      });
      return (isArrayItem ? "\n" : "") + items.join("\n");
    }
    if (typeof val === "object") {
      const keys = Object.keys(val);
      if (keys.length === 0) return "{}";
      const entries = keys.map(k => {
        const safeKey = /^[a-zA-Z0-9_-]+$/.test(k) ? k : `"${k.replace(/"/g, '\\"')}"`;
        const v = val[k];
        const valStr = formatYaml(v, level + 1);
        const keyPrefix = spacer + safeKey + ":";
        
        if (typeof v === "object" && v !== null && !Array.isArray(v)) {
          return `${keyPrefix}\n${valStr}`;
        }
        if (Array.isArray(v) && v.length > 0) {
          return `${keyPrefix}${valStr}`;
        }
        return `${keyPrefix} ${valStr}`;
      });
      return (isArrayItem && level > 0 ? "\n" : "") + entries.join("\n");
    }
    if (typeof val === "string") {
      if (val.includes("\n")) {
        const indentedLines = val
          .split("\n")
          .map(l => " ".repeat((level + 1) * indentSize) + l)
          .join("\n");
        return `|\n${indentedLines}`;
      }
      if (val === "" || /[\s:#[\]{}|>&*!%@`]/.test(val) || val === "true" || val === "false" || val === "null") {
        return `"${val.replace(/"/g, '\\"')}"`;
      }
      return val;
    }
    return String(val);
  };

  return formatYaml(obj, 0);
}

/**
 * Converts a JSON value/object to a TypeScript interface string.
 */
export function jsonToTypescript(obj: unknown, interfaceName: string = "RootObject"): string {
  const types = new Map<string, string>();

  const toPascalCase = (str: string): string => {
    return str
      .replace(/[^a-zA-Z0-9]/g, "_")
      .replace(/(^\w|_\w)/g, (m) => m.replace("_", "").toUpperCase());
  };

  const generateType = (val: unknown, name: string): string => {
    if (val === null) return "null";
    if (val === undefined) return "undefined";
    
    if (Array.isArray(val)) {
      if (val.length === 0) return "unknown[]";
      const itemTypes = Array.from(new Set(val.map(item => typeof item)));
      if (itemTypes.length === 1) {
        const type = itemTypes[0];
        if (type === "object") {
          const subName = toPascalCase(name) + "Item";
          generateType(val[0], subName);
          return `${subName}[]`;
        }
        return `${type}[]`;
      }
      return "unknown[]";
    }

    if (typeof val === "object") {
      const subInterfaceName = toPascalCase(name);
      let subInterface = `interface ${subInterfaceName} {\n`;
      const record = val as Record<string, unknown>;
      for (const [key, value] of Object.entries(record)) {
        const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `"${key}"`;
        const propType = generateType(value, key);
        subInterface += `  ${safeKey}: ${propType};\n`;
      }
      subInterface += "}";
      types.set(subInterfaceName, subInterface);
      return subInterfaceName;
    }

    return typeof val;
  };

  generateType(obj, interfaceName);

  return Array.from(types.values()).join("\n\n");
}

