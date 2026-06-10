function app_onFileLoad_csv( view )
{
    let decoder = new TextDecoder("utf-8");
    let text = decoder.decode( view.buffer);
    let lines = text.split("\n");
    let names = lines[0].split(',');

    let Q=[];
    for ( let i=1; i<lines.length; i++) {
        let fields = lines[i].split(',');
        let O={};
        for( let j=0; j<names.length; j++)
            O[names[j]]=fields[j];
        Q.push(O);
    }

    return Q;
}

function app_onFileType_csv( name )
{
    if ( name.endsWith(".csv") )
        return "csv";
    return "unknown";
}

app_registerFileLoader( app_onFileLoad_csv, app_onFileType_csv, "csv" );