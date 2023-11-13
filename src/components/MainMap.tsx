import { useEffect, useRef, useState } from "react";
import { Group, Layer, Path, Stage } from "react-konva";

import { getOS, getViewBoxRect } from "@lib/utils";

interface Element {
  data: string;
  fill: string;
  display: number;
}

export default function MainMap({
  width = 500,
  height = 500,
  draggable = true,
  fallbackColor = "#fff",
  sectionsViewbox = "0 0 0 0",
  sections = [],
}: any) {
  // refs
  const stageRef = useRef<any>();
  const layerRef = useRef<any>();
  const groupRefs = useRef<any[]>([]);
  const os = getOS();

  // states
  const [mounted, setMounted] = useState(false);

  // methods
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
  const renderSections = (section: any) => {
    if (!section) return null;
    const { elements, ticketType, isStage } = section; //  isStage, attribute, id, display

    const _onMouseEnter = (e: any) => {
      const container = e.target?.getStage()?.container();
      const cursorType = !ticketType ? "not-allowed" : "pointer";
      if (container) container.style.cursor = cursorType;
    };
    const _onMouseLeave = (e: any) => {
      const container = e.target?.getStage()?.container();
      if (container) container.style.cursor = "";
    };

    return elements?.map(({ data, display, fill }: Element, key: number) => {
      if (display !== 1) return null;
      const isBg = key === 0;

      // HANDLE FILL COLOR
      let finalFillColor = "";
      // if it is the color of the bg and there is ticket type
      if (isBg && ticketType) {
        // handle the color code
        const hasHashSymbol = ticketType?.color?.includes("#");
        finalFillColor = ticketType?.color
          ? `${hasHashSymbol ? "" : "#"}${ticketType?.color}`
          : fallbackColor;
      }
      // if it is a stage
      if (isStage) finalFillColor = fill;
      // if fill color is ""
      if (!finalFillColor && !isStage) finalFillColor = fallbackColor;

      // final colors render
      const isNormalBg = isBg && !isStage;
      const finalColors = {
        fill: finalFillColor,
        stroke: isNormalBg ? fallbackColor : "",
        strokeWidth: isNormalBg ? 1.5 : 0.5,
      };

      return (
        <Group
          ref={(e) => {
            groupRefs!.current[key] = e;
          }}
          key={`sections-${key}`}
          onMouseEnter={_onMouseEnter}
          onMouseLeave={_onMouseLeave}
        >
          <Path key={key} data={data} {...finalColors} />
        </Group>
      );
    });
  };

  // check for hydration just to be sure
  useEffect(() => {
    if (!mounted) setMounted(true);
  }, [mounted]);

  // auto center the all sections map
  useEffect(() => {
    const stage = stageRef.current;
    const layer = layerRef.current;
    if (stage && layer) {
      // stage dimensions
      const stageW = stage.getWidth();
      const stageH = stage.getHeight();

      // all sections group dimensions
      const sectionsRect = getViewBoxRect(sectionsViewbox);

      // calculate new scale
      const newWidth = Math.min(stageW, sectionsRect.width);
      const newScale = newWidth / sectionsRect.width;

      // stage center point
      const stageCenterX = Math.floor(stageW / 2);
      const stageCenterY = Math.floor(stageH / 2);

      // all sections group center point
      const sectionsCenterX = Math.floor((sectionsRect.width / 2) * newScale);
      const sectionsCenterY = Math.floor((sectionsRect.height / 2) * newScale);

      // offsets between 2 centers
      const offsetX = stageCenterX - sectionsCenterX;
      const offsetY = stageCenterY - sectionsCenterY;

      // reflect changes on stage
      stage.position({ x: offsetX, y: offsetY });
      stage.scale({ x: newScale, y: newScale });
    }
  }, [sectionsViewbox]);

  // if not hydrated and no sections
  if (!mounted && sections?.length === 0) return <div>No data.</div>;

  // main render
  return (
    <Stage
      ref={stageRef}
      onWheel={onWheel}
      width={width}
      height={height}
      draggable={draggable}
    >
      <Layer ref={layerRef}>{sections?.map(renderSections)}</Layer>
    </Stage>
  );
}
