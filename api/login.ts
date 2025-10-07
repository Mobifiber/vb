import { kv } from '@vercel/kv';
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  // --- THÊM ĐOẠN NÀY ---
  // Xử lý yêu cầu CORS preflight (OPTIONS)
  if (request.method === 'OPTIONS') {
    response.status(200).end();
    return;
  }
  // --- KẾT THÚC ĐOẠN THÊM ---

  // Chỉ cho phép phương thức POST
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { username, password } = request.body;

    if (!username || !password) {
      return response.status(400).json({ error: 'Username and password are required' });
    }

    const user: any = await kv.get(`user:${username}`);

    if (!user || user.password !== password) {
      return response.status(401).json({ error: 'Invalid credentials' });
    }

    const { password: _, ...userWithoutPassword } = user;
    return response.status(200).json(userWithoutPassword);
    
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: 'Internal Server Error' });
  }
}
