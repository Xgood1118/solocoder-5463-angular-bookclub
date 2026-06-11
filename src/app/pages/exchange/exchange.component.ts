import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AppStore } from '../../core/store/app.store';
import { ExchangeService, EXCHANGE_CONFIG } from '../../core/services/exchange.service';
import type { ExchangeType, ExchangeRecord } from '../../core/models/types';

interface ExchangeOption {
  type: ExchangeType;
  points: number;
  desc: string;
  icon: string;
  name: string;
}

@Component({
  selector: 'bc-exchange',
  standalone: true,
  imports: [
    CommonModule, MatButtonModule, MatIconModule, MatCardModule,
    MatTabsModule, MatTableModule, MatSnackBarModule
  ],
  template: `
    <div class="page-container">
      <h1 class="page-title">积分兑换</h1>

      <div class="stat-grid">
        <div class="stat-card" style="grid-column: span 2;">
          <div style="display: flex; align-items: center; gap: 16px;">
            <div style="width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, #ff9800, #f57c00); display: flex; align-items: center; justify-content: center;">
              <mat-icon style="font-size: 28px; color: #fff;">redeem</mat-icon>
            </div>
            <div>
              <div style="font-size: 14px; color: #666;">我的积分</div>
              <div style="font-size: 32px; font-weight: 700; color: #f57c00;">
                {{ currentPoints() }} 分
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card-section">
        <h2 class="card-section-title">兑换选项</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px;">
          @for (opt of exchangeOptions; track opt.type) {
            <mat-card [class.disabled]="currentPoints() < opt.points || processingType() === opt.type">
              <mat-card-content style="padding: 20px;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                  <div style="width: 44px; height: 44px; border-radius: 8px; background: #e3f2fd; display: flex; align-items: center; justify-content: center;">
                    <mat-icon style="color: #1976d2;">{{ opt.icon }}</mat-icon>
                  </div>
                  <div>
                    <div style="font-weight: 600; font-size: 16px;">{{ opt.name }}</div>
                    <div style="color: #f57c00; font-weight: 500;">{{ opt.points }} 积分</div>
                  </div>
                </div>
                <p style="color: #666; font-size: 13px; margin: 0 0 16px;">{{ opt.desc }}</p>
                <button mat-raised-button color="primary" style="width: 100%;"
                        [disabled]="currentPoints() < opt.points || processingType() === opt.type"
                        (click)="doExchange(opt.type)">
                  @if (processingType() === opt.type) {
                    <ng-container>
                      <mat-icon style="font-size: 16px;">hourglass_top</mat-icon>
                      <span style="margin-left: 4px;">处理中...</span>
                    </ng-container>
                  } @else if (currentPoints() < opt.points) {
                    积分不足
                  } @else {
                    立即兑换
                  }
                </button>
              </mat-card-content>
            </mat-card>
          }
        </div>
      </div>

      <div class="card-section">
        <h2 class="card-section-title">我的兑换记录</h2>
        @if (myRecords().length > 0) {
          <table mat-table [dataSource]="myRecords()">
            <ng-container matColumnDef="time">
              <th mat-header-cell *matHeaderCellDef>时间</th>
              <td mat-cell *matCellDef="let r">{{ r.createdAt.slice(0, 16).replace('T', ' ') }}</td>
            </ng-container>
            <ng-container matColumnDef="type">
              <th mat-header-cell *matHeaderCellDef>兑换内容</th>
              <td mat-cell *matCellDef="let r">{{ typeText(r.type) }}</td>
            </ng-container>
            <ng-container matColumnDef="desc">
              <th mat-header-cell *matHeaderCellDef>说明</th>
              <td mat-cell *matCellDef="let r">{{ r.description }}</td>
            </ng-container>
            <ng-container matColumnDef="cost">
              <th mat-header-cell *matHeaderCellDef>消耗积分</th>
              <td mat-cell *matCellDef="let r"><span class="badge-pill badge-warning">-{{ r.pointsCost }}</span></td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="displayedCols"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedCols;"></tr>
          </table>
        } @else {
          <div class="empty-state">
            <mat-icon class="empty-state-icon">receipt_long</mat-icon>
            <p>还没有兑换记录</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    mat-card.disabled { opacity: 0.6; }
  `]
})
export class ExchangeComponent {
  displayedCols = ['time', 'type', 'desc', 'cost'];
  processingType = signal<ExchangeType | ''>('');
  private isSubmitting = false;
  private usedNonces = new Set<string>();

  exchangeOptions: ExchangeOption[] = [
    { type: 'free_book', points: EXCHANGE_CONFIG.free_book.points, desc: EXCHANGE_CONFIG.free_book.desc, icon: 'menu_book', name: '下期书籍免费' },
    { type: 'fee_discount', points: EXCHANGE_CONFIG.fee_discount.points, desc: EXCHANGE_CONFIG.fee_discount.desc, icon: 'payments', name: '抵一个月会费' },
  ];

  currentPoints = computed(() => this.store.currentMember()?.points ?? 0);
  myRecords = computed(() => {
    const id = this.store.currentMemberId();
    return this.store.exchanges().filter(r => r.memberId === id);
  });

  constructor(
    public store: AppStore,
    private exchangeSvc: ExchangeService,
    private snackBar: MatSnackBar
  ) {}

  async doExchange(type: ExchangeType) {
    if (this.isSubmitting || this.processingType() !== '') {
      return;
    }
    this.isSubmitting = true;
    const memberId = this.store.currentMemberId();
    if (!memberId) {
      this.isSubmitting = false;
      this.snackBar.open('请先选择身份', 'OK', { duration: 1500 });
      return;
    }
    this.processingType.set(type);
    let nonce;
    do {
      nonce = this.exchangeSvc.generateNonce();
    } while (this.usedNonces.has(nonce));
    this.usedNonces.add(nonce);

    try {
      const result = await this.exchangeSvc.exchange(memberId, type, nonce);
      if ('error' in result) {
        this.snackBar.open(result.error, 'OK', { duration: 2500 });
      } else {
        await this.store.loadMembers();
        await this.store.loadExchanges();
        this.snackBar.open('兑换成功！', 'OK', { duration: 2000 });
      }
    } finally {
      this.processingType.set('');
      this.isSubmitting = false;
    }
  }

  typeText(t: ExchangeType): string {
    return { free_book: '免费书籍', fee_discount: '会费抵扣' }[t];
  }
}
