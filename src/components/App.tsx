import { useData } from "@store/useData";
import { useEffect } from "react";
import fetcher from "../fetcher";

async function getMap(showingId: number): Promise<any> {
  const url = `https://api-v2.ticketbox.dev/event/api/v1/events/showings/${showingId}/seatmap`;
  const showMap = await fetcher<any>(url);
  return showMap;
}

async function getSections(showingId: number, sectionId: number): Promise<any> {
  const url = `https://api-v2.ticketbox.dev/event/api/v1/events/showings/${showingId}/sections/${sectionId}`;
  const showSection = await fetcher<any>(url);
  return showSection;
}

const App = () => {
  const saveData = useData((state) => state.saveData);
  useEffect(() => {
    async function getData() {
      const mapData = await getMap(940);
      const sectionData = await getSections(940, 210);
      const demoData = {
        mapData,
        sectionData,
        sections: mapData?.data?.result?.sections,
      };
      // console.log({ demoData });
      saveData(demoData);
    }
    getData();
  }, [saveData]);

  return <div>App</div>;
};

export default App;
