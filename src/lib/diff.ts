export interface DiffLine {
  type: "added" | "removed" | "unchanged";
  value: string;
  originalLineNum?: number;
  modifiedLineNum?: number;
}

/**
 * Computes a line-by-line diff between original and modified strings using LCS.
 * Aligns changes side-by-side by inserting empty spacers.
 */
export function computeDiff(original: string, modified: string): { left: DiffLine[]; right: DiffLine[] } {
  const originalLines = original.split("\n");
  const modifiedLines = modified.split("\n");

  const m = originalLines.length;
  const n = modifiedLines.length;

  // Initialize DP table for LCS
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let idx = 1; idx <= m; idx++) {
    for (let jdx = 1; jdx <= n; jdx++) {
      if (originalLines[idx - 1] === modifiedLines[jdx - 1]) {
        dp[idx][jdx] = dp[idx - 1][jdx - 1] + 1;
      } else {
        dp[idx][jdx] = Math.max(dp[idx - 1][jdx], dp[idx][jdx - 1]);
      }
    }
  }

  const leftDiff: DiffLine[] = [];
  const rightDiff: DiffLine[] = [];

  let idx = m;
  let jdx = n;

  // Backtrack to find the alignments
  while (idx > 0 || jdx > 0) {
    if (idx > 0 && jdx > 0 && originalLines[idx - 1] === modifiedLines[jdx - 1]) {
      const val = originalLines[idx - 1];
      leftDiff.unshift({ type: "unchanged", value: val, originalLineNum: idx });
      rightDiff.unshift({ type: "unchanged", value: val, modifiedLineNum: jdx });
      idx--;
      jdx--;
    } else if (jdx > 0 && (idx === 0 || dp[idx][jdx - 1] >= dp[idx - 1][jdx])) {
      // Line was added in modified
      leftDiff.unshift({ type: "unchanged", value: "", originalLineNum: undefined });
      rightDiff.unshift({ type: "added", value: modifiedLines[jdx - 1], modifiedLineNum: jdx });
      jdx--;
    } else {
      // Line was removed from original
      leftDiff.unshift({ type: "removed", value: originalLines[idx - 1], originalLineNum: idx });
      rightDiff.unshift({ type: "unchanged", value: "", modifiedLineNum: undefined });
      idx--;
    }
  }

  return { left: leftDiff, right: rightDiff };
}
