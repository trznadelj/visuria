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
