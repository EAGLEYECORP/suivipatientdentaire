import '@testing-library/jest-dom/vitest';

// jsdom n'implémente pas Blob.arrayBuffer() : on le comble via FileReader,
// que la couche imagerie utilise pour lire et chiffrer les clichés.
if (typeof Blob !== 'undefined' && typeof Blob.prototype.arrayBuffer !== 'function') {
  Blob.prototype.arrayBuffer = function lireEnMemoire(this: Blob): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const lecteur = new FileReader();
      lecteur.onload = () => resolve(lecteur.result as ArrayBuffer);
      lecteur.onerror = () => reject(lecteur.error ?? new Error('Lecture du blob impossible.'));
      lecteur.readAsArrayBuffer(this);
    });
  };
}
