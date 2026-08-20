import { VectorMap } from "@react-jvectormap/core";
import { worldMill } from "@react-jvectormap/world";

interface CountryMapProps {
  mapColor?: string;
  markers?: Array<{
    latLng: [number, number];
    name: string;
  }>;
}

export default function CountryMap({
  mapColor,
  markers = [],
}: CountryMapProps) {
  return (
    <VectorMap
      map={worldMill}
      backgroundColor="transparent"
      markerStyle={{
        initial: {
          fill: "#10B981",
          r: 4,
        } as never,
      }}
      markersSelectable
      markers={markers}
      zoomOnScroll={false}
      zoomMax={12}
      zoomMin={1}
      zoomAnimate
      zoomStep={1.5}
      regionStyle={{
        initial: {
          fill: mapColor || "#D0D5DD",
          fillOpacity: 1,
          fontFamily: "Outfit",
          stroke: "none",
          strokeWidth: 0,
          strokeOpacity: 0,
        },
        hover: {
          fillOpacity: 0.7,
          cursor: "pointer",
          fill: "#10b981",
          stroke: "none",
        },
        selected: {
          fill: "#10B981",
        },
        selectedHover: {},
      }}
      regionLabelStyle={{
        initial: {
          fill: "#35373e",
          fontWeight: 500,
          fontSize: "13px",
          stroke: "none",
        },
        hover: {},
        selected: {},
        selectedHover: {},
      }}
    />
  );
}
