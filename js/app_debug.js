let timestamp_startTime = 0;

function debug(txt)
{
   // console.log( txt );
    $( '<p>'+txt+'</p>' ).appendTo( "#dump" );
}

function timestamp(txt) 
{
    debug("<p style='color:blue'>" + (new Date().getTime() - timestamp_startTime) + "[ms]:" + txt + "</p>");
}

function timestart() 
{
    timestamp_startTime = new Date().getTime();
}
