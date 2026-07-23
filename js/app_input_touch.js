// ── Pointer events layer ────────────────────────────────────────
// Bridges both mouse and touch input to the same view-* handlers
// via the Pointer Events API (pointerdown/pointermove/pointerup).

// Track active pointers for multi-touch / pinch-zoom support.
let app_ptrState = {
    pointers: {},            // pointerId → { clientX, clientY, isMouse }
    mouseDown: false,        // mouse button state (synthetic clicks from touch)
    pinchDist: 0,            // initial distance between two pointers (px)
    pinchZoomSx: 1,          // zoom x at pinch start
    pinchZoomSy: 1,          // zoom y at pinch start
    longPressTimer: null,    // setTimeout id for long-press detection
    longPressFired: false,   // true once contextmenu was dispatched
};

const APP_LONG_PRESS_MS = 500;

function app_clearLongPress() {
    if (app_ptrState.longPressTimer) {
        clearTimeout(app_ptrState.longPressTimer);
        app_ptrState.longPressTimer = null;
    }
    app_ptrState.longPressFired = false;
}

// Get canvas-relative coordinates from a pointer event.
function app_ptrOffset(event) {
    const rect = event.target.getBoundingClientRect();
    return { offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top };
}

function app_onPointerDown(event) {
    console.debug('ptr-down', event.pointerType);
    event.preventDefault();

    const view = app.curr_view;
    if (!view) return;

    const id = event.pointerId;
    app_ptrState.pointers[id] = { clientX: event.clientX, clientY: event.clientY, isMouse: event.pointerType === 'mouse' };

    const n = Object.keys(app_ptrState.pointers).length;

    if (n === 1 && event.pointerType !== 'mouse') {
        // First touch finger: start drag, arm long-press
        app_clearLongPress();
        app_ptrState.longPressTimer = setTimeout(() => {
            if (Object.keys(app_ptrState.pointers).length === 1) {
                app_ptrState.longPressFired = true;
                const o = app_ptrOffset(event);
                view.onRightClick({ offsetX: o.offsetX, offsetY: o.offsetY });
            }
        }, APP_LONG_PRESS_MS);

        const o = app_ptrOffset(event);
        view.onMouseButtonDown({ offsetX: o.offsetX, offsetY: o.offsetY });
        app_ptrState.mouseDown = true;
    } else if (n === 1 && event.pointerType === 'mouse') {
        // Mouse: just forward untouched
        const o = app_ptrOffset(event);
        view.onMouseButtonDown({ offsetX: o.offsetX, offsetY: o.offsetY });
        app_ptrState.mouseDown = true;
    } else if (n >= 2) {
        // Two+ touch pointers: cancel drag, start pinch tracking
        app_clearLongPress();
        view.onMouseButtonUp({});
        app_ptrState.mouseDown = false;

        const ids = Object.keys(app_ptrState.pointers);
        const p0 = app_ptrState.pointers[ids[0]];
        const p1 = app_ptrState.pointers[ids[1]];
        app_ptrState.pinchDist = Math.hypot(p0.clientX - p1.clientX, p0.clientY - p1.clientY);
        app_ptrState.pinchZoomSx = view.sx;
        app_ptrState.pinchZoomSy = view.sy;
    }
}

function app_onPointerMove(event) {
    event.preventDefault();

    const view = app.curr_view;
    if (!view) return;

    const id = event.pointerId;
    const was = app_ptrState.pointers[id];
    if (!was) return; // pointer not tracked (shouldn't happen)

    const dx = event.clientX - was.clientX;
    const dy = event.clientY - was.clientY;
    was.clientX = event.clientX;
    was.clientY = event.clientY;

    // Cancel long-press on significant movement
    if (app_ptrState.longPressTimer && Math.hypot(dx, dy) > 8) {
        app_clearLongPress();
    }

    const n = Object.keys(app_ptrState.pointers).length;

    if (n === 1 && app_ptrState.mouseDown) {
        // Single-pointer drag
        const o = app_ptrOffset(event);
        view.onMouseMove({ offsetX: o.offsetX, offsetY: o.offsetY });
    } else if (n >= 2) {
        // Multi-touch pinch → zoom
        const ids = Object.keys(app_ptrState.pointers);
        const p0 = app_ptrState.pointers[ids[0]];
        const p1 = app_ptrState.pointers[ids[1]];
        const dist = Math.hypot(p0.clientX - p1.clientX, p0.clientY - p1.clientY);

        if (app_ptrState.pinchDist > 0) {
            const ratio = dist / app_ptrState.pinchDist;
            view.sx = app_ptrState.pinchZoomSx * ratio;
            view.sy = app_ptrState.pinchZoomSy * ratio;
            view.onRender();
        }
    }
}

function app_onPointerUp(event) {
    event.preventDefault();

    const view = app.curr_view;
    const id = event.pointerId;
    delete app_ptrState.pointers[id];

    const remaining = Object.keys(app_ptrState.pointers).length;

    if (remaining === 0) {
        if (!app_ptrState.longPressFired && app_ptrState.mouseDown && view) {
            const o = app_ptrOffset(event);
            view.onMouseButtonUp({ offsetX: o.offsetX, offsetY: o.offsetY });
        }
        app_ptrState.mouseDown = false;
        app_ptrState.pinchDist = 0;
        app_clearLongPress();
    } else if (remaining === 1) {
        // Went from multi-touch to single: start a new drag
        app_ptrState.pinchDist = 0;
        app_clearLongPress();
        app_ptrState.mouseDown = true; // finger is still touching
        const ids = Object.keys(app_ptrState.pointers);
        const p = app_ptrState.pointers[ids[0]];
        const o = { offsetX: p.clientX - event.target.getBoundingClientRect().left,
                    offsetY: p.clientY - event.target.getBoundingClientRect().top };
        view.onMouseButtonDown(o);
    }
}

function app_onPointerCancel(event) {
    event.preventDefault();
    const id = event.pointerId;
    delete app_ptrState.pointers[id];
    app_ptrState.mouseDown = false;
    app_ptrState.pinchDist = 0;
    app_clearLongPress();
}
