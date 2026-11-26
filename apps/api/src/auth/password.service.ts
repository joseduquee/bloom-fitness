import { Injectable } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';

/** Hash de contraseñas con argon2id (constitución, §3.4). */
@Injectable()
export class PasswordService {
  hash(password: string): Promise<string> {
    return hash(password);
  }

  async verify(passwordHash: string, password: string): Promise<boolean> {
    try {
      return await verify(passwordHash, password);
    } catch {
      return false;
    }
  }
}
