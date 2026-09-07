import { mkdir, writeFile } from 'node:fs/promises';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { createAirportModel, disposeAirportModel } from '../src/lib/airportModel.ts';

// Eksportir memakai FileReader peramban; Node cukup membaca Blob tanpa tekstur.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(buffer => {
      this.result = buffer;
      this.onloadend?.({ target: this });
    }).catch(error => this.onerror?.(error));
  }
};
const model = createAirportModel();
try {
  const result = await new GLTFExporter().parseAsync(model, { binary: true });
  const directory = new URL('../public/models/', import.meta.url);
  await mkdir(directory, { recursive: true });
  await writeFile(new URL('apt-pranoto.glb', directory), Buffer.from(result));
  let vertices = 0, meshes = 0;
  model.traverse(object => {
    if (object.isMesh) { meshes++; vertices += object.geometry.attributes.position.count; }
  });
  console.log(JSON.stringify({ bytes: result.byteLength, meshes, triangles: vertices / 3 }));
} finally {
  disposeAirportModel(model);
}
