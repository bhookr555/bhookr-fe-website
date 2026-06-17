"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L, { type LatLngBoundsLiteral } from "leaflet";
import "leaflet/dist/leaflet.css";
import { HYDERABAD_CENTER } from "@/lib/crm/hyderabad-pincodes";
import { formatINR } from "@/lib/crm/subscriptions";
import type { LocationCluster } from "@/lib/crm/locations";

interface LocationsMapProps {
  clusters: LocationCluster[];
  highlightedPincode?: string | null;
}

function makeDivIcon(count: number, highlighted: boolean): L.DivIcon {
  const size = Math.min(28 + count * 3, 56);
  const bg = highlighted ? "#E31E24" : "#10b981";
  const ring = highlighted ? "rgba(227,30,36,0.30)" : "rgba(16,185,129,0.30)";
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width: ${size}px; height: ${size}px; border-radius: 50%;
        background: ${bg}; color: white;
        display: flex; align-items: center; justify-content: center;
        font-weight: 700; font-size: 13px;
        box-shadow: 0 0 0 6px ${ring}, 0 2px 8px rgba(0,0,0,0.25);
        border: 2px solid white;
      ">${count}</div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function FitBounds({ clusters }: { clusters: LocationCluster[] }) {
  const map = useMap();
  useEffect(() => {
    if (clusters.length === 0) return;
    const points: LatLngBoundsLiteral = clusters.map(
      (c) => [c.lat, c.lng] as [number, number]
    );
    if (points.length === 1 && points[0]) {
      map.setView(points[0], 13);
    } else {
      map.fitBounds(points, { padding: [40, 40], maxZoom: 14 });
    }
  }, [clusters, map]);
  return null;
}

export default function LocationsMap({
  clusters,
  highlightedPincode,
}: LocationsMapProps) {
  const center = useMemo(
    () =>
      clusters.length > 0 && clusters[0]
        ? ([clusters[0].lat, clusters[0].lng] as [number, number])
        : ([HYDERABAD_CENTER.lat, HYDERABAD_CENTER.lng] as [number, number]),
    [clusters]
  );

  return (
    <MapContainer
      center={center}
      zoom={11}
      scrollWheelZoom
      style={{ height: "100%", width: "100%", borderRadius: "0.75rem" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds clusters={clusters} />
      {clusters.map((c) => {
        const totalCustomers = c.customers.length;
        const highlighted = highlightedPincode === c.pincode;
        return (
          <Marker
            key={c.pincode}
            position={[c.lat, c.lng]}
            icon={makeDivIcon(totalCustomers, highlighted)}
          >
            <Popup>
              <div style={{ minWidth: 220, maxWidth: 260 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                  {c.area} · {c.pincode}
                  {!c.known && (
                    <span
                      style={{
                        marginLeft: 6,
                        fontSize: 10,
                        background: "#fef3c7",
                        color: "#92400e",
                        padding: "1px 6px",
                        borderRadius: 999,
                      }}
                    >
                      approx.
                    </span>
                  )}
                </div>
                <div
                  style={{ fontSize: 11, color: "#6b7280", marginBottom: 8 }}
                >
                  {totalCustomers} customer{totalCustomers === 1 ? "" : "s"} ·{" "}
                  {c.totalOrders} order{c.totalOrders === 1 ? "" : "s"} ·{" "}
                  {formatINR(c.totalRevenue)}
                </div>
                <div
                  style={{
                    maxHeight: 140,
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  {c.customers.slice(0, 8).map((cu) => (
                    <div
                      key={cu.email}
                      style={{
                        borderTop: "1px solid #f3f4f6",
                        paddingTop: 6,
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 600 }}>
                        {cu.name || "—"}
                        {cu.hasSubscription && (
                          <span
                            style={{
                              marginLeft: 6,
                              fontSize: 9,
                              background: "#dcfce7",
                              color: "#166534",
                              padding: "1px 5px",
                              borderRadius: 999,
                            }}
                          >
                            subscriber
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: "#6b7280" }}>
                        {cu.phone} · {cu.orderCount} order
                        {cu.orderCount === 1 ? "" : "s"} ·{" "}
                        {formatINR(cu.orderTotal)}
                      </div>
                    </div>
                  ))}
                  {c.customers.length > 8 && (
                    <div style={{ fontSize: 11, color: "#9ca3af" }}>
                      + {c.customers.length - 8} more…
                    </div>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
