
function tmp_handler( filename, magic, content )
{
    app_onFileLoad( { name:filename, size:0 }, content, 'iq8bit' );
}

getFile('demo/rmf.bin', tmp_handler);

let src = ` 
const iq = getTimeIq();
const phaseDiff = v_angle( v_conjdiff(iq) );
const decimation = 6, alpha = 0.04 /* LP coefficient */, output=[];
let filtered=0; 
for (let i = 0; i < phaseDiff.length; i++) {
    filtered += alpha * (phaseDiff[i] - filtered); // 1st-order IIR LPF
    if (i % decimation === 0) 
        output.push(filtered / decimation);    
}
play(output, 44100);`;

document.getElementById('console_text').value = src;
$("#console").dialog('open');
