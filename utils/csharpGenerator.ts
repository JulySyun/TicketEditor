
import { TicketElement, Alignment, FontSize } from '../types';

export interface CodeLine {
  text: string;
  elementId?: string; // The ID of the element that generated this line
}

export const generateCSharp = (elements: TicketElement[]): CodeLine[] => {
  const lines: CodeLine[] = [];
  
  // Helper to push line
  const addLine = (text: string, id?: string) => lines.push({ text, elementId: id });

  addLine(`Encoding BIG5 = Encoding.GetEncoding("big5");\n`);
  addLine(`BinaryOut(0x1B, 0x40);  // 重置出票機`);
  addLine(`BinaryOut(0x1B, 0x02);  // 整頁模式\n`);

  // Initialize as null so the first element ALWAYS generates an alignment command
  let currentAlign: Alignment | null = null;
  let currentBold = false;
  let currentSize: FontSize = 'normal';

  elements.forEach((el) => {
    // 1. Handle Alignment
    // We check if alignment has changed.
    // SPECIAL CASE: If it is an Overlay element (Negative Spacing), we MUST force the alignment command.
    // This ensures that the Overlay operation (which depends on print head position) starts from the correct alignment anchor.
    const isOverlay = el.type === 'spacing' && (el.spacingHeight || 0) < 0;

    if (el.align !== currentAlign || isOverlay) {
      let alignHex = '0x00';
      let alignComment = '文字置左';
      
      if (el.align === 'center') { alignHex = '0x01'; alignComment = '文字置中'; }
      else if (el.align === 'right') { alignHex = '0x02'; alignComment = '文字置右'; }
      // else left is 0x00
      
      addLine(`BinaryOut(0x1B, 0x61, ${alignHex});  // ${alignComment}`, el.id);
      currentAlign = el.align;
    }

    // 2. Handle Content
    if (el.type === 'spacing') {
      const h = el.spacingHeight || 0;
      if (h < 0) {
        // Negative Spacing = Move Up (0x1B, 0x4B)
        const originalVal = Math.abs(h);
        
        addLine(`BinaryOut(0x1B, 0x4B, ${originalVal});   // 重新對齊圖框起始位置 (Overlay)`, el.id);
      } else if (h > 0) {
        addLine(`BinaryOut(0x1B, 0x4A, ${h});`, el.id);
      }
    } else if (el.type === 'image') {
       const name = el.variableName || "image.bin";
       addLine(`BinaryOut(File.ReadAllBytes(Path.Combine(GlobalVariable.TicketLogoFolder, "${name}")));  // 載入圖片`, el.id);
    } else if (el.type === 'text') {
      
      let textStr = el.content;
      textStr = textStr.replace(/\n/g, '\\n'); // Escape newlines
      const hasVar = /\{.*\}/.test(textStr);
      const stringLiteral = hasVar ? `$"{textStr}"` : `"${textStr}"`;

      // Check for size change or specific "Large Line" pattern
      if (el.size === 'large') {
          // Explicit bold check for large text
          if (el.isBold && !currentBold) {
             addLine(`BinaryOut(0x1B, 0x45, 0x01); //加粗`, el.id);
             currentBold = true;
          } else if (!el.isBold && currentBold) {
             addLine(`BinaryOut(0x1B, 0x45, 0x00); //取消加粗`, el.id);
             currentBold = false;
          }

          addLine(`BinaryOut(0x1D, 0x21, 0x01, BIG5.GetBytes(${stringLiteral}));`, el.id);
          currentSize = 'large'; // The command sets it to large
      } else {
          // Normal size
          if (currentSize === 'large') {
             addLine(`BinaryOut(0x1D, 0x21, 0x00); //文字大小恢復`, el.id);
             currentSize = 'normal';
          }

          if (el.isBold && !currentBold) {
             addLine(`BinaryOut(0x1B, 0x45, 0x01); //加粗`, el.id);
             currentBold = true;
          } else if (!el.isBold && currentBold) {
             addLine(`BinaryOut(0x1B, 0x45, 0x00); //取消加粗`, el.id);
             currentBold = false;
          }

          addLine(`BinaryOut(BIG5.GetBytes(${stringLiteral}));`, el.id);
      }
    }
  });

  // Footer / Cut
  addLine(`\nBinaryOut(0x1B, 0x4A, 88, 0x1D, 0x56, 0); // 切紙`);
  return lines;
};
