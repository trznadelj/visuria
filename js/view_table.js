class view_table {
    constructor( data ) {
        this.data = data;
        this.col_names = getFieldNames( data );
        this.show_rows = 500;
        this.start_row = 0;
    };

    genHeaderItem( col_index )
    {
        return "<TD>"+this.col_names[ col_index ]+"</TD>";
    }

    genRow( row_index )
    {
        var ret = "<TR>";
        for( let i=0; i<this.col_names.length; i++) 
        {
            ret += "<TD>"+this.data[row_index][this.col_names[i]]+"</TD>\n";
        }
        return ret+"</TR>";
    }

    getTable()
    {
        var ret = "<TABLE><TR>";
        for( let i=0; i<this.col_names.length; i++) 
        {
            ret += this.genHeaderItem(i);
        }
        for( let i=0; i<this.show_rows; i++) 
        {
            let j = i+this.start_row;
            if ( i >= this.data.length ) break;
            ret += this.genRow(j);
        }

        ret += "</TR></TABLE>";
        return ret;
    }
};

