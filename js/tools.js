function getFieldNames(objects) {
    const fields = new Set();
    for (const obj of objects) {
        Object.keys(obj).forEach(key => fields.add(key));
    }
    return Array.from(fields);
}

function int16float(v) {
    if (v > 32767)
        return -(65536 - v) / 32768;
    return v / 32768;
}

function v_minmax_amp(data) {
    let min = 1e30, max = -1e30;
    for (let k = 0; k < data[0].length; k++) {
        let v = Math.sqrt(data[0][k] * data[0][k] + data[1][k] * data[1][k]);
        if (v < min) min = v;
        if (v > max) max = v;
    }
    return { min: min, max: max };
}

function v_ones(len, val = 1) {
    return Array(len).fill(val);
}

function v_zeros(len) {
    return Array(len).fill(0);
}

function v_slice(v, start, end) {
    if (v.length == 2) // iq vector
    {
        return [v[0].slice(start, end), v[1].slice(start, end)];
    }
    return v.slice(start, end);
}

function v_diff(v) {
    for (let i = 0; i < v.length - 1; i++)
        v[i] = v[i + 1] - v[i];
    v[v.length - 1] = 0;
    return v;
}

function v_sort(v) {
    return v.sort((a, b) => a - b);
}

function v_uniq(v) {
    var r = [];
    for (var i = 0; i < v.length - 1; i++)
        if (v[i] != v[i + 1]) r.push(v[i]);
    return r;
}

function v_set(v, value, start, end)
// set values inside v[start...end-1] = v;
{
    v.fill(value, start, end);

    return v;
}

function hsvToRgb(h, s, v) {
    s /= 100;
    v /= 100;

    let k = (n) => (n + h / 60) % 6;
    let f = (n) => v - v * s * Math.max(0, Math.min(k(n), 4 - k(n), 1));

    return [
        Math.round(255 * f(5)), // Czerwony (R)
        Math.round(255 * f(3)), // Zielony (G)
        Math.round(255 * f(1))  // Niebieski (B)
    ];
}

function val2html(x) {
    if (x.length)
        return "[" + x + ']';

    return x + "";

}

function genCfgTable(prefix, names, values) {
    ret = "<table>";

    for (let i = 0; i < names.length; i++) {
        ret += "<TR><TD>" + names[i] + "</TD>"+
           "<TD><input type='text' id='" + prefix + "__" + names[i] + "' placeholder='0' value='" +
            val2html(values[i]) +
            "'></TD></TR>\n";
    }
    ret += "</table>";
    return ret;
}


function getCfgTable( prefix, names, values )
{
    let ret = {};
    for( let i=0; i<names.length; i++)
    {
        let x = document.getElementById( prefix+'__'+names[i]).value;
        if (Array.isArray(values[i]))
            x = JSON.parse(x);
        else   
            x = Number(x);

        ret[names[i]] = x;
    }
    return ret;
}

function setCfgTable( prefix, cfg )
{
    let ret = {};

    Object.keys(cfg).forEach(key => {
        try {
            document.getElementById( prefix+'__'+key).value = cfg[key];
        }
        catch(e)
        {
            debug("setCfgTable error: "+e);
        }

    });
    return ret;    
}

/**
 * Draw an arrow with an optional arrowhead at either end and a rotated label.
 *
 * Example:
 * drawArrow(
 *     ctx,
 *     xpos - 10,
 *     this.y0,
 *     xpos - 10,
 *     this.y0 + this.sy * this.height,
 *     "Frequency"
 * );
 */
function drawArrow(ctx, x1, y1, x2, y2, text = "", options = {}) {
    const {
        startArrow = true,
        endArrow = true,
        headLength = 8,
        headAngle = Math.PI / 6,
        textOffset = -12,
        lineWidth = 1,
        font = "16px sans-serif",
        textAlign = "center",
        textBaseline = "middle",
        strokeStyle = "#ffffff",
        fillStyle = strokeStyle
    } = options;

    const angle = Math.atan2(y2 - y1, x2 - x1);
    const length = Math.hypot(x2 - x1, y2 - y1);

    if (length === 0) {
        return;
    }

    ctx.save();

    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = strokeStyle;
    ctx.fillStyle = fillStyle;
    ctx.font = font;

    // Main line
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    function drawArrowHead(x, y, direction) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(
            x - headLength * Math.cos(direction - headAngle),
            y - headLength * Math.sin(direction - headAngle)
        );
        ctx.lineTo(
            x - headLength * Math.cos(direction + headAngle),
            y - headLength * Math.sin(direction + headAngle)
        );
        ctx.closePath();
        ctx.fill();
    }

    if (endArrow) {
        drawArrowHead(x2, y2, angle);
    }

    if (startArrow) {
        drawArrowHead(x1, y1, angle + Math.PI);
    }

    if (text) {
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;

        // Unit vector perpendicular to the arrow.
        const perpendicularX = -Math.sin(angle);
        const perpendicularY = Math.cos(angle);

        const textX = midX + perpendicularX * textOffset;
        const textY = midY + perpendicularY * textOffset;

        // Avoid rendering the label upside down.
        let textAngle = angle;
        if (textAngle > Math.PI / 2 || textAngle < -Math.PI / 2) {
            textAngle += Math.PI;
        }

        ctx.translate(textX, textY);
        ctx.rotate(textAngle);

        ctx.textAlign = textAlign;
        ctx.textBaseline = textBaseline;
        ctx.fillText(text, 0, 0);
    }

    ctx.restore();
}


function download(filename, text) {
    const blob = new Blob([text], {
        type: "text/plain;charset=utf-8"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
}

function getFile(filename, handler, magic) 
{
    fetch(filename)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to fetch "${filename}": ${response.status} ${response.statusText}`);
            }
            return response.arrayBuffer();
        })
        .then(buffer => {
            handler(filename, magic, buffer);
        })
        .catch(error => {
            console.error(error);
            handler(filename, magic, null);
        });
}

function isServer() {
    return window.location.protocol !== "file:";
}

function runScriptHandler(filename, magic, content) {
    if (!content) {
        console.error(`Failed to load script: ${filename}`);
        return;
    }

    try {
        const source = new TextDecoder("utf-8").decode(content);

        // Execute in global scope
        (0, eval)(source);
    } catch (e) {
        console.error(`Error executing ${filename}:`, e);
    }
}

function runScript( filename )
{
    debug("running script: "+filename);
    getFile( filename, runScriptHandler, 0 );
}

let audioContext = null;
let currentSource = null;

function play(data, sampleRate) {
    if (!data || !data.length) {
        return;
    }

    if (!Number.isFinite(sampleRate) || sampleRate <= 0) {
        throw new Error("Invalid sample rate");
    }

    audioContext ??= new AudioContext();

    // Stop previous playback
    if (currentSource) {
        try {
            currentSource.stop();
        } catch (_) {}

        currentSource.disconnect();
        currentSource = null;
    }

    /*
     * Accept:
     *   Float32Array
     *   Float64Array
     *   regular Array
     *
     * Samples are expected to be normalized to -1.0 ... +1.0.
     */
    const buffer = audioContext.createBuffer(
        1,              // mono
        data.length,
        sampleRate
    );

    const channel = buffer.getChannelData(0);

    if (data instanceof Float32Array) {
        channel.set(data);
    } else {
        for (let i = 0; i < data.length; i++) {
            channel[i] = Math.max(-1, Math.min(1, data[i]));
        }
    }

    const source = audioContext.createBufferSource();

    source.buffer = buffer;
    source.connect(audioContext.destination);

    source.onended = () => {
        if (currentSource === source) {
            currentSource = null;
        }

        source.disconnect();
    };

    currentSource = source;

    // Needed when AudioContext was suspended by browser policy
    audioContext.resume().then(() => {
        source.start();
    });
}