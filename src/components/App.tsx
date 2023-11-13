import "@style/App.css";
import { useEffect } from "react";

import { fetchLocalJSON } from "@lib/fetching";
import { useData } from "@store/useData";
import MainMap from "./MainMap";

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

  if (!data?.mapData) return <div>No data.</div>;
  return (
    <div
      style={{
        width: 725,
        height: 675,
        overflow: "hidden",
        backgroundColor: "#000",
      }}
    >
      <MainMap
        width={725}
        height={675}
        fallbackColor="#e3e3e3"
        sections={data?.sections}
        sectionsViewbox={data?.viewbox}
        chosenSection={data?.sectionData}
      />
    </div>
  );
};

export default App;
