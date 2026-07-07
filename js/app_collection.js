function app_registerFileLoader( onLoadFunction, fileTypeFunction, fileType )
{
    app.fileLoaders[fileType] = {
        onLoad: onLoadFunction,
        fileType: fileTypeFunction
    };
    debug("Registered file loader for type: " + fileType);
}


function app_setTitle( title )
{
    document.title = title;
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

function app_setView( view )
{
    switch( view )
    {
        case 'time':
            app.view_time.setContext( document.getElementById("fs_main_canvas").getContext("2d") );
            app.view_time.onRender();
            break;
        case 'freq':
            app.view_freq.setContext( document.getElementById("fs_main_canvas").getContext("2d") );
            app.view_freq.onRender();
            break;
    }
}

function time_to_freq( time_data, sym_starts, fft_size, num_sc )
{
    let f = [[], []];
    for (let i = 1; i < sym_starts.length; i += 2) {
        let sym_time = v_slice(time_data, sym_starts[i], sym_starts[i + 1]);
        let sym_freq = fft(sym_time, 0);

        // add samples from sym_freq[] to f[0]
        f[0] = f[0].concat(sym_freq[0].slice(fft_size - num_sc/2, fft_size)).concat(sym_freq[0].slice(0, num_sc/2));
        f[1] = f[1].concat(sym_freq[1].slice(fft_size - num_sc/2, fft_size)).concat(sym_freq[1].slice(0, num_sc/2));
    }
    return f;
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

    app_setTitle( "Visuria - " + file.name );

    let fileLoader = app.fileLoaders[fileType];
    D = app.current_data = fileLoader.onLoad( dataView );
    app_addToCollection( app.current_data, fileType, file.name );

    switch(fileType) 
    {
        case 'iq':
            let config = {
                num_sc: Number(document.getElementById('file_dialog__num_sc').value),
                fft_size: Number(document.getElementById('file_dialog__fft_size').value),
                u: Number(document.getElementById('file_dialog__NR_u').value),
                cp_map: JSON.parse(document.getElementById('file_dialog__cp_map').value) };
            app_view_time_iq = new view_time_iq(app.current_data);
            app_view_time_iq.setConfig( config );
            //app_view_time_iq.setContext( document.getElementById("fs_main_canvas").getContext("2d") );
            
            //app_view_time_iq.onRender();
            app.view_time = app_view_time_iq;

            // Convert time-domain data to frequency domain
            let f = time_to_freq(app.current_data, app_view_time_iq.sym_starts, config.fft_size, config.num_sc);

            app_view_freq_iq = new view_freq_iq(f);
            app_view_freq_iq.setConfig( config );
            app_view_freq_iq.setContext( document.getElementById("fs_main_canvas").getContext("2d") );
            app_view_freq_iq.onRender();
            app.view_freq = app_view_freq_iq;

            break;

        case 'freqiq':
            app_view_freq_iq = new view_freq_iq(app.current_data);
            app_view_freq_iq.setConfig( { num_sc: Number(document.getElementById('file_dialog__num_sc').value) } );
            app_view_freq_iq.setContext( document.getElementById("fs_main_canvas").getContext("2d") );
            app_view_freq_iq.onRender();
            app.view_freq = app_view_freq_iq;
            break;

        case 'csv':
            app_view_table = new view_table(app.current_data);
            document.getElementById("fs_table").innerHTML = app_view_csv.getTable();
            app.view_table = app_view_table;
            break;

        case 'pcap':
            break;

        default:
            debug("No view available for file type: " + fileType);
            break;
    }

    $('#dropzone').hide();
    $('#fs_main').show();
}
