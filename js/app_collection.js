function app_registerFileLoader( onLoadFunction, fileTypeFunction, fileType, fileDescription )
{
    app.fileLoaders[fileType] = {
        onLoad: onLoadFunction,
        fileType: fileTypeFunction,
        fileDescription: fileDescription
    };
    debug("Registered file loader for type: " + fileType);
    document.getElementById('file_dialog__file_type').
       add(new Option( fileDescription, fileType));
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
            app.curr_view = app.view_time;
            break;

        case 'iq':
            app.view_freq.setContext( document.getElementById("fs_main_canvas").getContext("2d") );
            app.view_freq.setRenderType('iq');
            app.view_freq.onRender();            
            app.curr_view = app.view_freq;
            break;

        case 'freq':
            app.view_freq.setContext( document.getElementById("fs_main_canvas").getContext("2d") );
            app.view_freq.setRenderType('regrid');
            app.view_freq.onRender();
            app.curr_view = app.view_freq;
            break;
    }

    
}

function time_to_freq( time_data, sym_starts, fft_size, num_sc )
{
    let f = [[], []];
    for (let i = 1; i < sym_starts.length; i += 2) {
        if (sym_starts[i+1]>time_data[0].length) break;
        let sym_time = v_slice(time_data, sym_starts[i], sym_starts[i + 1]);
        let sym_freq = fft(sym_time, 0);

        // add samples from sym_freq[] to f[0]
        f[0] = f[0].concat(sym_freq[0].slice(fft_size - num_sc/2, fft_size)).concat(sym_freq[0].slice(0, num_sc/2));
        f[1] = f[1].concat(sym_freq[1].slice(fft_size - num_sc/2, fft_size)).concat(sym_freq[1].slice(0, num_sc/2));
    }
    return f;
}

function app_packet_dissector( view_pcap )
{
    let packets = view_pcap.packets;
    let ret = [];

    for( let i = 0; i < packets.length; i++ )
    {
        let pkt = packets[i];
        let ts = view_pcap.timing[i];

        let pkt_info = {
            index: i,
            timestamp: ts,
            eth_src: pkt[6].toString(16).padStart(2, '0') + ':' + pkt[7].toString(16).padStart(2, '0') + ':' + pkt[8].toString(16).padStart(2, '0') + ':' + pkt[9].toString(16).padStart(2, '0') + ':' + pkt[10].toString(16).padStart(2, '0') + ':' + pkt[11].toString(16).padStart(2, '0'),
            eth_dst: pkt[0].toString(16).padStart(2, '0') + ':' + pkt[1].toString(16).padStart(2, '0') + ':' + pkt[2].toString(16).padStart(2, '0') + ':' + pkt[3].toString(16).padStart(2, '0') + ':' + pkt[4].toString(16).padStart(2, '0') + ':' + pkt[5].toString(16).padStart(2, '0'),
            eth_type: (pkt[12] << 8 | pkt[13]).toString(16).padStart(4, '0')
        };

        ret.push(pkt_info);
    }
    return ret;
}

function app_genRbmap( config, chan_map )
{
    let num_sc = config.num_sc;
    let ant_interleaved = config.ant_interleaved;

    for( let i=0; i<chan_map.length; i++)
    {
        let symbol = Math.floor( i/(num_sc*ant_interleaved));
        let sym_in_slot = symbol%14;

        if (sym_in_slot==0) chan_map[i] = 2; else //  PDCCH / PUCCH
        if (sym_in_slot==1) chan_map[i] = 1; else //  DMRS
                            chan_map[i] = 3;      //  PDSCH

    }



    return chan_map;
}

function app_onFileLoad( file, content, fileType )
{
    const dataView = new DataView(content); 

    debug("File: "+ file.name +" " + fileType + " " + file.size + " bytes" );

    app_setTitle( "Visuria - " + file.name );

    let fileLoader = app.fileLoaders[fileType];
    D = app.current_data = fileLoader.onLoad( dataView );
    app_addToCollection( app.current_data, fileType, file.name );

    let config = {
        num_sc: Number(document.getElementById('file_dialog__num_sc').value),
        fft_size: Number(document.getElementById('file_dialog__fft_size').value),
        u: Number(document.getElementById('file_dialog__NR_u').value),
        cp_map: JSON.parse(document.getElementById('file_dialog__cp_map').value),
        ant_interleaved: JSON.parse(document.getElementById('file_dialog__ant_interleaved').value)
    };

    switch(fileType) 
    {
        case 'iq':
            app.view_time = app_view_time_iq = new view_time_iq(app.current_data);
            app_view_time_iq.setConfig( config );

            // Convert time-domain data to frequency domain
            let f = time_to_freq(app.current_data, app_view_time_iq.sym_starts, config.fft_size, config.num_sc);
            app.curr_view = app.view_freq = app_view_freq_iq = new view_freq_iq(f);
            app.curr_view.setConfig( config );
            app.curr_view.setContext( document.getElementById("fs_main_canvas").getContext("2d") );
            app.curr_view.onRender();
            app.curr_view.chan_map = app_genRbmap( config, app.curr_view.chan_map );
            break;

        case 'freqiq':
            app.curr_view = app.view_freq = app_view_freq_iq = new view_freq_iq(app.current_data);
            app.curr_view.setConfig( config );
            app.curr_view.setContext( document.getElementById("fs_main_canvas").getContext("2d") );
            app.curr_view.onRender();
            app.curr_view.chan_map = app_genRbmap( config, app.curr_view.chan_map );
            break;

        case 'csv':
            app.curr_view = app.view_table = app_view_table = new view_table(app.current_data);
            document.getElementById("fs_table").innerHTML = app.curr_view.getTable();
            break;

        case 'pcap':
            app.pcap = app.current_data;            
            app.curr_view = app.view_table = app_view_table = new view_table( app_packet_dissector( app.current_data ) );
            document.getElementById("fs_table").innerHTML = app.curr_view.getTable();
            break;

        case 'json':
            app.pcap = app.current_data;  
            app.curr_view = app.view_table = app_view_table = new view_table( app.current_data  );
            document.getElementById("fs_table").innerHTML = app.curr_view.getTable();             
        break;

        default:
            debug("No view available for file type: " + fileType);
            break;
    }

    $('#dropzone').hide();
    $('#fs_main').show();
}
