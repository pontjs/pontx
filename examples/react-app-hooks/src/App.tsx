import "./App.css";
import * as React from "react";
import { defs } from "./services/sdk/petstore/type";
import { PetStoreAPIs } from "./api";

function App() {
  const [status, setStatus] = React.useState<defs.Pet["status"]>("available");
  const { data: pets, isLoading: isPetsLoading } = PetStoreAPIs.pet.findPetsByStatus.useRequest({
    status: status ? [status] : [],
  });

  return (
    <div className="pontx-hooks-sdk-sample">
      <header className="header">Pontx Hooks SDK Sample - React TS</header>
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
            (pets || []).map((pet, petIndex) => {
              return <li key={petIndex}>{pet.name}</li>;
            })
          )}
        </ul>
      }
    </div>
  );
}

export default App;
