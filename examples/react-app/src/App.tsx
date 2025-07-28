import "./App.css";
import * as React from "react";
import { petstoreClient, useQuery } from "./pontx";
import * as schemas from "./services/petstore/schemas";



function App() {
  const [status, setStatus] = React.useState<schemas.Pet["status"]>("available");
  const { data, error, isLoading, isValidating } = useQuery(petstoreClient.pet.findPetsByStatus.queryOptions({ status: status ? [status] : [] }) );
  const isPetsLoading = isLoading || isValidating;
  const pets = data || [];

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
