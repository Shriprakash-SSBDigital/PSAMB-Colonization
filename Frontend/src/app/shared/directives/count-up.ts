
import { Directive, ElementRef, Input, OnChanges } from '@angular/core';

@Directive({
  selector: '[appCountUp]',
  standalone: true
})
export class CountUp implements OnChanges {

  @Input() appCountUp: number = 0;
  @Input() appCountUpSuffix = '';

  constructor(private el: ElementRef) {}

  ngOnChanges(): void {
    const target = Number(this.appCountUp);
    const duration = 1500;
    const startTime = performance.now();

    const animate = (time: number) => {
      const progress = Math.min((time - startTime) / duration, 1);
      const value = Math.round(target * progress);

      this.el.nativeElement.textContent = `${value.toLocaleString('en-IN')}${this.appCountUpSuffix}`;

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }
}
