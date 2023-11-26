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
  // use 'any' for a reason
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mainMapRef = useRef<any>();

  // states
  const [isSelectAll, setIsSelectAll] = useState(false);
  const [isClearAll, setIsClearAll] = useState(false);
  const [isSelectRow, setIsSelectRow] = useState(false);
  const [isShowAvailable, setIsShowAvailable] = useState(true);

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
        width={500} // 725, 375 // MUST
        height={500} // 675, 635 // MUST
        sections={data?.adminSections} // MUST
        sectionsViewbox={data?.viewbox} // MUST
        zoomSpeed={1.1}
        // [METHODS]
        onSelectSeat={(data) => console.log({ data })}
        onSelectSection={(sectionData) => console.log({ sectionData })}
        onDiffSection={() => console.log("Changed section!")}
        // [SPECIFIC SECTION]
        // chosenSection={data?.chosenSection}
        // [ADMIN]
        // previous info of stage when selection happened
        prevStageInfos={mainMapRef?.current?.getStageInfo()} // MUST
        // select all
        useSelectAll={(initVal: boolean) => [
          isSelectAll,
          (newVal: boolean) => setIsSelectAll(newVal || initVal),
        ]}
        // clear all
        useClearAll={(initVal: boolean) => [
          isClearAll,
          (newVal: boolean) => setIsClearAll(newVal || initVal),
        ]}
        // select row
        useSelectRow={(initVal: boolean) => [
          isSelectRow,
          (newVal: boolean) => setIsSelectRow(newVal || initVal),
        ]}
        // show available seats
        useShowAvailable={(initVal: boolean) => [
          isShowAvailable,
          (newVal: boolean) => setIsShowAvailable(newVal || initVal),
        ]}
        minimap={
          <MainMap
            isMinimap // MUST FOR MINIMAP
            role="admin" // SHOULD
            width={100} // MUST
            height={165} // MUST
            sections={data?.adminSections} // MUST
            sectionsViewbox={data?.viewbox} // MUST
            // [SPECIFIC SECTION]
            // chosenSection={data?.chosenSection}
          />
        }
      />
      <button
        style={{ cursor: "pointer" }}
        onClick={() => setIsSelectAll(true)}
      >
        Select All
      </button>
      <button style={{ cursor: "pointer" }} onClick={() => setIsClearAll(true)}>
        Clear All
      </button>
      <button
        style={{ cursor: "pointer" }}
        onClick={() => setIsSelectRow(true)}
      >
        Select Row
      </button>
      <button
        style={{ cursor: "pointer" }}
        onClick={() => setIsShowAvailable((prev) => !prev)}
      >
        Toggle Available
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
  Assume 5: if select all if not zoom on, user will know that all seats are selected
  Assume 6: if hide Available Seats, when Select All or Select Row hit, show Available Seats again
*/

/**
 * TODO
 * 3.2   [ADMIN] Seat select all stylings ✅
 * 3.3   [ADMIN] Seat select all data ✅
 * 3.3.1 [BUG - ADMIN] Handle deselect seats after select all ✅
 * 3.3.2 [BUG - ADMIN] Handle select seats normally before select all ✅
 *
 * 3.4   [ADMIN] Handle clear all selections ✅
 * 4.    [ADMIN] Seat select by row ✅
 * 8.    [ADMIN] Handle sections hover and clicked ✅
 *
 * 5.    [ADMIN] Toggle Available seats ✅
 * 6.    [ADMIN] Toggle Ordered seats
 * 7.    [ADMIN] Toggle Disabled seats
 * 9.    [USERS] [MOBILE] Post messages
 *
 * 10.   [USERS] Auto scale to fit and center Chosen Section ✅
 * 11.   [ALL] Handle correct interactions for each role ✅
 * 12.   [USERS] Section click event to grab section data ✅
 * 13.   [USERS] Denoubce reset chosen section auto reset ✅
 * 14.   [ADMIN] minimap visibility ✅
 */
