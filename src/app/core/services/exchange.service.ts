import { Injectable } from '@angular/core';
import { db } from './database.service';
import type { ExchangeRecord, ExchangeType } from '../models/types';
import { MemberService } from './member.service';

export const EXCHANGE_CONFIG: Record<ExchangeType, { points: number; desc: string }> = {
  free_book: { points: 1000, desc: '下一期书籍免费赠送' },
  fee_discount: { points: 500, desc: '抵扣一个月会费' },
};

@Injectable({ providedIn: 'root' })
export class ExchangeService {
  constructor(private memberService: MemberService) {}

  private genId(): string {
    return 'e_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  }

  async getAll(): Promise<ExchangeRecord[]> {
    const list = await (await db()).getAll('exchanges');
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getByMember(memberId: string): Promise<ExchangeRecord[]> {
    const list = await (await db()).getAllFromIndex('exchanges', 'by-member', memberId);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async findByNonce(nonce: string): Promise<ExchangeRecord | undefined> {
    return (await db()).getFromIndex('exchanges', 'by-nonce', nonce);
  }

  async exchange(memberId: string, type: ExchangeType, nonce: string): Promise<ExchangeRecord | { error: string }> {
    if (!nonce || nonce.trim() === '') {
      return { error: '无效的请求标识' };
    }
    const config = EXCHANGE_CONFIG[type];
    const dbInstance = await db();
    const tx = dbInstance.transaction(['exchanges', 'members'], 'readwrite');
    const exchangeStore = tx.objectStore('exchanges');
    const memberStore = tx.objectStore('members');

    try {
      const existingRecord = await exchangeStore.index('by-nonce').get(nonce);
      if (existingRecord) {
        await tx.done;
        return { error: '该兑换已处理，请勿重复操作' };
      }

      const member = await memberStore.get(memberId);
      if (!member) {
        await tx.done;
        return { error: '会员不存在' };
      }
      if (member.points < config.points) {
        await tx.done;
        return { error: `积分不足，需要 ${config.points} 分，当前 ${member.points} 分` };
      }

      const record: ExchangeRecord = {
        id: this.genId(),
        memberId,
        type,
        pointsCost: config.points,
        description: config.desc,
        nonce,
        createdAt: new Date().toISOString(),
      };

      await exchangeStore.add(record);

      member.points -= config.points;
      member.updatedAt = new Date().toISOString();
      await memberStore.put(member);

      await tx.done;
      return record;
    } catch (err) {
      try {
        await tx.abort();
      } catch {}
      const error = err as Error & { name?: string; code?: number };
      const isDuplicate = 
        error.name === 'ConstraintError' ||
        error.name === 'DataError' ||
        (error.message && (
          error.message.includes('unique') ||
          error.message.includes('ConstraintError') ||
          error.message.includes('already exists') ||
          error.message.includes('by-nonce')
        ));
      if (isDuplicate) {
        return { error: '该兑换已处理，请勿重复操作' };
      }
      return { error: '兑换失败，请稍后重试' };
    }
  }

  generateNonce(): string {
    return 'nonce_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
  }
}
