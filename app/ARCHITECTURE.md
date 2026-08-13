# Web application architecture

MetaForge is organized around four boundaries. New code should enter the
smallest boundary that owns its behavior instead of expanding `page.tsx`.

## Routes

Next/vinext route files live directly under `app/` and route directories.
Route files coordinate state and compose features; they should not contain
domain engines or reusable animation lifecycles.

## Components

Reusable player-facing components live under `app/components/<feature>/`.
Feature-local types, constants, and lifecycle code stay with the component.
The build ceremony is the first extracted feature boundary:

- `components/forge/forge-ceremony.tsx` owns ceremony stages, phase labels,
  the Rive processing loader, and the visual ceremony progress component.

## Domain engines

Pure analysis and recommendation modules currently live as `.mjs` files in
`app/` and in focused subdirectories such as `knowledge/`, `gameplay/`, and
`field-intelligence/`. Domain modules must not import React or browser-only UI.
Server-only construction and structural analysis stay behind worker/API
boundaries and must not be imported into client components.

## Presentation

`globals.css` is the stylesheet entry point. Its imports are ordered from
foundational motion/journey styles through feature styles to the final
art-direction overrides. Because later files intentionally win the cascade,
changing import order is an architectural change and requires a visual check.

## Dependency direction

Dependencies should flow in one direction:

1. Route composition
2. Feature components
3. Small UI utilities and contracts
4. Pure domain modules
5. Data and fixtures

Domain modules must never depend on route or component modules. Tests may
import any public domain contract but should avoid asserting private CSS file
locations when a rendered behavior assertion is possible.

## Known migration work

`app/page.tsx` remains the primary concentration hotspot. Extract future work
by coherent player-facing feature (commission, masterwork reveal, workbench,
deck gallery), one verified boundary at a time. Do not perform mechanical
mass moves across the deck brain and player surface in a single change.
