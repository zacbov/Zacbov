export class GameLoop {
    callbacks;
    stepSeconds;
    accumulator = 0;
    last = 0;
    handle = 0;
    running = false;
    paused = false;
    maxFrameSeconds = 0.25;
    constructor(callbacks, stepHz = 60){
        this.callbacks = callbacks;
        this.stepSeconds = 1 / stepHz;
    }
    start() {
        if (this.running) return;
        this.running = true;
        this.last = performance.now();
        const frame = (now)=>{
            if (!this.running) return;
            this.handle = requestAnimationFrame(frame);
            const frameSeconds = Math.min((now - this.last) / 1000, this.maxFrameSeconds);
            this.last = now;
            try {
                this.callbacks.beforeFrame?.(frameSeconds);
                if (!this.paused) {
                    this.accumulator += frameSeconds;
                    while(this.accumulator >= this.stepSeconds){
                        this.callbacks.step(this.stepSeconds);
                        this.accumulator -= this.stepSeconds;
                    }
                }
                this.callbacks.render(this.paused ? 1 : this.accumulator / this.stepSeconds, frameSeconds);
            } catch (error) {
                this.resetAccumulator();
                throw error;
            }
        };
        this.handle = requestAnimationFrame(frame);
    }
    stop() {
        this.running = false;
        cancelAnimationFrame(this.handle);
    }
    resetAccumulator() {
        this.accumulator = 0;
        this.last = performance.now();
    }
}
