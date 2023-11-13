import "@style/App.css";
import { useEffect } from "react";

import { fetchLocalJSON } from "@lib/fetching";
import { useData } from "@store/useData";

const App = () => {
  // zustand
  const data = useData(({ data }) => data);
  const saveData = useData(({ saveData }) => saveData);

  // useEffect(() => {
  //   // self called func to fetch remote data
  //   (async () => {
  //     const mapData = await getMap(940);
  //     const sectionData = await getSections(940, 210);
  //     const demoData = {
  //       mapData,
  //       sectionData,
  //       sections: mapData?.data?.result?.sections,
  //     };
  //     saveData(demoData);
  //   })();
  // }, [saveData]);

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
        mapData,
        sectionData,
        sections: mapData?.data?.result?.sections,
      };
      saveData(demoData);
    })();
  }, [saveData]);

  useEffect(() => {
    console.log({ data });
  }, [data]);

  return <div>Booking App 2023</div>;
};

export default App;
