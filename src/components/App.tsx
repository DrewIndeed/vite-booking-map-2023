import { useEffect } from "react";

import { getAdminShowing, getMap, getSections } from "@lib/fetching";
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
    // for beta domain
    // 2 -> 168, 170, 176, 178
    // 544 -> 137, 138, 140
    // 837 -> 185, 186, 187
    // 940 -> 210, 206, 205, 208
    (async () => {
      const mapData = await getMap(2);
      const adminShowData = await getAdminShowing(2);
      const sectionData = await getSections(2, 168);
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
        role="web" // SHOULD
        width={700} // 725, 375 // MUST
        height={600} // 675, 635 // MUST
        sections={data?.adminSectionsData} // MUST
        sectionsViewbox={data?.viewbox} // MUST
        zoomSpeed={1.1}
        // chosenSection={data?.sectionData}
        // [METHODS]
        onSelectSeat={(data: any) => console.log({ data })}
        onDiffSection={() => console.log("Changed section!")}
        minimap={
          <MainMap
            width={100} // MUST
            height={165} // MUST
            sections={data?.adminSectionsData} // MUST
            sectionsViewbox={data?.viewbox} // MUST
            isMinimap
            // chosenSection={data?.sectionData}
          />
        }
      />
    </div>
  );
};

export default App;
