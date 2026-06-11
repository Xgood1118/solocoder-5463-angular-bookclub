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
    const existing = await this.findByNonce(nonce);
    if (existing) {
      return { error: '该兑换已处理，请勿重复操作' };
    }
    const config = EXCHANGE_CONFIG[type];
    const member = await this.memberService.getById(memberId);
    if (!member) return { error: '会员不存在' };
    if (member.points < config.points) {
      return { error: `积分不足，需要 ${config.points} 分，当前 ${member.points} 分` };
    }
    const updated = await this.memberService.deductPoints(memberId, config.points);
    if (!updated) return { error: '积分扣除失败' };

    const record: ExchangeRecord = {
      id: this.genId(),
      memberId,
      type,
      pointsCost: config.points,
      description: config.desc,
      nonce,
      createdAt: new Date().toISOString(),
    };
    try {
      await (await db()).add('exchanges', record);
    } catch {
      await this.memberService.update(memberId, { points: member.points });
      return { error: '兑换失败，已回滚积分' };
    }
    return record;
  }

  generateNonce(): string {
    return 'nonce_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
  }
}
