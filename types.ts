
export type Alignment = 'left' | 'center' | 'right';
export type FontSize = 'normal' | 'large'; // 0x00 vs 0x01 (Double W/H implied)

export interface TicketElement {
  id: string;
  type: 'text' | 'image' | 'spacing';
  content: string; // Text content OR Base64 Image Data (Data URI scheme)
  align: Alignment;
  isBold: boolean;
  size: FontSize;
  spacingHeight?: number; // For spacing elements
  variableName?: string; // If this represents a purely dynamic variable
}

export interface TicketProject {
  name: string;
  width: number;
  minHeight?: number; // User configurable preview height (legacy support)
  height?: number; // User configurable preview height
  previewOverlayScale?: number; // Affects Visual Preview ONLY
  elements: TicketElement[];
  variables?: Record<string, string>;
}

export const DEFAULT_WIDTH = 270;
export const DEFAULT_HEIGHT = 800;
export const DEFAULT_PREVIEW_OVERLAY_SCALE = 0.775;
