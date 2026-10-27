// In-engine entrance, two swats, then exit. Combat freezes while the strike runs.
export class Dad {
  constructor(camX, y) { this.x = camX - 100; this.startX = this.x; this.y = y; this.age = 0; this.state = 'run'; this.resolved = false; this.gone = false; }
  update(dt, resolve) {
    const before = this.age; this.age += dt;
    this.x = this.startX + this.age * 560;
    this.state = (this.age > .45 && this.age < 1) || (this.age > 1.25 && this.age < 1.8) ? 'swat' : 'run';
    if (before < .65 && this.age >= .65 && !this.resolved) { this.resolved = true; resolve(); }
    this.gone = this.age >= 2.7;
  }
}
