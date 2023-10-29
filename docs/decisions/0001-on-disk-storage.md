---
status: accepted
date: 2023-10-19
---

# Store Data On Disk Using H2

## Context and Problem Statement

The current implementation of SoarV2 loads all the forecast data in memory. This limits the number of points we can process for a zone.

Experiments showed that we used about 8 GB of memory to process about 20k points. To support the WRF model in the Alpine area, and to expand our coverage of the GFS global model, we need to handle about 200k points, which do not fit into 8 GB anymore.

## Decision Drivers

- Infrastructure cost. We would like to avoid having to buy more resources.
- Performance. The solution should run as fast as possible, and cannot exceed a couple of hours.
- Simplicity of implementation. The solution should preferably be simple to implement and maintain.

## Considered Options

- Increase the memory resources
- Store the data on the disk using files
- Store the data on the disk using the H2 database engine

## Decision Outcome

Chosen option: store the data on the disk using the H2 database system, because it is very simple to set up, it performs well enough, and it does not require buying more memory resources.

### Consequences

- Good, because it does not require much set up and maintenance.
- Bad, because it is less performant than a pure in-memory solution.

## Validation

Storing the forecast data on the disk with the H2 database system allows us to process 150k points with _less_ memory than the old system when it was processing 20k points. The program takes 3 times longer to complete.

## Pros and Cons of the Options

### Increase the Memory Resources

- Good, because it has the best level of performance
- Bad, because it significantly increases the cost of the infrastructure

### Store the Data on the Disk Using Files

Use the file system as a temporary storage system.

- Good, because it is simple to set up
- Bad, because it is not efficient (millions of file to create and delete)
- Bad, because it does not provide good querying capabilities
- Bad, because it does not provide transactional operations

### Store the Data on the Disk Using the H2 Database Engine

Use the [H2 database engine](https://h2database.com).

- Good, because it is simple to set up
- Good, because it uses the disk in an efficient way (a single, compact file)
- Good, because the stored data can be queried with SQL

## More Information

Currently, the backend program generates thousands of JSON files, which may advantageously be replaced by a similar database (for instance PostgreSQL + PostGIS) in the future. Getting there would be a simple step since most of the infrastructure would be reused as it is.
