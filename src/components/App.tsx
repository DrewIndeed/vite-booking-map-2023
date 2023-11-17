import { useCallback, useEffect, useState } from "react";

import { getAdminShowing, getMap, getSections } from "@lib/fetching";
import { useData } from "@store/useData";
import MainMap from "./MainMap";

import "@style/App.css";

const App = () => {
  // zustand
  const data = useData(({ data }) => data);
  const saveData = useData(({ saveData }) => saveData);

  // states
  const [showMinimap, setShowMinimap] = useState(true);
  const toggle = useCallback(() => setShowMinimap(!showMinimap), [showMinimap]);

  // effects
  useEffect(() => {
    // self called func to fetch local data
    // for beta domain
    // 2 -> 168, 170, 176, 178
    // 544 -> 137, 138, 140
    // 837 -> 185, 186, 187
    // 940 -> 210, 206, 205, 208
    (async () => {
      const mapData = await getMap(940);
      const adminShowData = await getAdminShowing(940);
      const sectionData = await getSections(940, 210);
      const demoData = {
        adminSectionsData: adminShowData?.data?.result?.seatMap?.sections,
        sectionData: sectionData?.data?.result,
        sections: mapData?.data?.result?.sections,
        viewbox: mapData?.data?.result?.viewbox,
      };
      // console.log({ demoData });
      saveData(demoData);
    })();
  }, [saveData]);

  return (
    <div style={{ position: "relative" }}>
      <MainMap
        width={700} // 725, 375
        height={600} // 675, 635
        zoomSpeed={1.1}
        role="web"
        // fallbackColor="#9b9a9d"
        sections={data?.adminSectionsData} // MUST
        sectionsViewbox={data?.viewbox} // MUST
        chosenSection={data?.sectionData}
        onToggleMinimap={toggle}
        onSelectSeat={(data: any) => console.log({ data })}
        // Progress: minimap related
        minimap={
          <MainMap
            width={100}
            height={165}
            sections={data?.adminSectionsData} // MUST
            sectionsViewbox={data?.viewbox} // MUST
            // Progress: section related
            isMinimap
            chosenSection={data?.sectionData}
            styles={{
              display: showMinimap ? "block" : "none",
            }}
          />
        }
      />
    </div>
  );
};

export default App;
