import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  standalone: true,
  templateUrl: './page-header.html',
  styleUrl: './page-header.scss',
})
export class PageHeader {
  @Input({ required: true }) title = '';
  @Input() subtitle = '';
}
