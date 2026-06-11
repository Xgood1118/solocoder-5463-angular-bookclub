import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { AppStore } from '../../core/store/app.store';
import { ProgressService } from '../../core/services/progress.service';
import type { Session, ReadingProgress, ReminderItem } from '../../core/models/types';

@Component({
  selector: 'bc-progress',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatButtonModule, MatIconModule, MatCardModule,
    MatSelectModule, MatSliderModule, MatFormFieldModule, MatInputModule,
    MatSnackBarModule, MatDividerModule, MatListModule
  ],
  template: `
    <div class="page-container">
      <h1 class="page-title">读书进度</h1>

      <div class="card-section">
        <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px;">
          <mat-form-field appearance="outline" style="min-width: 240px;">
            <mat-label>选择期次</mat-label>
            <mat-select [value]="selectedSessionId()" (valueChange)="onSessionChange($event)">
              @for (s of store.sessions(); track s.id) {
                <mat-option [value]="s.id">
                  第 {{ s.period }} 期 — {{ s.book ? '《' + s.book.title + '》' : '未选书' }}
                </mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>

        @if (currentSession && currentSession.book) {
          <div class="stat-grid">
            <div class="stat-card">
              <div class="stat-card-value">{{ stats.finished }}</div>
              <div class="stat-card-label">已读完 (100%)</div>
            </div>
            <div class="stat-card">
              <div class="stat-card-value">{{ stats.half }}</div>
              <div class="stat-card-label">已读一半 (50%+)</div>
            </div>
            <div class="stat-card">
              <div class="stat-card-value">{{ stats.notStarted }}</div>
              <div class="stat-card-label">未开始</div>
            </div>
            <div class="stat-card">
              <div class="stat-card-value">{{ stats.total }}</div>
              <div class="stat-card-label">总会员</div>
            </div>
          </div>

          <h3 class="card-section-title">会员进度列表</h3>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            @for (m of store.members(); track m.id) {
              <div class="progress-card">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <strong>{{ m.name }}</strong>
                    <span class="badge-pill" style="margin-left: 8px;"
                          [ngClass]="rateClass(getProgress(m.id))">
                      {{ getProgress(m.id).currentChapter }}/{{ currentSession.book.totalChapters }}
                    </span>
                    @if (getDelta(m.id) > 0) {
                      <span class="badge-pill badge-success" style="margin-left: 6px;">
                        +{{ getDelta(m.id) }} 章
                      </span>
                    }
                  </div>
                  <div style="display: flex; align-items: center; gap: 12px;">
                    <input type="number" min="0" [max]="currentSession.book.totalChapters"
                           [value]="getProgress(m.id).currentChapter"
                           (change)="updateProgress(m.id, +($any($event.target).value))"
                           style="width: 70px; padding: 6px 8px; border: 1px solid #ccc; border-radius: 4px;">
                    <button mat-icon-button (click)="updateProgress(m.id, getProgress(m.id).currentChapter + 1)"
                            [disabled]="getProgress(m.id).currentChapter >= currentSession.book.totalChapters">
                      <mat-icon>add</mat-icon>
                    </button>
                  </div>
                </div>
                <div style="margin-top: 10px;">
                  <div style="background: #eee; border-radius: 4px; height: 8px; overflow: hidden;">
                    <div [style.width.%]="(getProgress(m.id).currentChapter / currentSession.book.totalChapters) * 100"
                         [style.background]="rateColor(getProgress(m.id))"
                         style="height: 100%; transition: width .3s;"></div>
                  </div>
                </div>
              </div>
            }
          </div>

          <div style="margin-top: 32px;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <h3 class="card-section-title" style="margin: 0;">待提醒会员 (进度不足 50%)</h3>
              <button mat-stroked-button (click)="copyAllReminders()" [disabled]="reminders.length === 0">
                <mat-icon style="font-size: 18px; margin-right: 4px;">content_copy</mat-icon>
                复制全部提醒文案
              </button>
            </div>
            @if (reminders.length > 0) {
              <mat-list style="margin-top: 12px;">
                @for (r of reminders; track r.memberId) {
                  <mat-list-item>
                    <div style="display: flex; width: 100%; justify-content: space-between; align-items: center;">
                      <div style="flex: 1;">
                        <div>
                          <strong>{{ r.memberName }}</strong>
                          <span class="badge-pill badge-danger" style="margin-left: 8px;">
                            {{ r.currentProgress }}/{{ r.totalChapters }} ({{ (r.progressRate * 100).toFixed(0) }}%)
                          </span>
                        </div>
                        <div style="color: #666; font-size: 13px; margin-top: 4px;">{{ r.message }}</div>
                      </div>
                      <button mat-icon-button (click)="copyText(r.message)" title="复制文案">
                        <mat-icon>content_copy</mat-icon>
                      </button>
                    </div>
                  </mat-list-item>
                }
              </mat-list>
            } @else {
              <div class="empty-state" style="padding: 24px;">
                <p>太棒了！所有会员进度都超过 50% 🎉</p>
              </div>
            }
          </div>
        } @else {
          <div class="empty-state">
            <mat-icon class="empty-state-icon">menu_book</mat-icon>
            <p>请选择有书籍的期次查看进度</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .progress-card {
      background: #fff;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.06);
    }
  `]
})
export class ProgressComponent implements OnInit {
  selectedSessionId = signal<string>('');
  progressMap = signal<Map<string, ReadingProgress>>(new Map());
  stats = { finished: 0, half: 0, notStarted: 0, total: 0 };
  reminders: ReminderItem[] = [];

  constructor(
    public store: AppStore,
    private progressSvc: ProgressService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    const latest = this.store.latestSession();
    if (latest) {
      this.selectedSessionId.set(latest.id);
      this.loadSessionData(latest.id);
    }
  }

  get currentSession(): Session | undefined {
    return this.store.sessions().find(s => s.id === this.selectedSessionId());
  }

  async onSessionChange(id: string) {
    this.selectedSessionId.set(id);
    await this.loadSessionData(id);
  }

  async loadSessionData(sessionId: string) {
    const progresses = await this.progressSvc.getBySession(sessionId);
    const map = new Map<string, ReadingProgress>();
    progresses.forEach(p => map.set(p.memberId, p));
    this.progressMap.set(map);
    this.stats = await this.progressSvc.getSessionStats(sessionId);
    this.reminders = await this.progressSvc.getReminderList(sessionId);
  }

  getProgress(memberId: string): ReadingProgress {
    const session = this.currentSession;
    const total = session?.book?.totalChapters ?? 0;
    return this.progressMap().get(memberId) ?? {
      id: '', memberId, bookId: session?.book?.id ?? '', sessionId: this.selectedSessionId(),
      currentChapter: 0, previousChapter: 0, updatedAt: ''
    };
  }

  getDelta(memberId: string): number {
    const p = this.getProgress(memberId);
    return Math.max(0, p.currentChapter - p.previousChapter);
  }

  async updateProgress(memberId: string, chapter: number) {
    const session = this.currentSession;
    if (!session?.book) return;
    const max = session.book.totalChapters;
    const val = Math.max(0, Math.min(max, chapter));
    await this.progressSvc.update(memberId, session.book.id, session.id, val);
    await this.loadSessionData(session.id);
  }

  rateClass(p: ReadingProgress): string {
    const session = this.currentSession;
    if (!session?.book) return 'badge-default';
    const rate = p.currentChapter / session.book.totalChapters;
    if (rate >= 1) return 'badge-success';
    if (rate >= 0.5) return 'badge-primary';
    if (rate > 0) return 'badge-warning';
    return 'badge-default';
  }

  rateColor(p: ReadingProgress): string {
    const session = this.currentSession;
    if (!session?.book) return '#ccc';
    const rate = p.currentChapter / session.book.totalChapters;
    if (rate >= 1) return '#4caf50';
    if (rate >= 0.5) return '#3f51b5';
    if (rate > 0) return '#ff9800';
    return '#e0e0e0';
  }

  copyText(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      this.snackBar.open('已复制到剪贴板', 'OK', { duration: 1500 });
    });
  }

  copyAllReminders() {
    const text = this.reminders.map(r => `【${r.memberName}】${r.message}`).join('\n\n');
    this.copyText(text);
  }
}
