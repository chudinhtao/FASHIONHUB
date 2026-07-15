import { Injectable } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { User, Prisma } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email);
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findById(id);
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.usersRepository.create(data);
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.usersRepository.update(id, data);
  }

  async incrementFailedAttempts(id: string): Promise<User> {
    return this.usersRepository.incrementFailedAttempts(id);
  }

  async resetFailedAttempts(id: string): Promise<User> {
    return this.usersRepository.resetFailedAttempts(id);
  }

  async lockAccount(id: string, durationMinutes: number): Promise<User> {
    const lockUntil = new Date();
    lockUntil.setMinutes(lockUntil.getMinutes() + durationMinutes);
    return this.usersRepository.lockAccount(id, lockUntil);
  }
}
