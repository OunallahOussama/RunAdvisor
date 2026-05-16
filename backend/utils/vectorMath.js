function cosineSimilarity(vec1 = [], vec2 = []) {
  if (!vec1.length || !vec2.length || vec1.length !== vec2.length) {
    return 0;
  }

  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;

  for (let i = 0; i < vec1.length; i += 1) {
    dotProduct += vec1[i] * vec2[i];
    mag1 += vec1[i] * vec1[i];
    mag2 += vec2[i] * vec2[i];
  }

  mag1 = Math.sqrt(mag1);
  mag2 = Math.sqrt(mag2);

  return mag1 && mag2 ? dotProduct / (mag1 * mag2) : 0;
}

module.exports = { cosineSimilarity };
