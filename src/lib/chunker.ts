export function chunkText(text: string, size=800, overlap=120) {
  const chunks: { text: string; chunk_id: number }[] = [];
  for (let i=0;i<text.length;i+=Math.max(1, size-overlap)) {
    const part = text.slice(i, i+size);
    if (part.trim().length===0) continue;
    chunks.push({ text: part, chunk_id: chunks.length+1 });
  }
  return chunks;
}

