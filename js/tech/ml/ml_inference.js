function ml_inference_embedding_matrix(x, D) {
    // computer embeddings matrix

    // X[t,c] = tok_emb[x[t], c] + pos_emb[t, c]
    let tok_emb_W = D.t('tok_emb.weight');
    let pos_emb_W = D.t('pos_emb.weight');
    let tok_emb_W_c = tok_emb_W.shape[1];
    let vocab_size = tok_emb_W.shape[0];

    let d_model = tok_emb_W_c;

    let tok_emb = tok_emb_W.data;
    let pos_emb = pos_emb_W.data;

    var X = new Float32Array(x.length * d_model);

    for (var i = 0; i < x.length; i++) {
        const tokId = x[i];
        if (tokId < 0 || tokId >= vocab_size) throw new Error("bad tokId " + tokId);
        const tokOff = tokId * d_model;
        const posOff = i * d_model;
        const outOff = i * d_model;
        if ((i * d_model + (d_model - 1)) >= pos_emb.length) throw new Error("pos_emb too short for i=" + i);

        for (var c = 0; c < d_model; c++) {
            X[outOff + c] = tok_emb[tokOff + c] + pos_emb[posOff + c];
        }
    }
    return new ml_tensor([x.length, d_model], X);
}



function concat_heads(headOuts, T, H, d_head) {
    const d_model = H * d_head;
    const out = new Float32Array(T * d_model);

    for (let t = 0; t < T; t++) {
        const rowOff = t * d_model;
        for (let h = 0; h < H; h++) {
            const src = headOuts[h].data;         // [T * d_head]
            const srcOff = t * d_head;
            const dstOff = rowOff + h * d_head;

            out.set(src.subarray(srcOff, srcOff + d_head), dstOff);
        }
    }
    return out;
}

function ml_layer_norm(X, weight, bias) {
    X.normalize();
    X.mul_per_channel(weight.data);
    X.add_per_channel(bias.data);
}

function ml_inference( x, D ) 
{
    const Dm = D.manifest
    const H = Dm.config.heads;
  //  const vocab_size = D.manifest.config.vocab_size;
    const d_model = Dm.config.d_model;
    const d_head = d_model / H;
    const d_layers = Dm.config.layers;
    const do_debug = false; 

    if (do_debug) debug("H=" + H + " d_model=" + d_model + " d_head=" + d_head);

    //x = tokenize_ml_input("2+2", D.manifest.stoi);
    let X = ml_inference_embedding_matrix(x, D);

    var X_resid;
    for (let d_layer = 0; d_layer < d_layers; d_layer++) {
        X_resid = X.clone();

        if (do_debug) debug("X_resid" + d_layer + ":" + X_resid.describe() + X_resid.toHtml());
        if (do_debug) debug("LAYER " + d_layer);

        // LN1
        ml_layer_norm(X, D.t("blocks." + d_layer + ".ln1.weight"), D.t("blocks." + d_layer + ".ln1.bias"));

        // SELF ATTENTION
        // QKV = X @ Wqkv^T
        const Wqkv = D.t("blocks." + d_layer + ".attn.qkv.weight");
        //debug( "Wqkv:" + Wqkv.describe() );
        if (do_debug) debug("X:" + X.describe());

        let qkv = X.mul_with_transpose(Wqkv);
        if (do_debug) debug("qkv:" + qkv.describe());

        // Split QKV into Q, K, V
        // Q = QKV[:, 0:C]   K = QKV[:, C:2C]    V = QKV[:, 2C:3C]
        const [q, k, v] = qkv.split_in_three_along_last_dim();

        if (do_debug) debug("q:" + q.describe());
        if (do_debug) debug("k:" + k.describe());
        if (do_debug) debug("v:" + v.describe());

        const headOuts = [];

        // For all HEADS - compute attention
        for (let h = 0; h < H; h++) {
            if (do_debug) debug("HEAD " + h);
            const off = h * d_head;
            const q_h = q.slice_along_last_dim(off, d_head + off);
            const k_h = k.slice_along_last_dim(off, d_head + off);
            const v_h = v.slice_along_last_dim(off, d_head + off);

            // score = Q @ K^T / sqrt(d_head)   with casual mask
            let score = q_h.mul_with_transpose(k_h);

            score.mul_const(1.0 / Math.sqrt(d_head));
            score.apply_casual_mask();
            if (do_debug) debug("score:" + score.describe() + score.toHtml());

            // weights = exp(score) / sum( exp(score_in_C) )
            const weights = score.softmax_along_last_dim();
            if (do_debug) debug("weights:" + weights.describe());

            // out_h = weights @ V
            let out_h = weights.mul(v_h);
            headOuts.push(out_h);
            if (do_debug) debug("out_h:" + out_h.describe());
        }

        const att_cat = new ml_tensor([x.length, d_model], concat_heads(headOuts, x.length, H, d_head));
        const Wproj = D.t("blocks." + d_layer + ".attn.proj.weight");

        let att_out = att_cat.mul_with_transpose(Wproj);
        if (do_debug) debug("att_out:" + att_out.describe() + att_out.toHtml());

        if (do_debug) debug("X_resid after att:" + X_resid.describe() + X_resid.toHtml());

        // Residual
        att_out.add_inplace(X_resid);

        if (do_debug) debug("att_out after add " + att_out.describe() + att_out.toHtml());


        var x2 = att_out.clone();
        // LN2
        ml_layer_norm(x2, D.t("blocks." + d_layer + ".ln2.weight"), D.t("blocks." + d_layer + ".ln2.bias"));

        let h = x2.mul_with_transpose(D.t("blocks." + d_layer + ".mlp.0.weight"));
            h.add_per_channel_inplace(D.t("blocks." + d_layer + ".mlp.0.bias"));
            h.gelu_inplace();

        let m =  h.mul_with_transpose(D.t("blocks." + d_layer + ".mlp.2.weight"));
            m.add_per_channel_inplace(D.t("blocks." + d_layer + ".mlp.2.bias"));

        // Residual
        m.add_inplace(att_out);

        X = m;
    }

    // final layer norm
    ml_layer_norm(X, D.t("ln_f.weight"), D.t("ln_f.bias"));

    // logits = X @ head.weight^T
    const head_W = D.t("head.weight");
    const logits = X.mul_with_transpose(D.t("head.weight"));

    return logits;
}


function decode_tokens(ids, itos) 
{
    let s = "";
    for (const id of ids) {
        const tok = itos[id];
        if (tok === "<PAD>" || tok === "<BOS>" || tok === "<SEP>" || tok === "<EOS>")
            continue;
        s += tok;
    }
    return s;
}

function ml( expr )
{
    return ml_predict( expr, D );
}

function ml_predict(expr, D, max_len = 128, allow_ops_first = false) {
  const { stoi, itos } = D.manifest;
  const SEP = stoi["<SEP>"];
  const EOS = stoi["<EOS>"];

  // tokenize once (already BOS..SEP)
  const prefix_ids = tokenize_ml_input(expr, stoi);
  let ids = prefix_ids.slice();
  const prefix_len = prefix_ids.length;

  while (ids.length < max_len) {
    const logits = ml_inference(ids, D);

    const next_id = (() => {
      const T = logits.shape[0];
      const row = logits.row(T - 1);

      row.data[stoi["<PAD>"]] = -Infinity;
      row.data[stoi["<BOS>"]] = -Infinity;
      row.data[stoi["<SEP>"]] = -Infinity;

      const out_len = ids.length - prefix_len;
      if (!allow_ops_first && out_len === 0) {
        for (const ch of ["+", "*", "^"]) {
          if (stoi[ch] !== undefined) row.data[stoi[ch]] = -Infinity;
        }
      }
      return row.argmax()[0];
    })();

    ids.push(next_id);
    if (next_id === EOS) break;
  }

  const sep_index = ids.indexOf(SEP);
  let out_ids = ids.slice(sep_index + 1);
  const eos_index = out_ids.indexOf(EOS);
  if (eos_index >= 0) out_ids = out_ids.slice(0, eos_index);

  return decode_tokens(out_ids, itos);
}
/*
l=new ml_tensor([2,2],[1,2,3,4]);

l.calc_stats();
l.do_normalize();
*/