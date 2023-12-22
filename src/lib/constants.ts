import PlusIcon from "@icons/plus.svg?react";
import MinusIcon from "@icons/minus.svg?react";
import ResetIcon from "@icons/reset.svg?react";
import EyeOpenIcon from "@icons/eye-open.svg?react";
import EyeCloseIcon from "@icons/eye-close.svg?react";

export const ALL_SEAT_STATUS: string[] = [
  "available",
  "disabled",
  "holding",
  "ordered",
  "readOnly",
  "selected",
];

export const BUTTONS = {
  plus: { key: "plus", icon: PlusIcon, defaultContent: "Phóng to" },
  reset: { key: "reset", icon: ResetIcon, defaultContent: "Về lại từ đầu" },
  minus: { key: "minus", icon: MinusIcon, defaultContent: "Thu nhỏ" },
  eyeOpen: { key: "eyeOpen", icon: EyeOpenIcon, defaultContent: "Ẩn/Hiện" },
  eyeClose: { key: "eyeClose", icon: EyeCloseIcon, defaultContent: "Ẩn/Hiện" },
};

export const ZOOM_SPEED = 0.8;
export const RENDER_SEAT_SCALE = 1.4;
export const RENDER_NUM_SCALE = 0.4;
export const SEAT_COLORS = {
  filled: [
    "",
    "#FFFFFF", // available
    "#C2C1C1", // disabled
    "#D32F2F", // holding
    "#F44336", // ordered
    "#C2C1C1", // read only
    "#2DC275", // selected
  ],
  stroke: [
    "",
    "#9C9B9B",
    "#C2C1C1",
    "#D32F2F",
    "#D32F2F",
    "#9C9B9B",
    "#2DC275",
  ],
};
