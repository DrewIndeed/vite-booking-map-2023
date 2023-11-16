import { useCallback, useEffect, useState } from "react";

import { fetchLocalJSON } from "@lib/fetching";
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
  // TODO: get alll seats and try to render all to check performance
  useEffect(() => {
    // self called func to fetch local data
    (async () => {
      const mapData = await fetchLocalJSON(
        "/src/mock/medium/seatmap-940-event.json"
      );
      const sectionData = await fetchLocalJSON(
        "/src/mock/medium/section-210.json"
      );
      const demoData = {
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
        height={700} // 675, 635
        role="web"
        fallbackColor="#e3e3e3"
        sections={data?.sections} // MUST
        sectionsViewbox={data?.viewbox} // MUST
        chosenSection={data?.sectionData}
        onToggleMinimap={() => toggle()}
        // Progress: minimap related
        minimap={
          <MainMap
            width={100}
            height={165}
            sections={data?.sections} // MUST
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
