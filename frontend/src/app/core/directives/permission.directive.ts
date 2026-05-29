import {
  Directive,
  ElementRef,
  Input,
  OnChanges,
  OnInit,
  Renderer2,
  inject,
} from '@angular/core';
import { SessionService } from '../auth/session.service';

/**
 * Hides elements when the current role lacks module access.
 * Usage: `*appPermission="'orders:write'"` or `*appPermission="'orders'"` (read).
 */
@Directive({
  selector: '[appPermission]',
  standalone: true,
})
export class PermissionDirective implements OnInit, OnChanges {
  @Input({ required: true }) appPermission!: string;

  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly renderer = inject(Renderer2);
  private readonly session = inject(SessionService);

  ngOnInit(): void {
    this.apply();
  }

  ngOnChanges(): void {
    this.apply();
  }

  private apply(): void {
    const [module, action] = this.appPermission.split(':');
    const allowed =
      action === 'write' ? this.session.canWrite(module) : this.session.canAccess(module);

    if (allowed) {
      this.renderer.setStyle(this.el.nativeElement, 'display', '');
    } else {
      this.renderer.setStyle(this.el.nativeElement, 'display', 'none');
    }
  }
}
