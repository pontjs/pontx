import "./App.css";
import * as React from "react";
import { PetstoreAPIs, setDefaults } from "./services/sdk";

setDefaults((specName) => {
	return {
		baseURL: "https://petstore.swagger.io/v2",
	}
});

PetstoreAPIs.pet.findPetsByStatus.preload({
  status: ["available"],
});

function App() {
  const [status, setStatus] = React.useState<defs.petstore.Pet["status"]>("available");
  const {
    data: pets,
    isLoading: isPetsLoading,
    isValidating,
    mutate,
  } = PetstoreAPIs.pet.findPetsByStatus.useRequest({
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
          <option value={"available" as defs.petstore.Pet["status"]}>available</option>
          <option value={"pending" as defs.petstore.Pet["status"]}>pending</option>
          <option value={"sold" as defs.petstore.Pet["status"]}>sold</option>
        </select>
      </div>
      <div className="operators">
        <button onClick={() => mutate()}>refresh</button>
      </div>
      {
        <ul>
          {isValidating && !isPetsLoading && <span>validating ...</span>}
          {isPetsLoading ? (
            <span>loading ...</span>
          ) : (
            (pets || []).map((pet, petIndex) => {
              return (
                <li key={petIndex}>
                  {pet.name}
                  <span className="tag">{pet.status}</span>
                  {pet.category?.name ? <span className="tag">{pet.category?.name}</span> : null}
                </li>
              );
            })
          )}
          {!isPetsLoading && !pets?.length && <span>no pets</span>}
        </ul>
      }
    </div>
  );
}

export default App;
