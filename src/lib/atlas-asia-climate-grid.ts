export type AsiaClimateGridMetadata = {width:number;height:number;bounds3857:number[]};

/** A class byte, not a continuous observation. Zero always denotes no class. */
export async function decodeAsiaClimateGrid(bytes:Uint8Array, metadata:AsiaClimateGridMetadata) {
  const {width,height,bounds3857}=metadata;
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>4096||height>4096||bounds3857.length!==4||!bounds3857.every(Number.isFinite))throw new Error('Invalid climate grid metadata');
  const expected=width*height;
  // Some hosts transparently decompress .gz responses; support either payload.
  const values=bytes[0]===31&&bytes[1]===139
    ? new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer())
    : bytes;
  if(values.length!==expected||values.some(value=>value>30))throw new Error('Invalid climate grid values');
  return {width,height,bounds3857,values};
}
