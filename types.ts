export type Alignment = 'left' | 'center' | 'right';
export type FontSize = 'normal' | 'large'; // 0x00 vs 0x01 (Double W/H implied)

export interface TicketElement {
  id: string;
  type: 'text' | 'image' | 'spacing';
  content: string; // Text content or Base64 image
  align: Alignment;
  isBold: boolean;
  size: FontSize;
  spacingHeight?: number; // For spacing elements
  variableName?: string; // If this represents a purely dynamic variable
}

export interface TicketProject {
  name: string;
  width: number;
  elements: TicketElement[];
  variables?: Record<string, string>;
}

export const DEFAULT_WIDTH = 576; // Standard 80mm thermal printer width in dots often around 576