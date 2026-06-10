function app_onFileLoad_json( view )
{
    // Convert DataView to string
    let decoder = new TextDecoder("utf-8");
    let jsonString = decoder.decode( view.buffer);
    
    const json = JSON.parse(jsonString);
    return json;
}

function app_onFileType_json( name )
{
    if ( name.endsWith(".json") )
        return "json";
    return "unknown";
}

app_registerFileLoader( app_onFileLoad_json, app_onFileType_json, "json" );