# Contributing

## Evolving the Format of the Forecast Data

The frontend consumes the forecast data produced by the backend, so both parties need to agree on their format.
Furthermore, the frontend also reads several forecast data in the past (users can show the data from the latest
forecast run, or from older runs as well). This has consequences on how the format of the forecast data produced
by the backend can evolve:

- We can add or remove optional fields,
- We can remove non-optional fields (the frontend will simply ignore those fields on the older forecast data).

However, to add non-optional fields we have to perform the following procedure:

- Bump the format version both in the backend and the frontend
  - `backend/common/src/main/scala/org/soaringmeteo/out/package.scala`
  - `frontend/src/data/ForecastMetadata.ts`
- Perform a two-stage deployment
  1. Deploy the backend,
  2. Only after the backend has produced some data, we can deploy the frontend (in the meantime, the frontend
     still shows the older forecast data).
