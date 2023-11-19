import "./App.css";
import * as React from "react";
import { defs } from "./services/sdk/petstore/type";
import { PetStoreAPIs } from "./api";

function App() {
  const [status, setStatus] = React.useState<defs.Pet["status"]>("pending");
  // const [username, changeUsername] = React.useState("pont");
  // const [userData, setUserData] = React.useState<defs.User>();
  const [isPetsLoading, setIsPetsLoading] = React.useState(false);
  const [pets, setPets] = React.useState<defs.Pet[]>([]);

  React.useEffect(() => {
    setIsPetsLoading(true);
    PetStoreAPIs.pet.findPetsByStatus.request(status ? { status } : {}).then((petList) => {
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
          <option value={"available" as defs.Pet["status"]}>available</option>
          <option value={"pending" as defs.Pet["status"]}>pending</option>
          <option value={"sold" as defs.Pet["status"]}>sold</option>
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
