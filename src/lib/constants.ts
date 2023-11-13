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
