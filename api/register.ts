import { kv } from '@vercel/kv';
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { username, password } = request.body;

    if (!username || !password) {
      return response.status(400).json({ error: 'Username and password are required' });
    }

    // --- KIỂM TRA XEM USER ĐÃ TỒN TẠI CHƯA ---
    const existingUser = await kv.get(`user:${username}`);
    if (existingUser) {
      return response.status(409).json({ error: 'User already exists' });
    }

    // --- TẠO USER MỚI ---
    const newUser = {
      username: username,
      password: password, // Chú ý: trong thực tế cần băm (hash) mật khẩu
      name: 'Default User',
      quota: { used: 0, total: 10000 }
    };

    // Lưu user mới vào Vercel KV
    await kv.set(`user:${username}`, newUser);

    // Trả về thông báo thành công
    return response.status(201).json({ message: 'User created successfully', user: { username: newUser.username } });
    
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: 'Internal Server Error' });
  }
}
