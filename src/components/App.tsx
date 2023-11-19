import { useEffect, useRef, useState } from "react";

import { getAdminShowing, getMap, getSections } from "@lib/fetching";
import { useData } from "@store/useData";
import MainMap from "./MainMap";

import "@style/App.css";
import { getAllSeats, getCapacity } from "./MainMap/methods";

const App = () => {
  // zustand
  const data = useData(({ data }) => data);
  const saveData = useData(({ saveData }) => saveData);

  // refs
  // any for a reason
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mainMapRef = useRef<any>();

  // states
  const [selectAll, setSelectAll] = useState(false);

  // effects
  useEffect(() => {
    (async () => {
      const mapData = await getMap(2);
      const adminShowData = await getAdminShowing(2);
      const sectionData = await getSections(2, 168);
      const demoData = {
        adminSections: adminShowData?.data?.result?.seatMap?.sections,
        chosenSection: sectionData?.data?.result,
        viewbox: mapData?.data?.result?.viewbox,
        capacity: getCapacity(adminShowData?.data?.result?.seatMap?.sections),
        allSeats: getAllSeats(adminShowData?.data?.result?.seatMap?.sections),
        // sections: mapData?.data?.result?.sections,
      };
      // console.log({ demoData });
      saveData(demoData);
    })();
  }, [saveData]);

  return (
    <div style={{ position: "relative" }}>
      <MainMap
        ref={mainMapRef} // MUST FOR ADMIN
        role="admin" // SHOULD
        width={625} // 725, 375 // MUST
        height={600} // 675, 635 // MUST
        sections={data?.adminSections} // MUST
        sectionsViewbox={data?.viewbox} // MUST
        zoomSpeed={1.1}
        // [METHODS]
        onSelectSeat={(data) => console.log({ data })}
        onDiffSection={() => console.log("Changed section!")}
        // [ADMIN]
        selectAll={selectAll}
        prevStageInfos={mainMapRef?.current?.getStageInfo()}
        minimap={
          <MainMap
            isMinimap
            width={100} // MUST
            height={165} // MUST
            sections={data?.adminSections} // MUST
            sectionsViewbox={data?.viewbox} // MUST
          />
        }
      />
      <button style={{ cursor: "pointer" }} onClick={() => setSelectAll(true)}>
        Select All
      </button>
    </div>
  );
};

export default App;

/*
  Test showings
  2 -> 168, 170, 176, 1781
  544 -> 137, 138, 140
  837 -> 185, 186, 187
  940 -> 210, 206, 205, 208
*/

/*
  Assume 1: user when uses for mobile will set the right role = "mobile"
  Assume 2: user uses 1 finger to drag and 2 fingers to zoom exactly
  Assume 3: user will de-select from accident selections
  Assume 4: if seat map is zooming to see seats, how to show minimap now?
*/

/**
 * TODO
 * 3.2   [ADMIN] Seat select all stylings ✅
 * 3.3   [ADMIN] Seat select all data ✅
 * 3.3.1 [BUG - ADMIN] Handle deselect seats after select all
 * 3.3.2 [BUG - ADMIN] Handle select seats normally before select all
 * 3.4   [ADMIN] Handle clear all selections
 * 4.    [ADMIN] Seat select by row
 * 5.    [ADMIN] Toggle Available seats
 * 6.    [ADMIN] Toggle Ordered seats
 * 7.    [ADMIN] Toggle Disabled seats
 * 8.    [ADMIN] Handle sections hover and clicked
 * 9.    [USERS] [MOBILE] Post messages
 */
