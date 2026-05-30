import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DemoModeService } from '../../core/auth/demo-mode.service';
import { ApiClientService } from '../../core/services/api-client.service';

type SetupStatus = { setupCompleted: boolean; demoMode: boolean };

@Component({
  selector: 'app-startup-page',
  standalone: true,
  imports: [ButtonModule],
  templateUrl: './startup-page.html',
  styleUrl: './startup-page.scss',
})
export class StartupPage {
  private readonly demo = inject(DemoModeService);
  private readonly api = inject(ApiClientService);
  private readonly router = inject(Router);

  readonly enteringDemo = signal(false);
  readonly demoError = signal<string | null>(null);

  async continueDemo(): Promise<void> {
    this.enteringDemo.set(true);
    this.demoError.set(null);

    try {
      // Setup routes are public — bootstrap before enabling demo header on requests.
      const status = await firstValueFrom(this.api.get<SetupStatus>('/setup/status'));
      if (!status?.demoMode) {
        await firstValueFrom(this.api.post('/setup/demo', {}));
      }
      this.demo.enterDemo();
      await this.router.navigate(['/dashboard']);
    } catch (err: unknown) {
      this.demo.exitDemo();
      this.enteringDemo.set(false);
      this.demoError.set(this.resolveDemoError(err));
    }
  }

  private resolveDemoError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 0) {
        return 'Cannot reach the backend. Start it with: npm run dev --prefix backend';
      }
      const message = (err.error as { message?: string })?.message;
      if (message) {
        return message;
      }
    }
    if (err instanceof Error && err.message) {
      return err.message;
    }
    return 'Could not start the demo sandbox.';
  }

  goToLogin(): void {
    this.demo.exitDemo();
    void this.router.navigate(['/auth/login']);
  }
}
