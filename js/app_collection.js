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
    app.view_table = new view_table(app.current_data);
    
    document.getElementById("fs_table").innerHTML = app.view_table.getTable();
}
