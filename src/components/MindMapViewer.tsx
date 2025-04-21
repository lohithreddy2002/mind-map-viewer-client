import React, { useEffect, useRef, useState } from 'react';
import { Transformer } from 'markmap-lib';
import { Markmap } from 'markmap-view';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import * as d3 from 'd3';

interface MindMapViewerProps {
  markdown: string;
}

const MindMapViewer: React.FC<MindMapViewerProps> = ({ markdown }) => {
  const svgRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [markmap, setMarkmap] = useState<Markmap | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    try {
      // Initialize markmap
      const transformer = new Transformer();
      const { root } = transformer.transform(markdown);
      
      // Create SVG element if it doesn't exist
      if (!svgRef.current.querySelector('svg')) {
        const svg = d3.select(svgRef.current).append('svg');
        svg.attr('width', '100%')
           .attr('height', '100%');
      }

      // Get the SVG element
      const svg = svgRef.current.querySelector('svg');
      if (!svg) throw new Error('SVG element not found');

      // Create markmap instance
      const newMarkmap = Markmap.create(svg, {
        duration: 500,
        spacingVertical: 5,
        spacingHorizontal: 80,
        paddingX: 8,
        style: {
          nodeFont: '16px',
        },
      });

      // Set the data
      newMarkmap.setData(root);
      newMarkmap.fit();
      
      setMarkmap(newMarkmap);
      setError(null);
    } catch (error) {
      console.error('Error creating mindmap:', error);
      setError(error instanceof Error ? error : new Error('Unknown error'));
    }

    // Cleanup
    return () => {
      if (markmap) {
        markmap.destroy();
      }
    };
  }, [markdown, markmap]);

  const handleDownload = async () => {
    if (containerRef.current) {
      try {
        const canvas = await html2canvas(containerRef.current);
        canvas.toBlob((blob: Blob | null) => {
          if (blob) {
            saveAs(blob, 'mindmap.png');
          }
        });
      } catch (error) {
        console.error('Error downloading mind map:', error);
        setError(error instanceof Error ? error : new Error('Failed to download mind map'));
      }
    }
  };

  if (error) {
    return (
      <div className="error">
        <h3>Error creating mindmap</h3>
        <pre>{error.message}</pre>
      </div>
    );
  }

  return (
    <div className="mindmap-container">
      <div ref={containerRef}>
        <div ref={svgRef} style={{ width: '100%', height: '100%' }} />
      </div>
      <button onClick={handleDownload} className="download-button">
        Download Mind Map
      </button>
    </div>
  );
};

export default MindMapViewer; 