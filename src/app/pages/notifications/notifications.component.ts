import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AppStore } from '../../core/store/app.store';
import { NotificationService } from '../../core/services/notification.service';
import type { Notification } from '../../core/models/types';

@Component({
  selector: 'bc-notifications',
  standalone: true,
  imports: [
    CommonModule, MatButtonModule, MatIconModule, MatCardModule,
    MatListModule, MatSnackBarModule
  ],
  template: `
    <div class="page-container">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h1 class="page-title" style="margin: 0;">消息中心</h1>
        <button mat-stroked-button (click)="markAllRead()" [disabled]="unread().length === 0">
          <mat-icon style="font-size: 18px; margin-right: 4px;">done_all</mat-icon>全部标为已读
        </button>
      </div>

      <div class="card-section">
        @if (notifications().length > 0) {
          <mat-list>
            @for (n of notifications(); track n.id) {
              <mat-list-item (click)="read(n)" style="cursor: pointer;"
                             [style.background]="n.isRead ? '#fff' : '#f0f7ff'">
                <mat-icon matListItemIcon [style.color]="iconColor(n.type)">
                  {{ typeIcon(n.type) }}
                </mat-icon>
                <div matListItemTitle style="font-weight: {{ n.isRead ? 400 : 600 }};">
                  {{ n.content }}
                </div>
                <div matListItemLine style="font-size: 12px; color: #999;">
                  {{ n.createdAt.slice(0, 16).replace('T', ' ') }}
                  @if (!n.isRead) {
                    <span class="badge-pill badge-primary" style="margin-left: 8px;">新消息</span>
                  }
                </div>
              </mat-list-item>
            }
          </mat-list>
        } @else {
          <div class="empty-state">
            <mat-icon class="empty-state-icon">notifications_none</mat-icon>
            <p>暂无消息</p>
          </div>
        }
      </div>
    </div>
  `,
})
export class NotificationsComponent {
  notifications = computed(() => this.store.notifications());
  unread = computed(() => this.notifications().filter(n => !n.isRead));

  constructor(
    public store: AppStore,
    private notificationSvc: NotificationService,
    private snackBar: MatSnackBar
  ) {}

  async read(n: Notification) {
    if (n.isRead) return;
    await this.notificationSvc.markRead(n.id);
    await this.store.loadNotifications();
  }

  async markAllRead() {
    if (!this.store.currentMemberId()) return;
    await this.notificationSvc.markAllRead(this.store.currentMemberId());
    await this.store.loadNotifications();
    this.snackBar.open('已全部标记为已读', 'OK', { duration: 1500 });
  }

  typeIcon(t: string): string {
    return { mention: 'alternate_email', like: 'favorite', comment: 'comment', system: 'info' }[t] ?? 'notifications';
  }

  iconColor(t: string): string {
    return { mention: '#3f51b5', like: '#e91e63', comment: '#4caf50', system: '#ff9800' }[t] ?? '#999';
  }
}
