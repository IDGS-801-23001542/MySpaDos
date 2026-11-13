import { useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { api } from '../lib.js';

export function ImageUpload({ value, onChange, label = 'Seleccionar fotografía' }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function uploadImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const body = new FormData();
      body.append('photo', file);
      const result = await api('/media', { method: 'POST', body });
      onChange(result.url);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="image-uploader">
      {value ? (
        <img className="upload-preview" src={value} alt="Vista previa de la fotografía" />
      ) : (
        <span className="photo-empty"><ImagePlus size={28} /></span>
      )}
      <div className="upload-controls">
        <label className="button button-outline upload-button">
          {uploading ? 'Subiendo fotografía...' : label}
          <input
            type="file"
            hidden
            accept="image/png,image/jpeg,image/webp"
            onChange={uploadImage}
            disabled={uploading}
          />
        </label>
        {value && <button type="button" className="text-link" onClick={() => onChange('')}>Quitar foto</button>}
        <small>JPG, PNG o WebP · máximo 2 MB</small>
        {error && <small className="field-error" role="alert">{error}</small>}
      </div>
    </div>
  );
}
