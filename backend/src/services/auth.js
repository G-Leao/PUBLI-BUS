import bcryptjs from 'bcryptjs';
import prisma from '../config/prisma.js';
import { generateToken } from '../utils/jwt.js';

export const authService = {
  async register(email, password, name) {
    const passwordHash = await bcryptjs.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: 'ADVERTISER',
      },
    });
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  },

  async login(email, password) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error('Invalid email or password');

    const valid = await bcryptjs.compare(password, user.passwordHash);
    if (!valid) throw new Error('Invalid email or password');

    const token = generateToken(user.id, user.role);
    return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
  },

  async getUser(userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  },
};
