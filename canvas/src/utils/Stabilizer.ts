/**
 * Stabilizer for smoothing pen input with minimal lag.
 * Uses exponential moving average to smooth out jitter while maintaining responsiveness.
 */
export class Stabilizer {
    private point: { x: number; y: number } | null = null;
    private weight = 0.2;

    reset() {
        this.point = null;
    }

    update(x: number, y: number): { x: number; y: number } {
        if (!this.point) {
            this.point = { x, y };
        } else {
            this.point.x = this.point.x * this.weight + x * (1 - this.weight);
            this.point.y = this.point.y * this.weight + y * (1 - this.weight);
        }
        return this.point;
    }
}
