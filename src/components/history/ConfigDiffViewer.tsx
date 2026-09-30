'use client';

import React from 'react';

interface ConfigDiffViewerProps {
  oldText: string;
  newText: string;
}

export const ConfigDiffViewer: React.FC<ConfigDiffViewerProps> = ({ oldText, newText }) => {
  const oldLines = oldText ? oldText.split('\n') : [];
  const newLines = newText ? newText.split('\n') : [];
  const oldSet = new Set(oldLines.map((l) => l.trim()));
  const newSet = new Set(newLines.map((l) => l.trim()));
  const result: React.ReactNode[] = [];

  oldLines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed && !newSet.has(trimmed)) {
      result.push(
        <span key={`del-${idx}`} className="history-diff-line-removed">
          - {line}
        </span>
      );
    }
  });

  newLines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed && !oldSet.has(trimmed)) {
      result.push(
        <span key={`add-${idx}`} className="history-diff-line-added">
          + {line}
        </span>
      );
    } else if (trimmed.startsWith('config ') || trimmed.startsWith('option name')) {
      result.push(
        <span key={`ctx-${idx}`} className="history-diff-line-same">
          &nbsp;&nbsp;{line}
        </span>
      );
    }
  });

  if (result.length === 0) {
    return (
      <div style={{ padding: '1.5rem', color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.85rem' }}>
        Identical configuration content (no rule changes detected between releases)
      </div>
    );
  }

  return <pre className="history-code-pre">{result}</pre>;
};
