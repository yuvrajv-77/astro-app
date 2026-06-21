export interface SemanticDiff {
  path: string;
  type: "added" | "removed" | "modified";
  message: string;
  leftValue?: unknown;
  rightValue?: unknown;
}

/**
 * Recursively compares two objects and generates a list of semantic differences.
 */
export function compareObjects(left: unknown, right: unknown, path: string = ""): SemanticDiff[] {
  const diffs: SemanticDiff[] = [];

  if (left === right) return diffs;

  const typeLeft = typeof left;
  const typeRight = typeof right;

  if (left === null || right === null || typeLeft !== "object" || typeRight !== "object") {
    diffs.push({
      path,
      type: "modified",
      message: `Value changed from ${JSON.stringify(left)} to ${JSON.stringify(right)}`,
      leftValue: left,
      rightValue: right
    });
    return diffs;
  }

  const isArrayLeft = Array.isArray(left);
  const isArrayRight = Array.isArray(right);

  if (isArrayLeft !== isArrayRight) {
    diffs.push({
      path,
      type: "modified",
      message: `Type changed from ${isArrayLeft ? "array" : "object"} to ${isArrayRight ? "array" : "object"}`,
      leftValue: left,
      rightValue: right
    });
    return diffs;
  }

  if (isArrayLeft && isArrayRight) {
    const maxLen = Math.max(left.length, right.length);
    for (let idx = 0; idx < maxLen; idx++) {
      const itemPath = `${path}[${idx}]`;
      if (idx >= left.length) {
        diffs.push({
          path: itemPath,
          type: "added",
          message: `Added array item at index ${idx}`,
          rightValue: right[idx]
        });
      } else if (idx >= right.length) {
        diffs.push({
          path: itemPath,
          type: "removed",
          message: `Removed array item at index ${idx}`,
          leftValue: left[idx]
        });
      } else {
        diffs.push(...compareObjects(left[idx], right[idx], itemPath));
      }
    }
    return diffs;
  }

  // It's an object comparison
  const leftObj = left as Record<string, unknown>;
  const rightObj = right as Record<string, unknown>;

  const leftKeys = Object.keys(leftObj);
  const rightKeys = Object.keys(rightObj);
  const allKeys = Array.from(new Set([...leftKeys, ...rightKeys]));

  for (const key of allKeys) {
    const itemPath = path ? `${path}.${key}` : key;
    const hasLeft = key in leftObj;
    const hasRight = key in rightObj;

    if (hasLeft && !hasRight) {
      diffs.push({
        path: itemPath,
        type: "removed",
        message: `Property '${key}' was removed`,
        leftValue: leftObj[key]
      });
    } else if (!hasLeft && hasRight) {
      diffs.push({
        path: itemPath,
        type: "added",
        message: `Property '${key}' was added`,
        rightValue: rightObj[key]
      });
    } else {
      diffs.push(...compareObjects(leftObj[key], rightObj[key], itemPath));
    }
  }

  return diffs;
}

/**
 * Parses a prettified JSON string line-by-line using indentation stacks
 * to map JSON paths to their exact line numbers.
 */
export function mapPathsToLines(text: string, indentSize: number = 2): Map<string, number> {
  const pathMap = new Map<string, number>();
  const lines = text.split("\n");
  const stack: string[] = [];
  const arrayIndices: number[] = [];

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Calculate indent level
    let indent = 0;
    for (let c = 0; c < line.length; c++) {
      if (line[c] === " ") indent++;
      else if (line[c] === "\t") indent += indentSize;
      else break;
    }
    const level = Math.floor(indent / indentSize);

    // Pop stack to match level
    while (stack.length > level) {
      stack.pop();
      arrayIndices.pop();
    }

    // Check if closing brace/bracket
    if (trimmed.startsWith("}") || trimmed.startsWith("]")) {
      continue;
    }

    // Check if key line: e.g. "key": value or "key": {
    const keyMatch = trimmed.match(/"([^"]+)"\s*:/);
    if (keyMatch) {
      const key = keyMatch[1];
      stack[level] = key;
      arrayIndices[level] = -1; // Reset array index since this is an object key

      const currentPath = stack.slice(0, level + 1).join(".");
      pathMap.set(currentPath, idx + 1); // 1-indexed line number
    } else {
      // This is a value or array item
      const parentLevel = level - 1;
      if (parentLevel >= 0 && arrayIndices[parentLevel] !== undefined) {
        arrayIndices[parentLevel] = (arrayIndices[parentLevel] ?? -1) + 1;
        const index = arrayIndices[parentLevel];
        
        const parentPath = stack.slice(0, parentLevel + 1).join(".");
        const currentPath = `${parentPath}[${index}]`;
        pathMap.set(currentPath, idx + 1);

        stack[level] = `[${index}]`;
      }
    }

    // Check if this line starts an array
    if (trimmed.endsWith("[") || trimmed.endsWith("[,") || trimmed.includes(": [")) {
      arrayIndices[level] = -1; // Ready to count array items at next level
    }
  }

  return pathMap;
}
