import React, { useEffect, useRef, useState } from 'react';
import { useLang } from '../context/LangContext';

// Camera-based barcode scanner using the BarcodeDetector API when available,
// with a manual-entry fallback for browsers/devices that don't support it.
export default function BarcodeScannerModal({ onDetected, onClose }) {
  const { lang } = useLang();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [manualCode, setManualCode] = useState('');
  const [error, setError] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (!('BarcodeDetector' in window)) {
      setSupported(false);
      return;
    }
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);
      detectLoop();
    } catch (err) {
      setError(lang === 'so' ? 'Camera-ga lama heli karo geli barcode-ka gacanta' : 'Camera unavailable, enter barcode manually');
      setSupported(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(function (t) { t.stop(); });
      streamRef.current = null;
    }
    setScanning(false);
  };

  const detectLoop = async () => {
    if (!('BarcodeDetector' in window)) return;
    const detector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code'] });
    const tick = async () => {
      if (!videoRef.current || !streamRef.current) return;
      try {
        const codes = await detector.detect(videoRef.current);
        if (codes.length > 0) {
          const value = codes[0].rawValue;
          stopCamera();
          onDetected(value);
          return;
        }
      } catch (e) {}
      if (streamRef.current) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualCode.trim()) onDetected(manualCode.trim());
  };

  const handleClose = () => { stopCamera(); onClose(); };

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="modal" style={{ maxWidth: '420px' }} onClick={function (e) { e.stopPropagation(); }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '700' }}>
          {lang === 'so' ? 'Iskaan Barcode' : 'Scan Barcode'}
        </h3>

        {supported && !error ? (
          <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', background: '#111', marginBottom: '16px' }}>
            <video ref={videoRef} style={{ width: '100%', display: 'block' }} muted playsInline></video>
            <div style={{ position: 'absolute', inset: 0, border: '3px solid #1D9E75', borderRadius: '12px', pointerEvents: 'none' }}>
              <div style={{ position: 'absolute', top: '40%', left: '10%', right: '10%', height: '2px', background: '#1D9E75' }}></div>
            </div>
            {scanning && (
              <div style={{ position: 'absolute', bottom: '8px', left: 0, right: 0, textAlign: 'center', color: 'white', fontSize: '12px' }}>
                {lang === 'so' ? 'U jeedi barcode-ka camera-ga' : 'Point camera at barcode'}
              </div>
            )}
          </div>
        ) : (
          <div className="alert-warning" style={{ marginBottom: '16px' }}>
            {error || (lang === 'so' ? 'Browser-kani camera ma taageero' : 'This browser does not support camera scanning')}
          </div>
        )}

        <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '16px' }}>
          <label className="form-label">{lang === 'so' ? 'Ama geli barcode-ka gacanta' : 'Or enter barcode manually'}</label>
          <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: '8px' }}>
            <input
              autoFocus
              className="form-input"
              value={manualCode}
              onChange={function (e) { setManualCode(e.target.value); }}
              placeholder={lang === 'so' ? 'Geli barcode...' : 'Enter barcode...'}
            />
            <button type="submit" className="btn-primary">OK</button>
          </form>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button className="btn-secondary" onClick={handleClose}>{lang === 'so' ? 'Jooji' : 'Cancel'}</button>
        </div>
      </div>
    </div>
  );
                                                 }
