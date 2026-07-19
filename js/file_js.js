function app_onFileLoad_js(view) 
{
    let decoder = new TextDecoder("utf-8");
    let text = decoder.decode(view.buffer);
    return eval(text);
}

function app_onFileType_js( name )
{
    if ( name.endsWith(".js") )
        return "js";
    return "unknown";
}

app_registerFileLoader( app_onFileLoad_js, app_onFileType_js, "js", "js" );