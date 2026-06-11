import { Injectable } from '@angular/core';
import { db } from './database.service';
import type { Club } from '../models/types';

const CLUB_ID = 'main-club';

@Injectable({ providedIn: 'root' })
export class ClubService {
  async get(): Promise<Club | undefined> {
    return (await db()).get('club', CLUB_ID);
  }

  async save(club: Partial<Club>): Promise<Club> {
    const existing = await this.get();
    const now = new Date().toISOString();
    const data: Club = {
      id: CLUB_ID,
      name: club.name ?? existing?.name ?? '社区读书会',
      president: club.president ?? existing?.president ?? '',
      foundedYear: club.foundedYear ?? existing?.foundedYear ?? new Date().getFullYear(),
      memberCount: club.memberCount ?? existing?.memberCount ?? 0,
      activityMode: club.activityMode ?? existing?.activityMode ?? 'hybrid',
      annualFee: club.annualFee ?? existing?.annualFee ?? 200,
      feePaymentMethod: club.feePaymentMethod ?? existing?.feePaymentMethod ?? '',
      description: club.description ?? existing?.description ?? '',
      lastVoteTime: club.lastVoteTime ?? existing?.lastVoteTime,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await (await db()).put('club', data, CLUB_ID);
    return data;
  }

  async updateLastVoteTime(): Promise<void> {
    const club = await this.get();
    if (club) {
      club.lastVoteTime = new Date().toISOString();
      club.updatedAt = club.lastVoteTime;
      await (await db()).put('club', club, CLUB_ID);
    }
  }

  async shouldOpenNewVote(): Promise<boolean> {
    const club = await this.get();
    if (!club?.lastVoteTime) return true;
    const diff = Date.now() - new Date(club.lastVoteTime).getTime();
    return diff >= 7 * 24 * 60 * 60 * 1000;
  }
}
