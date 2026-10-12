/// <reference types="vite/client" />

import type { RefObject } from "react";
import type { EcctrlVehicleHandle } from "ecctrl/vehicle";
import type { EcctrlHandle } from "ecctrl";

declare global {
  interface Window {
    /** Dev-only debug handle exposed by <Car /> (see src/Car.tsx). */
    __car?: RefObject<EcctrlVehicleHandle | null>;
    /** Dev-only debug handle exposed by <Person /> (see src/Person.tsx). */
    __kid?: RefObject<EcctrlHandle | null>;
  }
}

export {};
