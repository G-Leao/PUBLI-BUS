# Implementation Guide

This index is not the full contract. Before changing a unit, read its
`behavior.yaml`, `bindings.yaml`, and `unit_decomposition.yaml`, then filter
global contracts by `used_by_units` and `source_loc`.

Units: auth, dashboard, profile, plans, advertisers, campaigns, tablets.
Each unit has the required per-unit artifacts below. Completion evidence is a
passing frontend build, backend Prisma migration, and manual verification of
the affected route plus its API contract.
