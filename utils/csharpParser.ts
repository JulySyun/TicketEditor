import { TicketElement, Alignment, FontSize } from '../types';

export const parseCSharp = (code: string): TicketElement[] => {
  const elements: TicketElement[] = [];
  const lines = code.split('\n');

  // Virtual Printer State
  let currentAlign: Alignment = 'left';
  let currentBold = false;
  let currentSize: FontSize = 'normal';

  // Helper to create ID
  const uuid = () => Math.random().toString(36).substr(2, 9);

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed === '') continue;

    // Parse BinaryOut calls
    if (trimmed.includes('BinaryOut')) {
      // 1. Alignment: 0x1B, 0x61, n
      if (trimmed.includes('0x1B, 0x61')) {
        if (trimmed.includes('1') || trimmed.includes('0x01')) currentAlign = 'center';
        else if (trimmed.includes('2') || trimmed.includes('0x02')) currentAlign = 'right';
        else currentAlign = 'left';
      }

      // 2. Bold: 0x1B, 0x45, n
      if (trimmed.includes('0x1B, 0x45')) {
        if (trimmed.includes('1') || trimmed.includes('0x01')) currentBold = true;
        else currentBold = false;
      }

      // 3. Spacing: 0x1B, 0x4A, n
      const spacingMatch = /0x1B,\s*0x4A,\s*(\d+|0x[0-9A-Fa-f]+)/.exec(trimmed);
      if (spacingMatch) {
        const val = spacingMatch[1].startsWith('0x') ? parseInt(spacingMatch[1], 16) : parseInt(spacingMatch[1], 10);
        elements.push({
          id: uuid(),
          type: 'spacing',
          content: '',
          align: currentAlign,
          isBold: currentBold,
          size: currentSize,
          spacingHeight: val
        });
      }

      // 4. Size & Text combination: 0x1D, 0x21, n, BIG5.GetBytes(...)
      // Example: BinaryOut(0x1D, 0x21, 0x01, BIG5.GetBytes(...));
      const complexTextMatch = /BinaryOut\(\s*0x1D,\s*0x21,\s*(0x[0-9A-Fa-f]+|\d+),\s*BIG5\.GetBytes\(\s*(?:\$)?\"((?:[^"\\]|\\.)*)\"\s*\)\)/.exec(trimmed);
      
      if (complexTextMatch) {
         const sizeVal = complexTextMatch[1].startsWith('0x') ? parseInt(complexTextMatch[1], 16) : parseInt(complexTextMatch[1], 10);
         const size: FontSize = sizeVal === 1 ? 'large' : 'normal';
         
         let content = complexTextMatch[2];
         content = content.replace(/\\n/g, '\n');
         
         elements.push({
          id: uuid(),
          type: 'text',
          content: content,
          align: currentAlign,
          isBold: currentBold,
          size: size
        });
        currentSize = size; // Update state
        continue; // Skip standard text check
      }

      // Standalone Size Command
      if (trimmed.includes('0x1D, 0x21')) {
         const sizeMatch = /0x1D,\s*0x21,\s*(0x[0-9A-Fa-f]+|\d+)(?!\s*,)/.exec(trimmed);
         if (sizeMatch) {
            const val = sizeMatch[1].startsWith('0x') ? parseInt(sizeMatch[1], 16) : parseInt(sizeMatch[1], 10);
            currentSize = val === 1 ? 'large' : 'normal';
         }
      }

      // 5. Standard Text Content: BIG5.GetBytes(...)
      const textMatch = /BIG5\.GetBytes\(\s*(?:\$)?\"((?:[^"\\]|\\.)*)\"\s*\)/.exec(trimmed);
      if (textMatch && !complexTextMatch) {
        let content = textMatch[1];
        // Unescape newlines
        content = content.replace(/\\n/g, '\n'); 
        
        elements.push({
          id: uuid(),
          type: 'text',
          content: content,
          align: currentAlign,
          isBold: currentBold,
          size: currentSize
        });
      }

      // 6. Image Loading: File.ReadAllBytes(...)
      if (trimmed.includes('File.ReadAllBytes')) {
        const fileMatch = /Path.Combine\(.*,\s*"([^"]+)"\)/.exec(trimmed);
        const fileName = fileMatch ? fileMatch[1] : "image.bin";
        elements.push({
          id: uuid(),
          type: 'image',
          content: '', 
          variableName: fileName,
          align: currentAlign,
          isBold: false,
          size: 'normal'
        });
      }
    }
  }

  return elements;
};