import { useEffect, useState } from "react";

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

  // effects
  useEffect(() => {
    // self called func to fetch local data
    (async () => {
      const mapData = await fetchLocalJSON(
        "/src/mock/large/seatmap-2-event.json"
      );
      const sectionData = await fetchLocalJSON(
        "/src/mock/large/section-168.json"
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
        width={725} // 725, 375
        height={675} // 675, 635
        role="web"
        fallbackColor="#e3e3e3"
        sections={data?.sections}
        sectionsViewbox={data?.viewbox}
        chosenSection={data?.sectionData}
        onToggleMinimap={() => setShowMinimap(!showMinimap)}
        // Progress: minimap related
        minimap={
          showMinimap ? (
            <MainMap
              width={100}
              height={165}
              fallbackColor="#e3e3e3"
              sections={data?.sections}
              sectionsViewbox={data?.viewbox}
              // Progress: section related
              isMinimap
              chosenSection={data?.sectionData}
            />
          ) : null
        }
      />
    </div>
  );
};

export default App;
