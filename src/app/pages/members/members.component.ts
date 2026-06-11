import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { AppStore } from '../../core/store/app.store';
import { MemberService } from '../../core/services/member.service';
import type { Member } from '../../core/models/types';
import * as XLSX from 'xlsx';

@Component({
  selector: 'bc-member-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatDialogModule
  ],
  template: `
    <h2 mat-dialog-title style="margin: 0; padding: 20px 24px 0;">{{ isEdit ? '编辑会员' : '新增会员' }}</h2>
    <mat-dialog-content style="padding: 20px 24px;">
      <form [formGroup]="form">
        <div class="form-row">
          <mat-form-field appearance="outline" style="width: 100%; margin-bottom: 8px;">
            <mat-label>姓名</mat-label>
            <input matInput formControlName="name">
          </mat-form-field>
        </div>
        <div class="form-row">
          <mat-form-field appearance="outline" style="width: 48%;">
            <mat-label>性别</mat-label>
            <mat-select formControlName="gender">
              <mat-option value="male">男</mat-option>
              <mat-option value="female">女</mat-option>
              <mat-option value="other">其他</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" style="width: 48%;">
            <mat-label>年龄</mat-label>
            <input matInput type="number" formControlName="age">
          </mat-form-field>
        </div>
        <div class="form-row">
          <mat-form-field appearance="outline" style="width: 48%;">
            <mat-label>微信号</mat-label>
            <input matInput formControlName="wechatId">
          </mat-form-field>
          <mat-form-field appearance="outline" style="width: 48%;">
            <mat-label>手机号</mat-label>
            <input matInput formControlName="phone">
          </mat-form-field>
        </div>
        <mat-form-field appearance="outline" style="width: 100%;">
          <mat-label>备注</mat-label>
          <textarea matInput rows="2" formControlName="note"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end" style="padding: 8px 24px 20px;">
      <button mat-button mat-dialog-close>取消</button>
      <button mat-raised-button color="primary" [disabled]="form.invalid" (click)="onSave()">保存</button>
    </mat-dialog-actions>
  `
})
export class MemberDialogComponent {
  form: FormGroup;
  isEdit = false;
  editingId?: string;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<MemberDialogComponent>,
    private memberSvc: MemberService
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      gender: ['other', Validators.required],
      age: [0, [Validators.required, Validators.min(0)]],
      wechatId: [''],
      phone: [''],
      note: [''],
    });
  }

  setMember(m: Member) {
    this.isEdit = true;
    this.editingId = m.id;
    this.form.patchValue({
      name: m.name, gender: m.gender, age: m.age,
      wechatId: m.wechatId, phone: m.phone, note: m.note
    });
  }

  async onSave() {
    if (this.form.invalid) return;
    if (this.isEdit && this.editingId) {
      await this.memberSvc.update(this.editingId, this.form.value);
    } else {
      await this.memberSvc.create(this.form.value);
    }
    this.dialogRef.close(true);
  }
}

@Component({
  selector: 'bc-members',
  standalone: true,
  imports: [
    CommonModule, MatTableModule, MatButtonModule, MatIconModule, MatCardModule,
    MatDialogModule, MatSnackBarModule, MatDividerModule, ReactiveFormsModule
  ],
  template: `
    <div class="page-container">
      <h1 class="page-title">会员管理</h1>

      <div class="action-bar">
        <button mat-raised-button color="primary" (click)="openDialog()">
          <mat-icon style="font-size: 18px; margin-right: 4px;">add</mat-icon>新增会员
        </button>
        <button mat-stroked-button (click)="addSpeech()">
          <mat-icon style="font-size: 18px; margin-right: 4px;">record_voice_over</mat-icon>登记发言 (+5分)
        </button>

        @if (showImport()) {
          <label style="cursor: pointer;">
            <button mat-stroked-button color="accent" type="button">
              <mat-icon style="font-size: 18px; margin-right: 4px;">upload</mat-icon>导入 Excel
            </button>
            <input type="file" accept=".xlsx,.xls" style="display:none;" (change)="onFile($event)">
          </label>
        }
      </div>

      <div class="card-section">
        <table mat-table [dataSource]="store.members()">
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>姓名</th>
            <td mat-cell *matCellDef="let m">{{ m.name }}</td>
          </ng-container>
          <ng-container matColumnDef="gender">
            <th mat-header-cell *matHeaderCellDef>性别</th>
            <td mat-cell *matCellDef="let m">{{ genderText(m.gender) }}</td>
          </ng-container>
          <ng-container matColumnDef="age">
            <th mat-header-cell *matHeaderCellDef>年龄</th>
            <td mat-cell *matCellDef="let m">{{ m.age }}</td>
          </ng-container>
          <ng-container matColumnDef="joinDate">
            <th mat-header-cell *matHeaderCellDef>加入日期</th>
            <td mat-cell *matCellDef="let m">{{ m.joinDate.slice(0, 10) }}</td>
          </ng-container>
          <ng-container matColumnDef="booksRead">
            <th mat-header-cell *matHeaderCellDef>读完</th>
            <td mat-cell *matCellDef="let m">{{ m.booksRead }} 本</td>
          </ng-container>
          <ng-container matColumnDef="speeches">
            <th mat-header-cell *matHeaderCellDef>发言</th>
            <td mat-cell *matCellDef="let m">{{ m.speechesCount }} 次</td>
          </ng-container>
          <ng-container matColumnDef="contribution">
            <th mat-header-cell *matHeaderCellDef>贡献度</th>
            <td mat-cell *matCellDef="let m">{{ m.contributionScore }}</td>
          </ng-container>
          <ng-container matColumnDef="points">
            <th mat-header-cell *matHeaderCellDef>积分</th>
            <td mat-cell *matCellDef="let m">
              <span class="badge-pill badge-primary">{{ m.points }} 分</span>
            </td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>操作</th>
            <td mat-cell *matCellDef="let m">
              <button mat-icon-button (click)="openDialog(m)" title="编辑">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button (click)="onDelete(m)" title="删除">
                <mat-icon>delete</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedCols"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedCols;"></tr>
        </table>
        @if (store.members().length === 0) {
          <div class="empty-state">
            <mat-icon class="empty-state-icon">people_outline</mat-icon>
            <p>还没有会员，点击「新增会员」添加吧</p>
          </div>
        }
      </div>
    </div>
  `,
})
export class MembersComponent implements OnInit {
  displayedCols = ['name', 'gender', 'age', 'joinDate', 'booksRead', 'speeches', 'contribution', 'points', 'actions'];
  showImport = signal(false);

  constructor(
    public store: AppStore,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private memberSvc: MemberService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.queryParamMap.subscribe(p => {
      this.showImport.set(p.get('import') === 'excel');
    });
  }

  openDialog(member?: Member) {
    const ref = this.dialog.open(MemberDialogComponent, { width: '520px' });
    if (member) ref.componentInstance.setMember(member);
    ref.afterClosed().subscribe(async (ok) => {
      if (ok) {
        await this.store.loadMembers();
        this.snackBar.open('已保存', 'OK', { duration: 1500 });
      }
    });
  }

  async onDelete(m: Member) {
    if (!confirm(`确定删除会员「${m.name}」？\n该会员的所有进度、投票、兑换、通知等数据将一并删除。`)) return;
    const wasCurrent = m.id === this.store.currentMemberId();
    await this.memberSvc.remove(m.id);
    await this.store.loadMembers();
    if (wasCurrent && this.store.members().length > 0) {
      this.store.setCurrentMember(this.store.members()[0].id);
    }
    await this.store.loadSessions();
    await this.store.loadProgresses();
    await this.store.loadExchanges();
    if (this.store.currentMemberId()) {
      await this.store.loadNotifications();
    }
    this.snackBar.open('已删除', 'OK', { duration: 1500 });
  }

  async addSpeech() {
    if (!this.store.currentMember()) {
      this.snackBar.open('请先选择当前会员', 'OK', { duration: 1500 });
      return;
    }
    await this.memberSvc.addSpeechPoints(this.store.currentMemberId());
    await this.store.loadMembers();
    this.snackBar.open('已登记发言，+5 积分', 'OK', { duration: 1500 });
  }

  async onFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws);
      const toImport: Partial<Member>[] = rows.map(r => ({
        name: String(r['姓名'] ?? r['name'] ?? ''),
        gender: ({ '男': 'male', '女': 'female' } as any)[String(r['性别'] ?? r['gender'] ?? '')] ?? 'other',
        age: Number(r['年龄'] ?? r['age'] ?? 0),
        wechatId: String(r['微信号'] ?? r['wechat'] ?? ''),
        phone: String(r['手机'] ?? r['phone'] ?? ''),
      })).filter(x => x.name);
      if (toImport.length === 0) {
        this.snackBar.open('未解析到有效数据', 'OK', { duration: 2000 });
        return;
      }
      await this.memberSvc.bulkCreate(toImport);
      await this.store.loadMembers();
      this.snackBar.open(`成功导入 ${toImport.length} 人`, 'OK', { duration: 2000 });
    } catch (e) {
      this.snackBar.open('导入失败：' + (e as Error).message, 'OK', { duration: 3000 });
    }
    input.value = '';
  }

  genderText(g: string): string {
    return { male: '男', female: '女', other: '其他' }[g] ?? g;
  }
}
