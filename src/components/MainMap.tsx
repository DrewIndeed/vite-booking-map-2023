import Shapes from "konva";
import { useCallback, useEffect, useRef, useState } from "react";
import { Group, Layer, Path, Rect, Stage } from "react-konva";
import { Tooltip } from "react-tooltip";

import {
  RENDER_NUM_SCALE,
  RENDER_SEAT_SCALE,
  ZOOM_SPEED,
  buttons,
} from "@lib/constants";
import {
  debounce,
  getCenter,
  getDistance,
  getOS,
  getViewBoxRect,
} from "@lib/utils";

import Button from "./Button";

const os = getOS();
const maxDynamic: any = [1];

export default function MainMap({
  width = 500,
  height = 500,
  zoomSpeed = ZOOM_SPEED,
  draggable = true,

  role = "web",
  fallbackColor = "#fff",
  sections = [], // MUST
  sectionsViewbox = "0 0 0 0", // MUST

  isMinimap = false,
  minimap = null,
  chosenSection = {},
  tooltip = {}, //plus,reset,minus,eyeOpen,eyeClose
  styles = {},
  onSelectSeat = () => {},
}: any) {
  // refs
  const stageRef = useRef<any>();
  const viewPortLayerRef = useRef<any>();
  const layerRef = useRef<any>();
  const seatsLayerRef = useRef<any>();
  const chosenSeatsRef = useRef<any>([]);

  // [MOBILE] refs
  const lastCenter = useRef({ x: 0, y: 0 });
  const lastDist = useRef(0);

  // states
  const [mounted, setMounted] = useState(false);
  const [initScale, setInitScale] = useState(1);
  const [changedSection, setChangedSection] = useState(false);
  const [showMinimap, setShowMinimap] = useState(true);

  // INTERACTIONS RELATED METHODS
  // [COMMON] handle seats clicked
  const _handleSeatClicked = useCallback(
    (section: any, row: any, seat: any, targetElement: any) => {
      const checkExisted = chosenSeatsRef.current.some(
        (chosen: any) => chosen.id === seat.id
      );

      // if the seat has NOT been selected
      if (!checkExisted) {
        if (chosenSeatsRef.current.length > 0) {
          const diffSection =
            section.id !== chosenSeatsRef.current[0].section.id;
          if (diffSection) {
            chosenSeatsRef.current = [];
            setChangedSection(true);
          }
        }

        // change data
        chosenSeatsRef.current = [
          ...chosenSeatsRef.current,
          {
            ...seat,
            rowId: undefined,
            section: {
              ...section,
              elements: undefined,
              rows: undefined,
            },
            row: { ...row, seats: undefined },
          },
        ];

        // changes styles
        targetElement.fill("#2dc275");
        targetElement.stroke("#2dc275");
      } else {
        // if the seat has been selected
        // change data
        chosenSeatsRef.current = chosenSeatsRef.current.filter(
          (chosen: any) => chosen.id !== seat.id
        );

        // change styles
        targetElement.fill("#fff");
        targetElement.stroke("#9b9a9d");
      }

      onSelectSeat(chosenSeatsRef.current);
    },
    [onSelectSeat]
  );
  // [COMMON] render seats
  const renderSeats = useCallback(
    (newScale = 1) => {
      const stage = stageRef?.current;
      const viewport = viewPortLayerRef?.current;
      const seatsLayer = seatsLayerRef?.current;

      if (!stage || !viewport || !seatsLayer || !chosenSeatsRef.current) return;
      seatsLayer.destroyChildren(); // clear current seats

      if (newScale > RENDER_SEAT_SCALE) return; // ignore on this scale value
      if (!seatsLayer.clearBeforeDraw()) seatsLayer.clearBeforeDraw(true);

      // calculate view box rect
      const viewboxRect = viewport.getClientRect({
        relativeTo: stage,
      });
      const x1 = viewboxRect.x;
      const x2 = viewboxRect.x + viewboxRect.width;
      const y1 = viewboxRect.y;
      const y2 = viewboxRect.y + viewboxRect.height;

      // filter and render available seats by LOOPING
      // init needed shapes
      const seatGroup = new Shapes.Group();
      const seatCircle = new Shapes.Circle({
        radius: 4,
        strokeWidth: 0.6,
      });
      const seatText = new Shapes.Text({
        align: "center",
        verticalAlign: "middle",
        fontStyle: "600",
      });

      // Using [EVENT DELAGATION] to handle cursor pointer
      // to reduce event listeners
      if (role !== "mobile") {
        seatsLayer.on("mouseleave", (event: any) => {
          const targetElement = event.target;
          if (targetElement instanceof Shapes.Circle) {
            targetElement.getStage()!.container().style.cursor = "auto";
          }
        });
      }

      // TODO STUCK: filter section if it is in viewport or not
      sections?.map((section: any) => {
        if (!section.isStage) {
          section?.rows.forEach((row: any) => {
            row?.seats.forEach((seat: any) => {
              const initExisted = chosenSeatsRef.current.some(
                (chosen: any) => chosen.id === seat.id
              );
              if (
                seat.x >= x1 &&
                seat.x <= x2 &&
                seat.y >= y1 &&
                seat.y <= y2
              ) {
                // --- CREATE SEAT UI ---
                // seat group clone
                const newSeatGroup = seatGroup.clone();
                // seat circle clone
                const newSeatCircle = seatCircle.clone();
                // seat number clone
                const newSeatText = seatText.clone();

                // add circle
                newSeatCircle.x(seat.x);
                newSeatCircle.y(seat.y);
                newSeatCircle.fill(initExisted ? "#2dc275" : "#fff");
                newSeatCircle.stroke(initExisted ? "#2dc275" : "#9b9a9d");
                newSeatGroup.add(newSeatCircle);

                if (newScale && newScale < RENDER_NUM_SCALE) {
                  // add text
                  newSeatText.x(
                    seat.x - (Number(seat.name) < 10 ? 3.95 : 4.055)
                  );
                  newSeatText.y(
                    seat.y -
                      (Number(seat.name) < 10
                        ? 2.1
                        : role === "mobile"
                        ? 1.7
                        : 2)
                  );
                  newSeatText.width(8);
                  newSeatText.fontSize(Number(seat.name) < 10 ? 5 : 4.7);
                  newSeatText.text(seat.name);
                  newSeatGroup.add(newSeatText);
                }
                // --- CREATE SEAT UI ---

                // --- HANDLE SEAT EVENTS ---
                if (role !== "mobile") {
                  newSeatGroup.on("mouseover", () => {
                    newSeatCircle.getStage()!.container().style.cursor =
                      !section.ticketType ? "not-allowed" : "pointer";
                  });
                }
                newSeatGroup.on(role === "mobile" ? "touchend" : "click", () =>
                  _handleSeatClicked(section, row, seat, newSeatCircle)
                );
                // --- HANDLE SEAT EVENTS ---

                // add created seat group to seats layer
                seatsLayer.add(newSeatGroup);
              }
            });
          });
        }
      });

      // clear cache
      seatsLayer.clearCache();
    },
    [sections, role, _handleSeatClicked]
  );
  // [UTILS] handle calculate real view port
  const calculateViewPort = useCallback(() => {
    const stage = stageRef?.current;
    const viewport = viewPortLayerRef?.current;
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
      if (newScale && 1 / newScale > 1) {
        if (1 / newScale > maxDynamic[maxDynamic.length - 1]) {
          // console.log({ scaleInverse: 1 / newScale, maxDynamic });
          maxDynamic.push(1 / newScale);
        }
        setInitScale(newScale);
      }
      calculateViewPort();
    }
  }, [calculateViewPort, sectionsViewbox]);
  // [UTILS] handle zoom limits
  const limitedNewScale = (newScale: number, oldScale: number) => {
    const maxDynamicFinal = maxDynamic[maxDynamic.length - 1];
    // apply min and max values for scaling
    // const minOffset = ZOOM_MIN_OFFSET[role as Role];
    // const maxOffset = ZOOM_MAX_OFFSET[role as Role];
    if (
      newScale <= oldScale &&
      newScale <= initScale * (maxDynamicFinal / (maxDynamicFinal + 2))
    ) {
      return {
        value: initScale * (maxDynamicFinal / (maxDynamicFinal + 2)),
        reached: true,
      };
    }
    if (
      newScale >= oldScale &&
      newScale >= initScale * maxDynamicFinal * (role === "mobile" ? 2 : 1)
    ) {
      return {
        value: initScale * maxDynamicFinal * (role === "mobile" ? 2 : 1),
        reached: true,
      };
    }
    return { value: newScale, reached: false };
  };
  // [DESKTOP] handle wheeling
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
        direction > 0 ? oldScale * zoomSpeed : oldScale / zoomSpeed;
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
      debounce(() => calculateViewPort(), 100)();
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
      debounce(() => calculateViewPort(), 100)();

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
      debounce(() => calculateViewPort(), 100)();
    }
  };

  // UI RELATED METHODS
  // [COMMON] render sections
  const renderSection = (section: any) => {
    if (!section) return null;
    const { elements, ticketType, isStage, id: renderId } = section; //  isStage, attribute, id, display

    // const _onMouseEnter = (e: any) => {
    //   if (role === "mobile" || isMinimap) return;
    //   const container = e.target?.getStage()?.container();
    //   const cursorType = !ticketType ? "auto" : "pointer";
    //   if (container) container.style.cursor = cursorType;
    // };
    // const _onMouseLeave = (e: any) => {
    //   if (role === "mobile" || isMinimap) return;
    //   const container = e.target?.getStage()?.container();
    //   if (container) container.style.cursor = "";
    // };

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
  // [COMMON] detect if different seats from different section has been selected
  useEffect(() => {
    if (changedSection) {
      calculateViewPort();
      setChangedSection(false);
    }
  }, [changedSection, calculateViewPort]);

  // if not hydrated and no sections
  if (!mounted && sections?.length === 0) return <div>No data.</div>;
  // main render
  return (
    <div
      className={`map-wrapper ${
        isMinimap && `minimap ${!chosenSection?.id ? "filter-darker" : ""}`
      }`}
      // DO NOT TOUCH
      style={{
        width,
        height,
        overflow: "hidden",
        zIndex: 5,
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
                    zoomByFactor(zoomSpeed * 1.2);
                    break;
                  case "minus":
                    zoomByFactor(1 / (zoomSpeed * 1.2));
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
          onClick={() => setShowMinimap(!showMinimap)}
        />
        {role !== "mobile" && <Tooltip id="btn-tooltip" opacity={1} />}
      </div>
      {showMinimap && <>{minimap}</>}
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
        {!isMinimap && (
          <Layer ref={viewPortLayerRef} x={0} y={0} listening={false}>
            <Rect width={width} height={height} x={0} y={0} />
          </Layer>
        )}
        <Layer ref={layerRef}>{sections?.map(renderSection)}</Layer>
        <Layer ref={seatsLayerRef} clearBeforeDraw={false} />
      </Stage>
    </div>
  );
}

/*
  Assume 1: user when uses for mobile will set the right role = "mobile"
*/
