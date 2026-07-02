function app_onFileLoad_iq16bit( view, json_description )
{
    const bytes   = new Uint8Array( view.buffer );
    const len     = bytes.length;
    const samples = Math.floor(len/4);
    var _time_i = [];
    var _time_q = [];
    var k       = 0;

    for( var n=0; n<len; n+=4, k++)
    {
      var _c_i=bytes[n  ]*256+bytes[n+1];
      var _c_q=bytes[n+2]*256+bytes[n+3];
      _time_i[k]=int16float(_c_i);
      _time_q[k]=int16float(_c_q);
    }

    debug("app_onFileLoad_iq16bit: Loaded " + k +" samples");
    return [ _time_i, _time_q ];
}


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

function app_onFileType_iq16bit(name) {
    if (name.endsWith(".iq"))
        return "iq";
    return "unknown";
}

function app_onFileType_iq16bit_freq(name) {
    if (name.endsWith(".freqiq"))
        return "freqiq";
    return "unknown";
}

app_registerFileLoader(app_onFileLoad_iq16bit, app_onFileType_iq16bit, "iq");
app_registerFileLoader(app_onFileLoad_iq16bit, app_onFileType_iq16bit_freq, "freqiq");