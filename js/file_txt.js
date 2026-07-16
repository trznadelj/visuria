function app_onFileLoad_txt(view) 
{
    let decoder = new TextDecoder("utf-8");
    let text = decoder.decode(view.buffer);

    let v_i = [], v_q = [], n = "", sign = 1, vi = 0;
    for (let i = 0; i < text.length; i++) {
        let next_sign = 1;
        switch (text[i]) {
            case '.':
            case '0':
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
            case '7':
            case '8':
            case '9':
                n += text[i];
                continue;

            case '-':
                next_sign = - 1;
                if (!n.length) sign = next_sign;
            default:
            case '+':
                if (n.length)
                {
                    let num = sign * Number(n);
                    n = "";
                    sign = next_sign;
                    if (vi & 1) v_q.push(num); else v_i.push(num);
                    vi++;
                }
            break;
        }
    }

    return [v_q, v_i];
}

function app_onFileType_txt(name)
{
    if ((name.endsWith(".ascii")) || (name.endsWith(".txt")))
        return "txt";
    return "unknown";
}

app_registerFileLoader(app_onFileLoad_txt, app_onFileType_txt, "txt", "TXT");
app_registerFileLoader(app_onFileLoad_txt, app_onFileType_txt, "freqtxt", "TXT - FREQ");