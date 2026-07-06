matmul(A[m,k], B[k,n]) -> C[m,n] (for small sizes, plain loops)

addInPlace(vec) / addRowwise (bias add)

layerNorm(x[T,C], gamma[C], beta[C])

gelu(x) (approx or exact)

softmax(row) (stable)

argmax(row)