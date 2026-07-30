class Matrix {
    constructor(rows, cols = 1, v_i = null, v_q = null) {
        if (!Number.isInteger(rows) || !Number.isInteger(cols) ||
            rows < 1 || cols < 1) {
            throw new Error("Invalid matrix dimensions");
        }

        const n = rows * cols;

        this.rows = rows;
        this.cols = cols;
        this.v_i = v_i instanceof Float64Array
            ? new Float64Array(v_i)
            : new Float64Array(v_i ?? n);

        this.v_q = v_q == null
            ? null
            : v_q instanceof Float64Array
                ? new Float64Array(v_q)
                : new Float64Array(v_q);

        if (this.v_i.length !== n || (this.v_q && this.v_q.length !== n))
            throw new Error("Data size does not match matrix dimensions");
    }

    get length() {
        return this.rows * this.cols;
    }

    get isComplex() {
        return this.v_q !== null;
    }

    get isVector() {
        return this.rows === 1 || this.cols === 1;
    }

    static zeros(rows, cols = 1, complex = false) {
        return new Matrix(
            rows,
            cols,
            new Float64Array(rows * cols),
            complex ? new Float64Array(rows * cols) : null
        );
    }

    static identity(n, complex = false) {
        const r = Matrix.zeros(n, n, complex);

        for (let i = 0; i < n; ++i)
            r.v_i[i * n + i] = 1;

        return r;
    }

    static vector(values) {
        return Matrix.from(values);
    }

    static complex(re, im) {
        const a = Matrix.from(re);
        const b = Matrix.from(im);

        a._sameShape(b);

        return new Matrix(a.rows, a.cols, a.v_i, b.v_i);
    }

    static from(value) {
        if (value instanceof Matrix)
            return value.clone();

        if (!Array.isArray(value))
            return new Matrix(1, 1, [Number(value)]);

        if (!Array.isArray(value[0])) {
            const re = new Float64Array(value.length);
            let im = null;

            for (let i = 0; i < value.length; ++i) {
                const x = Matrix._complexValue(value[i]);

                re[i] = x.re;

                if (x.im !== 0) {
                    im ??= new Float64Array(value.length);
                    im[i] = x.im;
                }
            }

            return new Matrix(value.length, 1, re, im);
        }

        const rows = value.length;
        const cols = value[0].length;
        const re = new Float64Array(rows * cols);
        let im = null;

        for (let r = 0; r < rows; ++r) {
            if (value[r].length !== cols)
                throw new Error("Irregular matrix");

            for (let c = 0; c < cols; ++c) {
                const k = r * cols + c;
                const x = Matrix._complexValue(value[r][c]);

                re[k] = x.re;

                if (x.im !== 0) {
                    im ??= new Float64Array(rows * cols);
                    im[k] = x.im;
                }
            }
        }

        return new Matrix(rows, cols, re, im);
    }

    static _complexValue(x) {
        if (typeof x === "number")
            return { re: x, im: 0 };

        if (Array.isArray(x))
            return { re: Number(x[0] ?? 0), im: Number(x[1] ?? 0) };

        if (x && typeof x === "object")
            return {
                re: Number(x.re ?? x.i ?? 0),
                im: Number(x.im ?? x.q ?? 0)
            };

        return { re: Number(x), im: 0 };
    }

    _index(row, col = 0) {
        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols)
            throw new RangeError("Matrix index out of range");

        return row * this.cols + col;
    }

    _sameShape(b) {
        if (this.rows !== b.rows || this.cols !== b.cols)
            throw new Error("Matrix dimensions do not match");
    }

    clone() {
        return new Matrix(this.rows, this.cols, this.v_i, this.v_q);
    }

    get(row, col = 0) {
        const k = this._index(row, col);

        return this.isComplex
            ? { re: this.v_i[k], im: this.v_q[k] }
            : this.v_i[k];
    }

    set(row, col, value) {
        if (arguments.length === 2) {
            value = col;
            col = 0;
        }

        const k = this._index(row, col);
        const x = Matrix._complexValue(value);

        this.v_i[k] = x.re;

        if (x.im !== 0 || this.v_q) {
            this.v_q ??= new Float64Array(this.length);
            this.v_q[k] = x.im;
        }

        return this;
    }

    add(value) {
        return this._elementwise(value, (ar, ai, br, bi) => [
            ar + br,
            ai + bi
        ]);
    }

    sub(value) {
        return this._elementwise(value, (ar, ai, br, bi) => [
            ar - br,
            ai - bi
        ]);
    }

    hadamard(value) {
        return this._elementwise(value, (ar, ai, br, bi) => [
            ar * br - ai * bi,
            ar * bi + ai * br
        ]);
    }

    div(value) {
        if (value instanceof Matrix)
            return this._elementwise(value, (ar, ai, br, bi) => {
                const d = br * br + bi * bi;

                if (d === 0)
                    throw new Error("Division by zero");

                return [
                    (ar * br + ai * bi) / d,
                    (ai * br - ar * bi) / d
                ];
            });

        const b = Matrix._complexValue(value);
        const d = b.re * b.re + b.im * b.im;

        if (d === 0)
            throw new Error("Division by zero");

        return this._scalarOperation((ar, ai) => [
            (ar * b.re + ai * b.im) / d,
            (ai * b.re - ar * b.im) / d
        ], b.im !== 0);
    }

    scale(value) {
        const b = Matrix._complexValue(value);

        return this._scalarOperation((ar, ai) => [
            ar * b.re - ai * b.im,
            ar * b.im + ai * b.re
        ], b.im !== 0);
    }

    neg() {
        return this.scale(-1);
    }

    mul(value) {
        if (!(value instanceof Matrix))
            return this.scale(value);

        if (this.cols !== value.rows)
            throw new Error(
                `Cannot multiply ${this.rows}x${this.cols} by ` +
                `${value.rows}x${value.cols}`
            );

        const complex = this.isComplex || value.isComplex;
        const out = Matrix.zeros(this.rows, value.cols, complex);

        const aq = this.v_q;
        const bq = value.v_q;

        for (let r = 0; r < this.rows; ++r) {
            for (let c = 0; c < value.cols; ++c) {
                let re = 0;
                let im = 0;

                for (let k = 0; k < this.cols; ++k) {
                    const ia = r * this.cols + k;
                    const ib = k * value.cols + c;

                    const ar = this.v_i[ia];
                    const ai = aq ? aq[ia] : 0;
                    const br = value.v_i[ib];
                    const bi = bq ? bq[ib] : 0;

                    re += ar * br - ai * bi;
                    im += ar * bi + ai * br;
                }

                const io = r * value.cols + c;

                out.v_i[io] = re;

                if (complex)
                    out.v_q[io] = im;
            }
        }

        return out;
    }

    dot(value, conjugateLeft = true) {
        const b = Matrix.from(value);

        if (!this.isVector || !b.isVector || this.length !== b.length)
            throw new Error("dot() requires vectors of equal length");

        let re = 0;
        let im = 0;

        for (let k = 0; k < this.length; ++k) {
            const ar = this.v_i[k];
            const ai = (this.v_q?.[k] ?? 0) * (conjugateLeft ? -1 : 1);
            const br = b.v_i[k];
            const bi = b.v_q?.[k] ?? 0;

            re += ar * br - ai * bi;
            im += ar * bi + ai * br;
        }

        return im === 0 ? re : { re, im };
    }

    transpose() {
        const out = Matrix.zeros(this.cols, this.rows, this.isComplex);

        for (let r = 0; r < this.rows; ++r) {
            for (let c = 0; c < this.cols; ++c) {
                const src = r * this.cols + c;
                const dst = c * this.rows + r;

                out.v_i[dst] = this.v_i[src];

                if (this.v_q)
                    out.v_q[dst] = this.v_q[src];
            }
        }

        return out;
    }

    conj() {
        if (!this.v_q)
            return this.clone();

        const out = this.clone();

        for (let k = 0; k < out.length; ++k)
            out.v_q[k] = -out.v_q[k];

        return out;
    }

    hermitian() {
        return this.conj().transpose();
    }

    abs() {
        const out = Matrix.zeros(this.rows, this.cols);

        for (let k = 0; k < this.length; ++k)
            out.v_i[k] = Math.hypot(
                this.v_i[k],
                this.v_q?.[k] ?? 0
            );

        return out;
    }

    abs2() {
        const out = Matrix.zeros(this.rows, this.cols);

        for (let k = 0; k < this.length; ++k) {
            const re = this.v_i[k];
            const im = this.v_q?.[k] ?? 0;

            out.v_i[k] = re * re + im * im;
        }

        return out;
    }

    norm() {
        let sum = 0;

        for (let k = 0; k < this.length; ++k) {
            const re = this.v_i[k];
            const im = this.v_q?.[k] ?? 0;

            sum += re * re + im * im;
        }

        return Math.sqrt(sum);
    }

    reshape(rows, cols = 1) {
        if (rows * cols !== this.length)
            throw new Error("reshape() cannot change element count");

        return new Matrix(rows, cols, this.v_i, this.v_q);
    }

    row(index) {
        if (index < 0 || index >= this.rows)
            throw new RangeError("Row index out of range");

        const from = index * this.cols;
        const to = from + this.cols;

        return new Matrix(
            1,
            this.cols,
            this.v_i.slice(from, to),
            this.v_q?.slice(from, to)
        );
    }

    col(index) {
        if (index < 0 || index >= this.cols)
            throw new RangeError("Column index out of range");

        const re = new Float64Array(this.rows);
        const im = this.v_q ? new Float64Array(this.rows) : null;

        for (let r = 0; r < this.rows; ++r) {
            const k = r * this.cols + index;

            re[r] = this.v_i[k];

            if (im)
                im[r] = this.v_q[k];
        }

        return new Matrix(this.rows, 1, re, im);
    }

    map(fn) {
        let out = Matrix.zeros(this.rows, this.cols, this.isComplex);

        for (let r = 0; r < this.rows; ++r) {
            for (let c = 0; c < this.cols; ++c) {
                const k = r * this.cols + c;
                const value = fn(
                    this.v_i[k],
                    this.v_q?.[k] ?? 0,
                    r,
                    c
                );

                const x = Matrix._complexValue(value);

                out.v_i[k] = x.re;

                if (x.im !== 0 && !out.v_q)
                    out.v_q = new Float64Array(out.length);

                if (out.v_q)
                    out.v_q[k] = x.im;
            }
        }

        return out;
    }

    toArray() {
        const out = Array.from(
            { length: this.rows },
            () => new Array(this.cols)
        );

        for (let r = 0; r < this.rows; ++r) {
            for (let c = 0; c < this.cols; ++c) {
                const k = r * this.cols + c;

                out[r][c] = this.v_q
                    ? { re: this.v_i[k], im: this.v_q[k] }
                    : this.v_i[k];
            }
        }

        return out;
    }

    _scalarOperation(fn, forceComplex = false) {
        const complex = this.isComplex || forceComplex;
        const out = Matrix.zeros(this.rows, this.cols, complex);

        for (let k = 0; k < this.length; ++k) {
            const [re, im] = fn(
                this.v_i[k],
                this.v_q?.[k] ?? 0
            );

            out.v_i[k] = re;

            if (complex)
                out.v_q[k] = im;
        }

        return out;
    }

    _elementwise(value, fn) {
        if (!(value instanceof Matrix)) {
            const b = Matrix._complexValue(value);

            return this._scalarOperation(
                (ar, ai) => fn(ar, ai, b.re, b.im),
                b.im !== 0
            );
        }

        this._sameShape(value);

        const complex = this.isComplex || value.isComplex;
        const out = Matrix.zeros(this.rows, this.cols, complex);

        for (let k = 0; k < this.length; ++k) {
            const [re, im] = fn(
                this.v_i[k],
                this.v_q?.[k] ?? 0,
                value.v_i[k],
                value.v_q?.[k] ?? 0
            );

            out.v_i[k] = re;

            if (complex)
                out.v_q[k] = im;
        }

        return out;
    }
}