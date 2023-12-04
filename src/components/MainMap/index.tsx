import Shapes from "konva";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Group, Layer, Path, Rect, Stage } from "react-konva";

import { RENDER_SEAT_SCALE, SEAT_COLORS, ZOOM_SPEED } from "@lib/constants";
import {
  cn,
  debounce,
  getCenter,
  getDistance,
  getOS,
  getViewBoxRect,
} from "@lib/utils";

import type { Layer as LayerType } from "konva/lib/Layer";
import type { KonvaEventObject as EventType } from "konva/lib/Node";
import type { Stage as StageType } from "konva/lib/Stage";
import type { PlacesType } from "react-tooltip";
import type { ChosenSeat } from "types/chosen-seat";
import type { ChosenSection } from "types/chosen-section";
import type { Row } from "types/row";
import type { Seat } from "types/seat";
import type { Section } from "types/section";

import Buttons from "../Buttons";
import {
  _limitedNewScale,
  getAllSeats,
  handleSectionFill,
  renderSectionRows,
} from "./methods";

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
  renderSeatScale?: number;
  debounceWheelMs?: number;
  zoomByFactorOffset?: number;
  draggable?: boolean;
  isMinimap?: boolean;
  fallbackColor?: "#fff";

  minimap?: ReactNode;
  chosenSection?: ChosenSection | null;
  tooltip?: Record<string, ToolTip>;
  styles?: React.CSSProperties;

  // methods
  onSelectSeat?: (arg0: ChosenSeat[]) => void;
  onSelectSection?: (arg0: Section) => void;
  onPostMessage?: (arg0: {
    type: "onSelectSection" | "onSelectSeat";
    data: string;
  }) => void;
  onDiffSection?: () => void;
  onSelectAll?: (arg0: ChosenSeat[]) => void;
  onSelectRow?: (arg0: ChosenSeat[], arg1: number[]) => void;
  onClearAll?: () => void;

  // admin
  prevStageInfos?: Record<string, number>;
  useSelectAll?: (arg0: boolean) => [boolean, (arg0: boolean) => void];
  useClearAll?: (arg0: boolean) => [boolean, (arg0: boolean) => void];
  useSelectRow?: (arg0: boolean) => [boolean, (arg0: boolean) => void];
  useShowAvailable?: (arg0: boolean) => [boolean, (arg0: boolean) => void];
  useShowOrdered?: (arg0: boolean) => [boolean, (arg0: boolean) => void];
  useShowDisabled?: (arg0: boolean) => [boolean, (arg0: boolean) => void];
};

const MainMap = forwardRef(
  (
    {
      width = 500, // MUST
      height = 500, // MUST
      sections = [], // MUST
      sectionsViewbox = "0 0 0 0", // MUST

      role = "web",
      zoomSpeed = ZOOM_SPEED,
      renderSeatScale = RENDER_SEAT_SCALE,
      debounceWheelMs = 100,
      zoomByFactorOffset = 1.35,
      draggable = true,
      isMinimap = false,
      fallbackColor = "#fff",

      minimap = null,
      chosenSection = null,
      tooltip = {}, // plus, reset, minus, eye
      styles = {},

      // methods
      onSelectSeat = () => {},
      onSelectSection = () => {},
      onDiffSection = () => {},
      onPostMessage = () => {},
      onSelectAll = () => {},
      onSelectRow = () => {},
      onClearAll = () => {},

      // admin
      prevStageInfos = {},
      useSelectAll = () => [false, () => {}],
      useClearAll = () => [false, () => {}],
      useSelectRow = () => [false, () => {}],
      useShowAvailable = () => [false, () => {}],
      useShowOrdered = () => [false, () => {}],
      useShowDisabled = () => [false, () => {}],
    }: MainMapProps,
    mainMapRef
  ) => {
    // refs
    const stageRef = useRef<StageType>(null);
    const viewLayerRef = useRef<LayerType>(null);
    const layerRef = useRef<LayerType>(null);
    const seatsLayerRef = useRef<LayerType>(null);
    const chosenSeatsRef = useRef<ChosenSeat[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allSectionsRef = useRef<any>({});

    // [MOBILE] refs
    const lastCenter = useRef({ x: 0, y: 0 });
    const lastDist = useRef(0);

    // states
    const [mounted, setMounted] = useState(false);
    const [initScale, setInitScale] = useState(1);
    const [changedSection, setChangedSection] = useState(false);
    const [showMinimap, setShowMinimap] = useState(true);
    const [changedStage, setChangedStage] = useState(false);
    const [hasReset, setHasReset] = useState(false);
    const [hasResetSection, setHasResetSection] = useState(false);

    // [ADMIN] selection related
    const allSeatsReachedRef = useRef<boolean>(false);
    const [isSelectAll, setIsSelectAll] = useSelectAll(false);
    const [isClearAll, setIsClearAll] = useClearAll(false);
    const [isSelectRow, setIsSelectRow] = useSelectRow(false);
    const [isShowAvailable, setIsShowAvailable] = useShowAvailable(false);
    const [isShowOrdered, setIsShowOrdered] = useShowOrdered(false);
    const [isShowDisabled, setIsShowDisabled] = useShowDisabled(false);

    // memos
    // init konva needed shapes
    const seatGroup = useMemo(
      () => new Shapes.Group({ perfectDrawEnabled: false }),
      []
    );
    const seatCircle = useMemo(
      () =>
        new Shapes.Circle({
          radius: role !== "mobile" ? 4 : 4.6,
          strokeWidth: 0.6,
          perfectDrawEnabled: false,
        }),
      [role]
    );
    const seatText = useMemo(
      () =>
        new Shapes.Text({
          width: 8,
          align: "center",
          verticalAlign: "middle",
          fontStyle: "600",
          perfectDrawEnabled: false,
        }),
      []
    );
    // all seats
    const allSeats = useMemo(() => getAllSeats(sections), [sections]);

    // [COMMON] handle update chosen seats array
    const _updateChosenSeats = useCallback(
      (section: Section, row: Row, seat: Seat) => {
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
      },
      []
    );
    // [COMMON] handle seats clicked
    const _renderSeatClicked = useCallback(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (section: Section, row: Row, seat: Seat, ...rest: any) => {
        const [circleElement, isAdmin] = rest;
        const checkExisted = chosenSeatsRef.current.some(
          (chosen: ChosenSeat) => chosen.id === seat.id
        );

        // if the seat has NOT been selected
        if (!checkExisted) {
          // TODO: check isAdmin again
          if (chosenSeatsRef.current.length > 0 && !isAdmin) {
            const diffSection =
              section.id !== chosenSeatsRef.current[0].section.id;
            if (diffSection) {
              chosenSeatsRef.current = [];
              setChangedSection(true);
            }
          }
          // change data
          _updateChosenSeats(section, row, seat);
          // changes styles
          circleElement.fill("#2dc275");
          circleElement.stroke("#2dc275");
        } else {
          // if the seat has been selected
          // change data
          chosenSeatsRef.current = chosenSeatsRef.current.filter(
            (chosen: ChosenSeat) => chosen.id !== seat.id
          );
          // change styles
          const adminFilled = SEAT_COLORS.filled[seat.status];
          const adminStroke = SEAT_COLORS.stroke[seat.status];
          circleElement.fill(isAdmin ? adminFilled : "#fff");
          circleElement.stroke(isAdmin ? adminStroke : "#9C9B9B");

          if (isSelectAll) {
            if (!allSeatsReachedRef.current) allSeatsReachedRef.current = true;
            setIsSelectAll(false);
          }
        }

        onSelectSeat(chosenSeatsRef.current);
        if (role === "mobile") {
          onPostMessage({
            type: "onSelectSeat",
            data: JSON.stringify(chosenSeatsRef.current),
          });
        }
      },
      // DO NOT ADD setIsSelectAll
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [isSelectAll, onSelectSeat]
    );
    // [COMMON] [IMPORTANT] render seats
    const _renderSectionSeats = useCallback(
      (newScale = 1) => {
        const stage = stageRef?.current;
        const viewport = viewLayerRef?.current;
        const seatsLayer = seatsLayerRef?.current;

        // if it is all sections view
        if (
          !stage ||
          !viewport ||
          !seatsLayer ||
          !chosenSeatsRef.current ||
          (role !== "admin" && !chosenSection?.id)
        )
          return;
        seatsLayer.destroyChildren(); // clear current seats

        if (newScale && newScale > (role !== "mobile" ? renderSeatScale : 1))
          return; // ignore on this scale value
        if (!seatsLayer.clearBeforeDraw()) seatsLayer.clearBeforeDraw(true);

        // Using [EVENT DELAGATION] to handle cursor pointer
        // to reduce event listeners
        if (role !== "mobile") {
          stage.on("mouseover", (event: EventType<MouseEvent>) => {
            const targetElement = event.target;
            const curCursor = targetElement.getStage()!.container()
              .style.cursor;
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const commonParams = [
          role,
          isSelectAll,
          isShowAvailable,
          isShowOrdered,
          isShowDisabled,
          newScale,
          { x1, x2, y1, y2 },
          { seatGroup, seatCircle, seatText },
          { stageRef, seatsLayerRef, chosenSeatsRef, allSeatsReachedRef },
          { _updateChosenSeats, _renderSeatClicked },
        ];
        if (!chosenSection?.id) {
          sections?.forEach((section: Section) => {
            if (!section.isStage) renderSectionRows(section, commonParams);
          });
        } else renderSectionRows(chosenSection, commonParams);

        // clear cache
        seatsLayer.clearCache();
      },
      [
        role,
        chosenSection,
        renderSeatScale,
        isSelectAll,
        isShowAvailable,
        isShowOrdered,
        isShowDisabled,
        seatGroup,
        seatCircle,
        seatText,
        _updateChosenSeats,
        _renderSeatClicked,
        sections,
      ]
    );
    // [UTILS] handle calculate real view port
    const _calculateViewPort = useCallback(() => {
      const stage = stageRef?.current;
      const viewport = viewLayerRef?.current;
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
      _renderSectionSeats(newScale);
    }, [_renderSectionSeats]);
    // [SPECIAL] handle reset chosen section
    const handleResetSection = useCallback(() => {
      const stage = stageRef.current;
      const viewLayer = viewLayerRef.current;
      if (!stage || !viewLayer || !chosenSection?.id) return;

      // get chosen section Group corners from bakcground path
      const sectionCorners = allSectionsRef.current[
        chosenSection?.id
      ].children[0].dataArray
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((item: any) => item.points)
        .reduce(
          (prev: { x: number[]; y: number[] }, item: [number, number]) => {
            if (!item.length) return prev;
            prev.x = [...prev.x, item[0]];
            prev.y = [...prev.y, item[1]];
            return prev;
          },
          { x: [], y: [] }
        );

      // sort x and y of corner coordinates from small to large
      const sortedCornersData = {
        x: sectionCorners.x
          .sort((a: number, b: number) => a - b)
          .map(Math.floor),
        y: sectionCorners.y
          .sort((a: number, b: number) => a - b)
          .map(Math.floor),
      };

      /**               X   Y
       * Top left:     min min
       * Top right:    max min
       * Bottom right: max max
       * Bottom left:  min max
       */
      // create 4 corners object
      const wrapCorners = {
        topLeft: [sortedCornersData.x[0], sortedCornersData.y[0]],
        topRight: [
          sortedCornersData.x[sortedCornersData.x.length - 1],
          sortedCornersData.y[0],
        ],
        bottomRight: [
          sortedCornersData.x[sortedCornersData.x.length - 1],
          sortedCornersData.y[sortedCornersData.y.length - 1],
        ],
        bottomLeft: [
          sortedCornersData.x[0],
          sortedCornersData.y[sortedCornersData.y.length - 1],
        ],
      };

      // [IMPORTANT] wrap line to represent the correct Rect
      const wrapLine = new Shapes.Line({
        points: [...Object.values(wrapCorners).flat(Infinity)],
        closed: true,
        stroke: "yellow",
        strokeWidth: 3,
        fill: "#1288F340",
      });

      // initial relocate stage before auto zoom in
      const wrapLineRect = wrapLine.getClientRect({
        relativeTo: stage,
      });
      const SCALE_PER_FRAME = 1.5;
      const PADDING_TOPLEFT = 6; // min = 1
      stage.position({
        x:
          -wrapLineRect.x * stage.scaleX() +
          viewLayer?.width() / PADDING_TOPLEFT,
        y:
          -wrapLineRect.y * stage.scaleX() +
          viewLayer?.height() / (PADDING_TOPLEFT * 2),
      });

      // const allCornersPoints = [
      //   ...allSectionsRef.current[chosenSection?.id].children[0].dataArray.map(
      //     // eslint-disable-next-line @typescript-eslint/no-explicit-any
      //     (item: any) => item.points
      //   ),
      // ];
      // layerRef.current?.add(wrapLine);
      // allCornersPoints.forEach((point) => {
      //   return layerRef.current?.add(
      //     new Shapes.Circle({
      //       x: point[0],
      //       y: point[1],
      //       radius: 5,
      //       fill: "cyan",
      //     })
      //   );
      // });

      // calculate the number of auto iteration frames for scale to fit and center
      let count = 0;
      let beginScale = stage.scaleX();
      let percent = Math.round(
        (beginScale / (maxDynamic[maxDynamic.length - 1] * initScale)) * 100
      );
      while (percent < 25) {
        beginScale *= SCALE_PER_FRAME;
        percent = Math.round(
          (beginScale / (maxDynamic[maxDynamic.length - 1] * initScale)) * 100
        );
        count++;
      }

      // apply dynamic count to scale to fit and center chosen section
      for (let i = 1; i <= count; i++) {
        setTimeout(() => {
          stage.scale({
            x: stage.scaleX() * SCALE_PER_FRAME,
            y: stage.scaleX() * SCALE_PER_FRAME,
          });

          const partialWidth = viewLayer?.width() / 2;
          const partialHeight = viewLayer?.height() / 2;
          stage.position({
            // duration: 0.5, // if using to()
            x:
              -wrapLineRect.x * stage.scaleX() +
              partialWidth -
              (wrapLineRect.width * stage.scaleX()) / 2,
            y:
              -wrapLineRect.y * stage.scaleX() +
              partialHeight -
              (wrapLineRect.height * stage.scaleX()) / 2,
          });
        }, 50 * i); // 10: change this if need
      }

      // redraw seats and update reset section status
      setTimeout(() => {
        _calculateViewPort();
        setHasResetSection(true);
      }, 50 * (count + 1.5));
    }, [_calculateViewPort, chosenSection?.id, initScale]);
    // [COMMON] handle handle reset
    const handleReset = useCallback(() => {
      const stage = stageRef.current;
      if (stage && sectionsViewbox !== "0 0 0 0" && !hasReset) {
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
        const sectionsCenterY = Math.floor(
          (sectionsRect.height / 2) * newScale
        );

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

        setHasReset(true);
        _calculateViewPort();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sectionsViewbox]);

    // [COMMON] handle zoom by button
    const _getLimitedNewScale = (newScale: number, oldScale: number) =>
      _limitedNewScale({
        role,
        initScale,
        newScale,
        oldScale,
        maxDynamic,
        hasChosenSection: !!chosenSection?.id,
      });
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
        const adjustedNewScale = _getLimitedNewScale(newScale, oldScale);

        // calculate new position to keep the stage centered
        const newPos = {
          x: -xCenter * adjustedNewScale.value + stage.width() / 2,
          y: -yCenter * adjustedNewScale.value + stage.height() / 2,
        };

        // apply the new scale and position
        stage.scale({ x: adjustedNewScale.value, y: adjustedNewScale.value });
        stage.position(newPos);
        stage.batchDraw(); // or stage.clearCache() depending on use-case
        if (!changedStage) setChangedStage(true);
        const dbCalViewPort = debounce(() => _calculateViewPort(), 50);
        dbCalViewPort();
      }
    };
    // [COMMON] render sections
    const renderSectionPaths = (section: Section) => {
      if (!section) return null;
      const _onMouseEnter = (e: EventType<MouseEvent>) => {
        if (role === "mobile" || isMinimap || chosenSection?.id) return;
        const container = e.target?.getStage()?.container();
        const cursorType = !ticketType ? "auto" : "pointer";
        if (container) container.style.cursor = cursorType;
      };
      const _onMouseLeave = (e: EventType<MouseEvent>) => {
        if (role === "mobile" || isMinimap || chosenSection?.id) return;
        const container = e.target?.getStage()?.container();
        if (container) container.style.cursor = "";
      };
      const { elements, ticketType, isStage, id: renderId } = section;
      const _commonClick = () => {
        if (!section.isStage && !chosenSection?.id) {
          onSelectSection(section);
          if (role === "mobile") {
            onPostMessage({
              type: "onSelectSection",
              data: JSON.stringify(section),
            });
          }
        }
      };

      return (
        <Group
          ref={(ref) => {
            if (ref) allSectionsRef.current[section.id] = ref;
          }}
          data-section-id={renderId}
          key={`sections-${renderId}`}
          onMouseEnter={_onMouseEnter}
          onMouseLeave={_onMouseLeave}
          onClick={_commonClick}
          onTouchEnd={_commonClick}
          perfectDrawEnabled={false}
        >
          {elements?.map(
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

              // handle colors
              const finalColors = handleSectionFill({
                fill,
                ticketType,
                fallbackColor,
                chosenSection,
                renderId,
                isBg,
                isStage,
                isMinimap,
              });

              return (
                <Path
                  perfectDrawEnabled={false}
                  key={key}
                  data={data}
                  {...finalColors}
                />
              );
            }
          )}
        </Group>
      );
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
        const adjustedNewScale = _getLimitedNewScale(newScale, oldScale);

        // calculate new pos based on newScale
        const newPos = {
          x: (pointer?.x || 0) - mousePointTo.x * adjustedNewScale.value,
          y: (pointer?.y || 0) - mousePointTo.y * adjustedNewScale.value,
        };

        // reflect changes
        stage.scale({ x: adjustedNewScale.value, y: adjustedNewScale.value });
        stage.position(newPos);
        stage.clearCache();
        if (!changedStage) setChangedStage(true);
        const dbCalViewPort = debounce(
          () => _calculateViewPort(),
          debounceWheelMs
        );
        dbCalViewPort();
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
        const adjustedNewScale = _getLimitedNewScale(newScale, oldScale);

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
        const dbCalViewPort = debounce(() => _calculateViewPort(), 50);
        dbCalViewPort();

        // Update last known distance and center point
        lastDist.current = newDist;
        lastCenter.current = newCenter;
      }
    };

    // [COMMON] check for hydration and calculate viewport initially
    // [COMMON] auto scale and center the all sections map
    // [MOBILE] force prevent default
    useEffect(() => {
      // set true for hydration
      if (!mounted) {
        setMounted(true);
        return;
      }
      // reset all sections map
      handleReset();
      // function to prevent default behavior for touchmove events
      const preventDefault = (e: TouchEvent) => {
        // check if it's a one-finger touch event
        if (e.touches.length === 1) e.preventDefault();
      };
      // add event listener to the document with the passive option set to false
      document.addEventListener("touchmove", preventDefault, {
        passive: false,
      });
      // cleanup the event listener when the component unmounts
      return () => document.removeEventListener("touchmove", preventDefault);
    }, [handleReset, mounted]);
    // [COMMON] detect if different seats from different section has been selected
    useEffect(() => {
      if (changedSection) {
        _calculateViewPort();
        setChangedSection(false);
        onDiffSection();
      }
    }, [changedSection, _calculateViewPort, onDiffSection]);
    // [SPECIAL] auto scale to fit and center Chosen Section
    useEffect(() => {
      if (hasReset) handleResetSection();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasReset]);

    // [START] [ADMIN] selection
    useEffect(() => {
      const stage = stageRef.current;
      if (stage && Object.keys(prevStageInfos).length && changedStage) {
        // console.log({ prevStageInfos });
        const { scale, x, y } = prevStageInfos;
        stage.scale({ x: scale, y: scale });
        stage.position({ x, y });
        stage.batchDraw();
        stage.clearCache();
        _calculateViewPort();
      }
      // DO NOT REMOVE THE WARNING SUPPRESS
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSelectAll, isClearAll, isSelectRow, prevStageInfos]);
    useImperativeHandle(mainMapRef, () => ({
      getStageInfo: () => {
        const stage = stageRef.current;
        if (stage) {
          const stageCurr = {
            width: Math.ceil(width),
            height: Math.ceil(height),
            x: Math.floor(stage.x()),
            y: Math.floor(stage.y()),
            scale: stage?.scaleX(),
          };
          return stageCurr;
        }
      },
    }));
    // handle select all data
    useEffect(() => {
      if (isSelectAll && allSeats.length > 0) {
        let selections = [];
        // filter if section has ticket type
        selections = allSeats.filter(
          (seat: ChosenSeat) => !!seat.section.ticketType
        );
        // filter if seat is available or status === 1
        // filter disabled seats for admin
        selections = selections.filter(
          (seat: ChosenSeat) =>
            seat.status === 1 || (role === "admin" && seat.status === 2)
        );

        chosenSeatsRef.current = [...selections];
        _calculateViewPort();
        setIsClearAll(false);
        setIsSelectRow(false);
        onSelectAll(chosenSeatsRef.current);
        if (!isShowAvailable) setIsShowAvailable(true);
        if (!isShowOrdered) setIsShowOrdered(true);
        if (!isShowDisabled) setIsShowDisabled(true);
      }
    }, [
      _calculateViewPort,
      allSeats,
      isSelectAll,
      isShowAvailable,
      isShowDisabled,
      isShowOrdered,
      onSelectAll,
      role,
      setIsClearAll,
      setIsSelectRow,
      setIsShowAvailable,
      setIsShowDisabled,
      setIsShowOrdered,
    ]);
    // handle clear all data
    useEffect(() => {
      if (isClearAll && allSeats.length && chosenSeatsRef.current.length) {
        chosenSeatsRef.current = [];
        _calculateViewPort();
        setIsSelectAll(false);
        setIsClearAll(false);
        setIsSelectRow(false);
        onClearAll();
      }
    }, [
      _calculateViewPort,
      allSeats,
      isClearAll,
      onClearAll,
      setIsClearAll,
      setIsSelectAll,
      setIsSelectRow,
    ]);
    // handle select row data
    useEffect(() => {
      if (isSelectRow && allSeats.length && chosenSeatsRef.current.length) {
        const chosenSeats = chosenSeatsRef.current;
        const allSelectedRows = [
          ...new Set(chosenSeats.map((seat: ChosenSeat) => seat.row.id)),
        ];
        const filterByRows = allSeats.filter((seat: ChosenSeat) =>
          allSelectedRows.includes(seat.row.id)
        );
        const filterByStatus = filterByRows.filter(
          (seat: ChosenSeat) =>
            seat.status === 1 || (role === "admin" && seat.status === 2)
        );
        chosenSeatsRef.current = [...filterByStatus];
        _calculateViewPort();
        setIsSelectRow(false);
        setIsSelectAll(false);
        setIsClearAll(false);
        onSelectRow(chosenSeatsRef.current, allSelectedRows);
        if (!isShowAvailable) setIsShowAvailable(true);
        if (!isShowOrdered) setIsShowOrdered(true);
        if (!isShowDisabled) setIsShowDisabled(true);
      }
    }, [
      _calculateViewPort,
      allSeats,
      isSelectRow,
      isShowAvailable,
      isShowDisabled,
      isShowOrdered,
      onSelectRow,
      role,
      setIsClearAll,
      setIsSelectAll,
      setIsSelectRow,
      setIsShowAvailable,
      setIsShowDisabled,
      setIsShowOrdered,
    ]);
    useEffect(() => {
      _calculateViewPort();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isShowAvailable, isShowOrdered, isShowDisabled]);
    // [END] [ADMIN] selection

    // if not hydrated and no sections
    if (!mounted && sections?.length === 0) return <div>No data.</div>;

    // main render
    return (
      <div
        className={cn(
          "map-wrapper",
          isMinimap && "minimap",
          isMinimap && !chosenSection?.id && "filter-darker",
          isMinimap && role === "admin" && " hidden-admin"
        )}
        style={{
          width,
          height,
          overflow: "hidden",
          zIndex: 5,
          ...styles,
        }}
      >
        {/* tool buttons */}
        <Buttons
          {...{
            role,
            tooltip,
            zoomSpeed,
            zoomByFactorOffset,
            isMinimap,
            handleReset,
            handleResetCallback: () => {
              setHasReset(false);
              if (changedStage) setChangedStage(false);
              if (chosenSection?.id) {
                setHasResetSection(false);
                handleResetSection();
              }

              // display all seats when reset
              if (!isShowAvailable) setIsShowAvailable(true);
              if (!isShowOrdered) setIsShowOrdered(true);
              if (!isShowDisabled) setIsShowDisabled(true);
            }, // important for admin
            handleZoomByFactor,
            setShowMinimap,
          }}
        />
        {/* render minimap jsx */}
        {!isMinimap && showMinimap && <>{minimap}</>}
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
          {/* get view port layer */}
          {!isMinimap && (
            <Layer ref={viewLayerRef} x={0} y={0} listening={false}>
              <Rect width={width} height={height} x={0} y={0} />
            </Layer>
          )}
          {/* main sections layer */}
          <Layer
            listening={!isMinimap}
            ref={layerRef}
            visible={
              isMinimap ? true : chosenSection?.id ? hasResetSection : true
            }
          >
            {sections
              ?.filter((section) =>
                isMinimap
                  ? true
                  : chosenSection?.id
                  ? section.id === chosenSection?.id
                  : true
              )
              .map(renderSectionPaths)}
          </Layer>
          {/* main seats layer */}
          {!isMinimap && (
            <Layer
              ref={seatsLayerRef}
              clearBeforeDraw={false}
              visible={
                isMinimap ? true : chosenSection?.id ? hasResetSection : true
              }
            />
          )}
        </Stage>
      </div>
    );
  }
);

export default MainMap;
