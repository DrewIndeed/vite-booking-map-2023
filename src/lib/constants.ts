import PlusIcon from "@icons/plus.svg?react";
import MinusIcon from "@icons/minus.svg?react";
import ResetIcon from "@icons/reset.svg?react";
import EyeOpenIcon from "@icons/eye-open.svg?react";
import EyeCloseIcon from "@icons/eye-close.svg?react";

const _cssStrToObj = (stylesStr: string) =>
  stylesStr
    .split(";")
    .map((cur) => cur.split(":"))
    .reduce((acc: { [key: string]: string }, val) => {
      let key = val[0];
      if (key === "") return acc;
      const value = val[1];
      key = key.replace(/-./g, (css) => css.toUpperCase()[1]);
      acc[key] = value;
      return acc;
    }, {});

export const ALL_SEAT_STATUS: string[] = [
  "available",
  "disabled",
  "holding",
  "ordered",
  "readOnly",
  "selected",
];

export const SEAT_STYLES_RAW: Record<string, string> = Object.freeze({
  available: "fill:#ffffff;stroke:#9C9B9B;pointer-events:auto;",
  disabled: "fill:#C2C1C1;stroke:#C2C1C1;pointer-events:auto;",
  holding: "fill:#D32F2F;stroke:#D32F2F;pointer-events:auto;",
  ordered: "fill:#F44336;stroke:#D32F2F;pointer-events:none;",
  readOnly: "fill:#ffffff;stroke:#9C9B9B;pointer-events:none;",
  selected: "fill:#2DC275;stroke:#2DC275;pointer-events:none;",
});

export const SEAT_STYLES_PARSED: Record<string, object> = Object.freeze({
  available: _cssStrToObj(SEAT_STYLES_RAW.available),
  disabled: _cssStrToObj(SEAT_STYLES_RAW.disabled),
  holding: _cssStrToObj(SEAT_STYLES_RAW.holding),
  ordered: _cssStrToObj(SEAT_STYLES_RAW.ordered),
  readOnly: _cssStrToObj(SEAT_STYLES_RAW.readOnly),
  selected: _cssStrToObj(SEAT_STYLES_RAW.selected),
});

export const buttons = {
  plus: { key: "plus", icon: PlusIcon, defaultContent: "Phóng to" },
  reset: { key: "reset", icon: ResetIcon, defaultContent: "Về lại từ đầu" },
  minus: { key: "minus", icon: MinusIcon, defaultContent: "Thu nhỏ" },
  eyeOpen: { key: "eyeOpen", icon: EyeOpenIcon, defaultContent: "Ẩn/Hiện" },
  eyeClose: { key: "eyeClose", icon: EyeCloseIcon, defaultContent: "Ẩn/Hiện" },
};

export type Role = "mobile" | "web" | "admin";
export const ZOOM_SPEED = 1.055;

// TODO: dynamic values for this
export const ZOOM_MAX_OFFSET: Record<Role, number> = {
  mobile: 60,
  web: 30,
  admin: 30,
};
export const ZOOM_MIN_OFFSET: Record<Role, number> = Object.entries(
  ZOOM_MAX_OFFSET
).reduce((prev: any, [k, value]) => {
  prev[k] = value / (value + 2);
  return prev;
}, {});
export const RENDER_SEAT_SCALE = 1.8;
export const RENDER_NUM_SCALE = 0.4;
