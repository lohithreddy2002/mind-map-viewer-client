import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Transformer } from 'markmap-lib';
import { Markmap } from 'markmap-view';
import * as d3 from 'd3';
import MarkmapToolbar from './MarkmapToolbar';
import ErrorBoundary from './ErrorBoundary';

/**
 * Props for the MarkmapViewer component
 */
interface MarkmapViewerProps {
  /** The markdown content to render as a mindmap */
  markdown: string;
  /** The theme of the mindmap. Defaults to 'light' */
  theme?: 'light' | 'dark';
  /** Minimum height of each node in pixels. Defaults to 16 */
  nodeMinHeight?: number;
  /** Vertical spacing between nodes in pixels. Defaults to 5 */
  spacingVertical?: number;
  /** Horizontal spacing between nodes in pixels. Defaults to 80 */
  spacingHorizontal?: number;
  /** Horizontal padding within nodes in pixels. Defaults to 8 */
  paddingX?: number;
  /** Initial expand level for nodes. -1 means expand all. Defaults to -1 */
  initialExpandLevel?: number;
  /** Animation duration in milliseconds. Defaults to 500 */
  duration?: number;
  /** Maximum width of nodes in pixels. 0 means no limit. Defaults to 0 */
  maxWidth?: number;
  /** Whether to enable zoom functionality. Defaults to true */
  zoom?: boolean;
  /** Whether to enable pan functionality. Defaults to true */
  pan?: boolean;
  /** Whether to automatically fit the map to the screen. Defaults to true */
  autoFit?: boolean;
  /** The title of the current topic for naming downloads */
  topicTitle?: string;
}

// Validation functions
const validatePositiveNumber = (value: number, name: string): void => {
  if (value < 0) {
    console.warn(`${name} should be a positive number, got ${value}`);
  }
};

const DEFAULT_ZOOM_SCALE = 1;
const ZOOM_FACTOR = 1.1;

const MarkmapViewer: React.FC<MarkmapViewerProps> = ({
  markdown,
  theme = 'light',
  nodeMinHeight = 16,
  spacingVertical = 5,
  spacingHorizontal = 80,
  paddingX = 8,
  initialExpandLevel = -1,
  duration = 500,
  maxWidth = 0,
  zoom = true,
  pan = true,
  autoFit = true,
  topicTitle,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const svgRef = useRef<HTMLDivElement>(null);
  const markmapRef = useRef<Markmap | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const fitTimeoutRef = useRef<number | null>(null);

  // Validate props
  useEffect(() => {
    validatePositiveNumber(nodeMinHeight, 'nodeMinHeight');
    validatePositiveNumber(spacingVertical, 'spacingVertical');
    validatePositiveNumber(spacingHorizontal, 'spacingHorizontal');
    validatePositiveNumber(paddingX, 'paddingX');
    validatePositiveNumber(duration, 'duration');
    if (maxWidth < 0) {
      console.warn(`maxWidth should be 0 or positive, got ${maxWidth}`);
    }
    if (initialExpandLevel < -1) {
      console.warn(`initialExpandLevel should be -1 or greater, got ${initialExpandLevel}`);
    }
  }, [nodeMinHeight, spacingVertical, spacingHorizontal, paddingX, duration, maxWidth, initialExpandLevel]);

  const getZoomScale = useCallback(() => {
    const svg = svgRef.current?.querySelector('svg');
    if (!svg) return DEFAULT_ZOOM_SCALE;
    
    const transform = d3.zoomTransform(svg as Element);
    return transform.k;
  }, []);

  const setZoomScale = useCallback((scale: number) => {
    const svg = svgRef.current?.querySelector('svg');
    if (!svg || !zoomBehaviorRef.current) return;

    const currentTransform = d3.zoomTransform(svg as Element);
    const newTransform = d3.zoomIdentity
      .translate(currentTransform.x, currentTransform.y)
      .scale(scale);

    d3.select(svg as SVGSVGElement)
      .transition()
      .duration(duration)
      .call(zoomBehaviorRef.current.transform as any, newTransform);
  }, [duration]);

  const handleZoom = useCallback((e: WheelEvent) => {
    if (!zoom) return;
    e.preventDefault();
    const { deltaY } = e;
    const currentScale = getZoomScale();
    const newScale = deltaY < 0 ? currentScale * ZOOM_FACTOR : currentScale / ZOOM_FACTOR;
    setZoomScale(newScale);
  }, [zoom, getZoomScale, setZoomScale]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!markmapRef.current) return;
    
    if (e.ctrlKey) {
      switch (e.key) {
        case '=':
        case '+':
          e.preventDefault();
          const currentScale = getZoomScale();
          setZoomScale(currentScale * ZOOM_FACTOR);
          break;
        case '-':
          e.preventDefault();
          const currentScale2 = getZoomScale();
          setZoomScale(currentScale2 / ZOOM_FACTOR);
          break;
        case '0':
          e.preventDefault();
          markmapRef.current.fit();
          break;
      }
    }
  }, [getZoomScale, setZoomScale]);

  const handleExport = useCallback(() => {
    if (!svgRef.current || !markmapRef.current) return;
    
    const svg = svgRef.current.querySelector('svg');
    if (!svg) return;
    
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = topicTitle ? `${topicTitle}.svg` : 'mindmap.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [topicTitle]);

  // Function to fit the map to the screen
  const fitMapToScreen = useCallback(() => {
    if (markmapRef.current) {
      console.log('Fitting map to screen');
      markmapRef.current.fit();
    }
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;

    setIsLoading(true);
    try {
      // Initialize markmap
      const transformer = new Transformer();
      const { root } = transformer.transform(markdown);
      
      // Create SVG element if it doesn't exist
      if (!svgRef.current.querySelector('svg')) {
        const svg = d3.select(svgRef.current)
          .append('svg')
          .attr('width', '100%')
          .attr('height', '100%')
          .style('background', theme === 'light' ? '#fff' : '#1a1a1a');

        // Initialize zoom behavior
        if (zoom) {
          zoomBehaviorRef.current = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 5])
            .on('zoom', (event) => {
              svg.select('g').attr('transform', event.transform.toString());
            });
          
          svg.call(zoomBehaviorRef.current as any);
        }
      }

      // Get the SVG element
      const svg = svgRef.current.querySelector('svg');
      if (!svg) throw new Error('SVG element not found');

      // Initialize markmap with configuration
      markmapRef.current = Markmap.create(svg, {
        id: 'markmap',
        duration,
        nodeMinHeight,
        spacingVertical,
        spacingHorizontal,
        paddingX,
        initialExpandLevel,
        maxWidth,
        zoom,
        pan,
        style: {
          nodeFont: '16px',
          nodeColor: theme === 'light' ? '#333' : '#fff',
          linkColor: theme === 'light' ? '#999' : '#666',
          nodeBackground: theme === 'light' ? '#fff' : '#1a1a1a',
        },
      });

      // Set data
      markmapRef.current.setData(root);
      
      // Schedule a delayed fit to ensure the DOM is fully rendered
      if (autoFit) {
        // Clear any existing timeout
        if (fitTimeoutRef.current !== null) {
          window.clearTimeout(fitTimeoutRef.current);
        }
        
        // Set a new timeout to fit the map after a delay
        fitTimeoutRef.current = window.setTimeout(() => {
          fitMapToScreen();
          fitTimeoutRef.current = null;
        }, 300);
      }
    } catch (error) {
      console.error('Error initializing markmap:', error);
    } finally {
      setIsLoading(false);
    }

    // Add event listeners
    if (zoom) {
      containerRef.current?.addEventListener('wheel', handleZoom);
    }
    window.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      if (markmapRef.current) {
        markmapRef.current.destroy();
      }
      if (zoom) {
        containerRef.current?.removeEventListener('wheel', handleZoom);
      }
      window.removeEventListener('keydown', handleKeyDown);
      
      // Clear any pending timeouts
      if (fitTimeoutRef.current !== null) {
        window.clearTimeout(fitTimeoutRef.current);
      }
    };
  }, [markdown, theme, nodeMinHeight, spacingVertical, spacingHorizontal, paddingX, initialExpandLevel, duration, maxWidth, zoom, pan, handleZoom, handleKeyDown, autoFit, fitMapToScreen]);

  // Add resize handler to fit the map when window is resized
  useEffect(() => {
    if (!autoFit) return;
    
    const handleResize = () => {
      // Only fit after resize is complete (debounce)
      if (fitTimeoutRef.current !== null) {
        window.clearTimeout(fitTimeoutRef.current);
      }
      
      fitTimeoutRef.current = window.setTimeout(() => {
        fitMapToScreen();
        fitTimeoutRef.current = null;
      }, 300);
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (fitTimeoutRef.current !== null) {
        window.clearTimeout(fitTimeoutRef.current);
      }
    };
  }, [autoFit, fitMapToScreen]);

  const handleZoomIn = useCallback(() => {
    const currentScale = getZoomScale();
    setZoomScale(currentScale * ZOOM_FACTOR);
  }, [getZoomScale, setZoomScale]);

  const handleZoomOut = useCallback(() => {
    const currentScale = getZoomScale();
    setZoomScale(currentScale / ZOOM_FACTOR);
  }, [getZoomScale, setZoomScale]);

  const handleFit = useCallback(() => {
    fitMapToScreen();
  }, [fitMapToScreen]);

  return (
    <ErrorBoundary>
      <div ref={containerRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
        {isLoading && (
          <div className="markmap-loading">
            <div className="spinner"></div>
            <span>Loading mindmap...</span>
          </div>
        )}
        <MarkmapToolbar
          markmap={markmapRef.current}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onFit={handleFit}
          onExport={handleExport}
        />
        <div ref={svgRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </ErrorBoundary>
  );
};

export default MarkmapViewer; 