declare module 'markmap-lib' {
  export class Transformer {
    transform(markdown: string): { root: any };
  }
}

declare module 'markmap-view' {
  export interface MarkmapState {
    transform: {
      k: number;
      x: number;
      y: number;
    };
  }

  export interface MarkmapOptions {
    id?: string;
    duration?: number;
    nodeMinHeight?: number;
    spacingVertical?: number;
    spacingHorizontal?: number;
    paddingX?: number;
    initialExpandLevel?: number;
    maxWidth?: number;
    zoom?: boolean;
    pan?: boolean;
    style?: {
      nodeFont?: string;
      nodeColor?: string;
      linkColor?: string;
      nodeBackground?: string;
    };
  }

  export class Markmap {
    state: MarkmapState;
    
    static create(
      svg: SVGElement,
      options?: MarkmapOptions
    ): Markmap;

    setData(data: any): void;
    setZoom(k: number): void;
    fit(): void;
    destroy(): void;
  }
} 