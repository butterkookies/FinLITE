'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { RotateCw, RotateCcw, Crop, Check, X, RefreshCw } from 'lucide-react';

/**
 * ReceiptCropModal
 * Interactive HTML5 Canvas crop & rotation modal for receipt photos.
 * - Supports 90° CW and CCW rotation with correct aspect-ratio swapping
 * - Draggable crop frame handles with touch-action: none for touch and mouse
 * - Exports strictly normalized image/jpeg Blob
 */
export default function ReceiptCropModal({
  isOpen,
  imageFile,
  imageSrc: initialSrc,
  onClose,
  onConfirm,
}) {
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  // Crop rect normalized between 0 and 1: { x, y, width, height }
  const [crop, setCrop] = useState({ x: 0.05, y: 0.05, width: 0.9, height: 0.9 });
  const [imageSrc, setImageSrc] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const isDraggingRef = useRef(null); // null, 'move', or handle name ('nw', 'ne', 'se', 'sw')
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, initialCrop: null });

  // Resolve source URL from imageFile or initialSrc
  useEffect(() => {
    if (!isOpen) return;
    setRotation(0);
    setCrop({ x: 0.05, y: 0.05, width: 0.9, height: 0.9 });
    setImageLoaded(false);

    let objectUrl = null;
    if (imageFile instanceof Blob || imageFile instanceof File) {
      objectUrl = URL.createObjectURL(imageFile);
      setImageSrc(objectUrl);
    } else if (typeof initialSrc === 'string') {
      setImageSrc(initialSrc);
    }

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [isOpen, imageFile, initialSrc]);

  const handleRotate = (direction) => {
    setRotation((prev) => {
      const delta = direction === 'cw' ? 90 : -90;
      const next = (prev + delta + 360) % 360;
      return next;
    });
    // Reset crop to default on rotate to keep it within new aspect bounds
    setCrop({ x: 0.05, y: 0.05, width: 0.9, height: 0.9 });
  };

  const handleReset = () => {
    setRotation(0);
    setCrop({ x: 0.05, y: 0.05, width: 0.9, height: 0.9 });
  };

  // Dragging & Resizing logic
  const handlePointerDown = (e, handleType) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = handleType;
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      initialCrop: { ...crop },
    };
  };

  const handlePointerMove = useCallback((e) => {
    if (!isDraggingRef.current || !containerRef.current) return;
    e.preventDefault();

    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const deltaX = (e.clientX - dragStartRef.current.mouseX) / rect.width;
    const deltaY = (e.clientY - dragStartRef.current.mouseY) / rect.height;
    const init = dragStartRef.current.initialCrop;
    const handle = isDraggingRef.current;

    const minSize = 0.1; // minimum 10% width/height

    let newX = init.x;
    let newY = init.y;
    let newW = init.width;
    let newH = init.height;

    if (handle === 'move') {
      newX = Math.max(0, Math.min(1 - init.width, init.x + deltaX));
      newY = Math.max(0, Math.min(1 - init.height, init.y + deltaY));
    } else if (handle === 'nw') {
      const right = init.x + init.width;
      const bottom = init.y + init.height;
      newX = Math.max(0, Math.min(right - minSize, init.x + deltaX));
      newY = Math.max(0, Math.min(bottom - minSize, init.y + deltaY));
      newW = right - newX;
      newH = bottom - newY;
    } else if (handle === 'ne') {
      const bottom = init.y + init.height;
      newY = Math.max(0, Math.min(bottom - minSize, init.y + deltaY));
      newW = Math.max(minSize, Math.min(1 - init.x, init.width + deltaX));
      newH = bottom - newY;
    } else if (handle === 'se') {
      newW = Math.max(minSize, Math.min(1 - init.x, init.width + deltaX));
      newH = Math.max(minSize, Math.min(1 - init.y, init.height + deltaY));
    } else if (handle === 'sw') {
      const right = init.x + init.width;
      newX = Math.max(0, Math.min(right - minSize, init.x + deltaX));
      newW = right - newX;
      newH = Math.max(minSize, Math.min(1 - init.y, init.height + deltaY));
    }

    setCrop({
      x: Number(newX.toFixed(4)),
      y: Number(newY.toFixed(4)),
      width: Number(newW.toFixed(4)),
      height: Number(newH.toFixed(4)),
    });
  }, [crop]);

  const handlePointerUp = useCallback(() => {
    isDraggingRef.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  // Export normalized cropped Blob
  const handleApply = async () => {
    const img = imgRef.current;
    if (!img || !imageLoaded) return;
    setIsProcessing(true);

    try {
      const isVertical = rotation === 90 || rotation === 270;
      const rotatedWidth = isVertical ? img.naturalHeight : img.naturalWidth;
      const rotatedHeight = isVertical ? img.naturalWidth : img.naturalHeight;

      // 1. Draw full rotated image to intermediate canvas
      const intermediateCanvas = document.createElement('canvas');
      intermediateCanvas.width = rotatedWidth;
      intermediateCanvas.height = rotatedHeight;
      const iCtx = intermediateCanvas.getContext('2d');

      iCtx.translate(rotatedWidth / 2, rotatedHeight / 2);
      iCtx.rotate((rotation * Math.PI) / 180);
      iCtx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

      // 2. Crop from intermediate canvas to final output canvas
      const sx = Math.max(0, Math.round(crop.x * rotatedWidth));
      const sy = Math.max(0, Math.round(crop.y * rotatedHeight));
      const sWidth = Math.min(Math.round(crop.width * rotatedWidth), rotatedWidth - sx);
      const sHeight = Math.min(Math.round(crop.height * rotatedHeight), rotatedHeight - sy);

      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = Math.max(1, sWidth);
      finalCanvas.height = Math.max(1, sHeight);
      const fCtx = finalCanvas.getContext('2d');

      fCtx.drawImage(
        intermediateCanvas,
        sx,
        sy,
        sWidth,
        sHeight,
        0,
        0,
        finalCanvas.width,
        finalCanvas.height
      );

      finalCanvas.toBlob(
        (blob) => {
          setIsProcessing(false);
          if (blob) {
            // Guarantee file name with normalized .jpg
            const fileName = imageFile?.name
              ? imageFile.name.replace(/\.[^/.]+$/, '') + '-cropped.jpg'
              : `receipt-${Date.now()}.jpg`;
            const normalizedFile = new File([blob], fileName, { type: 'image/jpeg' });
            onConfirm(normalizedFile);
            onClose();
          } else {
            alert('Failed to process image crop.');
          }
        },
        'image/jpeg',
        0.92
      );
    } catch (err) {
      console.error('Error cropping image:', err);
      setIsProcessing(false);
      alert('Error saving cropped image.');
    }
  };

  if (!isOpen) return null;

  const isVertical = rotation === 90 || rotation === 270;

  return (
    <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 select-none animate-in fade-in duration-150">
      <div className="bg-gray-900 border border-gray-700 text-white rounded-3xl max-w-2xl w-full flex flex-col max-h-[92vh] shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-gray-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 flex items-center justify-center">
              <Crop className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-100">Adjust &amp; Rotate Receipt</h3>
              <p className="text-[11px] text-gray-400">Straighten orientation and crop borders</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viewport Canvas / Image Preview Area */}
        <div className="flex-1 bg-black/40 flex items-center justify-center p-4 min-h-[300px] overflow-hidden relative">
          {imageSrc && (
            <div
              ref={containerRef}
              className="relative max-w-full max-h-[50vh] flex items-center justify-center touch-none select-none"
              style={{
                aspectRatio: imgRef.current && imageLoaded
                  ? (isVertical
                      ? `${imgRef.current.naturalHeight} / ${imgRef.current.naturalWidth}`
                      : `${imgRef.current.naturalWidth} / ${imgRef.current.naturalHeight}`)
                  : 'auto',
              }}
            >
              {/* Reference Image */}
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Receipt crop reference"
                crossOrigin="anonymous"
                onLoad={() => setImageLoaded(true)}
                className="max-h-[50vh] max-w-full object-contain pointer-events-none transition-transform duration-200"
                style={{
                  transform: `rotate(${rotation}deg)`,
                }}
              />

              {/* Shaded Overlay Outside Crop Box */}
              {imageLoaded && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: `
                      linear-gradient(to right, rgba(0,0,0,0.6) ${crop.x * 100}%, transparent ${crop.x * 100}%, transparent ${(crop.x + crop.width) * 100}%, rgba(0,0,0,0.6) ${(crop.x + crop.width) * 100}%),
                      linear-gradient(to bottom, rgba(0,0,0,0.6) ${crop.y * 100}%, transparent ${crop.y * 100}%, transparent ${(crop.y + crop.height) * 100}%, rgba(0,0,0,0.6) ${(crop.y + crop.height) * 100}%)
                    `,
                  }}
                />
              )}

              {/* Interactive Crop Frame */}
              {imageLoaded && (
                <div
                  className="absolute border-2 border-emerald-400 cursor-move shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
                  style={{
                    left: `${crop.x * 100}%`,
                    top: `${crop.y * 100}%`,
                    width: `${crop.width * 100}%`,
                    height: `${crop.height * 100}%`,
                    touchAction: 'none',
                  }}
                  onPointerDown={(e) => handlePointerDown(e, 'move')}
                >
                  {/* Grid Lines for Receipt Alignment */}
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                    <div className="border-r border-b border-white/60" />
                    <div className="border-r border-b border-white/60" />
                    <div className="border-b border-white/60" />
                    <div className="border-r border-b border-white/60" />
                    <div className="border-r border-b border-white/60" />
                    <div className="border-b border-white/60" />
                    <div className="border-r border-white/60" />
                    <div className="border-r border-white/60" />
                    <div />
                  </div>

                  {/* Corner Handles */}
                  <div
                    onPointerDown={(e) => handlePointerDown(e, 'nw')}
                    className="absolute -top-2 -left-2 w-4 h-4 bg-emerald-400 border border-white rounded-xs cursor-nwse-resize shadow-md"
                    style={{ touchAction: 'none' }}
                  />
                  <div
                    onPointerDown={(e) => handlePointerDown(e, 'ne')}
                    className="absolute -top-2 -right-2 w-4 h-4 bg-emerald-400 border border-white rounded-xs cursor-nesw-resize shadow-md"
                    style={{ touchAction: 'none' }}
                  />
                  <div
                    onPointerDown={(e) => handlePointerDown(e, 'se')}
                    className="absolute -bottom-2 -right-2 w-4 h-4 bg-emerald-400 border border-white rounded-xs cursor-nwse-resize shadow-md"
                    style={{ touchAction: 'none' }}
                  />
                  <div
                    onPointerDown={(e) => handlePointerDown(e, 'sw')}
                    className="absolute -bottom-2 -left-2 w-4 h-4 bg-emerald-400 border border-white rounded-xs cursor-nesw-resize shadow-md"
                    style={{ touchAction: 'none' }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Toolbar Controls */}
        <div className="px-5 py-3.5 bg-gray-900 border-t border-gray-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleRotate('ccw')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold rounded-xl border border-gray-700 transition-colors"
              title="Rotate 90 degrees counter-clockwise"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Rotate CCW</span>
            </button>
            <button
              type="button"
              onClick={() => handleRotate('cw')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold rounded-xl border border-gray-700 transition-colors"
              title="Rotate 90 degrees clockwise"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Rotate CW</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-800/60 hover:bg-gray-800 text-gray-400 hover:text-gray-200 text-xs rounded-xl border border-gray-700/60 transition-colors"
              title="Reset rotation and crop"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-medium text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={isProcessing || !imageLoaded}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isProcessing ? 'Processing...' : 'Apply & Save'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
