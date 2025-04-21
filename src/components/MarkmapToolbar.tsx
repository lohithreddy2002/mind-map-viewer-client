import React from 'react';
import { Markmap } from 'markmap-view';

interface MarkmapToolbarProps {
  markmap: Markmap | null;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onExport: () => void;
}

const MarkmapToolbar: React.FC<MarkmapToolbarProps> = ({
  markmap,
  onZoomIn,
  onZoomOut,
  onFit,
  onExport,
}) => {
  return (
    <div className="markmap-toolbar">
      <button
        onClick={onZoomIn}
        title="Zoom In (Ctrl +)"
        disabled={!markmap}
      >
        <svg viewBox="0 0 24 24" width="16" height="16">
          <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
        </svg>
      </button>
      <button
        onClick={onZoomOut}
        title="Zoom Out (Ctrl -)"
        disabled={!markmap}
      >
        <svg viewBox="0 0 24 24" width="16" height="16">
          <path fill="currentColor" d="M19 13H5v-2h14v2z"/>
        </svg>
      </button>
      <button
        onClick={onFit}
        title="Fit to Screen (Ctrl 0)"
        disabled={!markmap}
        className="fit-button"
      >
        <svg viewBox="0 0 24 24" width="16" height="16">
          <path fill="currentColor" d="M3 5v14h18V5H3zm16 12H5V7h14v10z"/>
        </svg>
        <span className="button-text">Fit to Screen</span>
      </button>
      <div className="toolbar-separator" />
      <button
        onClick={onExport}
        title="Export as SVG"
        disabled={!markmap}
      >
        <svg viewBox="0 0 24 24" width="16" height="16">
          <path fill="currentColor" d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
        </svg>
      </button>
    </div>
  );
};

export default MarkmapToolbar; 