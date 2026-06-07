'use client'

import { useEffect, useRef, useState } from 'react'
import 'leaflet/dist/leaflet.css'

interface MapaUbicacionProps {
  latitude: number
  longitude: number
  nombre: string
  modo: 'aproximado' | 'exacto'
}

const GOLD = '#C9A84C'
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank">CARTO</a>'

export default function MapaUbicacion({ latitude, longitude, nombre, modo }: MapaUbicacionProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const [mounted, setMounted] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    setMounted(true)
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent))
  }, [])

  useEffect(() => {
    if (!mounted || !containerRef.current || mapRef.current) return

    let cancelled = false

    import('leaflet').then((mod) => {
      if (cancelled || !containerRef.current) return
      const L = (mod as any).default || mod

      const map = L.map(containerRef.current, {
        center: [latitude, longitude],
        zoom: modo === 'exacto' ? 16 : 14,
        zoomControl: true,
        scrollWheelZoom: false,
        attributionControl: true,
      })

      L.tileLayer(TILE_URL, {
        attribution: TILE_ATTR,
        subdomains: 'abcd',
        maxZoom: 20,
      }).addTo(map)

      if (modo === 'exacto') {
        const markerHtml = [
          '<div style="',
          'width:22px;height:22px;',
          'background:' + GOLD + ';',
          'border-radius:50% 50% 50% 0;',
          'transform:rotate(-45deg);',
          'box-shadow:0 3px 12px rgba(0,0,0,0.4);',
          'border:2.5px solid #fff;',
          '"></div>',
        ].join('')

        const icon = L.divIcon({
          className: '',
          html: markerHtml,
          iconSize: [22, 22],
          iconAnchor: [11, 22],
          popupAnchor: [0, -26],
        })

        L.marker([latitude, longitude], { icon })
          .addTo(map)
          .bindPopup('<strong style="font-family:sans-serif;font-size:13px;">' + nombre + '</strong>')
          .openPopup()
      } else {
        L.circle([latitude, longitude], {
          radius: 600,
          color: GOLD,
          fillColor: GOLD,
          fillOpacity: 0.12,
          weight: 2,
          dashArray: '6,4',
        }).addTo(map)

        const dotHtml = [
          '<div style="',
          'width:10px;height:10px;',
          'background:' + GOLD + ';',
          'border-radius:50%;',
          'border:2px solid #fff;',
          'box-shadow:0 2px 8px rgba(0,0,0,0.45);',
          '"></div>',
        ].join('')

        const dotIcon = L.divIcon({
          className: '',
          html: dotHtml,
          iconSize: [10, 10],
          iconAnchor: [5, 5],
        })

        L.marker([latitude, longitude], { icon: dotIcon }).addTo(map)
      }

      mapRef.current = map
    })

    return () => {
      cancelled = true
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [mounted, latitude, longitude, modo, nombre])

  if (!latitude || !longitude) return null

  const gmapsUrl = 'https://www.google.com/maps/dir/?api=1&destination=' + latitude + ',' + longitude
  const wazeUrl = 'https://waze.com/ul?ll=' + latitude + ',' + longitude + '&navigate=yes'
  const appleMapsUrl = 'https://maps.apple.com/?daddr=' + latitude + ',' + longitude

  const btnBase: React.CSSProperties = {
    flex: 1,
    minWidth: '110px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    borderRadius: '8px',
    padding: '10px 16px',
    textDecoration: 'none',
    fontSize: '12px',
    fontWeight: 600,
    fontFamily: 'sans-serif',
    letterSpacing: '0.4px',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  }

  return (
    <div>
      <div style={{ position: 'relative', borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(201,168,76,0.22)', boxShadow: '0 4px 28px rgba(0,0,0,0.28)' }}>
        {!mounted && (
          <div style={{ position: 'absolute', inset: 0, background: '#eee9e1', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}>
            <span style={{ color: '#aaa', fontFamily: 'sans-serif', fontSize: '13px' }}>Cargando mapa…</span>
          </div>
        )}
        <div ref={containerRef} style={{ height: '320px', width: '100%', display: 'block' }} />
        {modo === 'aproximado' && mounted && (
          <div style={{ position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(10,10,10,0.75)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', borderRadius: '20px', padding: '5px 14px', pointerEvents: 'none', zIndex: 500, whiteSpace: 'nowrap' }}>
            <span style={{ color: '#fff', fontFamily: 'sans-serif', fontSize: '11px', letterSpacing: '0.3px' }}>📍 Ubicación aproximada</span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
        <a href={gmapsUrl} target="_blank" rel="noopener noreferrer"
          style={{ ...btnBase, background: GOLD, color: '#0a0700', border: 'none' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
          Cómo llegar
        </a>

        <a href={wazeUrl} target="_blank" rel="noopener noreferrer"
          style={{ ...btnBase, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)', color: '#ccc' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v5l3 3"/>
          </svg>
          Waze
        </a>

        {isIOS && (
          <a href={appleMapsUrl} target="_blank" rel="noopener noreferrer"
            style={{ ...btnBase, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)', color: '#ccc' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            Apple Maps
          </a>
        )}
      </div>
    </div>
  )
}
