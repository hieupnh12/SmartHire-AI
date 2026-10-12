import { createContext, useContext } from "react";

/** True on the public share page: the canvas renders the same markup but nothing is editable. */
export const CvReadOnlyContext = createContext(false);

export const useCvReadOnly = () => useContext(CvReadOnlyContext);
