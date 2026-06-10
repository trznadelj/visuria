function app_onFileLoad_tensor(view, json_description) {
    const binBuf = view.buffer;
    const manifest = json_description;

    function getTensor(name) {
        const info = manifest.tensors[name];
        if (!info) throw new Error("Missing tensor " + name);
        const { offset, nbytes, shape } = info;
        const f32 = new Float32Array(binBuf, offset, nbytes / 4);
        return { data: f32, shape };
    }

    return {
        manifest,
        t: getTensor,
    };
}

function app_onFileLoad_tensor_all(view) 
{
    var r = app_getByType("json");
    if (r.length == 0) {
        debug("No JSON description for binary file found in collection.");
        return;
    }

    return app_onFileLoad_tensor(view, r[0].data);
}

function app_onFileType_tensor(name) {
    if (name.endsWith(".bin"))
        return "bin";
    return "unknown";
}

app_registerFileLoader(app_onFileLoad_tensor_all, app_onFileType_tensor, "bin");