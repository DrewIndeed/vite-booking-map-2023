import Shapes from "konva";
import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Group, Layer, Path, Rect, Stage } from "react-konva";
import { PlacesType, Tooltip } from "react-tooltip";

import {
  BUTTONS,
  RENDER_NUM_SCALE,
  RENDER_SEAT_SCALE,
  SEAT_COLORS,
  ZOOM_SPEED,
} from "@lib/constants";
import {
  debounce,
  getCenter,
  getDistance,
  getOS,
  getViewBoxRect,
} from "@lib/utils";

import type { Layer as LayerType } from "konva/lib/Layer";
import type { KonvaEventObject as EventType } from "konva/lib/Node";
import type { Stage as StageType } from "konva/lib/Stage";
import type { ChosenSeat } from "types/chosen-seat";

import { Row } from "types/row";
import { Seat } from "types/seat";
import { Section } from "types/section";
import Button from "./Button";
import { ChosenSection } from "types/chosen-section";

const os = getOS();
const maxDynamic: number[] = [1];

type ToolTip = {
  place: PlacesType;
  content: string;
};
type MainMapProps = {
  width: number;
  height: number;
  sections: Section[];
  sectionsViewbox: string;

  role?: "web" | "admin" | "mobile";
  zoomSpeed?: number;
  draggable?: boolean;
  isMinimap?: boolean;
  fallbackColor?: "#fff";

  minimap?: ReactNode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chosenSection?: ChosenSection | null;
  tooltip?: Record<string, ToolTip>;
  styles?: React.CSSProperties;

  // methods
  onSelectSeat?: (arg0: ChosenSeat[]) => void;
  onDiffSection?: () => void;
};

const MainMap = ({
  width = 500, // MUST
  height = 500, // MUST
  sections = [], // MUST
  sectionsViewbox = "0 0 0 0", // MUST

  role = "web",
  zoomSpeed = ZOOM_SPEED,
  draggable = true,
  isMinimap = false,
  fallbackColor = "#fff",

  minimap = null,
  chosenSection = null,
  tooltip = {}, // plus, handleReset, minus, eyeOpen, eyeClose
  styles = {},

  // methods
  onSelectSeat = () => {},
  onDiffSection = () => {},
}: MainMapProps) => {
  // refs
  const stageRef = useRef<StageType>(null);
  const viewPortLayerRef = useRef<LayerType>(null);
  const layerRef = useRef<LayerType>(null);
  const seatsLayerRef = useRef<LayerType>(null);
  const chosenSeatsRef = useRef<ChosenSeat[]>([]);

  // [MOBILE] refs
  const lastCenter = useRef({ x: 0, y: 0 });
  const lastDist = useRef(0);

  // states
  const [mounted, setMounted] = useState(false);
  const [initScale, setInitScale] = useState(1);
  const [changedSection, setChangedSection] = useState(false);
  const [showMinimap, setShowMinimap] = useState(true);

  // [COMMON] init needed shapes
  const seatGroup = useMemo(() => new Shapes.Group(), []);
  const seatCircle = useMemo(
    () =>
      new Shapes.Circle({
        radius: role !== "mobile" ? 4 : 4.6,
        strokeWidth: 0.6,
      }),
    [role]
  );
  const seatText = useMemo(
    () =>
      new Shapes.Text({
        align: "center",
        verticalAlign: "middle",
        fontStyle: "600",
      }),
    []
  );

  // [COMMON] handle seats clicked
  const _handleSeatClicked = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (section: Section, row: Row, seat: Seat, ...rest: any) => {
      const [circleElement, isAdmin] = rest;
      const checkExisted = chosenSeatsRef.current.some(
        (chosen: ChosenSeat) => chosen.id === seat.id
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
        circleElement.fill("#2dc275");
        circleElement.stroke("#2dc275");
        // textElement.fill("#000");
      } else {
        // if the seat has been selected
        // change data
        chosenSeatsRef.current = chosenSeatsRef.current.filter(
          (chosen: ChosenSeat) => chosen.id !== seat.id
        );

        // change styles
        circleElement.fill(isAdmin ? SEAT_COLORS.filled[seat.status] : "#fff");
        circleElement.stroke(
          isAdmin ? SEAT_COLORS.stroke[seat.status] : "#9C9B9B"
        );
        // textElement.fill(isAdmin ? "#fff" : "#000");
      }

      onSelectSeat(chosenSeatsRef.current);
    },
    [onSelectSeat]
  );
  // [COMMON] [IMPORTANT] render seats
  const renderSeats = useCallback(
    (newScale = 1) => {
      const stage = stageRef?.current;
      const viewport = viewPortLayerRef?.current;
      const seatsLayer = seatsLayerRef?.current;

      if (!stage || !viewport || !seatsLayer || !chosenSeatsRef.current) return;
      seatsLayer.destroyChildren(); // clear current seats

      if (newScale && newScale > (role !== "mobile" ? RENDER_SEAT_SCALE : 0.6))
        return; // ignore on this scale value
      if (!seatsLayer.clearBeforeDraw()) seatsLayer.clearBeforeDraw(true);

      // Using [EVENT DELAGATION] to handle cursor pointer
      // to reduce event listeners
      if (role !== "mobile") {
        stage.on("mouseover", (event: EventType<MouseEvent>) => {
          const targetElement = event.target;
          const curCursor = targetElement.getStage()!.container().style.cursor;
          if (
            !(targetElement instanceof Shapes.Circle) &&
            !(targetElement instanceof Shapes.Text) &&
            curCursor !== "auto"
          ) {
            targetElement.getStage()!.container().style.cursor = "auto";
          }
        });
      }

      // calculate view box rect
      const viewboxRect = viewport.getClientRect({
        relativeTo: stage,
      });
      const x1 = viewboxRect.x;
      const x2 = viewboxRect.x + viewboxRect.width;
      const y1 = viewboxRect.y;
      const y2 = viewboxRect.y + viewboxRect.height;

      // TODO STUCK: filter section if it is in viewport or not
      sections?.map((section: Section) => {
        if (!section.isStage) {
          section?.rows.forEach((row: Row) => {
            row?.seats.forEach((seat: Seat) => {
              const existed = chosenSeatsRef.current.some(
                (chosen: ChosenSeat) => chosen.id === seat.id
              );
              const notAllowed =
                role === "web"
                  ? ![1, 3, 6].includes(seat.status)
                  : [4, 5].includes(seat.status);
              const isAdmin = role === "admin";
              const noEvent = !section.ticketType || notAllowed;
              const isPrevSelected = seat.status === 3 && role === "web";
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
                let fillVal = "";
                let strokeVal = "";
                if (notAllowed) {
                  fillVal = isAdmin
                    ? SEAT_COLORS.filled[seat.status]
                    : "#f44336";
                  strokeVal = isAdmin
                    ? SEAT_COLORS.stroke[seat.status]
                    : "#f44336";
                } else {
                  // fill color
                  const adminFillCheck = isAdmin
                    ? SEAT_COLORS.filled[seat.status]
                    : "#fff";
                  fillVal =
                    existed || isPrevSelected ? "#2dc275" : adminFillCheck;
                  // stroke color
                  const adminStrokeCheck = isAdmin
                    ? SEAT_COLORS.stroke[seat.status]
                    : "#9C9B9B";
                  strokeVal =
                    existed || isPrevSelected ? "#2dc275" : adminStrokeCheck;
                }
                // final paint
                newSeatCircle.fill(fillVal);
                newSeatCircle.stroke(strokeVal);
                newSeatGroup.add(newSeatCircle);

                if (
                  (role !== "mobile" &&
                    newScale &&
                    newScale < RENDER_NUM_SCALE) ||
                  role === "mobile"
                ) {
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
                  // newSeatText.fill(isAdmin ? "#fff" : "#000");
                  newSeatText.text(seat.name);
                  newSeatGroup.add(newSeatText);
                }
                // --- CREATE SEAT UI ---

                // --- HANDLE SEAT EVENTS ---
                if (role !== "mobile") {
                  newSeatGroup.on("mouseover", () => {
                    newSeatCircle.getStage()!.container().style.cursor = noEvent
                      ? "not-allowed"
                      : "pointer";
                  });
                }
                newSeatGroup.on(
                  role === "mobile" ? "touchend" : "click",
                  () => {
                    if (!stage.isDragging() && !noEvent) {
                      _handleSeatClicked(
                        section,
                        row,
                        seat,
                        newSeatCircle,
                        newSeatText,
                        isAdmin
                      );
                    }
                  }
                );

                // [VERY IMPORTANT] auto pick HOLDING seats
                if (isPrevSelected && !existed) {
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
                }
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
    [role, sections, seatGroup, seatCircle, seatText, _handleSeatClicked]
  );
  // [COMMON] render sections
  const renderSection = (section: Section) => {
    if (!section) return null;
    const { elements, ticketType, isStage, id: renderId } = section; //  isStage, attribute, id, display

    // const _onMouseEnter = (e: EventType<MouseEvent>) => {
    //   if (role === "mobile" || isMinimap) return;
    //   const container = e.target?.getStage()?.container();
    //   const cursorType = !ticketType ? "auto" : "pointer";
    //   if (container) container.style.cursor = cursorType;
    // };
    // const _onMouseLeave = (e: EventType<MouseEvent>) => {
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
            key={`sections-${renderId}-${key}`}
            onMouseEnter={() => {}}
            onMouseLeave={() => {}}
          >
            <Path key={key} data={data} {...finalColors} />
          </Group>
        );
      }
    );
  };
  // [UTILS] handle calculate real view port
  const _calculateViewPort = useCallback(() => {
    const stage = stageRef?.current;
    const viewport = viewPortLayerRef?.current;
    if (!stage || !viewport) return;

    // calculate new scale and position
    const scale = stage.scaleX();
    const newScale = 1 / scale;
    const x = stage.x();
    const y = stage.y();

    // reflect changes on view port tracker
    if (!Number.isNaN(newScale) && !Number.isNaN(newScale)) {
      viewport.scale({ x: newScale, y: newScale });
      viewport.position({ x: -x * newScale, y: -y * newScale });
    }
    viewport.clearCache();
    renderSeats(newScale);
  }, [renderSeats]);
  // [COMMON] handle handleReset
  const handleReset = useCallback(() => {
    const stage = stageRef.current;
    const layer = layerRef.current;
    if (stage && layer) {
      // stage dimensions
      const stageW = stage.width();
      const stageH = stage.height();

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
      if (!Number.isNaN(offsetX) && !Number.isNaN(offsetX)) {
        stage.position({ x: offsetX, y: offsetY });
        stage.scale({ x: newScale, y: newScale });
      }
      if (newScale && 1 / newScale > 1) {
        if (1 / newScale > maxDynamic[maxDynamic.length - 1]) {
          // console.log({ scaleInverse: 1 / newScale, maxDynamic });
          maxDynamic.push(1 / newScale);
        }
        setInitScale(newScale);
      }
      _calculateViewPort();
    }
  }, [_calculateViewPort, sectionsViewbox]);
  // [UTILS] handle zoom limits
  const _limitedNewScale = (newScale: number, oldScale: number) => {
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
  const onWheel = (e: EventType<WheelEvent>) => {
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
      const adjustedNewScale = _limitedNewScale(newScale, oldScale);

      // calculate new pos based on newScale
      const newPos = {
        x: (pointer?.x || 0) - mousePointTo.x * adjustedNewScale.value,
        y: (pointer?.y || 0) - mousePointTo.y * adjustedNewScale.value,
      };

      // reflect changes
      stage.scale({ x: adjustedNewScale.value, y: adjustedNewScale.value });
      stage.position(newPos);
      stage.clearCache();
      debounce(() => _calculateViewPort(), 100)();
    }
  };
  // [MOBILE] handle when fingers start to touch
  const onTouchStart = (e: EventType<TouchEvent>) => {
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
  const onTouchMove = (e: EventType<TouchEvent>) => {
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
      const adjustedNewScale = _limitedNewScale(newScale, oldScale);

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
      debounce(() => _calculateViewPort(), 100)();

      // Update last known distance and center point
      lastDist.current = newDist;
      lastCenter.current = newCenter;
    }
  };
  // [COMMON] handle zoom by button
  const handleZoomByFactor = (factor: number) => {
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
      const adjustedNewScale = _limitedNewScale(newScale, oldScale);

      // calculate new position to keep the stage centered
      const newPos = {
        x: -xCenter * adjustedNewScale.value + stage.width() / 2,
        y: -yCenter * adjustedNewScale.value + stage.height() / 2,
      };

      // apply the new scale and position
      stage.scale({ x: adjustedNewScale.value, y: adjustedNewScale.value });
      stage.position(newPos);
      stage.batchDraw(); // or stage.clearCache() depending on use-case
      debounce(() => _calculateViewPort(), 100)();
    }
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
    const cw = stage.width();
    const ch = stage.height();
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
  useEffect(() => handleReset(), [handleReset]);
  // [MOBILE] force prevent default
  useEffect(() => {
    // function to prevent default behavior for touchmove events
    const preventDefault = (e: TouchEvent) => {
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
      _calculateViewPort();
      setChangedSection(false);
      onDiffSection();
    }
  }, [changedSection, _calculateViewPort, onDiffSection]);

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
        {Object.entries(BUTTONS).map(([, { key, icon, defaultContent }]) => {
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
                    handleZoomByFactor(zoomSpeed * 1.2);
                    break;
                  case "minus":
                    handleZoomByFactor(1 / (zoomSpeed * 1.2));
                    break;
                  default:
                    handleReset();
                    break;
                }
              }}
            />
          );
        })}
        <Button
          isToggle
          icon={BUTTONS.eyeOpen.icon}
          secondIcon={BUTTONS.eyeClose.icon}
          tooltip={{
            content:
              tooltip?.["eye"]?.content || BUTTONS.eyeOpen.defaultContent,
            place: tooltip?.["eye"]?.place,
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
        onTouchEnd={() => _calculateViewPort()}
        onDragEnd={() => _calculateViewPort()}
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
};

export default MainMap;

/*
  Assume 1: user when uses for mobile will set the right role = "mobile"
  Assume 2: user uses 1 finger to drag and 2 fingers to zoom exactly
  Assume 3: user will de-select from accident selections
*/

/**
 * TODO
 * 1.   [USERS] Seat default status stylings (not 1 and 6 -> red) ✅
 * 2.   [USERS] Seat default when reselecting ✅
 * 3.0  [ADMIN] Not available seat default and toggle styles ✅
 * 3.1  [ADMIN] Correct seat styles by seat status ✅
 * 10.  Handle types ✅
 *
 * 3.2  [ADMIN] Seat select all
 * 4.   [ADMIN] Seat select by row
 * 5.   [ADMIN] Toggle Available seats
 * 6.   [ADMIN] Toggle Ordered seats
 * 7.   [ADMIN] Toggle Disabled seats
 * 8.   [ADMIN] Handle sections hover and clicked
 * 9.   [USERS] [MOBILE] Post messages
 */
