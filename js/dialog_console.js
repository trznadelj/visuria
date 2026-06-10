function evaluateCode() 
{
    var inputTextarea = document.getElementById('console_text');
    const code = inputTextarea.value;

    var outputDiv = document.getElementById('console_output');

// get first ilne of code to use as a label
    const firstLine = code.split('\n')[0].trim();
    outputDiv.innerHTML += '<BR><span style="color: blue;">&gt;&gt; ' + firstLine.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</span><br>';

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
            outputDiv.innerHTML += first30 + '<br>... (output truncated, total ' + lines.length + ' lines)';
            
        }
        else
          outputDiv.innerHTML += result_as_text;
    }
    catch(e)
    {
        outputDiv.innerHTML += "Error: " + e.message;
    }
}

function console_clear()
{
    document.getElementById('console_output').innerHTML="";
}