const reported = new Set();
let sink = null;
export const setErrorSink = (callback)=>{
    sink = callback;
};
export const resetGuard = ()=>reported.clear();
export function reportOnce(name, error) {
    if (reported.has(name)) return;
    reported.add(name);
    console.error(`[${name}]`, error);
    sink?.(name, error);
}
export function guard(name, run) {
    try {
        run();
    } catch (error) {
        reportOnce(name, error);
    }
}
