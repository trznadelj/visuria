function nr_framing( out, u, is_ecp, sampling_rate )
{
    /* Sanity checks */
    if (u>5) throw "Bad u = "+u;

    let ratio         = sampling_rate/122880000;
    let scale         =   64/(1<<u);
    let cp_ext        =   32*scale;
    let cp            =    9*scale;

    out.u             = u;
    out.sym_in_slot   = 14-2*is_ecp;
    out.is_ecp        = is_ecp;
    out.sc_spacing    = 15000<<u; /* 38.211 4.2 */
    out.sampling_rate = sampling_rate;
    out.fft_size      = Math.round( 128*scale*ratio );
    out.n_dl_rb       = [ 270, 273, 135, 66, 33, 0 ][u]; // maximum number.
    out.num_sc        = out.n_dl_rb*12;

    if (is_ecp)
    {
        out.cp_map      = v_ones( 6<<u, cp_ext * ratio );
    }
    else
    {
        out.cp_map      = v_ones( 7<<u, cp * ratio );
        out.cp_map[ 0 ]+= 2 * scale * ratio;
    }    

    return out;
}


function nr_config()
{
    return [ ['skip_bytes','num_sc','fft_size','NR_u','cp_map','ant_interleaved'], 
             [0,600,1024,1,[80,72,72,72,72,72,72],1] ]
}

function nr_configurable()
{
    return {
           sampling_rate: { /* one_of - or free to enter */
                "30.72": 30720000,
                _122_88: 12288000,
                _user: "?"
            },
            u: { /* one_of */
                _0: 0,
                _1: 1,
                _2: 2,                  
                _3: 3,
                _4: 4,
                _5: 5                  
            },
            nprb: { /* one of - or free to enter */
                _273: 273,
                _user: "?"
            },
            fft_size: { /* one of - or free to enter */
                _1024: 1024,
                _user: "?"
            }
        };
    //debug( configurable_to_html( nr_configurable() )  )
}

function configurable_to_html(cfg)
{
    let html = `<div class="configurable">`;

    for (const [name, options] of Object.entries(cfg))
    {
        html += `
            <div class="configurable-row">
                <div class="configurable-label">${name}</div>
                <div class="configurable-controls">
        `;

        let first = true;

        for (const [caption, value] of Object.entries(options))
        {
            // Do not display the leading underscore.
            const displayCaption = caption.startsWith("_")
                ? caption.slice(1)
                : caption;

            if (value === "?")
            {
                html += `
                    <button
                        type="button"
                        class="cfg-btn"
                        data-name="${name}"
                        data-value="user"
                    >
                        ${displayCaption}

                        <input
                            type="number"
                            class="cfg-user"
                            data-name="${name}"
                            placeholder="value"
                            onclick="event.stopPropagation()"
                        >
                    </button>
                `;
            }
            else
            {
                html += `
                    <button
                        type="button"
                        class="cfg-btn ${first ? "selected" : ""}"
                        data-name="${name}"
                        data-value="${value}"
                    >
                        ${displayCaption}
                    </button>
                `;

                first = false;
            }
        }

        html += `
                </div>
            </div>
        `;
    }

    html += `</div>`;

    return html;
}

/*
function configurable_to_html( cfg )
{
    // convert configurable to html.
    // one_of - either <select> or <button> list.
    // button list shall change the style of button selected.

    let html = `<div class="configurable">`;

    for (const [name, options] of Object.entries(cfg))
    {
        html += `<div class="configurable-row">`;
        html += `<div class="configurable-label">${name}</div>`;
        html += `<div class="configurable-controls">`;

        let first = true;

        for (const [caption, value] of Object.entries(options))
        {
            if (value === "?")
            {
                html += `
                    <button type="button"
                        class="cfg-btn"
                        data-name="${name}"
                        data-value="user">
                        User
                    </button>

                    <input type="number"
                        class="cfg-user"
                        data-name="${name}"
                        style="display:none"
                        placeholder="value">
                `;
            }
            else
            {
                html += `
                    <button type="button"
                        class="cfg-btn ${first ? "selected" : ""}"
                        data-name="${name}"
                        data-value="${value}">
                        ${caption}
                    </button>
                `;
                first = false;
            }
        }

        html += `</div></div>`;
    }

    html += `</div>`;

    return html;    
}
*/