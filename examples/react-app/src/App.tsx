import "./App.css";
import * as React from "react";
import { PetstoreAPIs, defs } from "./services/sdk";
import { setDefaults } from "./services/sdk/petstore";

setDefaults({
  headers: {
    accept: "application/json",
  },
  baseURL: "https://petstore.swagger.io/v2",
});

function App() {
  const [status, setStatus] = React.useState<defs.petstore.Pet["status"]>("available");
  // const [username, changeUsername] = React.useState("pont");
  // const [userData, setUserData] = React.useState<defs.User>();
  const [isPetsLoading, setIsPetsLoading] = React.useState(false);
  const [pets, setPets] = React.useState<defs.petstore.Pet[]>([]);

  React.useEffect(() => {
    setIsPetsLoading(true);
    PetstoreAPIs.pet.findPetsByStatus.request({ status: status ? [status] : [] }).then((petList) => {
      setIsPetsLoading(false);
      setPets(petList);
    });
  }, [status]);

  return (
    <div className="pontx-async-sdk-sample">
      <header className="header">Pontx Async SDK Sample - React TS</header>
      <div className="filters">
        <label>pet status: </label>
        <select
          value={status}
          onChange={(e) => {
            setStatus((e.target as HTMLSelectElement).value as any);
          }}
        >
          <option value={"available" as defs.petstore.Pet["status"]}>available</option>
          <option value={"pending" as defs.petstore.Pet["status"]}>pending</option>
          <option value={"sold" as defs.petstore.Pet["status"]}>sold</option>
        </select>
      </div>
      {
        <ul>
          {isPetsLoading ? (
            <span>loading ...</span>
          ) : (
            pets.map((pet, petIndex) => {
              return (
                <li key={petIndex}>
                  {pet.name}
                  <span className="tag">{pet.status}</span>
                  {pet.category?.name ? <span className="category tag">{pet.category?.name}</span> : null}
                </li>
              );
            })
          )}
        </ul>
      }
    </div>
  );
}

export default App;
