'use client';

import { useEffect, useRef, useState } from 'react';

interface LocationMapPickerProps {
  latitude: number;
  longitude: number;
  onChange: (coordinates: { latitude: number; longitude: number }) => void;
  label?: string;
}

declare global {
  interface Window {
    google?: any;
    googleMapsPromise?: Promise<void>;
  }
}

function loadGoogleMaps(apiKey: string) {
  if (window.google?.maps) return Promise.resolve();
  if (window.googleMapsPromise) return window.googleMapsPromise;

  window.googleMapsPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('ไม่สามารถโหลด Google Maps ได้'));
    document.head.appendChild(script);
  });

  return window.googleMapsPromise;
}

export default function LocationMapPicker({
  latitude,
  longitude,
  onChange,
  label = 'กดบนแผนที่หรือลากหมุดเพื่อกำหนดตำแหน่ง',
}: LocationMapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  const [error, setError] = useState('');
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!apiKey || !containerRef.current) return;

    let isMounted = true;
    loadGoogleMaps(apiKey)
      .then(() => {
        if (!isMounted || !containerRef.current) return;
        const google = window.google;
        const initialPosition = { lat: latitude, lng: longitude };
        const map = new google.maps.Map(containerRef.current, {
          center: initialPosition,
          zoom: 15,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
        });
        const marker = new google.maps.Marker({
          position: initialPosition,
          map,
          draggable: true,
          title: 'ลากหมุดเพื่อกำหนดตำแหน่ง',
        });
        const publishPosition = (position: any) => {
          onChangeRef.current({ latitude: position.lat(), longitude: position.lng() });
        };

        map.addListener('click', (event: any) => {
          marker.setPosition(event.latLng);
          publishPosition(event.latLng);
        });
        marker.addListener('dragend', (event: any) => publishPosition(event.latLng));
        mapRef.current = map;
        markerRef.current = marker;
      })
      .catch((loadError) => {
        if (isMounted) setError(loadError.message || 'ไม่สามารถโหลด Google Maps ได้');
      });

    return () => {
      isMounted = false;
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [apiKey]);

  useEffect(() => {
    const position = { lat: latitude, lng: longitude };
    markerRef.current?.setPosition(position);
    mapRef.current?.panTo(position);
  }, [latitude, longitude]);

  if (!apiKey) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        ต้องกำหนด <code className="font-bold">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> แล้วรีสตาร์ตหน้าเว็บเพื่อใช้ Google Maps
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-3 py-2 text-[11px] font-semibold text-slate-600">
        {label}
      </div>
      {error ? (
        <div className="flex h-[260px] items-center justify-center bg-rose-50 p-4 text-center text-xs font-semibold text-rose-700">{error}</div>
      ) : (
        <div ref={containerRef} className="location-map" />
      )}
      <div className="flex justify-between bg-slate-50 px-3 py-2 font-mono text-[10px] text-slate-500">
        <span>Lat {latitude.toFixed(6)}</span>
        <span>Lng {longitude.toFixed(6)}</span>
      </div>
    </div>
  );
}
