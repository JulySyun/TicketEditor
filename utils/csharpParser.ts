
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

  // Helper for permissive int parsing (Hex/Dec)
  const parseIntPermissive = (str: string) => {
    const clean = str.trim();
    if (/^0x/i.test(clean)) {
        return parseInt(clean, 16);
    }
    return parseInt(clean, 10);
  };

  for (const rawLine of lines) {
    let line = rawLine.trim();
    if (!line || line.startsWith('//')) continue;

    // Strip inline comments (e.g., "BinaryOut(...); // comment")
    const commentIndex = line.indexOf('//');
    if (commentIndex !== -1) {
        line = line.substring(0, commentIndex).trim();
    }

    // Only process BinaryOut calls
    if (!line.includes('BinaryOut')) continue;

    // --- STRATEGY 1: Simple Command Parsing (Numbers/Hex only) ---
    // This efficiently handles commands like: BinaryOut(0x1B, 0x61, 1);
    // It avoids complex regex issues by extracting the args directly.
    const simpleArgsMatch = /BinaryOut\s*\(([\w\s,x]+)\)/i.exec(line);
    
    if (simpleArgsMatch) {
        const argsStr = simpleArgsMatch[1];
        const args = argsStr.split(',').map(s => s.trim());
        const bytes = args.map(parseIntPermissive);

        // Check for ESC (27 or 0x1B)
        if (bytes[0] === 27) {
            
            // 1. Alignment: ESC a n (0x1B, 0x61, n)
            if (bytes[1] === 97) { // 0x61 is 97
                const n = bytes[2];
                // 0, 48 ('0') => Left
                // 1, 49 ('1') => Center
                // 2, 50 ('2') => Right
                if (n === 1 || n === 49) currentAlign = 'center';
                else if (n === 2 || n === 50) currentAlign = 'right';
                else currentAlign = 'left';
                continue;
            }

            // 2. Bold: ESC E n (0x1B, 0x45, n)
            if (bytes[1] === 69) { // 0x45 is 69
                const n = bytes[2];
                // 1, 49 => On; 0, 48 => Off
                currentBold = (n === 1 || n === 49);
                continue;
            }

            // 3. Spacing (Feed): ESC J n (0x1B, 0x4A, n)
            if (bytes[1] === 74) { // 0x4A is 74
                
                // DETECT FOOTER/CUT COMMAND: 
                // Pattern: 0x1B, 0x4A, n, 0x1D, 0x56 ...
                // If detected, skip it because the generator appends it automatically.
                // 29 is 0x1D, 86 is 0x56 ('V')
                if (bytes.length >= 5 && bytes[3] === 29 && bytes[4] === 86) {
                    continue;
                }

                const n = bytes[2];
                elements.push({
                    id: uuid(),
                    type: 'spacing',
                    content: '',
                    align: currentAlign,
                    isBold: currentBold,
                    size: currentSize,
                    spacingHeight: n
                });
                continue;
            }

            // 3.5 Overlay (Move Up): ESC K n (0x1B, 0x4B, n) - Custom/Legacy command
            if (bytes[1] === 75) { // 0x4B is 75
                const n = bytes[2];
                elements.push({
                    id: uuid(),
                    type: 'spacing',
                    content: '',
                    align: currentAlign,
                    isBold: currentBold,
                    size: currentSize,
                    spacingHeight: -n // Negative height for overlay
                });
                continue;
            }
            
            // 4. Reset: ESC @ (0x1B, 0x40)
            if (bytes[1] === 64) {
                // Reset state
                currentAlign = 'left';
                currentBold = false;
                currentSize = 'normal';
                continue;
            }
        }

        // Standalone GS ! n (Size): 0x1D, 0x21, n
        if (bytes[0] === 29 && bytes[1] === 33) {
            const n = bytes[2];
            currentSize = (n === 1 || n === 17) ? 'large' : 'normal'; // 1=Double Height, 16=Double Width, 17=Both
            continue;
        }
    }

    // --- STRATEGY 2: Complex Regex Parsing (Text, Files, Mixed) ---

    // 4. Complex Text with Size: BinaryOut(0x1D, 0x21, n, BIG5.GetBytes(...))
    const complexTextMatch = /BinaryOut\s*\(\s*(?:0x1D|29)\s*,\s*(?:0x21|33)\s*,\s*(0x[0-9A-Fa-f]+|\d+)\s*,\s*BIG5\.GetBytes\s*\(\s*(?:\$)?\"((?:[^"\\]|\\.)*)\"\s*\)\s*\)/i.exec(line);
    if (complexTextMatch) {
         const sizeVal = parseIntPermissive(complexTextMatch[1]);
         const size: FontSize = (sizeVal === 1 || sizeVal === 0x01) ? 'large' : 'normal';
         
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
        continue;
    }

    // 5. Standard Text Content: BIG5.GetBytes(...)
    // Matches: BinaryOut(BIG5.GetBytes("..."));
    const textMatch = /BIG5\.GetBytes\s*\(\s*(?:\$)?\"((?:[^"\\]|\\.)*)\"\s*\)/i.exec(line);
    if (textMatch) {
      let content = textMatch[1];
      content = content.replace(/\\n/g, '\n'); 
      
      elements.push({
        id: uuid(),
        type: 'text',
        content: content,
        align: currentAlign,
        isBold: currentBold,
        size: currentSize
      });
      continue;
    }

    // 6. Image Loading: File.ReadAllBytes(...)
    if (line.includes('File.ReadAllBytes')) {
      const fileMatch = /Path\.Combine\(.*,\s*"([^"]+)"\)/.exec(line);
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
      continue;
    }
  }

  return elements;
};
