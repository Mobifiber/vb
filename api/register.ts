import { kv } from '@vercel/kv';
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  // --- ĐOẠN SỬA LỖI 405 ---
  // Xử lý yêu cầu CORS preflight (OPTIONS)
  if (request.method === 'OPTIONS') {
    response.status(200).end();
    return;
  }
  // --- KẾT THÚC ĐOẠN SỬA ---

  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { username, password } = request.body;

    if (!username || !password) {
      return response.status(400).json({ error: 'Username and password are required' });
    }

    const existingUser = await kv.get(`user:${username}`);
    if (existingUser) {
      return response.status(409).json({ error: 'User already exists' });
    }

    const newUser = {
      username: username,
      password: password,
      name: 'Default User',
      quota: { used: 0, total: 10000 }
    };

    await kv.set(`user:${username}`, newUser);

    return response.status(201).json({ message: 'User created successfully', user: { username: newUser.username } });
    
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: 'Internal Server Error' });
  }
}

