import { ChosenSection } from "types/chosen-section";
import { TicketType } from "types/section";

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
