function evaluateCode() 
{
    var inputTextarea = document.getElementById('console_text');
    const code = inputTextarea.value;

    var outputDiv = document.getElementById('console_output');

// get first ilne of code to use as a label
    const firstLine = code.split('\n')[0].trim();
    outputDiv.insertAdjacentHTML('beforeend', '<BR><span style="color: blue;">&gt;&gt; ' + firstLine.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</span><br>');

    try {
        let result = (eval(code));
        var result_as_text;

        // convert object to text representation
        if (typeof result === "object" && result !== null) {
            // check if result has toHtml method
            if (typeof result.toHtml === "function") 
            {
                result = result_as_text = result.toHtml();
       
            }
            else
            {
              result = JSON.stringify(result, null, 2);
              result_as_text = String(result)
                  .replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;')
                  .replace(/\r/g, '')
                  .replace(/\n/g, '<br>') // Replace newlines with <br>
                  .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;'); // Replace tabs with spaces       
            }
        }
        else {
                        result_as_text = String(result)
                  .replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;')
                  .replace(/\r/g, '')
                  .replace(/\n/g, '<br>') // Replace newlines with <br>
                  .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;'); // Replace tabs with spaces       
        }

        // check number of lines and limit to 30 lines displayed
        const lines = result_as_text.split('<br>');
        if (lines.length > 30) {
            const first30 = lines.slice(0, 30).join('<br>');
            outputDiv.insertAdjacentHTML('beforeend', first30 + '<br>... (output truncated, total ' + lines.length + ' lines)');
            
        }
        else
          outputDiv.insertAdjacentHTML('beforeend', result_as_text);
    }
    catch(e)
    {
        outputDiv.insertAdjacentHTML('beforeend', "Error: " + e.message);
    }
}

let _console_canvas_counter = 0;

function console_clear()
{
    _console_canvas_counter = 0;
    document.getElementById('console_output').innerHTML="";
}

function console_add( txt )
{
    // This uses innerHTML += which can destroy previously-added DOM nodes.
    // Prefer insertAdjacentHTML for appending DOM-safe content.
    document.getElementById('console_output').insertAdjacentHTML('beforeend', txt);
}

// Add a canvas element to the console output.  Returns the canvas.
// Width/height default to 640x280.
function console_add_canvas( w, h )
{
    w = w || 640;
    h = h || 280;
    const id = 'console_canvas_' + (_console_canvas_counter++);
    const html = '<canvas id="' + id + '" width="' + w + '" height="' + h
        + '" style="width:' + w + 'px;height:' + h + 'px;border:1px solid #ccc;margin:4px 0;display:block;"></canvas>';
    document.getElementById('console_output').insertAdjacentHTML('beforeend', html);
    return document.getElementById(id);
}
