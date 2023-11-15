import { useEffect } from "react";

import { fetchLocalJSON } from "@lib/fetching";
import { useData } from "@store/useData";
import MainMap from "./MainMap";

import "@style/App.css";

const App = () => {
  // zustand
  const data = useData(({ data }) => data);
  const saveData = useData(({ saveData }) => saveData);

  // effects
  useEffect(() => {
    // self called func to fetch local data
    (async () => {
      const mapData = await fetchLocalJSON(
        "/src/mock/large/seatmap-2-event.json"
      );
      const sectionData = await fetchLocalJSON(
        "/src/mock/medium/section-210.json"
      );
      const demoData = {
        mapData,
        sectionData,
        sections: mapData?.data?.result?.sections,
        viewbox: mapData?.data?.result?.viewbox,
      };
      saveData(demoData);
    })();
  }, [data?.mapData?.data?.result?.viewbox, saveData]);

  return (
    <MainMap
      width={375} // 725, 375
      height={635} // 675, 635
      role="mobile"
      fallbackColor="#e3e3e3"
      sections={data?.sections}
      sectionsViewbox={data?.viewbox}
      chosenSection={data?.sectionData}
      // tooltip={{ plus: { content: "Phóng rất to" } }}
    />
  );
};

export default App;
