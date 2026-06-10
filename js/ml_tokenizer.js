function tokenize_ml_input(input, stoi) {
    // Simple tokenizer for ML input
    
    // for each character in input, check value in stoi, if not found use unk token
    var ret=[];

    ret.push(stoi['<BOS>']);
    for (let char of input) {
        if (!(char in stoi)) {
            char = '<BOS>';
        }   
        ret.push(stoi[char]);
    } 

    ret.push(stoi['<SEP>']);
    return ret;
}