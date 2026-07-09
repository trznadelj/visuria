function app_onFileLoad_pcap( view, json_description )
{
    const bytes   = new Uint8Array( view.buffer );
    var pr;
    try {
        pr = new pcap_reader( bytes );
    }
    catch(e) {
        debug("Error parsing pcap file: " + e.message);
        return;
    }   
    debug("Loaded "+pr.packets.length+" packets.");

    return { packets: pr.packets, timing: pr.timing }; 
}

function app_onFileType_pcap( name )
{
    if ( name.endsWith(".pcap") )
        return "pcap";
    return "unknown";
}

app_registerFileLoader( app_onFileLoad_pcap, app_onFileType_pcap, "pcap" );

class pcap_reader {
    constructor( bytes ) {
        this.bytes = bytes;
        this.index = 0;
        this.packets = [];
        this.bigendian = true;
        this.usec_scale = 1;
        this.packets = [];
        this.timing = [];
        this.parse();        
    };

    get2Bytes() {
        var ret;

        if (this.bigendian) {
            ret = (this.bytes[this.index]<<8) | this.bytes[this.index+1];
        } else {
            ret = (this.bytes[this.index+1]<<8) | this.bytes[this.index];
        }
        this.index += 2;
        return ret;
    }

     get4Bytes() {
        var ret;


        // protect against negative value of ret.

        if (this.bigendian) {
            //ret = (this.bytes[this.index+1]<<16) + (this.bytes[this.index+2]<<8) + this.bytes[this.index+3];
            //ret |= this.bytes[this.index]*(1<<24) ; 

            ret = ((this.bytes[this.index] << 24) |  (this.bytes[this.index+1] << 16) |  (this.bytes[this.index+2] << 8) |  this.bytes[this.index+3]) >>> 0;
        } else {
            ret = ( (this.bytes[this.index+3]<<24) + (this.bytes[this.index+2]<<16) + (this.bytes[this.index+1]<<8) + this.bytes[this.index] ) >>> 0;
        }
        this.index += 4;

        return ret;
    }

     parse()
    {
        var magic = this.get4Bytes();
        
        if (magic == 0xa1b2c3d4) {
            this.bigendian = true;
        } else if (magic == 0xd4c3b2a1) {
            this.bigendian = false;
        } else {
            throw new Error("Invalid pcap file - header="+magic.toString(16));
        }

        this.version = this.get4Bytes();
        this.thiszone = this.get4Bytes();
        this.sigfigs = this.get4Bytes();
        this.snaplen = this.get4Bytes();
        this.network = this.get4Bytes();
        
        while( this.index < this.bytes.length ) {
            var ts_sec = this.get4Bytes();
            var ts_usec = this.get4Bytes();
            var incl_len = this.get4Bytes();
            var orig_len = this.get4Bytes();
            
            this.packets.push( this.bytes.subarray( this.index, this.index + incl_len ) );
            this.timing.push( ts_sec + ts_usec/1000000 );
            this.index += incl_len;
            //debug("pos: "+this.index+" ts: "+ts_sec+"."+ts_usec+" len: "+incl_len);
        }
    }
}