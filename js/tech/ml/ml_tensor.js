// tensor class

// definition of ml_tensor class
function ml_tensor( shape, data )
{
    this.shape = shape;
    this.data = data;    
    this.mean = NaN;
    this.variance = NaN;
    // prototype method to convert tensor to HTML    
    this.toHtml = function()
    {
        let x = this.shape[0];
        let y = this.shape[1];
        let html = '<table border="1" cellpadding="5" cellspacing="0">';
        let show_x = Math.min( 10, x);
        let show_y = Math.min( 10, y);

        for( let i=0; i<show_x; i++ )
        {
            html += '<tr>';
            for( let j=0; j<show_y; j++ )
            {
                const value = this.data[ i * y + j ];
                html += '<td>' + value.toFixed(4) + '</td>';
            }
            html += '</tr>';
        }

        let containsNaN = false;
        let containsInfinity = false;
        for( let i=0; i<this.data.length; i++ )
        {
            if ( isNaN( this.data[i] ) ) containsNaN = true;
            if ( !isFinite( this.data[i] ) ) containsInfinity = true;
        }

        html += '<tr><td colspan="' + y + '">C='+y+' T=' + x + ' Infinity:' + containsInfinity + ' NaN:' + containsNaN + '</td></tr>';
        html += '</table>';

        return html;
    };

    this.describe = function()
    {
        return " shape=[" + this.shape.join(",") + "] ";
    };

    this.calc_stats = function()
    {
        let sum = 0.0;
        let T = this.shape[0]; // column length
        let C = this.shape[1]; // row length

        this.mean = [];
        for( let j=0; j<T; j++ )
        {
            let sum = 0;
            for( let i=0; i<C; i++ )
            {
                sum += this.data[i+j*C];
            }
            sum /= C;
            this.mean.push( sum );
        }

        this.variance = [];
        for( let j=0; j<T; j++ )
        {
            let sum = 0;
            for( let i=0; i<C; i++ )
            {
                sum += Math.pow(this.data[i+j*C]-this.mean[j], 2);
            }
            sum /= C;
            this.variance.push( sum );
        }
    };

    this.do_normalize = function(eps=1e-5)
    {
        let T = this.shape[0];
        let C = this.shape[1];

        for( let j=0; j<T; j++ )
        {
            for( let i=0; i<C; i++ )
            {
                this.data[i+j*C] = (this.data[i+j*C]-this.mean[j]) / (Math.sqrt(this.variance[j] + eps));
            }
        }
    };

    this.normalize = function(eps=1e-5)
    {
        this.calc_stats();
        this.do_normalize(eps);    
    };

    this.clone = function()
    {
        let new_data = new Float32Array( this.data.length );
        new_data.set( this.data );
        return new ml_tensor( [ this.shape[0], this.shape[1] ], new_data );
    }

    this.add_per_channel = function( vec )
    {
        let T = this.shape[0]; // col elements count
        let C = this.shape[1]; // row elements count
        for( let j=0; j<T; j++ ) // for every column
        {
            for( let i=0; i<C; i++ ) // for every row
            {
                this.data[i + j*C] += vec[i];
            }
        }
    };

    this.mul_per_channel = function( vec )
    {
        let T = this.shape[0]; // col elements count
        let C = this.shape[1]; // row elements count
        for( let j=0; j<T; j++ ) // for every column
        {
            for( let i=0; i<C; i++ ) // for every row
            {
                this.data[i + j*C] *= vec[i];
            }
        }
    };  

    this.mul_const = function( v )
    {
        for( let i=0; i<this.data.length; i++ ) // for every element
        {
            this.data[i] *= v;
        } 
    };

    this.mul = function( B )
    {
        // this: A [m,k]
        // B:      [k,n]
        // C:      [m,n]

        let [ m, k ] = this.shape; // A shape
        let [ k2, n ] = B.shape;   // B shape
        if ( k != k2 ) throw new Error("ml_tensor.mul_with_tensor: shape mismatch " + this.shape.join(",") + " x " + B.shape.join(",") );

        let C_data = new Float32Array( m * n );
        for( let i=0; i<m; i++ ) // for every row of A
        {
            for( let j=0; j<n; j++ ) // for every column of B
            {
                let sum = 0.0;
                for( let p=0; p<k; p++ ) // for every element in row/column
                {
                    sum += this.data[ i * k + p ] * B.data[ p * n + j ];
                }
                C_data[ i * n + j ] = sum;
            } 
        }

        return new ml_tensor( [ m, n ], C_data );
    }

    this.mul_with_transpose = function( B )
    {
        // this: A [m,k]
        // B:      [n,k]
        // C:      [m,n]
        //
        //              <---- shape[1] ---->
        //   shapes[0]

        let m = this.shape[0]; // number of rows
        let k = this.shape[1];
        // B matrix is effectivelly transposed
        let n = B.shape[0];
        let l = B.shape[1];
        

        if ( k != l ) throw new Error("ml_tensor.mul_with_tensor: shape mismatch " + this.shape.join(",") + " x " + B.shape.join(",") );

        let C_data = new Float32Array( m * n );

        for( let i=0; i<m; i++ ) // for every row of A
        {
            for( let j=0; j<n; j++ ) // for every row of B (column of B^T)
            {
                let sum = 0.0;
                for( let p=0; p<k; p++ ) // for every element in row/column
                {
                    sum += this.data[ i * k + p ] * B.data[ j * l + p ];
                }
                C_data[ i * n + j ] = sum;
            }
        }

        return new ml_tensor( [ m, n ], C_data );
    };

    this.split_in_three_along_last_dim = function()
    {
        let [ T, C ] = this.shape;

        if ( C % 3 != 0 ) throw new Error("ml_tensor.split_in_three_along_last_dim: shape not divisible by 3 " + this.shape.join(",") );
        let C3 = C / 3;
        let data_q = new Float32Array( T * C3 );
        let data_k = new Float32Array( T * C3 );
        let data_v = new Float32Array( T * C3 );
        for( let t=0; t<T; t++ )
        {
            for( let c=0; c<C3; c++ )
            {
                data_q[ t * C3 + c ] = this.data[ t * C + c ];
                data_k[ t * C3 + c ] = this.data[ t * C + (c + C3) ];
                data_v[ t * C3 + c ] = this.data[ t * C + (c + 2*C3) ];
            }
        }
        return [ new ml_tensor( [ T, C3 ], data_q ), new ml_tensor( [ T, C3 ], data_k ), new ml_tensor( [ T, C3 ], data_v ) ];
    } ;  

    this.slice_along_last_dim = function( start, end )
    {
        let [ T, C ] = this.shape;
        if ( start < 0 || end > C || start >= end ) throw new Error("ml_tensor.slice_along_last_dim: bad slice " + start + ":" + end + " for shape " + this.shape.join(",") );
        let C2 = end - start;
        let data_sliced = new Float32Array( T * C2 );
        for( let t=0; t<T; t++ )
        {
            for( let c=0; c<C2; c++ )
            {
                data_sliced[ t * C2 + c ] = this.data[ t * C + (c + start) ];
            }
        }
        return new ml_tensor( [ T, C2 ], data_sliced );
    };

    this.dotmul = function( B )
    {
        // this: A [m,k]
        // B:      [m,k]
        // C:      [m,k]
        
        let [ T, C ] = this.shape;
        let [ T2, C2 ] = B.shape;
        if ( T != T2 || C != C2 ) throw new Error("ml_tensor.dotmul: shape mismatch " + this.shape.join(",") + " x " + B.shape.join(",") );

        let C_data = new Float32Array( T * C );
        for( let i=0; i<this.data.length; i++ ) // for every element
        {
            C_data[i] = this.data[i] * B.data[i];
        }
        return new ml_tensor( [ T, C ], C_data );
    };

    //A = (new ml_tensor( [3,4], [1,2,3,4, 5,6,7,8, 9,10,11,12] )).apply_casual_mask();
    /*
    1.0000	-Inf	-Inf	-Inf
    5.0000	6.0000	-Inf	-Inf
    9.0000	10.0000	11.0000	-Inf
    C=4 T=3
    */
    this.apply_casual_mask = function()
    {
        let [ T, C ] = this.shape;
        for( let i=0; i<T; i++ ) // for every row
        {
            for( let j=0; j<C; j++ ) // for every column
            {
                if ( j > i )
                {
                    this.data[ i * C + j ] = -Infinity;
                }
            }
        }
    };

    this.softmax_along_last_dim = function()
    {
        let [ T, C ] = this.shape;
        let data_softmax = new Float32Array( T * C );
        for( let t=0; t<T; t++ ) // for every row
        {
            // find max for numerical stability
            let max_val = -Infinity;
            for( let c=0; c<C; c++ )
            {
                let val = this.data[ t * C + c ];
                if ( val > max_val ) max_val = val;
            }
            // compute sum of exp
            let sum_exp = 0.0;
            for( let c=0; c<C; c++ )
            {
                let val = this.data[ t * C + c ];
                let exp_val = Math.exp( val - max_val );
                data_softmax[ t * C + c ] = exp_val;
                sum_exp += exp_val;
            }
            // normalize
            for( let c=0; c<C; c++ )
            {
                data_softmax[ t * C + c ] /= sum_exp;
            }
        }
        return new ml_tensor( [ T, C ], data_softmax );
    };

    this.gelu_inplace = function()
    {
        for( let i=0; i<this.data.length; i++ ) // for every element
        {
            let x = this.data[i];
            // approximate GELU
            this.data[i] = 0.5 * x * ( 1.0 + Math.tanh( Math.sqrt(2/Math.PI) * ( x + 0.044715 * Math.pow(x,3) ) ) );
        }
    };

    this.add_inplace = function( B )
    {
        // this: A [m,k]
        // B:      [m,k]
        let [ T, C ] = this.shape;
        let [ T2, C2 ] = B.shape;
        if ( T != T2 || C != C2 ) throw new Error("ml_tensor.addInPlace: shape mismatch " + this.shape.join(",") + " x " + B.shape.join(",") ); 
        for( let i=0; i<this.data.length; i++ ) // for every element
        {
            this.data[i] += B.data[i];
        }
    };

    this.add_per_channel_inplace = function( vec )
    {
        let [ T, C ] = this.shape; // col elements count

        if (vec.data.length != C ) throw new Error("ml_tensor.add_per_channel_inplace: shape mismatch " + this.shape.join(",") + " x " + vec.shape.join(",") );

        for( let j=0; j<T; j++ ) // for every column
        {
            for( let i=0; i<C; i++ ) // for every row
            {
                this.data[i + j*C] += vec.data[i];//!
            }
        }
    }

    this.row = function( index )
    {
        let [ T, C ] = this.shape;
        if ( index < 0 || index >= T ) throw new Error("ml_tensor.row: bad row index " + index + " for shape " + this.shape.join(",") );
        let row_data = new Float32Array( C );
        for( let c=0; c<C; c++ )
        {
            row_data[c] = this.data[ index * C + c ];
        }
        return new ml_tensor( [ 1, C ], row_data );
    }

    this.argmax = function()
    {
        let [ T, C ] = this.shape;
        let indices = new Array( T );
        for( let t=0; t<T; t++ )
        {
            let max_val = -Infinity;
            let max_idx = -1;
            for( let c=0; c<C; c++ )
            {
                let val = this.data[ t * C + c ];
                if ( val > max_val )
                {
                    max_val = val;
                    max_idx = c;
                }
            }
            indices[t] = max_idx;
        }
        return indices;
    };
}