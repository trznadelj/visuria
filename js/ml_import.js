async function loadModel(prefix = "algebra_weights") {
  const manifest = await (await fetch(prefix + ".json")).json();
  const binBuf = await (await fetch(prefix + ".bin")).arrayBuffer();

  function getTensor(name) {
    const info = manifest.tensors[name];
    if (!info) throw new Error("Missing tensor " + name);
    const { offset, nbytes, shape } = info;
    const f32 = new Float32Array(binBuf, offset, nbytes / 4);
    return { data: f32, shape };
  }

  return {
    manifest,
    t: getTensor,
  };
}
