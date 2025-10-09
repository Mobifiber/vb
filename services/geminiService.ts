import { GoogleGenAI, Part } from "@google/genai";
import type { NextApiRequest, NextApiResponse } from 'next';
import { AIModel, ReviewResult } from '../types'; // Đảm bảo đường dẫn này đúng

// Khởi tạo an toàn trên server
if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set.");
}
const ai = new GoogleGenAI({apiKey: process.env.API_KEY});

// Xử lý các yêu cầu từ frontend
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { action, payload } = req.body;

  try {
    let resultData: any;

    // Hàm helper để kiểm tra response và lấy text một cách an toàn
    const getResponseText = (response: any): string => {
        if (!response || !response.response || !response.response.candidates || response.response.candidates.length === 0) {
            const blockReason = response?.response?.promptFeedback?.blockReason;
            if (blockReason) {
                throw new Error(`Yêu cầu bị AI từ chối vì lý do an toàn: ${blockReason}`);
            }
            throw new Error("AI không trả về nội dung hợp lệ.");
        }
        return response.response.text();
    };

    switch (action) {
      case 'summarize': {
        const { text, instructions, files, model } = payload;
        // ... (phần code xây dựng summarizeContents giữ nguyên)
        let summarizeContents: any;
        if (files && files.length > 0) {
            const promptText = `Dựa vào hướng dẫn sau: "${instructions}", hãy phân tích nội dung được cung cấp...`;
            const parts: Part[] = [{ text: promptText }];
            if (text.trim()) parts.push({ text: `---VĂN BẢN BỔ SUNG---\n${text}` });
            for (const file of files) parts.push({ inlineData: { mimeType: file.mimeType, data: file.base64 } });
            summarizeContents = [{ parts }];
        } else {
            summarizeContents = `Dựa vào hướng dẫn sau: "${instructions}", hãy phân tích văn bản dưới đây...\n---\n${text}`;
        }
        
        const result = await ai.models.generateContent({
            model: model,
            contents: Array.isArray(summarizeContents) ? summarizeContents : [{ parts: [{ text: summarizeContents }] }]
        });
        resultData = getResponseText(result);
        break;
      }

      case 'draft': {
        const { topic, instructions, model, systemInstruction } = payload;
        const draftPrompt = `Dựa vào hướng dẫn sau: "${instructions}", hãy soạn thảo văn bản...\n---\n${topic}\n---...`;

        const result = await ai.models.generateContent({
            model: model,
            contents: [{ parts: [{ text: draftPrompt }] }],
            systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
        });
        resultData = getResponseText(result);
        break;
      }
        
      case 'review': {
        const { text, instructions, model, file } = payload;
        const reviewPrompt = `Bạn là một trợ lý chuyên nghiệp... HƯỚNG DẪN: "${instructions}"...`;
        const reviewParts: Part[] = [{ text: reviewPrompt }];
        if (text) reviewParts.push({ text: text });
        if (file) reviewParts.push({ inlineData: { mimeType: file.mimeType, data: file.base64 } });

        const result = await ai.models.generateContent({
            model: model,
            contents: [{ parts: reviewParts }],
            generationConfig: { responseMimeType: 'application/json' }
        });
        
        // JSON response cũng cần được kiểm tra an toàn
        const jsonResponse = getResponseText(result).trim();
        const cleanedJson = jsonResponse.replace(/^```json\s*|```\s*$/g, '');
        resultData = JSON.parse(cleanedJson) as ReviewResult;
        break;
      }

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    res.status(200).json(resultData);

  } catch (error: any) {
    console.error(`Error in API action '${action}':`, error);
    // Trả về thông báo lỗi chi tiết hơn cho frontend
    res.status(500).json({ error: `Server error during '${action}': ${error.message}` });
  }
}
