var app =  {  
    current_data:0 ,
    collection: [],
    fileLoaders: {}
};


function app_init()
{

}


function app_addToCollection( data, type, name )
{
    app.collection.push( { name: name, type: type, data: data } );
}


function app_getByType( type )
{
    let results = [];

    for( let i=0; i<app.collection.length; i++ )
    {
        const item = app.collection[i];
        if ( item.type == type )
        {
            results.push( item );
        }
    }

    return results;
}


// --------------------------------------------------------------------
// Console plot helper — call from dialog_console via:
//   plot( [array1, array2, ...] )
// Adds a canvas via console_add_canvas(), renders a view_plot on it.
// Returns the view (with a no-op toHtml() so console stays clean).
// --------------------------------------------------------------------
function plot(data, opts)
{
    opts = opts || {};

    // Normalise single series → array-of-arrays
    if (!Array.isArray(data[0])) {
        data = [data];
    }

    const canvas = console_add_canvas(opts.width, opts.height);

    const view = new view_plot(data);
    if (opts.mode !== undefined) view.setRenderMode(opts.mode);

    const ctx = canvas.getContext('2d');
    view.setContext(ctx);
    view.onRender();

    // Suppress console text output — the canvas is already in the DOM
    view.toHtml = function () { return ''; };

    return view;
}


// --------------------------------------------------------------------
// Console xy-graph helper.
//   xygraph( [[x0,y0],[x1,y1],...], { mode:'line', ... } )
//   xygraph( [trace1, trace2, ...], opts )
// --------------------------------------------------------------------
function xygraph(data, opts)
{
    opts = opts || {};
    const canvas = console_add_canvas(opts.width, opts.height);

    // Normalise: a single array of [x,y] → wrap in a trace array
    if (data.length && Array.isArray(data[0]) && typeof data[0][0] === 'number') {
        data = [data];
    }

    const view = new view_xygraph(data);
    if (opts.mode !== undefined) view.setRenderMode(opts.mode);

    const ctx = canvas.getContext('2d');
    view.setContext(ctx);
    view.onRender();

    view.toHtml = function () { return ''; };
    return view;
}
