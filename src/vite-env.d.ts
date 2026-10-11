/// <reference types="vite/client" />

import type { RefObject } from "react";
import type { EcctrlVehicleHandle } from "ecctrl/vehicle";

declare global {
  interface Window {
    /** Dev-only debug handle exposed by <Car /> (see src/Car.tsx). */
    __car?: RefObject<EcctrlVehicleHandle | null>;
  }
}

export {};
