import Shapes from "konva";
import { useCallback, useEffect, useRef, useState } from "react";
import { Group, Layer, Path, Rect, Stage } from "react-konva";
import { Tooltip } from "react-tooltip";

import {
  ZOOM_MAX_OFFSET,
  ZOOM_MIN_OFFSET,
  ZOOM_SPEED,
  buttons,
  type Role,
} from "@lib/constants";
import { getCenter, getDistance, getOS, getViewBoxRect } from "@lib/utils";

import Button from "./Button";

export default function MainMap({
  width = 500,
  height = 500,
  draggable = true,

  role = "web",
  fallbackColor = "#fff",
  sectionsViewbox = "0 0 0 0",
  sections = [],
  tooltip = {},

  isMinimap = false,
  minimap = null,
  chosenSection = {},
  onToggleMinimap = () => {},
  styles = {},
}: any) {
  // utils
  const os = getOS();

  // refs
  const stageRef = useRef<any>();
  const layerRef = useRef<any>();
  const viewPortRef = useRef<any>();
  const seatsLayerRef = useRef<any>();
  const groupRefs = useRef<any[]>([]);

  // [MOBILE] refs
  const lastCenter = useRef({ x: 0, y: 0 });
  const lastDist = useRef(0);

  // states
  const [mounted, setMounted] = useState(false);
  const [initScale, setInitScale] = useState(1);

  // INTERACTIONS RELATED METHODS
  // [COMMON] render seats
  const renderSeats = useCallback(
    (newScale = 1) => {
      const stage = stageRef?.current;
      const viewport = viewPortRef?.current;
      const seatsLayer = seatsLayerRef?.current;

      if (!stage || !viewport || !seatsLayer) return;
      seatsLayer.destroyChildren(); // clear current seats

      // TODO: dynamic values for this
      if (newScale > 1.8) return; // ignore on this scale value
      if (!seatsLayer.clearBeforeDraw()) seatsLayer.clearBeforeDraw(true);

      // calcuclate view box rect
      const viewboxRect = viewport.getClientRect({
        relativeTo: stage,
      });
      const x1 = viewboxRect.x;
      const x2 = viewboxRect.x + viewboxRect.width;
      const y1 = viewboxRect.y;
      const y2 = viewboxRect.y + viewboxRect.height;

      // filter and render available seats by LOOPING
      // TODO: improve performance by check for section's position as well
      chosenSection?.rows.forEach((row: any) => {
        row?.seats.forEach((seat: any) => {
          if (seat.x >= x1 && seat.x <= x2 && seat.y >= y1 && seat.y <= y2) {
            const group = new Shapes.Group();
            // seat circle
            group.add(
              new Shapes.Circle({
                x: seat.x,
                y: seat.y,
                radius: 4,
                fill: "white",
                stroke: "black",
                strokeWidth: 0.6,
              })
            );
            // seat number
            if (newScale && newScale < 0.4) { // TODO: dynamic values for this
              group.add(
                new Shapes.Text({
                  x: seat.x - (Number(seat.name) < 10 ? 4 : 4.1),
                  y: seat.y - 2.6,
                  width: 8,
                  fontSize: 6,
                  align: "center",
                  fontStyle: "bold",
                  text: seat.name,
                })
              );
            }

            // console.log(x1, x2, y1, y2, newScale);
            seatsLayer.add(group); // add to a seat group
          }
        });
      });

      // clear cache
      seatsLayer.clearCache();
    },
    [chosenSection?.rows]
  );
  // [UTILS] handle calculate real view port
  const calculateViewPort = useCallback(() => {
    const stage = stageRef?.current;
    const viewport = viewPortRef?.current;
    if (!stage || !viewport) return;

    // calculate new scale and position
    const scale = stage.getScaleX();
    const newScale = 1 / scale;
    const x = stage.x();
    const y = stage.y();

    // reflect changes on view port tracker
    viewport.scale({ x: newScale, y: newScale });
    viewport.position({ x: -x * newScale, y: -y * newScale });
    viewport.clearCache();

    renderSeats(newScale);
  }, [renderSeats]);
  // [COMMON] handle reset
  const reset = useCallback(() => {
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
      setInitScale(newScale);
      calculateViewPort();
    }
  }, [calculateViewPort, sectionsViewbox]);
  // [UTILS] handle zoom limits
  const limitedNewScale = (newScale: number, oldScale: number) => {
    // apply min and max values for scaling
    const minOffset = ZOOM_MIN_OFFSET[role as Role];
    const maxOffset = ZOOM_MAX_OFFSET[role as Role];
    if (newScale <= oldScale && newScale <= initScale * minOffset) {
      return { value: initScale * minOffset, reached: true };
    }
    if (newScale >= oldScale && newScale >= initScale * maxOffset) {
      return { value: initScale * maxOffset, reached: true };
    }
    return { value: newScale, reached: false };
  };
  // [DESKTOP] event methods
  const onWheel = (e: any) => {
    e.evt.preventDefault();
    if (isMinimap) return;
    const stage = stageRef.current;
    if (stage) {
      // get current scale
      const oldScale = stage.scaleX();

      // get pointer positions on stage
      const pointer = stage.getPointerPosition();
      const mousePointTo = {
        x: ((pointer?.x || 0) - stage.x()) / oldScale,
        y: ((pointer?.y || 0) - stage.y()) / oldScale,
      };

      // direction of scaling
      let direction = e.evt.deltaY > 0 ? -1 : 1;
      if (os === "Windows") direction = -direction;

      // calculate new scale and new position for stage
      const newScale: number =
        direction > 0 ? oldScale * ZOOM_SPEED : oldScale / ZOOM_SPEED;
      // apply scale limits
      const adjustedNewScale = limitedNewScale(newScale, oldScale);

      // calculate new pos based on newScale
      const newPos = {
        x: (pointer?.x || 0) - mousePointTo.x * adjustedNewScale.value,
        y: (pointer?.y || 0) - mousePointTo.y * adjustedNewScale.value,
      };

      // reflect changes
      stage.scale({ x: adjustedNewScale.value, y: adjustedNewScale.value });
      stage.position(newPos);
      stage.clearCache();
      calculateViewPort();
    }
  };
  // [MOBILE] handle when fingers start to touch
  const onTouchStart = (e: any) => {
    if (role !== "mobile") return;
    if (e.evt.touches.length === 2) {
      // Prevent the window from being moved around
      e.evt.preventDefault();
      e.evt.stopPropagation();

      const touch1 = e.evt.touches[0];
      const touch2 = e.evt.touches[1];

      lastCenter.current = getCenter(
        { x: touch1.clientX, y: touch1.clientY },
        { x: touch2.clientX, y: touch2.clientY }
      );

      lastDist.current = getDistance(
        { x: touch1.clientX, y: touch1.clientY },
        { x: touch2.clientX, y: touch2.clientY }
      );
    }
  };
  // [MOBILE] handle when 2 fingers move
  const onTouchMove = (e: any) => {
    if (role !== "mobile") return;
    if (e.evt.touches.length === 2) {
      // Prevent the window from being moved around
      e.evt.preventDefault();
      e.evt.stopPropagation();

      const touch1 = e.evt.touches[0];
      const touch2 = e.evt.touches[1];

      const stage = stageRef.current;
      if (!stage) return;

      // Calculate current distance and center between fingers
      const newDist = getDistance(
        { x: touch1.clientX, y: touch1.clientY },
        { x: touch2.clientX, y: touch2.clientY }
      );
      const newCenter = getCenter(
        { x: touch1.clientX, y: touch1.clientY },
        { x: touch2.clientX, y: touch2.clientY }
      );

      // Calculate scale based on the change in distance
      const scaleFactor = newDist / lastDist.current;
      const oldScale = stage.scaleX();
      const newScale: number = oldScale * scaleFactor;
      // apply scale limits
      const adjustedNewScale = limitedNewScale(newScale, oldScale);

      // if not reached limits
      if (!adjustedNewScale.reached) {
        // Calculate the position of the new center point on the stage before scaling
        const stageCenterBefore = {
          x: newCenter.x - stage.x(),
          y: newCenter.y - stage.y(),
        };

        // Calculate the scaled position of the center point
        const stageCenterAfter = {
          x: stageCenterBefore.x * scaleFactor,
          y: stageCenterBefore.y * scaleFactor,
        };

        // Calculate the difference in the center position as a result of scaling
        const stageCenterDiff = {
          x: stageCenterAfter.x - stageCenterBefore.x,
          y: stageCenterAfter.y - stageCenterBefore.y,
        };

        // Adjust the stage position with the difference so the center point remains stationary
        const newPos = {
          x: stage.x() - stageCenterDiff.x,
          y: stage.y() - stageCenterDiff.y,
        };

        // Apply the new scale and postion
        stage.scaleX(adjustedNewScale.value);
        stage.scaleY(adjustedNewScale.value);
        stage.position(newPos);
      }

      // reflect changes
      stage.batchDraw();
      stage.clearCache();
      calculateViewPort();

      // Update last known distance and center point
      lastDist.current = newDist;
      lastCenter.current = newCenter;
    }
  };
  // [COMMON] handle zoom by button
  const zoomByFactor = (factor: number) => {
    const stage = stageRef.current;
    if (stage) {
      // get current scale
      const oldScale = stage.scaleX();

      // calculate center point between the stage dimensions
      const xCenter = stage.width() / 2 / oldScale - stage.x() / oldScale;
      const yCenter = stage.height() / 2 / oldScale - stage.y() / oldScale;

      // calculate new scale based on the factor
      const newScale: number = oldScale * factor;
      // apply scale limits
      const adjustedNewScale = limitedNewScale(newScale, oldScale);

      // calculate new position to keep the stage centered
      const newPos = {
        x: -xCenter * adjustedNewScale.value + stage.width() / 2,
        y: -yCenter * adjustedNewScale.value + stage.height() / 2,
      };

      // apply the new scale and position
      stage.scale({ x: adjustedNewScale.value, y: adjustedNewScale.value });
      stage.position(newPos);
      stage.batchDraw(); // or stage.clearCache() depending on use-case
      calculateViewPort();
    }
  };

  // UI RELATED METHODS
  // [COMMON] render sections
  const renderSection = (section: any) => {
    if (!section) return null;
    const { elements, ticketType, isStage, id: renderId } = section; //  isStage, attribute, id, display

    const _onMouseEnter = (e: any) => {
      if (role === "mobile" || isMinimap) return;
      const container = e.target?.getStage()?.container();
      const cursorType = !ticketType ? "auto" : "pointer";
      if (container) container.style.cursor = cursorType;
    };
    const _onMouseLeave = (e: any) => {
      if (role === "mobile" || isMinimap) return;
      const container = e.target?.getStage()?.container();
      if (container) container.style.cursor = "";
    };

    return elements?.map(
      (
        {
          data,
          display,
          fill,
        }: {
          data: string;
          fill: string;
          display: number;
        },
        key: number
      ) => {
        const isBg = key === 0;

        // if display value from BE
        if (display !== 1) return null;

        // is not stage and not background in minimap
        if (!isStage && isMinimap && !isBg) return null;

        // HANDLE FILL COLOR
        let finalFillColor = "";
        // handle the color code
        const hasHashSymbol = ticketType?.color?.includes("#");
        const extractedColor = ticketType?.color
          ? `${hasHashSymbol ? "" : "#"}${ticketType?.color}`
          : fallbackColor;

        // if it is the color of the bg and there is ticket type
        if (isBg && ticketType) {
          finalFillColor = extractedColor;
        }
        // if it is a stage
        if (isStage) finalFillColor = fill;
        // if fill color is ""
        if (!finalFillColor && !isStage) finalFillColor = fallbackColor;

        // if it is minimap
        if (isMinimap) {
          // if it is normal sections
          if (!isStage && chosenSection?.id && chosenSection?.id !== 0)
            finalFillColor = fallbackColor;
          if (chosenSection?.id && chosenSection?.id === renderId)
            finalFillColor = extractedColor;
        }

        // final colors render
        const isNormalBg = isBg && !isStage;
        const finalColors = {
          fill: finalFillColor,
          stroke: isNormalBg ? (isMinimap ? "#000" : fallbackColor) : "",
          strokeWidth: isNormalBg ? 1.5 : 0.5,
        };

        return (
          <Group
            ref={(e) => {
              groupRefs!.current[key] = e;
            }}
            key={`sections-${key}`}
            onMouseEnter={() => {}}
            onMouseLeave={() => {}}
          >
            <Path key={key} data={data} {...finalColors} />
          </Group>
        );
      }
    );
  };

  // [COMMON] check for hydration and calculate viewport initially
  useEffect(() => {
    // set true for hydration
    if (!mounted) {
      setMounted(true);
      return;
    }

    // initially calculate the real view port
    const stage = stageRef.current;
    const layer = layerRef.current;
    if (!stage || !layer) return;

    // get stage and layer dimensions
    const cw = stage.getWidth();
    const ch = stage.getHeight();
    const box = layer.getClientRect();

    // calculate new scale
    const newWidth = Math.min(cw, box.width);
    const newScale = newWidth / box.width;

    // calculate offset to re-position
    let xOffset = 0;
    let yOffset = 0;
    if (box.width < cw) {
      xOffset = (cw - box.width) / 2;
      yOffset = (ch - box.height) / 2;
    }

    // reflect changes on stage
    stage.position({ x: xOffset, y: yOffset });
    stage.scale({ x: newScale, y: newScale });
  }, [mounted]);
  // [COMMON] auto scale and center the all sections map
  useEffect(() => reset(), [reset]);
  // [MOBILE] force prevent default
  useEffect(() => {
    // function to prevent default behavior for touchmove events
    const preventDefault = (e: any) => {
      // check if it's a one-finger touch event
      if (e.touches.length === 1) e.preventDefault();
    };
    // add event listener to the document with the passive option set to false
    document.addEventListener("touchmove", preventDefault, { passive: false });
    // cleanup the event listener when the component unmounts
    return () => document.removeEventListener("touchmove", preventDefault);
  }, []);

  // if not hydrated and no sections
  if (!mounted && sections?.length === 0) return <div>No data.</div>;
  // main render
  return (
    <div
      className={`map-wrapper ${isMinimap && "minimap"}`}
      // DO NOT TOUCH
      style={{
        width,
        height,
        overflow: "hidden",
        zIndex: 5,
        filter:
          isMinimap && !chosenSection?.id
            ? "brightness(50%)"
            : "brightness(100%)",
        ...styles,
      }}
    >
      <div
        className="btn-wrapper"
        // DO NOT TOUCH
        style={{
          display: isMinimap ? "none" : "flex",
          flexDirection: "column",
          position: "absolute",
        }}
      >
        {Object.entries(buttons).map(([, { key, icon, defaultContent }]) => {
          if (key.includes("eye")) return null;
          return (
            <Button
              key={key}
              icon={icon}
              tooltip={{
                content: tooltip?.[key]?.content || defaultContent,
                place: tooltip?.[key]?.place || "",
              }}
              onClick={() => {
                switch (key) {
                  case "plus":
                    zoomByFactor(ZOOM_SPEED);
                    break;
                  case "minus":
                    zoomByFactor(1 / ZOOM_SPEED);
                    break;
                  default:
                    reset();
                    break;
                }
              }}
            />
          );
        })}
        <Button
          isToggle
          icon={buttons.eyeOpen.icon}
          secondIcon={buttons.eyeClose.icon}
          tooltip={{
            content:
              tooltip?.["eye"]?.content || buttons.eyeOpen.defaultContent,
            place: tooltip?.["eye"]?.place || "",
          }}
          onClick={() => onToggleMinimap()}
        />
        {role !== "mobile" && <Tooltip id="btn-tooltip" opacity={1} />}
      </div>
      <>{minimap}</>
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        draggable={draggable && !isMinimap}
        onWheel={onWheel}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={() => calculateViewPort()}
        onDragEnd={() => calculateViewPort()}
      >
        <Layer ref={layerRef}>{sections?.map(renderSection)}</Layer>
        {!isMinimap && (
          <Layer ref={viewPortRef} x={0} y={0} listening={false}>
            <Rect width={width} height={height} x={0} y={0} />
          </Layer>
        )}
        <Layer ref={seatsLayerRef} listening={false} clearBeforeDraw={false} />
      </Stage>
    </div>
  );
}

/*
  Assume 1: user when uses for mobile will set the right role = "mobile"
*/
