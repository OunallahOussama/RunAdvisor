/**
 * Detect double-tap (touch) or rely on native dblclick (mouse).
 */
export function createDoubleActivateHandler(onActivate) {
  let lastTapAt = 0;

  return {
    onDoubleClick: (event) => {
      event.preventDefault();
      event.stopPropagation();
      onActivate?.(event);
    },
    onTouchEnd: (event) => {
      const now = Date.now();
      if (now - lastTapAt < 400) {
        event.preventDefault();
        event.stopPropagation();
        onActivate?.(event);
        lastTapAt = 0;
      } else {
        lastTapAt = now;
      }
    }
  };
}
