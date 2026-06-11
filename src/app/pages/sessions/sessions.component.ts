import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { AppStore } from '../../core/store/app.store';
import { SessionService } from '../../core/services/session.service';
import { ClubService } from '../../core/services/club.service';
import type { Session, SessionStatus } from '../../core/models/types';

@Component({
  selector: 'bc-sessions',
  standalone: true,
  imports: [
    CommonModule, MatButtonModule, MatIconModule, MatCardModule, MatRadioModule,
    MatSelectModule, MatSnackBarModule, FormsModule
  ],
  template: `
    <div class="page-container">
      <h1 class="page-title">期次与投票</h1>

      <div class="action-bar">
        <button mat-raised-button color="primary" (click)="createNewPeriod()" [disabled]="creating()">
          <mat-icon style="font-size: 18px; margin-right: 4px;">add</mat-icon>
          开启新一期
        </button>
        @if (shouldOpenVote()) {
          <button mat-raised-button color="accent" (click)="createNewPeriod()">
            <mat-icon style="font-size: 18px; margin-right: 4px;">auto_awesome</mat-icon>
            距上次投票超过 7 天，开启新一轮
          </button>
        }
      </div>

      <div class="card-section">
        @for (s of store.sessions(); track s.id) {
          <div class="session-card">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <div style="margin-bottom: 8px;">
                  <span class="badge-pill badge-primary">第 {{ s.period }} 期</span>
                  <span class="badge-pill" [ngClass]="statusClass(s.status)">{{ statusText(s.status) }}</span>
                  <span class="badge-pill" [ngClass]="voteClass(s.voteStatus)">{{ voteText(s.voteStatus) }}</span>
                </div>
                @if (s.book) {
                  <h3 style="margin: 8px 0 4px; font-size: 20px;">《{{ s.book.title }}》</h3>
                  <p style="color: #666; margin: 0;">作者：{{ s.book.author }} · 共 {{ s.book.totalChapters }} 章</p>
                }
              </div>
              <div style="display: flex; flex-direction: column; gap: 8px; align-items: flex-end;">
                @if (s.voteStatus === 'active') {
                  <button mat-stroked-button color="warn" (click)="closeVote(s)">关闭投票</button>
                }
                @if (s.voteStatus === 'closed' && !s.book) {
                  <div>
                    <mat-select placeholder="手动指定书籍" (selectionChange)="manualSelect(s, $event.value)">
                      @for (c of s.voteCandidates; track c.bookId) {
                        <mat-option [value]="c.bookId">《{{ c.book.title }}》</mat-option>
                      }
                    </mat-select>
                  </div>
                }
                @if (s.status === 'reading') {
                  <mat-select placeholder="指定主持人" (selectionChange)="setHost(s, $event.value)">
                    <mat-option value="">选择主持人 (+20分)</mat-option>
                    @for (m of store.members(); track m.id) {
                      <mat-option [value]="m.id">{{ m.name }}</mat-option>
                    }
                  </mat-select>
                }
                @if (s.status !== 'completed' && s.book) {
                  <button mat-stroked-button (click)="advanceStatus(s)">推进到下一阶段</button>
                }
              </div>
            </div>

            @if (s.voteCandidates.length > 0) {
              <div style="margin-top: 20px; padding: 16px; background: #fafafa; border-radius: 8px;">
                <div style="font-weight: 500; margin-bottom: 12px;">
                  候选书籍（共 {{ s.voteCandidates.length }} 本）
                  @if (s.voteStatus === 'active') {
                    <span style="color: #666; font-weight: normal; margin-left: 8px;">
                      — 点击下方书名投票
                    </span>
                  }
                </div>
                <div class="vote-grid">
                  @for (c of s.voteCandidates; track c.bookId) {
                    <div class="vote-card"
                         [class.voted]="myVote(s) === c.bookId"
                         (click)="vote(s, c.bookId)"
                         [style.cursor]="s.voteStatus === 'active' && !myVote(s) ? 'pointer' : 'default'">
                      <div style="font-weight: 500;">《{{ c.book.title }}》</div>
                      <div style="color: #888; font-size: 13px; margin-top: 4px;">{{ c.book.author }}</div>
                      <div style="margin-top: 12px;">
                        <div style="background: #e0e0e0; border-radius: 4px; height: 8px; overflow: hidden;">
                          <div [style.width.%]="votePercent(s, c.votes)"
                               style="background: #3f51b5; height: 100%; transition: width .3s;"></div>
                        </div>
                        <div style="margin-top: 6px; font-size: 13px; color: #555;">
                          {{ c.votes }} 票
                          @if (myVote(s) === c.bookId) {
                            <span class="badge-pill badge-success" style="margin-left: 6px;">你已投</span>
                          }
                        </div>
                      </div>
                    </div>
                  }
                </div>
                @if (allZeroVotes(s)) {
                  <p style="margin-top: 12px; color: #e65100;">所有候选书均为 0 票，需会长手动指定书籍。</p>
                }
              </div>
            }
            <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />
          </div>
        }
        @if (store.sessions().length === 0) {
          <div class="empty-state">
            <mat-icon class="empty-state-icon">event_note</mat-icon>
            <p>还没有任何期次，点击「开启新一期」开始吧</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .session-card { margin-bottom: 8px; }
    .vote-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 12px;
    }
    .vote-card {
      background: #fff;
      padding: 16px;
      border-radius: 8px;
      border: 2px solid transparent;
      transition: all .2s;
    }
    .vote-card:hover {
      border-color: #c5cae9;
      transform: translateY(-2px);
    }
    .vote-card.voted {
      border-color: #3f51b5;
      background: #e8eaf6;
    }
  `]
})
export class SessionsComponent {
  creating = signal(false);
  private myVotesCache = signal<Record<string, string>>({});

  constructor(
    public store: AppStore,
    private sessionSvc: SessionService,
    private clubSvc: ClubService,
    private snackBar: MatSnackBar
  ) {}

  shouldOpenVote(): boolean {
    return this.clubSvc.shouldOpenNewVote() && this.store.sessions().length > 0;
  }

  async createNewPeriod() {
    this.creating.set(true);
    try {
      await this.sessionSvc.createNewPeriod();
      await this.store.loadSessions();
      this.snackBar.open('已开启新一期，投票已激活', 'OK', { duration: 2000 });
    } finally {
      this.creating.set(false);
    }
  }

  async vote(session: Session, bookId: string) {
    if (session.voteStatus !== 'active') return;
    if (!this.store.currentMemberId()) {
      this.snackBar.open('请先选择身份', 'OK', { duration: 1500 });
      return;
    }
    if (this.myVote(session)) {
      this.snackBar.open('你已经投过票啦', 'OK', { duration: 1500 });
      return;
    }
    const result = await this.sessionSvc.castVote(session.id, this.store.currentMemberId(), bookId);
    if (result) {
      this.myVotesCache.update(c => ({ ...c, [session.id]: bookId }));
      await this.store.loadSessions();
      this.snackBar.open('投票成功', 'OK', { duration: 1500 });
    } else {
      this.snackBar.open('投票失败（可能已结束或已投过）', 'OK', { duration: 1500 });
    }
  }

  myVote(session: Session): string | null {
    return this.myVotesCache()[session.id] ?? null;
  }

  totalVotes(session: Session): number {
    return session.voteCandidates.reduce((s, c) => s + c.votes, 0);
  }

  votePercent(session: Session, votes: number): number {
    const total = this.totalVotes(session);
    return total === 0 ? 0 : Math.round((votes / total) * 100);
  }

  allZeroVotes(session: Session): boolean {
    return session.voteCandidates.every(c => c.votes === 0);
  }

  async closeVote(session: Session) {
    await this.sessionSvc.closeVote(session.id);
    await this.store.loadSessions();
    if (this.allZeroVotes(session)) {
      this.snackBar.open('所有候选均 0 票，请手动指定书籍', 'OK', { duration: 2500 });
    } else {
      this.snackBar.open('投票已关闭', 'OK', { duration: 1500 });
    }
  }

  async manualSelect(session: Session, bookId: string) {
    if (!bookId) return;
    await this.sessionSvc.manualSelectBook(session.id, bookId);
    await this.store.loadSessions();
    this.snackBar.open('已指定书籍，开始阅读！', 'OK', { duration: 2000 });
  }

  async setHost(session: Session, memberId: string) {
    if (!memberId) return;
    await this.sessionSvc.setHost(session.id, memberId);
    await this.store.loadSessions();
    this.snackBar.open('已指定主持人', 'OK', { duration: 1500 });
  }

  async advanceStatus(session: Session) {
    const nextMap: Record<SessionStatus, SessionStatus | null> = {
      voting: 'reading', reading: 'discussing', discussing: 'completed', completed: null
    };
    const next = nextMap[session.status];
    if (!next) return;
    await this.sessionSvc.updateStatus(session.id, next);
    await this.store.loadSessions();
    await this.store.loadMembers();
    this.snackBar.open(`已推进到「${this.statusText(next)}」`, 'OK', { duration: 2000 });
  }

  statusText(s: string): string {
    return { voting: '选书投票中', reading: '正在阅读', discussing: '讨论中', completed: '已完成' }[s] ?? s;
  }

  statusClass(s: string): string {
    return {
      voting: 'badge-warning', reading: 'badge-primary', discussing: 'badge-primary', completed: 'badge-success'
    }[s] ?? 'badge-default';
  }

  voteText(s: string): string {
    return { pending: '待投票', active: '投票进行中', closed: '投票已结束' }[s] ?? s;
  }

  voteClass(s: string): string {
    return { pending: 'badge-default', active: 'badge-warning', closed: 'badge-success' }[s] ?? 'badge-default';
  }
}
