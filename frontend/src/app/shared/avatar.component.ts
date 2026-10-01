import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const PALETTE = ['#4f46e5', '#0e9384', '#c4320a', '#7a5af8', '#0086c9', '#c11574', '#3e7c17', '#b54708'];

/** Initials avatar with a colour derived from the email so a person always looks the same. */
@Component({
  selector: 'app-avatar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span
    class="avatar"
    [style.width.px]="size()"
    [style.height.px]="size()"
    [style.font-size.px]="size() * 0.4"
    [style.background]="color()"
    [attr.title]="label() || email()"
    >{{ initials() }}</span
  >`,
  styles: `
    .avatar {
      display: inline-grid;
      place-items: center;
      border-radius: 50%;
      color: #fff;
      font-weight: 600;
      letter-spacing: 0.02em;
      flex: none;
      box-shadow: 0 0 0 2px var(--surface);
      user-select: none;
    }
  `,
})
export class AvatarComponent {
  email = input<string | null>('');
  label = input<string | null>('');
  size = input(28);

  initials = computed(() => {
    const source = (this.label() || this.email() || '?').split('@')[0];
    const parts = source.split(/[\s._-]+/).filter(Boolean);
    const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : source.slice(0, 2);
    return letters.toUpperCase();
  });

  color = computed(() => {
    const key = (this.email() || this.label() || '').toLowerCase();
    let hash = 0;
    for (const ch of key) {
      hash = (hash * 31 + ch.charCodeAt(0)) | 0;
    }
    return PALETTE[Math.abs(hash) % PALETTE.length];
  });
}
