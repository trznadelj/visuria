var app = {
    current_data: 0,
    collection: [],
    fileLoaders: {}
};


function app_init() 
{
    let app_canvas_context = document.getElementById("fs_main_canvas").getContext("2d");

    app_canvas_context.canvas.addEventListener('mousemove', (event) => app.curr_view.onMouseMove(event));
    app_canvas_context.canvas.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        app.curr_view.onRightClick(event);
    });
    app_canvas_context.canvas.addEventListener('mousedown', (event) => app.curr_view.onMouseButtonDown(event));
    app_canvas_context.canvas.addEventListener('wheel', (event) => app.curr_view.onMouseWheel(event));
    app_canvas_context.canvas.addEventListener('mouseup', (event) => app.curr_view.onMouseButtonUp(event));

    if (!isServer())
        document.getElementById('demo').hidden = true;
}


function app_addToCollection(data, type, name) 
{
    app.collection.push({ name: name, type: type, data: data });
}


function app_getByType(type) 
{
    let results = [];

    for (let i = 0; i < app.collection.length; i++) {
        const item = app.collection[i];
        if (item.type == type) {
            results.push(item);
        }
    }

    return results;
}

function app_openLoadDialog(file) 
{
    $("#file_dialog").dialog("open");
    document.getElementById('file_dialog__filename').innerHTML = file.name;
    var type = app_guessFileTypeByName(file.name);
    document.getElementById('file_dialog__file_type').value = type;
}

function app_onFileLoadClicked() 
{
    const reader = new FileReader();
    reader.onload = (evt) => {
        const contents = evt.target.result;
        const type = document.getElementById('file_dialog__file_type').value;
        app_onFileLoad(g_file, contents, type);
    };
    reader.readAsArrayBuffer(g_file);
}

function app_onKeyDown(key, ctrl, alt) 
{
    if (27 == key) { app.curr_view.cancelZoom(); app.curr_view.onRender(); }
}

function app_onKeyUp(key, ctrl, alt) 
{
}


function js_onKeyDownHnd(e) {
    key = -1;

    switch (emod) {
        case "IE4+":
            e = window.event;
            if ((e.keyCode < 16) || (e.keyCode > 18)) {
                key = e.keyCode;
            }
            break;
        case "NN4":
            if ((e.which) && (e.which != 0)) {
                key = e.which;
            }
            break;
        case "W3C":
            if ((e.which < 16) || (e.which > 18)) {
                key = e.which;
            }
            break;
    }

    return app_onKeyDown(key, e.ctrlKey, e.altKey);
}

function js_onKeyUpHnd(e) {
    key = -1;

    switch (emod) {
        case "IE4+":
            e = window.event;
            if ((e.keyCode < 16) || (e.keyCode > 18)) {
                key = e.keyCode;
            }
            break;
        case "NN4":
            if ((e.which) && (e.which != 0)) {
                key = e.which;
            }
            break;
        case "W3C":
            if ((e.which < 16) || (e.which > 18)) {
                key = e.which;
            }
            break;
    }

    return app_onKeyUp(key, e.ctrlKey, e.altKey);
}

function js_InitKeyboard(e) {
    /*get the event model*/
    emod = (e) ? (e.eventPhase) ? "W3C" : "NN4" : (window.event) ? "IE4+" : "unknown";

    if (emod == "NN4") {
        document.captureEvents(Event.KEYDOWN);
    }

    document.onkeydown = js_onKeyDownHnd;
    document.onkeyup = js_onKeyUpHnd;

    return true;
}

function app_windowOnloadHnd(e) {
    js_InitKeyboard(e);
    app_init();
}