function app_registerFileLoader( onLoadFunction, fileTypeFunction, fileType )
{
    app.fileLoaders[fileType] = {
        onLoad: onLoadFunction,
        fileType: fileTypeFunction
    };
    debug("Registered file loader for type: " + fileType);
}


function app_guessFileTypeByName( name )
{
    // iterate over registered file loaders   
    for (const key in app.fileLoaders) {
        const loader = app.fileLoaders[key];
        const fileType = loader.fileType(name);
        if (fileType !== "unknown") {
            return fileType;
        }
    }

    return "unknown";    
}


function app_onFileLoad( file, content )
{
    const dataView = new DataView(content); 
    const fileType = app_guessFileTypeByName( file.name );

    if (fileType == "unknown")
    {
        debug("Unknown file type for file: " + file.name);
        return;
    }

    debug("File: "+ file.name +" " + fileType + " " + file.size + " bytes" );
    let fileLoader = app.fileLoaders[fileType];
    D = app.current_data = fileLoader.onLoad( dataView );
    app_addToCollection( app.current_data, fileType, file.name );


    switch(fileType) 
    {
        case 'iq':
            app_view_time_iq = new view_time_iq(app.current_data);
            app_view_time_iq.setContext( document.getElementById("fs_main_canvas").getContext("2d") );
            app_view_time_iq.onRender();
            app.view_time = app_view_time_iq;
            break;
        case 'freqiq':
            app_view_freq_iq = new view_freq_iq(app.current_data);
            app_view_freq_iq.setConfig( { num_sc: 600 } );
            app_view_freq_iq.setContext( document.getElementById("fs_main_canvas").getContext("2d") );
            app_view_freq_iq.onRender();
            app.view_freq = app_view_freq_iq;
            break;
        case 'csv':
            app_view_table = new view_table(app.current_data);
            document.getElementById("fs_table").innerHTML = app_view_csv.getTable();
            app.view_table = app_view_table;
            break;
        default:
            debug("No view available for file type: " + fileType);
            break;
    }

    $('#dropzone').hide();
    $('#fs_main').show();
}
