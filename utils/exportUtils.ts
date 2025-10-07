import { Document, Packer, Paragraph, TextRun } from 'docx';

export const exportToDocx = async (content: string, fileName: string) => {
  if (!content) return;

  // Ensure fileName ends with .docx
  const finalFileName = fileName.endsWith('.docx') ? fileName : `${fileName}.docx`;

  const paragraphs = content.split('\n').map(
    (line) =>
      new Paragraph({
        children: [new TextRun(line)],
      })
  );

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs,
      },
    ],
  });

  try {
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = finalFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error exporting to DOCX:", error);
  }
};
