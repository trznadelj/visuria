function debug(txt)
{
    console.log( txt );

    $( '<p>'+txt+'</p>' ).appendTo( "#dump" );
}
