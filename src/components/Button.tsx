import { useState } from "react";

const Button = ({
  tooltip = { content: "", place: "right-start" },
  icon: Icon = null,
  secondIcon: SecondIcon = null,
  isToggle = false,
  disabled = false,
  onClick,
}: any) => {
  const [isClicked, setIsClicked] = useState(false);
  const handleOnClick = () => {
    setIsClicked(!isClicked);
    onClick && onClick();
  };
  return (
    <button
      data-tooltip-id="btn-tooltip"
      data-tooltip-content={tooltip.content || ""}
      data-tooltip-place={tooltip.place || "right-start"}
      className={`${disabled && "disabled"}`}
      style={{ cursor: disabled ? "not-allowed" : "pointer" }}
      onClick={handleOnClick}
    >
      {!isToggle && Icon !== null ? <Icon /> : null}
      {isToggle &&
        Icon !== null &&
        SecondIcon !== null &&
        (isClicked ? <SecondIcon /> : <Icon />)}
    </button>
  );
};

export default Button;
