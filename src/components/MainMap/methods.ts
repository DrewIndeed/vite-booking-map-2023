/* eslint-disable @typescript-eslint/no-explicit-any */
import { RENDER_NUM_SCALE, SEAT_COLORS } from "@lib/constants";

import { ChosenSeat } from "types/chosen-seat";
import { ChosenSection } from "types/chosen-section";
import { Row } from "types/row";
import { Seat } from "types/seat";
import { Section, TicketType } from "types/section";

// [UTILS] handle zoom limits
type LimitedNewScale = {
  role: string;
  initScale: number;
  newScale: number;
  oldScale: number;
  maxDynamic: number[];
};
export const _limitedNewScale = ({
  role,
  initScale,
  newScale,
  oldScale,
  maxDynamic,
}: LimitedNewScale) => {
  const maxDynamicFinal = maxDynamic[maxDynamic.length - 1];
  // apply min and max values for scaling
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

// [UTILS] handle section bg colors
type HandleSectionFill = {
  fill: string;
  ticketType: TicketType;
  fallbackColor: string;
  chosenSection: ChosenSection | null;
  renderId: number;
  isBg: boolean;
  isStage: boolean;
  isMinimap: boolean;
};
export const handleSectionFill = ({
  fill,
  ticketType,
  fallbackColor,
  chosenSection,
  renderId,
  isBg,
  isStage,
  isMinimap,
}: HandleSectionFill) => {
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
  return finalColors;
};

// [UTILS] get seat map capacity
export const getCapacity = (sections: Section[]) =>
  sections.reduce((prev, curr) => {
    prev += curr.capacity;
    return prev;
  }, 0);

export const getAllSeats = (sections: Section[]) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sections.reduce((prev: any, curr: Section) => {
    if (!curr.rows) return prev;
    const seats = curr.rows
      .map((row: Row) => {
        return row.seats.map((seat: Seat) => ({
          ...seat,
          rowId: undefined,
          section: {
            ...curr,
            elements: undefined,
            rows: undefined,
          },
          row: { ...row, seats: undefined },
        }));
      })
      .flat(Infinity);
    return [...prev, ...seats];
  }, []);

// [UI] render section rows
export const renderSectionRows = (section: any, others: any[]) => {
  const [
    role,
    isSelectAll,
    newScale,
    { x1, x2, y1, y2 },
    { seatGroup, seatCircle, seatText },
    { stageRef, seatsLayerRef, chosenSeatsRef, allSeatsReachedRef },
    { _updateChosenSeats, _renderSeatClicked },
  ] = others;
  return section?.rows.forEach((row: Row) => {
    row?.seats.forEach((seat: Seat) => {
      const hasTicketType = !!section.ticketType;
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
      if (seat.x >= x1 && seat.x <= x2 && seat.y >= y1 && seat.y <= y2) {
        // --- CREATE SEAT UI ---
        // shape clones
        const newSeatGroup = seatGroup.clone();
        const newSeatCircle = seatCircle.clone();
        const newSeatText = seatText.clone();

        // add circle
        newSeatCircle.x(seat.x);
        newSeatCircle.y(seat.y);
        let fillVal = "";
        let strokeVal = "";
        const adminFilled = SEAT_COLORS.filled[seat.status];
        const adminStroke = SEAT_COLORS.stroke[seat.status];
        const shouldAdjustVal =
          (existed ||
            isPrevSelected ||
            (isAdmin && isSelectAll && !allSeatsReachedRef.current)) &&
          hasTicketType;
        // handle colors
        if (notAllowed) {
          fillVal = isAdmin ? adminFilled : "#f44336";
          strokeVal = isAdmin ? adminStroke : "#f44336";
        } else {
          const adminFillCheck = isAdmin ? adminFilled : "#fff";
          const adminStrokeCheck = isAdmin ? adminStroke : "#9C9B9B";
          fillVal = shouldAdjustVal ? "#2dc275" : adminFillCheck;
          strokeVal = shouldAdjustVal ? "#2dc275" : adminStrokeCheck;
        }
        // final paint
        newSeatCircle.fill(fillVal);
        newSeatCircle.stroke(strokeVal);
        newSeatGroup.add(newSeatCircle);

        // add text
        if (role === "mobile" || newScale < RENDER_NUM_SCALE) {
          const fontSize = Number(seat.name) < 10 ? 5 : 4.7;
          const xVal = seat.x - (Number(seat.name) < 10 ? 3.95 : 4.055);
          const yTenMore = role === "mobile" ? 1.7 : 2;
          const yOffset = Number(seat.name) < 10 ? 2.1 : yTenMore;
          const yVal = seat.y - yOffset;
          newSeatText.x(xVal);
          newSeatText.y(yVal);
          newSeatText.fontSize(fontSize);
          newSeatText.text(seat.name);
          newSeatGroup.add(newSeatText);
        }
        // --- CREATE SEAT UI ---

        // --- HANDLE SEAT EVENTS ---
        // [VERY IMPORTANT] auto pick HOLDING seats
        if (isPrevSelected && !existed) {
          _updateChosenSeats(section, row, seat);
        }
        if (role !== "mobile") {
          newSeatGroup.on("mouseover", () => {
            newSeatCircle.getStage()!.container().style.cursor = noEvent
              ? "not-allowed"
              : "pointer";
          });
        }
        newSeatGroup.on(role === "mobile" ? "touchend" : "click", () => {
          if (!stageRef.current.isDragging() && !noEvent) {
            _renderSeatClicked(
              section,
              row,
              seat,
              newSeatCircle,
              newSeatText,
              isAdmin
            );
          }
        });
        // --- HANDLE SEAT EVENTS ---

        // add created seat group to seats layer
        seatsLayerRef.current.add(newSeatGroup);
      }
    });
  });
};
