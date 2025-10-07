// File: api/login.ts

import { kv } from '@vercel/kv';
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  // Chỉ cho phép phương thức POST
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Lấy username và password từ body của request gửi lên từ frontend
    const { username, password } = request.body;

    if (!username || !password) {
      return response.status(400).json({ error: 'Username and password are required' });
    }

    // Tìm user trong Vercel KV bằng username (đây là key)
    const user = await kv.get(`user:${username}`);

    // Nếu không tìm thấy user hoặc mật khẩu không khớp
    if (!user || user.password !== password) {
      // Trong ứng dụng thực tế, bạn nên dùng bcrypt để so sánh mật khẩu đã băm
      return response.status(401).json({ error: 'Invalid credentials' });
    }

    // Nếu thành công, trả về thông tin user (nhớ bỏ mật khẩu đi)
    const { password: _, ...userWithoutPassword } = user;
    return response.status(200).json(userWithoutPassword);
    
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: 'Internal Server Error' });
  }
}