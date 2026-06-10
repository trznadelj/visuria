function getFieldNames(objects) {
    const fields = new Set();
    for (const obj of objects) {
      Object.keys(obj).forEach(key => fields.add(key));
    }
    return Array.from(fields);
}
