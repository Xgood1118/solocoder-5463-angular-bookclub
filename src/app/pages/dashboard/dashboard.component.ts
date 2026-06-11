import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { AppStore } from '../../core/store/app.store';
import { ProgressService } from '../../core/services/progress.service';
import type { Session } from '../../core/models/types';

@Component({
  selector: 'bc-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule],
  template: `
    <div class="page-container">
      <h1 class="page-title">仪表盘</h1>

      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-card-value">{{ store.members().length }}</div>
          <div class="stat-card-label">会员总数</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-value">{{ store.sessions().length }}</div>
          <div class="stat-card-label">累计期数</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-value">{{ totalPoints }}</div>
          <div class="stat-card-label">全会员积分</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-value">{{ totalSpeeches }}</div>
          <div class="stat-card-label">累计发言数</div>
        </div>
      </div>

      <div class="card-section">
        <h2 class="card-section-title">当前期次</h2>
        @if (latestSession) {
          <div class="session-info">
            <div>
              <span class="badge-pill badge-primary">第 {{ latestSession.period }} 期</span>
              <span class="badge-pill" [ngClass]="statusClass(latestSession.status)">{{ statusText(latestSession.status) }}</span>
            </div>
            @if (latestSession.book) {
              <h3 style="margin: 12px 0 4px; font-size: 20px;">《{{ latestSession.book.title }}》</h3>
              <p style="color: #666; margin: 0;">作者：{{ latestSession.book.author }} · 共 {{ latestSession.book.totalChapters }} 章</p>
            } @else {
              <p style="color: #999; margin-top: 12px;">等待选书...</p>
            }
            @if (latestSession.hostMemberId) {
              <p style="margin-top: 8px; color: #666;">
                <mat-icon style="font-size: 16px; vertical-align: middle;">person</mat-icon>
                主持：{{ hostName }}
              </p>
            }
          </div>
          @if (stats) {
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 20px;">
              <div style="text-align: center; padding: 16px; background: #e8f5e9; border-radius: 8px;">
                <div style="font-size: 24px; font-weight: 700; color: #2e7d32;">{{ stats.finished }}</div>
                <div style="font-size: 13px; color: #558b2f;">已读完</div>
              </div>
              <div style="text-align: center; padding: 16px; background: #fff3e0; border-radius: 8px;">
                <div style="font-size: 24px; font-weight: 700; color: #ef6c00;">{{ stats.half }}</div>
                <div style="font-size: 13px; color: #f57c00;">读了一半</div>
              </div>
              <div style="text-align: center; padding: 16px; background: #ffebee; border-radius: 8px;">
                <div style="font-size: 24px; font-weight: 700; color: #c62828;">{{ stats.notStarted }}</div>
                <div style="font-size: 13px; color: #e53935;">未开始</div>
              </div>
            </div>
          }
        } @else {
          <div class="empty-state">
            <mat-icon class="empty-state-icon">event_note</mat-icon>
            <p>还没有创建期次，去「期次与投票」创建第一期吧</p>
          </div>
        }
      </div>

      <div class="card-section">
        <h2 class="card-section-title">读书会信息</h2>
        @if (store.club()) {
          <p style="margin: 4px 0;"><strong>名称：</strong>{{ store.club()?.name }}</p>
          <p style="margin: 4px 0;"><strong>会长：</strong>{{ store.club()?.president }}</p>
          <p style="margin: 4px 0;"><strong>成立年份：</strong>{{ store.club()?.foundedYear }} 年</p>
          <p style="margin: 4px 0;"><strong>活动形式：</strong>{{ modeText(store.club()?.activityMode) }}</p>
          <p style="margin: 4px 0;"><strong>年费：</strong>¥{{ store.club()?.annualFee }}</p>
        }
      </div>
    </div>
  `,
})
export class DashboardComponent {
  stats: { finished: number; half: number; notStarted: number; total: number } | null = null;

  constructor(public store: AppStore, private progressSvc: ProgressService) {
    this.loadStats();
  }

  get latestSession(): Session | null {
    return this.store.latestSession();
  }

  get hostName(): string {
    const s = this.latestSession;
    if (!s?.hostMemberId) return '';
    return this.store.members().find(m => m.id === s.hostMemberId)?.name ?? '';
  }

  get totalPoints(): number {
    return this.store.members().reduce((s, m) => s + m.points, 0);
  }

  get totalSpeeches(): number {
    return this.store.members().reduce((s, m) => s + m.speechesCount, 0);
  }

  async loadStats() {
    const s = this.latestSession;
    if (s) this.stats = await this.progressSvc.getSessionStats(s.id);
  }

  statusText(s: string): string {
    return { voting: '选书投票中', reading: '正在阅读', discussing: '讨论中', completed: '已完成' }[s] ?? s;
  }

  statusClass(s: string): string {
    return {
      voting: 'badge-warning',
      reading: 'badge-primary',
      discussing: 'badge-primary',
      completed: 'badge-success'
    }[s] ?? 'badge-default';
  }

  modeText(m?: string): string {
    return { online: '线上（腾讯会议）', offline: '线下（咖啡馆）', hybrid: '线上线下结合' }[m ?? ''] ?? '';
  }
}
