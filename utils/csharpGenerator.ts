import { TicketElement, Alignment, FontSize } from '../types';

export const generateCSharp = (elements: TicketElement[]): string => {
  let code = `Encoding BIG5 = Encoding.GetEncoding("big5");\n`;
  code += `BinaryOut(0x1B, 0x40);  // 重置出票機\n`;
  code += `BinaryOut(0x1B, 0x02);  // 整頁模式\n\n`;

  let currentAlign: Alignment = 'left';
  let currentBold = false;
  let currentSize: FontSize = 'normal';

  elements.forEach((el) => {
    // 1. Handle Alignment
    if (el.align !== currentAlign) {
      let alignVal = 0;
      let alignComment = '文字置左';
      if (el.align === 'center') { alignVal = 1; alignComment = '文字置中'; }
      if (el.align === 'right') { alignVal = 2; alignComment = '文字置右'; }
      
      code += `BinaryOut(0x1B, 0x61, ${alignVal});  // ${alignComment}\n`;
      currentAlign = el.align;
    }

    // 2. Handle Content
    if (el.type === 'spacing') {
      // Realign logic check (Specific to example logic about 0x4B 170, but we just use spacing for now)
      if (el.spacingHeight && el.spacingHeight > 0) {
        code += `BinaryOut(0x1B, 0x4A, ${el.spacingHeight});\n`;
      }
    } else if (el.type === 'image') {
       const name = el.variableName || "image.bin";
       code += `BinaryOut(File.ReadAllBytes(Path.Combine(GlobalVariable.TicketLogoFolder, "${name}")));  // 載入圖片\n`;
    } else if (el.type === 'text') {
      
      let textStr = el.content;
      textStr = textStr.replace(/\n/g, '\\n'); // Escape newlines
      const hasVar = /\{.*\}/.test(textStr);
      const stringLiteral = hasVar ? `$"{textStr}"` : `"${textStr}"`;

      // Check for size change or specific "Large Line" pattern
      // The example shows large text lines often combined in one command:
      // BinaryOut(0x1D, 0x21, 0x01, BIG5.GetBytes(...));
      
      if (el.size === 'large') {
          // Explicit bold check for large text if needed, but example shows independent bold commands usually
          if (el.isBold && !currentBold) {
             code += `BinaryOut(0x1B, 0x45, 0x01); //加粗\n`;
             currentBold = true;
          } else if (!el.isBold && currentBold) {
             code += `BinaryOut(0x1B, 0x45, 0x00); //取消加粗\n`;
             currentBold = false;
          }

          code += `BinaryOut(0x1D, 0x21, 0x01, BIG5.GetBytes(${stringLiteral}));\n`;
          currentSize = 'large'; // The command sets it to large
      } else {
          // Normal size
          if (currentSize === 'large') {
             code += `BinaryOut(0x1D, 0x21, 0x00); //文字大小恢復\n`;
             currentSize = 'normal';
          }

          if (el.isBold && !currentBold) {
             code += `BinaryOut(0x1B, 0x45, 0x01); //加粗\n`;
             currentBold = true;
          } else if (!el.isBold && currentBold) {
             code += `BinaryOut(0x1B, 0x45, 0x00); //取消加粗\n`;
             currentBold = false;
          }

          code += `BinaryOut(BIG5.GetBytes(${stringLiteral}));\n`;
      }
    }
  });

  // Footer / Cut
  code += `\nBinaryOut(0x1B, 0x4A, 88, 0x1D, 0x56, 0); // 切紙\n`;
  return code;
};