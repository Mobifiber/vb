import { kv } from '@vercel/kv';
import { VercelRequest, VercelResponse } from '@vercel/node';

// DANH SÁCH TÀI KHOẢN BAN ĐẦU BẠN MUỐN TẠO
const initialUsers = [
  {
    username: 'user1',
    password: 'password1',
    name: 'Nguoi Dung 1',
    quota: { used: 0, total: 100 },
  },
  {
    username: 'user2',
    password: 'password2',
    name: 'Nguoi Dung 2',
    quota: { used: 0, total: 50 },
  },
  // Thêm các user khác ở đây nếu bạn muốn
];

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const results = [];
    for (const user of initialUsers) {
      // Dùng cú pháp `user:${username}` để làm key
      await kv.set(`user:${user.username}`, user);
      results.push(`Created or updated user: ${user.username}`);
    }
    
    return response.status(200).json({ message: 'Seeding completed!', results });

  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: 'Internal Server Error' });
  }
}
