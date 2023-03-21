const express = require("express");
const app = express();
app.use(express.json());

const path = require("path");
const databasePath = path.join(__dirname, "covid19India.db");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

let database = null;

const startDBAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server running at http://localhost:3000/");
    });
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

startDBAndServer();

const convertStatesToCamelCase = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};

//Get List Of All States API
app.get("/states/", async (request, response) => {
  const getStatesQuery = `
    SELECT
    *
    FROM state;`;
  const statesArray = await database.all(getStatesQuery);
  response.send(
    statesArray.map((eachStateDetails) =>
      convertStatesToCamelCase(eachStateDetails)
    )
  );
});

//Get a State With Id API
app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `
    SELECT
    *
    FROM state
    WHERE state_id=${stateId};`;
  const state = await database.get(getStateQuery);
  response.send(convertStatesToCamelCase(state));
});

//Post a District API

app.post("/districts/", async (request, response) => {
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const insertDistrictQuery = `
    INSERT INTO district (district_name, state_id, cases, cured, active, deaths)
    VALUES(
        '${districtName}',
        ${stateId},
        ${cases},
        ${cured},
        ${active},
        ${deaths}
    );`;

  const databaseResponse = await database.run(insertDistrictQuery);
  response.send("District Successfully Added");
});

//Get a District with Id API
const convertDistrictToCamelCase = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.district_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictQuery = `
    SELECT
    district_id AS districtId,
    district_name AS districtName,
    state_id AS stateId,
    cases,
    cured,
    active,
    deaths
    FROM district
    WHERE district_id= ${districtId};`;
  const districtDetails = await database.get(getDistrictQuery);
  response.send(districtDetails);
});

//Delete a District API

app.delete("/districts/:districtId", async (request, response) => {
  const { districtId } = request.params;
  const deleteRequestQuery = `
    DELETE
    FROM district
    WHERE district_id= ${districtId}`;
  await database.run(deleteRequestQuery);
  response.send("District Removed");
});

//Modify District API

app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const districtDetails = request.body;

  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;

  const updateDistrictQuery = `
    UPDATE
      district
    SET
      district_name= '${districtName}',
      state_id= ${stateId},
      cases= ${cases},
      cured= ${cured},
      active= ${active},
      deaths= ${deaths}
    WHERE
      district_id= ${districtId};`;
  await database.run(updateDistrictQuery);
  response.send("District Details Updated");
});

//Get Stats Of Given State Id API

app.get("/states/:stateId/stats", async (request, response) => {
  const { stateId } = request.params;

  const getStatsQuery = `
    SELECT
    SUM(district.cases) AS totalCases,
    SUM(district.cured) AS totalCured,
    SUM(district.active) AS totalActive,
    SUM(district.deaths) AS totalDeaths
    FROM district
    NATURAL JOIN state
    WHERE state.state_id= ${stateId};`;

  const statistics = await database.get(getStatsQuery);
  response.send(statistics);
});

//Get State Name With Given Id API

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getStateNameQuery = `
  SELECT
  state_name AS stateName
  FROM state
  WHERE state_id=(
      SELECT
       state_id FROM district
      WHERE district_id= ${districtId}
  );`;
  const stateName = await database.get(getStateNameQuery);
  response.send(stateName);
});

module.exports = app;
