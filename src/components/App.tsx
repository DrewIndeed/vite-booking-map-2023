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
      };
      // console.log({ demoData });
      saveData(demoData);
    })();
  }, [saveData]);

  return (
    <MainMap
      width={725}
      height={675}
      sections={data?.sections}
      chosenSection={data?.sectionData}
      fallbackColor="#e3e3e3"
    />
  );
};

export default App;
