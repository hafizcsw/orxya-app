export function throttle<T extends (...args: any[]) => void>(fn: T, wait = 250) {
  let last = 0, timer: any = null, lastArgs: any[] | null = null;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - last >= wait) {
      last = now;
      fn(...args);
    } else {
      lastArgs = args;
      clearTimeout(timer);
      timer = setTimeout(() => {
        last = Date.now();
        fn(...(lastArgs as Parameters<T>));
        lastArgs = null;
      }, wait - (now - last));
    }
  };
}
