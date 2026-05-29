import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SessionService } from './core/auth/session.service';
import { AuthStatus } from './core/auth/auth.models';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastModule, ProgressSpinnerModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly session = inject(SessionService);
  protected readonly AuthStatus = AuthStatus;
}
