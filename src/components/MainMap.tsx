import { getOS } from "@lib/utils";
import "@style/App.css";
import { useRef } from "react";

import { Layer, Path, Stage } from "react-konva";

interface Element {
  data: string;
  fill: string;
  display: number;
}

export default function MainMap({
  width = 800,
  height = 650,
  draggable = true,
  fallbackColor = "#fff",

  sections = [],
  chosenSection = {},
}: any) {
  // refs
  const stageRef = useRef<any>();
  const os = getOS();

  const onWheel = (e: any) => {
    e.evt.preventDefault();
    if (stageRef.current) {
      const oldScale = stageRef.current.scaleX();
      const pointer = stageRef.current.getPointerPosition();

      const mousePointTo = {
        x: ((pointer?.x || 0) - stageRef.current.x()) / oldScale,
        y: ((pointer?.y || 0) - stageRef.current.y()) / oldScale,
      };

      let direction = e.evt.deltaY > 0 ? -1 : 1;
      if (os === "Windows") direction = -direction;
      const newScale = direction > 0 ? oldScale * 1.15 : oldScale / 1.15;

      const newPos = {
        x: (pointer?.x || 0) - mousePointTo.x * newScale,
        y: (pointer?.y || 0) - mousePointTo.y * newScale,
      };

      stageRef.current.scale({ x: newScale, y: newScale });
      stageRef.current.position(newPos);
      stageRef.current.clearCache();
    }
  };

  /*
    const _onMouseEnter = (e: any) => {
    const container = e.target?.getStage()?.container();
    const cursorType = !ticketType ? "not-allowed" : "pointer";
      if (container) container.style.cursor = cursorType;
    };
    const _onMouseLeave = (e: any) => {
      const container = e.target?.getStage()?.container();
      if (container) container.style.cursor = "";
    };
  */

  const renderElements = (section: any) => {
    if (!section) return null;
    const { elements, ticketType, isStage } = section; //  isStage, attribute, id, display
    return elements?.map(({ data, display, fill }: Element, key: number) => {
      if (display !== 1) return null;
      const isSectionBg = key === 0;

      // HANDLE FILL COLOR
      let fillDecision = "";
      // if it is the color of the bg and there is ticket type
      if (isSectionBg && ticketType) {
        // handle the color code
        const hasHashSymbol = ticketType?.color?.includes("#");
        fillDecision = ticketType?.color
          ? `${hasHashSymbol ? "" : "#"}${ticketType?.color}`
          : fallbackColor;
      }
      // if it is a stage
      if (isStage) fillDecision = fill;
      // if fill color is ""
      if (!fillDecision) fillDecision = fallbackColor;

      return (
        <Path
          key={key}
          data={data}
          fill={fillDecision}
          stroke={isSectionBg && !isStage ? fallbackColor : ""}
          strokeWidth={isSectionBg ? 1.5 : 0.5}
        />
      );
    });
  };

  if (sections && sections.length === 0) return <div>No data.</div>;
  return (
    <div
      style={{
        width: 800,
        height: 650,
        overflow: "hidden",
        border: "1px solid red",
        backgroundColor: "#000",
        margin: "auto",
        marginTop: "3rem",
      }}
    >
      <Stage
        ref={stageRef}
        onWheel={onWheel}
        width={width}
        height={height}
        draggable={draggable}
      >
        <Layer>{sections?.map(renderElements)}</Layer>
      </Stage>
    </div>
  );
}
