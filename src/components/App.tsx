import { useCallback, useEffect, useRef, useState } from "react";

import { getAdminShowing, getMap, getSections } from "@lib/fetching";
import { useData } from "@store/useData";
import MainMap from "./MainMap";

import "@style/App.css";
import { Section } from "types/section";
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
  const [chosenSectionData, setChosenSectionData] = useState(undefined);

  // effects
  useEffect(() => {
    (async () => {
      const mapData = await getMap(59133953855904);
      const adminShowData = await getAdminShowing(59133953855904);
      const demoData = {
        adminSections: adminShowData?.data?.result?.seatMap?.sections,
        viewbox: adminShowData?.data?.result?.seatMap?.viewbox,
        capacity: getCapacity(adminShowData?.data?.result?.seatMap?.sections),
        allSeats: getAllSeats(adminShowData?.data?.result?.seatMap?.sections),
        sections: mapData?.data?.result?.sections,
      };
      // console.log({ demoData });
      saveData(demoData);
    })();
  }, [saveData]);

  const onSelectSection = useCallback(
    async (selectedSection: Section) => {
      console.log({ selectedSection });
      const sectionData = await getSections(59133953855904, selectedSection.id);
      setChosenSectionData(sectionData?.data?.result);
      saveData({ ...data, chosenSection: sectionData?.data?.result });
    },
    [data, saveData]
  );

  return (
    <div style={{ position: "relative" }}>
      <MainMap
        ref={mainMapRef} // MUST FOR ADMIN
        role="web" // SHOULD
        width={1300} // 1300, 725, 375 // MUST
        height={976} // 976, 675, 635 // MUST
        sections={data?.sections} // MUST
        sectionsViewbox={data?.viewbox} // MUST
        zoomSpeed={0.8}
        renderSeatScale={0.75} // 0.75 for web, >= 1 for mobile
        // [METHODS]
        onSelectSection={onSelectSection}
        onSelectSeat={(dataSeat) => console.log({ dataSeat })}
        onPostMessage={(postMsg) => console.log({ postMsg })}
        // [SPECIFIC SECTION]
        chosenSection={chosenSectionData}
        minimap={
          <MainMap
            isMinimap // MUST FOR MINIMAP
            role="web" // SHOULD
            width={100} // MUST
            height={165} // MUST
            sections={data?.sections} // MUST
            sectionsViewbox={data?.viewbox} // MUST
            // [SPECIFIC SECTION]
            chosenSection={chosenSectionData}
          />
        }
      />
      <button
        style={{ cursor: "pointer" }}
        onClick={() => setChosenSectionData(undefined)}
      >
        Cook
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
  87744746078981 -> can pick
  59133953855904 -> can pick
*/

/*
  Assume 1: user when uses for mobile will set the right role = "mobile"
  Assume 2: user uses 1 finger to drag and 2 fingers to zoom exactly
  Assume 3: user will de-select from accident selections
  Assume 4: if seat map is zooming to see seats, how to show minimap now?
  Assume 5: if select all if not zoom on, user will know that all seats are selected
  Assume 6: if hide Available Seats, when Select All or Select Row hit, show Available Seats again
*/

/*
- [ALL] Special cases for curved sections
- [ADMIN] able to choose HOLDING seats but cannot interact
- [ADMIN] count down on both sides is not consistent
- [ADMIN] open in new tab for Order Details when clicked
- [ALL] documentation
*/
